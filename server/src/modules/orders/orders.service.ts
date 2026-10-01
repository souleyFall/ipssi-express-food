import type { PaymentMethod } from '@prisma/client';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { parisDate } from '../../lib/dates.js';
import { badRequest, conflict, notFound } from '../../lib/http-error.js';
import { computeTotals } from '../../lib/pricing.js';
import type { AuthUser } from '../../middleware/auth.js';
import { dispatchPendingOrders } from './dispatch.service.js';

export interface CreateOrderInput {
  articles: { platId: string; quantite: number }[];
  adresseLivraison: string;
  complementAdresse?: string;
  telephone: string;
  moyenPaiement: PaymentMethod;
}

const FIRST_ORDER_NUMBER = 1000;

/** Numéro de commande lisible et séquentiel (incrément atomique côté MongoDB). */
async function nextOrderNumber(): Promise<number> {
  const result = (await prisma.$runCommandRaw({
    findAndModify: 'compteurs',
    query: { _id: 'commandes' },
    update: { $inc: { valeur: 1 } },
    new: true,
    upsert: true,
  })) as { value: { valeur: number } };
  return FIRST_ORDER_NUMBER + result.value.valeur;
}

export async function createOrder(clientId: string, input: CreateOrderInput) {
  // Fusionne les lignes en double (même plat ajouté deux fois).
  const quantities = new Map<string, number>();
  for (const { platId, quantite } of input.articles) {
    quantities.set(platId, (quantities.get(platId) ?? 0) + quantite);
  }

  // Les prix viennent toujours de la base, jamais du navigateur.
  const dishes = await prisma.dish.findMany({
    where: { id: { in: [...quantities.keys()] }, menuDate: parisDate() },
  });
  if (dishes.length !== quantities.size) {
    throw badRequest("Un des plats commandés n'est pas au menu du jour");
  }

  const items = dishes.map((dish) => ({
    dishId: dish.id,
    name: dish.name,
    type: dish.type,
    unitPriceCents: dish.priceCents,
    quantity: quantities.get(dish.id)!,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const totals = computeTotals(subtotal, {
    deliveryFeeCents: config.DELIVERY_FEE_CENTS,
    freeDeliveryThresholdCents: config.FREE_DELIVERY_THRESHOLD_CENTS,
  });

  const order = await prisma.order.create({
    data: {
      number: await nextOrderNumber(),
      clientId,
      items,
      subtotalCents: totals.subtotalCents,
      deliveryFeeCents: totals.deliveryFeeCents,
      totalCents: totals.totalCents,
      deliveryAddress: input.adresseLivraison,
      deliveryDetails: input.complementAdresse || null,
      contactPhone: input.telephone,
      paymentMethod: input.moyenPaiement,
    },
  });

  // Dès qu'un client a commandé, un livreur est missionné.
  await dispatchPendingOrders();
  return findOrderByNumber(order.number);
}

async function findOrderByNumber(number: number) {
  const order = await prisma.order.findUnique({ where: { number }, include: { courier: true } });
  if (!order) throw notFound('Commande introuvable');
  return order;
}

/** Une commande n'est visible que par son client, son livreur ou un administrateur. */
export async function getOrderFor(user: AuthUser, number: number) {
  const order = await findOrderByNumber(number);
  const allowed =
    user.role === 'admin' ||
    (user.role === 'client' && order.clientId === user.id) ||
    (user.role === 'livreur' && order.courierId === user.id);
  // 404 plutôt que 403 : on ne révèle pas l'existence des commandes des autres.
  if (!allowed) throw notFound('Commande introuvable');
  return order;
}

export async function markPickedUp(courierId: string, number: number) {
  const order = await getOrderFor({ id: courierId, role: 'livreur' }, number);
  const updated = await prisma.order.updateMany({
    where: { id: order.id, courierId, status: 'ASSIGNEE' },
    data: { status: 'EN_LIVRAISON', pickedUpAt: new Date() },
  });
  if (updated.count !== 1) throw conflict("Cette commande n'est pas en attente de récupération");
  return findOrderByNumber(number);
}

export async function markDelivered(courierId: string, number: number) {
  const order = await getOrderFor({ id: courierId, role: 'livreur' }, number);
  const updated = await prisma.order.updateMany({
    where: { id: order.id, courierId, status: 'EN_LIVRAISON' },
    data: { status: 'LIVREE', deliveredAt: new Date() },
  });
  if (updated.count !== 1) throw conflict("Cette commande n'est pas en cours de livraison");

  await prisma.courier.update({ where: { id: courierId }, data: { status: 'LIBRE' } });
  // Le livreur redevenu libre prend la commande en attente la plus ancienne.
  await dispatchPendingOrders();
  return findOrderByNumber(number);
}

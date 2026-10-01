import type { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { DAY_PATTERN, parisDate, parisDayRange } from '../../lib/dates.js';
import { conflict, notFound } from '../../lib/http-error.js';
import { email, objectId, password, phone, shortText } from '../../lib/validation.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { emailTaken, hashPassword } from '../auth/auth.service.js';
import { toDishDto } from '../menu/menu.routes.js';
import { toOrderDto } from '../orders/order.dto.js';

/** Le cahier des charges fixe 2 plats et 2 desserts par jour. */
export const MAX_DISHES_PER_TYPE = 2;

const day = z.string().regex(DAY_PATTERN, 'Date attendue au format AAAA-MM-JJ');

const dishSchema = z.object({
  nom: shortText(80),
  description: shortText(300),
  prixCentimes: z.number().int().min(50).max(10_000),
  type: z.enum(['PLAT', 'DESSERT']),
  date: day,
  allergenes: z.array(shortText(40)).max(14).default([]),
  imageUrl: z.url().max(500).optional(),
});

const courierSchema = z.object({
  prenom: shortText(50),
  nom: shortText(50),
  email,
  motDePasse: password,
  telephone: phone.optional(),
});

const idParam = z.object({ id: objectId });

async function assertRoomInMenu(date: string, type: 'PLAT' | 'DESSERT', excludeId?: string) {
  const count = await prisma.dish.count({
    where: { menuDate: date, type, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  if (count >= MAX_DISHES_PER_TYPE) {
    const label = type === 'PLAT' ? 'plats' : 'desserts';
    throw conflict(`Le menu du ${date} contient déjà ${MAX_DISHES_PER_TYPE} ${label}`);
  }
}

export const adminRouter = Router();
adminRouter.use(authenticate, requireRole('admin'));

adminRouter.get('/tableau-de-bord', async (_req, res) => {
  const date = parisDate();
  const { start, end } = parisDayRange(date);
  const today = { createdAt: { gte: start, lt: end } };
  const [ordersToday, inProgress, freeCouriers, totalCouriers, deliveredToday] = await Promise.all([
    prisma.order.count({ where: today }),
    prisma.order.count({ where: { status: { in: ['EN_ATTENTE', 'ASSIGNEE', 'EN_LIVRAISON'] } } }),
    prisma.courier.count({ where: { status: 'LIBRE' } }),
    prisma.courier.count(),
    prisma.order.findMany({
      where: { ...today, status: 'LIVREE' },
      select: { createdAt: true, deliveredAt: true },
    }),
  ]);
  const durations = deliveredToday.map((o) => o.deliveredAt!.getTime() - o.createdAt.getTime());
  res.json({
    date,
    commandesDuJour: ordersToday,
    commandesEnCours: inProgress,
    livreursLibres: freeCouriers,
    livreursTotal: totalCouriers,
    delaiMoyenMinutes: durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60_000)
      : null,
  });
});

// ---- Plats du jour ----

adminRouter.get('/plats', async (req, res) => {
  const date = day.default(parisDate()).parse(req.query.date);
  const dishes = await prisma.dish.findMany({ where: { menuDate: date }, orderBy: { createdAt: 'asc' } });
  res.json(dishes.map(toDishDto));
});

adminRouter.post('/plats', async (req, res) => {
  const input = dishSchema.parse(req.body);
  await assertRoomInMenu(input.date, input.type);
  const dish = await prisma.dish.create({
    data: {
      name: input.nom,
      description: input.description,
      priceCents: input.prixCentimes,
      type: input.type,
      menuDate: input.date,
      allergens: input.allergenes,
      imageUrl: input.imageUrl ?? null,
    },
  });
  res.status(201).json(toDishDto(dish));
});

adminRouter.put('/plats/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const input = dishSchema.parse(req.body);
  const existing = await prisma.dish.findUnique({ where: { id } });
  if (!existing) throw notFound('Plat introuvable');
  if (existing.menuDate !== input.date || existing.type !== input.type) {
    await assertRoomInMenu(input.date, input.type, id);
  }
  const dish = await prisma.dish.update({
    where: { id },
    data: {
      name: input.nom,
      description: input.description,
      priceCents: input.prixCentimes,
      type: input.type,
      menuDate: input.date,
      allergens: input.allergenes,
      imageUrl: input.imageUrl ?? null,
    },
  });
  res.json(toDishDto(dish));
});

adminRouter.delete('/plats/:id', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const deleted = await prisma.dish.deleteMany({ where: { id } });
  if (deleted.count === 0) throw notFound('Plat introuvable');
  res.status(204).end();
});

// ---- Commandes ----

adminRouter.get('/commandes', async (req, res) => {
  const query = z
    .object({
      date: day.default(parisDate()),
      statut: z.enum(['EN_ATTENTE', 'ASSIGNEE', 'EN_LIVRAISON', 'LIVREE']).optional(),
    })
    .parse(req.query);
  const { start, end } = parisDayRange(query.date);
  const where: Prisma.OrderWhereInput = { createdAt: { gte: start, lt: end } };
  if (query.statut) where.status = query.statut;

  const orders = await prisma.order.findMany({
    where,
    include: { courier: true, client: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(
    orders.map((o) => ({
      ...toOrderDto(o),
      // Minimisation : l'admin voit le prénom et l'initiale du nom, pas plus.
      client: o.client ? `${o.client.firstName} ${o.client.lastName.charAt(0)}.` : 'Compte supprimé',
    })),
  );
});

// ---- Livreurs ----

adminRouter.get('/livreurs', async (_req, res) => {
  const couriers = await prisma.courier.findMany({ orderBy: { firstName: 'asc' } });
  res.json(
    couriers.map((c) => ({
      id: c.id,
      prenom: c.firstName,
      nom: c.lastName,
      email: c.email,
      telephone: c.phone,
      statut: c.status,
      position: c.position,
      positionMiseAJourLe: c.positionUpdatedAt,
    })),
  );
});

adminRouter.post('/livreurs', async (req, res) => {
  const input = courierSchema.parse(req.body);
  if (await emailTaken(input.email)) throw conflict('Un compte existe déjà avec cet email');
  const courier = await prisma.courier.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.motDePasse),
      firstName: input.prenom,
      lastName: input.nom,
      phone: input.telephone ?? null,
    },
  });
  res.status(201).json({ id: courier.id, prenom: courier.firstName, statut: courier.status });
});

// ---- Clients ----

adminRouter.get('/clients', async (_req, res) => {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  });
  res.json(
    clients.map((c) => ({
      id: c.id,
      prenom: c.firstName,
      nom: c.lastName,
      email: c.email,
      accepteEmails: c.marketingOptIn,
      inscritLe: c.createdAt,
      nombreCommandes: c._count.orders,
    })),
  );
});

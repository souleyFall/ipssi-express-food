import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { conflict } from '../../lib/http-error.js';
import { phone, shortText } from '../../lib/validation.js';
import { authenticate, closeSession, currentUser, requireRole } from '../../middleware/auth.js';
import { profileOf } from '../auth/auth.service.js';
import { toOrderDto } from '../orders/order.dto.js';

const ERASED = '[supprimé]';

const updateSchema = z
  .object({
    prenom: shortText(50),
    nom: shortText(50),
    telephone: phone.nullable(),
    adresse: z.string().trim().max(200).nullable(),
    complementAdresse: z.string().trim().max(200).nullable(),
    accepteEmails: z.boolean(),
  })
  .partial();

/** Espace « Mon compte » : droits RGPD d'accès, de rectification et d'effacement. */
export const clientsRouter = Router();
clientsRouter.use(authenticate, requireRole('client'));

// Droit de rectification
clientsRouter.patch('/moi', async (req, res) => {
  const input = updateSchema.parse(req.body);
  const user = currentUser(req);
  await prisma.client.update({
    where: { id: user.id },
    data: {
      firstName: input.prenom,
      lastName: input.nom,
      phone: input.telephone,
      address: input.adresse,
      addressDetails: input.complementAdresse,
      marketingOptIn: input.accepteEmails,
    },
  });
  res.json(await profileOf(user));
});

// Droit d'accès et à la portabilité : export JSON de toutes les données du client
clientsRouter.get('/moi/donnees', async (req, res) => {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: currentUser(req).id },
    include: { orders: { include: { courier: true }, orderBy: { createdAt: 'asc' } } },
  });
  res.attachment('mes-donnees-express-food.json');
  res.json({
    exporteLe: new Date(),
    profil: {
      prenom: client.firstName,
      nom: client.lastName,
      email: client.email,
      telephone: client.phone,
      adresse: client.address,
      complementAdresse: client.addressDetails,
      cguAccepteesLe: client.cguAcceptedAt,
      accepteEmails: client.marketingOptIn,
      compteCreeLe: client.createdAt,
    },
    commandes: client.orders.map(toOrderDto),
  });
});

// Droit à l'effacement : suppression du compte et anonymisation des commandes
// (les commandes sont conservées sans données personnelles pour la comptabilité).
clientsRouter.delete('/moi', async (req, res) => {
  const clientId = currentUser(req).id;
  const active = await prisma.order.count({
    where: { clientId, status: { in: ['EN_ATTENTE', 'ASSIGNEE', 'EN_LIVRAISON'] } },
  });
  if (active > 0) throw conflict('Impossible de supprimer le compte pendant une livraison en cours');

  await prisma.order.updateMany({
    where: { clientId },
    data: { clientId: null, deliveryAddress: ERASED, deliveryDetails: null, contactPhone: ERASED },
  });
  await prisma.client.delete({ where: { id: clientId } });
  closeSession(res);
  res.status(204).end();
});

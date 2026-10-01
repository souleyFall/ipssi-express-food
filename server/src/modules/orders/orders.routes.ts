import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { objectId, orderNumber, phone, shortText } from '../../lib/validation.js';
import { toOrderDto } from './order.dto.js';
import { createOrder, getOrderFor, markDelivered, markPickedUp } from './orders.service.js';

const createOrderSchema = z.object({
  articles: z
    .array(z.object({ platId: objectId, quantite: z.number().int().min(1).max(10) }))
    .min(1, 'Le panier est vide')
    .max(4),
  adresseLivraison: shortText(200),
  complementAdresse: z.string().trim().max(200).optional(),
  telephone: phone,
  moyenPaiement: z.enum(['CARTE_A_LA_LIVRAISON', 'ESPECES_A_LA_LIVRAISON']),
});

const numeroParam = z.object({ numero: orderNumber });

export const ordersRouter = Router();
ordersRouter.use(authenticate);

ordersRouter.post('/', requireRole('client'), async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const order = await createOrder(currentUser(req).id, input);
  res.status(201).json(toOrderDto(order));
});

ordersRouter.get('/', requireRole('client'), async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { clientId: currentUser(req).id },
    include: { courier: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders.map(toOrderDto));
});

ordersRouter.get('/:numero', async (req, res) => {
  const { numero } = numeroParam.parse(req.params);
  res.json(toOrderDto(await getOrderFor(currentUser(req), numero)));
});

ordersRouter.post('/:numero/recuperation', requireRole('livreur'), async (req, res) => {
  const { numero } = numeroParam.parse(req.params);
  res.json(toOrderDto(await markPickedUp(currentUser(req).id, numero)));
});

ordersRouter.post('/:numero/livraison', requireRole('livreur'), async (req, res) => {
  const { numero } = numeroParam.parse(req.params);
  res.json(toOrderDto(await markDelivered(currentUser(req).id, numero)));
});

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { parisDate, parisDayRange } from '../../lib/dates.js';
import { conflict } from '../../lib/http-error.js';
import { authenticate, currentUser, requireRole } from '../../middleware/auth.js';
import { dispatchPendingOrders } from '../orders/dispatch.service.js';
import { toOrderDto } from '../orders/order.dto.js';

const statusSchema = z.object({ statut: z.enum(['LIBRE', 'INDISPONIBLE']) });
const positionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const couriersRouter = Router();
couriersRouter.use(authenticate, requireRole('livreur'));

couriersRouter.get('/moi/missions', async (req, res) => {
  const courierId = currentUser(req).id;
  const { start, end } = parisDayRange(parisDate());
  const [courier, current, delivered] = await Promise.all([
    prisma.courier.findUniqueOrThrow({ where: { id: courierId } }),
    prisma.order.findFirst({
      where: { courierId, status: { in: ['ASSIGNEE', 'EN_LIVRAISON'] } },
      include: { courier: true },
    }),
    prisma.order.findMany({
      where: { courierId, status: 'LIVREE', deliveredAt: { gte: start, lt: end } },
      orderBy: { deliveredAt: 'desc' },
    }),
  ]);
  res.json({
    livreur: { prenom: courier.firstName, statut: courier.status },
    missionEnCours: current ? toOrderDto(current) : null,
    livreesAujourdhui: delivered.map((o) => ({
      numero: o.number,
      adresseLivraison: o.deliveryAddress,
      dureeMinutes: Math.round((o.deliveredAt!.getTime() - o.createdAt.getTime()) / 60_000),
    })),
  });
});

/** Le livreur se déclare libre ou indisponible ; EN_LIVRAISON est géré par le système. */
couriersRouter.patch('/moi/statut', async (req, res) => {
  const { statut } = statusSchema.parse(req.body);
  const courierId = currentUser(req).id;
  const updated = await prisma.courier.updateMany({
    where: { id: courierId, status: { not: 'EN_LIVRAISON' } },
    data: { status: statut },
  });
  if (updated.count !== 1) throw conflict("Terminez votre livraison en cours avant de changer de statut");
  if (statut === 'LIBRE') await dispatchPendingOrders();

  const courier = await prisma.courier.findUniqueOrThrow({ where: { id: courierId } });
  res.json({ statut: courier.status });
});

couriersRouter.patch('/moi/position', async (req, res) => {
  const position = positionSchema.parse(req.body);
  await prisma.courier.update({
    where: { id: currentUser(req).id },
    data: { position, positionUpdatedAt: new Date() },
  });
  res.status(204).end();
});

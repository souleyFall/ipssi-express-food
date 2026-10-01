import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { distanceKm, estimateDeliveryAt, type Point } from '../../lib/geo.js';

const qg: Point = { lat: config.QG_LAT, lng: config.QG_LNG };

/**
 * Tente de confier une commande en attente au livreur libre le plus proche du QG.
 * Le passage LIBRE -> EN_LIVRAISON est conditionnel (updateMany + filtre sur le statut) :
 * deux commandes simultanées ne peuvent pas réserver le même livreur.
 * Retourne false s'il n'y a plus aucun livreur libre.
 */
async function assignOrder(orderId: string): Promise<boolean> {
  const freeCouriers = await prisma.courier.findMany({ where: { status: 'LIBRE' } });
  if (freeCouriers.length === 0) return false;

  freeCouriers.sort(
    (a, b) =>
      (a.position ? distanceKm(a.position, qg) : Infinity) -
      (b.position ? distanceKm(b.position, qg) : Infinity),
  );

  for (const courier of freeCouriers) {
    const reserved = await prisma.courier.updateMany({
      where: { id: courier.id, status: 'LIBRE' },
      data: { status: 'EN_LIVRAISON' },
    });
    if (reserved.count !== 1) continue;

    const now = new Date();
    const assigned = await prisma.order.updateMany({
      where: { id: orderId, status: 'EN_ATTENTE' },
      data: {
        status: 'ASSIGNEE',
        courierId: courier.id,
        assignedAt: now,
        estimatedDeliveryAt: estimateDeliveryAt(now, courier.position, qg, config.DELIVERY_RIDE_MINUTES),
      },
    });
    if (assigned.count !== 1) {
      // La commande a été prise entre-temps : on libère le livreur.
      await prisma.courier.update({ where: { id: courier.id }, data: { status: 'LIBRE' } });
    }
    return true;
  }
  return false;
}

/** Attribue les commandes en attente, de la plus ancienne à la plus récente. */
export async function dispatchPendingOrders(): Promise<void> {
  const pending = await prisma.order.findMany({
    where: { status: 'EN_ATTENTE' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  for (const order of pending) {
    if (!(await assignOrder(order.id))) return;
  }
}

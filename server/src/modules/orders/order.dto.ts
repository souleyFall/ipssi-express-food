import type { Courier, Order } from '@prisma/client';

type OrderWithCourier = Order & { courier?: Courier | null };

const ACTIVE_STATUSES = new Set(['ASSIGNEE', 'EN_LIVRAISON']);

/**
 * Vue d'une commande renvoyée au client ou au livreur.
 * RGPD : seul le prénom du livreur est exposé, et sa position uniquement pendant la livraison.
 */
export function toOrderDto(order: OrderWithCourier) {
  const active = ACTIVE_STATUSES.has(order.status);
  return {
    numero: order.number,
    statut: order.status,
    articles: order.items.map((item) => ({
      platId: item.dishId,
      nom: item.name,
      type: item.type,
      prixUnitaireCentimes: item.unitPriceCents,
      quantite: item.quantity,
    })),
    sousTotalCentimes: order.subtotalCents,
    fraisLivraisonCentimes: order.deliveryFeeCents,
    totalCentimes: order.totalCents,
    adresseLivraison: order.deliveryAddress,
    complementAdresse: order.deliveryDetails,
    telephone: order.contactPhone,
    moyenPaiement: order.paymentMethod,
    livraisonEstimeeA: order.estimatedDeliveryAt,
    creeeLe: order.createdAt,
    assigneeLe: order.assignedAt,
    recupereeLe: order.pickedUpAt,
    livreeLe: order.deliveredAt,
    livreur: order.courier
      ? {
          prenom: order.courier.firstName,
          position: active ? order.courier.position : null,
          positionMiseAJourLe: active ? order.courier.positionUpdatedAt : null,
        }
      : null,
  };
}

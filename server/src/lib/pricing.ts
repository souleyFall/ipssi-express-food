export interface DeliveryRules {
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number;
}

export interface Totals {
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
}

/** Livraison offerte dès que le sous-total atteint le seuil (19,99 € par défaut). */
export function computeTotals(subtotalCents: number, rules: DeliveryRules): Totals {
  const deliveryFeeCents =
    subtotalCents >= rules.freeDeliveryThresholdCents ? 0 : rules.deliveryFeeCents;
  return { subtotalCents, deliveryFeeCents, totalCents: subtotalCents + deliveryFeeCents };
}

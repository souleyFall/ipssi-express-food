import type { DeliveryRules, Dish } from './types';

export interface CartLine {
  dish: Pick<Dish, 'id' | 'nom' | 'prixCentimes' | 'type'>;
  quantity: number;
}

export interface CartTotals {
  subtotal: number;
  deliveryFee: number;
  total: number;
  /** Montant restant pour obtenir la livraison offerte (0 si atteinte). */
  missingForFreeDelivery: number;
  /** Progression vers la livraison offerte, entre 0 et 1. */
  freeDeliveryProgress: number;
}

export const MAX_QUANTITY = 10;

/** Même règle que le serveur, pour l'affichage (le serveur reste la référence). */
export function computeCartTotals(lines: CartLine[], rules: DeliveryRules): CartTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.dish.prixCentimes * l.quantity, 0);
  const free = subtotal >= rules.livraisonOfferteDesCentimes;
  const deliveryFee = subtotal === 0 || free ? 0 : rules.fraisLivraisonCentimes;
  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    missingForFreeDelivery: free ? 0 : rules.livraisonOfferteDesCentimes - subtotal,
    freeDeliveryProgress: Math.min(1, subtotal / rules.livraisonOfferteDesCentimes),
  };
}

export function setQuantity(lines: CartLine[], dish: CartLine['dish'], quantity: number): CartLine[] {
  const q = Math.min(MAX_QUANTITY, Math.max(0, quantity));
  const rest = lines.filter((l) => l.dish.id !== dish.id);
  if (q === 0) return rest;
  const index = lines.findIndex((l) => l.dish.id === dish.id);
  const line = { dish, quantity: q };
  if (index === -1) return [...lines, line];
  return lines.map((l, i) => (i === index ? line : l));
}

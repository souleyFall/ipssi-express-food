import { describe, expect, it } from 'vitest';
import { computeCartTotals, setQuantity, type CartLine } from './cart';

const rules = { fraisLivraisonCentimes: 250, livraisonOfferteDesCentimes: 1999 };
const yassa = { id: 'a', nom: 'Poulet yassa', prixCentimes: 1250, type: 'PLAT' as const };
const tarte = { id: 'b', nom: 'Tarte', prixCentimes: 400, type: 'DESSERT' as const };

describe('computeCartTotals', () => {
  it('ne facture pas de livraison pour un panier vide', () => {
    expect(computeCartTotals([], rules).total).toBe(0);
  });

  it('ajoute les frais et indique le montant manquant', () => {
    const totals = computeCartTotals([{ dish: yassa, quantity: 1 }], rules);
    expect(totals).toMatchObject({ subtotal: 1250, deliveryFee: 250, total: 1500, missingForFreeDelivery: 749 });
  });

  it('offre la livraison dès 19,99 €', () => {
    const lines: CartLine[] = [
      { dish: yassa, quantity: 1 },
      { dish: tarte, quantity: 2 },
    ];
    expect(computeCartTotals(lines, rules)).toMatchObject({ deliveryFee: 0, total: 2050, freeDeliveryProgress: 1 });
  });
});

describe('setQuantity', () => {
  it('ajoute, met à jour puis retire une ligne', () => {
    let lines = setQuantity([], yassa, 1);
    expect(lines).toEqual([{ dish: yassa, quantity: 1 }]);
    lines = setQuantity(lines, yassa, 3);
    expect(lines[0].quantity).toBe(3);
    expect(setQuantity(lines, yassa, 0)).toEqual([]);
  });

  it('plafonne la quantité à 10', () => {
    expect(setQuantity([], yassa, 50)[0].quantity).toBe(10);
  });
});

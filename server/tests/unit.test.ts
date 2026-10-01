import { describe, expect, it } from 'vitest';
import { parisDate, parisDayRange } from '../src/lib/dates.js';
import { distanceKm, estimateDeliveryAt } from '../src/lib/geo.js';
import { computeTotals } from '../src/lib/pricing.js';

const rules = { deliveryFeeCents: 250, freeDeliveryThresholdCents: 1999 };

describe('computeTotals', () => {
  it('facture la livraison sous 19,99 €', () => {
    expect(computeTotals(1998, rules)).toEqual({ subtotalCents: 1998, deliveryFeeCents: 250, totalCents: 2248 });
  });

  it('offre la livraison à partir de 19,99 € exactement', () => {
    expect(computeTotals(1999, rules)).toEqual({ subtotalCents: 1999, deliveryFeeCents: 0, totalCents: 1999 });
  });
});

describe('dates à Paris', () => {
  it('bascule de jour à minuit heure de Paris, pas UTC', () => {
    // 23h30 UTC le 1er octobre = 1h30 le 2 octobre à Paris (UTC+2)
    expect(parisDate(new Date('2026-10-01T23:30:00Z'))).toBe('2026-10-02');
  });

  it('calcule les bornes UTC d’une journée parisienne en heure d’été et d’hiver', () => {
    expect(parisDayRange('2026-07-14').start.toISOString()).toBe('2026-07-13T22:00:00.000Z');
    expect(parisDayRange('2026-01-15').start.toISOString()).toBe('2026-01-14T23:00:00.000Z');
  });
});

describe('estimation de livraison', () => {
  const qg = { lat: 48.8566, lng: 2.3522 };

  it('mesure une distance réaliste', () => {
    // Louvre -> Hôtel de Ville ≈ 1,2 km
    expect(distanceKm({ lat: 48.8606, lng: 2.3376 }, qg)).toBeCloseTo(1.17, 1);
  });

  it('ajoute le trajet jusqu’au QG au trajet de livraison', () => {
    const from = new Date('2026-10-02T12:00:00Z');
    // Livreur au QG : seulement le trajet de livraison
    expect(estimateDeliveryAt(from, qg, qg, 10).toISOString()).toBe('2026-10-02T12:10:00.000Z');
    // Position inconnue : 5 min forfaitaires
    expect(estimateDeliveryAt(from, null, qg, 10).toISOString()).toBe('2026-10-02T12:15:00.000Z');
  });
});

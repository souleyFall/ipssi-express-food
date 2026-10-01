import type { CourierStatus, OrderStatus } from './types';

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const longDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export const formatPrice = (cents: number) => euros.format(cents / 100);

export const formatTime = (iso: string | null) => (iso ? time.format(new Date(iso)) : '—');

/** « jeudi 2 octobre » à partir de AAAA-MM-JJ. */
export const formatDay = (day: string) => longDay.format(new Date(`${day}T00:00:00Z`));

export function minutesUntil(iso: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 60_000));
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  EN_ATTENTE: 'En attente de livreur',
  ASSIGNEE: 'Livreur assigné',
  EN_LIVRAISON: 'En livraison',
  LIVREE: 'Livrée',
};

export const COURIER_STATUS_LABEL: Record<CourierStatus, string> = {
  LIBRE: 'Libre',
  EN_LIVRAISON: 'En cours de livraison',
  INDISPONIBLE: 'Indisponible',
};

export const PAYMENT_LABEL = {
  CARTE_A_LA_LIVRAISON: 'Carte bancaire à la livraison',
  ESPECES_A_LA_LIVRAISON: 'Espèces à la livraison',
} as const;

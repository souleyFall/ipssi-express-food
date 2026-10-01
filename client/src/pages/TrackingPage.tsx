import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePolling } from '../hooks/usePolling';
import { useTitle } from '../hooks/useTitle';
import { api, errorMessage } from '../lib/api';
import { formatPrice, formatTime, minutesUntil, PAYMENT_LABEL } from '../lib/format';
import type { Order, OrderStatus } from '../lib/types';

const REFRESH_MS = 10_000;
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'EN_ATTENTE', label: 'Commande reçue' },
  { status: 'ASSIGNEE', label: 'Livreur assigné' },
  { status: 'EN_LIVRAISON', label: 'En livraison' },
  { status: 'LIVREE', label: 'Livrée' },
];
const STEP_TIME: Record<OrderStatus, keyof Order> = {
  EN_ATTENTE: 'creeeLe',
  ASSIGNEE: 'assigneeLe',
  EN_LIVRAISON: 'recupereeLe',
  LIVREE: 'livreeLe',
};

function headline(order: Order): string {
  switch (order.statut) {
    case 'EN_ATTENTE':
      return 'Nous cherchons un livreur';
    case 'ASSIGNEE':
      return `${order.livreur?.prenom} récupère votre commande`;
    case 'EN_LIVRAISON':
      return 'Votre commande est en route';
    case 'LIVREE':
      return 'Commande livrée, bon appétit !';
  }
}

function mapUrl({ lat, lng }: { lat: number; lng: number }) {
  const bbox = [lng - 0.01, lat - 0.006, lng + 0.01, lat + 0.006].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function TrackingPage() {
  const { numero } = useParams();
  useTitle(`Suivi de la commande ${numero}`);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  usePolling(
    () => {
      setNow(Date.now());
      api<Order>(`/commandes/${numero}`)
        .then(setOrder)
        .catch((err) => setError(errorMessage(err)));
    },
    REFRESH_MS,
    order?.statut !== 'LIVREE',
  );

  if (error && !order) return <p className="container alert alert-error">{error}</p>;
  if (!order) return <p className="container muted">Chargement de votre commande…</p>;

  const currentIndex = STEPS.findIndex((s) => s.status === order.statut);
  const position = order.livreur?.position;

  return (
    <main className="container stack" style={{ gap: 24 }}>
      <div>
        <div className="muted small">
          Commande n° {order.numero} · passée à {formatTime(order.creeeLe)}
        </div>
        <h1 style={{ marginTop: 6 }}>{headline(order)}</h1>
      </div>

      <div className="layout-with-aside">
        <div className="stack" style={{ gap: 24 }}>
          <section className="card tracking-hero" aria-live="polite">
            <div className="eta">
              <span className="eyebrow" style={{ color: 'var(--muted)' }}>
                {order.statut === 'LIVREE' ? 'Livrée à' : 'Arrivée estimée'}
              </span>
              {order.statut === 'LIVREE' ? (
                <span className="eta__value" style={{ color: 'var(--green)' }}>
                  {formatTime(order.livreeLe)}
                </span>
              ) : order.livraisonEstimeeA ? (
                <>
                  <span className="eta__value">{minutesUntil(order.livraisonEstimeeA, now)} min</span>
                  <span className="muted">vers {formatTime(order.livraisonEstimeeA)}</span>
                </>
              ) : (
                <>
                  <span className="eta__value" style={{ fontSize: 32 }}>
                    En attente
                  </span>
                  <span className="muted">Un livreur va être missionné</span>
                </>
              )}
            </div>
            <ol className="steps">
              {STEPS.map((step, i) => {
                const state = i < currentIndex || order.statut === 'LIVREE' ? 'done' : i === currentIndex ? 'current' : '';
                const at = order[STEP_TIME[step.status]] as string | null;
                return (
                  <li key={step.status} className={state} aria-current={state === 'current' ? 'step' : undefined}>
                    <div className="bar" />
                    <div>
                      <strong>{step.label}</strong>
                      <div>
                        {at ? formatTime(at) : '—'}
                        {step.status === 'ASSIGNEE' && order.livreur ? ` · ${order.livreur.prenom}` : ''}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {order.statut !== 'LIVREE' &&
            (position ? (
              <iframe
                className="map"
                title="Position du livreur"
                src={mapUrl(position)}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="map map-placeholder">
                {order.livreur ? 'Position du livreur bientôt disponible' : 'La carte s’affichera quand un livreur sera assigné'}
              </div>
            ))}
        </div>

        <aside className="stack" style={{ gap: 20 }}>
          {order.livreur && (
            <section className="card stack">
              <h2 className="eyebrow" style={{ color: 'var(--muted)' }}>
                Votre livreur
              </h2>
              <div className="row" style={{ gap: 14 }}>
                <div className="avatar" aria-hidden="true">
                  {order.livreur.prenom.charAt(0)}
                </div>
                <div>
                  <strong style={{ fontSize: 18 }}>{order.livreur.prenom}</strong>
                  <div className="muted small">À vélo</div>
                </div>
              </div>
            </section>
          )}
          <section className="card stack" style={{ gap: 10 }}>
            <h2 className="eyebrow" style={{ color: 'var(--muted)' }}>
              Détail
            </h2>
            {order.articles.map((a) => (
              <div key={a.platId} className="line">
                <span>
                  {a.quantite} × {a.nom}
                </span>
                <span>{formatPrice(a.prixUnitaireCentimes * a.quantite)}</span>
              </div>
            ))}
            <div className="line muted">
              <span>Livraison</span>
              <span>{order.fraisLivraisonCentimes ? formatPrice(order.fraisLivraisonCentimes) : 'Offerte'}</span>
            </div>
            <hr className="divider" />
            <div className="line line-total">
              <span>Total</span>
              <span>{formatPrice(order.totalCentimes)}</span>
            </div>
            <div className="muted small">{PAYMENT_LABEL[order.moyenPaiement]}</div>
            <div className="muted small">Livraison : {order.adresseLivraison}</div>
          </section>
          <Link to="/commandes" className="btn btn-outline">
            Toutes mes commandes
          </Link>
        </aside>
      </div>
    </main>
  );
}

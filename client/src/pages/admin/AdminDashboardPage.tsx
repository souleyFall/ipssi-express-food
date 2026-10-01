import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { CourierStatusBadge, OrderStatusBadge } from '../../components/StatusBadge';
import { usePolling } from '../../hooks/usePolling';
import { useTitle } from '../../hooks/useTitle';
import { api, errorMessage } from '../../lib/api';
import { formatDay, formatPrice, formatTime } from '../../lib/format';
import type { AdminOrder, CourierStatus } from '../../lib/types';

interface Dashboard {
  date: string;
  commandesDuJour: number;
  commandesEnCours: number;
  livreursLibres: number;
  livreursTotal: number;
  delaiMoyenMinutes: number | null;
}

interface AdminCourier {
  id: string;
  prenom: string;
  statut: CourierStatus;
}

const REFRESH_MS = 15_000;

export function AdminDashboardPage() {
  useTitle('Tableau de bord');
  const [stats, setStats] = useState<Dashboard | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api<Dashboard>('/admin/tableau-de-bord'),
      api<AdminOrder[]>('/admin/commandes'),
      api<AdminCourier[]>('/admin/livreurs'),
    ])
      .then(([s, o, c]) => {
        setStats(s);
        setOrders(o.filter((order) => order.statut !== 'LIVREE'));
        setCouriers(c);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);
  usePolling(load, REFRESH_MS);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="muted small">{stats && formatDay(stats.date)}</div>
          <h1 style={{ fontSize: 32 }}>Tableau de bord</h1>
        </div>
        <Link to="/admin/plats" className="btn btn-primary">
          Modifier le menu du jour
        </Link>
      </div>
      {error && <p className="alert alert-error">{error}</p>}

      {stats && (
        <div className="kpis">
          <div className="kpi">
            <span className="muted small">Commandes du jour</span>
            <strong>{stats.commandesDuJour}</strong>
          </div>
          <div className="kpi">
            <span className="muted small">En cours</span>
            <strong>{stats.commandesEnCours}</strong>
          </div>
          <div className="kpi">
            <span className="muted small">Livreurs libres</span>
            <strong>
              {stats.livreursLibres} / {stats.livreursTotal}
            </strong>
          </div>
          <div className="kpi">
            <span className="muted small">Délai moyen de livraison</span>
            <strong>{stats.delaiMoyenMinutes === null ? '—' : `${stats.delaiMoyenMinutes} min`}</strong>
          </div>
        </div>
      )}

      <div className="layout-with-aside" style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px' }}>
        <section className="card" style={{ padding: 0 }}>
          <h2 style={{ padding: '18px 20px', fontSize: 18 }}>Commandes en cours</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Heure</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Livreur</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.numero}>
                    <td>
                      <strong>{o.numero}</strong>
                    </td>
                    <td>{formatTime(o.creeeLe)}</td>
                    <td>{o.client}</td>
                    <td>{formatPrice(o.totalCentimes)}</td>
                    <td>{o.livreur?.prenom ?? '—'}</td>
                    <td>
                      <OrderStatusBadge status={o.statut} />
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Aucune commande en cours.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 18 }}>Livreurs</h2>
          {couriers.map((c) => (
            <div key={c.id} className="line" style={{ alignItems: 'center' }}>
              <span>{c.prenom}</span>
              <CourierStatusBadge status={c.statut} />
            </div>
          ))}
          {couriers.length === 0 && <p className="muted small">Aucun livreur.</p>}
        </section>
      </div>
    </>
  );
}

import { useCallback, useState } from 'react';
import { OrderStatusBadge } from '../../components/StatusBadge';
import { usePolling } from '../../hooks/usePolling';
import { useTitle } from '../../hooks/useTitle';
import { api, errorMessage } from '../../lib/api';
import { formatPrice, formatTime, ORDER_STATUS_LABEL } from '../../lib/format';
import type { AdminOrder, OrderStatus } from '../../lib/types';

export function AdminOrdersPage() {
  useTitle('Commandes');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<AdminOrder[]>(`/admin/commandes${status ? `?statut=${status}` : ''}`)
      .then(setOrders)
      .catch((err) => setError(errorMessage(err)));
  }, [status]);
  usePolling(load, 15_000);

  return (
    <>
      <div className="page-head">
        <h1 style={{ fontSize: 32 }}>Commandes du jour</h1>
        <div className="field">
          <label htmlFor="statut">Statut</label>
          <select id="statut" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | '')}>
            <option value="">Toutes</option>
            {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      <section className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Passée à</th>
                <th>Client</th>
                <th>Articles</th>
                <th>Total</th>
                <th>Livreur</th>
                <th>Livrée à</th>
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
                  <td>{o.articles.map((a) => `${a.quantite} × ${a.nom}`).join(', ')}</td>
                  <td>{formatPrice(o.totalCentimes)}</td>
                  <td>{o.livreur?.prenom ?? '—'}</td>
                  <td>{formatTime(o.livreeLe)}</td>
                  <td>
                    <OrderStatusBadge status={o.statut} />
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    Aucune commande.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

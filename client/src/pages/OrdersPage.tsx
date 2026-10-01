import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { OrderStatusBadge } from '../components/StatusBadge';
import { useTitle } from '../hooks/useTitle';
import { api, errorMessage } from '../lib/api';
import { formatPrice } from '../lib/format';
import type { Order } from '../lib/types';

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' });

export function OrdersPage() {
  useTitle('Mes commandes');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Order[]>('/commandes')
      .then(setOrders)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <main className="container stack" style={{ gap: 24 }}>
      <h1>Mes commandes</h1>
      {error && <p className="alert alert-error">{error}</p>}
      {orders?.length === 0 && (
        <div className="card empty">
          <p className="muted">Vous n'avez pas encore commandé.</p>
          <Link to="/menu" className="btn btn-primary">
            Voir le menu du jour
          </Link>
        </div>
      )}
      <div className="stack">
        {orders?.map((order) => (
          <Link
            key={order.numero}
            to={`/commandes/${order.numero}/suivi`}
            className="card line"
            style={{ textDecoration: 'none', color: 'inherit', alignItems: 'center', flexWrap: 'wrap' }}
          >
            <div>
              <strong>Commande n° {order.numero}</strong>
              <div className="muted small">
                {dateTime.format(new Date(order.creeeLe))} · {order.articles.map((a) => a.nom).join(', ')}
              </div>
            </div>
            <div className="row">
              <OrderStatusBadge status={order.statut} />
              <strong>{formatPrice(order.totalCentimes)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

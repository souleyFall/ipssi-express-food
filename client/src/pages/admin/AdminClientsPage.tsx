import { useEffect, useState } from 'react';
import { useTitle } from '../../hooks/useTitle';
import { api, errorMessage } from '../../lib/api';

interface AdminClient {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  accepteEmails: boolean;
  inscritLe: string;
  nombreCommandes: number;
}

const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'Europe/Paris' });

export function AdminClientsPage() {
  useTitle('Clients');
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AdminClient[]>('/admin/clients')
      .then(setClients)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  return (
    <>
      <h1 style={{ fontSize: 32 }}>Clients</h1>
      {error && <p className="alert alert-error">{error}</p>}
      <section className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Inscrit le</th>
                <th>Commandes</th>
                <th>Emails menu</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>
                      {c.prenom} {c.nom}
                    </strong>
                  </td>
                  <td>{c.email}</td>
                  <td>{day.format(new Date(c.inscritLe))}</td>
                  <td>{c.nombreCommandes}</td>
                  <td>{c.accepteEmails ? 'Oui' : 'Non'}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Aucun client inscrit.
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

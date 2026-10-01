import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CourierStatusBadge } from '../../components/StatusBadge';
import { useTitle } from '../../hooks/useTitle';
import { api, errorMessage } from '../../lib/api';
import { formatTime } from '../../lib/format';
import type { CourierStatus, GeoPoint } from '../../lib/types';

interface AdminCourier {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  statut: CourierStatus;
  position: GeoPoint | null;
  positionMiseAJourLe: string | null;
}

const EMPTY_FORM = { prenom: '', nom: '', email: '', motDePasse: '', telephone: '' };

export function AdminCouriersPage() {
  useTitle('Livreurs');
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    api<AdminCourier[]>('/admin/livreurs')
      .then(setCouriers)
      .catch((err) => setMessage({ ok: false, text: errorMessage(err) }));
  }, []);
  useEffect(load, [load]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/admin/livreurs', 'POST', { ...form, telephone: form.telephone || undefined });
      setMessage({ ok: true, text: `Compte de ${form.prenom} créé.` });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <>
      <h1 style={{ fontSize: 32 }}>Livreurs</h1>
      <div className="layout-with-aside" style={{ gridTemplateColumns: 'minmax(0, 1fr) 340px' }}>
        <section className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Contact</th>
                  <th>Statut</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>
                        {c.prenom} {c.nom}
                      </strong>
                    </td>
                    <td>
                      {c.email}
                      {c.telephone && <div className="muted small">{c.telephone}</div>}
                    </td>
                    <td>
                      <CourierStatusBadge status={c.statut} />
                    </td>
                    <td className="small">
                      {c.position
                        ? `${c.position.lat.toFixed(4)}, ${c.position.lng.toFixed(4)} (${formatTime(c.positionMiseAJourLe)})`
                        : 'Non partagée'}
                    </td>
                  </tr>
                ))}
                {couriers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Aucun livreur.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <form className="card stack" onSubmit={submit}>
          <h2 style={{ fontSize: 18 }}>Nouveau livreur</h2>
          <div className="field">
            <label htmlFor="prenom">Prénom</label>
            <input id="prenom" required value={form.prenom} onChange={set('prenom')} />
          </div>
          <div className="field">
            <label htmlFor="nom">Nom</label>
            <input id="nom" required value={form.nom} onChange={set('nom')} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={form.email} onChange={set('email')} />
          </div>
          <div className="field">
            <label htmlFor="telephone">Téléphone</label>
            <input id="telephone" type="tel" value={form.telephone} onChange={set('telephone')} />
          </div>
          <div className="field">
            <label htmlFor="mdp">Mot de passe provisoire</label>
            <input
              id="mdp"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.motDePasse}
              onChange={set('motDePasse')}
            />
            <span className="hint">8 caractères minimum, dont un chiffre</span>
          </div>
          {message && (
            <p className={`alert ${message.ok ? 'alert-success' : 'alert-error'}`} role="status" style={{ margin: 0 }}>
              {message.text}
            </p>
          )}
          <button type="submit" className="btn btn-primary">
            Créer le compte
          </button>
        </form>
      </div>
    </>
  );
}

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTitle } from '../hooks/useTitle';
import { api, errorMessage } from '../lib/api';
import type { Profile } from '../lib/types';

/** Espace « Mon compte » : rectification, export et suppression des données (RGPD). */
export function AccountPage() {
  useTitle('Mon compte');
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    prenom: user?.prenom ?? '',
    nom: user?.nom ?? '',
    telephone: user?.telephone ?? '',
    adresse: user?.adresse ?? '',
    complementAdresse: user?.complementAdresse ?? '',
    accepteEmails: user?.accepteEmails ?? false,
  });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const profile = await api<Profile>('/clients/moi', 'PATCH', {
        ...form,
        telephone: form.telephone || null,
        adresse: form.adresse || null,
        complementAdresse: form.complementAdresse || null,
      });
      setUser(profile);
      setMessage({ ok: true, text: 'Vos informations ont été mises à jour.' });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    }
  }

  async function deleteAccount() {
    if (!window.confirm('Supprimer définitivement votre compte ? Vos commandes passées seront anonymisées.')) return;
    try {
      await api('/clients/moi', 'DELETE');
      setUser(null);
      navigate('/menu', { replace: true });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    }
  }

  async function signOut() {
    await logout();
    navigate('/menu', { replace: true });
  }

  return (
    <main className="container stack" style={{ gap: 24, maxWidth: 760 }}>
      <div className="line" style={{ alignItems: 'center' }}>
        <h1>Mon compte</h1>
        <button type="button" className="btn btn-outline" onClick={signOut}>
          Se déconnecter
        </button>
      </div>

      <form className="card stack" onSubmit={save}>
        <h2>Mes informations</h2>
        <p className="muted small" style={{ margin: 0 }}>
          Email : {user?.email}
        </p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="prenom">Prénom</label>
            <input id="prenom" required value={form.prenom} onChange={set('prenom')} />
          </div>
          <div className="field">
            <label htmlFor="nom">Nom</label>
            <input id="nom" required value={form.nom} onChange={set('nom')} />
          </div>
          <div className="field">
            <label htmlFor="telephone">Téléphone</label>
            <input id="telephone" type="tel" value={form.telephone} onChange={set('telephone')} />
          </div>
          <div className="field">
            <label htmlFor="complement">Étage, digicode</label>
            <input id="complement" value={form.complementAdresse} onChange={set('complementAdresse')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="adresse">Adresse de livraison</label>
          <input id="adresse" value={form.adresse} onChange={set('adresse')} />
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={form.accepteEmails} onChange={set('accepteEmails')} />
          <span>Recevoir le menu du jour par email</span>
        </label>
        {message && (
          <p className={`alert ${message.ok ? 'alert-success' : 'alert-error'}`} role="status" style={{ margin: 0 }}>
            {message.text}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primary">
            Enregistrer
          </button>
        </div>
      </form>

      <section className="card stack">
        <h2>Mes données personnelles</h2>
        <p className="muted" style={{ margin: 0 }}>
          Conformément au RGPD, vous pouvez télécharger toutes les données que nous détenons sur vous ou supprimer votre
          compte.
        </p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <a href="/api/clients/moi/donnees" className="btn btn-outline" download>
            Télécharger mes données
          </a>
          <button type="button" className="btn btn-danger" onClick={deleteAccount}>
            Supprimer mon compte
          </button>
        </div>
      </section>
    </main>
  );
}

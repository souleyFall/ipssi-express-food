import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { useTitle } from '../hooks/useTitle';
import { api, errorMessage } from '../lib/api';
import type { Profile } from '../lib/types';
import { destinationFor, safeNext } from './LoginPage';

export function RegisterPage() {
  useTitle('Créer un compte');
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('suite'));

  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    motDePasse: '',
    telephone: '',
    adresse: '',
    accepteCgu: false,
    accepteEmails: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to={destinationFor(user, next)} replace />;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const profile = await api<Profile>('/auth/inscription', 'POST', {
        ...form,
        telephone: form.telephone || undefined,
        adresse: form.adresse || undefined,
      });
      setUser(profile);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="auth-page stack" style={{ gap: 24 }}>
      <Logo />
      <div>
        <h1>Créer un compte</h1>
        <p className="muted" style={{ margin: '6px 0 0' }}>
          Déjà inscrit ? <Link to={`/connexion${next ? `?suite=${next}` : ''}`}>Se connecter</Link>
        </p>
      </div>
      <form className="stack" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="prenom">Prénom</label>
            <input id="prenom" required maxLength={50} autoComplete="given-name" value={form.prenom} onChange={set('prenom')} />
          </div>
          <div className="field">
            <label htmlFor="nom">Nom</label>
            <input id="nom" required maxLength={50} autoComplete="family-name" value={form.nom} onChange={set('nom')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label htmlFor="mot-de-passe">Mot de passe</label>
          <input
            id="mot-de-passe"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            aria-describedby="aide-mdp"
            value={form.motDePasse}
            onChange={set('motDePasse')}
          />
          <span id="aide-mdp" className="hint">
            8 caractères minimum, dont un chiffre
          </span>
        </div>
        <div className="field">
          <label htmlFor="telephone">Téléphone (facultatif)</label>
          <input id="telephone" type="tel" autoComplete="tel" value={form.telephone} onChange={set('telephone')} />
        </div>
        <div className="field">
          <label htmlFor="adresse">Adresse de livraison (facultatif)</label>
          <input id="adresse" maxLength={200} autoComplete="street-address" value={form.adresse} onChange={set('adresse')} />
        </div>

        <div className="card stack" style={{ padding: 14, background: 'var(--ground)', gap: 12 }}>
          <label className="checkbox">
            <input type="checkbox" required checked={form.accepteCgu} onChange={set('accepteCgu')} />
            <span>
              J'accepte les conditions d'utilisation et la{' '}
              <Link to="/confidentialite" target="_blank">
                politique de confidentialité
              </Link>{' '}
              (obligatoire)
            </span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={form.accepteEmails} onChange={set('accepteEmails')} />
            <span>Recevoir le menu du jour par email (facultatif, modifiable à tout moment)</span>
          </label>
        </div>

        {error && (
          <p className="alert alert-error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
          {sending ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
      <p className="muted small">
        Vos données sont conservées tant que votre compte est actif. Vous pouvez les consulter, les corriger ou supprimer
        votre compte à tout moment depuis « Mon compte ».
      </p>
    </main>
  );
}

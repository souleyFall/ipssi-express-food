import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { HOME_BY_ROLE, useAuth } from '../context/AuthContext';
import { useTitle } from '../hooks/useTitle';
import { api, errorMessage } from '../lib/api';
import type { Profile } from '../lib/types';

/** N'accepte qu'un chemin interne pour la redirection après connexion. */
export function safeNext(value: string | null): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

/** Page où envoyer un utilisateur connecté : la page demandée (clients) ou l'accueil de son rôle. */
export function destinationFor(user: Profile, next: string | null): string {
  return user.role === 'client' && next ? next : HOME_BY_ROLE[user.role];
}

export function LoginPage() {
  useTitle('Connexion');
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('suite'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (user) return <Navigate to={destinationFor(user, next)} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const profile = await api<Profile>('/auth/connexion', 'POST', { email, motDePasse: password });
      // La redirection est faite par le <Navigate> ci-dessus dès que l'utilisateur est connu.
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
        <h1>Connexion</h1>
        <p className="muted" style={{ margin: '6px 0 0' }}>
          Pas encore de compte ? <Link to={`/inscription${next ? `?suite=${next}` : ''}`}>Créer un compte</Link>
        </p>
      </div>
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="mot-de-passe">Mot de passe</label>
          <input
            id="mot-de-passe"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="alert alert-error" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
          {sending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="muted small">Livreurs et administrateurs utilisent aussi cette page.</p>
    </main>
  );
}

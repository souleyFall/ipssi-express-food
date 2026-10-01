import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { HOME_BY_ROLE, useAuth } from '../context/AuthContext';
import type { Role } from '../lib/types';

/** Réserve une page à un rôle ; renvoie vers /connexion en mémorisant la page demandée. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="container muted">Chargement…</p>;
  if (!user) {
    return <Navigate to={`/connexion?suite=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (user.role !== role) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <>{children}</>;
}

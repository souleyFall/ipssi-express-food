import { Link } from 'react-router-dom';
import { useTitle } from '../hooks/useTitle';

export function NotFoundPage() {
  useTitle('Page introuvable');
  return (
    <main className="container">
      <div className="card empty">
        <h1>Page introuvable</h1>
        <p className="muted">Cette adresse ne correspond à aucune page.</p>
        <Link to="/menu" className="btn btn-primary">
          Voir le menu du jour
        </Link>
      </div>
    </main>
  );
}

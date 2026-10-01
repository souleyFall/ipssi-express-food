import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

const LINKS = [
  { to: '/admin/tableau-de-bord', label: 'Tableau de bord' },
  { to: '/admin/plats', label: 'Plats du jour' },
  { to: '/admin/commandes', label: 'Commandes' },
  { to: '/admin/livreurs', label: 'Livreurs' },
  { to: '/admin/clients', label: 'Clients' },
];

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="admin-layout">
      <nav className="admin-nav" aria-label="Administration">
        <Logo to="/admin/tableau-de-bord" label="Admin" />
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className="nav-item">
            {link.label}
          </NavLink>
        ))}
        <button
          type="button"
          className="btn-link"
          onClick={async () => {
            await logout();
            navigate('/connexion');
          }}
        >
          Déconnexion
        </button>
      </nav>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

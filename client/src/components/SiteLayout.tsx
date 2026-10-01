import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { CartIcon } from './Icons';
import { Logo } from './Logo';

/** Mise en page du site client : en-tête, contenu, pied de page. */
export function SiteLayout() {
  const { user } = useAuth();
  const { count } = useCart();
  const isClient = user?.role === 'client';

  const links = (
    <>
      <NavLink to="/menu">Menu du jour</NavLink>
      {isClient && <NavLink to="/commandes">Mes commandes</NavLink>}
      {user?.role === 'livreur' && <NavLink to="/livreur/missions">Mes missions</NavLink>}
      {user?.role === 'admin' && <NavLink to="/admin/tableau-de-bord">Administration</NavLink>}
    </>
  );

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <Logo />
          <nav className="main-nav" aria-label="Navigation principale">
            {links}
          </nav>
          <div className="header-actions">
            {user ? (
              isClient && (
                <Link to="/compte" className="btn-link">
                  Mon compte
                </Link>
              )
            ) : (
              <Link to="/connexion" className="btn-link">
                Connexion
              </Link>
            )}
            <Link to="/panier" className="btn btn-dark" aria-label={`Panier, ${count} article(s)`}>
              <CartIcon />
              {count}
            </Link>
          </div>
        </div>
        <nav className="mobile-nav" aria-label="Navigation mobile">
          {links}
          {isClient && <NavLink to="/compte">Mon compte</NavLink>}
        </nav>
      </header>
      <Outlet />
      <footer className="footer">
        IPSSI Express Food · Livraison à vélo en moins de 20 minutes ·{' '}
        <Link to="/confidentialite">Politique de confidentialité</Link>
      </footer>
    </>
  );
}

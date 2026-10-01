import { Link } from 'react-router-dom';
import { BikeIcon } from './Icons';

export function Logo({ to = '/menu', label = 'Express Food' }: { to?: string; label?: string }) {
  return (
    <Link to={to} className="logo" aria-label="IPSSI Express Food, accueil">
      <span className="logo__mark">
        <BikeIcon />
      </span>
      <span>{label}</span>
    </Link>
  );
}

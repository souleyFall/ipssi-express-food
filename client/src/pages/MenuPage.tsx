import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon } from '../components/Icons';
import { useCart } from '../context/CartContext';
import { useMenu } from '../hooks/useMenu';
import { useTitle } from '../hooks/useTitle';
import { computeCartTotals, MAX_QUANTITY } from '../lib/cart';
import { formatDay, formatPrice } from '../lib/format';
import type { DailyMenu, Dish } from '../lib/types';

function DishCard({ dish, menuDate }: { dish: Dish; menuDate: string }) {
  const cart = useCart();
  const quantity = cart.quantityOf(dish.id);
  const change = (q: number) => cart.update(dish, q, menuDate);

  return (
    <article className="dish-card">
      <div className="dish-card__image">
        {dish.imageUrl ? <img src={dish.imageUrl} alt={dish.nom} loading="lazy" /> : 'Photo du plat'}
      </div>
      <div className="dish-card__body">
        <div className="line">
          <h3>{dish.nom}</h3>
          <strong>{formatPrice(dish.prixCentimes)}</strong>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          {dish.description}
        </p>
        <div className="dish-card__foot">
          <span className="muted" style={{ fontSize: 12 }}>
            {dish.allergenes.length ? `Allergènes : ${dish.allergenes.join(', ')}` : 'Sans allergène majeur'}
          </span>
          {quantity === 0 ? (
            <button type="button" className="btn btn-primary" onClick={() => change(1)}>
              + Ajouter
            </button>
          ) : (
            <div className="stepper" role="group" aria-label={`Quantité de ${dish.nom}`}>
              <button type="button" className="icon-btn" aria-label="Retirer un" onClick={() => change(quantity - 1)}>
                −
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Ajouter un"
                disabled={quantity >= MAX_QUANTITY}
                onClick={() => change(quantity + 1)}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function CartSummary({ menu, action }: { menu: DailyMenu; action: React.ReactNode }) {
  const { lines } = useCart();
  const totals = computeCartTotals(lines, menu.regles);

  if (lines.length === 0) {
    return <p className="muted">Votre panier est vide. Choisissez un plat ou un dessert du jour.</p>;
  }
  return (
    <div className="stack">
      {lines.map((line) => (
        <div key={line.dish.id} className="line">
          <span>
            {line.quantity} × {line.dish.nom}
          </span>
          <span>{formatPrice(line.dish.prixCentimes * line.quantity)}</span>
        </div>
      ))}
      <hr className="divider" />
      <div className="line">
        <span className="muted">Sous-total</span>
        <span>{formatPrice(totals.subtotal)}</span>
      </div>
      <div className="line">
        <span className="muted">Livraison</span>
        {totals.deliveryFee === 0 ? (
          <strong style={{ color: 'var(--green)' }}>Offerte</strong>
        ) : (
          <span>{formatPrice(totals.deliveryFee)}</span>
        )}
      </div>
      <div className="line line-total">
        <span>Total</span>
        <span>{formatPrice(totals.total)}</span>
      </div>
      {totals.missingForFreeDelivery > 0 ? (
        <div className="free-delivery">
          <span>
            Plus que <strong>{formatPrice(totals.missingForFreeDelivery)}</strong> pour la livraison offerte
          </span>
          <div
            className="progress"
            role="progressbar"
            aria-label="Progression vers la livraison offerte"
            aria-valuenow={Math.round(totals.freeDeliveryProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${totals.freeDeliveryProgress * 100}%` }} />
          </div>
        </div>
      ) : (
        <div className="alert alert-success">Livraison offerte dès {formatPrice(menu.regles.livraisonOfferteDesCentimes)}</div>
      )}
      {action}
    </div>
  );
}

export function MenuPage() {
  useTitle('Menu du jour');
  const { menu, error } = useMenu();
  const cart = useCart();
  const { syncWithMenu } = cart;

  useEffect(() => {
    if (menu) syncWithMenu(menu.date);
  }, [menu, syncWithMenu]);

  if (error) return <p className="container alert alert-error">{error}</p>;
  if (!menu) return <p className="container muted">Chargement du menu…</p>;

  const empty = menu.plats.length === 0 && menu.desserts.length === 0;
  const totals = computeCartTotals(cart.lines, menu.regles);

  return (
    <main className={`container ${cart.count ? 'with-cart-bar' : ''}`}>
      <div className="layout-with-aside">
        <div className="stack" style={{ gap: 28 }}>
          <div className="page-head">
            <div>
              <div className="eyebrow">{formatDay(menu.date)}</div>
              <h1>Le menu du jour</h1>
              <p className="muted" style={{ margin: '6px 0 0' }}>
                Cuisiné ce matin par nos chefs. Livré à vélo en moins de 20 minutes.
              </p>
            </div>
            <span className="badge badge-green" style={{ padding: '10px 14px', fontSize: 14 }}>
              <ClockIcon /> Livraison en moins de 20 min
            </span>
          </div>

          {empty && (
            <div className="card empty">
              <h2>Le menu du jour arrive bientôt</h2>
              <p className="muted">Nos chefs préparent les plats. Revenez dans quelques minutes.</p>
            </div>
          )}

          {menu.plats.length > 0 && (
            <section className="stack" aria-labelledby="titre-plats">
              <h2 id="titre-plats">Plats</h2>
              <div className="dish-grid">
                {menu.plats.map((dish) => (
                  <DishCard key={dish.id} dish={dish} menuDate={menu.date} />
                ))}
              </div>
            </section>
          )}

          {menu.desserts.length > 0 && (
            <section className="stack" aria-labelledby="titre-desserts">
              <h2 id="titre-desserts">Desserts</h2>
              <div className="dish-grid">
                {menu.desserts.map((dish) => (
                  <DishCard key={dish.id} dish={dish} menuDate={menu.date} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="card cart-aside stack" aria-label="Votre panier">
          <h2>Votre panier</h2>
          <CartSummary
            menu={menu}
            action={
              <Link to="/panier" className="btn btn-primary btn-block">
                Commander
              </Link>
            }
          />
        </aside>
      </div>

      {cart.count > 0 && (
        <div className="mobile-cart-bar">
          <Link to="/panier" className="btn btn-dark">
            <span>Voir le panier · {cart.count} article(s)</span>
            <span>{formatPrice(totals.total)}</span>
          </Link>
        </div>
      )}
    </main>
  );
}

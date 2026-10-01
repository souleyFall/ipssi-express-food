import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMenu } from '../hooks/useMenu';
import { useTitle } from '../hooks/useTitle';
import { api, errorMessage } from '../lib/api';
import { computeCartTotals, MAX_QUANTITY } from '../lib/cart';
import { formatPrice, PAYMENT_LABEL } from '../lib/format';
import type { Order, PaymentMethod } from '../lib/types';

export function CartPage() {
  useTitle('Mon panier');
  const { user } = useAuth();
  const cart = useCart();
  const { menu } = useMenu();
  const navigate = useNavigate();

  const [address, setAddress] = useState(user?.adresse ?? '');
  const [details, setDetails] = useState(user?.complementAdresse ?? '');
  const [phone, setPhone] = useState(user?.telephone ?? '');
  const [payment, setPayment] = useState<PaymentMethod>('CARTE_A_LA_LIVRAISON');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Pré-remplit avec le profil quand la session est chargée après le premier affichage.
  useEffect(() => {
    if (!user) return;
    setAddress((a) => a || user.adresse || '');
    setDetails((d) => d || user.complementAdresse || '');
    setPhone((p) => p || user.telephone || '');
  }, [user]);

  if (cart.lines.length === 0) {
    return (
      <main className="container">
        <div className="card empty">
          <h1>Votre panier est vide</h1>
          <p className="muted">Ajoutez un plat ou un dessert du jour pour commander.</p>
          <Link to="/menu" className="btn btn-primary">
            Voir le menu du jour
          </Link>
        </div>
      </main>
    );
  }

  const totals = menu ? computeCartTotals(cart.lines, menu.regles) : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const order = await api<Order>('/commandes', 'POST', {
        articles: cart.lines.map((l) => ({ platId: l.dish.id, quantite: l.quantity })),
        adresseLivraison: address,
        complementAdresse: details || undefined,
        telephone: phone,
        moyenPaiement: payment,
      });
      cart.clear();
      navigate(`/commandes/${order.numero}/suivi`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="container stack" style={{ gap: 24 }}>
      <Link to="/menu" className="btn-link">
        ← Retour au menu
      </Link>
      <h1>Finaliser ma commande</h1>

      <div className="layout-with-aside" style={{ gridTemplateColumns: 'minmax(0, 1fr) 380px' }}>
        {user?.role === 'client' ? (
          <form id="commande" className="stack" style={{ gap: 20 }} onSubmit={submit}>
            <fieldset className="card">
              <legend>1. Adresse de livraison</legend>
              <div className="field">
                <label htmlFor="adresse">Adresse</label>
                <input
                  id="adresse"
                  required
                  maxLength={200}
                  autoComplete="street-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="complement">Étage, digicode</label>
                  <input
                    id="complement"
                    maxLength={200}
                    placeholder="Ex. 3e étage, code 4521"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="telephone">Téléphone</label>
                  <input
                    id="telephone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="06 12 34 56 78"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="card">
              <legend>2. Paiement</legend>
              {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((method) => (
                <label key={method} className="radio-card">
                  <input
                    type="radio"
                    name="paiement"
                    value={method}
                    checked={payment === method}
                    onChange={() => setPayment(method)}
                  />
                  {PAYMENT_LABEL[method]}
                </label>
              ))}
            </fieldset>

            <p className="muted small" style={{ margin: 0 }}>
              Votre adresse et votre téléphone servent uniquement à livrer cette commande et ne sont transmis qu'au
              livreur. <Link to="/confidentialite">Politique de confidentialité</Link>
            </p>
          </form>
        ) : (
          <div className="card stack">
            <h2>Connectez-vous pour commander</h2>
            <p className="muted" style={{ margin: 0 }}>
              Un compte permet de suivre votre livreur en temps réel.
            </p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <Link to="/connexion?suite=/panier" className="btn btn-primary">
                Se connecter
              </Link>
              <Link to="/inscription?suite=/panier" className="btn btn-outline">
                Créer un compte
              </Link>
            </div>
          </div>
        )}

        <aside className="card stack" aria-label="Récapitulatif">
          <h2>Récapitulatif</h2>
          {cart.lines.map((line) => (
            <div key={line.dish.id} className="line" style={{ alignItems: 'center' }}>
              <div className="row" style={{ gap: 10 }}>
                <div className="stepper" role="group" aria-label={`Quantité de ${line.dish.nom}`}>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Retirer un"
                    onClick={() => menu && cart.update(line.dish, line.quantity - 1, menu.date)}
                  >
                    −
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Ajouter un"
                    disabled={line.quantity >= MAX_QUANTITY}
                    onClick={() => menu && cart.update(line.dish, line.quantity + 1, menu.date)}
                  >
                    +
                  </button>
                </div>
                <span>{line.dish.nom}</span>
              </div>
              <span>{formatPrice(line.dish.prixCentimes * line.quantity)}</span>
            </div>
          ))}
          <hr className="divider" />
          {totals && (
            <>
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
              {totals.missingForFreeDelivery > 0 && (
                <p className="free-delivery" style={{ margin: 0 }}>
                  Ajoutez {formatPrice(totals.missingForFreeDelivery)} pour la livraison offerte.
                </p>
              )}
            </>
          )}
          {error && (
            <p className="alert alert-error" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
          {user?.role === 'client' && (
            <button type="submit" form="commande" className="btn btn-primary btn-block" disabled={sending}>
              {sending ? 'Envoi…' : `Confirmer la commande${totals ? ` · ${formatPrice(totals.total)}` : ''}`}
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePolling } from '../../hooks/usePolling';
import { useTitle } from '../../hooks/useTitle';
import { api, errorMessage } from '../../lib/api';
import { COURIER_STATUS_LABEL, formatTime, PAYMENT_LABEL } from '../../lib/format';
import type { CourierMissions, CourierStatus } from '../../lib/types';

const REFRESH_MS = 10_000;
/** Fréquence maximale d'envoi de la position (économise batterie et requêtes). */
const POSITION_INTERVAL_MS = 15_000;

const STATUS_COLOR: Record<CourierStatus, string> = {
  LIBRE: 'var(--green)',
  EN_LIVRAISON: 'var(--blue)',
  INDISPONIBLE: 'var(--muted)',
};

/** Partage de la position GPS, activé explicitement par le livreur (RGPD). */
function usePositionSharing(enabled: boolean) {
  const [error, setError] = useState<string | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (!('geolocation' in navigator)) {
      setError("La géolocalisation n'est pas disponible sur cet appareil");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (Date.now() - lastSent.current < POSITION_INTERVAL_MS) return;
        lastSent.current = Date.now();
        api('/livreurs/moi/position', 'PATCH', { lat: coords.latitude, lng: coords.longitude }).catch((err) =>
          setError(errorMessage(err)),
        );
      },
      () => setError('Autorisez la localisation dans votre navigateur pour la partager'),
      { enableHighAccuracy: true },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return error;
}

export function CourierMissionsPage() {
  useTitle('Mes missions');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<CourierMissions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharePosition, setSharePosition] = useState(false);
  const positionError = usePositionSharing(sharePosition);

  const load = useCallback(() => {
    api<CourierMissions>('/livreurs/moi/missions')
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);
  usePolling(load, REFRESH_MS);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const status = data?.livreur.statut;
  const mission = data?.missionEnCours;

  return (
    <div className="courier-shell">
      <header>
        <div>
          <div className="small" style={{ color: '#a8a29e' }}>
            Espace livreur
          </div>
          <h1>Bonjour {user?.prenom}</h1>
        </div>
        <button
          type="button"
          className="btn-link"
          style={{ color: '#d6d3d1' }}
          onClick={async () => {
            await logout();
            navigate('/connexion');
          }}
        >
          Déconnexion
        </button>
      </header>

      <main className="courier-body">
        <div>
          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}

          {status && (
            <div className="card line" style={{ alignItems: 'center', padding: '14px 16px' }}>
              <label htmlFor="disponible" style={{ cursor: 'pointer' }}>
                <strong style={{ display: 'block' }}>Mon statut</strong>
                <span className="small" style={{ color: STATUS_COLOR[status], fontWeight: 700 }}>
                  {COURIER_STATUS_LABEL[status]}
                </span>
              </label>
              <span className="switch">
                <input
                  id="disponible"
                  type="checkbox"
                  role="switch"
                  aria-label="Je suis disponible pour livrer"
                  checked={status !== 'INDISPONIBLE'}
                  disabled={status === 'EN_LIVRAISON' || busy}
                  onChange={(e) =>
                    run(() => api('/livreurs/moi/statut', 'PATCH', { statut: e.target.checked ? 'LIBRE' : 'INDISPONIBLE' }))
                  }
                />
                <span />
              </span>
            </div>
          )}

          <label className="card checkbox" style={{ padding: '14px 16px', alignItems: 'center' }}>
            <input type="checkbox" checked={sharePosition} onChange={(e) => setSharePosition(e.target.checked)} />
            <span>
              <strong>Partager ma position</strong>
              <span className="muted small" style={{ display: 'block' }}>
                Visible par le client uniquement pendant sa livraison. Seule la dernière position est conservée.
              </span>
            </span>
          </label>
          {positionError && <p className="alert alert-error">{positionError}</p>}

          {mission ? (
            <section className="card mission stack">
              <div className="line">
                <span className="eyebrow">Mission en cours</span>
                <span className="muted small">n° {mission.numero}</span>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                <div className="route-point">
                  <div>
                    <strong>QG Express Food</strong>
                    <div className="muted small">
                      {mission.recupereeLe ? `Récupérée à ${formatTime(mission.recupereeLe)}` : 'À récupérer'}
                    </div>
                  </div>
                </div>
                <div className="route-point to">
                  <div>
                    <strong>{mission.adresseLivraison}</strong>
                    {mission.complementAdresse && <div className="muted small">{mission.complementAdresse}</div>}
                    <div className="small">
                      <a href={`tel:${mission.telephone.replace(/\s/g, '')}`}>{mission.telephone}</a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card line small" style={{ background: 'var(--ground)', padding: 12, border: 0 }}>
                <span>{mission.articles.map((a) => `${a.quantite} × ${a.nom}`).join(', ')}</span>
                <strong style={{ whiteSpace: 'nowrap' }}>Avant {formatTime(mission.livraisonEstimeeA)}</strong>
              </div>
              <div className="muted small">{PAYMENT_LABEL[mission.moyenPaiement]}</div>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <a
                  className="btn btn-outline"
                  href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(mission.adresseLivraison)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Itinéraire
                </a>
                {mission.statut === 'ASSIGNEE' ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => run(() => api(`/commandes/${mission.numero}/recuperation`, 'POST'))}
                  >
                    Commande récupérée
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={busy}
                    onClick={() => run(() => api(`/commandes/${mission.numero}/livraison`, 'POST'))}
                  >
                    Marquer livrée
                  </button>
                )}
              </div>
            </section>
          ) : (
            data && (
              <section className="card empty">
                <strong>Aucune mission pour le moment</strong>
                <p className="muted small">
                  {status === 'LIBRE'
                    ? 'Vous recevrez la prochaine commande automatiquement.'
                    : 'Passez en « disponible » pour recevoir des commandes.'}
                </p>
              </section>
            )
          )}

          {data && data.livreesAujourdhui.length > 0 && (
            <section className="stack" style={{ gap: 8 }}>
              <h2 className="eyebrow" style={{ color: 'var(--muted)' }}>
                Livrées aujourd'hui
              </h2>
              {data.livreesAujourdhui.map((d) => (
                <div key={d.numero} className="card line" style={{ padding: '12px 14px', alignItems: 'center' }}>
                  <div>
                    <strong>n° {d.numero}</strong>
                    <div className="muted small">{d.adresseLivraison}</div>
                  </div>
                  <span className="badge badge-green">{d.dureeMinutes} min</span>
                </div>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

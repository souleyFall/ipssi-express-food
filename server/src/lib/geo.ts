export interface Point {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
/** Vitesse moyenne d'un vélo en ville. */
export const BIKE_SPEED_KMH = 15;
/** Temps forfaitaire pour rejoindre le QG quand la position du livreur est inconnue. */
const UNKNOWN_POSITION_PICKUP_MINUTES = 5;

export function distanceKm(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Heure de livraison estimée : trajet du livreur jusqu'au QG + trajet moyen QG -> client.
 */
export function estimateDeliveryAt(
  from: Date,
  courierPosition: Point | null,
  qg: Point,
  rideMinutes: number,
): Date {
  const pickupMinutes = courierPosition
    ? (distanceKm(courierPosition, qg) / BIKE_SPEED_KMH) * 60
    : UNKNOWN_POSITION_PICKUP_MINUTES;
  return new Date(from.getTime() + Math.ceil(pickupMinutes + rideMinutes) * 60_000);
}

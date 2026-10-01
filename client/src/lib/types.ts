export type Role = 'client' | 'livreur' | 'admin';
export type DishType = 'PLAT' | 'DESSERT';
export type OrderStatus = 'EN_ATTENTE' | 'ASSIGNEE' | 'EN_LIVRAISON' | 'LIVREE';
export type CourierStatus = 'LIBRE' | 'EN_LIVRAISON' | 'INDISPONIBLE';
export type PaymentMethod = 'CARTE_A_LA_LIVRAISON' | 'ESPECES_A_LA_LIVRAISON';

export interface Profile {
  id: string;
  role: Role;
  prenom: string;
  nom?: string;
  email: string;
  telephone?: string | null;
  adresse?: string | null;
  complementAdresse?: string | null;
  accepteEmails?: boolean;
}

export interface Dish {
  id: string;
  nom: string;
  description: string;
  prixCentimes: number;
  type: DishType;
  date: string;
  allergenes: string[];
  imageUrl: string | null;
}

export interface DeliveryRules {
  fraisLivraisonCentimes: number;
  livraisonOfferteDesCentimes: number;
}

export interface DailyMenu {
  date: string;
  plats: Dish[];
  desserts: Dish[];
  regles: DeliveryRules;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Order {
  numero: number;
  statut: OrderStatus;
  articles: { platId: string; nom: string; type: DishType; prixUnitaireCentimes: number; quantite: number }[];
  sousTotalCentimes: number;
  fraisLivraisonCentimes: number;
  totalCentimes: number;
  adresseLivraison: string;
  complementAdresse: string | null;
  telephone: string;
  moyenPaiement: PaymentMethod;
  livraisonEstimeeA: string | null;
  creeeLe: string;
  assigneeLe: string | null;
  recupereeLe: string | null;
  livreeLe: string | null;
  livreur: { prenom: string; position: GeoPoint | null; positionMiseAJourLe: string | null } | null;
}

export interface AdminOrder extends Order {
  client: string;
}

export interface CourierMissions {
  livreur: { prenom: string; statut: CourierStatus };
  missionEnCours: Order | null;
  livreesAujourdhui: { numero: number; adresseLivraison: string; dureeMinutes: number }[];
}

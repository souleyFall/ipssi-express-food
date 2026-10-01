import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

export const orderNumber = z.coerce.number().int().positive();

export const email = z.string().trim().toLowerCase().pipe(z.email('Adresse email invalide').max(254));

export const password = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(100)
  .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre');

export const phone = z
  .string()
  .trim()
  .regex(/^\+?[\d\s.-]{10,20}$/, 'Numéro de téléphone invalide');

export const shortText = (max: number) => z.string().trim().min(1).max(max);

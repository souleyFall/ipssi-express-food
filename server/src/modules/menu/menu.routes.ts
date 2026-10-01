import type { Dish } from '@prisma/client';
import { Router } from 'express';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { parisDate } from '../../lib/dates.js';

export function toDishDto(dish: Dish) {
  return {
    id: dish.id,
    nom: dish.name,
    description: dish.description,
    prixCentimes: dish.priceCents,
    type: dish.type,
    date: dish.menuDate,
    allergenes: dish.allergens,
    imageUrl: dish.imageUrl,
  };
}

export const menuRouter = Router();

/** Menu du jour public : 2 plats et 2 desserts qui changent chaque jour. */
menuRouter.get('/du-jour', async (_req, res) => {
  const date = parisDate();
  const dishes = await prisma.dish.findMany({ where: { menuDate: date }, orderBy: { createdAt: 'asc' } });
  res.json({
    date,
    plats: dishes.filter((d) => d.type === 'PLAT').map(toDishDto),
    desserts: dishes.filter((d) => d.type === 'DESSERT').map(toDishDto),
    regles: {
      fraisLivraisonCentimes: config.DELIVERY_FEE_CENTS,
      livraisonOfferteDesCentimes: config.FREE_DELIVERY_THRESHOLD_CENTS,
    },
  });
});

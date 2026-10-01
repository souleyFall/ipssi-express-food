import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { parisDate } from '../src/lib/dates.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';

export const app = createApp();
export const PASSWORD = 'MotDePasse1';

export async function resetDatabase() {
  await prisma.order.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.courier.deleteMany();
  await prisma.client.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.$runCommandRaw({ delete: 'compteurs', deletes: [{ q: {}, limit: 0 }] });
}

/** Agent HTTP qui conserve le cookie de session. */
export function agent() {
  return request.agent(app);
}

export async function registerClient(email = 'camille@test.fr') {
  const client = agent();
  await client
    .post('/api/auth/inscription')
    .send({
      prenom: 'Camille',
      nom: 'Durand',
      email,
      motDePasse: PASSWORD,
      accepteCgu: true,
    })
    .expect(201);
  return client;
}

export async function createCourier(email: string, firstName: string, status: 'LIBRE' | 'INDISPONIBLE' = 'LIBRE') {
  await prisma.courier.create({
    data: {
      email,
      firstName,
      lastName: 'Test',
      passwordHash: await hashPassword(PASSWORD),
      status,
    },
  });
  const courier = agent();
  await courier.post('/api/auth/connexion').send({ email, motDePasse: PASSWORD }).expect(200);
  return courier;
}

export async function createAdmin() {
  await prisma.admin.create({
    data: { email: 'admin@test.fr', firstName: 'Admin', passwordHash: await hashPassword(PASSWORD) },
  });
  const admin = agent();
  await admin.post('/api/auth/connexion').send({ email: 'admin@test.fr', motDePasse: PASSWORD }).expect(200);
  return admin;
}

/** Menu du jour : 2 plats à 12,50 € et 11,90 €, 2 desserts à 4,00 € et 3,80 €. */
export async function seedTodayMenu() {
  const menuDate = parisDate();
  const make = (name: string, priceCents: number, type: 'PLAT' | 'DESSERT') =>
    prisma.dish.create({
      data: { name, description: `${name} maison`, priceCents, type, menuDate, allergens: [] },
    });
  return {
    yassa: await make('Poulet yassa', 1250, 'PLAT'),
    risotto: await make('Risotto', 1190, 'PLAT'),
    tarte: await make('Tarte citron', 400, 'DESSERT'),
    mousse: await make('Mousse chocolat', 380, 'DESSERT'),
  };
}

export const deliveryInfo = {
  adresseLivraison: '12 rue de la Paix, 75002 Paris',
  telephone: '06 12 34 56 78',
  moyenPaiement: 'CARTE_A_LA_LIVRAISON',
};

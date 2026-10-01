/**
 * Données de démonstration : 1 admin, 3 livreurs, 1 client et le menu du jour.
 * Usage : npm run db:seed (idempotent : relançable sans créer de doublons).
 * Les mots de passe de démo ne doivent jamais être utilisés en production.
 */
import { config } from '../src/config.js';
import { prisma } from '../src/db.js';
import { parisDate } from '../src/lib/dates.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';

if (config.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
  console.error('Seed refusé en production (définir SEED_ALLOW_PRODUCTION=true pour forcer).');
  process.exit(1);
}

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'Demo2026!';

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await prisma.admin.upsert({
    where: { email: 'admin@expressfood.test' },
    update: {},
    create: { email: 'admin@expressfood.test', firstName: 'Admin', passwordHash },
  });

  const couriers = [
    { firstName: 'Karim', lastName: 'Benali', email: 'karim@expressfood.test', lat: 48.8606, lng: 2.3376 },
    { firstName: 'Inès', lastName: 'Moreau', email: 'ines@expressfood.test', lat: 48.8584, lng: 2.3488 },
    { firstName: 'Lucas', lastName: 'Martin', email: 'lucas@expressfood.test', lat: 48.8530, lng: 2.3499 },
  ];
  for (const c of couriers) {
    await prisma.courier.upsert({
      where: { email: c.email },
      update: {},
      create: {
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        passwordHash,
        status: 'LIBRE',
        position: { lat: c.lat, lng: c.lng },
        positionUpdatedAt: new Date(),
      },
    });
  }

  await prisma.client.upsert({
    where: { email: 'client@expressfood.test' },
    update: {},
    create: {
      email: 'client@expressfood.test',
      firstName: 'Camille',
      lastName: 'Durand',
      phone: '06 12 34 56 78',
      address: '12 rue de la Paix, 75002 Paris',
      passwordHash,
      cguAcceptedAt: new Date(),
    },
  });

  const today = parisDate();
  if ((await prisma.dish.count({ where: { menuDate: today } })) === 0) {
    await prisma.dish.createMany({
      data: [
        {
          name: 'Poulet yassa',
          description: 'Poulet mariné au citron et aux oignons, riz parfumé.',
          priceCents: 1250,
          type: 'PLAT',
          menuDate: today,
          allergens: ['moutarde'],
        },
        {
          name: 'Risotto aux champignons',
          description: 'Riz arborio, champignons de Paris, parmesan.',
          priceCents: 1190,
          type: 'PLAT',
          menuDate: today,
          allergens: ['lait'],
        },
        {
          name: 'Tarte citron meringuée',
          description: 'Pâte sablée maison, crème au citron.',
          priceCents: 400,
          type: 'DESSERT',
          menuDate: today,
          allergens: ['gluten', 'œufs', 'lait'],
        },
        {
          name: 'Mousse au chocolat',
          description: 'Chocolat noir 70 %, éclats de noisette.',
          priceCents: 380,
          type: 'DESSERT',
          menuDate: today,
          allergens: ['œufs', 'lait', 'fruits à coque'],
        },
      ],
    });
  }

  console.log(`Seed terminé (menu du ${today}). Mot de passe des comptes de démo : voir README.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import {
  agent,
  createAdmin,
  createCourier,
  deliveryInfo,
  PASSWORD,
  registerClient,
  resetDatabase,
  seedTodayMenu,
} from './helpers.js';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('Authentification', () => {
  it('refuse une inscription sans consentement aux CGU (RGPD)', async () => {
    const res = await agent()
      .post('/api/auth/inscription')
      .send({ prenom: 'A', nom: 'B', email: 'a@b.fr', motDePasse: PASSWORD, accepteCgu: false });
    expect(res.status).toBe(400);
  });

  it('refuse un mot de passe trop faible', async () => {
    const res = await agent()
      .post('/api/auth/inscription')
      .send({ prenom: 'A', nom: 'B', email: 'a@b.fr', motDePasse: 'motdepasse', accepteCgu: true });
    expect(res.status).toBe(400);
  });

  it('inscrit un client, ne stocke jamais le mot de passe en clair et ouvre une session httpOnly', async () => {
    const res = await agent()
      .post('/api/auth/inscription')
      .send({ prenom: 'Camille', nom: 'Durand', email: 'Camille@Test.fr', motDePasse: PASSWORD, accepteCgu: true });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role: 'client', email: 'camille@test.fr', accepteEmails: false });
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);

    const stored = await prisma.client.findUniqueOrThrow({ where: { email: 'camille@test.fr' } });
    expect(stored.passwordHash).not.toContain(PASSWORD);
    expect(stored.cguAcceptedAt).toBeInstanceOf(Date);
  });

  it('refuse un email déjà utilisé', async () => {
    await registerClient();
    const res = await agent()
      .post('/api/auth/inscription')
      .send({ prenom: 'A', nom: 'B', email: 'camille@test.fr', motDePasse: PASSWORD, accepteCgu: true });
    expect(res.status).toBe(409);
  });

  it('connecte avec le bon mot de passe uniquement', async () => {
    await registerClient();
    const bad = await agent().post('/api/auth/connexion').send({ email: 'camille@test.fr', motDePasse: 'Mauvais123' });
    expect(bad.status).toBe(401);
    const good = await agent().post('/api/auth/connexion').send({ email: 'camille@test.fr', motDePasse: PASSWORD });
    expect(good.status).toBe(200);
    expect(good.body.role).toBe('client');
  });

  it('protège les routes privées', async () => {
    expect((await agent().get('/api/commandes')).status).toBe(401);
    const client = await registerClient();
    expect((await client.get('/api/admin/tableau-de-bord')).status).toBe(403);
  });
});

describe('Menu du jour', () => {
  it('renvoie les 2 plats et 2 desserts du jour', async () => {
    await seedTodayMenu();
    const res = await agent().get('/api/menu/du-jour').expect(200);
    expect(res.body.plats).toHaveLength(2);
    expect(res.body.desserts).toHaveLength(2);
  });

  it('interdit un 3e plat le même jour', async () => {
    await seedTodayMenu();
    const admin = await createAdmin();
    const res = await admin.post('/api/admin/plats').send({
      nom: 'Couscous',
      description: 'Semoule et légumes',
      prixCentimes: 1300,
      type: 'PLAT',
      date: (await agent().get('/api/menu/du-jour')).body.date,
    });
    expect(res.status).toBe(409);
  });
});

describe('Commande et livraison', () => {
  it('calcule les prix côté serveur et facture la livraison sous 19,99 €', async () => {
    const menu = await seedTodayMenu();
    const client = await registerClient();
    const res = await client
      .post('/api/commandes')
      .send({ ...deliveryInfo, articles: [{ platId: menu.yassa.id, quantite: 1 }] })
      .expect(201);
    expect(res.body).toMatchObject({
      sousTotalCentimes: 1250,
      fraisLivraisonCentimes: 250,
      totalCentimes: 1500,
      statut: 'EN_ATTENTE',
    });
  });

  it('offre la livraison dès 19,99 €', async () => {
    const menu = await seedTodayMenu();
    const client = await registerClient();
    const res = await client
      .post('/api/commandes')
      .send({
        ...deliveryInfo,
        articles: [
          { platId: menu.yassa.id, quantite: 1 },
          { platId: menu.tarte.id, quantite: 2 },
        ],
      })
      .expect(201);
    expect(res.body.sousTotalCentimes).toBe(2050);
    expect(res.body.fraisLivraisonCentimes).toBe(0);
  });

  it('refuse un plat qui n’est pas au menu du jour', async () => {
    await seedTodayMenu();
    const old = await prisma.dish.create({
      data: { name: 'Ancien', description: 'x', priceCents: 100, type: 'PLAT', menuDate: '2020-01-01', allergens: [] },
    });
    const client = await registerClient();
    const res = await client.post('/api/commandes').send({ ...deliveryInfo, articles: [{ platId: old.id, quantite: 1 }] });
    expect(res.status).toBe(400);
  });

  it('suit tout le parcours : livreur missionné, temps estimé, récupération, livraison', async () => {
    const menu = await seedTodayMenu();
    const courier = await createCourier('karim@test.fr', 'Karim');
    const client = await registerClient();

    const created = await client
      .post('/api/commandes')
      .send({ ...deliveryInfo, articles: [{ platId: menu.risotto.id, quantite: 2 }] })
      .expect(201);
    const numero = created.body.numero;

    // Le client voit qu'un livreur a pris sa commande et le temps estimé
    expect(created.body.statut).toBe('ASSIGNEE');
    expect(created.body.livreur.prenom).toBe('Karim');
    const etaMinutes = (new Date(created.body.livraisonEstimeeA).getTime() - Date.now()) / 60_000;
    expect(etaMinutes).toBeGreaterThan(0);
    expect(etaMinutes).toBeLessThanOrEqual(20);

    const missions = await courier.get('/api/livreurs/moi/missions').expect(200);
    expect(missions.body.livreur.statut).toBe('EN_LIVRAISON');
    expect(missions.body.missionEnCours.numero).toBe(numero);

    // Livrer avant d'avoir récupéré est refusé
    expect((await courier.post(`/api/commandes/${numero}/livraison`)).status).toBe(409);

    await courier.post(`/api/commandes/${numero}/recuperation`).expect(200);
    const tracking = await client.get(`/api/commandes/${numero}`).expect(200);
    expect(tracking.body.statut).toBe('EN_LIVRAISON');

    const delivered = await courier.post(`/api/commandes/${numero}/livraison`).expect(200);
    expect(delivered.body.statut).toBe('LIVREE');
    // RGPD : la position du livreur n'est plus exposée une fois la livraison terminée
    expect(delivered.body.livreur.position).toBeNull();

    const after = await courier.get('/api/livreurs/moi/missions').expect(200);
    expect(after.body.livreur.statut).toBe('LIBRE');
    expect(after.body.livreesAujourdhui).toHaveLength(1);
  });

  it('met la commande en attente sans livreur libre puis l’attribue dès qu’un livreur se libère', async () => {
    const menu = await seedTodayMenu();
    const courier = await createCourier('ines@test.fr', 'Inès', 'INDISPONIBLE');
    const client = await registerClient();

    const created = await client
      .post('/api/commandes')
      .send({ ...deliveryInfo, articles: [{ platId: menu.mousse.id, quantite: 1 }] })
      .expect(201);
    expect(created.body.statut).toBe('EN_ATTENTE');
    expect(created.body.livreur).toBeNull();

    await courier.patch('/api/livreurs/moi/statut').send({ statut: 'LIBRE' }).expect(200);
    const tracking = await client.get(`/api/commandes/${created.body.numero}`).expect(200);
    expect(tracking.body.statut).toBe('ASSIGNEE');
    expect(tracking.body.livreur.prenom).toBe('Inès');
  });

  it('ne confie jamais deux commandes simultanées au même livreur', async () => {
    const menu = await seedTodayMenu();
    await createCourier('karim@test.fr', 'Karim');
    const a = await registerClient('a@test.fr');
    const b = await registerClient('b@test.fr');
    const body = { ...deliveryInfo, articles: [{ platId: menu.yassa.id, quantite: 1 }] };

    const [ra, rb] = await Promise.all([a.post('/api/commandes').send(body), b.post('/api/commandes').send(body)]);
    const statuses = [ra.body.statut, rb.body.statut].sort();
    expect(statuses).toEqual(['ASSIGNEE', 'EN_ATTENTE']);
    expect(ra.body.numero).not.toBe(rb.body.numero);
  });

  it('cache la commande d’un client aux autres clients', async () => {
    const menu = await seedTodayMenu();
    const owner = await registerClient('a@test.fr');
    const other = await registerClient('b@test.fr');
    const created = await owner
      .post('/api/commandes')
      .send({ ...deliveryInfo, articles: [{ platId: menu.yassa.id, quantite: 1 }] })
      .expect(201);
    expect((await other.get(`/api/commandes/${created.body.numero}`)).status).toBe(404);
  });

  it('empêche un livreur de changer de statut pendant une livraison', async () => {
    const menu = await seedTodayMenu();
    const courier = await createCourier('karim@test.fr', 'Karim');
    const client = await registerClient();
    await client.post('/api/commandes').send({ ...deliveryInfo, articles: [{ platId: menu.yassa.id, quantite: 1 }] });
    const res = await courier.patch('/api/livreurs/moi/statut').send({ statut: 'INDISPONIBLE' });
    expect(res.status).toBe(409);
  });
});

describe('RGPD', () => {
  it('exporte toutes les données du client sans le mot de passe', async () => {
    const client = await registerClient();
    const res = await client.get('/api/clients/moi/donnees').expect(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body.profil.email).toBe('camille@test.fr');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('supprime le compte et anonymise ses commandes', async () => {
    const menu = await seedTodayMenu();
    const courier = await createCourier('karim@test.fr', 'Karim');
    const client = await registerClient();
    const { body } = await client
      .post('/api/commandes')
      .send({ ...deliveryInfo, articles: [{ platId: menu.yassa.id, quantite: 1 }] });

    // Impossible pendant la livraison
    expect((await client.delete('/api/clients/moi')).status).toBe(409);

    await courier.post(`/api/commandes/${body.numero}/recuperation`).expect(200);
    await courier.post(`/api/commandes/${body.numero}/livraison`).expect(200);
    await client.delete('/api/clients/moi').expect(204);

    expect(await prisma.client.count()).toBe(0);
    const order = await prisma.order.findUniqueOrThrow({ where: { number: body.numero } });
    expect(order.clientId).toBeNull();
    expect(order.deliveryAddress).toBe('[supprimé]');
    expect(order.contactPhone).toBe('[supprimé]');
  });
});

describe('Administration', () => {
  it('donne les indicateurs du tableau de bord', async () => {
    await createCourier('karim@test.fr', 'Karim');
    const admin = await createAdmin();
    const res = await admin.get('/api/admin/tableau-de-bord').expect(200);
    expect(res.body).toMatchObject({ commandesDuJour: 0, livreursLibres: 1, livreursTotal: 1 });
  });

  it('crée un compte livreur qui peut ensuite se connecter', async () => {
    const admin = await createAdmin();
    await admin
      .post('/api/admin/livreurs')
      .send({ prenom: 'Lucas', nom: 'Martin', email: 'lucas@test.fr', motDePasse: PASSWORD })
      .expect(201);
    const login = await agent().post('/api/auth/connexion').send({ email: 'lucas@test.fr', motDePasse: PASSWORD });
    expect(login.body.role).toBe('livreur');
  });
});

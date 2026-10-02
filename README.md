# IPSSI Express Food

Application web de la startup **IPSSI Express Food** : chaque jour, 2 plats et 2 desserts préparés au QG, commandés en ligne et **livrés à vélo en moins de 20 minutes**.

- Le client commande un ou plusieurs plats et desserts. **La livraison est offerte à partir de 19,99 €** (2,50 € en dessous).
- Dès la commande validée, **un livreur libre est missionné automatiquement** (le plus proche du QG).
- Le client suit sa commande sur une page qui indique **si un livreur l'a prise et le temps estimé avant livraison**.
- Les livreurs gèrent leur statut, leur position et leurs missions ; l'équipe gère le menu, les commandes et les livreurs depuis un back-office.

**Stack (MERN + TypeScript)** : MongoDB Atlas · Prisma (ORM) · Express 5 · React 19 · Node.js

| Lien | |
|---|---|
| Tableau Trello (répartition à faire / en cours / fait) | https://trello.com/b/tR9wZo7v/ipssi-express-food |
| Support de présentation (résultats pour le manager) | https://drive.google.com/file/d/1ug6SRYl92R9bLhFIBd7bysQTnKEEXcQN/view?usp=sharing |
| Répartition détaillée des tâches et sprints | [docs/REPARTITION_DES_TACHES.md](docs/REPARTITION_DES_TACHES.md) |
| Base de données, sécurité Atlas, RGPD | [docs/BASE_DE_DONNEES.md](docs/BASE_DE_DONNEES.md) |

## Équipe

| Membre | Rôle |
|---|---|
| **Souley** | Chef de projet, lead backend (API, sécurité, CI) |
| **Rayan** | Lead données (MongoDB Atlas, Prisma, sécurisation, déploiement) |
| **Redouane** | Lead frontend (React, responsive, parcours utilisateur) |

Méthode Agile : 3 sprints d'une semaine, daily, revue et rétrospective ; une carte Trello par tâche, une branche et une Pull Request relue par carte.

---

## Lancer le projet

### Prérequis

- Node.js **20.11 ou plus** (testé avec Node 24)
- Une base MongoDB : **Atlas** (recommandé), ou en local avec Docker

### 1. Installer

```bash
git clone https://github.com/souleyFall/ipssi-express-food.git
cd ipssi-express-food
npm install
```

### 2. Configurer

```bash
cp server/.env.example server/.env
```

Renseigner dans `server/.env` :
- `DATABASE_URL` : chaîne de connexion Atlas de l'utilisateur applicatif (voir [docs/BASE_DE_DONNEES.md](docs/BASE_DE_DONNEES.md)), avec le nom de base `express-food` ;
- `JWT_SECRET` : une chaîne aléatoire d'au moins 32 caractères, à générer avec :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Sans Atlas, une base locale se lance avec Docker (Prisma exige un *replica set*, déjà configuré dans le fichier compose) :

```bash
docker compose up -d
```

puis `DATABASE_URL="mongodb://localhost:27017/express-food?replicaSet=rs0&directConnection=true"`.

### 3. Créer les collections et les données de démo

```bash
npm run db:push
npm run db:seed
```

Le seed crée le menu du jour et des comptes de démonstration, tous avec le mot de passe `Demo2026!` (à ne **jamais** utiliser en production, le seed refuse d'ailleurs de s'exécuter si `NODE_ENV=production`) :

| Rôle | Email | Page d'accueil |
|---|---|---|
| Client | `client@expressfood.test` | `/menu` |
| Livreurs | `karim@`, `ines@`, `lucas@expressfood.test` | `/livreur/missions` |
| Admin | `admin@expressfood.test` | `/admin/tableau-de-bord` |

### 4. Lancer en développement

```bash
npm run dev
```

- Front React (Vite) : http://localhost:5173
- API Express : http://localhost:4000 (le front appelle `/api`, redirigé vers l'API par Vite)

### 5. Tests

```bash
npm test
```

- **Backend** : 26 tests (Vitest + Supertest) sur une vraie base MongoDB en mémoire. Ils couvrent l'authentification, le menu, les frais de livraison, l'attribution des livreurs (y compris deux commandes simultanées), le parcours complet jusqu'à la livraison, les droits d'accès et le RGPD.
- **Frontend** : calcul du panier et de la livraison offerte.

Le premier lancement télécharge un binaire MongoDB (environ 800 Mo, une seule fois).

### 6. Build et production

```bash
npm run build
npm start
```

En production, le serveur Express sert à la fois l'API (`/api/...`) et le front React compilé : il n'y a qu'une application à déployer.

---

## Déploiement

Pour la soutenance, l'application est présentée **en local** (`npm run dev`), branchée sur la base MongoDB Atlas. Le code est néanmoins prêt à être déployé :

### Render

Le fichier [`render.yaml`](render.yaml) décrit le service : *New → Blueprint* sur Render, choisir ce dépôt, puis renseigner `DATABASE_URL` (utilisateur applicatif Atlas). `JWT_SECRET` est généré automatiquement. Les collections sont créées depuis un poste de l'équipe avec `npm run db:push` (même base Atlas) ; il faut aussi ajouter les IP sortantes de Render dans l'accès réseau Atlas.

### Heroku

Le [`Procfile`](Procfile) est fourni :

```bash
heroku create ipssi-express-food
heroku config:set NODE_ENV=production DATABASE_URL="..." JWT_SECRET="..."
git push heroku main
heroku run npm run db:push
```

---

## Pages de l'application (URL lisibles)

| URL | Page | Accès |
|---|---|---|
| `/menu` | Menu du jour (2 plats, 2 desserts) et panier | Public |
| `/panier` | Adresse, paiement, validation de la commande | Client |
| `/commandes` | Historique des commandes | Client |
| `/commandes/1042/suivi` | Suivi : livreur assigné, temps estimé, carte | Client |
| `/compte` | Mes informations, export et suppression des données | Client |
| `/inscription`, `/connexion` | Création de compte (avec consentement RGPD) et connexion | Public |
| `/confidentialite` | Politique de confidentialité | Public |
| `/livreur/missions` | Statut, partage de position, mission en cours | Livreur |
| `/admin/tableau-de-bord` | Indicateurs, commandes en cours, livreurs | Admin |
| `/admin/plats` | Gestion du menu du jour | Admin |
| `/admin/commandes`, `/admin/livreurs`, `/admin/clients` | Suivi et gestion | Admin |

## API REST

| Méthode et route | Rôle | Description |
|---|---|---|
| `POST /api/auth/inscription` | Public | Créer un compte client (CGU obligatoires) |
| `POST /api/auth/connexion` · `POST /api/auth/deconnexion` · `GET /api/auth/moi` | — | Session (cookie httpOnly) |
| `GET /api/menu/du-jour` | Public | Plats et desserts du jour et règles de livraison |
| `POST /api/commandes` · `GET /api/commandes` | Client | Commander, lister ses commandes |
| `GET /api/commandes/:numero` | Client, livreur, admin | Suivi d'une commande |
| `POST /api/commandes/:numero/recuperation` · `/livraison` | Livreur | Commande récupérée au QG / livrée |
| `GET /api/livreurs/moi/missions` · `PATCH /moi/statut` · `PATCH /moi/position` | Livreur | Espace livreur |
| `PATCH /api/clients/moi` · `GET /moi/donnees` · `DELETE /moi` | Client | Droits RGPD : rectification, export, effacement |
| `GET /api/admin/tableau-de-bord` | Admin | Indicateurs du jour |
| `GET/POST/PUT/DELETE /api/admin/plats` | Admin | Menu du jour (2 plats et 2 desserts maximum par jour) |
| `GET /api/admin/commandes` · `GET/POST /api/admin/livreurs` · `GET /api/admin/clients` | Admin | Gestion |

## Règles métier

- **Livraison offerte dès 19,99 €** de sous-total, 2,50 € sinon (valeurs configurables). Les prix sont toujours recalculés par le serveur à partir de la base, jamais repris du navigateur.
- **Attribution automatique** : à chaque commande, le livreur `LIBRE` le plus proche du QG est réservé de façon atomique. Sans livreur libre, la commande reste `EN_ATTENTE` et part dès qu'un livreur se libère ou livre.
- **Temps estimé** : trajet du livreur jusqu'au QG (distance à vol d'oiseau, 15 km/h) + trajet moyen QG → client (`DELIVERY_RIDE_MINUTES`, 10 min par défaut). La page de suivi se rafraîchit toutes les 10 secondes.
- **Statuts d'une commande** : `EN_ATTENTE` → `ASSIGNEE` → `EN_LIVRAISON` → `LIVREE`.

## Sécurité et RGPD

- Mots de passe hachés avec **bcrypt** ; session **JWT dans un cookie httpOnly, SameSite=Strict, Secure** en production.
- **Helmet** (en-têtes de sécurité, CSP), limitation du nombre de tentatives de connexion, validation de toutes les entrées avec **Zod**, corps de requête limité à 50 ko.
- Contrôle d'accès par rôle ; une commande d'un autre client renvoie 404 (on ne révèle pas son existence).
- RGPD : consentement explicite aux CGU, emails marketing facultatifs et désactivés par défaut, export et suppression du compte en libre-service, anonymisation des commandes, minimisation des données exposées, polices hébergées localement (aucun appel à Google Fonts), page de confidentialité. Détails dans [docs/BASE_DE_DONNEES.md](docs/BASE_DE_DONNEES.md).

## Organisation du code

```
├── client/                 Front React + TypeScript (Vite)
│   └── src/
│       ├── pages/          Une page par URL (client, livreur/, admin/)
│       ├── components/     En-tête, garde de rôle, badges, icônes
│       ├── context/        Session (AuthContext) et panier (CartContext)
│       ├── hooks/          Menu, rafraîchissement périodique, titre de page
│       └── lib/            Appels API, types, formatage, calcul du panier
├── server/                 API Express + TypeScript
│   ├── prisma/             Schéma Prisma (MongoDB)
│   ├── src/
│   │   ├── modules/        auth, menu, orders, couriers, clients, admin
│   │   ├── middleware/     Authentification et rôles, gestion d'erreurs
│   │   └── lib/            Tarifs, dates (Europe/Paris), géolocalisation, validation
│   ├── scripts/seed.ts     Données de démonstration
│   └── tests/              Tests unitaires et d'API
├── docs/                   Répartition des tâches, base de données
├── docker-compose.yml      MongoDB local (replica set)
├── render.yaml, Procfile   Déploiement
└── .github/workflows/      Intégration continue (tests et build à chaque push)
```

## Bonnes pratiques suivies

- TypeScript strict de bout en bout, code organisé par module métier.
- Validation des entrées côté serveur, erreurs centralisées et messages en français.
- Configuration par variables d'environnement validées au démarrage ; aucun secret dans le dépôt.
- Tests automatisés et CI GitHub Actions ; une Pull Request relue par carte Trello.
- Accessibilité : vrais boutons et liens, libellés sur tous les champs, cibles tactiles d'au moins 44 px, contrastes vérifiés, interface responsive (mobile, tablette, ordinateur).

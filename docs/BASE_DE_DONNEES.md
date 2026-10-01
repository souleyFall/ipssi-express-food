# Base de données — MongoDB Atlas + Prisma

Responsable : **Rayan** (lead données).

## 1. Collections

Le schéma est défini dans [`server/prisma/schema.prisma`](../server/prisma/schema.prisma) et appliqué avec `npm run db:push` (création des collections et des index).

| Collection | Contenu | Index |
|---|---|---|
| `clients` | Comptes clients : identité, email, mot de passe haché (bcrypt), téléphone, adresse, date d'acceptation des CGU, consentement emails | `email` unique |
| `plats` | Plats et desserts du jour (`menuDate` au format AAAA-MM-JJ, `type` PLAT/DESSERT, prix en centimes, allergènes) | `(menuDate, type)` |
| `livreurs` | Comptes livreurs : identité, **statut** (`LIBRE`, `EN_LIVRAISON`, `INDISPONIBLE`) et **dernière position** connue | `email` unique, `status` |
| `commandes` | Commandes : numéro lisible, copie figée des articles, montants, adresse, statut, livreur, heure estimée de livraison | `number` unique, `(status, createdAt)`, `clientId`, `courierId` |
| `admins` | Comptes du back-office | `email` unique |
| `compteurs` | Compteur atomique des numéros de commande | — |

Choix de modélisation :
- **Articles embarqués dans la commande** (type composite `OrderItem`) : le menu change chaque jour, la commande garde donc une copie du nom et du prix au moment de l'achat.
- **Montants en centimes (entiers)** : pas d'erreur d'arrondi sur les prix.
- **Attribution sans conflit** : un livreur passe de `LIBRE` à `EN_LIVRAISON` par une mise à jour conditionnelle (`updateMany` filtré sur le statut). Deux commandes simultanées ne peuvent donc pas réserver le même livreur, ce que vérifie un test automatisé.

## 2. Sécurisation du cluster Atlas

### 2.1 Utilisateurs et privilèges (principe du moindre privilège)

| Utilisateur Atlas | Personne / usage | Rôle | Droits |
|---|---|---|---|
| `rayan-owner` | Rayan, responsable de la base | `atlasAdmin` | **Owner** : administration complète (utilisateurs, index, sauvegardes) |
| `souley-dev` | Souley, backend | `readWrite@express-food` | Lecture/écriture sur la base du projet uniquement |
| `redouane-readonly` | Redouane, frontend | `read@express-food` | **Lecture seule** : consulter les données pour développer les écrans |
| `app-express-food` | L'application déployée | `readWrite@express-food` | Le strict nécessaire pour l'API ; c'est cet utilisateur qui figure dans `DATABASE_URL` |

Création dans l'interface Atlas : *Database Access → Add New Database User → Built-in Role* (ou *Specific Privileges* pour `readWrite` / `read` sur la base `express-food`).

Ou avec l'[Atlas CLI](https://www.mongodb.com/docs/atlas/cli/) (sans `--password`, le mot de passe est demandé au clavier et n'apparaît pas dans l'historique du terminal) :

```bash
atlas dbusers create --username rayan-owner --role atlasAdmin@admin
atlas dbusers create --username souley-dev --role readWrite@express-food
atlas dbusers create --username redouane-readonly --role read@express-food
atlas dbusers create --username app-express-food --role readWrite@express-food
```

Vérification du compte en lecture seule : avec `redouane-readonly`, `db.clients.find()` fonctionne mais `db.clients.insertOne({})` est refusé (`not authorized`).

### 2.2 Accès réseau

- *Network Access* : n'autoriser que les IP des membres de l'équipe et les **IP sortantes de l'hébergeur** (Render les liste dans *Settings → Outbound IPs*). Ne jamais laisser `0.0.0.0/0` en production.
- Connexions chiffrées en TLS (activé par défaut sur Atlas, URL `mongodb+srv://`).

### 2.3 Secrets

- Les chaînes de connexion sont dans `server/.env` (ignoré par git) en local, et dans les variables d'environnement de l'hébergeur en production.
- Chaque membre a son propre utilisateur : un départ se gère en supprimant un seul compte, sans changer le mot de passe des autres.

## 3. RGPD côté données

- **Minimisation** : on ne stocke que ce qui sert à livrer. Pour les livreurs, seule la dernière position est gardée, sans historique de trajets.
- **Mots de passe** hachés avec bcrypt (12 tours), jamais renvoyés par l'API.
- **Consentement** : `cguAcceptedAt` sert de preuve d'acceptation ; `marketingOptIn` est faux par défaut.
- **Droit d'accès / portabilité** : `GET /api/clients/moi/donnees` renvoie un export JSON complet.
- **Droit à l'effacement** : `DELETE /api/clients/moi` supprime le client et anonymise ses commandes (adresse et téléphone remplacés par `[supprimé]`).
- **Exposition limitée** : le client ne voit que le prénom du livreur, et sa position uniquement pendant la livraison ; l'admin voit les clients sous la forme « Prénom N. » dans les commandes.

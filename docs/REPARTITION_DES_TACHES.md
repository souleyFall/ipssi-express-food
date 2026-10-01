# Répartition des tâches — IPSSI Express Food

Équipe de 3 développeurs, méthode **Agile (Scrum allégé)** : 3 sprints d'une semaine, un daily de 10 min, une revue + rétro en fin de sprint. Le tableau Trello reprend exactement les cartes ci-dessous dans les colonnes **À faire / En cours / Fait**.

| Membre | Rôle | Points forts |
|---|---|---|
| **Souley** | Chef de projet (Scrum Master / Product Owner) + lead **backend** | API Express, sécurité, architecture |
| **Rayan** | Lead **données** | MongoDB Atlas, Prisma, modélisation, sécurité de la base |
| **Redouane** | Lead **frontend** | React, responsive, parcours utilisateur |

Règles d'équipe :
- une branche par carte Trello (`feature/<sujet>`), merge sur `main` uniquement par Pull Request relue par un autre membre ;
- la CI GitHub (tests + build) doit être verte avant merge ;
- commits au format `type(portée): message` (`feat`, `fix`, `docs`, `test`, `chore`).

---

## Sprint 1 — Fondations

| Carte | Responsable | Détail |
|---|---|---|
| Cadrage du cahier des charges, backlog Trello, user stories | Souley | Découper le PDF en user stories, prioriser |
| Maquettes des écrans (desktop + mobile) | Redouane | Menu, panier, suivi, inscription, livreur, admin |
| Création du cluster **MongoDB Atlas** | Rayan | Cluster, base `express-food`, liste d'IP autorisées |
| **Sécurisation Atlas** : utilisateurs et privilèges | Rayan | Owner, lecture/écriture, lecture seule (voir `docs/BASE_DE_DONNEES.md`) |
| Schéma Prisma (clients, plats, livreurs, commandes) | Rayan | `server/prisma/schema.prisma`, index, contraintes |
| Squelette API Express + TypeScript | Souley | Config, gestion d'erreurs, Helmet, structure en modules |
| Squelette React + Vite + routing | Redouane | URL lisibles, layout, thème |
| CI GitHub Actions | Souley | Tests + build à chaque push/PR |

## Sprint 2 — Fonctionnalités cœur

| Carte | Responsable | Détail |
|---|---|---|
| Authentification (inscription, connexion, rôles) | Souley | JWT en cookie httpOnly, bcrypt, limitation de débit |
| API menu du jour (2 plats + 2 desserts / jour) | Souley | Règle « max 2 par type et par jour » |
| API commandes + calcul des frais de livraison | Souley | Livraison offerte dès 19,99 €, prix recalculés côté serveur |
| **Attribution automatique d'un livreur** | Souley + Rayan | Mise à jour atomique du statut livreur, file d'attente |
| Script de seed (données de démo) | Rayan | Admin, livreurs, menu du jour |
| Requêtes et index pour le tableau de bord | Rayan | Commandes du jour, délai moyen, livreurs libres |
| Pages Menu, Panier, Inscription, Connexion | Redouane | Responsive mobile/tablette/desktop |
| Page de suivi de commande (livreur + temps estimé) | Redouane | Rafraîchissement automatique |

## Sprint 3 — Livreurs, admin, RGPD, livraison

| Carte | Responsable | Détail |
|---|---|---|
| Espace livreur (statut, position, mission) | Redouane + Souley | Géolocalisation du navigateur |
| Back-office admin (menu, commandes, livreurs, clients) | Redouane | |
| **RGPD** : consentement, export, rectification, suppression | Souley + Rayan | Anonymisation des commandes, minimisation des données |
| Page « Politique de confidentialité » | Redouane | |
| Tests automatisés API | Souley | Vitest + Supertest sur MongoDB en mémoire |
| Déploiement (Render / Heroku) + Atlas en production | Rayan | Variables d'environnement, utilisateur applicatif |
| README + support de présentation | Souley | Résultats pour le manager, démo |
| Répétition de la soutenance (5 + 15 + 10 min) | Toute l'équipe | |

## Préparation de la soutenance

| Partie | Durée | Qui |
|---|---|---|
| Rappel de la problématique, de la base, de la WebApp | 5 min | Souley |
| Approche technique : base de données et sécurité Atlas | 5 min | Rayan |
| Approche technique : API et règles métier | 5 min | Souley |
| Démo du parcours client → livreur → admin | 5 min | Redouane |
| Questions-réponses | 10 min | Toute l'équipe |

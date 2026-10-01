# Vocab! Tracker

Un carnet de vocabulaire anglais pour lire des manhwa : on tape un mot qui bloque, l'appli donne sa définition (et sa traduction), signale s'il est déjà dans le carnet et compte combien de fois on l'a rencontré.

## Fonctionnalités

- Ajouter un mot ou une expression (`give up`, `no way`) avec définition, nature, exemple et traduction
- Détection des doublons (`"Give  Up "` = `"give up"`) et compteur « vu ×N »
- Contexte manhwa optionnel : titre, chapitre
- Liste avec recherche instantanée (anglais ou français) et tris
- Fiche d'un mot : modifier, supprimer avec confirmation
- Comptes privés (e-mail + mot de passe) : chacun ne voit que ses propres mots, sur tous ses appareils
- Utilisable sur téléphone et sur ordinateur

## Technologies

| Partie | Outils |
| --- | --- |
| Front (`src/`) | React 19, Vite |
| Back (`server/`) | Node.js, Express 5, Prisma 7 |
| Base de données | PostgreSQL |
| Services externes | Wiktionary et Free Dictionary API (définitions), DeepL (traduction, optionnel) |

Le front appelle uniquement notre serveur : c'est lui qui parle aux API externes, pour protéger les clés secrètes.

## Installation

Prérequis : [Node.js](https://nodejs.org) et [PostgreSQL](https://www.postgresql.org/download/).

```bash
# 1. Installer les dépendances du front et du serveur
npm run install:all

# 2. Créer la base de données
psql -U postgres -c "CREATE DATABASE vocabtracker;"

# 3. Configurer le serveur : copier le modèle, puis remplir DATABASE_URL (mot de passe PostgreSQL)
cd server
copy .env.example .env      # macOS / Linux : cp .env.example .env
# (remplir DATABASE_URL et JWT_SECRET dans .env avant la ligne suivante)
npm run db:setup            # crée les tables ET génère le client Prisma
cd ..
```

Le fichier `server/.env` contient des secrets : il n'est jamais envoyé sur GitHub. Deux valeurs sont à remplir :

- `DATABASE_URL` : l'adresse de la base, avec votre mot de passe PostgreSQL ;
- `JWT_SECRET` : le secret qui signe les sessions (**obligatoire**, 32 caractères minimum). Pour en générer un :
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

Au premier lancement, créez votre compte depuis l'écran de connexion (« En créer un »).

**Traduction automatique (optionnelle) :** ajoutez une clé d'API DeepL dans `server/.env` (`DEEPL_API_KEY=`). Sans clé, l'appli fonctionne quand même : la traduction est alors à saisir à la main.

## Lancer l'appli

```bash
npm run dev:all
```

Cette commande démarre le front (http://localhost:5173) et le serveur (http://localhost:3001) ensemble.

> Sous Windows PowerShell, si `npm` est bloqué par la politique d'exécution, utilisez `npm.cmd` à la place.

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev:all` | Lance le front et le serveur |
| `npm run build:render` | Construit le site et prépare la base (utilisé par Render) |
| `npm start` | Lance le serveur en production (sert aussi le site construit) |
| `npm run dev` | Lance seulement le front |
| `npm run build` | Génère la version de production du front |
| `npm run lint` | Vérifie le code avec Oxlint |
| `npm test --prefix server` | Lance les tests du serveur (la base doit tourner) |

## Mise en ligne (Render + Neon)

Le site et l'API tournent dans **un seul service** [Render](https://render.com) ; la base PostgreSQL est chez [Neon](https://neon.com). Les deux ont une offre gratuite permanente. Le fichier `render.yaml` décrit tout le réglage du service.

**1. La base de données (Neon)**
1. Créez un compte sur Neon, puis un projet. Choisissez la région **AWS Europe (Frankfurt)**.
2. Copiez l'**adresse de connexion** (`postgresql://…`). Dans la fenêtre « Connect », **désactivez « Connection pooling »** pour obtenir l'adresse *directe* (celle sans `-pooler` dans le nom du serveur).

**2. Le service (Render)**
1. Créez un compte sur Render et connectez-le à GitHub.
2. **New → Blueprint**, choisissez ce dépôt : Render lit `render.yaml`.
3. Render demande deux valeurs : `DATABASE_URL` (l'adresse copiée à l'étape 1) et `DEEPL_API_KEY` (votre clé DeepL, ou laissez vide).
4. Lancez la création. La première construction prend quelques minutes. L'adresse du site s'affiche ensuite (`https://vocab-tracker-….onrender.com`).

**3. Votre compte, puis fermer les inscriptions**
1. Ouvrez le site, cliquez sur « En créer un » et créez **votre** compte.
2. Dans Render : le service → **Environment** → passez `ALLOW_REGISTRATION` à `false` → enregistrez. Plus personne d'autre ne peut créer de compte.

**Mises à jour :** chaque `git push` sur `main` redéploie le site automatiquement.

**À savoir sur l'offre gratuite :** le service **s'endort après 15 minutes** sans visite et met environ **1 minute** à se réveiller (la première page est lente, ensuite tout est rapide). La base Neon se met aussi en veille après 5 minutes, avec un réveil bref. Les conditions des offres gratuites changent : vérifiez-les sur les sites au moment de vous inscrire.

## Structure

```
src/        Le front React (composants, appels à l'API)
server/     Le serveur : routes Express, schéma Prisma, services (dictionnaire, traduction), tests
COMPTE-RENDU.md   Explications détaillées, étape par étape
```

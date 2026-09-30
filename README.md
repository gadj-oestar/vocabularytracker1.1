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
npx prisma migrate deploy   # crée les tables
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
| `npm run dev` | Lance seulement le front |
| `npm run build` | Génère la version de production du front |
| `npm run lint` | Vérifie le code avec Oxlint |
| `npm test --prefix server` | Lance les tests du serveur (la base doit tourner) |

## Structure

```
src/        Le front React (composants, appels à l'API)
server/     Le serveur : routes Express, schéma Prisma, services (dictionnaire, traduction), tests
COMPTE-RENDU.md   Explications détaillées, étape par étape
```

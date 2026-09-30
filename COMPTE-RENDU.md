# Compte rendu — Étape 1 : écran « Ajouter un mot »

Objectif de l'étape : reproduire la maquette de l'écran d'ajout, avec des **données en dur** (pas encore de back-end ni d'API).

## Les notions React utilisées (en 4 phrases)

- **Composant** : un morceau d'écran réutilisable, écrit comme une fonction (ex. `Header`). Son nom commence par une majuscule.
- **`props`** : les informations qu'un composant reçoit de son parent, comme les paramètres d'une fonction (ex. `word`, `onSearch`).
- **`useState`** : la « mémoire » d'un composant. Quand on change cette valeur, React redessine l'écran tout seul.
- **`{ ... }` dans le HTML (JSX)** : on y met du JavaScript, par exemple afficher une variable ou une condition.

## À quoi sert chaque fichier

| Fichier | Rôle en une phrase |
| --- | --- |
| `src/App.jsx` | Le **chef d'orchestre** : garde le carnet en mémoire et décide quelle fiche afficher. |
| `src/components/Header.jsx` | Le bandeau jaune avec le logo. |
| `src/components/BottomNav.jsx` | La barre « Ajouter / Mes mots » (Mes mots est grisé pour l'instant). |
| `src/components/SearchForm.jsx` | Le champ « Un mot t'a bloqué ? » et le bouton GO. |
| `src/components/NewWordCard.jsx` | La fiche d'un **nouveau** mot : on peut tout modifier avant d'enregistrer. |
| `src/components/KnownWordCard.jsx` | La fiche d'un mot **déjà enregistré**, avec le bandeau bleu « Déjà dans ton carnet ». |
| `src/components/RecentWords.jsx` | La colonne « Derniers mots » (les 3 plus récents), visible **seulement sur ordinateur**. |
| `src/utils/normalize.js` | Met un mot sous une forme « propre » pour pouvoir le comparer. |
| `src/utils/formatDate.js` | Transforme `2026-09-12` en `12/09/2026`. |
| `src/data/fakeDictionary.js` | Un faux dictionnaire de 5 mots, à la place de DeepL pour l'instant. |
| `src/index.css`, `src/App.css` | Les couleurs, polices et le style « BD » de la maquette. |

## Les fonctions créées

**`normalizeTerm(term)`** — *Rend un mot comparable.* Elle met en minuscules et retire les espaces en trop, donc `"  Give  Up "` et `"give up"` sont le même mot. C'est la base de la détection de doublon.

**`formatDate(isoDate)`** — *Affiche une date à la française* (`12/09/2026`).

**`handleSearch(rawTerm)`** (dans `App.jsx`) — *Le cœur de l'étape.* Quand on valide un mot :
1. elle cherche d'abord dans le carnet ;
2. si le mot existe, elle augmente son compteur « vu X fois » et affiche la fiche connue ;
3. sinon, elle cherche dans le faux dictionnaire et prépare une fiche à compléter (champs vides si le mot est introuvable).

**`handleSave()`** (dans `App.jsx`) — *Enregistre le mot.* Elle ajoute le mot en haut du carnet avec la date du jour et un compteur à 1, puis vide l'écran pour le mot suivant.

**`handleSubmit(event)`** (dans `SearchForm.jsx`) — *Réagit au clic sur GO ou à la touche Entrée.* Elle empêche la page de se recharger, ignore un champ vide, prévient `App`, puis vide le champ.

**`edit(field)`** (dans `NewWordCard.jsx`) — *Une petite « usine ».* Elle fabrique la fonction qui met à jour UN champ du brouillon (traduction, exemple, titre, chapitre) quand on tape dedans, sans écrire la même chose quatre fois.

## Le responsive (téléphone / ordinateur)

Le principe : on écrit **d'abord** le style du téléphone, puis un bloc `@media (min-width: 900px)` qui dit « si l'écran est assez large, change ces règles ». Un seul code HTML, deux présentations.

| | Téléphone (< 900 px) | Ordinateur (≥ 900 px) |
| --- | --- | --- |
| Navigation | Barre en bas | Menu jaune à gauche (240 px) avec le logo |
| Fiche d'un nouveau mot | Tout empilé | Le mot à gauche, « Contexte manhwa » + bouton à droite |
| « Derniers mots » | Caché | Colonne de 280 px à droite |

**Correction du bloc « Contexte manhwa » :** il n'était pas centré parce que la balise `<fieldset>` se comporte mal avec `display: flex`. Le `fieldset` ne garde maintenant que la bordure en pointillés, et les champs sont rangés dans un simple `<div>` (`.context-row`).

## Comment ça circule (le principe le plus important en React)

```
SearchForm  --(onSearch)-->  App  --(word / draft)-->  KnownWordCard / NewWordCard
   tape un mot            décide et garde          affichent, et remontent les
                          les données en mémoire   modifications via onChange / onSave
```

Les données **descendent** par les `props`, les actions **remontent** par des fonctions (`onSearch`, `onChange`, `onSave`). C'est `App` qui garde la vérité.

## Comment tester

```bash
npm install
npm run dev
```

1. Tape **reckless** → bandeau « Déjà dans ton carnet », le compteur monte à chaque fois.
2. Tape **grudge** → fiche à compléter, puis **ENREGISTRER**.
3. Tape **grudge** à nouveau → il est maintenant reconnu.

---

# Étape 2 : l'écran « Mes mots »

## Ce qui a été ajouté

| Fichier | Rôle en une phrase |
| --- | --- |
| `src/components/WordsPage.jsx` | L'écran « Mes mots » : titre, recherche, boutons de tri et liste de cartes. |
| `src/utils/filterWords.js` | Filtre et trie la liste selon ce qui est tapé et le bouton choisi. |
| `src/data/initialWords.js` | Le carnet de départ (les 5 mots de la maquette), sorti de `App.jsx` pour l'alléger. |

`BottomNav.jsx` a aussi changé : ses deux boutons sont maintenant actifs et changent d'écran.

## Les nouvelles fonctions

**`setScreen` / `screen`** (dans `App.jsx`) — *Retient l'écran affiché* (`'add'` ou `'list'`). Quand on clique dans la barre de navigation, `screen` change et React affiche l'autre page. Il n'y a qu'une seule page web : on change juste ce qu'elle montre.

**`filterAndSort(words, query, sort)`** — *Prépare la liste à afficher.* Elle garde les mots qui contiennent le texte cherché (en anglais **ou** en français, sans tenir compte des accents ni des majuscules), puis les trie. Elle ne modifie jamais le carnet : elle renvoie une **copie** triée.

**`removeAccents(text)`** — *Enlève les accents* pour que `impru` trouve `imprudent` et `tetu` trouve `têtu`.

**`sorters`** — *Les trois façons de trier* : Récents (date la plus récente d'abord), Les plus vus (compteur le plus grand d'abord) et A-Z (ordre alphabétique).

## Pourquoi la recherche est « instantanée »

`query` (le texte tapé) et `sort` (le tri choisi) sont des `useState`. À chaque lettre ou clic, React rappelle `WordsPage`, qui recalcule `visibleWords` avec `filterAndSort`. Pas de bouton « Rechercher » : l'écran suit ce qu'on tape.

Ces deux valeurs restent dans `WordsPage` et pas dans `App` : elles ne concernent que cet écran. La règle : **on garde une donnée le plus près possible de l'endroit où on s'en sert**.

## Téléphone : cartes, ordinateur : tableau

`WordsPage` écrit **les deux** affichages (une liste de cartes et un tableau) avec les mêmes données `visibleWords`. C'est le CSS qui décide lequel est visible : les cartes en dessous de 900 px, le tableau (colonnes Mot, Traduction, Manhwa, Vu, Ajouté le) au-dessus. Sur ordinateur, le titre et la recherche passent aussi sur la même ligne.

Petit détail : quand le titre du manhwa n'est pas renseigné (champ optionnel), le tableau affiche « — ».

## Comment tester

1. Clique sur **Mes mots** : 5 cartes, compteur jaune pour les mots vus plus d'une fois.
2. Tape `ranc` → seul **grudge** reste. Tape `impru` → **reckless**.
3. Clique sur **A-Z**, puis **Les plus vus** : l'ordre change.
4. Tape `zzz` → « Aucun mot trouvé ».

---

# Étape 3 : la fiche d'un mot

## 3a. Ouvrir la fiche depuis la liste

| Fichier | Rôle en une phrase |
| --- | --- |
| `src/components/WordDetail.jsx` | L'écran « fiche d'un mot » : un bouton de retour et la fiche. |

`KnownWordCard.jsx` est **réutilisé** : on lui ajoute `showBanner` pour cacher le bandeau bleu quand on ouvre la fiche au lieu de retaper le mot. On écrit une fois, on réutilise deux fois.

**`handleOpen(word)`** (dans `App.jsx`) — *Ouvre la fiche d'un mot.* Elle retient lequel (`selectedKey`) et passe à l'écran `'detail'`.

**`selectedWord`** — *Retrouve le mot ouvert dans le carnet* à chaque affichage, au lieu d'en garder une copie. Ainsi la fiche est toujours à jour (important pour Modifier, à l'étape suivante).

**`onOpen` / `onBack`** — Les cartes de la liste sont maintenant des `<button>` : un clic appelle `onOpen(word)`, donc remonte jusqu'à `App`. Le bouton « Retour » appelle `onBack`. C'est le même principe qu'avant : les données descendent, les actions remontent.

**Le champ « Vu dans »** — Il n'apparaît que si un titre de manhwa a été saisi. `{word.sourceTitle && (...)}` veut dire : « si le titre existe, affiche ce bloc, sinon n'affiche rien ».

Pendant qu'on regarde une fiche, l'onglet « Mes mots » reste allumé : la fiche fait partie de cette section.

## 3b. Supprimer un mot (avec confirmation)

**`handleDelete(word)`** (dans `App.jsx`) — *Supprime vraiment le mot.* Elle fabrique un nouveau carnet avec `.filter`, qui garde tous les mots **sauf** celui-là (on ne modifie jamais l'ancien carnet). Puis elle revient à la liste.

**`confirming` / `setConfirming`** (dans `WordDetail.jsx`) — *Retient si on est en train de demander « Tu es sûr ? ».* Le premier clic sur Supprimer n'efface rien : il affiche juste la question. Seul « Oui, supprimer » appelle `onDelete`. Annuler remet le bouton de départ. C'est la règle F9 du cahier des charges.

**`children`** (dans `KnownWordCard.jsx`) — *Un emplacement libre.* Tout ce qu'on écrit entre `<KnownWordCard>` et `</KnownWordCard>` arrive à cet endroit, en bas de la fiche. Ça permet de garder la fiche simple et d'y glisser les boutons seulement quand on en a besoin.

**`key={selectedWord.termNormalized}`** — *Astuce importante.* Quand la `key` change, React jette l'ancien composant et en crée un neuf. Sans elle, la question « Supprimer ? » pouvait rester affichée en passant d'un mot à un autre.

## 3c. Modifier un mot

| Fichier | Rôle en une phrase |
| --- | --- |
| `src/components/EditWordForm.jsx` | Le formulaire qui remplace la fiche quand on clique sur Modifier. |

**`handleUpdate(updatedWord)`** (dans `App.jsx`) — *Remplace un mot par sa version modifiée.* Elle utilise `.map` : on parcourt le carnet, on remplace le mot qui a le même identifiant et on laisse les autres tels quels.

**`draft` dans `EditWordForm`** — *Une copie de travail.* On tape dans la copie ; le vrai mot ne change que si on clique sur Enregistrer. Annuler = on jette la copie, donc rien n'est modifié par erreur. Le mot lui-même (`reckless`) n'est pas modifiable : c'est son identifiant.

**`handleSaveEdit(updatedWord)`** (dans `WordDetail.jsx`) — *Enchaîne deux actions :* prévenir `App` (`onUpdate`), puis refermer le formulaire (`setEditing(false)`).

**`editing` / `confirming`** — Deux petites « mémoires » de `WordDetail` : est-on en train de modifier ? de confirmer une suppression ? Selon leur valeur, React affiche le formulaire, la question ou la fiche simple.

Comme `selectedWord` est retrouvé dans le carnet à chaque affichage (étape 3a), la fiche, la liste, le tableau et la recherche montrent tous la nouvelle version sans rien faire de plus.

## Comment tester l'étape 3

1. **Mes mots** → clique sur **reckless** : la fiche s'ouvre (sans bandeau bleu).
2. **Modifier** → change la traduction, ajoute un titre de manhwa et un chapitre → **Enregistrer**. Le bloc « Vu dans » apparaît.
3. Reviens à la liste et tape un morceau de la nouvelle traduction dans la recherche : le mot est trouvé.
4. **Supprimer** → la question s'affiche → **Annuler** garde le mot, **Oui, supprimer** l'enlève.

## Ce qui n'est pas encore fait
- Les mots ne sont pas sauvegardés : tout disparaît quand on recharge la page (la base de données arrive avec le back-end).
- Les vraies API de traduction et de définition.

---

# Étape 3 du plan : le back-end (Express + PostgreSQL)

Jusqu'ici les mots vivaient dans la mémoire du navigateur et disparaissaient au rechargement. Le back-end est un **programme qui tourne à part** (dans le dossier `server/`), qui garde les mots dans une **base de données** et que le front interroge par des **requêtes HTTP**.

```
Navigateur (React)  --requête HTTP-->  Serveur Express  --SQL-->  PostgreSQL
   le front               l'API          (server/)             la base (les mots)
```

## Mise à jour B1 : le squelette du serveur

| Fichier | Rôle en une phrase |
| --- | --- |
| `server/prisma/schema.prisma` | Le plan de la base : les tables `users` et `words`, avec la règle « pas de doublon ». |
| `server/prisma.config.ts` | Dit à Prisma où est le schéma et comment joindre la base. |
| `server/.env.example` | Modèle du fichier secret `.env` (adresse et mot de passe de la base). |
| `server/src/index.js` | Le point d'entrée : démarre le serveur. |
| `server/src/app.js` | Branche tout : CORS, lecture du JSON, routes, gestion des erreurs. |
| `server/src/db.js` | La connexion à la base (un seul client partagé). |
| `server/src/routes/words.js` | Les routes de l'API pour les mots (lire, chercher, créer, modifier, supprimer). |
| `server/src/utils/normalize.js` | Met un mot sous sa forme « propre » (comme dans le front). |
| `server/src/utils/wordInput.js` | Vérifie et nettoie ce que le front envoie. |
| `server/src/devUser.js` | **Temporaire** : simule un utilisateur connecté, jusqu'à l'étape 5 (connexion). |
| `server/test/utils.test.js` | Tests automatiques (`npm test`). |

## Les notions à retenir

- **Route** : une adresse + une action. `GET /api/words` = « donne-moi les mots », `DELETE /api/words/12` = « supprime le mot 12 ». Ensemble, ces routes forment l'API.
- **Prisma** : l'outil qui traduit du JavaScript en requêtes SQL. On écrit `prisma.word.findMany(...)` au lieu de SQL à la main.
- **Middleware** : une fonction qui s'exécute *avant* les routes (ex. `attachDevUser` ajoute l'utilisateur à la requête).
- **CORS** : par sécurité, un navigateur interdit à une page d'appeler un autre serveur. On autorise seulement notre front.
- **`.env`** : le fichier des secrets (mot de passe de la base). Il n'est **jamais** envoyé sur GitHub, seul `.env.example` l'est.

## Les règles du cahier des charges, appliquées côté serveur

1. **Normalisation** : le serveur calcule `termNormalized` lui-même, il ne fait jamais confiance au front.
2. **Unicité** : la base refuse deux fois le même mot pour un utilisateur (`@@unique`). Si ça arrive, l'API répond **409** « déjà enregistré ».
3. **Ordre des opérations** : `POST /api/words/lookup` regarde **d'abord** dans la base ; si le mot existe, le compteur « vu X fois » monte.
4. **On ne fait pas confiance aux données reçues** : `wordInput.js` refuse un mot vide, un texte trop long, un chapitre qui n'est pas un nombre.
5. **Chaque utilisateur ne voit que ses mots** : toutes les requêtes filtrent sur `userId`.

## Ce qui n'est pas encore fait (dans le back-end)

- Installer PostgreSQL, créer la base et les tables (`prisma migrate`).
- Tester les routes contre la vraie base.
- Brancher le front sur l'API.

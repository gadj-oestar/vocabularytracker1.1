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

## Mise à jour B2 : la vraie base et les tests de bout en bout

**Ce qui a été fait :** PostgreSQL installé, la base `vocabtracker` créée, puis les tables créées par une **migration** Prisma.

| Élément | Rôle en une phrase |
| --- | --- |
| `server/prisma/migrations/…_init/` | L'historique des changements de la base : le SQL qui crée les tables. On le garde dans git pour pouvoir refaire la même base ailleurs (au déploiement). |
| `server/test/api.test.js` | Un test qui démarre le vrai serveur et rejoue tout le parcours sur la vraie base. |

**Migration** — Quand on change `schema.prisma`, la commande `npx prisma migrate dev` compare le schéma à la base, écrit le SQL nécessaire dans un nouveau dossier et l'applique. C'est comme les « commits » de git, mais pour la structure de la base.

**Ce que le test vérifie (et qui passe) :**
1. Un mot inconnu → le serveur renvoie un brouillon, avec le mot normalisé (`"  ZZ-TEST  "` devient `"zz-test"`).
2. On l'enregistre → le chapitre `"42"` (texte) devient le nombre `42`.
3. On le renvoie avec une autre casse → **409**, la base refuse le doublon (règle n°2).
4. On le cherche à nouveau → « déjà connu » et le compteur passe à 2.
5. On le modifie → seuls les champs envoyés changent, le mot lui-même ne change jamais.
6. On le supprime → puis il est introuvable (404).
7. Des données invalides (mot vide, chapitre « abc », identifiant bizarre) → des erreurs claires, jamais de plantage.

Le test se nettoie lui-même : il supprime ses mots de test à la fin.

**Comment lancer le serveur et les tests :**

```bash
cd server
copy .env.example .env   # une seule fois, puis mets ton mot de passe PostgreSQL dans .env
npm install
npx prisma migrate deploy
npm run dev              # le serveur écoute sur http://localhost:3001
npm test                 # les tests (la base doit tourner)
```

---

# Étape 4 du plan : brancher les API externes

Le serveur va chercher lui-même la définition, la nature du mot et un exemple auprès de sites de dictionnaire. **Le navigateur n'appelle jamais ces API** : ça protège les clés secrètes (DeepL, prochaine mise à jour) et ça permet de gérer les pannes au même endroit.

## Mise à jour 4a : le dictionnaire

| Fichier | Rôle en une phrase |
| --- | --- |
| `server/src/services/dictionary.js` | Interroge deux dictionnaires en parallèle et fusionne leurs réponses. |
| `server/test/dictionary.test.js` | Teste ce service avec de **faux** dictionnaires : pas d'internet nécessaire. |

**Deux sources, pourquoi ?** Le cahier des charges prévoit la *Free Dictionary API*, qui donne la phonétique. Le jour du test, elle était en panne (erreur **522**, côté leur serveur). J'ai ajouté **Wiktionary** (gratuit, sans clé) : il connaît aussi les expressions comme « give up », très fréquentes dans les manhwa. Chaque champ est pris dans la première source qui l'a.

## Les fonctions créées

**`cleanHtml(html)`** — *Transforme du HTML en texte simple.* Wiktionary renvoie `<a href=…>Careless</a> or <b>rash</b>` ; on garde `Careless or rash`. Elle supprime aussi les blocs `<style>` **avec leur contenu** : un vrai bug trouvé en testant « no way », dont la définition contenait du code CSS.

**`parseFreeDictionary(json)` / `parseWiktionary(json)`** — *Lisent la réponse d'un site* et en sortent toujours la même forme : `{ partOfSpeech, phonetic, definition, example }`. La nature du mot est traduite en français (`adjective` → `adjectif`). Les deux sites répondent dans des formats différents, ces fonctions les rendent interchangeables.

**`mergeInfo(...infos)`** — *Fusionne les sources* champ par champ : la première qui a une valeur gagne.

**`createDictionaryClient(...)` et `lookup(term)`** — *Interrogent les deux sites en même temps* (`Promise.all`). Trois protections :
- **Délai maximum de 3 secondes** : un site lent ne bloque pas l'appli.
- **Échec d'une source** : on continue avec l'autre. Si les deux échouent, on renvoie des champs vides et la réponse contient `unavailable: ['dictionary']` : le mot peut quand même être enregistré (règle « échec d'API »).
- **Disjoncteur** : après un échec, la source est mise de côté 1 minute. Sans ça, avec un site en panne, *chaque* nouveau mot attendrait 3 secondes pour rien. (On l'a vu : le premier mot a pris 3,4 s, les suivants 40 ms.)

**`encodeURIComponent(term)`** — *Protège l'adresse* : le mot tapé par l'utilisateur est inséré dans une URL, donc `a/../b?x=1` ne peut pas en changer la destination.

## Pourquoi un « faux fetch » dans les tests ?

Un test qui dépend d'internet échoue quand le site est en panne, alors que notre code est bon. Dans les tests, on remplace `fetch` (la fonction qui appelle internet) par un faux qui répond ce qu'on veut, y compris des pannes. Les tests sont alors rapides, fiables, et peuvent simuler des cas qu'on ne peut pas provoquer en vrai (erreur 522, réseau coupé).

## Résultat réel (mots de la maquette)

| Mot | Nature | Définition (début) |
| --- | --- | --- |
| reckless | adjectif | Careless or heedless; headstrong or rash. |
| give up | verbe | To surrender ; to inform on (someone). |
| grudge | nom | Deep-seated and/or long-term animosity… |
| no way | adverbe | In no way; not at all; under no circumstances. |


## Mise à jour 4b : la traduction (DeepL) et la limite de requêtes

| Fichier | Rôle en une phrase |
| --- | --- |
| `server/src/services/translate.js` | Traduit un mot de l'anglais vers le français avec DeepL. |
| `server/test/translate.test.js` | Teste ce service avec un **faux** DeepL (aucun quota consommé). |

**`createTranslator(...)` et `translate(term)`** — *Envoient le mot à DeepL et rendent la traduction.* Elles utilisent la clé secrète du fichier `.env` (`DEEPL_API_KEY`). Comme pour le dictionnaire : délai maximum de 5 secondes, disjoncteur d'une minute après un échec, et **jamais d'exception** : en cas de problème, on renvoie une traduction vide.

**La clé reste sur le serveur.** Le front appelle *notre* serveur, qui appelle DeepL. La clé ne passe jamais par le navigateur, n'est jamais dans le code ni sur GitHub, et **n'apparaît jamais dans les journaux** (un test le vérifie).

**Sans clé, l'appli fonctionne quand même.** La traduction est vide et la réponse dit `unavailable: ["translation"]` : on la saisit à la main (règle « échec d'API »).

**`Promise.all`** — Le dictionnaire et DeepL sont interrogés **en même temps** : on attend le plus lent des deux, pas la somme.

**`lookupLimiter`** (dans `routes/words.js`) — *Limite les recherches à 30 par minute.* Règle de sécurité du cahier des charges : chaque nouveau mot consomme le quota DeepL, et un script fou ou une boucle par erreur pourrait le vider en quelques secondes. Au-delà de 30, le serveur répond **429** « Trop de recherches ». L'en-tête `RateLimit` indique combien il en reste.

## Comment obtenir et brancher la clé DeepL

1. Créez un compte sur DeepL et choisissez l'offre API (voir les conditions et les prix au moment de l'inscription : elles changent).
2. Copiez la clé depuis votre compte (elle se termine par `:fx` pour l'offre gratuite).
3. Ouvrez `server/.env` et mettez-la après `DEEPL_API_KEY=`. Ce fichier n'est jamais envoyé sur GitHub.
4. Redémarrez le serveur (`npm run start` dans `server`).


---

# Brancher le front sur l'API

Avant : les mots vivaient dans la mémoire du navigateur (données « en dur ») et disparaissaient au rechargement. Maintenant : le front **demande tout au serveur**, qui garde les mots dans PostgreSQL. Fermez l'onglet, redémarrez l'ordinateur : les mots sont toujours là.

```
Composants React  -->  api.js  -->  (proxy Vite)  -->  Serveur Express  -->  PostgreSQL
  (l'écran)        (les appels)    /api -> :3001         (server/)            (les mots)
```

## Ce qui a changé

| Fichier | Rôle en une phrase |
| --- | --- |
| `src/api.js` | **Le seul endroit** où le front parle au serveur : lire, chercher, créer, modifier, supprimer. |
| `vite.config.js` | Le **proxy** : Vite relaie les adresses `/api/...` vers le serveur (port 3001). |
| `src/App.jsx` | Charge les mots au démarrage, envoie chaque action au serveur, affiche les erreurs. |
| `package.json` | Deux commandes en plus : `dev:all` (tout lancer) et `install:all` (tout installer). |
| `README.md` | Un vrai mode d'emploi du projet (à la place du texte par défaut de Vite). |

Supprimés : `src/data/initialWords.js` et `src/data/fakeDictionary.js` (les données en dur, devenues inutiles).

## Les fonctions et notions nouvelles

**`request(method, path, body)`** (dans `api.js`) — *Envoie une requête au serveur et décode la réponse.* Toutes les autres fonctions l'utilisent. Elle transforme les problèmes en `ApiError` avec un message lisible, que l'écran affiche tel quel.

**`fromApi(word)`** — *Traduit un mot du format serveur vers le format du front.* Le serveur dit `null` pour « pas renseigné » et un **nombre** pour le chapitre ; les champs de formulaire veulent du **texte**. On convertit une seule fois, à l'entrée, et le reste de l'appli ne voit que des textes.

**`listWords`, `lookupWord`, `createWord`, `updateWord`, `deleteWord`** — *Les 5 actions possibles.* Chacune correspond à une route du serveur. Les composants n'appellent jamais `fetch` eux-mêmes.

**`async` / `await`** — Une action qui attend le serveur est *asynchrone* : `await` veut dire « attends la réponse avant de continuer ». Pendant l'attente, l'écran reste utilisable.

**`useEffect`** (dans `App.jsx`) — *« Fais ceci APRÈS l'affichage ».* Avec `[]`, il ne s'exécute qu'une fois, au démarrage : c'est là qu'on demande les mots au serveur. Sa fonction de nettoyage (`cancelled = true`) évite de traiter une réponse arrivée trop tard.

**`loading`, `error`, `searching`** — Trois petites « mémoires » pour ce qu'on affiche *pendant* qu'on attend : « Chargement de ton carnet… », un bandeau rouge si ça échoue, un bouton GO grisé pendant une recherche (pour ne pas envoyer deux fois la même).

**`putWord(word)`** — *Met à jour le carnet local* : remplace le mot s'il y est, l'ajoute en tête sinon.

**Le proxy** — Le front (port 5173) et le serveur (port 3001) sont deux programmes séparés, donc deux « sites » pour le navigateur, qui bloque par sécurité les appels de l'un à l'autre (CORS). Avec le proxy, le navigateur croit parler à un seul site : les appels `/api/...` sont relayés par Vite.

## Ce que l'utilisateur voit quand quelque chose ne va pas

| Situation | Ce qui s'affiche |
| --- | --- |
| Serveur éteint au démarrage | « Impossible de joindre le serveur. Est-il démarré ? » + bouton **Réessayer** |
| Serveur éteint pendant l'usage | Le même message, avec **Fermer** |
| Mot déjà enregistré (doublon refusé par la base) | « Ce mot est déjà enregistré. » |
| Trop de recherches (plus de 30 par minute) | « Trop de recherches. Réessaie dans une minute. » |
| Traduction ou définition indisponible | Un petit encadré en pointillés : « … complète-la toi-même », le mot reste enregistrable |
| Modification refusée | Le formulaire **reste ouvert** : ce qu'on a tapé n'est pas perdu |

## Deux défauts trouvés et corrigés en testant pour de vrai

1. **Message d'erreur faux** : serveur éteint, l'écran disait « Erreur du serveur. » au lieu de « Impossible de joindre le serveur ». En développement, le proxy de Vite répond lui-même par une erreur 500 *sans contenu*. Or notre serveur répond *toujours* en JSON : une erreur sans JSON vient forcément d'un intermédiaire.
2. **Nature du mot invisible** : la ligne « phonétique · nature » ne s'affichait que s'il y avait une phonétique, or Wiktionary n'en donne pas. Elle s'affiche maintenant dès qu'au moins un des deux existe.

## Comment lancer et tester

```bash
npm run install:all    # une seule fois
npm run dev:all        # front sur http://localhost:5173, serveur sur http://localhost:3001
```

1. Tape `reckless` : une définition apparaît (l'avertissement « traduction indisponible » tant qu'il n'y a pas de clé DeepL).
2. Complète la traduction, **ENREGISTRER**, puis **recharge la page** : le mot est toujours là.
3. Retape ` RECKLESS ` : « Déjà dans ton carnet », le compteur monte à ×2.
4. Coupe le serveur (`Ctrl+C`) et tape un mot : le message d'erreur s'affiche.

## Ce qui n'est pas encore fait

- **Tester avec la vraie clé DeepL** : le code est testé avec un faux DeepL, pas encore contre le vrai service.
- Le **déploiement en ligne**.

---

# Étape 5 du plan : l'authentification

Avant : le serveur faisait comme si une seule personne « de développement » était toujours connectée. Maintenant : chacun crée un **compte** (e-mail + mot de passe), se **connecte**, et ne voit que **ses** mots. C'est la règle F1 du cahier des charges.

```
Inscription / connexion --> le serveur vérifie le mot de passe --> dépose un COOKIE de session
Chaque requête suivante --> le navigateur renvoie le cookie --> le serveur sait qui parle --> ne montre que SES mots
```

## Ce qui a été ajouté

| Fichier | Rôle en une phrase |
| --- | --- |
| `server/src/auth/password.js` | Transforme un mot de passe en « empreinte » (bcrypt) et vérifie un mot de passe saisi. |
| `server/src/auth/token.js` | Fabrique et lit le jeton de session (JWT), et règle les options du cookie. |
| `server/src/routes/auth.js` | Les routes : inscription, connexion, déconnexion, « qui suis-je ? ». |
| `server/src/middleware/requireAuth.js` | Le « videur » : refuse (401) toute requête sans session valide. |
| `server/src/utils/authInput.js` | Vérifie l'e-mail et le mot de passe reçus. |
| `src/components/AuthPage.jsx` | L'écran de connexion / création de compte. |
| `server/test/auth.test.js` | Tests automatiques de sécurité (mot de passe, jeton, cookie, force brute…). |

Supprimé : `server/src/devUser.js` (l'utilisateur factice provisoire).

## Les notions à retenir (sans jargon)

**Hachage (bcrypt)** — *On ne stocke jamais un mot de passe, seulement son empreinte.* C'est à sens unique : on peut vérifier qu'un mot de passe correspond, pas retrouver le mot de passe. Même si la base était volée, les mots de passe restent illisibles. bcrypt est volontairement **lent** (environ 0,25 s) : imperceptible pour vous, mais il rend impraticable d'essayer des millions de mots de passe. Il ajoute aussi un **sel** aléatoire : deux personnes avec le même mot de passe ont des empreintes différentes.

**Jeton de session (JWT)** — *Un petit texte signé qui dit « cette personne est l'utilisateur X ».* Le serveur le signe avec `JWT_SECRET`. Personne ne peut le fabriquer ni le modifier sans ce secret : si on change une lettre, la signature ne correspond plus. Il expire au bout de 30 jours.

**Cookie `httpOnly`** — *Le jeton voyage dans un cookie que le JavaScript de la page ne peut pas lire.* Si un script malveillant s'introduisait dans la page, il ne pourrait pas voler la session (on l'a vérifié : `document.cookie` est vide). Le navigateur renvoie le cookie tout seul, le front n'a rien à gérer.

**`SameSite=Lax`** — *Le navigateur n'envoie pas le cookie quand une requête vient d'un AUTRE site.* Ça empêche un site piégé de faire des actions à votre place (attaque « CSRF »).

**Middleware `requireAuth`** — *Il passe avant les routes des mots.* Pas de session valide → réponse **401** et la route n'est même pas exécutée. Toutes les routes `/api/words` sont protégées d'un seul coup.

**Une seule erreur pour deux cas** — Mauvais mot de passe ou e-mail inconnu : le **même** message (« E-mail ou mot de passe incorrect »), et le même temps de réponse (le serveur calcule une fausse vérification quand l'e-mail n'existe pas). Sinon un attaquant pourrait deviner quels e-mails ont un compte.

**Limite de tentatives** — 10 échecs de connexion par 15 minutes (et 20 créations de compte par heure) par adresse IP, contre les essais en boucle de mots de passe.

**Isolation des utilisateurs** — Chaque requête filtre sur l'identifiant de l'utilisateur connecté. L'utilisateur B qui tente de modifier ou supprimer un mot de A reçoit « introuvable » (404), comme si le mot n'existait pas. Un test le vérifie. L'unicité d'un mot est **par utilisateur** : A et B peuvent chacun avoir « reckless ».

## Dans le front

**`user`** (dans `App.jsx`) — Trois valeurs : `undefined` (on vérifie encore), `null` (personne n'est connecté : écran de connexion) ou l'utilisateur (l'appli). Au démarrage, `getMe()` demande au serveur « suis-je connecté ? » : c'est ce qui permet de rester connecté après un rechargement de la page.

**`clearSession()`** — Quand on se déconnecte, on efface **aussi le carnet en mémoire**. Sinon le carnet de la personne précédente resterait visible pour la suivante.

**`fail(e)`** — Un 401 pendant l'utilisation (session expirée, compte supprimé) renvoie vers l'écran de connexion avec « Ta session a expiré. Reconnecte-toi. », au lieu d'une erreur incompréhensible.

**`autoComplete`** — Sur les champs e-mail et mot de passe, il permet au navigateur ou au gestionnaire de mots de passe de les remplir, et de proposer un mot de passe solide à l'inscription.

## Les attaques contre lesquelles on s'est protégé (et testé)

| Attaque | Protection | Test |
| --- | --- | --- |
| Voler la base de données | Mots de passe hachés (bcrypt + sel) | L'empreinte n'est jamais le mot de passe |
| Fabriquer ou modifier un jeton | Signature avec `JWT_SECRET` | Mauvais secret, jeton expiré, jeton modifié : refusés |
| Jeton « non signé » (`alg: none`) | Algorithme HS256 imposé | Refusé |
| Voler la session avec un script | Cookie `httpOnly` | `document.cookie` est vide |
| Faire agir à votre insu depuis un autre site | `SameSite=Lax`, JSON uniquement | Cookie vérifié |
| Essayer des milliers de mots de passe | Limite de tentatives + bcrypt lent | Au-delà de 10 échecs : 429 |
| Deviner quels e-mails ont un compte | Message et temps identiques | Même message dans les deux cas |
| Lire les mots d'un autre | Filtre sur l'utilisateur partout | Test d'isolation A / B |
| Données piégées (`{"$ne": null}`…) | Vérification du type de chaque champ | Refusées (400) |

## Comment tester

1. Lancez `npm.cmd run dev:all` et ouvrez http://localhost:5173 : l'écran de connexion s'affiche.
2. Cliquez sur « En créer un », entrez un e-mail et un mot de passe de 8 caractères minimum : vous êtes connecté.
3. Ajoutez un mot, rechargez la page : vous restez connecté et le mot est là.
4. Cliquez sur **Déconnexion**, puis reconnectez-vous.
5. Créez un second compte : son carnet est vide, il ne voit pas les mots du premier.

## Ce qui n'est pas encore fait

- **Le déploiement en ligne** : il faudra HTTPS (le cookie passera alors en mode `Secure`), un vrai `JWT_SECRET` propre à l'hébergement, et sans doute régler `trust proxy` pour que la limite de tentatives repère la bonne adresse IP.
- **Réinitialisation du mot de passe** : pas d'envoi d'e-mail pour l'instant. Un mot de passe oublié ne se récupère pas.
- **Fermeture des inscriptions** : tout le monde peut créer un compte. Pour un carnet strictement personnel, on pourra bloquer les inscriptions après la création du vôtre.
- **Tester avec la vraie clé DeepL** : le code est testé avec un faux DeepL, pas encore contre le vrai service.

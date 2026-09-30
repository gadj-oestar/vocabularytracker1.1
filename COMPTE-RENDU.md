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

## Ce qui n'est pas encore fait

- La fiche d'un mot avec Modifier / Supprimer.
- Les mots ne sont pas sauvegardés : tout disparaît quand on recharge la page (la base de données arrive avec le back-end).
- Les vraies API de traduction et de définition.

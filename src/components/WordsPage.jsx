import { useState } from 'react'
import { filterAndSort } from '../utils/filterWords'
import { formatDate } from '../utils/formatDate'

// Les boutons de tri de la maquette
const sortOptions = [
  { id: 'recent', label: 'Récents' },
  { id: 'seen', label: 'Les plus vus' },
  { id: 'az', label: 'A-Z' },
]

// Écran "Mes mots" : titre, recherche, filtres et liste de cartes.
// `words` = tout le carnet, donné par App.
// `onOpen` = fonction donnée par App : on l'appelle avec le mot cliqué pour ouvrir sa fiche.
export default function WordsPage({ words, onOpen }) {
  // Ces deux valeurs ne concernent QUE cet écran : on les garde ici, pas dans App.
  const [query, setQuery] = useState('') // ce qui est tapé dans la recherche
  const [sort, setSort] = useState('recent') // le tri choisi

  // À chaque frappe ou changement de tri, React rappelle ce composant et cette ligne
  // recalcule la liste à afficher : c'est ce qui rend la recherche "instantanée".
  const visibleWords = filterAndSort(words, query, sort)

  return (
    <div className="words-page">
      {/* Titre + recherche : empilés sur téléphone, sur la même ligne sur ordinateur */}
      <div className="words-top">
        <div className="words-head">
          <h1 className="words-title">Mes mots</h1>
          {/* Accord : "0 mot", "1 mot", "2 mots" (en français, 0 et 1 sont au singulier) */}
        <span className="words-count">
          {words.length} {words.length > 1 ? 'mots' : 'mot'}
        </span>
        </div>

        <label className="words-search">
          <span className="sr-only">Rechercher</span>
          <input
            type="search"
            placeholder="Anglais ou français…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="chips">
        {sortOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            // "chip--active" = le bouton noir de la maquette (le tri en cours)
            className={`chip ${sort === option.id ? 'chip--active' : ''}`}
            aria-pressed={sort === option.id}
            onClick={() => setSort(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Aucun résultat : on le dit clairement plutôt que d'afficher un écran vide */}
      {/* Deux cas différents : le carnet est vide (il faut ajouter un mot) ou la recherche ne trouve rien */}
      {visibleWords.length === 0 && (
        <p className="words-empty">
          {words.length === 0 ? "Ton carnet est vide. Ajoute ton premier mot depuis l'onglet « Ajouter »." : 'Aucun mot trouvé.'}
        </p>
      )}

      {/* TABLEAU : visible seulement sur ordinateur (le CSS cache l'autre affichage).
          Les mêmes données, présentées en colonnes quand on a la place. */}
      {visibleWords.length > 0 && (
        <div className="words-table-wrap">
          <table className="words-table">
            <thead>
              <tr>
                <th>Mot</th>
                <th>Traduction</th>
                <th>Manhwa</th>
                <th>Vu</th>
                <th>Ajouté le</th>
              </tr>
            </thead>
            <tbody>
              {visibleWords.map((word) => (
                <tr key={word.termNormalized}>
                  <td className="words-table-term">
                    {/* Un vrai <button> (et pas un div cliquable) : utilisable au clavier */}
                    <button className="link-button link-button--term" type="button" onClick={() => onOpen(word)}>
                      {word.term}
                    </button>
                  </td>
                  <td>{word.translation}</td>
                  {/* "—" quand le titre du manhwa n'a pas été renseigné (champ optionnel) */}
                  <td>{word.sourceTitle || '—'}</td>
                  <td>
                    <span className={`badge badge--small ${word.seenCount > 1 ? 'badge--yellow' : ''}`}>
                      ×{word.seenCount}
                    </span>
                  </td>
                  <td>{formatDate(word.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CARTES : visibles seulement sur téléphone */}
      <ul className="words-list">
        {visibleWords.map((word) => (
          <li key={word.termNormalized}>
            {/* Toute la carte est un bouton : un clic n'importe où ouvre la fiche */}
            <button className="word-item" type="button" onClick={() => onOpen(word)}>
              <div>
                <span className="word-term">{word.term}</span>
                <span className="word-translation">{word.translation}</span>
              </div>
              {/* Le compteur est jaune à partir de 2 rencontres : le mot est à retenir en priorité */}
              <span className={`badge badge--small ${word.seenCount > 1 ? 'badge--yellow' : ''}`}>
                ×{word.seenCount}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

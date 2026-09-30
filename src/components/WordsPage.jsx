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
export default function WordsPage({ words }) {
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
          <span className="words-count">{words.length} mots</span>
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
      {visibleWords.length === 0 && <p className="words-empty">Aucun mot trouvé.</p>}

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
                  <td className="words-table-term">{word.term}</td>
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
          <li key={word.termNormalized} className="word-item">
            <div>
              <span className="word-term">{word.term}</span>
              <span className="word-translation">{word.translation}</span>
            </div>
            {/* Le compteur est jaune à partir de 2 rencontres : le mot est à retenir en priorité */}
            <span className={`badge badge--small ${word.seenCount > 1 ? 'badge--yellow' : ''}`}>
              ×{word.seenCount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

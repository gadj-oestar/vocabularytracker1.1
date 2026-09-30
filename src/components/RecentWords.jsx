import { formatDate } from '../utils/formatDate'

// Colonne "Derniers mots" : visible seulement sur ordinateur (le CSS la cache sur téléphone).
export default function RecentWords({ words }) {
  // On ne garde que les 3 premiers : le carnet est déjà trié du plus récent au plus ancien.
  const recent = words.slice(0, 3)

  return (
    <aside className="recent" aria-label="Derniers mots">
      <h2 className="recent-title">Derniers mots</h2>
      <ul className="recent-list">
        {recent.map((word) => (
          // key : aide React à reconnaître chaque ligne quand la liste change
          <li key={word.termNormalized} className="recent-item">
            <span>
              <strong>{word.term}</strong>
              <br />
              <span className="recent-translation">{word.translation}</span>
            </span>
            <span className="badge badge--small" title={`Ajouté le ${formatDate(word.createdAt)}`}>
              ×{word.seenCount}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

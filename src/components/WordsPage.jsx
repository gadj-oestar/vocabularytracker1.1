// Écran "Mes mots" : le titre, le nombre de mots et la liste de cartes.
// `words` = tout le carnet, donné par App.
export default function WordsPage({ words }) {
  return (
    <div className="words-page">
      <div className="words-head">
        <h1 className="words-title">Mes mots</h1>
        {/* words.length = nombre de mots dans le carnet */}
        <span className="words-count">{words.length} mots</span>
      </div>

      <ul className="words-list">
        {/* .map : on transforme chaque mot du carnet en une carte à l'écran */}
        {words.map((word) => (
          // key : identifiant unique, pour que React sache quelle carte est laquelle
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

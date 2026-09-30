import { formatDate } from '../utils/formatDate'

// Fiche d'un mot DÉJÀ enregistré : bandeau bleu + infos en lecture seule.
export default function KnownWordCard({ word }) {
  return (
    <>
      {/* role="status" : les lecteurs d'écran annoncent ce message automatiquement */}
      <div className="banner bubble" role="status">
        <span className="banner-icon">!?</span>
        <div>
          <strong>Déjà dans ton carnet</strong>
          <div>
            Ajouté le {formatDate(word.createdAt)} · vu {word.seenCount} fois
          </div>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2 className="card-term">{word.term}</h2>
            <p className="card-meta">
              {word.phonetic} · {word.partOfSpeech}
            </p>
          </div>
          <span className="badge badge--yellow">×{word.seenCount}</span>
        </div>
        <p className="card-translation">{word.translation}</p>
        <p className="card-example">"{word.example}"</p>
      </section>
    </>
  )
}

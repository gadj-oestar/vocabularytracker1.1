import { formatDate } from '../utils/formatDate'

// Fiche d'un mot DÉJÀ enregistré : (bandeau bleu) + infos en lecture seule.
// showBanner = true par défaut : le bandeau "Déjà dans ton carnet" s'affiche quand on vient
// de retaper un mot connu, mais pas quand on ouvre simplement la fiche depuis la liste.
export default function KnownWordCard({ word, showBanner = true }) {
  return (
    <>
      {showBanner && (
        // role="status" : les lecteurs d'écran annoncent ce message automatiquement
        <div className="banner bubble" role="status">
          <span className="banner-icon">!?</span>
          <div>
            <strong>Déjà dans ton carnet</strong>
            <div>
              Ajouté le {formatDate(word.createdAt)} · vu {word.seenCount} fois
            </div>
          </div>
        </div>
      )}

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

        {/* "Vu dans" : seulement si un titre de manhwa a été renseigné (champ optionnel).
            `&&` : si la condition est fausse, React n'affiche rien du tout. */}
        {word.sourceTitle && (
          <div className="seen-in">
            <div className="field-label">Vu dans</div>
            <div>
              {word.sourceTitle}
              {word.sourceChapter && ` · ch. ${word.sourceChapter}`}
            </div>
          </div>
        )}

        {/* La date d'ajout, utile dans la fiche ouverte depuis la liste */}
        {!showBanner && (
          <p className="card-meta">Ajouté le {formatDate(word.createdAt)}</p>
        )}
      </section>
    </>
  )
}

import { formatDate } from '../utils/formatDate'

// Fiche d'un mot DÉJÀ enregistré : (bandeau bleu) + infos en lecture seule.
// showBanner = true par défaut : le bandeau "Déjà dans ton carnet" s'affiche quand on vient
// de retaper un mot connu, mais pas quand on ouvre simplement la fiche depuis la liste.
// `children` = tout ce qu'on place ENTRE les balises <KnownWordCard>...</KnownWordCard>.
// Ici c'est un emplacement libre en bas de la fiche (utilisé pour les boutons Modifier / Supprimer).
export default function KnownWordCard({ word, showBanner = true, children }) {
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
            {/* Phonétique et nature du mot, sans " · " orphelin quand l'une des deux manque */}
            <p className="card-meta">{[word.phonetic, word.partOfSpeech].filter(Boolean).join(' · ')}</p>
          </div>
          <span className="badge badge--yellow">×{word.seenCount}</span>
        </div>
        <p className="card-translation">{word.translation}</p>
        {word.definition && <p className="card-definition">{word.definition}</p>}
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

        {children}
      </section>
    </>
  )
}

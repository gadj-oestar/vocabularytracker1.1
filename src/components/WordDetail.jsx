import KnownWordCard from './KnownWordCard'

// Écran "fiche d'un mot", ouvert en cliquant sur un mot de la liste.
// `word` = le mot à afficher, `onBack` = fonction donnée par App pour revenir à la liste.
export default function WordDetail({ word, onBack }) {
  return (
    <div className="detail">
      <button className="link-button" type="button" onClick={onBack}>
        ← Retour à la liste
      </button>
      {/* On réutilise la même fiche que pour un doublon, mais sans le bandeau bleu
          (showBanner={false}) : ici on ne vient pas de taper ce mot, on l'ouvre. */}
      <KnownWordCard word={word} showBanner={false} />
    </div>
  )
}

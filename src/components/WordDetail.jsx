import { useState } from 'react'
import KnownWordCard from './KnownWordCard'

// Écran "fiche d'un mot", ouvert en cliquant sur un mot de la liste.
// `word` = le mot à afficher, `onBack` = retour à la liste,
// `onDelete` = fonction donnée par App qui supprime vraiment le mot.
export default function WordDetail({ word, onBack, onDelete }) {
  // confirming : est-on en train de demander "Tu es sûr ?" ? (false au départ)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="detail">
      <button className="link-button" type="button" onClick={onBack}>
        ← Retour à la liste
      </button>
      {/* On réutilise la même fiche que pour un doublon, mais sans le bandeau bleu
          (showBanner={false}) : ici on ne vient pas de taper ce mot, on l'ouvre. */}
      <KnownWordCard word={word} showBanner={false}>
        {/* Ce qu'on met ici arrive dans `children`, en bas de la fiche */}
        {confirming ? (
          // RÈGLE F9 : la suppression demande une confirmation, pour éviter un clic par erreur.
          // role="alertdialog" : les lecteurs d'écran annoncent la question tout de suite.
          <div className="confirm" role="alertdialog" aria-label="Confirmer la suppression">
            <p className="confirm-text">Supprimer « {word.term} » du carnet ?</p>
            <div className="actions">
              <button className="btn-outline btn-outline--danger" type="button" onClick={() => onDelete(word)}>
                Oui, supprimer
              </button>
              <button className="btn-outline" type="button" onClick={() => setConfirming(false)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="actions">
            <button
              className="btn-outline btn-outline--danger"
              type="button"
              // 1er clic : on ne supprime pas encore, on affiche juste la question
              onClick={() => setConfirming(true)}
            >
              Supprimer
            </button>
          </div>
        )}
      </KnownWordCard>
    </div>
  )
}

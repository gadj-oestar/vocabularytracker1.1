import { useState } from 'react'
import KnownWordCard from './KnownWordCard'
import EditWordForm from './EditWordForm'

// Écran "fiche d'un mot", ouvert en cliquant sur un mot de la liste.
// `word` = le mot à afficher, `onBack` = retour à la liste,
// `onUpdate` / `onDelete` = fonctions données par App qui modifient ou suppriment vraiment le mot.
export default function WordDetail({ word, onBack, onUpdate, onDelete }) {
  // confirming : est-on en train de demander "Tu es sûr ?" avant de supprimer ?
  const [confirming, setConfirming] = useState(false)
  // editing : est-on en train de modifier le mot ? (la fiche est remplacée par un formulaire)
  const [editing, setEditing] = useState(false)

  async function handleSaveEdit(updatedWord) {
    // App envoie la modification au serveur et répond true si ça a marché.
    // On attend (await) : si le serveur refuse, on GARDE le formulaire ouvert pour ne pas perdre ce qu'on a tapé.
    const saved = await onUpdate(updatedWord)
    if (saved) setEditing(false) // tout va bien : on revient à la fiche en lecture
  }

  return (
    <div className="detail">
      <button className="link-button" type="button" onClick={onBack}>
        ← Retour à la liste
      </button>

      {editing ? (
        <EditWordForm word={word} onSave={handleSaveEdit} onCancel={() => setEditing(false)} />
      ) : (
        // On réutilise la même fiche que pour un doublon, mais sans le bandeau bleu
        // (showBanner={false}) : ici on ne vient pas de taper ce mot, on l'ouvre.
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
              <button className="btn-outline" type="button" onClick={() => setEditing(true)}>
                Modifier
              </button>
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
      )}
    </div>
  )
}

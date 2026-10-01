import { useId, useState } from 'react'

// Les deux champs "Exemple" (en anglais) et "Exemple en français", avec le bouton "Traduire".
// Utilisé à deux endroits : la fiche d'un nouveau mot et le formulaire de modification.
//   example / exampleTranslation : les deux textes actuels
//   onChange(champ, valeur)      : prévient le parent qu'un des deux textes a changé
//   onTranslate(texte)           : fonction donnée par App qui demande la traduction au serveur
export default function ExampleFields({ example, exampleTranslation, onChange, onTranslate }) {
  // useId : fabrique un identifiant unique pour relier chaque <label> à son champ (htmlFor / id).
  // Nécessaire car ce composant peut exister plusieurs fois sur la même page.
  const id = useId()
  const [busy, setBusy] = useState(false) // true pendant qu'on attend le serveur
  const [message, setMessage] = useState(null) // un message d'aide si la traduction n'a pas marché

  // Le bouton n'est utile que s'il y a quelque chose à traduire, et pas deux fois en même temps
  const canTranslate = example.trim() !== '' && !busy

  async function handleTranslate() {
    setBusy(true)
    setMessage(null)
    try {
      const result = await onTranslate(example)
      if (result.available) {
        onChange('exampleTranslation', result.text) // la traduction remplace le texte du champ français
      } else {
        // Pas une erreur : clé absente, quota épuisé ou DeepL en panne. On le dit simplement.
        setMessage('Traduction indisponible pour le moment : écris-la toi-même.')
      }
    } catch (e) {
      setMessage(e.message) // ex. "Impossible de joindre le serveur."
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-example`}>
          Exemple
        </label>
        {/* textarea : une phrase est souvent trop longue pour un champ d'une seule ligne */}
        <textarea
          id={`${id}-example`}
          rows={2}
          value={example}
          onChange={(event) => onChange('example', event.target.value)}
        />
      </div>

      <div className="field">
        <div className="field-row">
          <label className="field-label" htmlFor={`${id}-translation`}>
            Exemple en français
          </label>
          <button className="btn-mini" type="button" disabled={!canTranslate} onClick={handleTranslate}>
            {busy ? '…' : 'Traduire'}
          </button>
        </div>
        <textarea
          id={`${id}-translation`}
          rows={2}
          value={exampleTranslation}
          onChange={(event) => onChange('exampleTranslation', event.target.value)}
        />
        {/* role="status" : annoncé aux lecteurs d'écran sans interrompre */}
        {message && (
          <span className="field-hint" role="status">
            {message}
          </span>
        )}
      </div>
    </>
  )
}

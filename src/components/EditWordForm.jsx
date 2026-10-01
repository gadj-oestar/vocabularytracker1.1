import { useState } from 'react'
import ExampleFields from './ExampleFields'

// Formulaire pour MODIFIER un mot déjà enregistré (F9 du cahier des charges).
// `word` = le mot à modifier, `onSave(mot)` = enregistre les changements,
// `onCancel` = referme le formulaire sans rien changer,
// `onTranslate` = fonction donnée par App pour traduire l'exemple (bouton "Traduire").
export default function EditWordForm({ word, onSave, onCancel, onTranslate }) {
  // draft = une COPIE de travail du mot. On tape dans la copie, et le vrai mot
  // (dans le carnet) ne change que si on clique sur ENREGISTRER. Annuler = on jette la copie.
  const [draft, setDraft] = useState(word)

  // Même astuce que dans NewWordCard : fabrique le "onChange" d'un champ donné
  const edit = (field) => (event) => setDraft({ ...draft, [field]: event.target.value })

  function handleSubmit(event) {
    event.preventDefault() // pas de rechargement de la page
    onSave(draft)
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      {/* Le mot lui-même n'est pas modifiable : c'est son identifiant dans le carnet */}
      <h2 className="card-term">{word.term}</h2>

      <label className="field">
        <span className="field-label">Traduction</span>
        <input type="text" value={draft.translation} onChange={edit('translation')} />
      </label>

      {/* L'exemple en anglais ET sa traduction française, avec le bouton "Traduire" */}
      <ExampleFields
        example={draft.example}
        exampleTranslation={draft.exampleTranslation ?? ''}
        onChange={(field, value) => setDraft({ ...draft, [field]: value })}
        onTranslate={onTranslate}
      />

      <fieldset className="context">
        <legend className="field-label">Contexte manhwa</legend>
        <div className="context-row">
          <label className="field field--grow">
            Titre
            <input type="text" value={draft.sourceTitle} onChange={edit('sourceTitle')} />
          </label>
          <label className="field field--small">
            Ch.
            <input
              type="text"
              inputMode="numeric"
              value={draft.sourceChapter}
              onChange={edit('sourceChapter')}
            />
          </label>
        </div>
      </fieldset>

      <div className="actions">
        <button className="btn-outline btn-outline--primary" type="submit">
          Enregistrer
        </button>
        <button className="btn-outline" type="button" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  )
}

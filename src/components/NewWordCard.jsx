// Fiche d'un mot NOUVEAU : tout est modifiable avant d'enregistrer.
// Règle du cahier des charges : la traduction de l'API n'est qu'une proposition,
// "ce que tu enregistres fait foi".
export default function NewWordCard({ draft, onChange, onSave }) {
  // Petite fonction qui fabrique un "onChange" pour un champ donné (ex. "translation").
  // Elle renvoie une nouvelle version du brouillon avec ce seul champ modifié.
  const edit = (field) => (event) => onChange({ ...draft, [field]: event.target.value })

  return (
    <section className="card">
      <h2 className="card-term">{draft.term}</h2>
      {/* On n'affiche la ligne que si on a des infos de dictionnaire */}
      {draft.phonetic && (
        <p className="card-meta">
          {draft.phonetic} · {draft.partOfSpeech}
        </p>
      )}

      <label className="field">
        <span className="field-label">Traduction</span>
        <input type="text" value={draft.translation} onChange={edit('translation')} />
      </label>

      <label className="field">
        <span className="field-label">Exemple</span>
        <input type="text" value={draft.example} onChange={edit('example')} />
      </label>

      {/* Contexte manhwa : champs optionnels (F7 du cahier des charges) */}
      <fieldset className="context">
        <legend className="field-label">Contexte manhwa</legend>
        <label className="field">
          Titre
          <input type="text" value={draft.sourceTitle} onChange={edit('sourceTitle')} />
        </label>
        <label className="field field--small">
          Ch.
          <input type="text" inputMode="numeric" value={draft.sourceChapter} onChange={edit('sourceChapter')} />
        </label>
      </fieldset>

      <button className="btn btn--yellow btn--big" type="button" onClick={onSave}>
        ENREGISTRER
      </button>
    </section>
  )
}

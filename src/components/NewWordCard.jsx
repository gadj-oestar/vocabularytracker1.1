// Fiche d'un mot NOUVEAU : tout est modifiable avant d'enregistrer.
// Règle du cahier des charges : la traduction de l'API n'est qu'une proposition,
// "ce que tu enregistres fait foi".
export default function NewWordCard({ draft, onChange, onSave }) {
  // Petite fonction qui fabrique un "onChange" pour un champ donné (ex. "translation").
  // Elle renvoie une nouvelle version du brouillon avec ce seul champ modifié.
  const edit = (field) => (event) =>
    onChange({ ...draft, [field]: event.target.value });

  return (
    // La fiche a deux zones : "main" (le mot) et "side" (le contexte + le bouton).
    // Sur téléphone elles s'empilent, sur ordinateur elles se mettent côte à côte (voir App.css).
    <section className="card card--new">
      <div className="card-main">
        <h2 className="card-term">{draft.term}</h2>
        {/* On n'affiche la ligne que si on a des infos de dictionnaire */}
        {draft.phonetic && (
          <p className="card-meta">
            {draft.phonetic} · {draft.partOfSpeech}
          </p>
        )}

        <label className="field">
          <span className="field-label">Traduction</span>
          <input
            type="text"
            value={draft.translation}
            onChange={edit("translation")}
          />
        </label>

        <label className="field">
          <span className="field-label">Exemple</span>
          <input type="text" value={draft.example} onChange={edit("example")} />
        </label>
      </div>

      <div className="card-side">
        {/* Contexte manhwa : champs optionnels (F7 du cahier des charges).
            On garde <fieldset> (bon pour l'accessibilité) mais la mise en page se fait
            dans un <div> à l'intérieur : un fieldset est capricieux avec flex et décalait le bloc. */}
        <fieldset className="context">
          <legend className="field-label">Contexte manhwa</legend>
          <div className="context-row">
            <label className="field field--grow">
              Titre
              <input
                type="text"
                value={draft.sourceTitle}
                onChange={edit("sourceTitle")}
              />
            </label>
            <label className="field field--small">
              Ch.
              <input
                type="text"
                inputMode="numeric"
                value={draft.sourceChapter}
                onChange={edit("sourceChapter")}
              />
            </label>
          </div>
        </fieldset>

        <button
          className="btn btn--yellow btn--big"
          type="button"
          onClick={onSave}
        >
          ENREGISTRER
        </button>
      </div>
    </section>
  );
}

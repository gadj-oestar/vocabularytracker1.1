import { useState } from 'react'

// Le champ "Un mot t'a bloqué ?" + le bouton GO.
// `onSearch` est une fonction donnée par App : on l'appelle quand l'utilisateur valide.
export default function SearchForm({ onSearch }) {
  // "value" = ce qui est tapé dans le champ. React le garde en mémoire pour nous.
  const [value, setValue] = useState('')

  function handleSubmit(event) {
    event.preventDefault() // empêche le navigateur de recharger la page
    if (value.trim() === '') return // on ignore un champ vide
    onSearch(value) // on prévient App : "cherche ce mot"
    setValue('') // on vide le champ pour le mot suivant
  }

  return (
    <form className="search bubble" onSubmit={handleSubmit}>
      <label className="search-label" htmlFor="mot">
        Un mot t'a bloqué ?
      </label>
      <div className="search-row">
        <input
          id="mot"
          type="text"
          value={value}
          // À chaque lettre tapée, on met à jour la mémoire : le champ suit toujours "value"
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
        />
        <button className="btn btn--blue" type="submit">
          GO
        </button>
      </div>
    </form>
  )
}

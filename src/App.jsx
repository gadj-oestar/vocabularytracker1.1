import { useState } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import SearchForm from './components/SearchForm'
import NewWordCard from './components/NewWordCard'
import KnownWordCard from './components/KnownWordCard'
import { fakeDictionary } from './data/fakeDictionary'
import { normalizeTerm } from './utils/normalize'
import './App.css'

// Carnet de départ EN DUR (étape 1). Il sert à tester la détection de doublon :
// tape "reckless" et l'appli doit dire "Déjà dans ton carnet".
const initialWords = [
  {
    term: 'reckless',
    termNormalized: 'reckless', // version "propre" utilisée pour comparer
    translation: 'imprudent, téméraire',
    partOfSpeech: 'adjectif',
    phonetic: '/ˈrek.ləs/',
    example: 'It was reckless to fight him alone.',
    sourceTitle: '',
    sourceChapter: '',
    seenCount: 3, // compteur "vu X fois" (F6)
    createdAt: '2026-09-12',
  },
]

// App = le "chef d'orchestre" : c'est ici qu'on garde les données
// et qu'on décide quoi afficher.
export default function App() {
  // words : le carnet (liste de tous les mots enregistrés)
  const [words, setWords] = useState(initialWords)
  // result : ce qu'on affiche sous le champ de recherche.
  //   null                       -> rien encore
  //   { type: 'known', word }    -> mot déjà enregistré
  //   { type: 'new', draft }     -> nouveau mot à compléter puis enregistrer
  const [result, setResult] = useState(null)

  // Appelée par SearchForm quand on valide un mot.
  function handleSearch(rawTerm) {
    const termNormalized = normalizeTerm(rawTerm)

    // RÈGLE n°3 du cahier des charges : on regarde D'ABORD dans le carnet,
    // avant de chercher ailleurs (pas d'appel inutile à une API).
    const existing = words.find((w) => w.termNormalized === termNormalized)

    if (existing) {
      // Doublon : on augmente le compteur "vu X fois" (F6)...
      const updated = { ...existing, seenCount: existing.seenCount + 1 }
      // ...en remplaçant seulement ce mot dans la liste (on ne modifie jamais l'ancien objet)
      setWords(words.map((w) => (w === existing ? updated : w)))
      setResult({ type: 'known', word: updated })
      return
    }

    // Nouveau mot : on cherche dans le faux dictionnaire. Introuvable ? Champs vides à remplir
    // soi-même (règle "échec d'API" : le mot peut quand même être enregistré).
    const found = fakeDictionary[termNormalized] ?? {}
    setResult({
      type: 'new',
      draft: {
        term: rawTerm.trim(),
        termNormalized,
        translation: found.translation ?? '',
        partOfSpeech: found.partOfSpeech ?? '',
        phonetic: found.phonetic ?? '',
        example: found.example ?? '',
        sourceTitle: '',
        sourceChapter: '',
      },
    })
  }

  // Appelée par le bouton ENREGISTRER.
  function handleSave() {
    const newWord = {
      ...result.draft,
      seenCount: 1,
      createdAt: new Date().toISOString().slice(0, 10), // date du jour, ex. "2026-09-30"
    }
    setWords([newWord, ...words]) // le plus récent en premier (F8)
    setResult(null) // on efface la fiche : prêt pour le mot suivant
  }

  return (
    <div className="app">
      <Header />
      <main className="main">
        <SearchForm onSearch={handleSearch} />

        {/* Affichage conditionnel : selon `result`, on montre l'une ou l'autre fiche */}
        {result?.type === 'known' && <KnownWordCard word={result.word} />}
        {result?.type === 'new' && (
          <NewWordCard
            draft={result.draft}
            onChange={(draft) => setResult({ type: 'new', draft })}
            onSave={handleSave}
          />
        )}
      </main>
      <BottomNav />
    </div>
  )
}

import { useState } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import SearchForm from './components/SearchForm'
import NewWordCard from './components/NewWordCard'
import KnownWordCard from './components/KnownWordCard'
import RecentWords from './components/RecentWords'
import WordsPage from './components/WordsPage'
import WordDetail from './components/WordDetail'
import { initialWords } from './data/initialWords'
import { fakeDictionary } from './data/fakeDictionary'
import { normalizeTerm } from './utils/normalize'
import './App.css'

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
  // screen : l'écran affiché. 'add' = Ajouter un mot, 'list' = Mes mots, 'detail' = fiche d'un mot.
  const [screen, setScreen] = useState('add')
  // selectedKey : quel mot est ouvert dans la fiche (on retient son termNormalized, l'identifiant du mot)
  const [selectedKey, setSelectedKey] = useState(null)

  // Le mot ouvert, retrouvé dans le carnet à chaque affichage. On ne stocke pas une copie du mot :
  // ainsi la fiche montre toujours la version à jour (après une modification, par exemple).
  const selectedWord = words.find((w) => w.termNormalized === selectedKey)

  // Appelée quand on clique sur un mot de la liste.
  function handleOpen(word) {
    setSelectedKey(word.termNormalized)
    setScreen('detail')
  }

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

  // Appelée quand on confirme la suppression d'un mot (F9).
  function handleDelete(word) {
    // .filter garde tous les mots SAUF celui-là : on fabrique un nouveau carnet, sans modifier l'ancien
    setWords(words.filter((w) => w.termNormalized !== word.termNormalized))
    setSelectedKey(null)
    // Si ce mot était affiché sur l'écran "Ajouter", on l'efface aussi : il n'existe plus
    setResult(null)
    setScreen('list') // retour à la liste
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
      {/* Selon l'écran choisi dans la navigation, on affiche une page ou l'autre */}
      {screen === 'add' ? (
        <main className="main">
          {/* Zone de travail : recherche + fiche. Sur ordinateur, "Derniers mots" se place à sa droite. */}
          <div className="workspace">
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
          </div>

          <RecentWords words={words} onSeeAll={() => setScreen('list')} />
        </main>
      ) : screen === 'detail' && selectedWord ? (
        <main className="main main--single">
          <WordDetail
            // key : quand on ouvre un AUTRE mot, React repart d'un composant neuf
            // (sinon la question "Supprimer ?" pourrait rester affichée d'une fiche à l'autre)
            key={selectedWord.termNormalized}
            word={selectedWord}
            onBack={() => setScreen('list')}
            onDelete={handleDelete}
          />
        </main>
      ) : (
        <main className="main main--single">
          <WordsPage words={words} onOpen={handleOpen} />
        </main>
      )}
      {/* Pendant qu'on regarde une fiche, l'onglet "Mes mots" reste allumé : la fiche en fait partie */}
      <BottomNav screen={screen === 'detail' ? 'list' : screen} onNavigate={setScreen} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import SearchForm from './components/SearchForm'
import NewWordCard from './components/NewWordCard'
import KnownWordCard from './components/KnownWordCard'
import RecentWords from './components/RecentWords'
import WordsPage from './components/WordsPage'
import WordDetail from './components/WordDetail'
import { createWord, deleteWord, listWords, lookupWord, updateWord } from './api'
import './App.css'

// App = le "chef d'orchestre" : c'est ici qu'on garde les données
// et qu'on décide quoi afficher. Les données viennent maintenant du SERVEUR (base PostgreSQL) :
// App les demande au démarrage, puis envoie chaque action (chercher, enregistrer, modifier, supprimer).
export default function App() {
  // words : le carnet (liste de tous les mots enregistrés), copie locale de ce que dit le serveur
  const [words, setWords] = useState([])
  // loading : true tant que le premier chargement n'est pas terminé
  const [loading, setLoading] = useState(true)
  // error : un message d'erreur à afficher (serveur éteint, mot déjà enregistré...), ou null
  const [error, setError] = useState(null)
  // loadFailed : true si le carnet n'a pas pu être chargé (ex. serveur éteint) : on propose alors "Réessayer"
  const [loadFailed, setLoadFailed] = useState(false)
  // searching : true pendant qu'on attend la réponse du serveur à une recherche
  const [searching, setSearching] = useState(false)
  // result : ce qu'on affiche sous le champ de recherche.
  //   null                                      -> rien encore
  //   { type: 'known', word }                   -> mot déjà enregistré
  //   { type: 'new', draft, unavailable }       -> nouveau mot à compléter puis enregistrer
  const [result, setResult] = useState(null)
  // screen : l'écran affiché. 'add' = Ajouter un mot, 'list' = Mes mots, 'detail' = fiche d'un mot.
  const [screen, setScreen] = useState('add')
  // selectedKey : quel mot est ouvert dans la fiche (on retient son termNormalized, l'identifiant du mot)
  const [selectedKey, setSelectedKey] = useState(null)

  // Le mot ouvert, retrouvé dans le carnet à chaque affichage. On ne stocke pas une copie du mot :
  // ainsi la fiche montre toujours la version à jour (après une modification, par exemple).
  const selectedWord = words.find((w) => w.termNormalized === selectedKey)

  // useEffect : "fais ceci APRÈS l'affichage". Avec [] en second argument, ça ne s'exécute qu'une fois,
  // au démarrage : c'est le moment de demander les mots au serveur.
  // (loading vaut déjà true au départ, inutile de le remettre à true ici.)
  useEffect(() => {
    // cancelled : si le composant disparaît avant la réponse du serveur, on ignore la réponse
    // (React en mode développement monte l'appli deux fois : sans ça, on traiterait deux réponses).
    let cancelled = false
    listWords()
      .then((loaded) => {
        if (!cancelled) setWords(loaded)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message)
          setLoadFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true // fonction de "nettoyage" : React l'appelle quand l'effet n'est plus valable
    }
  }, [])

  // Bouton "Réessayer" : refait le même chargement quand le premier a échoué.
  async function handleRetry() {
    setLoading(true)
    setError(null)
    setLoadFailed(false)
    try {
      setWords(await listWords())
    } catch (e) {
      setError(e.message)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  // Remplace un mot dans le carnet (ou l'ajoute en tête s'il n'y est pas encore).
  function putWord(word) {
    setWords((current) =>
      current.some((w) => w.id === word.id) ? current.map((w) => (w.id === word.id ? word : w)) : [word, ...current],
    )
  }

  // Appelée par SearchForm quand on valide un mot.
  async function handleSearch(rawTerm) {
    setError(null)
    setSearching(true)
    try {
      // Le SERVEUR fait tout le travail : normalisation, recherche dans la base, compteur "vu X fois",
      // et pour un nouveau mot, appel aux dictionnaires et à DeepL.
      const data = await lookupWord(rawTerm)
      if (data.status === 'known') {
        putWord(data.word) // le compteur a augmenté côté serveur : on met à jour notre copie
        setResult({ type: 'known', word: data.word })
      } else {
        setResult({ type: 'new', draft: data.draft, unavailable: data.unavailable })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSearching(false) // quoi qu'il arrive (succès ou erreur), la recherche est terminée
    }
  }

  // Appelée par le bouton ENREGISTRER.
  async function handleSave() {
    setError(null)
    try {
      const saved = await createWord(result.draft)
      putWord(saved)
      setResult(null) // on efface la fiche : prêt pour le mot suivant
    } catch (e) {
      // Ex. 409 "Ce mot est déjà enregistré" : la base a refusé le doublon. La fiche reste affichée.
      setError(e.message)
    }
  }

  // Appelée quand on enregistre une modification (F9). Renvoie true si ça a marché : le formulaire
  // ne se referme que dans ce cas, pour ne pas perdre ce qu'on a tapé si le serveur a refusé.
  async function handleUpdate(updatedWord) {
    setError(null)
    try {
      putWord(await updateWord(updatedWord.id, updatedWord))
      setResult(null) // la fiche de l'écran "Ajouter" montrerait l'ancienne version
      return true
    } catch (e) {
      setError(e.message)
      return false
    }
  }

  // Appelée quand on confirme la suppression d'un mot (F9).
  async function handleDelete(word) {
    setError(null)
    try {
      await deleteWord(word.id)
      // .filter garde tous les mots SAUF celui-là : on fabrique un nouveau carnet, sans modifier l'ancien
      setWords((current) => current.filter((w) => w.id !== word.id))
      setSelectedKey(null)
      setResult(null)
      setScreen('list') // retour à la liste
    } catch (e) {
      setError(e.message)
    }
  }

  // Appelée quand on clique sur un mot de la liste.
  function handleOpen(word) {
    setError(null)
    setSelectedKey(word.termNormalized)
    setScreen('detail')
  }

  // Changer d'écran efface l'ancien message d'erreur : il ne concerne plus ce qu'on regarde
  function handleNavigate(nextScreen) {
    setError(null)
    setScreen(nextScreen)
  }

  // Le message d'erreur (affiché en haut de chaque écran). role="alert" : les lecteurs d'écran l'annoncent.
  const errorBanner = error && (
    <div className="error-banner" role="alert">
      <span>{error}</span>
      {/* Carnet non chargé : "Réessayer" relance le chargement. Sinon on peut juste fermer le message. */}
      {loadFailed ? (
        <button type="button" className="link-button" onClick={handleRetry}>
          Réessayer
        </button>
      ) : (
        <button type="button" className="link-button" onClick={() => setError(null)}>
          Fermer
        </button>
      )}
    </div>
  )

  // Pendant le premier chargement, on n'affiche qu'un message d'attente
  let content
  if (loading) {
    content = (
      <main className="main main--single">
        <p className="loading" role="status">
          Chargement de ton carnet…
        </p>
      </main>
    )
  } else if (screen === 'add') {
    content = (
      <main className="main">
        {errorBanner}
        {/* Zone de travail : recherche + fiche. Sur ordinateur, "Derniers mots" se place à sa droite. */}
        <div className="workspace">
          <SearchForm onSearch={handleSearch} busy={searching} />

          {/* Affichage conditionnel : selon `result`, on montre l'une ou l'autre fiche */}
          {result?.type === 'known' && <KnownWordCard word={result.word} />}
          {result?.type === 'new' && (
            <NewWordCard
              draft={result.draft}
              unavailable={result.unavailable}
              onChange={(draft) => setResult({ ...result, draft })}
              onSave={handleSave}
            />
          )}
        </div>

        <RecentWords words={words} onSeeAll={() => handleNavigate('list')} />
      </main>
    )
  } else if (screen === 'detail' && selectedWord) {
    content = (
      <main className="main main--single">
        {errorBanner}
        <WordDetail
          // key : quand on ouvre un AUTRE mot, React repart d'un composant neuf
          // (sinon la question "Supprimer ?" pourrait rester affichée d'une fiche à l'autre)
          key={selectedWord.termNormalized}
          word={selectedWord}
          onBack={() => handleNavigate('list')}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </main>
    )
  } else {
    content = (
      <main className="main main--single">
        {errorBanner}
        <WordsPage words={words} onOpen={handleOpen} />
      </main>
    )
  }

  return (
    <div className="app">
      <Header />
      {content}
      {/* Pendant qu'on regarde une fiche, l'onglet "Mes mots" reste allumé : la fiche en fait partie */}
      <BottomNav screen={screen === 'detail' ? 'list' : screen} onNavigate={handleNavigate} />
    </div>
  )
}

import { useEffect, useState } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import AuthPage from './components/AuthPage'
import Signature from './components/Signature'
import SearchForm from './components/SearchForm'
import NewWordCard from './components/NewWordCard'
import KnownWordCard from './components/KnownWordCard'
import RecentWords from './components/RecentWords'
import WordsPage from './components/WordsPage'
import WordDetail from './components/WordDetail'
import {
  createWord,
  deleteWord,
  getAuthConfig,
  getMe,
  listWords,
  login,
  logout,
  lookupWord,
  register,
  translateText,
  updateWord,
} from './api'
import './App.css'

// App = le "chef d'orchestre" : c'est ici qu'on garde les données
// et qu'on décide quoi afficher. Les données viennent du SERVEUR (base PostgreSQL) :
// App vérifie d'abord si on est connecté, puis demande les mots, puis envoie chaque action.
export default function App() {
  // user : la personne connectée.
  //   undefined  -> on ne sait pas encore (vérification en cours au démarrage)
  //   null       -> personne n'est connecté : on affiche l'écran de connexion
  //   { id, email } -> connecté : on affiche l'appli
  const [user, setUser] = useState(undefined)
  // registrationOpen : peut-on créer un compte ? Le serveur peut fermer les inscriptions (carnet personnel).
  // Ouvert par défaut : seul l'écran de connexion en tient compte.
  const [registrationOpen, setRegistrationOpen] = useState(true)
  // words : le carnet (liste de tous les mots enregistrés), copie locale de ce que dit le serveur
  const [words, setWords] = useState([])
  // loading : true tant que la vérification de session et le premier chargement ne sont pas terminés
  const [loading, setLoading] = useState(true)
  // error : un message d'erreur à afficher (serveur éteint, mot déjà enregistré...), ou null
  const [error, setError] = useState(null)
  // loadFailed : true si le démarrage a échoué (ex. serveur éteint) : on propose alors "Réessayer"
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

  // Démarrage : "suis-je connecté ?" ; si oui, on charge le carnet. Renvoie l'utilisateur et ses mots.
  // (Le cookie de session est envoyé automatiquement par le navigateur : on n'a rien à lui donner.)
  async function startSession() {
    const me = await getMe()
    // Si personne n'est connecté, on demande aussi si les inscriptions sont ouvertes (pour l'écran de connexion)
    const open = me ? true : (await getAuthConfig()).registrationOpen
    return { me, open, loaded: me ? await listWords() : [] }
  }

  // useEffect : "fais ceci APRÈS l'affichage". Avec [] en second argument, ça ne s'exécute qu'une fois, au démarrage.
  // (loading vaut déjà true au départ, inutile de le remettre à true ici.)
  useEffect(() => {
    // cancelled : si le composant disparaît avant la réponse du serveur, on ignore la réponse
    // (React en mode développement monte l'appli deux fois : sans ça, on traiterait deux réponses).
    let cancelled = false
    startSession()
      .then(({ me, open, loaded }) => {
        if (cancelled) return
        setUser(me)
        setRegistrationOpen(open)
        setWords(loaded)
      })
      .catch((e) => {
        if (cancelled) return
        setUser(null)
        setError(e.message)
        setLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true // fonction de "nettoyage" : React l'appelle quand l'effet n'est plus valable
    }
  }, [])

  // Bouton "Réessayer" : refait le même démarrage quand le premier a échoué.
  async function handleRetry() {
    setLoading(true)
    setError(null)
    setLoadFailed(false)
    try {
      const { me, open, loaded } = await startSession()
      setUser(me)
      setRegistrationOpen(open)
      setWords(loaded)
    } catch (e) {
      setError(e.message)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  // Remet l'appli dans l'état "personne connecté" : on oublie le carnet et tout ce qui était affiché.
  // Important : le carnet d'une personne ne doit JAMAIS rester en mémoire quand une autre se connecte.
  function clearSession() {
    setUser(null)
    setWords([])
    setResult(null)
    setSelectedKey(null)
    setScreen('add')
  }

  // Gère une erreur venue du serveur. Un 401 en cours d'utilisation veut dire que la session a expiré
  // (ou que le compte a disparu) : on renvoie vers l'écran de connexion au lieu d'afficher une erreur confuse.
  function fail(e) {
    if (e.status === 401) {
      clearSession()
      setError('Ta session a expiré. Reconnecte-toi.')
    } else {
      setError(e.message)
    }
  }

  // Appelée par AuthPage quand on valide le formulaire. Renvoie un message d'erreur si ça a échoué
  // (AuthPage l'affiche dans le formulaire), sinon rien.
  async function handleAuth(mode, email, password) {
    setError(null)
    try {
      const me = mode === 'register' ? await register(email, password) : await login(email, password)
      setWords(await listWords()) // le carnet de CETTE personne
      setUser(me)
      return undefined
    } catch (e) {
      return e.message
    }
  }

  // Appelée par le bouton "Déconnexion".
  async function handleLogout() {
    try {
      await logout()
    } catch (e) {
      setError(e.message)
      return // si le serveur n'a pas pu effacer la session, on reste connecté plutôt que de faire semblant
    }
    clearSession()
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
      fail(e)
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
      fail(e)
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
      fail(e)
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
      fail(e)
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
      {/* Démarrage raté : "Réessayer" relance le démarrage. Sinon on peut juste fermer le message. */}
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

  // Pendant la vérification de session et le premier chargement, on n'affiche qu'un message d'attente
  if (loading) {
    return (
      <div className="app app--auth">
        <Header />
        <main className="main main--single">
          <p className="loading" role="status">
            Chargement…
          </p>
        </main>
      </div>
    )
  }

  // Personne n'est connecté : écran de connexion, SANS la barre de navigation
  if (!user) {
    return (
      <div className="app app--auth">
        <Header />
        <main className="main main--single">
          {errorBanner}
          <AuthPage onSubmit={handleAuth} registrationOpen={registrationOpen} />
        </main>
        <Signature variant="page" />
      </div>
    )
  }

  let content
  if (screen === 'add') {
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
              onTranslate={translateText}
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
          onTranslate={translateText}
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
      <Header user={user} onLogout={handleLogout} />
      {content}
      {/* Sur téléphone : la signature est en bas de la page, juste au-dessus de la barre de navigation.
          Sur ordinateur elle est dans le menu de gauche (voir BottomNav), donc celle-ci est cachée par le CSS. */}
      <Signature variant="page" />
      {/* Pendant qu'on regarde une fiche, l'onglet "Mes mots" reste allumé : la fiche en fait partie */}
      <BottomNav screen={screen === 'detail' ? 'list' : screen} onNavigate={handleNavigate} />
    </div>
  )
}

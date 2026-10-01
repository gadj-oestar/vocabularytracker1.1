import { useState } from 'react'

// Écran de connexion / création de compte (F1 du cahier des charges : e-mail + mot de passe).
// `onSubmit(mode, email, password)` = fonction donnée par App qui parle au serveur.
// Elle renvoie un message d'erreur (texte) si ça a échoué, rien si ça a marché.
// `registrationOpen` = false quand le serveur a fermé les inscriptions : on ne propose alors que la connexion.
export default function AuthPage({ onSubmit, registrationOpen = true }) {
  // mode : 'login' (se connecter) ou 'register' (créer un compte). Le même formulaire sert aux deux.
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false) // true pendant qu'on attend le serveur : on bloque le bouton
  // showPassword : le mot de passe est-il affiché en clair ? Masqué par défaut : quelqu'un qui regarde l'écran
  // par-dessus votre épaule ne doit rien voir tant que vous ne l'avez pas demandé.
  const [showPassword, setShowPassword] = useState(false)

  // Même si `mode` valait 'register', on reste en connexion quand les inscriptions sont fermées
  const isRegister = registrationOpen && mode === 'register'

  async function handleSubmit(event) {
    event.preventDefault() // pas de rechargement de la page
    if (busy) return
    setError(null)
    setBusy(true)
    const message = await onSubmit(mode, email, password)
    // Si ça a marché, App affiche l'appli à la place de ce formulaire : rien à faire ici.
    // Si ça a échoué, on affiche le message du serveur et on garde ce que l'utilisateur a tapé.
    if (message) {
      setError(message)
      setBusy(false)
    }
  }

  // Passer de "Connexion" à "Créer un compte" (et inversement) efface l'erreur précédente
  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setError(null)
    setShowPassword(false) // on repart toujours avec le mot de passe masqué
  }

  return (
    <div className="auth">
      <form className="card" onSubmit={handleSubmit}>
        <h1 className="auth-title">{isRegister ? 'Créer un compte' : 'Connexion'}</h1>
        <p className="auth-intro">
          {isRegister
            ? 'Ton carnet est privé : toi seul vois tes mots.'
            : 'Connecte-toi pour retrouver ton carnet sur tous tes appareils.'}
        </p>

        <label className="field">
          <span className="field-label">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            // autoComplete : permet au navigateur ou au gestionnaire de mots de passe de remplir le champ
            autoComplete="email"
            required
          />
        </label>

        {/* Ici le label est lié au champ par htmlFor/id (et non en l'entourant) : le bouton "œil" placé
            à côté ne doit pas faire partie du nom du champ pour les lecteurs d'écran. */}
        <div className="field">
          <label className="field-label" htmlFor="password">
            Mot de passe
          </label>
          <div className="password-wrap">
            <input
              id="password"
              // type="text" montre le mot de passe en clair, type="password" le cache sous des points
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              // "new-password" à l'inscription : le navigateur propose d'en générer un solide
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              // Mot de passe visible = simple texte pour le navigateur : on coupe le correcteur orthographique
              // (qui pourrait envoyer ce texte à un service en ligne) et les majuscules/corrections automatiques.
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              minLength={isRegister ? 8 : undefined}
              required
            />
            <button
              className="password-toggle"
              type="button"
              // aria-label : un bouton avec seulement une icône a besoin d'un nom pour les lecteurs d'écran.
              // aria-pressed : indique si le bouton est "enfoncé" (mot de passe affiché).
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {showPassword ? (
                  // œil barré : "cliquer pour masquer"
                  <>
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.77 19.77 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.17 4.19" />
                    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                    <path d="M1 1l22 22" />
                  </>
                ) : (
                  // œil ouvert : "cliquer pour afficher"
                  <>
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          </div>
          {isRegister && <span className="field-hint">8 caractères minimum.</span>}
        </div>

        {/* Message du serveur (ex. "E-mail ou mot de passe incorrect."). role="alert" : annoncé aux lecteurs d'écran. */}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn--yellow btn--big" type="submit" disabled={busy}>
          {busy ? '…' : isRegister ? 'CRÉER MON COMPTE' : 'SE CONNECTER'}
        </button>

        {/* Le bouton pour passer à "Créer un compte" n'existe que si le serveur accepte les inscriptions */}
        {registrationOpen ? (
          <button className="link-button auth-switch" type="button" onClick={switchMode}>
            {isRegister ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? En créer un'}
          </button>
        ) : (
          <p className="auth-intro auth-switch">Les inscriptions sont fermées.</p>
        )}
      </form>
    </div>
  )
}

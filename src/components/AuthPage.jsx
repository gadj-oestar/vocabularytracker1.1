import { useState } from 'react'

// Écran de connexion / création de compte (F1 du cahier des charges : e-mail + mot de passe).
// `onSubmit(mode, email, password)` = fonction donnée par App qui parle au serveur.
// Elle renvoie un message d'erreur (texte) si ça a échoué, rien si ça a marché.
export default function AuthPage({ onSubmit }) {
  // mode : 'login' (se connecter) ou 'register' (créer un compte). Le même formulaire sert aux deux.
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false) // true pendant qu'on attend le serveur : on bloque le bouton

  const isRegister = mode === 'register'

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

        <label className="field">
          <span className="field-label">Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            // "new-password" à l'inscription : le navigateur propose d'en générer un solide
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={isRegister ? 8 : undefined}
            required
          />
          {isRegister && <span className="field-hint">8 caractères minimum.</span>}
        </label>

        {/* Message du serveur (ex. "E-mail ou mot de passe incorrect."). role="alert" : annoncé aux lecteurs d'écran. */}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn--yellow btn--big" type="submit" disabled={busy}>
          {busy ? '…' : isRegister ? 'CRÉER MON COMPTE' : 'SE CONNECTER'}
        </button>

        <button className="link-button auth-switch" type="button" onClick={switchMode}>
          {isRegister ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? En créer un'}
        </button>
      </form>
    </div>
  )
}

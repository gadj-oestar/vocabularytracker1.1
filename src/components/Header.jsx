// Bandeau jaune du haut (mobile) / logo + carte du compte dans le menu (ordinateur).
// `user` = l'utilisateur connecté (ou null : on n'affiche alors que le logo),
// `onLogout` = fonction donnée par App pour se déconnecter.
export default function Header({ user = null, onLogout }) {
  return (
    <header className="header">
      <div className="logo">
        VOCAB<span>!</span> TRACKER
      </div>

      {user && (
        // La "carte du compte". Sur téléphone elle est réduite à l'avatar + un bouton rond ;
        // sur ordinateur elle montre aussi "Connecté" et l'e-mail (voir App.css).
        <div className="user">
          {/* Avatar : les 2 premières lettres de l'e-mail dans un rond, avec un voyant vert "en ligne".
              aria-hidden : c'est décoratif, l'information est donnée en texte juste après. */}
          <div className="user-avatar" aria-hidden="true">
            {user.email.slice(0, 2).toUpperCase()}
            <span className="user-dot" />
          </div>

          <div className="user-info">
            <span className="user-status">Connecté</span>
            <span className="user-email" title={user.email}>
              {user.email}
            </span>
          </div>

          {/* Sur téléphone l'e-mail est caché : ce texte, invisible à l'écran, le dit aux lecteurs d'écran */}
          <span className="sr-only">Connecté en tant que {user.email}.</span>

          <button className="logout-btn" type="button" onClick={onLogout} aria-label="Se déconnecter">
            {/* Icône "porte de sortie avec flèche" */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span className="logout-label">Déconnexion</span>
          </button>
        </div>
      )}
    </header>
  )
}

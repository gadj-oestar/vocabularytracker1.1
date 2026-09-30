// Bandeau jaune du haut (mobile) / logo du menu (ordinateur).
// `user` = l'utilisateur connecté (ou null : on n'affiche alors que le logo),
// `onLogout` = fonction donnée par App pour se déconnecter.
export default function Header({ user = null, onLogout }) {
  return (
    <header className="header">
      <div className="logo">
        VOCAB<span>!</span> TRACKER
      </div>

      {user && (
        <div className="user">
          {/* Les initiales de l'e-mail dans une pastille (comme "GT" dans la maquette).
              aria-hidden : c'est décoratif, l'e-mail complet est donné dans le title / le bouton. */}
          <span className="user-pill" aria-hidden="true">
            {user.email.slice(0, 2).toUpperCase()}
          </span>
          <span className="user-email" title={user.email}>
            {user.email}
          </span>
          <button className="link-button" type="button" onClick={onLogout}>
            Déconnexion
          </button>
        </div>
      )}
    </header>
  )
}

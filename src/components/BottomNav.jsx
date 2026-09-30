// Barre de navigation : en bas sur téléphone, à gauche sur ordinateur (le CSS décide).
// Étape 1 : seul "Ajouter" est actif. "Mes mots" arrive à l'étape 2.
export default function BottomNav() {
  return (
    <nav className="nav" aria-label="Navigation principale">
      <a className="nav-item nav-item--active" href="#ajouter" aria-current="page">
        Ajouter
      </a>
      {/* disabled : on montre le bouton de la maquette sans le rendre cliquable */}
      <button className="nav-item" type="button" disabled title="Bientôt disponible">
        Mes mots
      </button>
    </nav>
  )
}

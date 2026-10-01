import Signature from './Signature'

// Barre de navigation : en bas sur téléphone, à gauche sur ordinateur (le CSS décide).
// `screen` = l'écran affiché ('add' ou 'list'), `onNavigate` = fonction donnée par App
// pour changer d'écran.
const items = [
  { id: 'add', label: 'Ajouter' },
  { id: 'list', label: 'Mes mots' },
]

export default function BottomNav({ screen, onNavigate }) {
  return (
    <nav className="nav" aria-label="Navigation principale">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          // Le bouton de l'écran actuel reçoit la classe "active" (fond jaune dans la maquette)
          className={`nav-item ${screen === item.id ? 'nav-item--active' : ''}`}
          // aria-current : indique aux lecteurs d'écran quelle page est ouverte
          aria-current={screen === item.id ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </button>
      ))}
      {/* Sur ordinateur, la signature se place tout en bas du menu de gauche (invisible sur téléphone) */}
      <Signature variant="side" />
    </nav>
  )
}

// La signature de l'auteur : le logo + "Fait par …".
// `variant` change seulement la présentation (le CSS s'en occupe) :
//   'side' = dans le menu de gauche sur ordinateur, 'page' = en bas de la page sur téléphone
//   et sur l'écran de connexion.
import logo from '../assets/gt-logo.svg' // Vite transforme cette ligne en l'adresse du fichier image

export default function Signature({ variant = 'page' }) {
  return (
    <p className={`signature signature--${variant}`}>
      {/* alt : le texte lu à la place de l'image par les lecteurs d'écran */}
      <img src={logo} alt="Logo GT" width="28" height="28" />
      <span>
        Fait par <strong>Gad T.</strong>
      </span>
    </p>
  )
}

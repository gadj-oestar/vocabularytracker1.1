// Vérification de l'e-mail et du mot de passe reçus. Comme toujours : on ne fait pas confiance aux données reçues.
import { HttpError } from './wordInput.js'

// Une forme minimale : quelque chose @ quelque chose . quelque chose, sans espace.
// La seule vraie vérification d'un e-mail est d'y envoyer un message ; ici on écarte les fautes de frappe évidentes.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Met l'e-mail sous sa forme "propre" : "  Gad@Mail.COM " et "gad@mail.com" sont la même adresse.
export function cleanEmail(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'Adresse e-mail invalide.')
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !EMAIL_FORMAT.test(email)) throw new HttpError(400, 'Adresse e-mail invalide.')
  return email
}

// Règles du mot de passe : 8 caractères minimum. Maximum 72 OCTETS : bcrypt ignore silencieusement tout
// ce qui dépasse 72 octets, donc deux mots de passe longs qui ne diffèrent qu'après seraient acceptés
// comme identiques. On préfère refuser clairement. (Un caractère accentué ou un emoji fait plusieurs octets.)
// On ne fait JAMAIS de trim() : les espaces font partie du mot de passe.
export function cleanPassword(value) {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new HttpError(400, 'Le mot de passe doit faire entre 8 et 72 caractères.')
  }
  return value
}

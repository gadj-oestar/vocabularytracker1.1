// Session : après une connexion réussie, le serveur donne au navigateur un "jeton" (JWT).
// C'est un petit texte signé avec notre secret : il dit "cette personne est l'utilisateur X".
// Le navigateur le renvoie automatiquement à chaque requête, et le serveur vérifie la signature.
// Personne ne peut fabriquer ou modifier un jeton sans connaître JWT_SECRET.
import jwt from 'jsonwebtoken'

export const COOKIE_NAME = 'token'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // la session dure 30 jours (F1 : "session conservée sur chaque appareil")

// Le secret de signature vient du fichier .env. Sans lui (ou trop court), on REFUSE de fonctionner :
// un secret faible ou absent rendrait toutes les sessions falsifiables.
function secret() {
  const value = process.env.JWT_SECRET
  if (!value || value.length < 32) {
    throw new Error('JWT_SECRET manquant ou trop court (32 caractères minimum). Voir .env.example.')
  }
  return value
}

// Appelée au démarrage du serveur : mieux vaut planter tout de suite avec un message clair
// que découvrir le problème à la première connexion.
export function assertAuthConfig() {
  secret()
}

// Fabrique le jeton pour un utilisateur. Il contient seulement son identifiant et une date d'expiration.
export function signToken(userId) {
  return jwt.sign({}, secret(), { subject: userId, expiresIn: '30d', algorithm: 'HS256' })
}

// Lit un jeton : renvoie l'identifiant de l'utilisateur, ou null si le jeton est faux, modifié ou expiré.
// On impose l'algorithme HS256 : sans ça, une attaque connue ("alg: none") pourrait faire passer
// un jeton non signé pour valide.
export function readToken(token) {
  try {
    return jwt.verify(token, secret(), { algorithms: ['HS256'] }).sub ?? null
  } catch {
    return null
  }
}

// Les réglages du cookie qui transporte le jeton :
export function cookieOptions() {
  return {
    httpOnly: true, // le JavaScript de la page NE PEUT PAS lire ce cookie : un script malveillant ne peut pas le voler
    sameSite: 'lax', // le navigateur ne l'envoie pas lors d'une requête POST venue d'un AUTRE site (protection CSRF)
    secure: process.env.NODE_ENV === 'production', // en ligne : uniquement via HTTPS (pas en local, où il n'y a pas de HTTPS)
    maxAge: MAX_AGE_MS,
    path: '/',
  }
}

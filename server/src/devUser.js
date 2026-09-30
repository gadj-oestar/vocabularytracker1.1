// TEMPORAIRE (jusqu'à l'étape 5 du plan : authentification).
// Comme la connexion n'existe pas encore, on fait comme si un seul utilisateur "de développement"
// était toujours connecté. Il est créé automatiquement la première fois.
// À l'étape 5, ce fichier sera remplacé par la vraie vérification de connexion.
import { prisma } from './db.js'

const DEV_EMAIL = 'dev@vocabulary-tracker.local'
let cachedUser = null // on retient l'utilisateur pour ne pas interroger la base à chaque requête

// Un "middleware" Express : une fonction qui s'exécute AVANT chaque route et peut y ajouter des infos.
// Ici on ajoute `req.user`, que les routes utilisent pour ne voir QUE les mots de cet utilisateur.
export async function attachDevUser(req, res, next) {
  if (!cachedUser) {
    cachedUser = await prisma.user.upsert({
      where: { email: DEV_EMAIL },
      update: {}, // s'il existe déjà : on ne change rien
      create: { email: DEV_EMAIL, passwordHash: 'dev-user-no-real-password' }, // sinon on le crée
    })
  }
  req.user = cachedUser
  next()
}

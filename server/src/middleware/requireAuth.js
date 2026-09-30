// Middleware de protection : placé devant une route, il exige d'être connecté.
// Il remplace devUser.js (l'utilisateur factice de développement).
import { prisma } from '../db.js'
import { COOKIE_NAME, readToken } from '../auth/token.js'
import { HttpError } from '../utils/wordInput.js'

export async function requireAuth(req, res, next) {
  // Le navigateur renvoie le cookie tout seul ; cookie-parser le met dans req.cookies
  const token = req.cookies?.[COOKIE_NAME]
  const userId = token ? readToken(token) : null
  if (!userId) throw new HttpError(401, 'Connexion requise.')

  // On revérifie que le compte existe encore (il a pu être supprimé après l'émission du jeton).
  // `select` : on ne récupère QUE ce dont on a besoin, jamais le mot de passe haché.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
  if (!user) throw new HttpError(401, 'Connexion requise.')

  req.user = user // les routes suivantes s'en servent pour ne montrer que les mots de cet utilisateur
  next()
}

// Les routes d'authentification :
//   GET  /api/auth/config    -> les inscriptions sont-elles ouvertes ?
//   POST /api/auth/register  -> créer un compte (et être connecté)
//   POST /api/auth/login     -> se connecter
//   POST /api/auth/logout    -> se déconnecter
//   GET  /api/auth/me        -> "qui suis-je ?" (le front s'en sert au démarrage pour savoir s'il est connecté)
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import { COOKIE_NAME, cookieOptions, signToken } from '../auth/token.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { cleanEmail, cleanPassword } from '../utils/authInput.js'
import { HttpError } from '../utils/wordInput.js'

const router = Router()

// Ce qu'on renvoie au front à propos d'un utilisateur : JAMAIS le mot de passe haché.
const publicUser = (user) => ({ id: user.id, email: user.email })

// Dépose le cookie de session dans le navigateur
function startSession(res, user) {
  res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions())
}

// Protection contre le "brute force" (essayer des milliers de mots de passe) :
// 10 échecs de connexion par 15 minutes et par adresse IP. Les connexions réussies ne comptent pas.
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessaie dans quelques minutes.' },
})
// Création de comptes : 20 par heure et par IP (évite qu'un script remplisse la base de faux comptes)
const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de créations de compte. Réessaie plus tard.' },
})

// Les inscriptions sont-elles ouvertes ? Oui par défaut. Pour un carnet strictement personnel, on les ferme
// une fois son propre compte créé : on met ALLOW_REGISTRATION=false dans la configuration du serveur.
// (Lu à chaque appel, pas une fois pour toutes : on peut donc le changer sans toucher au code.)
const registrationOpen = () => process.env.ALLOW_REGISTRATION !== 'false'

// Le front demande ceci pour savoir s'il doit proposer "Créer un compte" sur l'écran de connexion.
router.get('/config', (req, res) => {
  res.json({ registrationOpen: registrationOpen() })
})

router.post('/register', registerLimiter, async (req, res) => {
  // 403 = "interdit" : la requête est comprise mais refusée. On le vérifie AVANT tout le reste.
  if (!registrationOpen()) throw new HttpError(403, 'Les inscriptions sont fermées.')

  const email = cleanEmail(req.body?.email)
  const password = cleanPassword(req.body?.password)

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
    })
    startSession(res, user) // on est connecté directement après l'inscription
    res.status(201).json({ user: publicUser(user) })
  } catch (error) {
    // P2002 = contrainte d'unicité : cet e-mail a déjà un compte (la base l'interdit, colonne `email` unique)
    if (error.code === 'P2002') throw new HttpError(409, 'Un compte existe déjà avec cet e-mail.')
    throw error
  }
})

router.post('/login', loginLimiter, async (req, res) => {
  const email = cleanEmail(req.body?.email)
  // Pas de cleanPassword ici : on ne donne pas les règles de création à quelqu'un qui essaie de se connecter.
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  const user = await prisma.user.findUnique({ where: { email } })
  const ok = await verifyPassword(password, user?.passwordHash ?? null)

  // UN SEUL message pour "e-mail inconnu" et "mauvais mot de passe" : dire lequel des deux est faux
  // aiderait un attaquant à savoir quels e-mails ont un compte.
  if (!user || !ok) throw new HttpError(401, 'E-mail ou mot de passe incorrect.')

  startSession(res, user)
  res.json({ user: publicUser(user) })
})

router.post('/logout', (req, res) => {
  // On efface le cookie, avec les mêmes réglages qu'à sa création (sinon le navigateur ne le reconnaît pas)
  res.clearCookie(COOKIE_NAME, cookieOptions())
  res.status(204).end()
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

export default router

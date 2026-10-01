// L'application Express : on y branche les "middlewares" et les routes.
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import wordsRouter from './routes/words.js'
import authRouter from './routes/auth.js'
import translateRouter from './routes/translate.js'
import { requireAuth } from './middleware/requireAuth.js'
import { HttpError } from './utils/wordInput.js'

const app = express()

// CORS : par défaut, un navigateur interdit à une page (le front sur le port 5173) d'appeler
// une autre adresse (l'API sur le port 3001). Ici on autorise UNIQUEMENT l'adresse de notre front.
// `credentials: true` autorise le navigateur à envoyer le cookie de session avec ces requêtes.
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true }))

// Lit le corps JSON des requêtes (req.body). La limite évite qu'on envoie un énorme message.
// Seul le JSON est accepté : un formulaire venu d'un autre site ne pourrait donc pas envoyer de requête valide.
app.use(express.json({ limit: '100kb' }))

// Lit les cookies de la requête (req.cookies) : c'est là que se trouve le jeton de session
app.use(cookieParser())

// Route de test : répond "ok" si le serveur tourne (utile pour vérifier rapidement).
app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

// Inscription, connexion, déconnexion : accessibles sans être connecté (sauf /me, protégée dans auth.js)
app.use('/api/auth', authRouter)

// TOUTES les routes /api/words exigent d'être connecté (requireAuth passe avant) : sans session valide,
// le serveur répond 401 et n'exécute même pas la route.
app.use('/api/words', requireAuth, wordsRouter)

// La traduction à la demande consomme le quota DeepL : réservée aux utilisateurs connectés, elle aussi
app.use('/api/translate', requireAuth, translateRouter)

// Aucune route ne correspond : 404 en JSON
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' })
})

// Gestionnaire d'erreurs : le SEUL endroit qui décide quoi répondre quand quelque chose échoue.
// (Express 5 y envoie automatiquement les erreurs des routes `async`.)
// Attention : Express reconnaît un gestionnaire d'erreurs à ses 4 paramètres. Le 4e (_next) est inutilisé
// mais DOIT rester là, sinon Express ne le considérerait plus comme un gestionnaire d'erreurs.
app.use((error, req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message })
  }
  // JSON invalide envoyé par le client
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Le JSON envoyé est invalide.' })
  }
  // Erreur imprévue : on la garde pour nous (dans la console) et on ne montre AUCUN détail au client
  console.error(error)
  res.status(500).json({ error: 'Erreur du serveur.' })
})

export default app

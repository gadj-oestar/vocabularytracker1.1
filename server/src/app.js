// L'application Express : on y branche les "middlewares" et les routes.
import express from 'express'
import cors from 'cors'
import wordsRouter from './routes/words.js'
import { attachDevUser } from './devUser.js'
import { HttpError } from './utils/wordInput.js'

const app = express()

// CORS : par défaut, un navigateur interdit à une page (le front sur le port 5173) d'appeler
// une autre adresse (l'API sur le port 3001). Ici on autorise UNIQUEMENT l'adresse de notre front.
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))

// Lit le corps JSON des requêtes (req.body). La limite évite qu'on envoie un énorme message.
app.use(express.json({ limit: '100kb' }))

// Route de test : répond "ok" si le serveur tourne (utile pour vérifier rapidement).
app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

// Toutes les routes /api/words passent d'abord par attachDevUser (temporaire, voir devUser.js)
app.use('/api/words', attachDevUser, wordsRouter)

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

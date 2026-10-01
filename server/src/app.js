// L'application Express : on y branche les "middlewares" et les routes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import wordsRouter from './routes/words.js'
import authRouter from './routes/auth.js'
import translateRouter from './routes/translate.js'
import { requireAuth } from './middleware/requireAuth.js'
import { HttpError } from './utils/wordInput.js'

const app = express()

// "Production" = le vrai site en ligne (par opposition au développement sur votre PC).
// Les hébergeurs définissent NODE_ENV=production. Plusieurs réglages en dépendent.
const isProduction = process.env.NODE_ENV === 'production'

// En ligne, le serveur est derrière un "proxy" de l'hébergeur (un intermédiaire qui gère le HTTPS).
// Sans ce réglage, Express croirait que TOUS les visiteurs ont l'adresse IP de ce proxy : la limite de
// tentatives de connexion s'appliquerait alors à tout le monde à la fois, au lieu de chaque visiteur.
// "1" = on fait confiance à UN seul intermédiaire. Seulement en production : sur votre PC il n'y a pas de proxy,
// et faire confiance à cet en-tête permettrait à n'importe qui de falsifier son adresse IP.
if (isProduction) app.set('trust proxy', 1)

// En-têtes de sécurité (helmet). Le plus important est la "Content-Security-Policy" : une liste blanche de ce
// que la page a le droit de charger. Même si un attaquant arrivait à glisser du code dans la page, le navigateur
// refuserait de l'exécuter (script) ou d'envoyer des données ailleurs (connexion) hors de cette liste.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"], // par défaut : uniquement notre propre site
        scriptSrc: ["'self'"], // aucun script en ligne, aucun script d'un autre site
        styleSrc: ["'self'", 'https://fonts.googleapis.com'], // nos styles + la feuille de style Google Fonts
        fontSrc: ['https://fonts.gstatic.com'], // les fichiers de polices de Google Fonts
        imgSrc: ["'self'", 'data:'], // nos images (le petit logo est intégré au code en "data:")
        connectSrc: ["'self'"], // la page ne peut appeler que notre propre API
        objectSrc: ["'none'"], // pas de Flash, plugins, etc.
        frameAncestors: ["'none'"], // notre site ne peut pas être affiché dans l'iframe d'un autre (clickjacking)
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null, // l'hébergeur redirige déjà vers HTTPS ; cette ligne gênerait les essais en local
      },
    },
  }),
)

// CORS : par défaut, un navigateur interdit à une page (le front sur le port 5173) d'appeler
// une autre adresse (l'API sur le port 3001). Ici on autorise UNIQUEMENT l'adresse de notre front.
// `credentials: true` autorise le navigateur à envoyer le cookie de session avec ces requêtes.
// En production, le site et l'API sont sur le MÊME domaine : pas besoin de CORS, donc on ne l'active pas
// (aucun autre site ne peut appeler l'API depuis un navigateur), sauf si CLIENT_ORIGIN est défini exprès.
if (!isProduction || process.env.CLIENT_ORIGIN) {
  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', credentials: true }))
}

// Lit le corps JSON des requêtes (req.body). La limite évite qu'on envoie un énorme message.
// Seul le JSON est accepté : un formulaire venu d'un autre site ne pourrait donc pas envoyer de requête valide.
app.use(express.json({ limit: '100kb' }))

// Lit les cookies de la requête (req.cookies) : c'est là que se trouve le jeton de session
app.use(cookieParser())

// Route de test : répond "ok" si le serveur tourne (utile pour vérifier rapidement,
// et pour que l'hébergeur sache si le serveur est vivant).
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

// Toute adresse /api/... qui n'existe pas : 404 en JSON (et surtout pas la page du site, voir plus bas)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route introuvable.' })
})

// En production, le MÊME serveur envoie aussi le site (le dossier "dist" fabriqué par `npm run build`).
// Un seul programme à héberger, un seul domaine : le cookie de connexion reste "du même site",
// donc les navigateurs l'acceptent sans réglage particulier.
// FRONT_DIST permet d'indiquer un autre dossier (utilisé par les tests).
const frontDist = process.env.FRONT_DIST ?? fileURLToPath(new URL('../../dist', import.meta.url))
if (isProduction) {
  const indexFile = path.join(frontDist, 'index.html')
  if (fs.existsSync(indexFile)) {
    app.use(
      express.static(frontDist, {
        index: false, // "/" est géré plus bas, pour pouvoir régler son cache
        setHeaders(res, filePath) {
          // Les fichiers de "assets/" ont un nom qui change à chaque modification (empreinte dans le nom) :
          // le navigateur peut les garder un an. index.html, lui, doit toujours être redemandé,
          // sinon les visiteurs ne verraient jamais les nouvelles versions du site.
          const hashed = filePath.includes(`${path.sep}assets${path.sep}`)
          res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache')
        },
      }),
    )
    // Toute autre adresse (sauf /api) renvoie la page du site : c'est React qui affiche ensuite le bon écran.
    // Ainsi un rechargement de la page ou un lien direct ne donne pas une erreur 404.
    app.get(/^\/(?!api(\/|$)).*/, (req, res) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(indexFile)
    })
  } else {
    console.warn(`Production : ${indexFile} introuvable. Lancez "npm run build" : le site ne sera pas servi.`)
  }
}

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

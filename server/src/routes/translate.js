// Route de traduction à la demande :
//   POST /api/translate  { "text": "He held a grudge." }  ->  { "text": "Il gardait rancune.", "available": true }
// Elle sert au bouton "Traduire" du front, quand on tape ou modifie soi-même une phrase d'exemple
// (par exemple une phrase copiée depuis une bulle de manhwa).
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { translator } from '../services/translate.js'
import { HttpError } from '../utils/wordInput.js'

const router = Router()

// Chaque appel consomme le quota DeepL : même précaution que pour la recherche de mots.
// 30 traductions par minute et par adresse IP, très large pour un usage normal.
const translateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de traductions. Réessaie dans une minute.' },
})

// Taille maximale du texte à traduire. Elle protège le quota : sans limite, quelqu'un pourrait envoyer
// un texte énorme et vider les caractères gratuits en une seule requête.
const MAX_LENGTH = 500

router.post('/', translateLimiter, async (req, res) => {
  const text = req.body?.text
  if (typeof text !== 'string' || text.trim() === '') {
    throw new HttpError(400, 'Il n\'y a rien à traduire.')
  }
  if (text.length > MAX_LENGTH) {
    throw new HttpError(400, `Le texte est trop long (${MAX_LENGTH} caractères maximum).`)
  }

  // `available: false` n'est pas une erreur : clé absente, quota épuisé ou panne de DeepL.
  // Le front le dit à l'utilisateur ("saisis-la toi-même") au lieu d'afficher un message d'erreur.
  const { text: translated, available } = await translator.translate(text.trim())
  res.json({ text: translated, available })
})

export default router

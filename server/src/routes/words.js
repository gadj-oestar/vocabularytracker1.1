// Les routes de l'API pour les mots (CRUD = Create, Read, Update, Delete).
// Chaque route est une URL + une méthode HTTP :
//   GET    /api/words          -> lire tous les mots
//   POST   /api/words/lookup   -> chercher un mot (doublon ? sinon brouillon vide)
//   POST   /api/words          -> enregistrer un nouveau mot
//   PATCH  /api/words/:id      -> modifier un mot
//   DELETE /api/words/:id      -> supprimer un mot
import { Router } from 'express'
import { prisma } from '../db.js'
import { normalizeTerm } from '../utils/normalize.js'
import rateLimit from 'express-rate-limit'
import { dictionary } from '../services/dictionary.js'
import { translator } from '../services/translate.js'
import { HttpError, cleanTerm, cleanWordFields } from '../utils/wordInput.js'

const router = Router()

// Un identifiant de mot est un UUID. On vérifie son format pour répondre "introuvable"
// proprement plutôt que de laisser la base échouer sur un identifiant bizarre.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function checkId(id) {
  if (!UUID.test(id)) throw new HttpError(404, 'Mot introuvable.')
}

// GET /api/words : tous les mots de l'utilisateur, du plus récent au plus ancien (F8).
router.get('/', async (req, res) => {
  const words = await prisma.word.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  res.json(words)
})

// Limite de requêtes (règle de sécurité du cahier des charges) : chaque nouveau mot déclenche des appels
// à des services externes, dont DeepL qui a un quota. Sans limite, un script ou une boucle par erreur
// pourrait vider le quota en quelques secondes. Ici : 30 recherches par minute, très large pour un usage normal.
const lookupLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8', // indique au client combien de requêtes il lui reste
  legacyHeaders: false,
  message: { error: 'Trop de recherches. Réessaie dans une minute.' },
})

// POST /api/words/lookup  { "term": "give up" }
// L'équivalent de ce que fait le champ "Un mot t'a bloqué ?" dans le front.
router.post('/lookup', lookupLimiter, async (req, res) => {
  const term = cleanTerm(req.body?.term)
  const termNormalized = normalizeTerm(term)

  // RÈGLE n°3 : on regarde D'ABORD dans la base, avant tout appel à une API externe.
  const existing = await prisma.word.findUnique({
    // "userId_termNormalized" = le nom que Prisma donne à la contrainte d'unicité du schéma
    where: { userId_termNormalized: { userId: req.user.id, termNormalized } },
  })

  if (existing) {
    // Doublon : on augmente le compteur "vu X fois" (F6). `increment` est fait par la base
    // elle-même en une seule opération : pas de risque de se tromper si deux requêtes arrivent en même temps.
    const word = await prisma.word.update({
      where: { id: existing.id },
      data: { seenCount: { increment: 1 } },
    })
    return res.json({ status: 'known', word })
  }

  // Nouveau mot : on demande la définition (dictionnaires) ET la traduction (DeepL) EN MÊME TEMPS
  // (étape 4 du plan). Le navigateur n'appelle JAMAIS ces API lui-même : c'est le serveur qui le fait.
  const [{ info, available }, translation] = await Promise.all([
    dictionary.lookup(termNormalized),
    translator.translate(termNormalized),
  ])

  res.json({
    status: 'new',
    draft: {
      term,
      termNormalized,
      translation: translation.text, // proposition de DeepL : modifiable avant d'enregistrer
      partOfSpeech: info.partOfSpeech,
      phonetic: info.phonetic,
      definition: info.definition,
      example: info.example,
      sourceTitle: null,
      sourceChapter: null,
      sourceSentence: null,
    },
    // Ce qui n'a pas pu être obtenu : le front peut le dire à l'utilisateur ("à compléter toi-même").
    // RÈGLE "échec d'API" : ce n'est pas une erreur, le mot peut quand même être enregistré.
    unavailable: [
      ...(available ? [] : ['dictionary']),
      ...(translation.available ? [] : ['translation']),
    ],
  })
})

// POST /api/words : enregistre un nouveau mot (le bouton ENREGISTRER).
router.post('/', async (req, res) => {
  const body = req.body ?? {}
  const term = cleanTerm(body.term)
  const fields = cleanWordFields(body)

  try {
    const word = await prisma.word.create({
      data: {
        ...fields,
        term,
        termNormalized: normalizeTerm(term), // calculé par le serveur, jamais reçu du front
        userId: req.user.id,
      },
    })
    res.status(201).json(word)
  } catch (error) {
    // P2002 = "contrainte d'unicité violée" : ce mot existe déjà. La base a refusé le doublon (règle n°2).
    if (error.code === 'P2002') {
      throw new HttpError(409, 'Ce mot est déjà enregistré.')
    }
    throw error // toute autre erreur : on la laisse remonter au gestionnaire d'erreurs
  }
})

// PATCH /api/words/:id : modifie un mot. Le mot lui-même (term) n'est pas modifiable :
// c'est son identité dans le carnet (comme dans le front).
router.patch('/:id', async (req, res) => {
  checkId(req.params.id)
  const fields = cleanWordFields(req.body ?? {}, { partial: true })

  // On cherche avec le userId : impossible de modifier le mot de quelqu'un d'autre.
  const existing = await prisma.word.findFirst({ where: { id: req.params.id, userId: req.user.id } })
  if (!existing) throw new HttpError(404, 'Mot introuvable.')

  const word = await prisma.word.update({ where: { id: existing.id }, data: fields })
  res.json(word)
})

// DELETE /api/words/:id : supprime un mot.
router.delete('/:id', async (req, res) => {
  checkId(req.params.id)
  // deleteMany avec le userId : supprime seulement si le mot appartient bien à cet utilisateur
  const { count } = await prisma.word.deleteMany({ where: { id: req.params.id, userId: req.user.id } })
  if (count === 0) throw new HttpError(404, 'Mot introuvable.')
  res.status(204).end() // 204 = "fait, rien à renvoyer"
})

export default router

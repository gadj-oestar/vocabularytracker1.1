// Nettoie et vérifie ce que le front envoie. On ne fait JAMAIS confiance aux données reçues :
// n'importe qui peut envoyer n'importe quoi à l'API, pas seulement notre front.

// Transforme une valeur en texte propre (ou lève une erreur si ce n'est pas un texte).
function cleanText(value, field, maxLength) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new HttpError(400, `Le champ "${field}" doit être un texte.`)
  const text = value.trim()
  if (text.length > maxLength) throw new HttpError(400, `Le champ "${field}" est trop long (${maxLength} caractères maximum).`)
  return text
}

// Une erreur "attendue" avec son code HTTP (400 = requête invalide, 404 = introuvable, 409 = conflit...).
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Le mot saisi : obligatoire, 100 caractères maximum.
export function cleanTerm(value) {
  const term = cleanText(value, 'term', 100)
  if (term === '') throw new HttpError(400, 'Le mot ne peut pas être vide.')
  return term
}

// Le chapitre : un entier positif, ou vide (null). Le front envoie parfois "" ou "42" en texte.
function cleanChapter(value) {
  if (value === undefined || value === null || value === '') return null
  const chapter = Number(value)
  if (!Number.isInteger(chapter) || chapter < 0) {
    throw new HttpError(400, 'Le chapitre doit être un nombre entier.')
  }
  return chapter
}

// Les champs modifiables d'un mot. `partial` = true pour une modification (PATCH) :
// on ne garde alors que les champs réellement envoyés.
export function cleanWordFields(body, { partial = false } = {}) {
  const fields = {}
  const texts = {
    translation: 500,
    partOfSpeech: 50,
    phonetic: 100,
    definition: 1000,
    example: 1000,
  }
  for (const [field, max] of Object.entries(texts)) {
    if (!partial || body[field] !== undefined) fields[field] = cleanText(body[field], field, max)
  }
  // Champs optionnels : une chaîne vide devient null (= "pas renseigné")
  for (const [field, max] of [['sourceTitle', 200], ['sourceSentence', 1000]]) {
    if (!partial || body[field] !== undefined) fields[field] = cleanText(body[field], field, max) || null
  }
  if (!partial || body.sourceChapter !== undefined) fields.sourceChapter = cleanChapter(body.sourceChapter)
  return fields
}

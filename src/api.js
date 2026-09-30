// Tout ce que le front dit au serveur passe par CE fichier. Les composants n'appellent jamais
// `fetch` eux-mêmes : s'il faut changer l'adresse du serveur ou la gestion des erreurs, on le fait ici.

// Toutes les adresses commencent par /api. En développement, Vite relaie ces appels vers le serveur
// (voir vite.config.js) : le navigateur croit parler au même site, donc pas de souci de CORS.
const BASE = '/api'

// Une erreur "attendue" : elle porte un message lisible qu'on peut afficher tel quel à l'utilisateur.
export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status // 0 = on n'a pas pu joindre le serveur ; sinon le code HTTP (404, 409, 429...)
  }
}

// Envoie une requête au serveur et renvoie la réponse décodée.
async function request(method, path, body) {
  let response
  try {
    response = await fetch(BASE + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // fetch échoue (et ne renvoie pas de code HTTP) quand le serveur est éteint ou injoignable
    throw new ApiError(0, 'Impossible de joindre le serveur. Est-il démarré ?')
  }

  if (response.status === 204) return null // 204 = "fait, rien à renvoyer" (suppression)

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // Notre serveur répond TOUJOURS en JSON ({ error: "..." }). Une erreur sans JSON (ou 502/503/504)
    // vient donc d'un intermédiaire : c'est Vite, le proxy, qui répond "500" quand le serveur est éteint.
    // Pour l'utilisateur, c'est la même chose : on n'a pas pu joindre le serveur.
    if (data === null || [502, 503, 504].includes(response.status)) {
      throw new ApiError(0, 'Impossible de joindre le serveur. Est-il démarré ?')
    }
    // Le serveur met un message lisible dans { error: "..." } : on le reprend tel quel
    throw new ApiError(response.status, data?.error ?? 'Erreur du serveur.')
  }
  return data
}

// --- Conversion entre le format du serveur et celui du front ---------------------------------
// Le serveur utilise null pour "pas renseigné" et un NOMBRE pour le chapitre.
// Les champs de formulaire du front, eux, veulent toujours du TEXTE (une chaîne vide si rien).
// On convertit ici, une seule fois, à la frontière : le reste de l'appli ne voit que des textes.
export function fromApi(word) {
  return {
    ...word,
    sourceTitle: word.sourceTitle ?? '',
    sourceChapter: word.sourceChapter == null ? '' : String(word.sourceChapter),
    sourceSentence: word.sourceSentence ?? '',
  }
}

// Les champs qu'on envoie pour enregistrer ou modifier un mot. On n'envoie PAS l'identifiant,
// la date ni le mot normalisé : c'est le serveur qui décide de ces valeurs, jamais le front.
function toApi(word) {
  return {
    translation: word.translation,
    partOfSpeech: word.partOfSpeech,
    phonetic: word.phonetic,
    definition: word.definition,
    example: word.example,
    sourceTitle: word.sourceTitle,
    sourceChapter: word.sourceChapter,
    sourceSentence: word.sourceSentence,
  }
}

// --- Les actions disponibles ---------------------------------------------------------------

// Tous les mots du carnet (du plus récent au plus ancien)
export async function listWords() {
  const words = await request('GET', '/words')
  return words.map(fromApi)
}

// Cherche un mot : { status: 'known', word } s'il existe déjà, sinon { status: 'new', draft, unavailable }
export async function lookupWord(term) {
  const data = await request('POST', '/words/lookup', { term })
  return data.status === 'known'
    ? { status: 'known', word: fromApi(data.word) }
    : { status: 'new', draft: fromApi(data.draft), unavailable: data.unavailable }
}

// Enregistre un nouveau mot
export async function createWord(draft) {
  const word = await request('POST', '/words', { term: draft.term, ...toApi(draft) })
  return fromApi(word)
}

// Modifie un mot existant (le mot lui-même ne change jamais, seulement ses détails)
export async function updateWord(id, word) {
  const { translation, example, sourceTitle, sourceChapter } = toApi(word)
  const updated = await request('PATCH', `/words/${id}`, { translation, example, sourceTitle, sourceChapter })
  return fromApi(updated)
}

// Supprime un mot
export async function deleteWord(id) {
  await request('DELETE', `/words/${id}`)
}

// Service "dictionnaire" : va chercher la définition, la nature du mot, la phonétique et un exemple.
// Il est appelé UNIQUEMENT par le serveur (jamais par le navigateur) : règle du cahier des charges.
//
// Deux sources gratuites, sans clé :
//   - Free Dictionary API (celle du cahier des charges) : donne la phonétique. Elle est parfois en panne.
//   - Wiktionary : connaît aussi les expressions ("give up") et donne souvent un exemple.
// On les interroge en parallèle et on fusionne ce qu'elles trouvent.
// RÈGLE "échec d'API" : si une source échoue, on continue avec l'autre ; si les deux échouent,
// on renvoie des champs vides et le mot pourra quand même être enregistré.

// Wikimedia demande qu'un programme se présente clairement dans l'en-tête User-Agent
const USER_AGENT = 'vocabulary-tracker/0.1 (personal learning project; https://github.com/gadj-oestar/vocabularytracker1.1)'

// Les natures de mots en anglais -> en français (comme dans l'appli)
const PART_OF_SPEECH = {
  noun: 'nom',
  verb: 'verbe',
  adjective: 'adjectif',
  adverb: 'adverbe',
  pronoun: 'pronom',
  preposition: 'préposition',
  conjunction: 'conjonction',
  interjection: 'interjection',
  phrase: 'expression',
  idiom: 'expression',
  proverb: 'expression',
}

function toFrenchPartOfSpeech(value) {
  const key = String(value ?? '').trim().toLowerCase()
  return PART_OF_SPEECH[key] ?? key
}

// Wiktionary renvoie du HTML ("<a href=...>Careless</a> or <b>rash</b>"). On garde seulement le texte :
// on retire les balises et on décode les quelques caractères spéciaux (&amp; etc.).
export function cleanHtml(html) {
  return String(html ?? '')
    // D'abord les blocs <style> et <script> ENTIERS (balises + contenu) : Wiktionary y glisse du CSS,
    // et retirer seulement les balises laisserait ce code dans le texte.
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&') // en dernier, sinon "&amp;lt;" serait décodé deux fois
    .replace(/\s+/g, ' ')
    .trim()
}

// Une réponse "vide" : tous les champs sont là, mais sans contenu.
const emptyInfo = () => ({ partOfSpeech: '', phonetic: '', definition: '', example: '' })

// --- Source 1 : Free Dictionary API ---------------------------------------------------------
// Forme de la réponse : [ { phonetic, phonetics: [{text}], meanings: [{ partOfSpeech, definitions: [{definition, example}] }] } ]
export function parseFreeDictionary(json) {
  const info = emptyInfo()
  const entry = Array.isArray(json) ? json[0] : null
  if (!entry) return info

  info.phonetic = entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || ''
  const meaning = entry.meanings?.[0]
  info.partOfSpeech = toFrenchPartOfSpeech(meaning?.partOfSpeech)
  const firstDefinition = meaning?.definitions?.[0]
  info.definition = cleanHtml(firstDefinition?.definition)
  // Un exemple : le premier qu'on trouve dans n'importe quelle définition
  info.example = cleanHtml(meaning?.definitions?.find((d) => d.example)?.example)
  return info
}

// --- Source 2 : Wiktionary -------------------------------------------------------------------
// Forme de la réponse : { en: [ { partOfSpeech, definitions: [{ definition (HTML), examples: [...] }] } ] }
export function parseWiktionary(json) {
  const info = emptyInfo()
  const entry = json?.en?.[0]
  if (!entry) return info

  info.partOfSpeech = toFrenchPartOfSpeech(entry.partOfSpeech)
  // La première définition qui a vraiment du texte (certaines ne contiennent que des étiquettes)
  const definitions = entry.definitions ?? []
  info.definition = definitions.map((d) => cleanHtml(d.definition)).find((text) => text !== '') ?? ''
  info.example = cleanHtml(definitions.flatMap((d) => d.examples ?? [])[0])
  return info
}

// Fusionne les résultats : pour chaque champ, on prend la première source qui l'a rempli.
// L'ordre compte : la première liste gagne (ici Wiktionary pour le texte, Free Dictionary pour la phonétique).
export function mergeInfo(...infos) {
  const merged = emptyInfo()
  for (const field of Object.keys(merged)) {
    merged[field] = infos.map((info) => info?.[field]).find((value) => value) ?? ''
  }
  return merged
}

// Le client : on le fabrique avec une fonction (createDictionaryClient) pour pouvoir, dans les tests,
// remplacer `fetch` par un faux et ne jamais dépendre d'internet.
export function createDictionaryClient({
  fetchImpl = (...args) => globalThis.fetch(...args),
  timeoutMs = 3000, // au-delà, on abandonne cette source (un site lent ne doit pas bloquer l'appli)
  cooldownMs = 60_000, // après un échec, on laisse la source tranquille pendant 1 minute
  now = Date.now,
} = {}) {
  // Disjoncteur ("circuit breaker") : date jusqu'à laquelle une source est mise de côté après un échec.
  // Sans ça, si une API est en panne, chaque nouveau mot attendrait 3 secondes pour rien.
  const pausedUntil = new Map()

  async function fetchSource(name, url, parse) {
    if ((pausedUntil.get(name) ?? 0) > now()) return null // en pause : on ne tente même pas

    try {
      const response = await fetchImpl(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (response.status === 404) return emptyInfo() // "mot inconnu" : ce n'est pas une panne
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return parse(await response.json())
    } catch (error) {
      pausedUntil.set(name, now() + cooldownMs) // panne ou lenteur : on met la source en pause
      console.warn(`Dictionnaire "${name}" indisponible : ${error.message}`)
      return null
    }
  }

  // Renvoie { info, available } : info = les champs fusionnés, available = false si AUCUNE source n'a répondu.
  async function lookup(term) {
    const word = encodeURIComponent(term) // protège l'adresse : "give up" -> "give%20up"
    // Promise.all : les deux sources sont interrogées en même temps, pas l'une après l'autre
    const [freeDictionary, wiktionary] = await Promise.all([
      fetchSource('freedictionary', `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, parseFreeDictionary),
      fetchSource('wiktionary', `https://en.wiktionary.org/api/rest_v1/page/definition/${word}`, parseWiktionary),
    ])
    return {
      info: mergeInfo(wiktionary, freeDictionary),
      available: freeDictionary !== null || wiktionary !== null,
    }
  }

  return { lookup }
}

// Le client utilisé par l'application
export const dictionary = createDictionaryClient()

// Service "traduction" : traduit un mot ou une expression de l'anglais vers le français avec DeepL.
//
// SÉCURITÉ : la clé DeepL est un secret. Elle reste dans le fichier .env du SERVEUR (DEEPL_API_KEY).
// Elle n'est jamais envoyée au navigateur, jamais écrite dans le code, jamais affichée dans les journaux.
// C'est la raison principale d'avoir un back-end : le front appelle notre serveur, qui appelle DeepL.
//
// RÈGLE "échec d'API" : si la clé manque, si DeepL est en panne ou si le quota est épuisé,
// on renvoie une traduction vide. Le mot peut quand même être enregistré, à compléter soi-même.

// Fabrique le service. Les paramètres servent aux tests (faux fetch, fausse clé, fausse horloge).
export function createTranslator({
  fetchImpl = (...args) => globalThis.fetch(...args),
  getApiKey = () => process.env.DEEPL_API_KEY, // lue à chaque appel : on peut changer le .env et redémarrer
  timeoutMs = 5000,
  cooldownMs = 60_000,
  now = Date.now,
} = {}) {
  let pausedUntil = 0 // disjoncteur : après un échec, on laisse DeepL tranquille un moment

  // Renvoie { text, available } : available = false si on n'a pas pu obtenir de traduction.
  async function translate(term) {
    const apiKey = (getApiKey() ?? '').trim()
    if (apiKey === '') return { text: '', available: false } // pas de clé configurée : rien à faire
    if (pausedUntil > now()) return { text: '', available: false }

    // Les clés du plan gratuit finissent par ":fx" et utilisent une autre adresse que les clés payantes
    const host = apiKey.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com'

    try {
      const response = await fetchImpl(`https://${host}/v2/translate`, {
        method: 'POST',
        headers: {
          // La clé part UNIQUEMENT dans cet en-tête, vers DeepL
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: [term], source_lang: 'EN', target_lang: 'FR' }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      // Codes utiles : 403 = clé refusée, 429 = trop de requêtes, 456 = quota épuisé
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      const text = String(data?.translations?.[0]?.text ?? '').trim().slice(0, 500)
      return { text, available: text !== '' }
    } catch (error) {
      pausedUntil = now() + cooldownMs
      // On n'écrit que le message d'erreur : JAMAIS la clé ni la requête complète
      console.warn(`Traduction DeepL indisponible : ${error.message}`)
      return { text: '', available: false }
    }
  }

  return { translate }
}

// Le service utilisé par l'application
export const translator = createTranslator()

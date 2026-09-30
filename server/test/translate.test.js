// Tests du service de traduction DeepL, avec un FAUX DeepL : aucun appel réel, aucun quota consommé,
// et la clé utilisée ici est inventée.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTranslator } from '../src/services/translate.js'

// Faux fetch : enregistre la requête reçue et répond ce qu'on lui demande
function fakeDeepL(reply, sent = []) {
  return async (url, options) => {
    sent.push({ url: String(url), options })
    if (reply instanceof Error) throw reply
    return { ok: reply.status < 400, status: reply.status, json: async () => reply.body }
  }
}

test('sans clé : aucune requête envoyée, traduction indisponible', async () => {
  const sent = []
  const t = createTranslator({ fetchImpl: fakeDeepL({ status: 200, body: {} }, sent), getApiKey: () => undefined })
  assert.deepEqual(await t.translate('reckless'), { text: '', available: false })
  assert.equal(sent.length, 0) // rien n'est parti sur internet
})

test('clé gratuite (:fx) : bonne adresse, clé dans l\'en-tête, corps correct', async () => {
  const sent = []
  const t = createTranslator({
    fetchImpl: fakeDeepL({ status: 200, body: { translations: [{ text: ' imprudent ' }] } }, sent),
    getApiKey: () => 'cle-inventee:fx',
  })
  assert.deepEqual(await t.translate('reckless'), { text: 'imprudent', available: true })

  const { url, options } = sent[0]
  assert.equal(url, 'https://api-free.deepl.com/v2/translate')
  assert.equal(options.method, 'POST')
  assert.equal(options.headers.Authorization, 'DeepL-Auth-Key cle-inventee:fx')
  assert.deepEqual(JSON.parse(options.body), { text: ['reckless'], source_lang: 'EN', target_lang: 'FR' })
})

test('clé payante (sans :fx) : adresse api.deepl.com', async () => {
  const sent = []
  const t = createTranslator({
    fetchImpl: fakeDeepL({ status: 200, body: { translations: [{ text: 'x' }] } }, sent),
    getApiKey: () => 'cle-payante',
  })
  await t.translate('a')
  assert.equal(sent[0].url, 'https://api.deepl.com/v2/translate')
})

test('panne, clé refusée (403), quota épuisé (456) : jamais d\'exception', async () => {
  for (const reply of [{ status: 403, body: {} }, { status: 456, body: {} }, { status: 500, body: {} }, new Error('réseau coupé')]) {
    const t = createTranslator({ fetchImpl: fakeDeepL(reply), getApiKey: () => 'k:fx' })
    assert.deepEqual(await t.translate('reckless'), { text: '', available: false })
  }
})

test('réponse inattendue de DeepL : traduction vide, pas de plantage', async () => {
  const t = createTranslator({ fetchImpl: fakeDeepL({ status: 200, body: { autre: 1 } }), getApiKey: () => 'k:fx' })
  assert.deepEqual(await t.translate('reckless'), { text: '', available: false })
})

test('la clé n\'apparaît JAMAIS dans les journaux', async () => {
  const logs = []
  const original = console.warn
  console.warn = (...args) => logs.push(args.join(' '))
  try {
    const t = createTranslator({ fetchImpl: fakeDeepL({ status: 403, body: {} }), getApiKey: () => 'SECRET-123:fx' })
    await t.translate('reckless')
  } finally {
    console.warn = original
  }
  assert.ok(logs.length > 0) // un message a bien été écrit...
  assert.ok(logs.every((line) => !line.includes('SECRET-123'))) // ...mais sans la clé
})

test('disjoncteur : après un échec, DeepL est laissé tranquille 1 minute', async () => {
  const sent = []
  let time = 0
  const t = createTranslator({
    fetchImpl: fakeDeepL({ status: 456, body: {} }, sent), // quota épuisé
    getApiKey: () => 'k:fx',
    now: () => time,
    cooldownMs: 60_000,
  })
  await t.translate('a')
  time = 30_000
  await t.translate('b') // en pause : aucun appel
  assert.equal(sent.length, 1)
  time = 61_000
  await t.translate('c') // on retente
  assert.equal(sent.length, 2)
})

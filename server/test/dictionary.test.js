// Tests du service dictionnaire. Aucun test n'appelle internet : on remplace `fetch` par un faux,
// donc les tests sont rapides et ne dépendent pas d'une API qui peut être en panne.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cleanHtml,
  parseFreeDictionary,
  parseWiktionary,
  mergeInfo,
  createDictionaryClient,
} from '../src/services/dictionary.js'

// Des réponses copiées de vraies API (raccourcies)
const freeDictionarySample = [
  {
    word: 'reckless',
    phonetic: '/ˈrek.ləs/',
    meanings: [
      { partOfSpeech: 'adjective', definitions: [{ definition: 'Acting without thinking.', example: 'It was reckless.' }] },
    ],
  },
]
const wiktionarySample = {
  en: [
    {
      partOfSpeech: 'Verb',
      definitions: [
        { definition: '<span class="usage-label-sense"></span>' }, // définition vide : à ignorer
        {
          definition: 'To <a href="/wiki/surrender">surrender</a> &amp; <b>stop</b>.',
          examples: ['He <b>gave</b> himself <b>up</b>.'],
        },
      ],
    },
  ],
}

// Fabrique un faux `fetch` : `routes` associe un morceau d'adresse à une réponse (ou une panne)
function fakeFetch(routes, calls = []) {
  return async (url) => {
    calls.push(String(url))
    const key = Object.keys(routes).find((k) => String(url).includes(k))
    const route = routes[key]
    if (route instanceof Error) throw route
    return { ok: route.status < 400, status: route.status, json: async () => route.body }
  }
}

test('cleanHtml : retire les balises et décode les caractères spéciaux', () => {
  assert.equal(cleanHtml('To <a href="x">surrender</a> &amp; <b>stop</b>.'), 'To surrender & stop.')
  assert.equal(cleanHtml('  a &lt;b&gt;   c &#39;d&#39; '), "a <b> c 'd'")
  assert.equal(cleanHtml('&amp;lt;'), '&lt;') // pas décodé deux fois
  assert.equal(cleanHtml(undefined), '')
})

test('cleanHtml : supprime les blocs <style> et <script> avec leur contenu', () => {
  // Cas réel vu pour "no way" : du CSS collé dans la définition
  const html = 'In no way. <style data-mw-deduplicate="x">.mw-parser-output .defdate{font-size:smaller}</style>'
  assert.equal(cleanHtml(html), 'In no way.')
  assert.equal(cleanHtml('ok<script>alert(1)</script>!'), 'ok!')
})

test('parseFreeDictionary : nature en français, phonétique, définition, exemple', () => {
  assert.deepEqual(parseFreeDictionary(freeDictionarySample), {
    partOfSpeech: 'adjectif',
    phonetic: '/ˈrek.ləs/',
    definition: 'Acting without thinking.',
    example: 'It was reckless.',
  })
  assert.deepEqual(parseFreeDictionary({ title: 'No Definitions Found' }).definition, '') // mot inconnu
})

test('parseWiktionary : ignore les définitions vides, nettoie le HTML', () => {
  const info = parseWiktionary(wiktionarySample)
  assert.equal(info.partOfSpeech, 'verbe')
  assert.equal(info.definition, 'To surrender & stop.')
  assert.equal(info.example, 'He gave himself up.')
  assert.equal(parseWiktionary({}).definition, '')
})

test('mergeInfo : la première source qui a une valeur gagne, champ par champ', () => {
  const merged = mergeInfo(parseWiktionary(wiktionarySample), parseFreeDictionary(freeDictionarySample))
  assert.equal(merged.definition, 'To surrender & stop.') // vient de Wiktionary
  assert.equal(merged.phonetic, '/ˈrek.ləs/') // Wiktionary n'en a pas : vient de Free Dictionary
})

test('les deux sources répondent : résultat fusionné', async () => {
  const client = createDictionaryClient({
    fetchImpl: fakeFetch({
      'dictionaryapi.dev': { status: 200, body: freeDictionarySample },
      'wiktionary.org': { status: 200, body: wiktionarySample },
    }),
  })
  const { info, available } = await client.lookup('give up')
  assert.equal(available, true)
  assert.equal(info.definition, 'To surrender & stop.')
  assert.equal(info.phonetic, '/ˈrek.ləs/')
})

test('une source en panne : on continue avec l\'autre (règle "échec d\'API")', async () => {
  const client = createDictionaryClient({
    fetchImpl: fakeFetch({
      'dictionaryapi.dev': { status: 522, body: {} }, // la panne vue en vrai
      'wiktionary.org': { status: 200, body: wiktionarySample },
    }),
  })
  const { info, available } = await client.lookup('give up')
  assert.equal(available, true)
  assert.equal(info.partOfSpeech, 'verbe')
})

test('les deux sources en panne : champs vides, available = false, aucune exception', async () => {
  const client = createDictionaryClient({
    fetchImpl: fakeFetch({
      'dictionaryapi.dev': new Error('réseau coupé'),
      'wiktionary.org': { status: 500, body: {} },
    }),
  })
  const { info, available } = await client.lookup('reckless')
  assert.equal(available, false)
  assert.deepEqual(info, { partOfSpeech: '', phonetic: '', definition: '', example: '' })
})

test('mot inconnu (404) : pas une panne, available = true', async () => {
  const client = createDictionaryClient({
    fetchImpl: fakeFetch({
      'dictionaryapi.dev': { status: 404, body: {} },
      'wiktionary.org': { status: 404, body: {} },
    }),
  })
  assert.equal((await client.lookup('zzzqxv')).available, true)
})

test('disjoncteur : une source en panne est mise de côté 1 minute, puis retentée', async () => {
  const calls = []
  let time = 0
  const client = createDictionaryClient({
    fetchImpl: fakeFetch({ 'dictionaryapi.dev': { status: 522, body: {} }, 'wiktionary.org': { status: 200, body: wiktionarySample } }, calls),
    now: () => time,
    cooldownMs: 60_000,
  })
  const count = (host) => calls.filter((u) => u.includes(host)).length

  await client.lookup('a')
  assert.equal(count('dictionaryapi.dev'), 1)
  time = 30_000 // 30 s plus tard : encore en pause, on ne l'appelle pas
  await client.lookup('b')
  assert.equal(count('dictionaryapi.dev'), 1)
  assert.equal(count('wiktionary.org'), 2) // l'autre source, elle, est toujours interrogée
  time = 61_000 // la minute est passée : on retente
  await client.lookup('c')
  assert.equal(count('dictionaryapi.dev'), 2)
})

test('le mot est encodé dans l\'adresse (pas d\'injection possible)', async () => {
  const calls = []
  const client = createDictionaryClient({
    fetchImpl: fakeFetch({ 'dictionaryapi.dev': { status: 404, body: {} }, 'wiktionary.org': { status: 404, body: {} } }, calls),
  })
  await client.lookup('a/../b?x=1 #y')
  assert.ok(calls.every((u) => u.endsWith('a%2F..%2Fb%3Fx%3D1%20%23y')))
})

// Test "de bout en bout" de l'API : il démarre le vrai serveur et parle à la vraie base PostgreSQL.
// Il crée ses propres mots de test et les supprime à la fin (ils commencent par "zz-test").
// Lancer avec : npm test (la base doit être démarrée et le fichier .env rempli).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { rawCall, registerTestUser } from '../testing/helpers.js'

let server
let base // l'adresse du serveur de test, ex. http://localhost:54321
let cookie // la session de l'utilisateur de test (les routes des mots exigent d'être connecté)
const TERM = `zz-test ${Date.now()}` // un mot unique à chaque lancement

// Petite aide : envoie une requête JSON AVEC la session de l'utilisateur de test
const call = (method, path, body) => rawCall(base, method, path, body, cookie)

const realFetch = globalThis.fetch

// Une clé DeepL INVENTÉE pour le test : DeepL est intercepté plus bas, rien ne part sur internet
// et le vrai quota (si une vraie clé est dans .env) n'est jamais consommé.
process.env.DEEPL_API_KEY = 'cle-de-test:fx'

before(async () => {
  // Les appels vers les API de dictionnaire sont interceptés : le test ne dépend pas d'internet
  // (et ne risque pas d'échouer si une API est en panne). Tout le reste passe normalement.
  globalThis.fetch = (url, options) => {
    const address = String(url)
    if (address.includes('dictionaryapi.dev')) {
      return Promise.resolve(Response.json({ title: 'No Definitions Found' }, { status: 404 }))
    }
    if (address.includes('wiktionary.org')) {
      return Promise.resolve(
        Response.json({
          en: [{ partOfSpeech: 'Noun', definitions: [{ definition: '<b>A test</b> &amp; more.', examples: ['An <b>example</b>.'] }] }],
        }),
      )
    }
    if (address.includes('deepl.com')) {
      // Le faux DeepL répond selon le texte reçu : on peut ainsi vérifier QUE l'exemple est traduit
      // (et pas seulement le mot), et que le serveur envoie bien le bon texte.
      const sent = JSON.parse(options.body).text[0]
      const replies = { 'An example.': 'Un exemple.', 'Hello there.': 'Bonjour.' }
      return Promise.resolve(Response.json({ translations: [{ text: replies[sent] ?? 'mot de test' }] }))
    }
    return realFetch(url, options)
  }

  // port 0 = "choisis un port libre" : le test ne gêne pas le vrai serveur
  server = app.listen(0)
  base = `http://localhost:${server.address().port}`

  // On crée un compte de test et on garde sa session : tous les appels suivants sont "connectés"
  cookie = (await registerTestUser(base, 'api')).cookie
})

after(async () => {
  globalThis.fetch = realFetch // on remet le vrai fetch
  // Ménage : on supprime les comptes de test (leurs mots partent avec, en cascade), puis on ferme serveur et connexion
  await prisma.user.deleteMany({ where: { email: { startsWith: 'zz-test-' } } })
  server.close()
  await prisma.$disconnect()
})

test('cycle complet : chercher, créer, doublon, modifier, supprimer', async () => {
  // 1. Un mot inconnu : le serveur renvoie un brouillon vide
  let r = await call('POST', '/api/words/lookup', { term: `  ${TERM.toUpperCase()} ` })
  assert.equal(r.status, 200)
  assert.equal(r.body.status, 'new')
  assert.equal(r.body.draft.termNormalized, TERM) // normalisé par le serveur
  // Le brouillon est pré-rempli par le dictionnaire (ici simulé), HTML nettoyé et nature en français
  assert.equal(r.body.draft.partOfSpeech, 'nom')
  assert.equal(r.body.draft.definition, 'A test & more.')
  assert.equal(r.body.draft.example, 'An example.')
  assert.equal(r.body.draft.translation, 'mot de test') // proposition de DeepL (simulé)
  assert.equal(r.body.draft.exampleTranslation, 'Un exemple.') // l'exemple "An example." est traduit aussi
  assert.deepEqual(r.body.unavailable, [])

  // 2. On l'enregistre (le front envoie "42" en texte : le serveur en fait un nombre)
  r = await call('POST', '/api/words', {
    term: TERM,
    translation: 'essai',
    example: 'A test.',
    exampleTranslation: 'Un test.',
    sourceTitle: 'Solo Leveling',
    sourceChapter: '42',
  })
  assert.equal(r.status, 201)
  assert.equal(r.body.seenCount, 1)
  assert.equal(r.body.sourceChapter, 42)
  assert.equal(r.body.exampleTranslation, 'Un test.') // la traduction de l'exemple est bien enregistrée
  const id = r.body.id

  // 3. RÈGLE n°2 : la base refuse le doublon, même avec une casse et des espaces différents
  r = await call('POST', '/api/words', { term: `  ${TERM.toUpperCase()}  ` })
  assert.equal(r.status, 409)

  // 4. Chercher à nouveau le mot : il est reconnu et le compteur monte (F6)
  r = await call('POST', '/api/words/lookup', { term: TERM })
  assert.equal(r.body.status, 'known')
  assert.equal(r.body.word.seenCount, 2)

  // 5. Il apparaît dans la liste
  r = await call('GET', '/api/words')
  assert.equal(r.status, 200)
  assert.ok(r.body.some((w) => w.id === id))

  // 6. On le modifie : seuls les champs envoyés changent, le mot lui-même ne change pas
  r = await call('PATCH', `/api/words/${id}`, { translation: 'test modifié', term: 'IGNORÉ' })
  assert.equal(r.status, 200)
  assert.equal(r.body.translation, 'test modifié')
  assert.equal(r.body.example, 'A test.') // inchangé
  assert.equal(r.body.exampleTranslation, 'Un test.') // inchangée aussi (champ non envoyé)
  assert.equal(r.body.term, TERM) // le mot n'est pas modifiable

  // 6 bis. On modifie la traduction de l'exemple
  r = await call('PATCH', `/api/words/${id}`, { exampleTranslation: 'Un essai.' })
  assert.equal(r.body.exampleTranslation, 'Un essai.')
  assert.equal(r.body.translation, 'test modifié') // le reste n'a pas bougé

  // 7. On le supprime, puis il est introuvable
  r = await call('DELETE', `/api/words/${id}`)
  assert.equal(r.status, 204)
  r = await call('DELETE', `/api/words/${id}`)
  assert.equal(r.status, 404)
  r = await call('PATCH', `/api/words/${id}`, { translation: 'x' })
  assert.equal(r.status, 404)
})

test('données invalides : erreurs claires (400/404), jamais de plantage', async () => {
  assert.equal((await call('POST', '/api/words/lookup', { term: '   ' })).status, 400)
  assert.equal((await call('POST', '/api/words/lookup', {})).status, 400)
  assert.equal((await call('POST', '/api/words', { term: 'zz-test x', sourceChapter: 'abc' })).status, 400)
  assert.equal((await call('POST', '/api/words', { term: 'zz-test x', translation: 123 })).status, 400)
  assert.equal((await call('DELETE', '/api/words/pas-un-uuid')).status, 404)
  assert.equal((await call('PATCH', '/api/words/pas-un-uuid', {})).status, 404)
})

test('isolation : chaque utilisateur ne voit et ne touche que SES mots', async () => {
  const shared = `${TERM} iso` // le même mot sera enregistré par les deux utilisateurs
  const created = await call('POST', '/api/words', { term: shared, translation: 'mot de A' })
  assert.equal(created.status, 201)
  const idOfA = created.body.id

  // Un second utilisateur, B, avec sa propre session
  const b = await registerTestUser(base, 'b')
  const asB = (method, path, body) => rawCall(base, method, path, body, b.cookie)

  // B ne voit pas le mot de A dans sa liste...
  const list = await asB('GET', '/api/words')
  assert.equal(list.status, 200)
  assert.ok(!list.body.some((w) => w.id === idOfA))
  // ...pour lui ce mot est NOUVEAU (et le compteur de A ne bouge pas)...
  assert.equal((await asB('POST', '/api/words/lookup', { term: shared })).body.status, 'new')
  // ...il ne peut ni le modifier ni le supprimer : le serveur répond "introuvable", comme s'il n'existait pas
  assert.equal((await asB('PATCH', `/api/words/${idOfA}`, { translation: 'piraté' })).status, 404)
  assert.equal((await asB('DELETE', `/api/words/${idOfA}`)).status, 404)
  // ...et il peut enregistrer le MÊME mot : l'unicité est par utilisateur, pas globale
  assert.equal((await asB('POST', '/api/words', { term: shared, translation: 'mot de B' })).status, 201)

  // Le mot de A est intact
  const mine = (await call('GET', '/api/words')).body.find((w) => w.id === idOfA)
  assert.equal(mine.translation, 'mot de A')
  assert.equal(mine.seenCount, 1)
})

test('traduction à la demande : /api/translate traduit, valide, et protège le quota', async () => {
  // Traduction normale : le bon texte part chez DeepL, la réponse revient nettoyée
  let r = await call('POST', '/api/translate', { text: '  Hello there.  ' })
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { text: 'Bonjour.', available: true })

  // Données invalides : refusées AVANT d'appeler DeepL (donc sans consommer de quota)
  assert.equal((await call('POST', '/api/translate', {})).status, 400)
  assert.equal((await call('POST', '/api/translate', { text: '   ' })).status, 400)
  assert.equal((await call('POST', '/api/translate', { text: 42 })).status, 400)
  assert.equal((await call('POST', '/api/translate', { text: ['a'] })).status, 400)
  r = await call('POST', '/api/translate', { text: 'a'.repeat(501) })
  assert.equal(r.status, 400)
  assert.match(r.body.error, /trop long/)

  // Sans clé DeepL : ce n'est pas une erreur, la réponse dit simplement "indisponible"
  const key = process.env.DEEPL_API_KEY
  delete process.env.DEEPL_API_KEY
  try {
    r = await call('POST', '/api/translate', { text: 'Hello there.' })
    assert.equal(r.status, 200)
    assert.deepEqual(r.body, { text: '', available: false })
    // Et la recherche d'un mot nouveau le signale aussi, sans planter
    r = await call('POST', '/api/words/lookup', { term: `${TERM} sans cle` })
    assert.equal(r.status, 200)
    assert.equal(r.body.draft.translation, '')
    assert.equal(r.body.draft.exampleTranslation, '')
    assert.deepEqual(r.body.unavailable, ['translation'])
  } finally {
    process.env.DEEPL_API_KEY = key
  }

  // Réservée aux utilisateurs connectés (elle consomme le quota)
  assert.equal((await rawCall(base, 'POST', '/api/translate', { text: 'Hello' })).status, 401)
  assert.equal((await rawCall(base, 'POST', '/api/translate', { text: 'Hello' }, 'token=bidon')).status, 401)
})

test('sans session valide : toutes les routes des mots répondent 401', async () => {
  const requests = [
    ['GET', '/api/words'],
    ['POST', '/api/words/lookup', { term: 'x' }],
    ['POST', '/api/words', { term: 'x' }],
    ['PATCH', '/api/words/00000000-0000-4000-8000-000000000000', {}],
    ['DELETE', '/api/words/00000000-0000-4000-8000-000000000000'],
  ]
  for (const [method, path, body] of requests) {
    assert.equal((await rawCall(base, method, path, body)).status, 401, `${method} ${path} sans cookie`)
    assert.equal((await rawCall(base, method, path, body, 'token=pas.un.vrai.jeton')).status, 401, `${method} ${path} jeton bidon`)
  }
})

// Ce test doit rester le DERNIER : il épuise volontairement la limite de recherches (30 par minute),
// ce qui gênerait les tests suivants.
test('limite de requêtes : trop de recherches d\'affilée -> 429', async () => {
  let tooMany = 0
  for (let i = 0; i < 40; i++) {
    const r = await call('POST', '/api/words/lookup', { term: 'zz-test limite' })
    if (r.status === 429) {
      tooMany++
      assert.match(r.body.error, /Trop de recherches/)
    }
  }
  assert.ok(tooMany > 0, 'la limite aurait dû se déclencher')
  // Les autres routes ne sont pas concernées par la limite
  assert.equal((await call('GET', '/api/words')).status, 200)
})

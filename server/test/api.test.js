// Test "de bout en bout" de l'API : il démarre le vrai serveur et parle à la vraie base PostgreSQL.
// Il crée ses propres mots de test et les supprime à la fin (ils commencent par "zz-test").
// Lancer avec : npm test (la base doit être démarrée et le fichier .env rempli).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import app from '../src/app.js'
import { prisma } from '../src/db.js'

let server
let base // l'adresse du serveur de test, ex. http://localhost:54321
const TERM = `zz-test ${Date.now()}` // un mot unique à chaque lancement

// Petite aide : envoie une requête JSON et renvoie { status, body }
async function call(method, path, body) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}

const realFetch = globalThis.fetch

before(() => {
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
    return realFetch(url, options)
  }

  // port 0 = "choisis un port libre" : le test ne gêne pas le vrai serveur
  server = app.listen(0)
  base = `http://localhost:${server.address().port}`
})

after(async () => {
  globalThis.fetch = realFetch // on remet le vrai fetch
  // Ménage : on supprime tous les mots de test, puis on ferme serveur et connexion
  await prisma.word.deleteMany({ where: { termNormalized: { startsWith: 'zz-test' } } })
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
  assert.deepEqual(r.body.unavailable, [])

  // 2. On l'enregistre (le front envoie "42" en texte : le serveur en fait un nombre)
  r = await call('POST', '/api/words', {
    term: TERM,
    translation: 'essai',
    example: 'A test.',
    sourceTitle: 'Solo Leveling',
    sourceChapter: '42',
  })
  assert.equal(r.status, 201)
  assert.equal(r.body.seenCount, 1)
  assert.equal(r.body.sourceChapter, 42)
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
  assert.equal(r.body.term, TERM) // le mot n'est pas modifiable

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

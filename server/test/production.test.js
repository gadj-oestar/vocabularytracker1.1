// Tests du serveur en mode PRODUCTION (le vrai site en ligne) : service du site, en-têtes de sécurité, CORS.
// Aucune base de données n'est utilisée ici. Le site est un faux dossier "dist" créé le temps du test.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

let app
let server
let base
let dist

before(async () => {
  // Un faux site compilé : une page d'accueil et un fichier "avec empreinte" dans assets/
  dist = fs.mkdtempSync(path.join(os.tmpdir(), 'vocab-dist-'))
  fs.mkdirSync(path.join(dist, 'assets'))
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Vocab! Tracker</title><div id="root"></div>')
  fs.writeFileSync(path.join(dist, 'assets', 'index-abc123.js'), 'console.log("site")')
  fs.writeFileSync(path.join(dist, 'robots.txt'), 'User-agent: *')

  // Ces réglages doivent exister AVANT l'import de app.js : il les lit une seule fois, à son chargement.
  process.env.NODE_ENV = 'production'
  process.env.FRONT_DIST = dist
  // CLIENT_ORIGIN vide (et non supprimée) : app.js charge le fichier .env, qui pourrait la redéfinir ;
  // or dotenv ne remplace jamais une variable déjà définie, même vide. C'est le cas de la production
  // sur l'hébergeur : on n'y définit pas CLIENT_ORIGIN.
  process.env.CLIENT_ORIGIN = ''
  app = (await import('../src/app.js')).default

  server = app.listen(0)
  base = `http://localhost:${server.address().port}`
})

after(async () => {
  server.close()
  fs.rmSync(dist, { recursive: true, force: true })
  const { prisma } = await import('../src/db.js')
  await prisma.$disconnect()
})

test('la page du site est servie, sans cache (pour voir les nouvelles versions tout de suite)', async () => {
  const r = await fetch(base + '/')
  assert.equal(r.status, 200)
  assert.match(r.headers.get('content-type'), /text\/html/)
  assert.match(await r.text(), /Vocab! Tracker/)
  assert.equal(r.headers.get('cache-control'), 'no-cache')
})

test('un lien direct ou un rechargement (/mes-mots) renvoie le site, pas une erreur 404', async () => {
  for (const route of ['/mes-mots', '/une/adresse/inconnue', '/index.html']) {
    const r = await fetch(base + route)
    assert.equal(r.status, 200, route)
    assert.match(await r.text(), /id="root"/, route)
  }
})

test('les fichiers à empreinte sont gardés un an par le navigateur, les autres non', async () => {
  const hashed = await fetch(base + '/assets/index-abc123.js')
  assert.equal(hashed.status, 200)
  assert.equal(hashed.headers.get('cache-control'), 'public, max-age=31536000, immutable')
  const other = await fetch(base + '/robots.txt')
  assert.equal(other.headers.get('cache-control'), 'no-cache')
})

test('une adresse /api inexistante répond 404 en JSON (et surtout pas la page du site)', async () => {
  for (const route of ['/api/nimporte-quoi', '/api']) {
    const r = await fetch(base + route)
    assert.equal(r.status, 404, route)
    assert.match(r.headers.get('content-type'), /application\/json/)
    assert.deepEqual(await r.json(), { error: 'Route introuvable.' })
  }
  const health = await fetch(base + '/api/health')
  assert.deepEqual(await health.json(), { ok: true })
})

test('on ne peut pas sortir du dossier du site (accès aux autres fichiers du serveur)', async () => {
  for (const attack of ['/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/package.json', '/assets/..%2f..%2f..%2fpackage.json']) {
    const r = await fetch(base + attack)
    const body = await r.text()
    assert.ok(!body.includes('vocabulary-tracker-server'), `fuite de package.json avec ${attack}`)
  }
})

test('en-têtes de sécurité : politique stricte, pas de script externe, pas de signature "Express"', async () => {
  const r = await fetch(base + '/')
  const csp = r.headers.get('content-security-policy')
  assert.ok(csp, 'Content-Security-Policy absente')
  assert.match(csp, /default-src 'self'/)
  assert.match(csp, /script-src 'self'(;|$)/) // aucun script externe, aucun script en ligne
  assert.ok(!/script-src[^;]*unsafe-inline/.test(csp), 'script-src ne doit pas autoriser unsafe-inline')
  assert.ok(!/unsafe-eval/.test(csp))
  assert.match(csp, /frame-ancestors 'none'/) // impossible d'afficher le site dans l'iframe d'un autre
  assert.match(csp, /object-src 'none'/)
  assert.match(csp, /connect-src 'self'/) // la page ne peut parler qu'à notre propre API
  assert.match(csp, /font-src https:\/\/fonts\.gstatic\.com/) // autorisé : les polices du site
  assert.match(csp, /style-src 'self' https:\/\/fonts\.googleapis\.com/)
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(r.headers.get('x-powered-by'), null)
  assert.match(r.headers.get('strict-transport-security') ?? '', /max-age=/) // "toujours en HTTPS"
})

test('CORS fermé en production : aucun autre site ne peut appeler l\'API depuis un navigateur', async () => {
  const r = await fetch(base + '/api/health', { headers: { Origin: 'https://un-autre-site.example' } })
  assert.equal(r.headers.get('access-control-allow-origin'), null)
  const preflight = await fetch(base + '/api/words', {
    method: 'OPTIONS',
    headers: { Origin: 'https://un-autre-site.example', 'Access-Control-Request-Method': 'POST' },
  })
  assert.equal(preflight.headers.get('access-control-allow-origin'), null)
})

test('derrière le proxy de l\'hébergeur : on lui fait confiance pour l\'adresse IP des visiteurs', async () => {
  // Réglé à 1 = UN intermédiaire (celui de l'hébergeur). Sans ça, tous les visiteurs auraient la même
  // adresse IP aux yeux du serveur, et la limite de tentatives de connexion les viserait tous ensemble.
  assert.equal(app.get('trust proxy'), 1)
  const r = await fetch(base + '/api/auth/config', { headers: { 'X-Forwarded-For': '203.0.113.7' } })
  assert.equal(r.status, 200)
})

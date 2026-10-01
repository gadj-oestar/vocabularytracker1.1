// Tests de l'authentification : inscription, connexion, déconnexion, sécurité des sessions.
// Ils démarrent le vrai serveur et utilisent la vraie base ; les comptes de test ("zz-test-…") sont supprimés à la fin.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'
import { prisma } from '../src/db.js'
import { hashPassword, verifyPassword } from '../src/auth/password.js'
import { readToken, signToken } from '../src/auth/token.js'
import { cleanEmail, cleanPassword } from '../src/utils/authInput.js'
import { HttpError } from '../src/utils/wordInput.js'
import { TEST_PASSWORD, rawCall, testEmail } from '../testing/helpers.js'

let server
let base
const call = (method, path, body, cookie) => rawCall(base, method, path, body, cookie)

before(() => {
  server = app.listen(0)
  base = `http://localhost:${server.address().port}`
})

after(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: 'zz-test-' } } })
  server.close()
  await prisma.$disconnect()
})

// --- Fonctions sans base de données -----------------------------------------------------------

test('cleanEmail : minuscules, espaces retirés, format vérifié', () => {
  assert.equal(cleanEmail('  Gad@Mail.COM '), 'gad@mail.com')
  for (const bad of ['', 'pas-un-email', 'a@b', 'a b@c.d', '@c.d', undefined, 42, 'x'.repeat(250) + '@a.bc']) {
    assert.throws(() => cleanEmail(bad), (e) => e instanceof HttpError && e.status === 400, String(bad))
  }
})

test('cleanPassword : 8 caractères minimum, 72 octets maximum, espaces conservés', () => {
  assert.equal(cleanPassword('  huit car  '), '  huit car  ') // pas de trim : les espaces comptent
  assert.throws(() => cleanPassword('1234567'), HttpError)
  assert.throws(() => cleanPassword('a'.repeat(73)), HttpError)
  assert.equal(cleanPassword('a'.repeat(72)).length, 72)
  assert.throws(() => cleanPassword('é'.repeat(37)), HttpError) // 37 × 2 octets = 74 octets : refusé
  assert.throws(() => cleanPassword(undefined), HttpError)
})

test('mot de passe : haché (jamais en clair), vérifiable, sel aléatoire', async () => {
  const hash = await hashPassword('Secret-123')
  assert.notEqual(hash, 'Secret-123')
  assert.match(hash, /^\$2[aby]\$12\$/) // format bcrypt, coût 12
  assert.equal(await verifyPassword('Secret-123', hash), true)
  assert.equal(await verifyPassword('secret-123', hash), false)
  assert.notEqual(await hashPassword('Secret-123'), hash) // le sel rend chaque hash différent
  assert.equal(await verifyPassword('Secret-123', null), false) // e-mail inconnu : toujours "non"
})

test('jeton : valide, falsifié, expiré, mauvais algorithme -> seul le premier passe', () => {
  const secret = process.env.JWT_SECRET
  assert.equal(readToken(signToken('user-1')), 'user-1')
  assert.equal(readToken('nimporte.quoi'), null)
  assert.equal(readToken(undefined), null)
  // signé avec un AUTRE secret : refusé
  assert.equal(readToken(jwt.sign({}, 'un-autre-secret-de-plus-de-32-caracteres!', { subject: 'user-1' })), null)
  // expiré
  assert.equal(readToken(jwt.sign({}, secret, { subject: 'user-1', expiresIn: -10 })), null)
  // attaque "alg: none" (jeton non signé) : refusé
  const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from('{"sub":"user-1"}').toString('base64url') + '.'
  assert.equal(readToken(none), null)
  // signé avec un autre algorithme : refusé (on impose HS256)
  assert.equal(readToken(jwt.sign({}, secret, { subject: 'user-1', algorithm: 'HS512' })), null)
})

// --- Parcours complet avec la vraie base --------------------------------------------------------

test('inscription : crée le compte, connecte, cookie sécurisé, jamais de mot de passe dans la réponse', async () => {
  const email = testEmail('reg')
  const r = await call('POST', '/api/auth/register', { email: `  ${email.toUpperCase()} `, password: TEST_PASSWORD })
  assert.equal(r.status, 201)
  assert.equal(r.body.user.email, email) // e-mail normalisé
  assert.deepEqual(Object.keys(r.body.user).sort(), ['email', 'id']) // RIEN d'autre (pas de passwordHash)
  assert.ok(!JSON.stringify(r.body).includes(TEST_PASSWORD))

  // Le cookie de session : invisible du JavaScript (HttpOnly), protégé contre le CSRF (SameSite=Lax)
  const cookieLine = r.setCookies.find((c) => c.startsWith('token='))
  assert.match(cookieLine, /HttpOnly/i)
  assert.match(cookieLine, /SameSite=Lax/i)
  assert.match(cookieLine, /Path=\//)
  assert.match(cookieLine, /Max-Age=2592000/) // 30 jours

  // En base : le mot de passe est haché
  const row = await prisma.user.findUnique({ where: { email } })
  assert.notEqual(row.passwordHash, TEST_PASSWORD)
  assert.match(row.passwordHash, /^\$2[aby]\$/)

  // La session fonctionne tout de suite
  const me = await call('GET', '/api/auth/me', undefined, r.cookie)
  assert.equal(me.status, 200)
  assert.equal(me.body.user.email, email)
})

test('inscription refusée : e-mail déjà pris (409), e-mail invalide, mot de passe trop court (400)', async () => {
  const email = testEmail('dup')
  assert.equal((await call('POST', '/api/auth/register', { email, password: TEST_PASSWORD })).status, 201)
  // Même e-mail avec une autre casse : c'est le même compte
  const dup = await call('POST', '/api/auth/register', { email: email.toUpperCase(), password: TEST_PASSWORD })
  assert.equal(dup.status, 409)
  assert.equal(dup.cookie, undefined) // pas de session accordée

  assert.equal((await call('POST', '/api/auth/register', { email: 'pas-un-email', password: TEST_PASSWORD })).status, 400)
  assert.equal((await call('POST', '/api/auth/register', { email: testEmail('court'), password: '1234567' })).status, 400)
  assert.equal((await call('POST', '/api/auth/register', {})).status, 400)
})

test('connexion : bon mot de passe -> session ; mauvais mot de passe ou e-mail inconnu -> même message 401', async () => {
  const email = testEmail('login')
  await call('POST', '/api/auth/register', { email, password: TEST_PASSWORD })

  const ok = await call('POST', '/api/auth/login', { email: email.toUpperCase(), password: TEST_PASSWORD })
  assert.equal(ok.status, 200)
  assert.ok(ok.cookie)
  assert.equal((await call('GET', '/api/auth/me', undefined, ok.cookie)).status, 200)

  const wrongPassword = await call('POST', '/api/auth/login', { email, password: 'pas-le-bon-mot-de-passe' })
  const unknownEmail = await call('POST', '/api/auth/login', { email: testEmail('inconnu'), password: TEST_PASSWORD })
  assert.equal(wrongPassword.status, 401)
  assert.equal(unknownEmail.status, 401)
  // Le MÊME message dans les deux cas : on ne révèle pas quels e-mails ont un compte
  assert.equal(wrongPassword.body.error, unknownEmail.body.error)
  assert.equal(wrongPassword.cookie, undefined)
  // Un mot de passe absent ou d'un mauvais type ne plante pas
  assert.equal((await call('POST', '/api/auth/login', { email })).status, 401)
  assert.equal((await call('POST', '/api/auth/login', { email, password: 12345678 })).status, 401)
})

test('/me sans session, avec un jeton bidon ou d\'un compte supprimé -> 401', async () => {
  assert.equal((await call('GET', '/api/auth/me')).status, 401)
  assert.equal((await call('GET', '/api/auth/me', undefined, 'token=abc.def.ghi')).status, 401)

  const email = testEmail('supprime')
  const r = await call('POST', '/api/auth/register', { email, password: TEST_PASSWORD })
  await prisma.user.delete({ where: { email } }) // le compte disparaît, mais son jeton est encore "valide"
  assert.equal((await call('GET', '/api/auth/me', undefined, r.cookie)).status, 401)
})

test('déconnexion : le cookie est effacé', async () => {
  const r = await call('POST', '/api/auth/logout')
  assert.equal(r.status, 204)
  const cleared = r.setCookies.find((c) => c.startsWith('token='))
  assert.match(cleared, /token=;/) // valeur vide...
  assert.match(cleared, /Expires=Thu, 01 Jan 1970/) // ...et date d'expiration dans le passé
})

test('JSON invalide ou données absurdes : erreurs propres, pas de plantage', async () => {
  const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{pas du json' })
  assert.equal(response.status, 400)
  assert.equal((await call('POST', '/api/auth/login', { email: { $ne: null }, password: { $ne: null } })).status, 400) // injection de type NoSQL
  assert.equal((await call('POST', '/api/auth/register', { email: ['a@b.cd'], password: TEST_PASSWORD })).status, 400)
})

test('inscriptions fermées (ALLOW_REGISTRATION=false) : /config le dit, créer un compte est refusé, se connecter marche', async () => {
  // Un compte créé AVANT la fermeture, pour vérifier que la connexion continue de fonctionner
  const email = testEmail('ferme')
  assert.equal((await call('POST', '/api/auth/register', { email, password: TEST_PASSWORD })).status, 201)
  assert.deepEqual((await call('GET', '/api/auth/config')).body, { registrationOpen: true }) // ouvertes par défaut

  const previous = process.env.ALLOW_REGISTRATION
  process.env.ALLOW_REGISTRATION = 'false'
  try {
    assert.deepEqual((await call('GET', '/api/auth/config')).body, { registrationOpen: false })
    const refused = await call('POST', '/api/auth/register', { email: testEmail('refuse'), password: TEST_PASSWORD })
    assert.equal(refused.status, 403)
    assert.equal(refused.body.error, 'Les inscriptions sont fermées.')
    assert.equal(refused.cookie, undefined) // aucune session accordée
    // Aucun compte n'a été créé en cachette
    assert.equal(await prisma.user.count({ where: { email: { contains: '-refuse@' } } }), 0)
    // Les comptes existants se connectent normalement
    assert.equal((await call('POST', '/api/auth/login', { email, password: TEST_PASSWORD })).status, 200)
  } finally {
    if (previous === undefined) delete process.env.ALLOW_REGISTRATION
    else process.env.ALLOW_REGISTRATION = previous
  }
  assert.deepEqual((await call('GET', '/api/auth/config')).body, { registrationOpen: true }) // réouvertes
})

// DERNIER test : il épuise volontairement la limite de tentatives de connexion (10 échecs par 15 minutes)
test('brute force : trop d\'échecs de connexion -> 429, mais une connexion réussie reste possible avant', async () => {
  const email = testEmail('brute')
  await call('POST', '/api/auth/register', { email, password: TEST_PASSWORD })

  let blocked = 0
  for (let i = 0; i < 15; i++) {
    const r = await call('POST', '/api/auth/login', { email, password: `mauvais-${i}-mot-de-passe` })
    if (r.status === 429) {
      blocked++
      assert.match(r.body.error, /Trop de tentatives/)
    }
  }
  assert.ok(blocked > 0, 'la limite aurait dû se déclencher')
})

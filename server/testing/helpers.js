// Aides partagées par les tests qui parlent au vrai serveur.
// Ce fichier est hors du dossier test/ : node --test lance tout fichier de test/, et ce n'est pas un test.

// Les tests ont besoin d'un secret de session, même sans fichier .env (par exemple sur un autre ordinateur).
process.env.JWT_SECRET ??= 'secret-de-test-uniquement-0123456789abcdef'

export const TEST_PASSWORD = 'mot-de-passe-de-test-123'

// Un e-mail unique pour chaque test. Le préfixe "zz-test-" sert à tout nettoyer à la fin :
// supprimer un utilisateur supprime aussi ses mots (suppression en cascade dans la base).
let counter = 0
export function testEmail(label = 'user') {
  return `zz-test-${Date.now()}-${++counter}-${label}@example.test`
}

// Envoie une requête JSON au serveur de test.
// `cookie` = le cookie de session à joindre (comme le ferait le navigateur), ex. "token=abc".
// Renvoie { status, body, cookie (le cookie de session reçu, s'il y en a un), setCookies (les en-têtes bruts) }.
export async function rawCall(base, method, path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' }
  if (cookie) headers.Cookie = cookie
  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  const setCookies = response.headers.getSetCookie()
  const session = setCookies.find((line) => line.startsWith('token='))
  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    setCookies,
    cookie: session ? session.split(';')[0] : undefined, // "token=xxx" sans les réglages (httpOnly...)
  }
}

// Crée un compte de test et renvoie son cookie de session
export async function registerTestUser(base, label) {
  const email = testEmail(label)
  const r = await rawCall(base, 'POST', '/api/auth/register', { email, password: TEST_PASSWORD })
  if (r.status !== 201) throw new Error(`Inscription de test impossible : ${r.status} ${JSON.stringify(r.body)}`)
  return { email, cookie: r.cookie, user: r.body.user }
}

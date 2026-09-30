// Mots de passe : on ne stocke JAMAIS un mot de passe en clair, seulement son "haché" (hash).
// Un hash est une empreinte à sens unique : on peut vérifier qu'un mot de passe correspond,
// mais on ne peut pas retrouver le mot de passe à partir de l'empreinte. Même quelqu'un qui volerait
// la base de données ne verrait pas les mots de passe.
import bcrypt from 'bcryptjs'

// Le "coût" de bcrypt : chaque +1 double le temps de calcul (environ 250 ms à 12). C'est voulu :
// c'est imperceptible pour un utilisateur, mais ça ralentit énormément quelqu'un qui tenterait
// des millions de mots de passe. bcrypt ajoute aussi un "sel" aléatoire : deux mêmes mots de passe
// donnent deux hashs différents.
const COST = 12

// Un faux hash, calculé une fois au démarrage. Il sert à verifyPassword quand l'e-mail n'existe pas.
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', COST)

export function hashPassword(password) {
  return bcrypt.hash(password, COST)
}

// Vérifie un mot de passe. `hash` vaut null quand l'e-mail n'existe pas : on fait alors QUAND MÊME
// le calcul (contre le faux hash) avant de répondre "non". Sinon, répondre plus vite quand l'e-mail
// n'existe pas permettrait de deviner quels e-mails ont un compte en chronométrant les réponses.
export async function verifyPassword(password, hash) {
  const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH)
  return hash != null && matches
}

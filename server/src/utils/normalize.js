// Règle de gestion du cahier des charges : "Give  Up " et "give up" sont le MÊME mot.
// Même logique que dans le front (src/utils/normalize.js) : le back est l'autorité finale,
// c'est lui qui calcule la version normalisée stockée en base.
export function normalizeTerm(term) {
  return term
    .toLowerCase() // tout en minuscules
    .replace(/[‘’]/g, "'") // apostrophes typographiques -> apostrophe simple
    .trim() // espaces retirés au début et à la fin
    .replace(/\s+/g, ' ') // espaces multiples -> un seul espace
}

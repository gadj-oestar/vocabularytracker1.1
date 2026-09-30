// Règle de gestion du cahier des charges : "Give  Up " et "give up" sont le MÊME mot.
// On compare toujours les mots sous cette forme "propre", jamais tels que saisis.
export function normalizeTerm(term) {
  return term
    .toLowerCase() // tout en minuscules
    .replace(/[‘’]/g, "'") // apostrophes typographiques -> apostrophe simple
    .trim() // espaces retirés au début et à la fin
    .replace(/\s+/g, ' ') // espaces multiples -> un seul espace
}

import { normalizeTerm } from './normalize'

// Enlève les accents pour que "tetu" trouve "têtu" (recherche plus tolérante).
function removeAccents(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Les 3 façons de trier la liste. Chaque fonction compare deux mots (a et b) :
// un nombre négatif veut dire "a passe avant b".
const sorters = {
  // Récents : la date la plus récente d'abord
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  // Les plus vus : compteur décroissant, puis le plus récent en cas d'égalité
  seen: (a, b) => b.seenCount - a.seenCount || b.createdAt.localeCompare(a.createdAt),
  // A-Z : ordre alphabétique du mot anglais
  az: (a, b) => a.termNormalized.localeCompare(b.termNormalized),
}

// Garde les mots qui contiennent `query` (en anglais OU en français), puis les trie.
// Fonction "pure" : elle ne modifie pas la liste d'origine, elle en renvoie une nouvelle.
export function filterAndSort(words, query, sort) {
  const q = removeAccents(normalizeTerm(query))

  const filtered = words.filter((word) => {
    if (q === '') return true // champ vide : on garde tout
    const haystack = removeAccents(`${word.termNormalized} ${normalizeTerm(word.translation)}`)
    return haystack.includes(q)
  })

  // [...filtered] fait une copie : .sort() modifie le tableau sur lequel on l'appelle
  return [...filtered].sort(sorters[sort])
}

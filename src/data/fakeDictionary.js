// Faux dictionnaire EN DUR : il remplace pour l'instant les API DeepL et Free Dictionary.
// Plus tard (étape 4 du plan), ces données viendront du back-end.
// La clé est le mot NORMALISÉ (minuscules, sans espaces en trop).
export const fakeDictionary = {
  reckless: {
    translation: 'imprudent, téméraire',
    partOfSpeech: 'adjectif',
    phonetic: '/ˈrek.ləs/',
    example: 'It was reckless to fight him alone.',
  },
  'give up': {
    translation: 'abandonner',
    partOfSpeech: 'verbe',
    phonetic: '/ɡɪv ʌp/',
    example: "I won't give up now.",
  },
  grudge: {
    translation: 'rancune',
    partOfSpeech: 'nom',
    phonetic: '/ɡrʌdʒ/',
    example: 'He held a grudge against the king.',
  },
  'no way': {
    translation: "pas question / c'est pas vrai",
    partOfSpeech: 'expression',
    phonetic: '/noʊ weɪ/',
    example: 'No way, that is impossible!',
  },
  relentless: {
    translation: 'implacable, acharné',
    partOfSpeech: 'adjectif',
    phonetic: '/rɪˈlent.ləs/',
    example: 'The relentless hunter never stopped.',
  },
}

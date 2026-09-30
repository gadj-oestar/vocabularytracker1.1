// Tests automatiques des fonctions sans base de données. Lancer avec : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTerm } from '../src/utils/normalize.js'
import { HttpError, cleanTerm, cleanWordFields } from '../src/utils/wordInput.js'

test('normalizeTerm : minuscules, espaces nettoyés, apostrophes simples', () => {
  assert.equal(normalizeTerm('Give  Up '), 'give up')
  assert.equal(normalizeTerm('  RECKLESS'), 'reckless')
  assert.equal(normalizeTerm('don’t'), "don't")
})

test('cleanTerm : refuse un mot vide ou trop long', () => {
  assert.equal(cleanTerm('  grudge '), 'grudge')
  assert.throws(() => cleanTerm('   '), (e) => e instanceof HttpError && e.status === 400)
  assert.throws(() => cleanTerm(undefined), HttpError)
  assert.throws(() => cleanTerm('a'.repeat(101)), HttpError)
  assert.throws(() => cleanTerm(42), HttpError)
})

test('cleanWordFields : chapitre en nombre, champs vides en null', () => {
  const f = cleanWordFields({ translation: ' rancune ', sourceTitle: '', sourceChapter: '42' })
  assert.equal(f.translation, 'rancune')
  assert.equal(f.sourceTitle, null)
  assert.equal(f.sourceChapter, 42)
  assert.equal(cleanWordFields({ sourceChapter: '' }).sourceChapter, null)
  assert.throws(() => cleanWordFields({ sourceChapter: 'abc' }), HttpError)
  assert.throws(() => cleanWordFields({ sourceChapter: -3 }), HttpError)
})

test('cleanWordFields en mode partiel : ne garde que les champs envoyés', () => {
  const f = cleanWordFields({ example: 'Hello' }, { partial: true })
  assert.deepEqual(f, { example: 'Hello' })
})

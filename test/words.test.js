const assert = require('assert');
const W = require('../js/words.js');
const words = W.seed([]);
assert.ok(words.length >= 60, 'starter list has the common words');
let t = W.translate('Top and pants', words);
assert.strictEqual(t.es, 'Blusa y pantalones'); assert.deepStrictEqual(t.missing, []);
t = W.translate('Blue linen set', words);
assert.strictEqual(t.es, 'Azul lino conjunto', 'word by word (the owner fixes the order)'); assert.deepStrictEqual(t.missing, []);
t = W.translate('Red velvet dress', words);
assert.strictEqual(t.es, 'Rojo velvet vestido'); assert.deepStrictEqual(t.missing, ['velvet'], 'unknown words stay as typed and are listed');
// phrases win over single words
const w2 = W.put(words, 'blue linen set', 'conjunto de lino azul');
assert.strictEqual(W.translate('Blue linen set', w2).es, 'Conjunto de lino azul');
assert.strictEqual(W.translate('blue linen set, size M', w2).es, 'Conjunto de lino azul, size m'.replace('size m', 'size M'), 'a longer phrase still matches when punctuation follows');
// numbers and codes pass through and are never "missing"
t = W.translate('Black dress 2pc', words); assert.deepStrictEqual(t.missing, []); assert.strictEqual(t.es, 'Negro vestido 2pc');
// ampersand and case
assert.strictEqual(W.translate('TOP & PANTS', words).es, 'Blusa y pantalones');
// item status
const it = { desc: 'Top and pants' };
assert.strictEqual(W.spanish(it, words).state, 'ok'); assert.strictEqual(W.publishable(it, words), 'Blusa y pantalones');
assert.strictEqual(W.spanish({ desc: 'Red velvet dress' }, words).state, 'check'); assert.strictEqual(W.publishable({ desc: 'Red velvet dress' }, words), '', 'not published while a word is missing');
assert.strictEqual(W.spanish({ desc: '' }, words).state, 'none');
const own = { desc: 'Red velvet dress', nameEs: 'Vestido rojo de terciopelo', esSet: true, esFor: 'Red velvet dress' };
assert.strictEqual(W.spanish(own, words).state, 'ok'); assert.strictEqual(W.publishable(own, words), 'Vestido rojo de terciopelo', 'a confirmed name is published');
own.desc = 'Red velvet skirt'; assert.strictEqual(W.spanish(own, words).state, 'check', 'a confirmed name goes stale when the description changes');
// adding words updates the result for items that were not confirmed
const w3 = W.put(words, 'velvet', 'terciopelo'); assert.strictEqual(W.spanish({ desc: 'Red velvet dress' }, w3).state, 'ok');
assert.strictEqual(W.drop(w3, 'Velvet').length, words.length, 'delete a word');
assert.strictEqual(W.seed(w3).length, w3.length, 'seeding twice adds nothing');
assert.strictEqual(W.seed([{ en: 'top', es: 'polera' }]).find((x) => x.en === 'top').es, 'polera', 'the owner\'s own version is never overwritten');
console.log('words tests passed');

/* Guards the rule "everything has English and Spanish": run by `npm test`, and the deploy only happens if it passes. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { LANGS, t, tn, setLang } = require('../js/i18n.js');
const EN = LANGS.en, ES = LANGS.es;
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const problems = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); };

// 1. same keys in both languages, none empty
Object.keys(EN).forEach((k) => check(k in ES, `missing Spanish text for "${k}"`));
Object.keys(ES).forEach((k) => check(k in EN, `missing English text for "${k}"`));
Object.entries(LANGS).forEach(([l, d]) => Object.entries(d).forEach(([k, v]) => check(typeof v === 'string' && v.trim() !== '', `${l}: "${k}" is empty`)));

// 2. same {placeholders} and, for csv lists, the same number of columns
const holders = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
Object.keys(EN).filter((k) => k in ES).forEach((k) => {
  check(holders(EN[k]) === holders(ES[k]), `"${k}": placeholders differ (${holders(EN[k])} vs ${holders(ES[k])})`);
  if (k.startsWith('csv.')) check(EN[k].split('|').length === ES[k].split('|').length, `"${k}": different number of columns`);
});

// 3. plurals come in pairs
Object.keys(EN).forEach((k) => {
  if (k.endsWith('.one')) check((k.slice(0, -4) + '.other') in EN, `"${k}" has no .other`);
  if (k.endsWith('.other')) check((k.slice(0, -6) + '.one') in EN, `"${k}" has no .one`);
});

// 4. every key the code asks for exists (static t('key') calls, plural tn('key'), and the dynamic prefixes)
const code = ['js/app.js', 'index.html'].map(read).join('\n');
const used = new Set();
for (const m of code.matchAll(/\b(?:t|ti|I18n\.t)\(\s*'([\w.]+)'/g)) used.add(m[1]);
for (const m of code.matchAll(/\btn\(\s*'([\w.]+)'/g)) { used.add(m[1] + '.one'); used.add(m[1] + '.other'); }
for (const m of code.matchAll(/'((?:status|invstatus|nav|err|csv|title)\.)'\s*\+/g)) Object.keys(EN).filter((k) => k.startsWith(m[1])).forEach((k) => used.add(k));
for (const m of code.matchAll(/t\('((?:csv|nav)\.)'/g)) Object.keys(EN).filter((k) => k.startsWith(m[1])).forEach((k) => used.add(k));
// a call like t('status.' + x) builds its key at run time: the prefixes handled above cover those
[...used].filter((k) => !k.endsWith('.')).forEach((k) => check(k in EN, `the code uses "${k}" but it is not in the dictionary`));
for (const m of code.matchAll(/'([A-Za-z]+\.[A-Za-z0-9.]+)'/g)) if (m[1] in EN) used.add(m[1]);   // keys referenced by name (e.g. in a lookup table)

// 5. every error code thrown by the logic has a translation
const logic = read('js/logic.js');
for (const m of logic.matchAll(/(?:fail\(|errors\.push\()\s*'(\w+)'/g)) check(('err.' + m[1]) in EN, `logic error "${m[1]}" has no err.${m[1]} text`);
for (const code_ of ['notBackup', 'notWorkbook', 'sheetjs', 'save']) check(('err.' + code_) in EN, `err.${code_} missing`);

// 6. lookup behaves: variables, plurals, fallback to English
setLang('es');
assert.strictEqual(t('home.soldOf', { sold: 2, count: 5 }), '2/5 vendidos');
assert.strictEqual(tn('home.itemsOwing', 1), '1 artículo pendiente');
assert.strictEqual(tn('home.itemsOwing', 3), '3 artículos pendientes');
assert.strictEqual(t('nav.sell', null, 'en'), 'Sell');
assert.strictEqual(t('no.such.key'), 'no.such.key');
setLang('en');
assert.strictEqual(tn('home.itemsOwing', 1), '1 item owing');

// unused keys are only a warning (dictionary hygiene)
const unused = Object.keys(EN).filter((k) => !used.has(k));
if (unused.length) console.log('note: not referenced by the code (fine if used dynamically):', unused.join(', '));

if (problems.length) { console.error('\nLanguage problems:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log(`i18n ok: ${Object.keys(EN).length} texts in English and Spanish`);

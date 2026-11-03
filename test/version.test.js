/* The Rules version shown in Settings > About must match the header of firestore.rules (1.00, 1.01 ...). */
const assert = require('assert'), fs = require('fs'), path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const app = read('js/app.js'), rules = read('firestore.rules');
const inApp = (app.match(/RULES_VERSION = '(\d+\.\d\d)'/) || [])[1], inRules = (rules.match(/Firestore rules (\d+\.\d\d)/) || [])[1];
assert(inApp && inRules, 'could not find the rules version in js/app.js or firestore.rules');
assert.strictEqual(inApp, inRules, `About says rules ${inApp} but firestore.rules says ${inRules}`);
assert(/APP_VERSION = '\d+\.\d\d'/.test(app), 'APP_VERSION missing');
console.log(`version ok: app ${(app.match(/APP_VERSION = '([\d.]+)'/) || [])[1]}, rules ${inRules}`);

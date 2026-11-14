const assert = require('assert'); const P = require('../js/people.js'); const L = require('../js/logic.js');
// phone numbers: every way of typing the same Trinidad number is one number
['3923773', '392 3773', '868 392 3773', '(868) 392-3773', '1 868 392 3773', '+1 868 392 3773', '18683923773'].forEach((n) => assert.strictEqual(P.key(n), 'tt3923773', n));
assert.strictEqual(P.fmt('3923773'), '868 392 3773'); assert.ok(P.same('392-3773', '+1 868 392 3773')); assert.ok(!P.same('392 3773', '392 3774'));
assert.strictEqual(P.key('+44 20 7946 0958'), 'x442079460958'); assert.ok(!P.same('+44 20 7946 3773', '3923773')); assert.ok(!P.same('+1 212 555 3773', '392 3773'));   // a foreign number only matches itself
assert.ok(P.valid('392 3773') && P.valid('+44 20 7946 0958') && !P.valid('0000000') && !P.valid('111 1111') && !P.valid('12345') && !P.valid(''));

// a small state: two invoices, two customers
const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 4, currency: 'USD', totalCost: 40, margin: 100 }); L.makeAvailable(s, s.batches[0].id);
s.items.forEach((i, n) => { i.desc = 'Dress ' + n; i.price = 100; });
const i1 = L.createInvoice(s, { itemIds: [s.items[0].id], client: 'John', isNew: true, paying: 100 }), i2 = L.createInvoice(s, { itemIds: [s.items[1].id], client: 'Monica', isNew: true, paying: 40 });
assert.ok(P.ensure(s)); assert.ok(!P.ensure(s)); assert.strictEqual(P.list(s).length, 2);
let john = P.byKey(s, 'John'), mon = P.byKey(s, 'Monica');
assert.strictEqual(P.missingNumber(s).length, 2);
assert.ok(P.setNumber(s, john.id, '868 392 3773', 'me').ok); assert.ok(P.setNumber(s, mon.id, '311 0042').ok);
assert.strictEqual(P.setNumber(s, mon.id, '0000000').error, 'invalid');
assert.ok(P.setNumber(s, mon.id, '3923773').conflict);   // that number is John's

// order cases
let c = P.classify(s, { name: 'john', phone: '3923773' }); assert.strictEqual(c.kind, 'match');
c = P.classify(s, { name: 'Moni', phone: '1-868-392-3773' }); assert.strictEqual(c.kind, 'newName');
P.opSame(s, john.id, { name: 'Moni', phone: '3923773' }); assert.deepStrictEqual(john.nicks, ['Moni']); assert.strictEqual(P.classify(s, { name: 'moni', phone: '3923773' }).kind, 'match');   // a nickname never asks again
c = P.classify(s, { name: 'John', phone: '455 1290' }); assert.strictEqual(c.kind, 'newNumber');
c = P.classify(s, { name: 'Moni', phone: '455 1290' }); assert.strictEqual(c.kind, 'newNumber');   // the nickname with another number is asked about too
const r = P.opNewCustomer(s, { name: 'John', phone: '455 1290' }); assert.strictEqual(r.profile.key, 'John · 1290'); assert.strictEqual(P.label(s, 'John', ''), 'John · 3773'); assert.strictEqual(P.label(s, 'John · 1290', ''), 'John · 1290');   // two Johns tell apart
// same person, new number: the old number is kept
P.opNewNumberSame(s, mon.id, { name: 'Monica', phone: '311 9000' }); assert.strictEqual(mon.phone, '868 311 9000'); assert.strictEqual(mon.prev.length, 1); assert.strictEqual(mon.prev[0].phone, '868 311 0042');
// the old number is used again
c = P.classify(s, { name: 'Monica', phone: '311 0042' }); assert.strictEqual(c.kind, 'oldNumber');
P.opOldMain(s, mon.id, { name: 'Monica', phone: '311 0042' }); assert.strictEqual(mon.phone, '868 311 0042'); assert.ok(mon.prev.some((e) => e.phone === '868 311 9000') && !mon.prev.some((e) => e.phone === '868 311 0042'));
// ... by a new customer: it leaves the old person's list
const t = P.opOldNew(s, mon.id, { name: 'Sandra', phone: '311 9000' }); assert.ok(!mon.prev.some((e) => P.same(e.phone, '311 9000'))); assert.strictEqual(t.profile.phone, '868 311 9000');
// a different person takes a main number: the old owner loses it (kept in previous numbers) and goes back on the missing list
const d = P.opDifferent(s, john.id, { name: 'Tia', phone: '3923773' }); assert.strictEqual(john.phone, ''); assert.ok(john.prev.some((e) => P.same(e.phone, '3923773'))); assert.ok(P.missingNumber(s).some((p) => p.id === john.id)); assert.strictEqual(d.profile.phone, '868 392 3773');
// shared numbers: two profiles, one number, the name picks
const sh = P.opShared(s, d.profile.id, { name: 'Ria', phone: '3923773' }); assert.ok(P.byId(s, d.profile.id).shared && sh.profile.shared); assert.strictEqual(P.classify(s, { name: 'Ria', phone: '3923773' }).kind, 'match'); assert.strictEqual(P.classify(s, { name: 'Tia', phone: '3923773' }).kind, 'match');
// undo puts it back
const before = JSON.stringify(P.list(s).map((p) => [p.id, p.phone])); const dec = P.opDifferent(s, mon.id, { name: 'Zed', phone: '311 0042' }); assert.notStrictEqual(JSON.stringify(P.list(s).map((p) => [p.id, p.phone])), before);
assert.ok(P.canUndo(s, dec.decision.id)); P.undo(s, dec.decision.id); assert.strictEqual(JSON.stringify(P.list(s).map((p) => [p.id, p.phone])), before); assert.ok(!P.byKey(s, 'Zed')); mon = P.byId(s, mon.id); john = P.byId(s, john.id);   // an undo restores copies: always fetch a profile by id

// merge and split keep the totals, and can be reversed
const tot = JSON.stringify(P.totals(s));
const m1 = P.merge(s, t.profile.id, mon.id, 'me'); assert.ok(!P.byId(s, t.profile.id)); assert.ok(P.byId(s, mon.id).nicks.includes('Sandra')); assert.strictEqual(JSON.stringify(P.totals(s)), tot);
P.undo(s, m1.id); assert.ok(P.byId(s, t.profile.id)); assert.strictEqual(JSON.stringify(P.totals(s)), tot); mon = P.byId(s, mon.id);
// split: invoice INV of Monica to a new customer
const sp = P.split(s, mon.id, { nos: [i2.no], name: 'Monica', phone: '311 7777' }, 'me'); assert.strictEqual(sp.profile.key, 'Monica · 7777'); assert.strictEqual(s.invoices.find((v) => v.no === i2.no).client, 'Monica · 7777'); assert.strictEqual(s.items.find((i) => i.invoice === i2.no).customer, 'Monica · 7777'); assert.strictEqual(JSON.stringify(P.totals(s)), tot);
P.undo(s, sp.decision.id); assert.strictEqual(s.invoices.find((v) => v.no === i2.no).client, 'Monica'); assert.ok(!P.byKey(s, 'Monica · 7777'));
// duplicates: the same number on two profiles that are not shared
const a = P.opFresh(s, { name: 'Dup One', phone: '300 1000' }).profile; const b = P.opFresh(s, { name: 'Dup Two', phone: '300 1000' }).profile; assert.ok(P.duplicates(s).some((x) => (x.a === a && x.b === b)));
// suggestions from past orders
const sug = P.suggest(s, [{ name: 'john', phone: '868-455-1290' }, { name: 'x', phone: '0000000' }]); assert.strictEqual(sug({ name: 'John', nicks: [] }), '868 455 1290'); assert.strictEqual(sug({ name: 'Nobody', nicks: [] }), '');
// two sisters on one phone: Add number -> shared, then orders go by name; an unknown name must pick one of the two
{
  const SC = require('../js/storecore.js'), S = L.defaultState(); P.ensure(S);
  const amy = P.opFresh(S, { name: 'Amy', phone: '868 555 1234' }).profile, beth = P.opFresh(S, { name: 'Beth', phone: '868 555 9999' }).profile;
  assert.ok(P.setNumber(S, beth.id, '868 555 1234').conflict);
  P.opShareNumber(S, beth.id, amy.id, '868 555 1234', 'me');
  assert.ok(amy.shared && beth.shared && P.same(beth.phone, amy.phone)); assert.ok(beth.prev.some((e) => P.same(e.phone, '868 555 9999')));
  assert.strictEqual(P.classify(S, { name: 'Amy', phone: '868 555 1234' }).profile.id, amy.id);
  assert.strictEqual(P.classify(S, { name: 'beth ', phone: '868 555 1234' }).profile.id, beth.id);
  const pk = P.classify(S, { name: 'Bethany', phone: '868 555 1234' }); assert.strictEqual(pk.kind, 'sharedPick'); assert.strictEqual(pk.candidates.length, 2);
  P.opSame(S, beth.id, { name: 'Bethany', phone: '868 555 1234' }, 'me'); assert.strictEqual(P.classify(S, { name: 'Bethany', phone: '868 555 1234' }).profile.id, beth.id);
  // undo puts both back
  const nk = S.decisions.find((x) => x.kind === 'nick' && !x.undone); P.undo(S, nk.id); const d = S.decisions.find((x) => x.kind === 'shared'); P.undo(S, d.id); assert.ok(!amy.shared || !P.byId(S, amy.id).shared); assert.ok(!P.byId(S, beth.id).shared);
  // free delivery on a shared number only reaches the name that holds it
  P.opShareNumber(S, beth.id, amy.id, '868 555 1234', 'me'); const A2 = P.byId(S, amy.id); A2.free = { on: true, zones: ['arima'] };
  const list = SC.freeList(P.list(S));
  assert.ok(SC.isFree(list, '868 555 1234', 'arima', 'Amy')); assert.ok(!SC.isFree(list, '868 555 1234', 'arima', 'Beth')); assert.ok(!SC.isFree(list, '868 555 1234', 'arima', ''));
  const solo = L.defaultState(); P.ensure(solo); const z = P.opFresh(solo, { name: 'Zed', phone: '868 777 1111' }).profile; z.free = { on: true, zones: ['arima'] };
  assert.ok(SC.isFree(SC.freeList(P.list(solo)), '868 777 1111', 'arima', 'Anyone'));   // an unshared number still works by number and place
}
console.log('people tests passed');

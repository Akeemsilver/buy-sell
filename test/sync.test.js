/* Tests for the cloud sync rules (no Firebase needed). */
const assert = require('assert');
const S = require('../js/sync.js');
const mk = () => ({ settings: { year: 2026, defaultMargin: 100 }, batches: [{ id: 'BATCH-001', num: 1 }], items: [{ id: '001-001', desc: 'a' }, { id: '001-002', desc: 'b' }], invoices: [{ no: 'INV-0002' }, { no: 'INV-0010' }], customers: ['Ann'] });
const cloudOf = (s) => S.docs(s);                      // what a cloud holding this state looks like

// 1. first upload sends everything; a second diff sends nothing
{
  const s = mk(), last = S.emptyLast(), d = S.diff(s, last);
  assert.strictEqual(d.sets.length, 1 + 2 + 2 + 2, 'batch, 2 items, 2 invoices, settings, customers');
  S.commit(last, d); assert.deepStrictEqual(S.diff(s, last), { sets: [], dels: [] });
}
// 2. a local edit sends only that document; a local delete sends a delete
{
  const s = mk(), last = S.emptyLast(); S.commit(last, S.diff(s, last));
  s.items[0].desc = 'changed'; s.invoices.pop();
  const d = S.diff(s, last);
  assert.deepStrictEqual(d.sets.map((o) => o.col + ':' + o.id), ['items:001-001']);
  assert.deepStrictEqual(d.dels, [{ col: 'invoices', id: 'INV-0010' }]);
}
// 3. cloud change arrives and is applied; order is kept
{
  const s = mk(), last = S.emptyLast(); S.commit(last, S.diff(s, last));
  const remote = Object.assign({}, cloudOf(s).items); remote['001-003'] = JSON.stringify({ id: '001-003', desc: 'new' }); remote['001-001'] = JSON.stringify({ id: '001-001', desc: 'from phone 2' });
  assert.strictEqual(S.reconcile(s, last, 'items', remote), true);
  assert.deepStrictEqual(s.items.map((i) => i.id + ':' + i.desc), ['001-001:from phone 2', '001-002:b', '001-003:new']);
  assert.deepStrictEqual(S.diff(s, last), { sets: [], dels: [] }, 'nothing to send back');
}
// 4. an unsent local edit wins over a cloud change to the same document, but other documents still update
{
  const s = mk(), last = S.emptyLast(); S.commit(last, S.diff(s, last));
  s.items[0].desc = 'mine';
  const remote = Object.assign({}, cloudOf(mk()).items); remote['001-001'] = JSON.stringify({ id: '001-001', desc: 'theirs' }); remote['001-002'] = JSON.stringify({ id: '001-002', desc: 'theirs b' });
  S.reconcile(s, last, 'items', remote);
  assert.strictEqual(s.items[0].desc, 'mine'); assert.strictEqual(s.items[1].desc, 'theirs b');
  assert.deepStrictEqual(S.diff(s, last).sets.map((o) => o.id), ['001-001'], 'ours is sent');
}
// 5. deleted in the cloud: removed here if untouched, kept (and re-sent) if edited here
{
  const s = mk(), last = S.emptyLast(); S.commit(last, S.diff(s, last));
  s.items[1].desc = 'edited';
  S.reconcile(s, last, 'items', {});                 // the cloud now has no items
  assert.deepStrictEqual(s.items.map((i) => i.id), ['001-002'], 'untouched one removed, edited one kept');
  assert.deepStrictEqual(S.diff(s, last).sets.map((o) => o.id), ['001-002']);
}
// 6. the echo of our own write changes nothing; settings and customers apply
{
  const s = mk(), last = S.emptyLast(); S.commit(last, S.diff(s, last));
  assert.strictEqual(S.reconcile(s, last, 'batches', cloudOf(s).batches), false);
  S.reconcile(s, last, 'meta', { settings: JSON.stringify({ year: 2027, defaultMargin: 80 }), customers: JSON.stringify({ list: ['Ann', 'Bo'] }) });
  assert.strictEqual(s.settings.year, 2027); assert.deepStrictEqual(s.customers, ['Ann', 'Bo']);
}
// 7. new phone: empty state, empty `last`, everything comes down
{
  const src = mk(), s = { settings: { year: 2026 }, batches: [], items: [], invoices: [], customers: [] }, last = S.emptyLast(), c = cloudOf(src);
  last.meta = S.docs(s).meta;                        // this phone's default settings are not an edit: the cloud's win
  ['batches', 'items', 'invoices', 'meta'].forEach((col) => S.reconcile(s, last, col, c[col]));
  assert.deepStrictEqual(s.items, src.items); assert.deepStrictEqual(s.invoices, src.invoices); assert.deepStrictEqual(s.customers, src.customers);
  assert.strictEqual(S.hasData(s), true); assert.strictEqual(S.hasData(S.clearData(s)), false);
}
console.log('sync tests passed');

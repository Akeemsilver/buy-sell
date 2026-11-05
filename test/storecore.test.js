const assert = require('assert');
const L = require('../js/logic.js'), SC = require('../js/storecore.js');
const s = L.defaultState();
L.createBatch(s, { store: 'X', count: 4, currency: 'USD', totalCost: 80, margin: 100 });
L.createBatch(s, { store: 'Y', count: 2, currency: 'USD', totalCost: 40, margin: 100 });
s.items.forEach((x, n) => { x.desc = n === 3 ? '' : 'Item ' + n; x.cost = 20; x.price = 250; x.status = 'Available'; });
s.items[1].saleOn = true; s.items[1].discount = 20; s.items[2].status = 'Paid'; s.items[4].status = 'In Transit'; s.items[5].price = 0;
const b1 = s.batches[0].id, b2 = s.batches[1].id;
let list = SC.shown(s, { batches: [b1] });
assert.deepStrictEqual(list.map((x) => x.id), [s.items[0].id, s.items[1].id], 'only Available items with a name, from the chosen batch (sold, unnamed ones are left out)');
assert.strictEqual(list[1].sale, 200); assert.strictEqual(list[1].pct, 20); assert.strictEqual(SC.payPrice(list[1]), 200);
assert.deepStrictEqual(Object.keys(list[0]).sort(), ['id', 'name', 'pct', 'photo', 'price', 'sale', 'transit'], 'only public fields: never cost, landed cost or profit');
assert.ok(!JSON.stringify(list).includes('cost'));
assert.strictEqual(SC.shown(s, { batches: [b1, b2] }).length, 2, 'in-transit items stay hidden unless switched on (the other batch has no priced available item)');
list = SC.shown(s, { batches: [b1, b2], inTransit: true }); assert.ok(list.some((x) => x.id === s.items[4].id && x.transit), 'in-transit items appear, marked');
assert.strictEqual(SC.shown(s, { batches: [] }).length, 0, 'no batch chosen = nothing shown');
// store pictures in cloud storage: deleted only when the item is gone, or sold and the hold time has passed
{ const st = L.defaultState(); L.createBatch(st, { store: 'X', count: 3, currency: 'USD', totalCost: 30, margin: 100 });
  const [a, b2_, c] = st.items; a.status = 'Available'; b2_.status = 'Paid'; b2_.invoice = 'INV1'; c.status = 'Paid'; c.invoice = 'INV2';
  const now = Date.now(); st.invoices.push({ no: 'INV1', date: new Date(now - 3 * 86400000).toISOString() }, { no: 'INV2', date: new Date(now - 9 * 86400000).toISOString() });
  assert.deepStrictEqual(SC.stalePics(st, [a.id, b2_.id, c.id, 'ghost'], now).sort(), [c.id, 'ghost'].sort(), 'available and recently sold pictures stay; old sales and removed items go'); }
// chunks and hash
assert.deepStrictEqual(SC.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]); assert.strictEqual(SC.hash({ a: 1 }), SC.hash({ a: 1 })); assert.notStrictEqual(SC.hash({ a: 1 }), SC.hash({ a: 2 }));
// locations and totals
const cfg = SC.norm({ locations: [{ name: ' Chaguanas ', pickup: true, delivery: true, price: 25 }, { name: 'Couva', delivery: true, price: 30 }, { name: 'Nowhere' }, { name: '', pickup: true }] });
assert.deepStrictEqual(cfg.locations.map((l) => l.name), ['Chaguanas', 'Couva'], 'a location needs a name and at least one option');
const items = SC.shown(s, { batches: [b1] });
assert.deepStrictEqual(SC.totals(items, cfg.locations[0], 'delivery'), { sub: 450, delivery: 25, total: 475, valid: true });
assert.deepStrictEqual(SC.totals(items, cfg.locations[0], 'pickup'), { sub: 450, delivery: 0, total: 450, valid: true });
assert.strictEqual(SC.totals(items, cfg.locations[1], 'pickup').valid, false, 'pickup is not offered at Couva');
assert.strictEqual(SC.totals([], cfg.locations[0], 'pickup').valid, false);
// order checks
const ok = { name: 'Ari', phone: '868 555 0142', items: [{}], location: 'Chaguanas', option: 'delivery' };
assert.strictEqual(SC.checkOrder(ok), '');
assert.strictEqual(SC.checkOrder({ ...ok, name: ' ' }), 'name'); assert.strictEqual(SC.checkOrder({ ...ok, phone: '123' }), 'phone'); assert.strictEqual(SC.checkOrder({ ...ok, items: [] }), 'items'); assert.strictEqual(SC.checkOrder({ ...ok, option: 'x' }), 'location');
assert.strictEqual(SC.orderCode('ab3dk9xyz'), 'ORD-AB3DK'); assert.strictEqual(SC.newId(20).length, 20);
assert.strictEqual(SC.waLink('555 0142', 'Hi there'), 'https://wa.me/18685550142?text=Hi%20there'); assert.strictEqual(SC.waLink('868-555-0142'), 'https://wa.me/18685550142'); assert.strictEqual(SC.waLink('+44 20 7946 0958'), 'https://wa.me/442079460958');
console.log('store core tests passed');

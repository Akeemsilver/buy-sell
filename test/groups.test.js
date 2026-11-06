const assert = require('assert');
const L = require('../js/logic.js'), SC = require('../js/storecore.js');
const mk = (n) => { const s = L.defaultState(); L.createBatch(s, { store: 'SHEIN', count: n, currency: 'USD', totalCost: 100, margin: 100 }); return s; };

// ---- one design, several pieces, each its own item
{
  const s = mk(10), a = s.items[0];
  Object.assign(a, { desc: 'Blue dress', price: 198, cost: 10, status: 'Available', photo: { id: 'ph1', checked: true }, saleOn: true, discount: 25 });
  s.items.forEach((x) => { x.status = 'Available'; });
  assert.strictEqual(L.freeSlots(s, 'BATCH-001').length, 9, 'nine empty spots');
  const copies = L.makeCopies(s, a.id, 3);
  assert.deepStrictEqual(copies.map((c) => c.id), ['001-002', '001-003', '001-004'], 'the next empty spots, in order');
  copies.forEach((c) => { assert.strictEqual(c.desc, 'Blue dress'); assert.strictEqual(c.price, 198); assert.strictEqual(c.cost, 10); assert.strictEqual(c.photo.id, 'ph1'); assert.strictEqual(c.saleOn, true); assert.strictEqual(c.size, ''); assert.strictEqual(c.grp, a.grp); });
  assert.notStrictEqual(copies[0].photo, a.photo, 'each piece has its own record of the shared picture');
  assert.strictEqual(L.groupOf(s, a).length, 4); assert.strictEqual(s.items.length, 10, 'still ten items in the batch');
  assert.ok(L.needsSize(s, a), 'sizes are required');
  L.setSizes(s, a, [{ s: 'L', n: 1 }, { s: 'M', n: 2 }, { s: 'S', n: 1 }]);
  assert.deepStrictEqual(L.groupOf(s, a).map((x) => x.size), ['S', 'M', 'M', 'L'], 'sizes go to the pieces in item order, small first');
  assert.ok(!L.needsSize(s, a)); assert.deepStrictEqual(L.sizeCounts(s, a), [{ s: 'S', n: 1 }, { s: 'M', n: 2 }, { s: 'L', n: 1 }]);
  assert.throws(() => L.setSizes(s, a, [{ s: 'M', n: 3 }]), /sizes/, 'the counts must add up to the number of pieces');
  // a change reaches every piece
  a.price = 220; a.desc = 'Navy dress'; L.applyToGroup(s, a, ['desc', 'price']);
  assert.ok(L.groupOf(s, a).every((x) => x.price === 220 && x.desc === 'Navy dress'));
  // the store sees one card with the sizes
  const bb = s.batches[0].id; let cards = SC.shown(s, { batches: [bb] });
  assert.strictEqual(cards.length, 1); assert.deepStrictEqual(cards[0].sizes.map((z) => z.s + ':' + z.ids.length), ['S:1', 'M:2', 'L:1']);
  // one piece sells: its size goes from the card; the others stay and keep their picture and group
  const m1 = L.groupOf(s, a)[1]; m1.status = 'Paid'; m1.invoice = 'INV1'; s.invoices.push({ no: 'INV1', date: new Date().toISOString() });
  assert.strictEqual(L.groupOf(s, a).length, 3, 'a sold piece is no longer part of the editable group');
  assert.deepStrictEqual(SC.shown(s, { batches: [bb] })[0].sizes.map((z) => z.s + ':' + z.ids.length), ['S:1', 'M:1', 'L:1']);
  // sizes of the three that are left
  L.setSizes(s, a, [{ s: 'S', n: 1 }, { s: 'M', n: 1 }, { s: 'XL', n: 1 }]); assert.strictEqual(m1.size, 'M', 'a sold piece keeps its size');
  // take copies out again
  const gone = L.dropCopies(s, a.id, 1); assert.strictEqual(gone.length, 1); assert.ok(L.isEmptySlot(gone[0]), 'it is an empty spot again'); assert.strictEqual(L.groupOf(s, a).length, 2);
  L.dropCopies(s, a.id, 5); assert.strictEqual(a.grp, '', 'a group of one is just an item'); assert.strictEqual(L.groupOf(s, a).length, 1);
  // not enough empty spots
  const t = mk(3); Object.assign(t.items[0], { desc: 'Hat', price: 50, cost: 5, status: 'Available' }); t.items.forEach((x) => { x.status = 'Available'; });
  assert.throws(() => L.makeCopies(t, t.items[0].id, 4), /slots/, 'asks for more spots than the batch has');
  L.addItems(t, 'BATCH-001', 2); assert.strictEqual(L.makeCopies(t, t.items[0].id, 4).length, 4, 'after adding spots it fits'); assert.strictEqual(t.items.length, 5);
  // split one piece away
  L.splitFromGroup(t, t.items[2].id); assert.strictEqual(t.items[2].grp, ''); assert.strictEqual(L.groupOf(t, t.items[0]).length, 4);
}

// ---- the shared picture is not deleted while another piece still needs it
{
  const s = mk(3), DAY = 864e5, now = Date.now();
  s.items.forEach((x) => { Object.assign(x, { desc: 'Top', price: 100, cost: 10, status: 'Available', photo: { id: 'sharedpic', checked: true, savedAt: now - 1 * DAY } }); });
  s.items[0].status = 'Paid'; s.items[0].invoice = 'INV1'; s.invoices.push({ no: 'INV1', date: new Date(now - 9 * DAY).toISOString() });
  let plan = L.photoSweepPlan(s, now, '2');
  assert.deepStrictEqual(plan.dropOrig, [], 'one piece sold, the others unsold: the original stays');
  assert.deepStrictEqual(plan.dropFull, [], 'the saved picture stays too');
  s.items[1].status = 'Paid'; s.items[1].invoice = 'INV1'; s.items[2].status = 'Paid'; s.items[2].invoice = 'INV1';
  plan = L.photoSweepPlan(s, now, '2'); assert.strictEqual(plan.dropFull.length, 3, 'all sold and the week is over: the picture can go');
  const lone = mk(2); lone.items.forEach((x, n) => { Object.assign(x, { desc: 'A' + n, status: 'Available', photo: { id: 'own' + n, checked: true } }); }); lone.items[0].status = 'Paid'; lone.items[0].invoice = 'INV1'; lone.invoices.push({ no: 'INV1', date: new Date(now - 9 * DAY).toISOString() });
  assert.strictEqual(L.photoSweepPlan(lone, now, '2').dropFull.length, 1, 'a picture of its own is dropped as before');
  // old thumbnails
  const o = mk(2); o.items.forEach((x) => { Object.assign(x, { desc: 'B', status: 'Paid', invoice: 'INV9', photo: { id: 'same' } }); }); o.invoices.push({ no: 'INV9', date: new Date(now - 400 * DAY).toISOString() });
  assert.strictEqual(L.oldThumbItems(o, now, 365).length, 2); o.items[1].status = 'Available'; o.items[1].invoice = '';
  assert.strictEqual(L.oldThumbItems(o, now, 365).length, 0, 'a thumbnail an unsold piece still uses is not listed');
}

// ---- sale for many at once
{
  const s = mk(5); s.items.forEach((x) => { Object.assign(x, { desc: 'Z', price: 200, status: 'Available' }); }); s.items[4].status = 'Paid';
  const ids = s.items.map((x) => x.id), n = L.bulkSale(s, ids, 25);
  assert.strictEqual(n, 4, 'sold pieces are skipped'); assert.strictEqual(L.salePrice(s.items[0]), 150); assert.ok(!s.items[4].saleOn);
  L.bulkSale(s, [ids[1]], 50); assert.strictEqual(L.salePrice(s.items[1]), 100, 'a new percentage replaces the old one');
  L.clearSale(s, ids); assert.strictEqual(L.salePrice(s.items[0]), 0); assert.strictEqual(SC.shown(s, { batches: ['BATCH-001'] })[0].sale, 0);
}
console.log('group tests passed');

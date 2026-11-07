const assert = require('assert');
const L = require('../js/logic.js');

function fresh() {
  const s = L.defaultState();
  s.settings.rates.USD = 6.8; // effective = 6.8 * 1.025 = 6.97
  return s;
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`);

// batch creation + landed cost allocation
(() => {
  const s = fresh();
  const b = L.createBatch(s, { store: 'SHEIN', count: 2, totalCost: 100, currency: 'USD', margin: 100 });
  assert.equal(b.id, 'BATCH-001'); assert.equal(s.items[1].id, '001-002');
  near(b.rate, 6.97);
  s.items[0].cost = 40; s.items[1].cost = 60;
  L.payClearing(s, b.id, 100);
  near(L.itemCalc(b, s.items[0]).clearing, 40);   // 100 clearing split by cost share
  near(L.itemCalc(b, s.items[0]).landed, 40 * 6.97 + 40);
  near(L.itemCalc(b, s.items[0]).recommended, (40 * 6.97 + 40) * 2);
  assert.equal(L.makeAvailable(s, b.id), 2);
  assert.ok(s.items.every((i) => i.status === 'Available'));
  assert.equal(L.createBatch(s, { count: 1, totalCost: 1, currency: 'TTD', margin: 0 }).id, 'BATCH-002');
  assert.throws(() => L.createBatch(s, { count: 0 }), (e) => e.code === 'count');
})();

// invoice: full payment, then an overpayment tip, then a partial-pay chain
(() => {
  const s = fresh();
  const b = L.createBatch(s, { store: 'X', count: 3, totalCost: 100, currency: 'TTD', margin: 100 });
  s.items.forEach((i, n) => { i.cost = [20, 30, 50][n]; i.desc = 'Item ' + n; i.sold = [100, 100, 200][n]; i.status = 'Available'; });
  // partial payment on items 0+1: sold 200, landed 50, paying 120 => profit 70, owing 80
  let inv = L.createInvoice(s, { itemIds: ['001-001', '001-002'], client: 'Ann', paying: 120 });
  assert.equal(inv.no, 'INV00001'); assert.equal(inv.balance, 80); assert.equal(inv.profit, 70);
  assert.equal(L.invoiceStatus(inv), 'Owing');
  // waterfall: the 120 covers item 1 in full (100) and 20 of item 2
  assert.equal(s.items[0].status, 'Paid'); assert.equal(s.items[1].status, 'Owing'); assert.equal(s.items[1].owing, 80);
  assert.deepEqual(s.customers, ['Ann']);
  // customer pays rest, referencing the old invoice through the items
  const inv2 = L.createInvoice(s, { itemIds: ['001-001', '001-002'], client: 'Ann', paying: 80 });
  assert.equal(inv2.previouslyPaid, 120); assert.equal(inv2.balance, 0);
  assert.equal(inv2.profit, 80);        // prev (120) >= landed (50): profit = paying
  assert.equal(s.invoices[0].updatedBy, 'INV00002'); assert.equal(L.invoiceStatus(s.invoices[0]), 'Updated');
  assert.equal(s.items[0].status, 'Paid');
  // overpay: sold 200 + delivery 10, pay 250 => tip 40
  s.items[2].delivery = 10;
  const p = L.previewInvoice(s, { itemIds: ['001-003'], client: 'Bo', paying: 250 });
  assert.equal(p.total, 210); assert.equal(p.tip, 40); assert.equal(p.balance, 0);
  near(p.profit, 250 - 50 - 40);
  // sold below landed cost => loss, profit floored at 0
  s.items[2].sold = 30; s.items[2].delivery = 0;
  const q = L.previewInvoice(s, { itemIds: ['001-003'], client: 'Bo', paying: 30 });
  assert.equal(q.profit, 0); assert.equal(q.loss, -20);
  // validation
  assert.ok(L.previewInvoice(s, { itemIds: [], client: '', paying: 0 }).errors.length >= 2);
  // deleting the newest invoice restores the chain
  L.deleteInvoice(s, 'INV00002');
  assert.equal(s.invoices[0].updatedBy, ''); assert.equal(s.items[0].invoice, 'INV00001');
  // reports
  s.items[2].sold = 200;
  const cs = L.customerStats(s)[0];
  assert.equal(cs.name, 'Ann'); assert.equal(cs.owing, 80);
  assert.equal(L.totals(s).owing, 80);
  near(L.totals(s).profit, (100 - 20) + (100 - 30)); // items 0 and 1 sold: sold - landed (batch has no clearing)
})();

// old saved data (no per-item paid/owing) is migrated on load
(() => {
  const s = fresh();
  L.createBatch(s, { store: 'X', count: 1, totalCost: 10, currency: 'TTD', margin: 50 });
  Object.assign(s.items[0], { desc: 'a', cost: 5, sold: 50, status: 'Owing', customer: 'Di' });
  s.invoices.push({ no: 'INV00001', client: 'Di', desc: 'a', lines: [], total: 50, amountPaid: 20, previouslyPaid: 0, balance: 30, delivery: 0, date: new Date().toISOString(), due: new Date().toISOString(), qty: 1, ref: '', profit: 0, loss: 0, tip: 0, updatedBy: '' });
  s.items[0].invoice = 'INV00001';
  assert.equal(L.customerStats(s)[0].owing, 30);         // before the migration the item figures are missing, but the invoice already says 30
  L.migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(L.customerStats(L.migrate(s))[0].owing, 30);
})();

// period + batch filters
(() => {
  const s = fresh(); const d = new Date(), old = new Date(d.getFullYear() - 1, 5, 15);
  const b1 = L.createBatch(s, { store: 'X', count: 1, totalCost: 100, currency: 'TTD', margin: 100, date: old });
  const b2 = L.createBatch(s, { store: 'X', count: 1, totalCost: 50, currency: 'TTD', margin: 100 });
  s.items.forEach((i) => { i.cost = i.batchId === b1.id ? 100 : 50; i.desc = 'x'; i.sold = i.cost * 2; i.status = 'Available'; });
  L.createInvoice(s, { itemIds: ['001-001'], client: 'A', paying: 200, date: old });
  L.createInvoice(s, { itemIds: ['002-001'], client: 'B', paying: 100 });
  assert.equal(L.totals(s).sales, 300); assert.equal(L.totals(s).expense, 150);
  assert.equal(L.totals(s, { period: 'thisYear' }).sales, 100);
  assert.equal(L.totals(s, { period: 'thisYear' }).expense, 50);
  assert.equal(L.totals(s, { period: 'thisYear' }).profit, 50);
  assert.equal(L.totals(s, { period: String(old.getFullYear()) }).sales, 200);
  assert.equal(L.totals(s, { batch: b1.id }).sales, 200);
  assert.equal(L.totals(s, { batch: b2.id, period: 'lastMonth' }).sales, 0);
  assert.equal(L.filterInvoices(s, { batch: b2.id }).length, 1);
})();

// names are always cleaned
(() => {
  assert.equal(L.cleanName('  Renimar \t '), 'Renimar'); assert.equal(L.cleanName('Ana   Maria'), 'Ana Maria'); assert.equal(L.cleanName('-'), '');
  const s = fresh();
  L.createBatch(s, { store: 'SHEIN ', count: 3, totalCost: 30, currency: 'TTD', margin: 100 });
  s.items.forEach((i) => { i.cost = 10; i.sold = 50; i.desc = ' Dress  blue '; i.status = 'Available'; });
  const a = L.createInvoice(s, { itemIds: ['001-001'], client: 'Renimar ', paying: 50 });
  const b = L.createInvoice(s, { itemIds: ['001-002'], client: '  renimar', paying: 50 });   // same person, different case/spacing
  assert.equal(a.client, 'Renimar'); assert.equal(b.client, 'Renimar'); assert.deepEqual(s.customers, ['Renimar']);
  assert.equal(L.previewInvoice(s, { itemIds: ['001-003'], client: '   ', paying: 10 }).errors.includes('noClient'), true);
  // old saved data with messy names is repaired on load; the most common spelling wins
  const old = fresh(); old.customers = ['Renimar ', 'Renimar', 'Ori'];
  old.items.push({ id: 'x', batchId: 'B', store: 'X ', desc: 'Bodys ', cost: 0, sold: 0, status: 'Owing', customer: 'Renimar', delivery: 0, invoice: '' }, { id: 'y', batchId: 'B', store: 'X', desc: 'Pant', cost: 0, sold: 0, status: 'Owing', customer: 'Renimar ', delivery: 0, invoice: '' }, { id: 'z', batchId: 'B', store: 'X', desc: 'Top', cost: 0, sold: 0, status: 'Owing', customer: 'ori', delivery: 0, invoice: '' });
  assert.equal(L.cleanNames(old), true);
  assert.deepEqual(old.customers, ['Renimar', 'Ori']); assert.deepEqual(old.items.map((i) => i.customer), ['Renimar', 'Renimar', 'Ori']);
  assert.equal(old.items[0].desc, 'Bodys'); assert.equal(old.items[0].store, 'X');
  assert.equal(L.cleanNames(old), false);   // idempotent
})();

// photos, selling price, exact-cent prices and what customers may see
(() => {
  // numbers from a real batch: US$ 201.17 order, TT$ 664.80 clearing, effective rate 6.9385837, item cost US$ 25.60
  const s = L.defaultState(); s.settings.rates.USD = 6.9385837 / 1.025;
  const b = L.createBatch(s, { store: 'SHEIN', count: 4, totalCost: 201.17, currency: 'USD', margin: 100 }); L.payClearing(s, b.id, 664.8);
  s.items[0].cost = 25.6; const c = L.itemCalc(b, s.items[0]);
  assert.equal(c.costTTD, 177.63); assert.equal(c.clearing, 84.6); assert.equal(c.landed, 262.23);
  assert.equal(c.recommended, 524.46);                       // exactly landed x 2, to the cent (no 524.45 vs 262.23 mismatch)
  assert.equal(L.r2(c.costTTD + c.clearing), c.landed);
  // new photos fill the next items without a photo, in order; the rest stay plain
  const r = L.assignPhotos(s, b.id, ['p1', 'p2']);
  assert.deepEqual(r.assigned.map((a) => a.itemId), ['001-001', '001-002']); assert.equal(r.extra, 0);
  assert.equal(s.items[0].photo.checked, false); assert.equal(s.items[2].photo, null);
  const r2_ = L.assignPhotos(s, b.id, ['p3', 'p4', 'p5']);   // only 2 items left -> one photo does not fit
  assert.deepEqual(r2_.assigned.map((a) => a.itemId), ['001-003', '001-004']); assert.equal(r2_.extra, 1);
  assert.equal(L.addItems(s, b.id, 1)[0].id, '001-005'); assert.equal(L.photoStats(s, b.id).noPhoto, 1);
  assert.equal(L.photoStats(s, b.id).needCheck, 4);
  // sharing is blocked until the photo is checked
  assert.equal(L.shareStatus(s.items[0]), 'notChecked'); s.items[0].photo.checked = true; assert.equal(L.shareStatus(s.items[0]), 'ok'); assert.equal(L.shareStatus(s.items[4]), 'noPhoto');
  // what leaves the app never contains a cost
  s.items[0].desc = 'Brown set'; s.items[0].price = 540;
  const pv = L.publicView(s.items[0]); assert.deepEqual(Object.keys(pv).sort(), ['discount', 'id', 'name', 'price', 'salePrice']); assert.equal(pv.price, 540);
  assert.ok(!JSON.stringify(pv).includes('25.6') && !JSON.stringify(pv).includes('262') && !JSON.stringify(pv).includes('524'));
  s.items[1].price = 0; assert.equal(L.publicView(s.items[1]).price, 0);                 // no price: shared as "available"
  // selling price pre-fills "sold for" only when nothing is there
  s.items[2].price = 300; L.prefillSold(s.items[2]); assert.equal(s.items[2].sold, 300); s.items[2].sold = 280; L.prefillSold(s.items[2]); assert.equal(s.items[2].sold, 280);
  // older saved data gains the new fields
  const old = L.defaultState(); old.items.push({ id: 'x', batchId: 'B', desc: '', cost: 0, sold: 0, status: 'Available', customer: '', delivery: 0, invoice: '' }); L.migrate(old);
  assert.equal(old.items[0].price, 0); assert.equal(old.items[0].photo, null);
})();

// close vs delete
(() => {
  const s = fresh();
  const b = L.createBatch(s, { store: 'X', count: 2, totalCost: 10, currency: 'TTD', margin: 50 });
  assert.equal(L.batchStatus(s, b), 'In Transit');
  L.makeAvailable(s, b.id); assert.equal(L.batchStatus(s, b), 'Received');
  s.items.forEach((i) => { i.cost = 5; i.sold = 20; i.desc = 'x'; });
  L.createInvoice(s, { itemIds: ['001-001'], client: 'Cy', paying: 20 });
  assert.throws(() => L.deleteBatch(s, b.id), (e) => e.code === 'hasInvoiced');
  L.closeBatch(s, b.id);
  assert.equal(L.batchStatus(s, b), 'Closed');
  assert.equal(s.items[0].status, 'Paid'); assert.equal(s.items[1].status, 'Closed'); // sold item kept, unsold closed
  assert.equal(s.batches.length, 1);
})();

// import from the real workbook if a dump is available
const fs = require('fs'), path = process.env.WORKBOOK_JSON;
if (path && fs.existsSync(path)) {
  const s = L.importWorkbook(JSON.parse(fs.readFileSync(path, 'utf8')));
  assert.equal(s.batches.length, 2); assert.equal(s.items.length, 72);
  assert.equal(s.batches[1].currency, 'USD'); near(s.batches[1].totalCost, 201.17); near(s.batches[0].totalCost, 539.21);
  assert.ok(s.invoices.length >= 27);
  // customer log must match the sheet's own Customer Log (rows start at 3: name, status, owing, sales, bought, itemsOwing, profit)
  const wbj = JSON.parse(fs.readFileSync(path, 'utf8'));
  const mine = Object.fromEntries(L.customerStats(s).map((c) => [c.name, c]));
  // the sheet lists "Renimar" and "Renimar " separately; the app merges names that differ only by spaces
  const agg = {};
  (wbj['Customer Log'] || []).slice(2).filter((r) => r[0]).forEach((r) => {
    const a = (agg[String(r[0]).trim()] = agg[String(r[0]).trim()] || [0, 0, 0, 0, 0]);
    [2, 3, 4, 5, 6].forEach((k, n) => { a[n] += +r[k] || 0; });
  });
  Object.entries(agg).forEach(([name, a]) => {
    const c = mine[name]; assert.ok(c, 'missing customer ' + name);
    near(c.owing, a[0]); near(c.sales, a[1]); assert.equal(c.bought, a[2]); assert.equal(c.itemsOwing, a[3]); near(c.profit, a[4]);
  });
  assert.ok(s.customers.every((n) => n === n.trim()) && new Set(s.customers.map((n) => n.toLowerCase())).size === s.customers.length, 'imported customers are clean and unique');
  assert.ok(s.items.every((i) => i.desc === i.desc.trim()), 'imported descriptions are trimmed');
  const st = L.batchStats(s, s.batches[1]);
  console.log('imported', s.batches.length, 'batches', s.items.length, 'items', s.invoices.length, 'invoices',
    'batch2 profit', Math.round(st.profit), 'margin', s.batches[1].margin, 'owing', L.totals(s).owing);
}
console.log('all tests passed');

// ---- sale price (a percentage off the selling price)
{
  const L2 = require('../js/logic.js');
  const it = { id: '001-001', desc: 'Dress', cost: 25.6, price: 300, sold: 0, discount: 50, saleOn: true };
  assert.strictEqual(L2.salePrice(it), 150, '50% off 300');
  assert.strictEqual(L2.salePrice({ ...it, saleOn: false }), 0, 'switched off = no sale');
  assert.strictEqual(L2.salePrice({ ...it, discount: 0 }), 0, '0% = no sale');
  assert.strictEqual(L2.salePrice({ ...it, discount: 100 }), 0, '100% is not a sale');
  assert.strictEqual(L2.salePrice({ ...it, price: 0 }), 0, 'no selling price');
  assert.strictEqual(L2.salePrice({ ...it, price: 199.99, discount: 33 }), 133.99, 'rounded to the cent');
  const pv = L2.publicView(it); assert.deepStrictEqual(Object.keys(pv).sort(), ['discount', 'id', 'name', 'price', 'salePrice'], 'shared view has no cost');
  assert.strictEqual(pv.salePrice, 150); assert.strictEqual(pv.discount, 50);
  const f = { ...it }; L2.prefillSold(f); assert.strictEqual(f.sold, 150, 'on sale: Sold for starts as the sale price');
  const h = { ...it, sold: 99 }; L2.prefillSold(h); assert.strictEqual(h.sold, 99, 'a typed Sold for is never replaced');
  const g = { ...it, saleOn: false }; L2.prefillSold(g); assert.strictEqual(g.sold, 300, 'no sale: Sold for starts as the selling price');
  const b = { rate: 7, totalCost: 25.6, clearingPaid: 0, margin: 100 };
  const c1 = L2.itemCalc(b, it), c2 = L2.itemCalc(b, { ...it, saleOn: false });
  assert(c1.profit < c2.profit, 'projected profit uses the sale price when a sale is on');
}
{ const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 2, currency: 'USD', totalCost: 20, margin: 100 }); s.items.forEach((x) => { x.desc = 'Thing'; x.cost = 10; x.price = 50; x.sold = 50; x.status = 'Available'; });
  assert.strictEqual(L.isSold(s.items[0]), false);
  const inv = L.createInvoice(s, { itemIds: [s.items[0].id], client: 'Ari', isNew: true, paying: 50, date: new Date() });
  assert.strictEqual(L.isSold(s.items[0]), true, 'an invoiced item is sold (locked)');
  assert.strictEqual(L.assignPhotos(s, s.batches[0].id, ['a', 'b']).assigned.length, 1, 'photos are never given to a sold item');
  L.deleteInvoice(s, inv.no); assert.strictEqual(L.isSold(s.items[0]), false, 'returning the invoice unlocks its items');
  s.items[1].status = 'Paid'; s.items[1].customer = 'Z'; L.returnItem(s, s.items[1].id); assert.strictEqual(s.items[1].status, 'Available'); assert.strictEqual(s.items[1].sold, 0); }
{ // photo storage plan
  const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 3, currency: 'USD', totalCost: 30, margin: 100 });
  s.items.forEach((x, n) => { x.desc = 'T' + n; x.cost = 10; x.price = 50; x.sold = 50; x.status = 'Available'; x.photo = { id: 'p' + n, checked: true }; });
  const DAY = 864e5, now = Date.parse('2026-11-10T12:00:00Z');
  let plan = L.photoSweepPlan(s, now, 2); assert.deepStrictEqual(plan.stamp.sort(), s.items.map((x) => x.id).sort(), 'saved photos without a time start their timer');
  s.items.forEach((x) => { x.photo.savedAt = now - 3 * DAY; }); s.items[1].photo.savedAt = now - 1 * DAY;
  plan = L.photoSweepPlan(s, now, 2); assert.deepStrictEqual(plan.dropOrig, [s.items[0].id, s.items[2].id], 'originals older than the keep time go, newer ones stay');
  assert.deepStrictEqual(L.photoSweepPlan(s, now, 7).dropOrig, [], '7 day setting keeps 3 day old originals');
  assert.deepStrictEqual(L.photoSweepPlan(s, now, 'sold').dropOrig, [], 'until sold keeps them');
  s.items[1].photo.noOrig = true; assert.ok(!L.photoSweepPlan(s, now, 1).dropOrig.includes(s.items[1].id), 'already dropped is not listed again');
  const inv = L.createInvoice(s, { itemIds: [s.items[0].id], client: 'Ari', isNew: true, paying: 50, date: new Date(now - 2 * DAY) });
  plan = L.photoSweepPlan(s, now, 'sold'); assert.ok(plan.dropOrig.includes(s.items[0].id), 'a sold item drops its original at once even when the setting is until sold');
  assert.deepStrictEqual(plan.dropFull, [], 'full photo stays for 7 days after the sale'); assert.strictEqual(L.photoDaysLeft(s, s.items[0], now), 5);
  assert.deepStrictEqual(L.photoSweepPlan(s, now + 6 * DAY, 2).dropFull, [s.items[0].id], '8 days after the sale the full photo goes');
  s.items[0].photo.noFull = true; assert.strictEqual(L.shareStatus(s.items[0]), 'gone'); assert.strictEqual(L.photoDaysLeft(s, s.items[0], now), null);
}
{ // old thumbnails: only sold items, only by sale date, never automatic
  const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 3, currency: 'USD', totalCost: 30, margin: 100 });
  s.items.forEach((x, n) => { x.desc = 'T' + n; x.cost = 10; x.price = 50; x.sold = 50; x.status = 'Available'; x.photo = { id: 'p' + n, checked: true }; });
  const DAY = 864e5, now = Date.parse('2027-12-01T12:00:00Z');
  L.createInvoice(s, { itemIds: [s.items[0].id], client: 'A', isNew: true, paying: 50, date: new Date(now - 400 * DAY) });
  L.createInvoice(s, { itemIds: [s.items[1].id], client: 'B', isNew: true, paying: 50, date: new Date(now - 100 * DAY) });
  assert.deepStrictEqual(L.oldThumbItems(s, now).map((x) => x.id), [s.items[0].id], 'sold over a year ago is listed; recent sale and unsold stock are not');
  assert.strictEqual(L.oldThumbItems(s, now, 90).length, 2, 'the age can be changed');
  assert.deepStrictEqual(L.photoSweepPlan(s, now, 2).dropFull.concat(L.photoSweepPlan(s, now, 2).dropOrig).filter((id) => id === s.items[2].id), [], 'the automatic sweep never touches thumbnails or unsold photos');
}
{ // later payments and customer place
  const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 2, currency: 'USD', totalCost: 40, margin: 100 });
  s.items.forEach((x, n) => { x.desc = 'T' + n; x.cost = 10; x.price = 210; x.sold = 210; x.status = 'Available'; });
  const a = L.createInvoice(s, { itemIds: s.items.map((x) => x.id), client: 'Ren', isNew: true, paying: 300, date: new Date() });
  assert.strictEqual(a.balance, 120);
  assert.throws(() => L.recordPayment(s, a.no, 500), (e) => e.code === 'payTooMuch', 'cannot pay more than is owed');
  const b = L.recordPayment(s, a.no, 60, new Date());
  assert.strictEqual(b.previouslyPaid, 300); assert.strictEqual(b.amountPaid, 60); assert.strictEqual(b.balance, 60);
  assert.strictEqual(s.invoices.find((v) => v.no === a.no).updatedBy, b.no, 'old invoice is marked Updated');
  assert.ok(s.items.every((x) => x.invoice === b.no && x.status === 'Owing' || x.status === 'Paid'), 'items now sit on the new invoice');
  assert.throws(() => L.recordPayment(s, a.no, 10), (e) => e.code === 'alreadyUpdated', 'an updated invoice cannot be paid again');
  const c = L.recordPayment(s, b.no, 60, new Date()); assert.strictEqual(c.balance, 0); assert.ok(s.items.every((x) => x.status === 'Paid'), 'paid in full when nothing is left');
  L.setPlace(s, 'Ren', ' Chaguanas '); assert.strictEqual(L.place(s, 'Ren'), 'Chaguanas'); L.setPlace(s, 'Ren', ''); assert.strictEqual(L.place(s, 'Ren'), '');
}
{ // profit so far
  const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 2, currency: 'TTD', totalCost: 200, margin: 50 });
  s.items.forEach((x) => { x.desc = 'T'; x.cost = 100; x.price = 150; x.sold = 150; x.status = 'Available'; });
  const c0 = L.itemCalc(s.batches[0], s.items[0]); assert.strictEqual(c0.landed, 100); assert.strictEqual(c0.recommended, 150);
  L.createInvoice(s, { itemIds: [s.items[0].id], client: 'A', isNew: true, paying: 110, date: new Date() });
  const c1 = L.itemCalc(s.batches[0], s.items[0]); assert.strictEqual(c1.paid, 110); assert.strictEqual(c1.profitSoFar, 10, 'paid 110 on a landed cost of 100 = profit so far 10'); assert.strictEqual(c1.profit, 50, 'profit at sold for stays 50');
  L.createInvoice(s, { itemIds: [s.items[1].id], client: 'B', isNew: true, paying: 60, date: new Date() });
  assert.strictEqual(L.itemCalc(s.batches[0], s.items[1]).profitSoFar, -40, 'paid less than the landed cost: still 40 to recover');
}
{ // renaming a customer
  const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 3, currency: 'USD', totalCost: 60, margin: 100 });
  s.items.forEach((x, n) => { x.desc = 'T' + n; x.cost = 10; x.price = 100; x.sold = 100; x.status = 'Available'; });
  L.createInvoice(s, { itemIds: [s.items[0].id], client: 'Ren', isNew: true, paying: 100, date: new Date() });
  L.createInvoice(s, { itemIds: [s.items[1].id], client: 'Zed', isNew: true, paying: 100, date: new Date() });
  L.setPlace(s, 'Ren', 'Couva');
  assert.strictEqual(L.renameCustomer(s, 'Ren', '  Renwick  J '), 'Renwick J');
  assert.ok(s.invoices.some((v) => v.client === 'Renwick J') && !s.invoices.some((v) => v.client === 'Ren'), 'invoices renamed');
  assert.ok(s.items.some((x) => x.customer === 'Renwick J') && !s.items.some((x) => x.customer === 'Ren'), 'items renamed');
  assert.ok(s.customers.includes('Renwick J') && !s.customers.includes('Ren'), 'customers list renamed');
  assert.strictEqual(L.place(s, 'Renwick J'), 'Couva', 'the location moves with the name'); assert.strictEqual(L.place(s, 'Ren'), '');
  assert.throws(() => L.renameCustomer(s, 'Renwick J', '   '), (e) => e.code === 'noName');
  assert.strictEqual(L.otherCustomerNamed(s, 'Renwick J', 'zed'), true, 'a name used by someone else is detected');
  assert.strictEqual(L.renameCustomer(s, 'Renwick J', 'zed'), 'Zed', 'it merges into the existing spelling');
  assert.strictEqual(L.customerStats(s).filter((c) => c.name === 'Zed')[0].bought, 2, 'merged customers share their items');
  assert.strictEqual(L.renameCustomer(s, 'Zed', 'ZED'), 'ZED', 'capitals can be changed');
}
{ // one purchase paid in several goes: a chain of invoices, only the newest is listed
  const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 2, currency: 'TTD', totalCost: 100, margin: 100 });
  s.items.forEach((x, n) => { x.desc = 'T' + n; x.cost = 50; x.price = 150; x.sold = 150; x.status = 'Available'; });
  const a = L.createInvoice(s, { itemIds: [s.items[0].id], client: 'Jo', isNew: true, paying: 75, date: new Date('2026-11-01T12:00:00') });
  const b = L.recordPayment(s, a.no, 20, new Date('2026-11-03T12:00:00')), c = L.recordPayment(s, b.no, 30, new Date('2026-11-05T12:00:00'));
  L.createInvoice(s, { itemIds: [s.items[1].id], client: 'Jo', isNew: true, paying: 150, date: new Date('2026-11-04T12:00:00') });
  assert.deepStrictEqual(L.invoiceChain(s, c.no).map((v) => v.no), [a.no, b.no, c.no], 'the chain runs oldest to newest');
  assert.deepStrictEqual(L.invoiceChain(s, a.no).map((v) => v.no), [a.no]);
  assert.deepStrictEqual(L.latestInvoices(s, 'Jo').map((v) => v.no).sort(), [c.no, 'INV00004'].sort(), 'one invoice per purchase: the newest of the chain, plus the other purchase');
  assert.deepStrictEqual(L.invoiceChain(s, c.no).map((v) => v.amountPaid), [75, 20, 30], 'each step shows what was paid then');
}
{ // an item with a selling price but no 'sold for' can be invoiced at that price
  const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 2, currency: 'TTD', totalCost: 100, margin: 100 });
  s.items.forEach((x) => { x.desc = 'T'; x.cost = 50; x.status = 'Available'; });
  s.items[0].price = 198.98; s.items[1].price = 200; s.items[1].saleOn = true; s.items[1].discount = 25;
  assert.strictEqual(L.effectivePrice(s.items[0]), 198.98); assert.strictEqual(L.effectivePrice(s.items[1]), 150, 'a sale price wins over the selling price');
  s.items[0].sold = 180; assert.strictEqual(L.effectivePrice(s.items[0]), 180, 'sold-for wins');
  s.items[0].sold = 0;
  const p = L.previewInvoice(s, { itemIds: s.items.map((x) => x.id), client: 'A', paying: 100 }); assert.ok(!p.errors.includes('noPrice')); assert.strictEqual(p.totalSold, 348.98);
  const v = L.createInvoice(s, { itemIds: s.items.map((x) => x.id), client: 'A', isNew: true, paying: 100, date: new Date() });
  assert.strictEqual(v.total, 348.98); assert.deepStrictEqual(s.items.map((x) => x.sold), [198.98, 150], 'the sold-for prices are written when the invoice is made');
  const s2 = L.defaultState(); L.createBatch(s2, { store: 'X', count: 1, currency: 'TTD', totalCost: 50, margin: 100 }); s2.items[0].desc = 'T'; s2.items[0].cost = 50;
  assert.ok(L.previewInvoice(s2, { itemIds: [s2.items[0].id], client: 'A', paying: 10 }).errors.includes('noPrice'), 'no price at all is still an error');
}
console.log('sale price tests passed');
{ // an order's payment summary follows its invoice through later payments
  const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 1, currency: 'TTD', totalCost: 50, margin: 100 });
  s.items[0].desc = 'T'; s.items[0].cost = 50; s.items[0].price = 200; s.items[0].status = 'Available';
  assert.strictEqual(L.orderPay(s, 'NOPE'), null, 'no invoice, no summary');
  const a = L.createInvoice(s, { itemIds: [s.items[0].id], client: 'Jo', isNew: true, paying: 0, allowZero: true, date: new Date('2026-11-01T12:00:00') });
  let p = L.orderPay(s, a.no); assert.strictEqual(p.owing, 200); assert.strictEqual(p.paid, 0); assert.strictEqual(p.payments.length, 0);
  const b = L.recordPayment(s, a.no, 80, new Date('2026-11-03T12:00:00'));
  p = L.orderPay(s, a.no); assert.strictEqual(p.inv, b.no, 'follows the updated invoice'); assert.strictEqual(p.paid, 80); assert.strictEqual(p.owing, 120); assert.strictEqual(p.payments.length, 1);
  L.recordPayment(s, b.no, 120, new Date('2026-11-05T12:00:00'));
  p = L.orderPay(s, a.no); assert.strictEqual(p.owing, 0); assert.strictEqual(p.paid, 200); assert.strictEqual(p.payments.length, 2);
}
{ // order stages and search
  const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 1, currency: 'TTD', totalCost: 50, margin: 100 });
  s.items[0].desc = 'Blue dress'; s.items[0].cost = 50; s.items[0].price = 200; s.items[0].status = 'Available';
  const a = L.createInvoice(s, { itemIds: [s.items[0].id], client: 'Burke', isNew: true, paying: 50, date: new Date('2026-11-01T12:00:00') });
  const b = L.recordPayment(s, a.no, 10, new Date('2026-11-02T12:00:00'));
  const o = { code: 'ORD-WDDK4', name: 'Burke', phone: '868 706 1847', status: 'done', items: [{ id: s.items[0].id, name: 'Blue dress', size: 'M' }] };
  assert.strictEqual(L.orderStage({ status: 'new' }, null), 'new'); assert.strictEqual(L.orderStage({ status: 'confirmed' }, null), 'confirmed');
  assert.strictEqual(L.orderStage(o, L.orderPay(s, a.no)), 'handed', 'handed over but owing');
  L.recordPayment(s, b.no, 140, new Date('2026-11-03T12:00:00'));
  assert.strictEqual(L.orderStage(o, L.orderPay(s, a.no)), 'done', 'paid in full moves to done by itself');
  assert.strictEqual(L.orderStage({ status: 'declined' }, null), 'done');
  const m = (q) => (L.orderMatch(s, o, q, a.no) || {}).kind;
  assert.strictEqual(m('wddk'), 'order'); assert.strictEqual(m('ord wddk4'), 'order'); assert.strictEqual(m(a.no.toLowerCase()), 'invoice', 'an older invoice number in the chain finds it too'); assert.strictEqual(m(b.no), 'invoice');
  assert.strictEqual(m(s.items[0].id), 'item'); assert.strictEqual(m(s.items[0].id.replace('-', '')), 'item', 'item numbers match without the dash'); assert.strictEqual(m('dress'), 'item');
  assert.strictEqual(m('burke'), 'customer'); assert.strictEqual(m('706'), 'phone'); assert.strictEqual(m('zzz'), undefined); assert.strictEqual(m('  '), undefined);
}
{ // batch picker search
  const bs = []; for (let n = 1; n <= 120; n++) bs.push({ id: 'BATCH-' + String(n).padStart(3, '0'), num: n, store: n % 2 ? 'SHEIN' : 'ZARA' });
  const ids = (q) => L.batchSearch(bs, q).map((x) => x.b.id);
  assert.strictEqual(ids('').length, 120); assert.strictEqual(ids('')[0], 'BATCH-120', 'newest first');
  assert.deepStrictEqual(ids('007'), ['BATCH-007']); assert.strictEqual(ids('7')[0], 'BATCH-117', 'ends with 7, newest first'); assert.ok(ids('7').includes('BATCH-070'), 'then the ones that contain it');
  assert.strictEqual(ids('07')[0], 'BATCH-107'); assert.strictEqual(ids('07')[1], 'BATCH-007'); assert.ok(ids('07').includes('BATCH-075'));
  assert.deepStrictEqual(ids('batch-007'), ['BATCH-007'], 'the whole word works'); assert.deepStrictEqual(ids('BATCH 007'), ['BATCH-007']);
  assert.strictEqual(ids('zara').length, 60); assert.deepStrictEqual(ids('999'), []);
  assert.strictEqual(L.batchSearch(bs, '07')[0].kind, 'ends'); assert.strictEqual(L.batchSearch(bs, '075')[0].kind, 'ends');
}
{ // returning items from an invoice
  const mk = () => { const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 3, currency: 'TTD', totalCost: 90, margin: 100 });
    s.batches.forEach((b) => { b.status = 'Received'; }); s.items.forEach((x, n) => { x.desc = 'T' + n; x.cost = 30; x.price = 100; x.status = 'Available'; x.size = 'M'; }); return s; };
  { // an item whose batch has not arrived goes back on the boat, not onto the shelf
    const s = L.defaultState(); L.createBatch(s, { store: 'X', count: 1, currency: 'TTD', totalCost: 30, margin: 100 }); const i = s.items[0]; i.desc = 'T'; i.cost = 30; i.price = 100;
    const a = L.createInvoice(s, { itemIds: [i.id], client: 'Jo', isNew: true, paying: 100, date: new Date('2026-11-01T12:00:00') }); L.returnItems(s, a.no, [i.id]); assert.strictEqual(i.status, 'In Transit');
  }
  { // whole purchase, with a payment chain
    const s = mk(), a = L.createInvoice(s, { itemIds: [s.items[0].id, s.items[1].id], client: 'Jo', isNew: true, paying: 50, date: new Date('2026-11-01T12:00:00') });
    const b = L.recordPayment(s, a.no, 30, new Date('2026-11-02T12:00:00'));
    const pv = L.returnPreview(s, a.no, [s.items[0].id, s.items[1].id]); assert.strictEqual(pv.all, true); assert.strictEqual(pv.paid, 80);
    const r = L.returnItems(s, a.no, [s.items[0].id, s.items[1].id]); assert.strictEqual(r.all, true); assert.strictEqual(r.refund, 80);
    assert.strictEqual(s.invoices.length, 0, 'every invoice in the chain is gone'); assert.ok(s.items.slice(0, 2).every((i) => i.status === 'Available' && !i.invoice && !i.customer && i.sold === 0));
    assert.strictEqual(L.customerStats(s).filter((c) => c.name === 'Jo').length === 0 || L.customerStats(s).filter((c) => c.name === 'Jo')[0].owing === 0, true);
  }
  { // one of two returned: customer had paid in full -> refund due, no tip, no profit from the refund
    const s = mk(), a = L.createInvoice(s, { itemIds: [s.items[0].id, s.items[1].id], client: 'Jo', isNew: true, paying: 200, date: new Date('2026-11-01T12:00:00') });
    const pv = L.returnPreview(s, a.no, [s.items[0].id]); assert.strictEqual(pv.refund, 100); assert.strictEqual(pv.newTotal, 100);
    const r = L.returnItems(s, a.no, [s.items[0].id]); assert.strictEqual(r.all, false); assert.strictEqual(r.refund, 100);
    const n = s.invoices.find((v) => v.no === r.invoice); assert.strictEqual(n.total, 100); assert.strictEqual(n.refundDue, 100); assert.strictEqual(n.tip, 0); assert.strictEqual(n.balance, 0);
    assert.strictEqual(s.invoices.find((v) => v.no === a.no).updatedBy, n.no, 'the old invoice is kept and marked Updated');
    assert.strictEqual(s.items[0].status, 'Available'); assert.strictEqual(s.items[1].status, 'Paid'); assert.strictEqual(s.items[1].invoice, n.no);
  }
  { // one of two returned, only part paid: nothing to refund, balance shrinks
    const s = mk(), a = L.createInvoice(s, { itemIds: [s.items[0].id, s.items[1].id], client: 'Jo', isNew: true, paying: 50, date: new Date('2026-11-01T12:00:00') });
    const r = L.returnItems(s, a.no, [s.items[1].id]); const n = s.invoices.find((v) => v.no === r.invoice);
    assert.strictEqual(r.refund, 0); assert.strictEqual(n.total, 100); assert.strictEqual(n.balance, 50); assert.strictEqual(n.refundDue || 0, 0); assert.strictEqual(s.items[0].status, 'Owing');
  }
  { // delivery stays on the purchase when the item that carried it is returned
    const s = mk(); s.items[0].delivery = 40;
    const a = L.createInvoice(s, { itemIds: [s.items[0].id, s.items[1].id], client: 'Jo', isNew: true, paying: 240, date: new Date('2026-11-01T12:00:00') });
    const r = L.returnItems(s, a.no, [s.items[0].id]); const n = s.invoices.find((v) => v.no === r.invoice);
    assert.strictEqual(n.delivery, 40); assert.strictEqual(n.total, 140); assert.strictEqual(r.refund, 100);
  }
  assert.throws(() => L.returnItems(mk(), 'NOPE', ['x']));
}

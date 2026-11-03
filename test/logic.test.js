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
  assert.equal(L.customerStats(s)[0].owing, 0);          // before: missing data
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
  const f = { ...it }; L2.prefillSold(f); assert.strictEqual(f.sold, 0, 'on sale: Sold for stays empty');
  const g = { ...it, saleOn: false }; L2.prefillSold(g); assert.strictEqual(g.sold, 300, 'no sale: Sold for starts as the selling price');
  const b = { rate: 7, totalCost: 25.6, clearingPaid: 0, margin: 100 };
  const c1 = L2.itemCalc(b, it), c2 = L2.itemCalc(b, { ...it, saleOn: false });
  assert(c1.profit < c2.profit, 'projected profit uses the sale price when a sale is on');
}
console.log('sale price tests passed');

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
  assert.throws(() => L.createBatch(s, { count: 0 }));
})();

// invoice: full payment, then an overpayment tip, then a partial-pay chain
(() => {
  const s = fresh();
  const b = L.createBatch(s, { store: 'X', count: 3, totalCost: 100, currency: 'TTD', margin: 100 });
  s.items.forEach((i, n) => { i.cost = [20, 30, 50][n]; i.desc = 'Item ' + n; i.sold = [100, 100, 200][n]; i.status = 'Available'; });
  // partial payment on items 0+1: sold 200, landed 50, paying 120 => profit 70, owing 80
  let inv = L.createInvoice(s, { itemIds: ['001-001', '001-002'], client: 'Ann', paying: 120 });
  assert.equal(inv.no, 'INV00001'); assert.equal(inv.balance, 80); assert.equal(inv.profit, 70);
  assert.equal(L.invoiceStatus(inv), 'Owing'); assert.equal(s.items[0].status, 'Owing');
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
})();

// import from the real workbook if a dump is available
const fs = require('fs'), path = process.env.WORKBOOK_JSON;
if (path && fs.existsSync(path)) {
  const s = L.importWorkbook(JSON.parse(fs.readFileSync(path, 'utf8')));
  assert.equal(s.batches.length, 2); assert.equal(s.items.length, 72);
  assert.equal(s.batches[1].currency, 'USD'); near(s.batches[1].totalCost, 201.17); near(s.batches[0].totalCost, 539.21);
  assert.ok(s.invoices.length >= 27);
  const st = L.batchStats(s, s.batches[1]);
  console.log('imported', s.batches.length, 'batches', s.items.length, 'items', s.invoices.length, 'invoices',
    'batch2 profit', Math.round(st.profit), 'margin', s.batches[1].margin, 'owing', L.totals(s).owing);
}
console.log('all tests passed');

/**
 * Business logic for the buy & sell tracker.
 * Ported from the Google Sheets / Apps Script workflow (batches -> items -> invoices).
 * Pure functions only: no DOM access, so it runs in the browser and in Node tests.
 */
(function (root) {
  const L = {};
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  L.r2 = r2;

  L.CURRENCIES = {
    USD: { name: 'US Dollar', symbol: '$' },
    EUR: { name: 'Euro', symbol: '€' },
    GBP: { name: 'British Pound', symbol: '£' },
    TTD: { name: 'TT Dollar', symbol: 'TT$' },
  };

  L.defaultState = () => ({
    version: 1,
    settings: {
      year: new Date().getFullYear(),
      markup: 1.025, // effective rate = market rate * markup (the sheet's G30 = F30 * 1.025)
      defaultMargin: 100,
      rates: { USD: 6.78, EUR: 7.61, GBP: 9.09, TTD: 1 },
    },
    batches: [], items: [], invoices: [], customers: [],
  });

  L.effectiveRate = (s, code) => (code === 'TTD' ? 1 : (s.settings.rates[code] || 0) * s.settings.markup);

  /* ---------- batches & items ---------- */

  L.createBatch = (s, { store, count, totalCost, currency, margin, date }) => {
    count = parseInt(count, 10);
    if (!(count > 0)) throw new Error('Enter a valid number of items.');
    const num_ = s.batches.reduce((m, b) => Math.max(m, b.num), 0) + 1;
    const pad = String(num_).padStart(3, '0');
    const batch = {
      id: 'BATCH-' + pad, num: num_, store: store || '', currency: currency || 'USD',
      totalCost: num(totalCost), rate: L.effectiveRate(s, currency || 'USD'),
      margin: num(margin), clearingPaid: 0, status: 'In Transit',
      datePurchased: (date || new Date()).toISOString(), dateReceived: null, dateLastPayment: null,
    };
    s.batches.push(batch);
    for (let i = 1; i <= count; i++) {
      s.items.push({ id: pad + '-' + String(i).padStart(3, '0'), batchId: batch.id, store: batch.store,
        desc: '', cost: 0, sold: 0, status: 'In Transit', customer: '', delivery: 0, invoice: '' });
    }
    return batch;
  };

  // Status mirrors updateBatchLog: Closed stays Closed, otherwise In Transit while any item is, else Received.
  L.batchStatus = (s, b) => (b.status === 'Closed' ? 'Closed'
    : s.items.some((i) => i.batchId === b.id && i.status === 'In Transit') ? 'In Transit' : 'Received');

  // "Close batch" (script's dual-checkbox action): keeps history; unsold items become Closed.
  L.closeBatch = (s, id) => {
    const b = s.batches.find((x) => x.id === id);
    if (!b) throw new Error('Batch not found.');
    b.status = 'Closed';
    s.items.forEach((i) => { if (i.batchId === id && i.status !== 'Paid' && i.status !== 'Owing') i.status = 'Closed'; });
  };

  // Permanent delete is only for batches created by mistake (nothing sold from them).
  L.deleteBatch = (s, id) => {
    if (s.items.some((i) => i.batchId === id && i.invoice)) throw new Error('This batch has invoiced items. Close it instead.');
    s.batches = s.batches.filter((b) => b.id !== id);
    s.items = s.items.filter((i) => i.batchId !== id);
  };

  L.payClearing = (s, id, amount, date) => {
    const b = s.batches.find((x) => x.id === id);
    amount = num(amount);
    if (!b) throw new Error('Batch not found.');
    if (!(amount > 0)) throw new Error('Enter a payment amount greater than 0.');
    b.clearingPaid = r2(b.clearingPaid + amount);
    b.dateLastPayment = (date || new Date()).toISOString();
    return b;
  };

  L.makeAvailable = (s, id, date) => {
    const b = s.batches.find((x) => x.id === id);
    if (!b) throw new Error('Batch not found.');
    b.dateReceived = b.dateReceived || (date || new Date()).toISOString();
    let n = 0;
    s.items.forEach((i) => { if (i.batchId === id && i.status === 'In Transit') { i.status = 'Available'; n++; } });
    return n;
  };

  // Per-item derived money, mirroring the Inventory Log formulas.
  L.itemCalc = (b, it) => {
    const cost = num(it.cost);
    if (!b || cost <= 0) return { costTTD: 0, clearing: 0, landed: 0, recommended: 0, profit: 0 };
    const costTTD = cost * b.rate;
    const totalTTD = b.totalCost * b.rate;
    const clearing = b.clearingPaid > 0 && totalTTD > 0 ? (b.clearingPaid / totalTTD) * costTTD : 0;
    const landed = costTTD + clearing;
    const recommended = landed * (1 + b.margin / 100);
    const sold = num(it.sold);
    return { costTTD, clearing, landed, recommended, profit: sold > 0 ? sold - landed : recommended - landed };
  };

  L.batchStats = (s, b) => {
    const items = s.items.filter((i) => i.batchId === b.id);
    let sales = 0, profit = 0, sold = 0, left = 0;
    items.forEach((i) => {
      const c = L.itemCalc(b, i);
      sales += num(i.sold);
      profit += c.profit;
      if (i.status === 'Paid' || i.status === 'Owing') sold++;
      if (i.status === 'Available') left++;
    });
    const costTTD = b.totalCost * b.rate;
    return { count: items.length, sold, left, sales, profit, costTTD, investment: costTTD + b.clearingPaid,
      clearingPct: costTTD > 0 ? b.clearingPaid / costTTD : 0 };
  };

  L.timeInTransit = (b, now) => {
    const end = b.dateLastPayment ? new Date(b.dateLastPayment) : (now || new Date());
    let days = Math.max(0, Math.floor((end - new Date(b.datePurchased)) / 86400000));
    const mos = Math.floor(days / 30); days -= mos * 30;
    const wks = Math.floor(days / 7); days -= wks * 7;
    return `${mos} mos, ${wks} wks, ${days} days`;
  };

  /* ---------- invoices ---------- */

  L.nextInvoiceNo = (s) => {
    const max = s.invoices.reduce((m, i) => Math.max(m, parseInt(String(i.no).replace(/\D/g, ''), 10) || 0), 0);
    return 'INV' + String(max + 1).padStart(5, '0');
  };

  // Spread an invoice's cash (amount paid + previously paid) over its items in order, capped at each sold price
  // (updateItemLog's waterfall). Delivery is not allocated. Item is Paid when nothing is left owing on it.
  L.applyWaterfall = (s, no) => {
    const inv = s.invoices.find((v) => v.no === no);
    let pool = inv ? num(inv.amountPaid) + num(inv.previouslyPaid) : 0;
    s.items.filter((i) => i.invoice === no).forEach((i) => {
      const cap = num(i.sold), paid = pool > 0 && cap > 0 ? Math.min(pool, cap) : 0;
      pool -= paid;
      i.paid = r2(paid); i.owing = r2(Math.max(0, cap - paid));
      i.status = i.owing === 0 ? 'Paid' : 'Owing';
    });
  };

  // Bring data saved by an older version up to date (idempotent): recompute per-item paid/owing.
  L.migrate = (s) => {
    if (s.items.some((i) => i.invoice && i.paid === undefined)) {
      new Set(s.items.map((i) => i.invoice).filter(Boolean)).forEach((no) => L.applyWaterfall(s, no));
    }
    return s;
  };

  L.invoiceStatus = (inv) => (inv.updatedBy ? 'Updated' : inv.balance > 0 ? 'Owing' : 'Paid');

  /**
   * Work out everything an invoice would contain without saving it.
   * Rules follow generateInvoiceFromO2: the largest delivery fee wins, payments already made on an
   * invoice this one replaces carry over, overpayment becomes a tip, and a tip that exceeds profit
   * turns into a loss (profit is floored at 0).
   */
  L.previewInvoice = (s, { itemIds, client, paying }) => {
    const items = itemIds.map((id) => s.items.find((i) => i.id === id)).filter(Boolean);
    const errors = [];
    paying = num(paying);
    if (!items.length) errors.push('Select at least one item.');
    if (!String(client || '').trim()) errors.push('Enter or choose a customer.');
    if (items.some((i) => !i.desc.trim())) errors.push('Every selected item needs a description.');
    if (items.some((i) => num(i.sold) <= 0)) errors.push('Every selected item needs a "Sold For" price.');
    if (items.length && paying <= 0) errors.push('Enter the amount paying.');

    const landed = items.reduce((t, i) => t + L.itemCalc(s.batches.find((b) => b.id === i.batchId), i).landed, 0);
    const totalSold = items.reduce((t, i) => t + num(i.sold), 0);
    const delivery = items.reduce((m, i) => Math.max(m, num(i.delivery)), 0);
    const ref = (items.find((i) => i.invoice) || {}).invoice || '';
    const refInv = ref ? s.invoices.find((v) => v.no === ref) : null;
    const prev = refInv ? num(refInv.previouslyPaid) + num(refInv.amountPaid) : 0;

    const total = totalSold + delivery;
    const raw = total - (paying + prev);
    const tip = raw < 0 ? -raw : 0;
    const balance = raw < 0 ? 0 : raw;

    let k;
    if (prev === 0) k = paying - landed;
    else if (prev >= landed) k = paying;
    else k = paying + prev - landed;
    const temp = k - tip;
    const profit = temp < 0 ? 0 : temp;
    const loss = temp < 0 ? temp : 0;

    const groups = {};
    items.forEach((i) => {
      const key = i.desc + '|' + i.sold;
      (groups[key] = groups[key] || { desc: i.desc.trim(), price: num(i.sold), qty: 0 }).qty++;
    });
    return { errors, items, lines: Object.values(groups), totalSold, delivery, total, paying, prev, balance, tip,
      profit: r2(profit), loss: r2(loss), landed, ref, status: paying + prev >= total ? 'Paid' : 'Owing' };
  };

  L.createInvoice = (s, { itemIds, client, isNew, paying, date }) => {
    const p = L.previewInvoice(s, { itemIds, client, paying });
    if (p.errors.length) throw new Error(p.errors[0]);
    client = client.trim();
    const d = date || new Date();
    const due = new Date(d); due.setDate(due.getDate() + 7);
    const inv = {
      no: L.nextInvoiceNo(s), client, desc: p.lines.map((l) => l.desc).join(', '), lines: p.lines,
      total: r2(p.total), amountPaid: r2(p.paying), previouslyPaid: r2(p.prev), balance: r2(p.balance),
      delivery: r2(p.delivery), date: d.toISOString(), due: due.toISOString(),
      qty: p.items.length, ref: p.ref, profit: p.profit, loss: p.loss, tip: r2(p.tip), updatedBy: '',
    };
    if (p.ref) { const old = s.invoices.find((v) => v.no === p.ref); if (old) old.updatedBy = inv.no; }
    s.invoices.push(inv);
    p.items.forEach((i) => { i.invoice = inv.no; i.customer = client; });
    L.applyWaterfall(s, inv.no);
    if (!s.customers.includes(client)) s.customers.push(client);
    return inv;
  };

  L.deleteInvoice = (s, no) => {
    const inv = s.invoices.find((v) => v.no === no);
    if (!inv) return;
    s.items.forEach((i) => { if (i.invoice === no) { i.invoice = inv.ref || ''; if (!inv.ref) { i.status = 'Available'; i.customer = ''; } } });
    s.invoices.forEach((v) => { if (v.updatedBy === no) v.updatedBy = ''; });
    s.invoices = s.invoices.filter((v) => v.no !== no);
    if (inv.ref) L.applyWaterfall(s, inv.ref);
  };

  /* ---------- reports ---------- */

  // Mirrors updateCustomerLog: owing/sales come from per-item paid/owing, profit sums the invoice Profit column.
  L.customerStats = (s) => {
    const names = new Set(s.customers);
    s.items.forEach((i) => i.customer && names.add(i.customer));
    s.invoices.forEach((v) => names.add(v.client));
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b)).map((name) => {
      const items = s.items.filter((i) => i.customer === name); // any item tagged with the customer counts as bought
      const last = items.filter((i) => i.invoice).slice().sort((a, b) => invDate(s, b) - invDate(s, a))[0];
      const owing = items.reduce((t, i) => t + num(i.owing), 0);
      return { name, owing: r2(owing), status: owing > 0 ? 'Owing' : 'Up to date',
        sales: r2(items.reduce((t, i) => t + num(i.paid), 0)), bought: items.length,
        itemsOwing: items.filter((i) => i.status === 'Owing').length,
        profit: r2(s.invoices.filter((v) => v.client === name).reduce((t, v) => t + num(v.profit), 0)),
        lastItem: last ? last.desc : '', lastDate: last ? invDate(s, last) : null };
    });
  };
  const invDate = (s, item) => { const v = s.invoices.find((x) => x.no === item.invoice); return v ? new Date(v.date) : new Date(0); };

  L.monthlySummary = (s, year) => {
    const m = Array.from({ length: 12 }, () => ({ expense: 0, sales: 0, profit: 0 }));
    s.batches.forEach((b) => {
      const d = new Date(b.datePurchased);
      if (d.getFullYear() === year) m[d.getMonth()].expense += b.totalCost * b.rate + b.clearingPaid;
    });
    s.invoices.forEach((v) => {
      const d = new Date(v.date);
      if (d.getFullYear() === year) { m[d.getMonth()].sales += v.amountPaid; m[d.getMonth()].profit += v.profit + v.loss; }
    });
    return m;
  };

  L.totals = (s) => {
    const owing = L.customerStats(s).reduce((t, c) => t + c.owing, 0);
    const expense = s.batches.reduce((t, b) => t + b.totalCost * b.rate + b.clearingPaid, 0);
    const sales = s.invoices.reduce((t, v) => t + v.amountPaid, 0);
    // profit on items that have actually sold (sold price - landed cost); unsold stock is not counted
    const profit = s.items.reduce((t, i) => {
      if (i.status !== 'Paid' && i.status !== 'Owing') return t;
      const c = L.itemCalc(s.batches.find((b) => b.id === i.batchId), i);
      return c.landed ? t + num(i.sold) - c.landed : t;
    }, 0);
    return { owing: r2(owing), expense: r2(expense), sales: r2(sales), profit: r2(profit),
      available: s.items.filter((i) => i.status === 'Available').length,
      inTransit: s.items.filter((i) => i.status === 'In Transit').length };
  };

  /* ---------- import from the Google Sheets workbook ---------- */

  const asDate = (v) => { const d = v instanceof Date ? v : new Date(v); return isNaN(d) ? null : d; };

  /**
   * sheets: { 'Batch Log': rows[][], 'Hidden Master Log': rows[][], 'Invoice Log': rows[][] } (raw cell values)
   */
  L.importWorkbook = (sheets) => {
    const s = L.defaultState();
    const hidden = (sheets['Hidden Master Log'] || []).slice(1).filter((r) => r[0] && String(r[0]).startsWith('BATCH-'));
    const logs = (sheets['Batch Log'] || []).slice(2).filter((r) => r[0] && String(r[0]).startsWith('BATCH-'));
    logs.forEach((r) => {
      const rows = hidden.filter((h) => h[0] === r[0]);
      const first = rows[0] || [];
      const cost = String(r[4] || '').match(/[\d,]+\.?\d*/);
      const j = num(first[9]), k = num(first[10]);
      s.batches.push({
        id: r[0], num: parseInt(String(r[0]).replace(/\D/g, ''), 10), store: r[1] || '',
        currency: first[22] || 'USD', totalCost: cost ? num(cost[0].replace(/,/g, '')) : num(first[19]),
        rate: num(r[5]), margin: j > 0 ? Math.round((k / j - 1) * 100) : s.settings.defaultMargin,
        clearingPaid: num(r[7]), status: r[3] === 'Closed' ? 'Closed' : r[3] === 'Received' ? 'Received' : 'In Transit',
        datePurchased: (asDate(r[2]) || new Date()).toISOString(),
        dateReceived: asDate(r[14]) ? asDate(r[14]).toISOString() : null,
        dateLastPayment: asDate(first[21]) ? asDate(first[21]).toISOString() : null,
      });
    });
    hidden.forEach((h) => s.items.push({
      id: String(h[1]), batchId: h[0], store: h[3] || '', desc: h[4] || '', cost: num(h[5]), sold: num(h[11]),
      status: h[13] || 'In Transit', customer: String(h[14] || h[15] || '').trim().replace(/^-$/, ''),
      delivery: num(h[16]), invoice: h[18] || '',
    }));
    (sheets['Invoice Log'] || []).slice(2).filter((r) => /^INV\d+/.test(String(r[0] || ''))).forEach((r) => {
      const lines = String(r[2] || '').split(',').map((x) => x.trim()).filter(Boolean);
      s.invoices.push({
        no: r[0], client: String(r[1] || '').trim(), desc: r[2] || '', lines: [], total: num(r[4]), amountPaid: num(r[5]),
        previouslyPaid: num(r[6]), balance: num(r[7]), delivery: num(r[8]),
        date: (asDate(r[9]) || new Date()).toISOString(), due: (asDate(r[10]) || new Date()).toISOString(),
        qty: num(r[11]) || lines.length, ref: '', updatedBy: r[12] || '', profit: num(r[13]), loss: num(r[14]), tip: num(r[15]),
      });
    });
    s.invoices.forEach((v) => { if (v.updatedBy) { const n = s.invoices.find((x) => x.no === v.updatedBy); if (n) n.ref = v.no; } });
    s.invoices.forEach((v) => { // rebuild line items from the items tagged with each invoice
      const g = {};
      s.items.filter((i) => i.invoice === v.no).forEach((i) => { (g[i.desc + '|' + i.sold] = g[i.desc + '|' + i.sold] || { desc: i.desc.trim(), price: i.sold, qty: 0 }).qty++; });
      v.lines = Object.values(g);
    });
    new Set(s.items.map((i) => i.invoice).filter(Boolean)).forEach((no) => L.applyWaterfall(s, no));
    const names = new Set();
    (sheets['Batch Log'] || []).slice(2).forEach((r) => { const n = String(r[25] || '').trim(); if (n) names.add(n); });
    s.items.forEach((i) => i.customer && names.add(i.customer));
    s.customers = [...names];
    return s;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.Logic = L;
})(typeof window !== 'undefined' ? window : globalThis);

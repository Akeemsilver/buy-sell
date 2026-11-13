/**
 * Business logic for the buy & sell tracker.
 * Ported from the Google Sheets / Apps Script workflow (batches -> items -> invoices).
 * Pure functions only: no DOM access, so it runs in the browser and in Node tests.
 */
(function (root) {
  const L = {};
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const num = (v) => { const n = parseFloat(typeof v === 'string' ? v.replace(',', '.') : v); return isNaN(n) ? 0 : n; };   // a decimal comma counts as a point
  // Errors carry a code; the app translates it (i18n key 'err.<code>') so messages exist in English and Spanish.
  const fail = (code) => { const e = new Error(code); e.code = code; return e; };
  L.r2 = r2;

  /* ---------- names ---------- */

  // Collapse runs of spaces/tabs and trim: "Renimar " -> "Renimar"
  L.cleanName = (v) => { const n = String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); return n === '-' ? '' : n; };

  // The spelling already used for this person (case-insensitive), otherwise the cleaned name.
  L.canonicalName = (s, raw) => {
    const n = L.cleanName(raw), k = n.toLowerCase();
    if (!n) return '';
    const known = [...s.customers, ...s.items.map((i) => i.customer), ...s.invoices.map((v) => v.client)].map(L.cleanName);
    return known.find((x) => x.toLowerCase() === k) || n;
  };

  // Clean every stored name and merge customers that differ only by spaces/case (most common spelling wins; a capitalised one beats a tie).
  // Idempotent and cheap; returns true if anything changed.
  L.cleanNames = (s) => {
    let changed = false;
    const set = (o, k, v) => { if (o[k] !== v) { o[k] = v; changed = true; } };
    const counts = {};
    const note = (raw) => { const n = L.cleanName(raw); if (!n) return; const m = (counts[n.toLowerCase()] = counts[n.toLowerCase()] || {}); m[n] = (m[n] || 0) + 1; };
    s.items.forEach((i) => note(i.customer)); s.invoices.forEach((v) => note(v.client)); s.customers.forEach(note);
    const canon = {};
    Object.keys(counts).forEach((k) => { canon[k] = Object.entries(counts[k]).sort((a, b) => b[1] - a[1] || (/^[A-Z]/.test(b[0]) - /^[A-Z]/.test(a[0])) || a[0].localeCompare(b[0]))[0][0]; });
    const fix = (raw) => { const n = L.cleanName(raw); return n ? canon[n.toLowerCase()] : ''; };
    s.items.forEach((i) => { set(i, 'customer', fix(i.customer)); set(i, 'desc', L.cleanName(i.desc)); set(i, 'store', L.cleanName(i.store)); });
    s.invoices.forEach((v) => {
      set(v, 'client', fix(v.client)); set(v, 'desc', L.cleanName(v.desc));
      (v.lines || []).forEach((l) => set(l, 'desc', L.cleanName(l.desc)));
    });
    s.batches.forEach((b) => set(b, 'store', L.cleanName(b.store)));
    const list = [...new Set(s.customers.map(fix).filter(Boolean))];
    if (list.length !== s.customers.length || list.some((n, i) => n !== s.customers[i])) { s.customers = list; changed = true; }
    return changed;
  };

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
    if (!(count > 0)) throw fail('count');
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
        desc: '', cost: 0, sold: 0, price: 0, photo: null, status: 'In Transit', customer: '', delivery: 0, invoice: '' });
    }
    return batch;
  };

  // Status mirrors updateBatchLog: Closed stays Closed, otherwise In Transit while any item is, else Received.
  L.batchStatus = (s, b) => (b.status === 'Closed' ? 'Closed'
    : s.items.some((i) => i.batchId === b.id && i.status === 'In Transit') ? 'In Transit' : 'Received');

  // "Close batch" (script's dual-checkbox action): keeps history; unsold items become Closed.
  L.closeBatch = (s, id) => {
    const b = s.batches.find((x) => x.id === id);
    if (!b) throw fail('batch');
    b.status = 'Closed';
    s.items.forEach((i) => { if (i.batchId === id && i.status !== 'Paid' && i.status !== 'Owing') i.status = 'Closed'; });
  };

  // Permanent delete is only for batches created by mistake (nothing sold from them).
  L.deleteBatch = (s, id) => {
    if (s.items.some((i) => i.batchId === id && i.invoice)) throw fail('hasInvoiced');
    s.batches = s.batches.filter((b) => b.id !== id);
    s.items = s.items.filter((i) => i.batchId !== id);
  };

  L.payClearing = (s, id, amount, date) => {
    const b = s.batches.find((x) => x.id === id);
    amount = num(amount);
    if (!b) throw fail('batch');
    if (!(amount > 0)) throw fail('payment');
    b.clearingPaid = r2(b.clearingPaid + amount);
    b.dateLastPayment = (date || new Date()).toISOString();
    return b;
  };

  L.makeAvailable = (s, id, date) => {
    const b = s.batches.find((x) => x.id === id);
    if (!b) throw fail('batch');
    b.dateReceived = b.dateReceived || (date || new Date()).toISOString();
    let n = 0;
    s.items.forEach((i) => { if (i.batchId === id && i.status === 'In Transit') { i.status = 'Available'; n++; } });
    return n;
  };

  // Per-item derived money, mirroring the Inventory Log formulas.
  // Every step is rounded to the cent so what is shown always adds up: cost + clearing = landed, landed x (1 + margin) = recommended.
  L.itemCalc = (b, it) => {
    const cost = num(it.cost);
    if (!b || cost <= 0) return { costTTD: 0, clearing: 0, landed: 0, recommended: 0, paid: 0, profitSoFar: 0, profit: 0 };
    const rawTTD = cost * b.rate, totalTTD = b.totalCost * b.rate;
    const costTTD = r2(rawTTD);
    const clearing = b.clearingPaid > 0 && totalTTD > 0 ? r2((b.clearingPaid / totalTTD) * rawTTD) : 0;
    const landed = r2(costTTD + clearing);
    const recommended = r2(landed * (1 + b.margin / 100));
    const sold = num(it.sold);
    // paid: the cash received so far for this item (spread over the invoice's items in order); profitSoFar: what that cash leaves after the landed cost (negative while the cost is not covered yet)
    const paid = num(it.paid);
    return { costTTD, clearing, landed, recommended, paid, profitSoFar: r2(paid - landed), profit: r2((sold > 0 ? sold : L.salePrice(it) > 0 ? L.salePrice(it) : num(it.price) > 0 ? num(it.price) : recommended) - landed) };   // sold for, else the selling price, else the recommended price
  };

  /* ---------- photos, selling price and what customers may see ---------- */

  // Only these fields ever leave the app when an item is shared. Costs, landed cost, margin, recommended price are never in here.
  // A sale takes a percentage (1-99) off the selling price. It is active only when it is switched on, a percentage is set and there is a selling price.
  L.saleActive = (it) => !!it.saleOn && num(it.discount) >= 1 && num(it.discount) <= 99 && num(it.price) > 0;
  L.salePrice = (it) => (L.saleActive(it) ? r2(num(it.price) * (1 - num(it.discount) / 100)) : 0);
  L.publicView = (it) => ({ id: it.id, name: String(it.desc || '').trim(), price: num(it.price) > 0 ? r2(num(it.price)) : 0, salePrice: L.salePrice(it), discount: L.saleActive(it) ? Math.round(num(it.discount) * 100) / 100 : 0 });

  // A photo may be shared only after it has been cropped and checked.
  L.shareStatus = (it) => (!it.photo ? 'noPhoto' : it.photo.noFull ? 'gone' : it.photo.checked ? 'ok' : 'notChecked');

  /* ---------- photo storage plan ----------
     Original screenshot: kept for `keep` days after the photo is saved ('sold' = until the item is sold), and dropped the moment the item is sold.
     Saved (cropped) photo: kept PHOTO_HOLD_DAYS after the sale (the return window). The small thumbnail stays for good. */
  L.PHOTO_HOLD_DAYS = 7;
  const DAY = 864e5;
  L.soldAt = (s, it) => { const v = it.invoice && s.invoices.find((x) => x.no === it.invoice); const d = v && v.date ? new Date(v.date).getTime() : NaN; return isNaN(d) ? null : d; };
  // Days left to open the full photo of a sold item (null when not sold, or no clock to read).
  L.photoDaysLeft = (s, it, now) => { if (!it.photo || it.photo.noFull || !L.isSold(it)) return null; const at = L.soldAt(s, it); return at == null ? null : Math.max(0, Math.ceil((at + L.PHOTO_HOLD_DAYS * DAY - now) / DAY)); };
  // Sold items whose sale was more than `days` ago and that still have a picture: the thumbnails the owner may choose to remove.
  // Unsold stock and sales without a date are never listed.
  L.oldThumbItems = (s, now, days) => {
    const old = s.items.filter((it) => { if (!it.photo || !L.isSold(it)) return false; const at = L.soldAt(s, it); return at != null && now - at >= (days || 365) * DAY; }), ids = new Set(old.map((x) => x.id));
    return old.filter((it) => s.items.every((x) => x === it || !x.photo || x.photo.id !== it.photo.id || ids.has(x.id)));   // a picture other items still use is never listed
  };
  // What to delete now. stamp = checked photos that have no saved time yet (they start their timer today).
  L.photoSweepPlan = (s, now, keep) => {
    const plan = { dropOrig: [], dropFull: [], stamp: [] };
    s.items.forEach((it) => {
      const p = it.photo; if (!p) return;
      if (L.isSold(it)) {
        if (!p.noOrig) plan.dropOrig.push(it.id);
        const at = L.soldAt(s, it); if (!p.noFull && at != null && now >= at + L.PHOTO_HOLD_DAYS * DAY) plan.dropFull.push(it.id);
      } else if (p.checked && !p.noOrig && keep !== 'sold') {
        if (!p.savedAt) plan.stamp.push(it.id); else if (now >= p.savedAt + Number(keep || 2) * DAY) plan.dropOrig.push(it.id);
      }
    });
    // Copies of one design share a picture: it is only dropped when every item that uses it is ready to drop it.
    const shared = (list, flag) => { const set = new Set(list); return list.filter((id) => { const it = s.items.find((x) => x.id === id); return s.items.every((x) => !x.photo || x.photo.id !== it.photo.id || set.has(x.id) || x.photo[flag]); }); };
    plan.dropOrig = shared(plan.dropOrig, 'noOrig'); plan.dropFull = shared(plan.dropFull, 'noFull');
    return plan;
  };

  L.photoStats = (s, batchId) => {
    const items = s.items.filter((i) => !batchId || i.batchId === batchId);
    const withPhoto = items.filter((i) => i.photo);
    return { total: items.length, withPhoto: withPhoto.length, noPhoto: items.length - withPhoto.length, needCheck: withPhoto.filter((i) => !i.photo.checked).length };
  };

  // New photos go to the next items of the batch that have none, in item order. Returns what was assigned and how many photos did not fit.
  // A sold item (on an invoice, paid or owing) is locked until it is returned.
  L.isSold = (i) => i.status === 'Paid' || i.status === 'Owing';
  L.assignPhotos = (s, batchId, photoIds) => {
    const free = s.items.filter((i) => i.batchId === batchId && !i.photo && !L.isSold(i)).sort((a, b) => a.id.localeCompare(b.id));
    const assigned = [];
    photoIds.slice(0, free.length).forEach((id, n) => { free[n].photo = { id, checked: false }; assigned.push({ itemId: free[n].id, photoId: id }); });
    return { assigned, extra: Math.max(0, photoIds.length - free.length) };
  };

  /* ---------- groups: one design, several pieces (each piece is its own item with its own size) ---------- */
  const byId = (a, b) => a.id.localeCompare(b.id);
  L.GROUP_FIELDS = ['desc', 'cost', 'price', 'saleOn', 'discount', 'nameEs', 'esSet', 'esFor', 'enSet', 'enFor', 'details', 'detailsEs'];
  L.newGroupId = (() => { let n = 0; return () => 'G' + Date.now().toString(36) + (++n).toString(36) + Math.floor(Math.random() * 1296).toString(36); })();
  // An item inside an order the owner has not answered yet is held: locked for editing like a sold one (the app fills orderHold from the store orders).
  L.orderHold = new Set();
  L.isHeld = (it) => { const h = L.orderHold; return !!(it && h && h.has && h.has(it.id)); };
  L.isLocked = (it) => L.isSold(it) || L.isHeld(it);
  L.groupOf = (s, it) => (it.grp ? s.items.filter((x) => x.grp === it.grp && !L.isLocked(x)).sort(byId) : [it]);
  // An empty spot in a batch: nothing typed, no picture, not sold, not part of a group.
  L.isEmptySlot = (i) => !L.isSold(i) && !String(i.desc || '').trim() && !(num(i.price) > 0) && !(num(i.cost) > 0) && !i.photo && !i.grp && !String(i.size || '').trim() && !i.invoice && !i.customer;
  L.freeSlots = (s, batchId) => s.items.filter((i) => i.batchId === batchId && L.isEmptySlot(i)).sort(byId);
  // n more pieces of this design, in the next empty spots (the caller adds spots first when there are too few).
  L.makeCopies = (s, srcId, n) => {
    const src = s.items.find((x) => x.id === srcId); if (!src) throw fail('item');
    const free = L.freeSlots(s, src.batchId).filter((x) => x !== src); if (free.length < n) throw fail('slots');
    if (!src.grp) src.grp = L.newGroupId();
    return free.slice(0, n).map((slot) => {
      L.GROUP_FIELDS.forEach((f) => { if (src[f] !== undefined) slot[f] = src[f]; });
      slot.photo = src.photo ? Object.assign({}, src.photo) : null; slot.status = src.status; slot.size = ''; slot.grp = src.grp; return slot;
    });
  };
  // Takes n copies out of the group again (the highest numbers first); they go back to being empty spots.
  L.dropCopies = (s, srcId, n) => {
    const src = s.items.find((x) => x.id === srcId); if (!src || !src.grp) return [];
    const gone = L.groupOf(s, src).filter((x) => x !== src).sort((a, b) => b.id.localeCompare(a.id)).slice(0, n);
    gone.forEach((x) => { ['desc', 'cost', 'price', 'size', 'grp'].forEach((f) => { x[f] = f === 'desc' || f === 'size' || f === 'grp' ? '' : 0; }); ['saleOn', 'discount', 'nameEs', 'esSet', 'esFor', 'details', 'detailsEs'].forEach((f) => { delete x[f]; }); x.photo = null; });
    if (L.groupOf(s, src).length < 2) src.grp = '';
    return gone;
  };
  // A change to name, price, cost or sale reaches every piece of the design.
  L.applyToGroup = (s, it, fields) => { L.groupOf(s, it).forEach((x) => { if (x !== it) (fields || L.GROUP_FIELDS).forEach((f) => { if (it[f] === undefined) delete x[f]; else x[f] = it[f]; }); }); };
  L.splitFromGroup = (s, id) => { const it = s.items.find((x) => x.id === id); if (!it || !it.grp) return; const g = it.grp; it.grp = ''; const rest = s.items.filter((x) => x.grp === g && !L.isSold(x)); if (rest.length < 2) rest.forEach((x) => { x.grp = ''; }); };
  // How many of each size the pieces of this design have: [{ s: 'M', n: 2 }, …] in size order, '' for pieces without a size.
  const SIZES = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '2xl', '3xl', '4xl', '5xl'];
  const sizeRank = (z) => { const k = String(z || '').trim().toLowerCase(); if (!k) return [9, 0, '']; if (k === 'one size' || k === 'talla única') return [8, 0, k]; const i = SIZES.indexOf(k); if (i >= 0) return [0, i, '']; const n = parseFloat(k); return isNaN(n) ? [2, 0, k] : [1, n, k]; };
  L.cmpSize = (a, b) => { const x = sizeRank(a), y = sizeRank(b); return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]); };
  L.sizeCounts = (s, it) => { const m = new Map(); L.groupOf(s, it).forEach((x) => { const z = String(x.size || '').trim(); m.set(z, (m.get(z) || 0) + 1); }); return [...m.entries()].sort((a, b) => L.cmpSize(a[0], b[0])).map(([z, n]) => ({ s: z, n })); };
  // counts = [{ s, n }]: the sizes are handed out to the pieces in item order; they must add up to the number of pieces.
  L.setSizes = (s, it, counts) => {
    const members = L.groupOf(s, it), list = counts.slice().sort((a, b) => L.cmpSize(a.s, b.s)).flatMap((c) => Array(Math.max(0, parseInt(c.n, 10) || 0)).fill(String(c.s).trim()));
    if (list.length !== members.length) throw fail('sizes');
    members.forEach((x, n) => { x.size = list[n]; });
  };
  L.needsSize = (s, it) => L.groupOf(s, it).some((x) => !String(x.size || '').trim());
  // Sale for many pieces at once (sold pieces are left alone). pct 0 or clearSale takes it off.
  L.bulkSale = (s, ids, pct) => { const p = Math.min(99, Math.max(0, Math.round(num(pct) * 100) / 100)); let n = 0; s.items.forEach((x) => { if (ids.includes(x.id) && !L.isSold(x)) { x.saleOn = p > 0; x.discount = p; n++; } }); return n; };
  L.clearSale = (s, ids) => L.bulkSale(s, ids, 0);

  // More photos than plain items: add more items to the batch (same numbering).
  L.addItems = (s, batchId, count) => {
    const b = s.batches.find((x) => x.id === batchId); if (!b) throw fail('batch');
    const mine = s.items.filter((i) => i.batchId === batchId);
    let n = mine.reduce((m, i) => Math.max(m, parseInt(i.id.split('-')[1], 10) || 0), 0);
    const pad = String(b.num).padStart(3, '0'), made = [];
    for (let k = 0; k < count; k++) { n++; const it = { id: pad + '-' + String(n).padStart(3, '0'), batchId, store: b.store, desc: '', cost: 0, sold: 0, price: 0, photo: null, status: b.status === 'Received' ? 'Available' : 'In Transit', customer: '', delivery: 0, invoice: '' }; s.items.push(it); made.push(it); }
    return made;
  };

  // When an item is added to an invoice its "Sold for" starts as your selling price (if you set one and none is filled in).
  // Added to an invoice with no Sold for: it becomes the sale price while a sale is on, otherwise the selling price (if there is one).
  // The price an item sells at: what it was sold for, otherwise the sale price, otherwise its selling price (0 = none set).
  L.effectivePrice = (it) => (num(it.sold) > 0 ? num(it.sold) : L.salePrice(it) || num(it.price) || 0);
  L.prefillSold = (it) => { if (num(it.sold) <= 0) { const v = L.salePrice(it) || num(it.price); if (v > 0) it.sold = r2(v); } return it; };

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
    const investment = costTTD + b.clearingPaid, net = r2(sales - investment);   // net: what sales have earned over what was invested (negative until the investment is back); profit: the expected profit if every item sells at its price
    return { count: items.length, sold, left, sales, profit, net, netPct: investment > 0 ? Math.round(net / investment * 100) : 0, costTTD, investment,
      clearingPct: costTTD > 0 ? b.clearingPaid / costTTD : 0 };
  };

  // What customers still owe for items sold out of these batches: the amount, how many items, how many different people, and how many days
  // the oldest unpaid sale has been waiting (counted from its invoice).
  L.owingFor = (s, batches, now) => {
    const ids = new Set((batches || []).map((b) => b.id)), t = (now || new Date()).getTime(), who = new Set(); let owing = 0, items = 0, oldest = null;
    s.items.forEach((i) => {
      if (!ids.has(i.batchId) || i.status !== 'Owing') return;
      const o = Math.max(0, num(i.sold) - num(i.paid)); if (o <= 0.004) return;
      owing += o; items++; const who1 = String(i.customer || '').trim().toLowerCase(); if (who1) who.add(who1);
      const inv = i.invoice ? (s.invoices || []).find((v) => v.no === i.invoice) : null, d = inv && inv.date ? new Date(inv.date).getTime() : NaN;
      if (!isNaN(d) && (oldest === null || d < oldest)) oldest = d;
    });
    return { owing: r2(owing), items, people: who.size, oldestDays: oldest === null ? null : Math.max(0, Math.floor((t - oldest) / 86400000)) };
  };
  L.batchOwing = (s, b, now) => L.owingFor(s, [b], now);

  // Months/weeks/days between the purchase and the last clearing payment (or today); the app formats it in the chosen language.
  L.transitParts = (b, now) => {
    const end = b.dateLastPayment ? new Date(b.dateLastPayment) : (now || new Date());
    let days = Math.max(0, Math.floor((end - new Date(b.datePurchased)) / 86400000));
    const m = Math.floor(days / 30); days -= m * 30;
    const w = Math.floor(days / 7); days -= w * 7;
    return { m, w, d: days };
  };

  /* ---------- invoices ---------- */

  // Invoice numbers are cemented: they only go up. Returned and cancelled invoices stay in the log, and the running counter
  // (settings.invoiceSeq) also covers any invoice that was ever removed, so a number is never given out twice.
  const invN = (no) => parseInt(String(no).replace(/\D/g, ''), 10) || 0;
  L.nextInvoiceNo = (s) => {
    const max = Math.max(s.invoices.reduce((m, i) => Math.max(m, invN(i.no)), 0), num((s.settings || {}).invoiceSeq));
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
    L.cleanNames(s);
    s.items.forEach((i) => { if (i.price === undefined) i.price = 0; if (i.photo === undefined) i.photo = null; if (i.discount === undefined) i.discount = 0; if (i.saleOn === undefined) i.saleOn = false; });
    if (s.items.some((i) => i.invoice && i.paid === undefined)) {
      new Set(s.items.map((i) => i.invoice).filter(Boolean)).forEach((no) => L.applyWaterfall(s, no));
    }
    return s;
  };

  L.invoiceStatus = (inv) => (inv.void ? (inv.void.kind === 'cancelled' ? 'Cancelled' : 'Returned') : inv.updatedBy ? 'Updated' : inv.balance > 0 ? 'Owing' : 'Paid');

  /**
   * Work out everything an invoice would contain without saving it.
   * Rules follow generateInvoiceFromO2: the largest delivery fee wins, payments already made on an
   * invoice this one replaces carry over, overpayment becomes a tip, and a tip that exceeds profit
   * turns into a loss (profit is floored at 0).
   */
  L.previewInvoice = (s, { itemIds, client, paying, allowZero }) => {
    const items = itemIds.map((id) => s.items.find((i) => i.id === id)).filter(Boolean);
    client = L.canonicalName(s, client);
    const errors = [];
    paying = num(paying);
    if (!items.length) errors.push('noItems');
    if (!client) errors.push('noClient');
    if (items.some((i) => !i.desc.trim())) errors.push('noDesc');
    if (items.some((i) => L.effectivePrice(i) <= 0)) errors.push('noPrice');
    if (items.length && (allowZero ? paying < 0 : paying <= 0)) errors.push('noPaying');

    const landed = items.reduce((t, i) => t + L.itemCalc(s.batches.find((b) => b.id === i.batchId), i).landed, 0);
    const totalSold = items.reduce((t, i) => t + L.effectivePrice(i), 0);
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
      const sz = String(i.size || '').trim(), key = i.desc + '|' + sz + '|' + L.effectivePrice(i);   // a size makes its own line: "Blue dress · M"
      (groups[key] = groups[key] || { desc: i.desc.trim() + (sz ? ' · ' + sz : ''), price: L.effectivePrice(i), qty: 0 }).qty++;
    });
    return { errors, items, lines: Object.values(groups), totalSold, delivery, total, paying, prev, balance, tip,
      profit: r2(profit), loss: r2(loss), landed, ref, status: paying + prev >= total ? 'Paid' : 'Owing' };
  };

  L.createInvoice = (s, { itemIds, client, isNew, paying, date, allowZero }) => {
    const p = L.previewInvoice(s, { itemIds, client, paying, allowZero });
    if (p.errors.length) throw fail(p.errors[0]);
    client = L.canonicalName(s, client);
    const d = date || new Date();
    const due = new Date(d); due.setDate(due.getDate() + 7);
    const inv = {
      no: L.nextInvoiceNo(s), client, desc: p.lines.map((l) => l.desc).join(', '), lines: p.lines,
      total: r2(p.total), amountPaid: r2(p.paying), previouslyPaid: r2(p.prev), balance: r2(p.balance),
      delivery: r2(p.delivery), date: d.toISOString(), due: due.toISOString(),
      qty: p.items.length, ref: p.ref, profit: p.profit, loss: p.loss, tip: r2(p.tip), updatedBy: '',
    };
    if (p.ref) { const old = s.invoices.find((v) => v.no === p.ref); if (old) old.updatedBy = inv.no; }
    s.invoices.push(inv); s.settings = s.settings || {}; s.settings.invoiceSeq = Math.max(num(s.settings.invoiceSeq), invN(inv.no));
    p.items.forEach((i) => { if (num(i.sold) <= 0) i.sold = r2(L.effectivePrice(i)); i.invoice = inv.no; i.customer = client; });
    L.applyWaterfall(s, inv.no);
    if (!s.customers.includes(client)) s.customers.push(client);
    return inv;
  };

  // An item that is sold but has no invoice (imported): put it back in stock.
  L.returnItem = (s, id) => { const i = s.items.find((x) => x.id === id); if (!i) return; i.status = 'Available'; i.customer = ''; i.invoice = ''; i.sold = 0; i.owing = 0; };

  // A later payment on an owing invoice: makes the updated invoice (new number, Previously Paid carried over); the old one is kept and marked Updated.
  L.recordPayment = (s, no, amount, date) => {
    const inv = s.invoices.find((v) => v.no === no); if (!inv) throw fail('noInvoice');
    if (inv.updatedBy) throw fail('alreadyUpdated');
    if (num(amount) > inv.balance + 0.005) throw fail('payTooMuch');
    return L.createInvoice(s, { itemIds: s.items.filter((i) => i.invoice === no).map((i) => i.id), client: inv.client, paying: amount, date });
  };
  // The payments on one purchase, oldest first: an invoice, the invoice that updated it, and so on (each later one points back with `ref`).
  L.invoiceChain = (s, no) => {
    const out = []; let v = s.invoices.find((x) => x.no === no);
    while (v && !out.includes(v)) { out.unshift(v); v = v.ref ? s.invoices.find((x) => x.no === v.ref) : null; }
    return out;
  };
  // What a customer's page lists: only the newest invoice of each purchase (older ones are reached through its payment history).
  L.latestInvoices = (s, name) => s.invoices.filter((v) => v.client === name && !v.updatedBy && !v.void);

  // Change a customer's name everywhere (customers list, items, invoices, location). Typing a name that already exists merges the two.
  // Returns the final name. Changing only the capital letters of the same name is allowed.
  L.renameCustomer = (s, from, to) => {
    const cleaned = L.cleanName(to); if (!cleaned) throw fail('noName');
    const final = cleaned.toLowerCase() === from.toLowerCase() ? cleaned : L.canonicalName(s, cleaned);
    if (final === from) return from;
    s.items.forEach((i) => { if (i.customer === from) i.customer = final; });
    s.invoices.forEach((v) => { if (v.client === from) v.client = final; });
    s.customers = [...new Set(s.customers.map((n) => (n === from ? final : n)))]; if (!s.customers.includes(final)) s.customers.push(final);
    const pl = s.settings.places || {};
    if (pl[from]) { const loc = pl[from]; s.settings.places = Object.assign({}, pl); delete s.settings.places[from]; if (!s.settings.places[final]) s.settings.places[final] = loc; }
    return final;
  };
  // Does another customer already use this name (ignoring capitals and extra spaces)?
  L.otherCustomerNamed = (s, from, to) => { const n = L.cleanName(to).toLowerCase(); return !!n && n !== from.toLowerCase() && L.customerStats(s).some((c) => c.name.toLowerCase() === n); };
  // Where a customer is from (a general area, so you can recognise someone when you forget the name). Kept in settings so it syncs.
  L.place = (s, name) => ((s.settings.places || {})[name] || '').trim();
  L.setPlace = (s, name, value) => { s.settings.places = Object.assign({}, s.settings.places); const v = String(value || '').trim(); if (v) s.settings.places[name] = v; else delete s.settings.places[name]; };

  L.deleteInvoice = (s, no) => {
    const inv = s.invoices.find((v) => v.no === no);
    if (!inv) return;
    s.items.forEach((i) => { if (i.invoice === no) { i.invoice = inv.ref || ''; if (!inv.ref) { i.status = 'Available'; i.customer = ''; } } });
    s.invoices.forEach((v) => { if (v.updatedBy === no) v.updatedBy = ''; });
    s.invoices = s.invoices.filter((v) => v.no !== no); s.settings = s.settings || {}; s.settings.invoiceSeq = Math.max(num(s.settings.invoiceSeq), invN(no));   // the number is never handed out again
    if (inv.ref) L.applyWaterfall(s, inv.ref);
  };

  /* ---------- reports ---------- */

  // Mirrors updateCustomerLog: owing/sales come from per-item paid/owing, profit sums the invoice Profit column.
  // Delivery is not part of any item, so delivery that is still unpaid shows only on the invoice. This is that part (the invoice balance minus what is still owing on its items).
  // The invoices an order's invoice became, oldest first (a payment later makes an updated invoice that replaces the old one).
  L.invoiceForward = (s, no) => { const out = []; let cur = s.invoices.find((x) => x.no === no), g = 0; while (cur && g++ < 50) { out.push(cur); cur = cur.updatedBy ? s.invoices.find((x) => x.no === cur.updatedBy) : null; } return out; };
  // What an order's invoice says now: total (delivery included), paid so far, still owing, and each payment with its date. null while there is no invoice.
  L.orderPay = (s, no) => {
    const chain = L.invoiceForward(s, no); if (!chain.length) return null;
    const last = chain[chain.length - 1], total = num(last.total), owing = r2(Math.max(0, num(last.balance)));
    return { inv: last.no, total, owing, paid: r2(Math.max(0, total - owing)), payments: chain.filter((v) => num(v.amountPaid) > 0).map((v) => ({ date: v.date, amount: num(v.amountPaid) })) };
  };
  // Where an order is: new, confirmed, handed (it left your hands but money is still owing), done (handed over and paid in full). Declined and cancelled orders sit with Done.
  L.orderStage = (o, pay) => (o.status === 'done' ? (pay && pay.owing > 0 ? 'handed' : 'done') : o.status === 'declined' ? 'done' : o.status);
  // Does a search match this order? Looks at the order number, the invoice number(s), item numbers and names, the customer's name and phone. Returns what matched, or null.
  const nk = (x) => String(x == null ? '' : x).toLowerCase().replace(/[^a-z0-9]/g, '');
  L.orderMatch = (s, o, q, invNo) => {
    const raw = String(q == null ? '' : q).trim().toLowerCase(), n = nk(raw); if (!raw || !n) return null;
    if (nk(o.code).includes(n)) return { kind: 'order', text: o.code };
    const v = invNo ? L.invoiceForward(s, invNo).find((x) => nk(x.no).includes(n)) : null; if (v) return { kind: 'invoice', text: v.no };
    const it = (o.items || []).find((i) => nk(i.id).includes(n) || String(i.name || '').toLowerCase().includes(raw));
    if (it) return { kind: 'item', text: [it.id, it.name, it.size].filter(Boolean).join(' · ') };
    if (String(o.name || '').toLowerCase().includes(raw)) return { kind: 'customer', text: o.name };
    const d = raw.replace(/\D/g, ''); if (d.length >= 3 && String(o.phone || '').replace(/\D/g, '').includes(d)) return { kind: 'phone', text: o.phone };
    return null;
  };
  // Batch picker search: no text lists every batch, newest first. Digits match the end of the batch number first (7 and 007 find BATCH-007),
  // then batches that contain them (07 also finds 070..079). Words match the store name. "batch-007" works too.
  L.batchSearch = (batches, q) => {
    const sorted = batches.slice().sort((a, b) => b.num - a.num), raw = String(q == null ? '' : q).trim().toLowerCase();
    if (!raw) return sorted.map((b) => ({ b, kind: 'all' }));
    const d = raw.replace(/\D/g, '');
    if (d) {
      const digits = (b) => String(b.id).replace(/\D/g, '');
      return sorted.filter((b) => digits(b).endsWith(d)).map((b) => ({ b, kind: 'ends' })).concat(sorted.filter((b) => !digits(b).endsWith(d) && digits(b).includes(d)).map((b) => ({ b, kind: 'has' })));
    }
    const w = raw.replace(/^batch-?/, '').trim(); return w ? sorted.filter((b) => String(b.store || '').toLowerCase().includes(w)).map((b) => ({ b, kind: 'store' })) : sorted.map((b) => ({ b, kind: 'all' }));
  };
  // Returns: the newest invoice of a purchase (an invoice, then the ones that updated it), the items on it, and what the customer paid so far.
  L.purchaseOf = (s, no) => {
    let inv = s.invoices.find((v) => v.no === no), g = 0; if (!inv) return null;
    while (inv.updatedBy && g++ < 50) { const n = s.invoices.find((v) => v.no === inv.updatedBy); if (!n) break; inv = n; }
    return { inv, items: s.items.filter((i) => i.invoice === inv.no), paid: r2(num(inv.amountPaid) + num(inv.previouslyPaid)) };
  };
  const putBack = (s, i) => { const b = s.batches.find((x) => x.id === i.batchId); i.status = b && b.status === 'In Transit' ? 'In Transit' : 'Available'; i.customer = ''; i.invoice = ''; i.sold = 0; i.owing = 0; i.paid = 0; i.delivery = 0; };   // still on the boat if its batch has not arrived
  // What a return would do, without doing it: how much the customer paid, what the invoice becomes, and how much is due back to them.
  // fee = the delivery fee for carrying the items back: the customer covers it, so it comes off what is given back (or is added to what is owed).
  L.returnPreview = (s, no, ids, fee) => {
    const pu = L.purchaseOf(s, no); if (!pu) return null; fee = r2(Math.max(0, num(fee)));
    const keep = pu.items.filter((i) => !ids.includes(i.id)), all = !keep.length;
    const newTotal = all ? 0 : r2(keep.reduce((t, i) => t + L.effectivePrice(i), 0) + num(pu.inv.delivery) + fee);
    if (all) return { all, fee, paid: pu.paid, newTotal, refund: r2(Math.max(0, pu.paid - fee)), owing: 0, owesFee: r2(Math.max(0, fee - pu.paid)), count: pu.items.length };
    return { all, fee, paid: pu.paid, newTotal, refund: r2(Math.max(0, pu.paid - newTotal)), owing: r2(Math.max(0, newTotal - pu.paid)), owesFee: 0, count: pu.items.length - keep.length };
  };
  // Put items from an invoice back in stock. The invoice number is cemented: nothing is ever deleted or renumbered.
  // Everything back: every invoice of the purchase stays in the log, marked Returned (or Cancelled), its amounts zeroed so no total counts it,
  // with a record of what happened (date, items, what was paid). Some back: the rest becomes an updated invoice with the next number and a note;
  // payments carry over, anything paid above the new total is recorded as refundDue, and profit is corrected so a refund is not left as profit.
  const WAS = ['total', 'amountPaid', 'previouslyPaid', 'balance', 'profit', 'loss', 'tip'];
  L.returnItems = (s, no, ids, date, kind, fee) => {
    const pu = L.purchaseOf(s, no); if (!pu) throw fail('noInvoice');
    const pick = pu.items.filter((i) => ids.includes(i.id)); if (!pick.length) throw fail('noItems');
    kind = kind === 'cancelled' ? 'cancelled' : 'returned'; fee = kind === 'returned' ? r2(Math.max(0, num(fee))) : 0;
    const keep = pu.items.filter((i) => !ids.includes(i.id)), pre = L.returnPreview(s, no, ids, fee), when = (date || new Date()).toISOString();
    const rec = pick.map((i) => ({ id: i.id, name: i.desc, size: i.size || '', price: L.effectivePrice(i) }));
    if (!keep.length) {
      const chain = []; let cur = pu.inv; while (cur && !chain.includes(cur)) { chain.unshift(cur); cur = cur.ref ? s.invoices.find((v) => v.no === cur.ref) : null; }
      chain.forEach((v) => { const was = {}; WAS.forEach((k) => { was[k] = num(v[k]); v[k] = 0; }); v.void = { kind, date: when, was }; if (v === pu.inv) { v.void.items = rec; v.void.refund = pre.refund; v.void.fee = fee; v.void.owesFee = pre.owesFee; } });
      chain.forEach((v) => s.items.forEach((i) => { if (i.invoice === v.no) putBack(s, i); }));
      return { all: true, paid: pre.paid, refund: pre.refund, fee, owesFee: pre.owesFee };
    }
    const bad = L.previewInvoice(s, { itemIds: keep.map((i) => i.id), client: pu.inv.client, paying: 0, allowZero: true }).errors; if (bad.length) throw fail(bad[0]);
    const chainProfit = L.invoiceChain(s, pu.inv.no).reduce((t, v) => t + num(v.profit) + num(v.loss), 0);
    const landedKeep = keep.reduce((t, i) => t + L.itemCalc(s.batches.find((b) => b.id === i.batchId), i).landed, 0);
    const D = num(pu.inv.delivery); pick.forEach((i) => putBack(s, i)); keep.forEach((i) => { i.delivery = 0; }); keep[0].delivery = D + fee;   // the return trip is charged like a delivery, so it is in the new total
    const inv = L.createInvoice(s, { itemIds: keep.map((i) => i.id), client: pu.inv.client, paying: 0, allowZero: true, date });
    if (num(inv.tip) > 0) { inv.refundDue = r2(inv.tip); inv.previouslyPaid = r2(num(inv.previouslyPaid) - inv.refundDue); inv.tip = 0; L.applyWaterfall(s, inv.no); }
    const ideal = (pre.paid - pre.refund) - landedKeep, adj = r2(ideal - chainProfit);   // what the kept items have really earned, against what the earlier invoices already counted
    inv.profit = adj > 0 ? adj : 0; inv.loss = adj < 0 ? adj : 0;
    inv.returnNote = { from: pu.inv.no, date: when, items: rec, refund: pre.refund, fee };
    return { all: false, paid: pre.paid, refund: pre.refund, fee, invoice: inv.no };
  };
  L.deliveryOwing = (s, v) => { if (!v || v.updatedBy) return 0; const itemOwing = s.items.filter((i) => i.invoice === v.no).reduce((t, i) => t + num(i.owing), 0); return r2(Math.max(0, num(v.balance) - itemOwing)); };
  L.customerStats = (s) => {
    const names = new Set(s.customers);
    s.items.forEach((i) => i.customer && names.add(i.customer));
    s.invoices.forEach((v) => names.add(v.client));
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b)).map((name) => {
      const items = s.items.filter((i) => i.customer === name); // any item tagged with the customer counts as bought
      const last = items.filter((i) => i.invoice).slice().sort((a, b) => invDate(s, b) - invDate(s, a))[0];
      const owing = items.reduce((t, i) => t + num(i.owing), 0) + L.latestInvoices(s, name).reduce((t, v) => t + L.deliveryOwing(s, v), 0);   // what the invoices say: items plus unpaid delivery
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

  /* ---------- filters (period + batch) ---------- */

  // period: 'all' | 'thisMonth' | 'lastMonth' | 'thisYear' | '2025' ... -> {from, to} (to exclusive) or null
  L.periodRange = (period, now) => {
    now = now || new Date();
    const y = now.getFullYear(), m = now.getMonth();
    if (period === 'thisMonth') return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
    if (period === 'lastMonth') return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
    if (period === 'thisYear') return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
    if (/^\d{4}$/.test(String(period))) return { from: new Date(+period, 0, 1), to: new Date(+period + 1, 0, 1) };
    return null;
  };
  const inRange = (d, r) => !r || (new Date(d) >= r.from && new Date(d) < r.to);

  // batches an invoice touches, following the chain of updated invoices to the latest one
  const invoiceBatches = (s, v) => {
    let cur = v, guard = 0;
    while (cur.updatedBy && guard++ < 50) cur = s.invoices.find((x) => x.no === cur.updatedBy) || { no: '', updatedBy: '' };
    return new Set(s.items.filter((i) => i.invoice === cur.no).map((i) => i.batchId));
  };

  L.filterInvoices = (s, f) => {
    f = f || {};
    const r = L.periodRange(f.period);
    return s.invoices.filter((v) => inRange(v.date, r) && (!f.batch || f.batch === 'all' || invoiceBatches(s, v).has(f.batch)));
  };
  L.filterBatches = (s, f) => s.batches.filter((b) => !f || !f.batch || f.batch === 'all' || b.id === f.batch);

  // Period limits sales, expenses and profit; batch limits everything. Owing and stock counts are "right now".
  L.totals = (s, f) => {
    f = f || {};
    const r = L.periodRange(f.period), all = !f.batch || f.batch === 'all';
    const batches = s.batches.filter((b) => (all || b.id === f.batch) && inRange(b.datePurchased, r));
    const invs = L.filterInvoices(s, f), invNos = new Set(invs.map((v) => v.no));
    const items = s.items.filter((i) => all || i.batchId === f.batch);
    const scoped = new Set(items.map((i) => i.invoice).filter(Boolean));
    const owing = items.reduce((t, i) => t + num(i.owing), 0) + s.invoices.filter((v) => !v.updatedBy && scoped.has(v.no)).reduce((t, v) => t + L.deliveryOwing(s, v), 0);   // items plus unpaid delivery, like the invoices
    const expense = batches.reduce((t, b) => t + b.totalCost * b.rate + b.clearingPaid, 0);
    const sales = invs.reduce((t, v) => t + v.amountPaid, 0);
    // profit on items that have actually sold (sold price - landed cost); unsold stock is not counted
    const profit = items.reduce((t, i) => {
      if ((i.status !== 'Paid' && i.status !== 'Owing') || (r && !invNos.has(i.invoice))) return t;
      const c = L.itemCalc(s.batches.find((b) => b.id === i.batchId), i);
      return c.landed ? t + num(i.sold) - c.landed : t;
    }, 0);
    return { owing: r2(owing), expense: r2(expense), sales: r2(sales), profit: r2(profit),
      available: items.filter((i) => i.status === 'Available').length,
      inTransit: items.filter((i) => i.status === 'In Transit').length };
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
      // "Sold For" is the final price only once the item is Owing or Paid; on an item still In Transit or Available it is the asking price
      id: String(h[1]), batchId: h[0], store: h[3] || '', desc: h[4] || '', cost: num(h[5]), price: num(h[11]), sold: /^(Owing|Paid)$/.test(String(h[13] || '')) ? num(h[11]) : 0,
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
    s.invoices.forEach((v) => { if (v.updatedBy) { v.profit = 0; v.loss = 0; } });   // the newer invoice already carries the whole result; the old one's loss would count the same cost twice
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
    L.cleanNames(s);
    return s;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = L; else root.Logic = L;
})(typeof window !== 'undefined' ? window : globalThis);

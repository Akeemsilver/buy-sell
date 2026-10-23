/* Mobile UI. State lives in localStorage; all rules live in logic.js. */
(function () {
  const L = window.Logic;
  const KEY = 'buy-sell-tracker:v1';
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => 'TT$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const STATUSES = ['In Transit', 'Available', 'Owing', 'Paid', 'Closed'];
  const bStatus = (b) => L.batchStatus(state, b);
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    stock: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    sell: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3.5 2.8 3.5 6"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  };
  const TABS = [['home', 'Home'], ['stock', 'Stock'], ['sell', 'Sell'], ['people', 'People'], ['more', 'More']];

  let state = load();
  let tab = 'home', moreView = null;
  let stockBatch = null, stockFilter = 'All';
  let selected = new Set();
  let invForm = { client: '', paying: '' };
  let sheetClose = null, toastTimer;

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return L.migrate(JSON.parse(raw)); } catch (e) { /* use default */ }
    return L.defaultState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast('Could not save to browser storage.'); } }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }
  // Run a state change, save, report. Errors become a toast and leave the sheet open.
  function run(fn, ok, keepSheet) {
    try { const r = fn(); save(); if (!keepSheet) closeSheet(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); render(); return r; }
    catch (e) { toast('⚠️ ' + e.message); }
  }
  const cleanSelected = () => { selected = new Set([...selected].filter((id) => state.items.some((i) => i.id === id))); };
  const batchOf = (i) => state.batches.find((b) => b.id === i.batchId);

  /* ---------- shell ---------- */

  function render() {
    cleanSelected();
    const titles = { home: 'B-RUIZ', stock: stockBatch || 'Stock', sell: 'Sell', people: 'People', more: moreView ? { invoices: 'Invoices', items: 'Item log', summary: 'Summary', settings: 'Settings' }[moreView] : 'More' };
    $('#title').textContent = titles[tab];
    $('#back').hidden = !(tab === 'more' && moreView);
    $('#brand').hidden = !$('#back').hidden;
    $('#tabbar').innerHTML = TABS.map(([k, label]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}" aria-label="${label}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg>${label}${k === 'sell' && selected.size ? `<span class="badge">${selected.size}</span>` : ''}</button>`).join('');
    $('#appbar-right').innerHTML = tab === 'stock' && state.batches.length ? '<button class="pill-btn" data-act="new-batch">+ Batch</button>' : '';
    $('#view').innerHTML = { home: Home, stock: Stock, sell: Sell, people: People, more: More }[tab]();
    renderActionBar();
  }

  function renderActionBar() {
    const bar = $('#actionbar'); let html = '';
    if (tab === 'home') html = '<button class="btn primary" data-act="new-batch">+ New batch</button>';
    else if (tab === 'stock' && selected.size) html = `<button class="btn primary" data-act="goto-sell">Sell ${selected.size} item${selected.size > 1 ? 's' : ''} →</button>`;
    else if (tab === 'sell' && selected.size) {
      const p = preview();
      html = `<button class="btn primary" data-act="make-invoice" ${p.errors.length ? 'disabled' : ''}>Create invoice · ${money(p.total)}</button>`;
    }
    bar.hidden = !html; bar.innerHTML = html;
  }

  const preview = () => L.previewInvoice(state, { itemIds: [...selected], client: invForm.client, paying: invForm.paying });

  /* ---------- Home ---------- */

  function Home() {
    const t = L.totals(state);
    const inTransit = state.batches.filter((b) => bStatus(b) === 'In Transit');
    const owing = L.customerStats(state).filter((c) => c.owing > 0).sort((a, b) => b.owing - a.owing).slice(0, 4);
    const recent = state.invoices.slice(-3).reverse();
    if (!state.batches.length) return `<div class="empty"><b>Welcome 👋</b>Start by ordering a batch, or import your existing spreadsheet from More → Data.</div>
      <div class="list"><button class="btn primary" data-act="new-batch">+ New batch</button><button class="btn" data-act="import-xlsx">Import my .xlsx workbook</button></div>`;
    return `<div class="stats">
      <div class="stat hero"><span>Profit on items sold</span><b>${money(t.profit)}</b></div>
      <div class="stat"><span>Sales (paid)</span><b>${money(t.sales)}</b></div>
      <div class="stat"><span>Owing to you</span><b>${money(t.owing)}</b></div>
      <div class="stat"><span>Expenses</span><b>${money(t.expense)}</b></div>
      <div class="stat"><span>Available · in transit</span><b>${t.available} · ${t.inTransit}</b></div></div>
    <h2>Quick actions</h2>
    <div class="quick">
      <button data-act="pay-clearing"><i>💳</i>Pay clearing</button>
      <button data-act="receive" ${inTransit.length ? '' : 'disabled'}><i>📦</i>Receive batch</button>
      <button data-act="goto-stock"><i>🏷️</i>Price items</button></div>
    <h2>Batches</h2>
    <div class="list">${state.batches.slice().sort((a, b) => b.num - a.num).map((b) => {
      const st = L.batchStats(state, b), pct = st.count ? Math.round(st.sold / st.count * 100) : 0;
      return `<button class="row tap" data-act="batch" data-id="${b.id}" style="${bStatus(b) === 'Closed' ? 'opacity:.6' : ''}"><div class="grow"><b>${b.id} <span class="pill ${bStatus(b)}">${bStatus(b)}</span></b>
        <small>${esc(b.store)} · ${day(b.datePurchased)} · ${st.sold}/${st.count} sold</small><div class="bar"><i style="width:${pct}%"></i></div></div>
        <div class="end"><b>${money(st.profit)}</b><small>profit</small></div><span class="chev">›</span></button>`; }).join('')}</div>
    ${owing.length ? `<h2>Who owes you</h2><div class="list">${owing.map((c) => `<button class="row tap" data-act="customer" data-id="${esc(c.name)}"><div class="grow"><b>${esc(c.name)}</b><small>${c.itemsOwing} item(s) owing</small></div><div class="end"><b class="bad">${money(c.owing)}</b></div><span class="chev">›</span></button>`).join('')}</div>` : ''}
    ${recent.length ? `<h2>Recent invoices</h2><div class="list">${recent.map(invoiceRow).join('')}</div>` : ''}`;
  }

  function invoiceRow(v) {
    const st = L.invoiceStatus(v);
    return `<button class="row tap" data-act="view-inv" data-id="${v.no}"><div class="grow"><b>${v.no} · ${esc(v.client)}</b><small>${esc(v.desc)}</small></div>
      <div class="end"><b>${money(v.total)}</b><span class="pill ${st}">${st}</span></div></button>`;
  }

  /* ---------- Stock ---------- */

  function Stock() {
    if (!state.batches.length) return '<div class="empty"><b>No stock yet</b>Create a batch from Home first.</div>';
    const open = state.batches.filter((b) => bStatus(b) !== 'Closed' || b.id === stockBatch).sort((a, b) => b.num - a.num);
    if (!open.length) return '<div class="empty"><b>All batches are closed</b>Closed batches stay in Home and the logs. Create a new batch to keep selling.</div>';
    if (!open.some((b) => b.id === stockBatch)) stockBatch = open[0].id;
    const b = state.batches.find((x) => x.id === stockBatch);
    const all = state.items.filter((i) => i.batchId === b.id);
    const items = all.filter((i) => stockFilter === 'All' || i.status === stockFilter);
    const st = L.batchStats(state, b);
    const chips = (arr, cur, act) => arr.map((x) => `<button class="chip ${x === cur ? 'on' : ''}" data-act="${act}" data-id="${esc(x)}">${esc(x)}</button>`).join('');
    return `<div class="chips">${chips(open.map((x) => x.id), stockBatch, 'pick-batch')}</div>
      <div class="row" style="margin-bottom:10px"><div class="grow"><b>${bStatus(b)} · ${money(st.investment)} invested</b><small>Clearing ${money(b.clearingPaid)} (${(st.clearingPct * 100).toFixed(0)}%) · ${st.left} left</small></div>
        <div class="end"><b>${money(st.profit)}</b><small>profit</small></div></div>
      <div class="chips">${chips(['All', ...STATUSES], stockFilter, 'pick-filter')}</div>
      <div class="list">${items.map((i) => itemCard(b, i)).join('') || '<div class="empty">No items match this filter.</div>'}</div>`;
  }

  function itemCard(b, i) {
    const c = L.itemCalc(b, i), sel = selected.has(i.id);
    return `<div class="item ${sel ? 'sel' : ''}" data-id="${i.id}">
      <label class="chk" aria-label="Select for invoice"><input type="checkbox" data-sel ${sel ? 'checked' : ''}></label>
      <button class="main" data-act="edit-item" data-id="${i.id}"><b>${esc(i.desc) || '<span class="muted">Untitled item</span>'}</b>
        <small>${i.id}${i.customer ? ' · ' + esc(i.customer) : ''}${i.invoice ? ' · ' + i.invoice : ''}</small></button>
      <div class="side"><span class="pill ${i.status.replace(' ', '')}">${i.status}</span><b>${i.sold ? money(i.sold) : c.recommended ? '<span class="muted">' + money(c.recommended) + '</span>' : ''}</b></div></div>`;
  }

  /* ---------- Sell ---------- */

  function Sell() {
    if (!selected.size) return `<div class="empty"><b>Nothing to sell yet</b>Tick the circle on items in Stock, then come back here to invoice them.</div>
      <button class="btn primary" data-act="goto-stock">Choose items</button>`;
    const items = [...selected].map((id) => state.items.find((i) => i.id === id));
    const custs = L.customerStats(state).map((c) => c.name);
    return `<h2>Items (${items.length})</h2><div class="list">${items.map((i) => `<div class="row"><div class="grow"><b>${esc(i.desc) || '<span class="bad">No description</span>'}</b><small>${i.id}${i.invoice ? ' · on ' + i.invoice : ''}</small></div>
        <div class="end"><b>${i.sold ? money(i.sold) : '<span class="bad">no price</span>'}</b></div>
        <button class="chip" data-act="edit-item" data-id="${i.id}">Edit</button><button class="chip" data-act="unselect" data-id="${i.id}" aria-label="Remove">✕</button></div>`).join('')}</div>
      <label for="client">Customer</label><input id="client" name="client" list="custs" value="${esc(invForm.client)}" placeholder="Existing or new name" autocomplete="off">
      <datalist id="custs">${custs.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
      ${custs.length ? `<div class="suggest">${custs.slice(0, 8).map((c) => `<button class="chip" data-act="pick-client" data-id="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      <label for="paying">Amount paying now (TTD)</label>
      <div class="grid2"><input id="paying" name="paying" type="number" inputmode="decimal" step="0.01" min="0" value="${esc(invForm.paying)}" placeholder="0.00"><button class="btn" data-act="pay-full">Pay in full</button></div>
      <div id="prev"></div>`.replace('<div id="prev"></div>', `<div id="prev">${previewBox()}</div>`);
  }

  function previewBox() {
    const p = preview();
    return `<div class="sumbox"><div><span>Total (incl. delivery ${money(p.delivery)})</span><span>${money(p.total)}</span></div>
      <div><span>Previously paid${p.ref ? ' (' + p.ref + ')' : ''}</span><span>${money(p.prev)}</span></div>
      <div><span>Paying now</span><span>${money(p.paying)}</span></div>
      <div class="t"><span>Owing after</span><span>${money(p.balance)}</span></div>
      ${p.tip ? `<div class="good"><span>Tip</span><span>${money(p.tip)}</span></div>` : ''}
      <div><span>Profit</span><span>${money(p.profit)}</span></div>
      ${p.loss ? `<div class="bad"><span>Loss</span><span>${money(p.loss)}</span></div>` : ''}</div>
      ${p.errors.length ? `<div class="err">${esc(p.errors[0])}</div>` : '<div class="muted small" style="margin-top:8px">Ready to create the invoice.</div>'}`;
  }

  /* ---------- People ---------- */

  function People() {
    const rows = L.customerStats(state);
    if (!rows.length) return '<div class="empty"><b>No customers yet</b>Customers appear when you create your first invoice.</div>';
    return `<input id="q" type="search" placeholder="Search customers" aria-label="Search customers" style="margin-bottom:10px"><div class="list" id="custlist">${custRows(rows, '')}</div>`;
  }
  function custRows(rows, q) {
    const f = rows.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.owing - a.owing || a.name.localeCompare(b.name));
    return f.map((c) => `<button class="row tap" data-act="customer" data-id="${esc(c.name)}"><div class="grow"><b>${esc(c.name)}</b><small>${c.bought} item(s) · ${money(c.sales)} sales</small></div>
      <div class="end"><b class="${c.owing > 0 ? 'bad' : ''}">${c.owing > 0 ? money(c.owing) : ''}</b><span class="pill ${c.owing > 0 ? 'Owing' : 'Up'}">${c.status}</span></div></button>`).join('') || '<div class="empty">No match.</div>';
  }

  /* ---------- More ---------- */

  function More() {
    if (moreView === 'invoices') return `<div class="list">${state.invoices.slice().reverse().map(invoiceRow).join('') || '<div class="empty">No invoices yet.</div>'}</div>`;
    if (moreView === 'items') return ItemLog();
    if (moreView === 'summary') return Summary();
    if (moreView === 'settings') return Settings();
    const go = (v, icon, label, sub) => `<button class="row tap" data-act="more" data-id="${v}"><span style="font-size:22px">${icon}</span><div class="grow"><b>${label}</b><small>${sub}</small></div><span class="chev">›</span></button>`;
    return `<div class="list">${go('invoices', '🧾', 'Invoices', state.invoices.length + ' total')}${go('items', '📋', 'Item log', state.items.length + ' items')}
      ${go('summary', '📈', 'Summary', 'Monthly sales, expenses, profit')}${go('settings', '⚙️', 'Settings', 'Exchange rates, year, margin')}</div>
      <h2>Data</h2><div class="list">
        <button class="row tap" data-act="import-xlsx"><span style="font-size:22px">📥</span><div class="grow"><b>Import .xlsx workbook</b><small>Replaces data on this device</small></div></button>
        <button class="row tap" data-act="export-json"><span style="font-size:22px">💾</span><div class="grow"><b>Backup</b><small>Save everything as a file</small></div></button>
        <button class="row tap" data-act="import-json"><span style="font-size:22px">♻️</span><div class="grow"><b>Restore backup</b><small>Load a backup file</small></div></button>
        <button class="row tap" data-act="reset"><span style="font-size:22px">🗑️</span><div class="grow"><b class="bad">Erase all data</b><small>Cannot be undone — back up first</small></div></button></div>
      <p class="muted small" style="text-align:center;margin-top:20px">Data is stored on this device only.</p>`;
  }

  function ItemLog() {
    const counts = STATUSES.map((s) => `<div class="stat"><span>${s}</span><b>${state.items.filter((i) => i.status === s).length}</b></div>`).join('');
    return `<div class="stats">${counts}</div><h2>All items</h2><div class="list">${state.items.map((i) => `<button class="row tap" data-act="edit-item" data-id="${i.id}"><div class="grow"><b>${esc(i.desc) || 'Untitled item'}</b><small>${i.id}${i.customer ? ' · ' + esc(i.customer) : ''}</small></div><span class="pill ${i.status.replace(' ', '')}">${i.status}</span></button>`).join('')}</div>`;
  }

  function Summary() {
    const y = state.settings.year, m = L.monthlySummary(state, y), t = L.totals(state);
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sum = (k) => m.reduce((a, x) => a + x[k], 0), peak = Math.max(1, ...m.map((x) => Math.max(x.sales, x.expense)));
    const row = (label, k) => `<tr><td><b>${label}</b></td>${m.map((x) => `<td>${x[k] ? Math.round(x[k]).toLocaleString() : '–'}</td>`).join('')}<td><b>${Math.round(sum(k)).toLocaleString()}</b></td></tr>`;
    return `<div class="stats"><div class="stat"><span>${y} sales</span><b>${money(sum('sales'))}</b></div><div class="stat"><span>${y} profit</span><b>${money(sum('profit'))}</b></div>
      <div class="stat"><span>${y} expenses</span><b>${money(sum('expense'))}</b></div><div class="stat"><span>Owing now</span><b>${money(t.owing)}</b></div></div>
      <h2>By month</h2><div class="mbars">${m.map((x, i) => `<div><i style="height:${x.sales / peak * 90}px"></i><i style="height:${x.expense / peak * 90}px"></i>${names[i][0]}</div>`).join('')}</div>
      <p class="muted small">Pink = sales, grey = expenses (counted in the month a batch was ordered).</p>
      <div class="table"><table><thead><tr><th></th>${names.map((n) => `<th>${n}</th>`).join('')}<th>Total</th></tr></thead><tbody>${row('Expense', 'expense')}${row('Sales', 'sales')}${row('Profit', 'profit')}</tbody></table></div>`;
  }

  function Settings() {
    const s = state.settings;
    return `<form id="f-settings"><div class="grid2"><div><label>Year</label><input name="year" type="number" inputmode="numeric" value="${s.year}"></div>
      <div><label>Default margin %</label><input name="defaultMargin" type="number" inputmode="decimal" value="${s.defaultMargin}"></div></div>
      <label>Rate markup (×)</label><input name="markup" type="number" inputmode="decimal" step="0.001" value="${s.markup}">
      ${['USD', 'EUR', 'GBP'].map((c) => `<label>${c} → TTD (market rate)</label><input name="${c}" type="number" inputmode="decimal" step="0.0001" value="${s.rates[c]}">`).join('')}
      <p class="muted small">Effective rate = market × markup. Type in today's rate; new batches use it, existing batches keep theirs.</p>
      <div class="btns"><button class="btn primary">Save settings</button></div></form>`;
  }

  /* ---------- sheets ---------- */

  function openSheet(html, onClose) {
    sheetClose = onClose || null;
    $('#sheet').innerHTML = `<div class="grab"></div>${html}`; $('#sheet').hidden = false; $('#scrim').hidden = false; $('#sheet').scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    if ($('#sheet').hidden) return;
    $('#sheet').hidden = true; $('#scrim').hidden = true; $('#sheet').innerHTML = ''; document.body.style.overflow = '';
    const cb = sheetClose; sheetClose = null; if (cb) cb();
  }

  const currencyOpts = () => Object.keys(L.CURRENCIES).map((c) => `<option>${c}</option>`).join('');
  const batchOpts = (list) => list.map((b) => `<option>${b.id}</option>`).join('');

  function sheetNewBatch() {
    openSheet(`<h3>New batch</h3><p class="muted small">Same as ordering on the sheet: set the store, item count and total cost.</p>
      <form id="f-batch"><label>Store</label><input name="store" value="SHEIN" required>
      <div class="grid2"><div><label>No. of items</label><input name="count" type="number" inputmode="numeric" min="1" required></div>
      <div><label>Currency</label><select name="currency">${currencyOpts()}</select></div></div>
      <div class="grid2"><div><label>Total cost</label><input name="totalCost" type="number" inputmode="decimal" step="0.01" min="0" required></div>
      <div><label>Margin %</label><input name="margin" type="number" inputmode="decimal" value="${state.settings.defaultMargin}"></div></div>
      <p class="muted small" id="rate-hint"></p>
      <div class="btns"><button class="btn primary">Create batch</button><button type="button" class="btn" data-act="close">Cancel</button></div></form>`);
  }

  function sheetBatch(id) {
    const b = state.batches.find((x) => x.id === id); if (!b) return;
    const st = L.batchStats(state, b);
    openSheet(`<h3>${b.id} <span class="pill ${bStatus(b)}">${bStatus(b)}</span></h3>
      <div class="sumbox"><div><span>Store</span><span>${esc(b.store)}</span></div><div><span>Ordered</span><span>${day(b.datePurchased)}</span></div>
      <div><span>Cost</span><span>${b.totalCost.toFixed(2)} ${b.currency} @ ${b.rate.toFixed(4)}</span></div>
      <div><span>Clearing paid</span><span>${money(b.clearingPaid)} (${(st.clearingPct * 100).toFixed(0)}%)</span></div>
      <div><span>Invested</span><span>${money(st.investment)}</span></div><div><span>Sales</span><span>${money(st.sales)}</span></div>
      <div><span>Profit</span><span>${money(st.profit)}</span></div>
      <div><span>${b.dateLastPayment ? 'Purchase → last clearing payment' : 'Time since purchase'}</span><span>${L.timeInTransit(b)}</span></div>
      ${b.dateLastPayment ? `<div><span>Last clearing payment</span><span>${day(b.dateLastPayment)}</span></div>` : ''}</div>
      <form id="f-clear"><input type="hidden" name="batch" value="${b.id}"><label>Pay clearing (TTD)</label>
      <div class="grid2"><input name="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00"><button class="btn primary">Record payment</button></div></form>
      <div class="btns"><button class="btn" data-act="open-stock" data-id="${b.id}">View items →</button>
      ${bStatus(b) === 'In Transit' ? `<button class="btn" data-act="do-receive" data-id="${b.id}">Mark received → items Available</button>` : ''}
      ${bStatus(b) !== 'Closed' ? `<button class="btn danger" data-act="close-batch" data-id="${b.id}">Close batch</button>` : ''}
      ${st.sold === 0 ? `<button class="btn danger" data-act="del-batch" data-id="${b.id}">Delete (created by mistake)</button>` : ''}</div>
      ${bStatus(b) !== 'Closed' ? '<p class="muted small">Closing keeps the batch in your logs and history. Unsold items become Closed; sold and owing items are kept.</p>' : ''}`);
  }

  function sheetPayClearing() {
    if (!state.batches.length) return toast('Create a batch first.');
    openSheet(`<h3>Pay clearing</h3><form id="f-clear"><label>Batch</label><select name="batch">${batchOpts(state.batches.filter((b) => bStatus(b) !== 'Closed').reverse())}</select>
      <label>Amount (TTD)</label><input name="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" required>
      <div class="btns"><button class="btn primary">Record payment</button><button type="button" class="btn" data-act="close">Cancel</button></div></form>`);
  }

  function sheetReceive() {
    const list = state.batches.filter((b) => bStatus(b) === 'In Transit'); if (!list.length) return toast('No batches in transit.');
    openSheet(`<h3>Receive batch</h3><p class="muted small">Marks the batch received and turns its In Transit items into Available.</p>
      <form id="f-receive"><label>Batch</label><select name="batch">${batchOpts(list)}</select>
      <div class="btns"><button class="btn primary">Mark received</button><button type="button" class="btn" data-act="close">Cancel</button></div></form>`);
  }

  function sheetItem(id) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    const b = batchOf(i);
    openSheet(`<h3>${i.id}</h3><div class="muted small">${b.id} · ${esc(i.store)}${i.invoice ? ' · invoice ' + i.invoice : ''}${i.customer ? ' · ' + esc(i.customer) : ''}</div>
      <label>Description</label><input data-f="desc" value="${esc(i.desc)}" placeholder="e.g. Blue dress" autocomplete="off">
      <div class="grid2"><div><label>Cost (${b.currency})</label><input data-f="cost" type="number" inputmode="decimal" step="0.01" min="0" value="${i.cost || ''}"></div>
      <div><label>Sold for (TTD)</label><input data-f="sold" type="number" inputmode="decimal" step="0.01" min="0" value="${i.sold || ''}"></div></div>
      <div class="grid2"><div><label>Delivery (TTD)</label><input data-f="delivery" type="number" inputmode="decimal" step="0.01" min="0" value="${i.delivery || ''}"></div>
      <div><label>Status</label><select data-f="status">${STATUSES.map((s) => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div></div>
      <div class="sumbox" id="calc"></div>
      <div class="btns"><button class="btn primary" data-act="${selected.has(i.id) ? 'unselect-close' : 'select-close'}" data-id="${i.id}">${selected.has(i.id) ? 'Remove from invoice' : 'Add to invoice'}</button>
      <button class="btn" data-act="close">Done</button></div>`, render);
    $('#sheet').dataset.item = id; calcBox(i);
  }
  function calcBox(i) {
    const c = L.itemCalc(batchOf(i), i);
    $('#calc').innerHTML = `<div><span>Cost (TTD)</span><span>${money(c.costTTD)}</span></div><div><span>Clearing share</span><span>${money(c.clearing)}</span></div>
      <div class="t"><span>Landed cost</span><span>${money(c.landed)}</span></div><div><span>Recommended price</span><span>${money(c.recommended)}</span></div>
      <div><span>Profit${i.sold > 0 ? '' : ' (at recommended)'}</span><span>${c.landed ? money(c.profit) : money(0)}</span></div>`;
  }

  function sheetInvoice(no) {
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    const lines = v.lines && v.lines.length ? v.lines : [{ desc: v.desc, qty: v.qty, price: v.total - v.delivery }];
    const sub = lines.reduce((t, l) => t + l.qty * l.price, 0), st = L.invoiceStatus(v);
    openSheet(`<div class="printable"><div class="paper"><h4>INVOICE</h4>
      <div class="meta"><div><b>BILL TO</b><br>${esc(v.client)}</div><div style="text-align:right"><b>INVOICE #</b> ${v.no}<br><b>DATE</b> ${day(v.date)}<br><b>DUE</b> ${day(v.due)}</div></div>
      <table><thead><tr><th>Description</th><th>QTY</th><th class="r">Price</th><th class="r">Amount</th></tr></thead><tbody>
      ${lines.map((l) => `<tr><td>${esc(l.desc)}</td><td>${l.qty}</td><td class="r">${money(l.price)}</td><td class="r">${money(l.qty * l.price)}</td></tr>`).join('')}</tbody></table>
      <div class="tot"><div><span>Subtotal</span><span>${money(sub)}</span></div><div><span>Delivery</span><span>${money(v.delivery)}</span></div><div><span>Total</span><span>${money(v.total)}</span></div>
      <div><span>Paid</span><span>${money(v.amountPaid)}</span></div><div><span>Previously paid</span><span>${money(v.previouslyPaid)}</span></div><div class="bal"><span>BALANCE DUE</span><span>${money(v.balance)}</span></div></div>
      <p style="font-size:13px"><b>Terms or notes</b><br>Thanks for your business.</p></div></div>
      <div class="muted small" style="margin-top:8px">Status: <span class="pill ${st}">${st}</span>${v.profit ? ' · profit ' + money(v.profit) : ''}${v.loss ? ' · loss ' + money(v.loss) : ''}${v.tip ? ' · tip ' + money(v.tip) : ''}</div>
      <div class="btns"><button class="btn primary" data-act="print">Print / Save as PDF</button>
      ${navigator.share ? `<button class="btn" data-act="share-inv" data-id="${v.no}">Share summary</button>` : ''}
      <button class="btn danger" data-act="del-inv" data-id="${v.no}">Delete invoice</button><button class="btn" data-act="close">Close</button></div>`);
  }

  function sheetCustomer(name) {
    const c = L.customerStats(state).find((x) => x.name === name); if (!c) return;
    const invs = state.invoices.filter((v) => v.client === name).reverse();
    openSheet(`<h3>${esc(c.name)} <span class="pill ${c.owing > 0 ? 'Owing' : 'Up'}">${c.status}</span></h3>
      <div class="sumbox"><div><span>Owing</span><span>${money(c.owing)}</span></div><div><span>Total sales</span><span>${money(c.sales)}</span></div>
      <div><span>Items bought</span><span>${c.bought} (${c.itemsOwing} owing)</span></div><div><span>Profit made</span><span>${money(c.profit)}</span></div>
      ${c.lastItem ? `<div><span>Last item</span><span>${esc(c.lastItem)}</span></div>` : ''}</div>
      <h2>Invoices</h2><div class="list">${invs.map(invoiceRow).join('') || '<div class="muted">None yet.</div>'}</div>
      <div class="btns"><button class="btn" data-act="close">Close</button></div>`);
  }

  /* ---------- events ---------- */

  function openInvoiceFromSheet(no) { closeSheet(); sheetInvoice(no); }

  document.addEventListener('click', (e) => {
    if (e.target.id === 'scrim') return closeSheet();
    const t = e.target.closest('[data-tab],[data-act]'); if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; if (tab === 'more') moreView = null; window.scrollTo(0, 0); return render(); }
    const id = t.dataset.id;
    switch (t.dataset.act) {
      case 'close': return closeSheet();
      case 'new-batch': return sheetNewBatch();
      case 'pay-clearing': return sheetPayClearing();
      case 'receive': return sheetReceive();
      case 'batch': return sheetBatch(id);
      case 'do-receive': return run(() => L.makeAvailable(state, id), (n) => `${id} received — ${n} item(s) now Available.`);
      case 'close-batch': if (confirm(`Close ${id}? Unsold items become Closed. Sold and owing items stay in your logs.`)) run(() => L.closeBatch(state, id), `${id} closed.`); return;
      case 'del-batch': if (confirm(`Permanently delete ${id} and all its items? This cannot be undone.`)) run(() => L.deleteBatch(state, id), `${id} deleted.`); return;
      case 'open-stock': stockBatch = id; stockFilter = 'All'; tab = 'stock'; closeSheet(); return render();
      case 'goto-stock': tab = 'stock'; return render();
      case 'goto-sell': tab = 'sell'; window.scrollTo(0, 0); return render();
      case 'pick-batch': stockBatch = id; return render();
      case 'pick-filter': stockFilter = id; return render();
      case 'edit-item': return sheetItem(id);
      case 'unselect': selected.delete(id); return render();
      case 'select-close': selected.add(id); closeSheet(); return toast('Added to invoice.');
      case 'unselect-close': selected.delete(id); closeSheet(); return;
      case 'pick-client': invForm.client = id; return render();
      case 'pay-full': { const p = preview(); invForm.paying = String(Math.max(0, L.r2(p.total - p.prev))); return render(); }
      case 'make-invoice': return run(() => L.createInvoice(state, { itemIds: [...selected], client: invForm.client, paying: invForm.paying }), (inv) => {
        selected = new Set(); invForm = { client: '', paying: '' }; setTimeout(() => sheetInvoice(inv.no), 0); return `Created ${inv.no} · balance ${money(inv.balance)}`; });
      case 'customer': closeSheet(); return sheetCustomer(id);
      case 'view-inv': closeSheet(); return sheetInvoice(id);
      case 'del-inv': if (confirm(`Delete ${id}? Its items go back to their previous state.`)) run(() => L.deleteInvoice(state, id), `${id} deleted.`); return;
      case 'print': return window.print();
      case 'share-inv': { const v = state.invoices.find((x) => x.no === id);
        return navigator.share({ title: v.no, text: `Invoice ${v.no} for ${v.client}\n${v.desc}\nTotal ${money(v.total)} · Paid ${money(v.amountPaid + v.previouslyPaid)} · Balance due ${money(v.balance)}\nDue ${day(v.due)}` }).catch(() => {}); }
      case 'more': moreView = id; window.scrollTo(0, 0); return render();
      case 'import-xlsx': return pickFile('.xlsx,.xls', importXlsx);
      case 'import-json': return pickFile('.json,application/json', importJson);
      case 'export-json': return download('buy-sell-backup.json', JSON.stringify(state, null, 2));
      case 'reset': if (confirm('Erase ALL data on this device? Make a backup first.') && confirm('Really erase everything?')) { state = L.defaultState(); selected = new Set(); run(() => 0, 'All data cleared.'); } return;
    }
  });
  $('#back').addEventListener('click', () => { moreView = null; render(); });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f));
    if (f.id === 'f-batch') { const b = run(() => L.createBatch(state, d), (x) => `${x.id} created — fill in item details in Stock.`); if (b) { stockBatch = b.id; stockFilter = 'All'; } }
    if (f.id === 'f-clear') run(() => L.payClearing(state, d.batch, d.amount), `Clearing payment recorded for ${d.batch}.`);
    if (f.id === 'f-receive') run(() => L.makeAvailable(state, d.batch), (n) => `${d.batch} received — ${n} item(s) now Available.`);
    if (f.id === 'f-settings') run(() => {
      Object.assign(state.settings, { year: +d.year || state.settings.year, markup: +d.markup || 1, defaultMargin: d.defaultMargin === '' ? 100 : +d.defaultMargin });
      ['USD', 'EUR', 'GBP'].forEach((c) => { state.settings.rates[c] = +d[c] || state.settings.rates[c]; });
    }, 'Settings saved.', true);
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.hasAttribute('data-sel')) {
      const id = el.closest('.item').dataset.id;
      el.checked ? selected.add(id) : selected.delete(id);
      el.closest('.item').classList.toggle('sel', el.checked); render(); return;
    }
    if (el.dataset.f && $('#sheet').dataset.item) {
      const i = state.items.find((x) => x.id === $('#sheet').dataset.item), f = el.dataset.f;
      i[f] = ['cost', 'sold', 'delivery'].includes(f) ? Math.max(0, parseFloat(el.value) || 0) : el.value;
      save(); calcBox(i);
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'client' || el.id === 'paying') { invForm[el.name] = el.value; $('#prev').innerHTML = previewBox(); renderActionBar(); }
    else if (el.id === 'q') $('#custlist').innerHTML = custRows(L.customerStats(state), el.value);
    else if (el.dataset.f && $('#sheet').dataset.item) {
      const i = state.items.find((x) => x.id === $('#sheet').dataset.item), f = el.dataset.f;
      if (['cost', 'sold', 'delivery'].includes(f)) { i[f] = Math.max(0, parseFloat(el.value) || 0); calcBox(i); }
    } else if (el.form && el.form.id === 'f-batch') {
      const f = el.form, r = L.effectiveRate(state, f.currency.value), c = parseFloat(f.totalCost.value) || 0;
      $('#rate-hint').textContent = `Rate ${r.toFixed(4)} → ${money(c * r)} before clearing.`;
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  /* ---------- files ---------- */

  function download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function pickFile(accept, handler) { const f = $('#file'); f.accept = accept; f.value = ''; f.onchange = () => f.files[0] && handler(f.files[0]); f.click(); }
  function importJson(file) {
    file.text().then((t) => { const s = JSON.parse(t); if (!s.batches || !s.items) throw new Error('Not a backup file.'); state = L.migrate(s); selected = new Set(); save(); toast('Backup restored.'); render(); }).catch((e) => toast('⚠️ ' + e.message));
  }
  function importXlsx(file) {
    if (state.batches.length && !confirm('Importing replaces the data on this device. Continue?')) return;
    toast('Reading workbook…');
    loadSheetJS().then((X) => file.arrayBuffer().then((buf) => {
      const wb = X.read(buf, { type: 'array', cellDates: true }), sheets = {};
      ['Batch Log', 'Hidden Master Log', 'Invoice Log'].forEach((n) => { if (wb.Sheets[n]) sheets[n] = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }); });
      if (!sheets['Hidden Master Log'] || !sheets['Batch Log']) throw new Error('This is not the tracker workbook (needs Batch Log and Hidden Master Log).');
      const imp = L.importWorkbook(sheets); imp.settings.year = state.settings.year; imp.settings.rates = state.settings.rates;
      state = imp; selected = new Set(); stockBatch = null; tab = 'home'; moreView = null; save();
      toast(`Imported ${state.batches.length} batches, ${state.items.length} items, ${state.invoices.length} invoices.`); render();
    })).catch((e) => toast('⚠️ ' + e.message));
  }
  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => ok(window.XLSX); s.onerror = () => no(new Error('Could not load the spreadsheet reader (needs internet).')); document.head.appendChild(s);
    });
  }

  render();
})();

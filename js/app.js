/* UI layer. State lives in localStorage; all rules live in logic.js. */
(function () {
  const L = window.Logic;
  const KEY = 'buy-sell-tracker:v1';
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => 'TT$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const STATUSES = ['In Transit', 'Available', 'Paid', 'Owing'];
  const TABS = ['Dashboard', 'Inventory', 'Invoices', 'Customers', 'Items', 'Summary'];

  let state = load();
  let tab = 'Dashboard';
  let selected = new Set();           // item ids ticked for "Add to Invoice"
  let invForm = { client: '', isNew: false, paying: '' };
  let openBatches = new Set();

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* fall through */ }
    return L.defaultState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { say('Could not save to browser storage.'); } }
  function say(msg) { $('#status').textContent = msg; }
  function run(fn, ok) {
    try { const r = fn(); save(); if (ok) say(typeof ok === 'function' ? ok(r) : ok); render(); } catch (e) { say('⚠️ ' + e.message); }
  }

  /* ---------- views ---------- */

  function render() {
    $('#nav').innerHTML = TABS.map((t) => `<button data-tab="${t}" class="${t === tab ? 'on' : ''}">${t}</button>`).join('');
    $('#view').innerHTML = { Dashboard, Inventory, Invoices, Customers, Items, Summary }[tab]();
    if (tab === 'Inventory') refreshInvoiceBar();
    if (tab === 'Dashboard') { rateHint(); showClearInfo(); }
  }

  function Dashboard() {
    const t = L.totals(state), s = state.settings;
    const received = state.batches.filter((b) => b.status !== 'Received');
    const opts = (list, f) => list.map(f).join('');
    return `
    <div class="cards" style="margin-top:12px">
      <div class="card"><span>Total expenses</span><b>${money(t.expense)}</b></div>
      <div class="card"><span>Total sales (paid)</span><b>${money(t.sales)}</b></div>
      <div class="card"><span>Total profit</span><b>${money(t.profit)}</b></div>
      <div class="card"><span>Total owing</span><b>${money(t.owing)}</b></div>
      <div class="card"><span>Items available</span><b>${t.available}</b></div>
      <div class="card"><span>Items in transit</span><b>${t.inTransit}</b></div>
    </div>
    <div class="grid">
      <section class="panel"><h2>Order items (new batch)</h2>
        <form id="f-batch">
          <label>Store</label><input name="store" value="SHEIN" required>
          <div class="row">
            <div><label>No. of items</label><input name="count" type="number" min="1" required></div>
            <div><label>Currency</label><select name="currency">${opts(Object.keys(L.CURRENCIES), (c) => `<option>${c}</option>`)}</select></div>
          </div>
          <div class="row">
            <div><label>Total cost (store currency)</label><input name="totalCost" type="number" step="0.01" min="0" required></div>
            <div><label>Profit margin %</label><input name="margin" type="number" step="1" value="${s.defaultMargin}"></div>
          </div>
          <p class="muted" id="rate-hint"></p>
          <button class="primary">Create batch</button>
        </form></section>
      <section class="panel"><h2>Clearing</h2>
        ${state.batches.length ? `<form id="f-clear">
          <label>Batch</label><select name="batch" id="clear-batch">${opts(state.batches, (b) => `<option>${b.id}</option>`)}</select>
          <div id="clear-info" class="muted" style="margin:8px 0"></div>
          <label>Pay clearing (TTD)</label><input name="amount" type="number" step="0.01" min="0">
          <div class="row" style="margin-top:10px"><button class="primary">Record payment</button>
          <button type="button" data-act="make-available" ${received.length ? '' : 'disabled'}>Make available (received)</button></div>
        </form>` : '<p class="muted">Create a batch first.</p>'}</section>
      <section class="panel"><h2>Settings</h2>
        <form id="f-settings">
          <div class="row"><div><label>Year</label><input name="year" type="number" value="${s.year}"></div>
          <div><label>Rate markup (×)</label><input name="markup" type="number" step="0.001" value="${s.markup}"></div></div>
          <div class="row">${['USD', 'EUR', 'GBP'].map((c) => `<div><label>${c} → TTD (market)</label><input name="${c}" type="number" step="0.0001" value="${s.rates[c]}"></div>`).join('')}</div>
          <p class="muted">Effective rate = market × markup. Replaces the sheet's GOOGLEFINANCE lookup — type today's rate in.</p>
          <button class="primary">Save settings</button>
        </form></section>
    </div>`;
  }

  function itemRow(b, i) {
    const c = L.itemCalc(b, i), sel = selected.has(i.id);
    const inp = (f, v, type, w) => `<input data-f="${f}" type="${type || 'text'}" ${type === 'number' ? 'step="0.01" min="0"' : ''} value="${esc(v)}" ${w ? `style="min-width:${w}px"` : ''}>`;
    return `<tr data-id="${i.id}">
      <td>${i.id}</td><td class="l">${inp('desc', i.desc, 'text', 160)}</td><td>${inp('cost', i.cost || '', 'number')}</td>
      <td data-c="costTTD">${c.costTTD ? money(c.costTTD) : ''}</td><td data-c="clearing">${c.clearing ? money(c.clearing) : ''}</td>
      <td data-c="landed">${c.landed ? money(c.landed) : ''}</td><td data-c="recommended">${c.recommended ? money(c.recommended) : ''}</td>
      <td>${inp('sold', i.sold || '', 'number')}</td><td data-c="profit">${c.landed ? money(c.profit) : ''}</td>
      <td><select data-f="status">${STATUSES.map((s) => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td>${esc(i.customer)}</td><td>${inp('delivery', i.delivery || '', 'number')}</td>
      <td><input type="checkbox" data-sel ${sel ? 'checked' : ''}></td><td>${esc(i.invoice)}</td></tr>`;
  }

  function Inventory() {
    if (!state.batches.length) return '<p class="muted">No batches yet — create one on the Dashboard.</p>';
    const batches = state.batches.slice().sort((a, b) => b.num - a.num);
    return `<datalist id="custs">${L.customerStats(state).map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>` +
      batches.map((b) => {
        const st = L.batchStats(state, b), open = openBatches.has(b.id) || batches.length === 1 || b === batches[0] && !openBatches.size;
        return `<section data-batch="${b.id}">
          <div class="batchhead"><h3>${b.id}</h3><span class="pill ${b.status}">${b.status}</span><small>${esc(b.store)} · ${day(b.datePurchased)} · ${b.totalCost.toFixed(2)} ${b.currency} @ ${b.rate.toFixed(4)}</small>
            <small>Clearing paid ${money(b.clearingPaid)} (${(st.clearingPct * 100).toFixed(0)}%) · Invested ${money(st.investment)} · Sales ${money(st.sales)} · Profit ${money(st.profit)} · Sold ${st.sold}/${st.count} · ${b.status === 'Received' ? 'Transit ' : 'In transit '}${L.timeInTransit(b)}</small>
            <button data-act="toggle" data-id="${b.id}">${open ? 'Hide' : 'Show'} items</button>
            <button class="danger" data-act="del-batch" data-id="${b.id}">Delete</button></div>
          ${open ? `<div class="tablewrap"><table><thead><tr><th>Item ID</th><th class="l">Item name/desc</th><th>Cost (${b.currency})</th><th>Cost (TTD)</th><th>Clearing</th><th>Landed</th><th>Recommended</th><th>Sold for</th><th>Profit</th><th>Status</th><th>Customer</th><th>Delivery</th><th>Add to invoice</th><th>Invoice #</th></tr></thead>
          <tbody>${state.items.filter((i) => i.batchId === b.id).map((i) => itemRow(b, i)).join('')}</tbody></table></div>` : ''}
        </section>`;
      }).join('') + `<div class="panel invbar" id="invbar"></div>`;
  }

  function refreshInvoiceBar() {
    const bar = $('#invbar'); if (!bar) return;
    const ids = [...selected].filter((id) => state.items.some((i) => i.id === id));
    const p = L.previewInvoice(state, { itemIds: ids, client: invForm.client, paying: invForm.paying });
    const keep = document.activeElement && document.activeElement.name;
    bar.innerHTML = `
      <div><label>Customer (existing or new)</label><input name="client" list="custs" value="${esc(invForm.client)}" placeholder="Name"></div>
      <div><label>Amount paying (TTD)</label><input name="paying" type="number" step="0.01" min="0" value="${esc(invForm.paying)}"></div>
      <div class="card"><span>${ids.length} item(s) · total</span><b>${money(p.total)}</b></div>
      <div class="card"><span>Previously paid</span><b>${money(p.prev)}</b></div>
      <div class="card"><span>Owing after</span><b>${money(p.balance)}</b>${p.tip ? `<span class="good"> tip ${money(p.tip)}</span>` : ''}</div>
      <div class="card"><span>Profit</span><b>${money(p.profit)}</b>${p.loss ? `<span class="err"> loss ${money(p.loss)}</span>` : ''}</div>
      <div><button class="primary" data-act="make-invoice" ${p.errors.length ? 'disabled' : ''} style="width:100%">Sell &amp; create invoice</button>
        <div class="err">${esc(ids.length ? p.errors[0] || '' : 'Tick “Add to invoice” on the items.')}</div></div>`;
    if (keep) { const el = bar.querySelector(`[name="${keep}"]`); if (el) { el.focus(); const v = el.value; el.value = ''; el.value = v; } }
  }

  function Invoices() {
    const rows = state.invoices.slice().reverse();
    return `<h2>Invoice log</h2><div class="tablewrap"><table><thead><tr><th>Invoice #</th><th class="l">Bill to</th><th class="l">Items</th><th>Status</th><th>Total</th><th>Paid</th><th>Previously paid</th><th>Balance</th><th>Delivery</th><th>Date</th><th>Due</th><th>Profit</th><th>Loss</th><th>Tip</th><th></th></tr></thead><tbody>
      ${rows.map((v) => { const st = L.invoiceStatus(v); return `<tr><td>${v.no}</td><td class="l">${esc(v.client)}</td><td class="l" style="white-space:normal;min-width:200px">${esc(v.desc)}</td>
        <td><span class="pill ${st}">${st}</span></td><td>${money(v.total)}</td><td>${money(v.amountPaid)}</td><td>${money(v.previouslyPaid)}</td><td>${money(v.balance)}</td><td>${money(v.delivery)}</td>
        <td>${day(v.date)}</td><td>${day(v.due)}</td><td>${v.profit ? money(v.profit) : ''}</td><td>${v.loss ? money(v.loss) : ''}</td><td>${v.tip ? money(v.tip) : ''}</td>
        <td><button data-act="view-inv" data-id="${v.no}">View / PDF</button> <button class="danger" data-act="del-inv" data-id="${v.no}">✕</button></td></tr>`; }).join('') || '<tr><td colspan="15" class="muted">No invoices yet.</td></tr>'}
      </tbody></table></div>`;
  }

  function Customers() {
    const rows = L.customerStats(state);
    return `<h2>Customer log</h2><div class="tablewrap"><table><thead><tr><th class="l">Customer</th><th>Status</th><th>Total owing</th><th>Total sales</th><th>Items bought</th><th>Items owing</th><th>Profit made</th><th class="l">Last item</th><th>Last purchase</th></tr></thead><tbody>
      ${rows.map((c) => `<tr><td class="l">${esc(c.name)}</td><td><span class="pill ${c.status === 'Owing' ? 'Owing' : 'Up'}">${c.status}</span></td><td>${money(c.owing)}</td><td>${money(c.sales)}</td><td>${c.bought}</td><td>${c.itemsOwing}</td><td>${money(c.profit)}</td><td class="l">${esc(c.lastItem)}</td><td>${day(c.lastDate)}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">No customers yet.</td></tr>'}
      </tbody></table></div>`;
  }

  function Items() {
    const counts = STATUSES.map((s) => `<div class="card"><span>${s}</span><b>${state.items.filter((i) => i.status === s).length}</b></div>`).join('');
    const rows = state.items.map((i) => {
      const b = state.batches.find((x) => x.id === i.batchId), c = L.itemCalc(b, i), sold = i.status === 'Paid' || i.status === 'Owing';
      return `<tr><td>${i.id}</td><td>${esc(i.store)}</td><td><span class="pill ${i.status.replace(' ', '')}">${i.status}</span></td><td class="l">${esc(i.desc)}</td><td>${esc(i.customer)}</td><td>${sold ? money(i.sold) : ''}</td><td>${c.landed ? money(c.landed) : ''}</td><td>${sold && c.landed ? money(c.profit) : ''}</td><td>${esc(i.invoice)}</td></tr>`;
    }).join('');
    return `<h2>Item log</h2><div class="cards">${counts}</div><div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>Item ID</th><th>Store</th><th>Status</th><th class="l">Description</th><th>Customer</th><th>Sold for</th><th>Landed cost</th><th>Profit / loss</th><th>Invoice #</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function Summary() {
    const y = state.settings.year, m = L.monthlySummary(state, y);
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sum = (k) => m.reduce((t, x) => t + x[k], 0);
    const peak = Math.max(1, ...m.map((x) => Math.max(x.sales, x.expense)));
    const row = (label, k) => `<tr><td class="l"><b>${label}</b></td>${m.map((x) => `<td>${x[k] ? money(x[k]).replace('TT$ ', '') : ''}</td>`).join('')}<td><b>${money(sum(k)).replace('TT$ ', '')}</b></td></tr>`;
    return `<h2>Annual summary ${y}</h2>
      <div class="bars">${m.map((x, i) => `<div title="Sales ${money(x.sales)} / Expense ${money(x.expense)}"><i style="height:${x.sales / peak * 100}px"></i><i style="height:${x.expense / peak * 100}px;background:var(--mute);opacity:.5"></i>${names[i]}</div>`).join('')}</div>
      <p class="muted">Bars: sales (pink) vs expenses (grey). Expenses count in the month a batch was ordered; sales and profit in the month of the invoice.</p>
      <div class="tablewrap"><table><thead><tr><th></th>${names.map((n) => `<th>${n}</th>`).join('')}<th>Total</th></tr></thead><tbody>${row('Expense', 'expense')}${row('Sales', 'sales')}${row('Profit', 'profit')}</tbody></table></div>`;
  }

  function showInvoice(no) {
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    const lines = v.lines && v.lines.length ? v.lines : [{ desc: v.desc, qty: v.qty, price: v.total - v.delivery }];
    const sub = lines.reduce((t, l) => t + l.qty * l.price, 0);
    $('#modal').hidden = false;
    $('#modal').innerHTML = `<div class="sheet"><h2>INVOICE</h2>
      <div class="meta"><div><b>BILL TO</b><br>${esc(v.client)}</div><div style="text-align:right"><b>INVOICE #</b> ${v.no}<br><b>DATE</b> ${day(v.date)}<br><b>DUE DATE</b> ${day(v.due)}</div></div>
      <table><thead><tr><th class="l">Description</th><th>QTY</th><th>Price</th><th>Amount</th></tr></thead><tbody>
      ${lines.map((l) => `<tr><td>${esc(l.desc)}</td><td class="r">${l.qty}</td><td class="r">${money(l.price)}</td><td class="r">${money(l.qty * l.price)}</td></tr>`).join('')}</tbody></table>
      <div class="tot"><div><span>Subtotal</span><span>${money(sub)}</span></div><div><span>Delivery</span><span>${money(v.delivery)}</span></div><div><span>Total</span><span>${money(v.total)}</span></div>
      <div><span>Paid</span><span>${money(v.amountPaid)}</span></div><div><span>Previously paid</span><span>${money(v.previouslyPaid)}</span></div><div class="bal"><span>BALANCE DUE</span><span>${money(v.balance)}</span></div></div>
      <p><b>Terms or notes</b><br>Thanks for your business.</p>
      <div class="actions"><button data-act="print">Print / Save as PDF</button><button data-act="close">Close</button></div></div>`;
  }

  /* ---------- events ---------- */

  function updateRow(tr) {
    const i = state.items.find((x) => x.id === tr.dataset.id), b = state.batches.find((x) => x.id === i.batchId), c = L.itemCalc(b, i);
    const set = (k, v) => { const el = tr.querySelector(`[data-c="${k}"]`); if (el) el.textContent = v ? money(v) : ''; };
    ['costTTD', 'clearing', 'landed', 'recommended'].forEach((k) => set(k, c[k]));
    set('profit', c.landed ? c.profit : 0);
    const head = tr.closest('section').querySelector('.batchhead small:last-of-type');
    if (head) { const st = L.batchStats(state, b); head.textContent = `Clearing paid ${money(b.clearingPaid)} (${(st.clearingPct * 100).toFixed(0)}%) · Invested ${money(st.investment)} · Sales ${money(st.sales)} · Profit ${money(st.profit)} · Sold ${st.sold}/${st.count} · ${b.status === 'Received' ? 'Transit ' : 'In transit '}${L.timeInTransit(b)}`; }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab],[data-act]'); if (!t) { if (e.target.id === 'modal') closeModal(); return; }
    if (t.dataset.tab) { tab = t.dataset.tab; say(''); return render(); }
    const id = t.dataset.id;
    switch (t.dataset.act) {
      case 'toggle': openBatches.has(id) ? openBatches.delete(id) : openBatches.add(id);
        if (!openBatches.size) openBatches.add(id); return render();
      case 'del-batch': if (confirm(`Delete ${id} and all of its items? This cannot be undone.`)) run(() => L.deleteBatch(state, id), `${id} deleted.`); return;
      case 'del-inv': if (confirm(`Delete ${id}? Its items go back to their previous state.`)) run(() => L.deleteInvoice(state, id), `${id} deleted.`); return;
      case 'view-inv': return showInvoice(id);
      case 'print': return window.print();
      case 'close': return closeModal();
      case 'make-invoice': return run(() => {
        const inv = L.createInvoice(state, { itemIds: [...selected], client: invForm.client, paying: invForm.paying });
        selected = new Set(); invForm = { client: '', isNew: false, paying: '' }; return inv;
      }, (inv) => `Created ${inv.no} for ${inv.client}. Balance ${money(inv.balance)}.`);
      case 'make-available': {
        const f = $('#f-clear'); const b = f ? f.batch.value : null; if (!b) return;
        return run(() => L.makeAvailable(state, b), (n) => `${b} received — ${n} item(s) now Available.`);
      }
      case 'import-xlsx': return pickFile('.xlsx,.xls', importXlsx);
      case 'import-json': return pickFile('.json', importJson);
      case 'export-json': return download('buy-sell-backup.json', JSON.stringify(state, null, 2));
      case 'reset': if (confirm('Erase ALL data in this browser? Make a Backup first.') && confirm('Really erase everything?')) { state = L.defaultState(); selected = new Set(); run(() => 0, 'All data cleared.'); } return;
    }
  });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f));
    if (f.id === 'f-batch') run(() => L.createBatch(state, d), (b) => `${b.id} created with ${d.count} items. Fill in item names and costs on the Inventory tab.`);
    if (f.id === 'f-clear') run(() => L.payClearing(state, d.batch, d.amount), `Clearing payment recorded for ${d.batch}.`);
    if (f.id === 'f-settings') run(() => {
      Object.assign(state.settings, { year: +d.year || state.settings.year, markup: +d.markup || 1 });
      ['USD', 'EUR', 'GBP'].forEach((c) => { state.settings.rates[c] = +d[c] || state.settings.rates[c]; });
    }, 'Settings saved. New batches use the new rates; existing batches keep their rate.');
  });

  document.addEventListener('change', (e) => {
    const el = e.target, tr = el.closest('tr[data-id]');
    if (tr && el.dataset.f) {
      const i = state.items.find((x) => x.id === tr.dataset.id), f = el.dataset.f;
      i[f] = ['cost', 'sold', 'delivery'].includes(f) ? Math.max(0, parseFloat(el.value) || 0) : el.value;
      save(); updateRow(tr); refreshInvoiceBar();
    } else if (tr && el.hasAttribute('data-sel')) {
      el.checked ? selected.add(tr.dataset.id) : selected.delete(tr.dataset.id); refreshInvoiceBar();
    } else if (el.id === 'clear-batch') showClearInfo();
  });

  document.addEventListener('input', (e) => {
    if (e.target.closest('#invbar')) { invForm[e.target.name] = e.target.value; refreshInvoiceBar(); }
    if (e.target.form && e.target.form.id === 'f-batch') rateHint();
  });

  function rateHint() {
    const f = $('#f-batch'), h = $('#rate-hint'); if (!f || !h) return;
    const r = L.effectiveRate(state, f.currency.value), c = parseFloat(f.totalCost.value) || 0;
    h.textContent = `Rate ${r.toFixed(4)} → ${money(c * r)} before clearing.`;
  }
  function showClearInfo() {
    const sel = $('#clear-batch'), box = $('#clear-info'); if (!sel || !box) return;
    const b = state.batches.find((x) => x.id === sel.value); if (!b) return;
    box.innerHTML = `${b.status} · ordered ${day(b.datePurchased)} · cost ${money(b.totalCost * b.rate)} · clearing paid <b>${money(b.clearingPaid)}</b>${b.dateLastPayment ? ' (last ' + day(b.dateLastPayment) + ')' : ''} · ${L.timeInTransit(b)}`;
  }
  function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
  function download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }
  function pickFile(accept, handler) { const f = $('#file'); f.accept = accept; f.value = ''; f.onchange = () => f.files[0] && handler(f.files[0]); f.click(); }
  function importJson(file) {
    file.text().then((t) => { const s = JSON.parse(t); if (!s.batches || !s.items) throw new Error('Not a backup file.'); state = s; selected = new Set(); save(); say('Backup restored.'); render(); }).catch((e) => say('⚠️ ' + e.message));
  }
  function importXlsx(file) {
    if (state.batches.length && !confirm('Importing replaces the data currently in this browser. Continue?')) return;
    say('Reading workbook…');
    loadSheetJS().then((X) => file.arrayBuffer().then((buf) => {
      const wb = X.read(buf, { type: 'array', cellDates: true });
      const sheets = {};
      ['Batch Log', 'Hidden Master Log', 'Invoice Log'].forEach((n) => { if (wb.Sheets[n]) sheets[n] = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }); });
      if (!sheets['Hidden Master Log'] || !sheets['Batch Log']) throw new Error('This does not look like the tracker workbook (needs Batch Log and Hidden Master Log).');
      const imp = L.importWorkbook(sheets);
      imp.settings.year = state.settings.year; imp.settings.rates = state.settings.rates;
      state = imp; selected = new Set(); save(); say(`Imported ${state.batches.length} batches, ${state.items.length} items, ${state.invoices.length} invoices.`); render();
    })).catch((e) => say('⚠️ ' + e.message));
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

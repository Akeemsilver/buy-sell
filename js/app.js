/* Mobile UI. State lives in localStorage; all rules live in logic.js. */
(function () {
  const L = window.Logic;
  const KEY = 'buy-sell-tracker:v1';
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const moneyText = (n) => 'TT$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n) => `<span class="amt">${moneyText(n)}</span>`;   // wrapped so the eye button can blur amounts
  const plain = (html) => String(html).replace(/<[^>]+>/g, '');
  const day = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const STATUSES = ['In Transit', 'Available', 'Owing', 'Paid', 'Closed'];
  const bStatus = (b) => L.batchStatus(state, b);
  const ICONS = {
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
    download: '<path d="M12 4v11"/><path d="M7.5 11 12 15.5 16.5 11"/><path d="M5 19.5h14"/>',
    filter: '<path d="M3.5 5h17l-6.5 8v6l-4 2v-8z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
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
  let syncHistory = () => {};
  let hideAmounts = pref('hideAmounts', false);
  let theme = pref('theme', 'auto');
  let flt = pref('filter', { period: 'all', batch: 'all' });
  function pref(k, d) { try { const v = localStorage.getItem('buy-sell-pref:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function setPref(k, v) { try { localStorage.setItem('buy-sell-pref:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  function applyTheme() {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', theme);
    const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#3a1128' : '#741b47';
  }
  /* ---------- install banner ---------- */

  let installEvt = null;                                   // Chrome/Android install prompt, when the browser offers it
  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const WEEK = 7 * 864e5;
  function installBanner() {
    if (isStandalone() || pref('installed', false) || Date.now() - pref('installDismissed', 0) < WEEK) return '';
    if (!installEvt && !isIOS) return '';                  // browser can't install it (or already did): stay hidden
    return `<div class="install"><img src="icons/logo.png" alt="" width="44" height="44">
      <div class="grow"><b>Install the B-RUIZ app</b><small>${installEvt ? 'Works offline, opens like a normal app' : 'Add it to your home screen'}</small></div>
      <button class="pill-btn solid" data-act="install">${installEvt ? 'Install' : 'How'}</button>
      <button class="x" data-act="install-dismiss" aria-label="Dismiss">✕</button></div>`;
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (tab === 'home') render(); });
  window.addEventListener('appinstalled', () => { installEvt = null; setPref('installed', true); toast('App installed 🎉'); render(); });

  const filtered = () => flt.period !== 'all' || flt.batch !== 'all';

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return L.migrate(JSON.parse(raw)); } catch (e) { /* use default */ }
    return L.defaultState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast('Could not save to browser storage.'); } }
  function toast(msg) {
    const t = $('#toast'); t.textContent = plain(msg); t.classList.add('show');
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
    const btn = (act, label, icon, extra) => `<button class="round" data-act="${act}" aria-label="${label}"><svg viewBox="0 0 24 24">${ICONS[icon]}</svg>${extra || ''}</button>`;
    $('#appbar-right').innerHTML = $('#back').hidden ? `<div class="tools">${btn('view', hideAmounts ? 'Show amounts' : 'Hide amounts', hideAmounts ? 'eyeoff' : 'eye')}${btn('download', 'Download or export', 'download')}${btn('filter', 'Filter', 'filter', filtered() ? '<i class="dot"></i>' : '')}${btn('settings', 'Settings', 'gear')}</div>` : '';
    document.body.classList.toggle('hide-amounts', hideAmounts);
    $('#view').innerHTML = (tab === 'home' ? installBanner() : '') + { home: Home, stock: Stock, sell: Sell, people: People, more: More }[tab]();
    renderActionBar();
    syncHistory();
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
    const t = L.totals(state, flt);
    const inTransit = state.batches.filter((b) => bStatus(b) === 'In Transit');
    const owing = L.customerStats(state).filter((c) => c.owing > 0).sort((a, b) => b.owing - a.owing).slice(0, 4);
    const recent = L.filterInvoices(state, flt).slice(-3).reverse();
    if (!state.batches.length) return `<div class="empty"><b>Welcome 👋</b>Start by ordering a batch, or import your existing spreadsheet from More → Data.</div>
      <div class="list"><button class="btn primary" data-act="new-batch">+ New batch</button><button class="btn" data-act="import-xlsx">Import my .xlsx workbook</button></div>`;
    return `${filtered() ? `<button class="row tap" data-act="filter" style="margin-bottom:10px;background:var(--tint)"><div class="grow"><b>Filtered: ${esc(filterLabel())}</b><small>Period limits sales, expenses, profit · tap to change</small></div><span class="chev">›</span></button>` : ''}<div class="stats">
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
    <div class="list">${L.filterBatches(state, flt).slice().sort((a, b) => b.num - a.num).map((b) => {
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
    return `<div class="chips">${chips(open.map((x) => x.id), stockBatch, 'pick-batch')}<button class="chip" data-act="new-batch">+ Batch</button></div>
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
    if (moreView === 'invoices') return `<div class="list">${L.filterInvoices(state, flt).slice().reverse().map(invoiceRow).join('') || '<div class="empty">No invoices yet.</div>'}</div>`;
    if (moreView === 'items') return ItemLog();
    if (moreView === 'summary') return Summary();
    if (moreView === 'settings') return Settings();
    const go = (v, icon, label, sub) => `<button class="row tap" data-act="more" data-id="${v}"><span style="font-size:22px">${icon}</span><div class="grow"><b>${label}</b><small>${sub}</small></div><span class="chev">›</span></button>`;
    return `<div class="list">${go('invoices', '🧾', 'Invoices', state.invoices.length + ' total')}${go('items', '📋', 'Item log', state.items.length + ' items')}
      ${go('summary', '📈', 'Summary', 'Monthly sales, expenses, profit')}${go('settings', '⚙️', 'Settings', 'Exchange rates, year, margin')}</div>
      ${isStandalone() ? '' : `<div class="list" style="margin-top:8px"><button class="row tap" data-act="install-guide"><span style="font-size:22px">📲</span><div class="grow"><b>Install app</b><small>${isIOS ? 'Add to your iPhone home screen' : 'Add to your home screen'}</small></div><span class="chev">›</span></button></div>`}
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
    const seg = [['light', '☀️ Light'], ['dark', '🌙 Dark'], ['auto', '📱 Auto']];
    return `<h2 style="margin-top:4px">Appearance</h2>
      <div class="seg" role="radiogroup" aria-label="Theme">${seg.map(([k, l]) => `<button class="${theme === k ? 'on' : ''}" role="radio" aria-checked="${theme === k}" data-act="set-theme" data-id="${k}">${l}</button>`).join('')}</div>
      <p class="muted small">Auto follows your phone's light or dark setting.</p>
      <h2>Business</h2>
      <form id="f-settings"><div class="grid2"><div><label>Year</label><input name="year" type="number" inputmode="numeric" value="${s.year}"></div>
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
    syncHistory();
  }
  function closeSheet() {
    if ($('#sheet').hidden) return;
    $('#sheet').hidden = true; $('#scrim').hidden = true; $('#sheet').innerHTML = ''; document.body.style.overflow = '';
    $('#sheet').style.transform = ''; $('#sheet').style.transition = ''; $('#scrim').style.opacity = ''; $('#scrim').style.transition = '';
    syncHistory();
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

  // Invoice design follows the Google Sheets invoice template (banner, mauve table header, balance bar, pink footer).
  const INV = { mauve: '#cea8bd', band: '#e6d2db', grey: '#767676', mid: '#545454' };
  const invMoney = (n) => 'TT$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const invDate = (d) => new Date(d).toLocaleDateString('en-GB');
  const invLines = (v) => (v.lines && v.lines.length ? v.lines : [{ desc: v.desc, qty: v.qty, price: v.total - v.delivery }]);

  // "PAID IN FULL" rubber stamp: double border, tilted, worn ink. Seeded by invoice number so it never changes.
  const stampCache = {};
  function stampCanvas(seed, dateText) {
    const W = 560, H = 250, S = 2, INK = '24,112,58';
    let a = 0; for (const ch of String(seed)) a = (a * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const ink = document.createElement('canvas'); ink.width = W * S; ink.height = H * S;
    const x = ink.getContext('2d'); x.scale(S, S);
    x.translate(W / 2, H / 2); x.rotate(-9 * Math.PI / 180); x.translate(-W / 2, -H / 2);
    const rr = (px, py, w, h, r) => { x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath(); };
    const spaced = (txt, cx, y, gap) => {
      const ws = [...txt].map((ch) => x.measureText(ch).width), total = ws.reduce((s, w) => s + w, 0) + gap * (txt.length - 1);
      let px = cx - total / 2; x.textAlign = 'left';
      [...txt].forEach((ch, i) => { x.fillText(ch, px, y); px += ws[i] + gap; });
    };
    x.strokeStyle = x.fillStyle = `rgba(${INK},0.92)`; x.shadowColor = `rgba(${INK},0.5)`; x.shadowBlur = 1.6;
    x.lineWidth = 9; rr(40, 42, 480, 166, 24); x.stroke();
    x.lineWidth = 2.5; rr(55, 57, 450, 136, 15); x.stroke();
    x.textBaseline = 'alphabetic';
    let size = 74; const face = (s) => `900 ${s}px Roboto, "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    x.font = face(size); while (x.measureText('PAID IN FULL').width + 11 * 5 > 395 && size > 30) { size -= 2; x.font = face(size); }
    spaced('PAID IN FULL', W / 2, 128, 5);
    x.fillRect(82, 145, 396, 2.5);
    x.font = `700 21px Roboto, "Helvetica Neue", Arial, sans-serif`; spaced(`B-RUIZ  •  ${dateText}`, W / 2, 177, 3);
    // worn ink: speckles and a few rough patches knocked out, deterministic per invoice
    x.shadowBlur = 0; x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(0,0,0,${0.35 + rnd() * 0.65})`; x.beginPath(); x.arc(rnd() * W, rnd() * H, 0.35 + rnd() * rnd() * 1.7, 0, 7); x.fill(); }
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(0,0,0,${0.25 + rnd() * 0.5})`; x.beginPath(); x.arc(rnd() * W, rnd() * H, 1.6 + rnd() * 3.4, 0, 7); x.fill(); }
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(rnd() * W, rnd() * H, 18 + rnd() * 50, 0.8 + rnd() * 1.4); }
    return ink;
  }
  const isPaidInFull = (v) => v.total > 0 && v.balance <= 0;
  const stampDate = (v) => new Date(v.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  function stampURL(v) { const k = v.no + '|' + v.date; return stampCache[k] || (stampCache[k] = stampCanvas(v.no, stampDate(v)).toDataURL('image/png')); }

  function sheetInvoice(no) {
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    const lines = invLines(v), sub = lines.reduce((s, l) => s + l.qty * l.price, 0), st = L.invoiceStatus(v);
    openSheet(`<div class="printable"><div class="inv"><img class="inv-banner" src="icons/invoice-banner.jpg" alt="B.RUIZ invoice header">
      <div class="inv-body">
        <div class="inv-top"><div><div class="lbl">BILL TO</div><div class="client">${esc(v.client)}</div></div>
          <div class="inv-meta"><div><span class="lbl">INVOICE #</span><span>${v.no}</span></div><div><span class="lbl">DATE</span><span>${invDate(v.date)}</span></div><div><span class="lbl">DUE DATE</span><span>${invDate(v.due)}</span></div></div></div>
        <table class="inv-t"><thead><tr><th>Description</th><th class="r">QTY</th><th class="r">Price</th><th class="r">Amount</th></tr></thead><tbody>
          ${lines.map((l) => `<tr><td>${esc(l.desc)}</td><td class="r">${l.qty}</td><td class="r">${invMoney(l.price)}</td><td class="r">${invMoney(l.qty * l.price)}</td></tr>`).join('')}</tbody></table>
        <div class="inv-sum">${isPaidInFull(v) ? `<img class="stamp" src="${stampURL(v)}" alt="Paid in full">` : ''}<div class="inv-tot"><div><span>Subtotal</span><b>${invMoney(sub)}</b></div><div><span>Delivery</span><b>${invMoney(v.delivery)}</b></div><div><span>Total</span><b>${invMoney(v.total)}</b></div>
          <div><span>Paid</span><b>${invMoney(v.amountPaid)}</b></div><div><span>Previously Paid</span><b>${invMoney(v.previouslyPaid)}</b></div><div class="due"><span>BALANCE DUE</span><b>${invMoney(v.balance)}</b></div></div></div>
        <div class="inv-terms"><b>Terms Or Notes</b><span>Thanks for your business.</span></div></div><div class="inv-foot"></div></div></div>
      <div class="muted small" style="margin-top:8px">Status: <span class="pill ${st}">${st}</span>${v.profit ? ' · profit ' + money(v.profit) : ''}${v.loss ? ' · loss ' + money(v.loss) : ''}${v.tip ? ' · tip ' + money(v.tip) : ''}</div>
      <div class="btns"><button class="btn primary" data-act="share-img" data-id="${v.no}">Share invoice image</button>
      <button class="btn" data-act="save-img" data-id="${v.no}">Save as image</button>
      <button class="btn" data-act="print">Print / Save as PDF</button>
      <button class="btn danger" data-act="del-inv" data-id="${v.no}">Delete invoice</button><button class="btn" data-act="close">Close</button></div>`);
  }

  // Draws the same invoice onto a canvas (800 x N, 2x) so it can be shared or saved as a PNG for WhatsApp etc.
  function invoiceCanvas(v) {
    return new Promise((ok, fail) => {
      const img = new Image(); img.onerror = () => fail(new Error('Could not load the invoice header.'));
      img.onload = () => {
        const W = 800, S = 2, lines = invLines(v), sub = lines.reduce((s, l) => s + l.qty * l.price, 0);
        const bannerH = Math.round(W * img.naturalHeight / img.naturalWidth), rowH = 36;
        const H = bannerH + 508 + lines.length * rowH + 62;   // ends 36px under the terms baseline: pink band sits right under the notes, as in the sheet
        const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
        const x = c.getContext('2d'); x.scale(S, S);
        const F = (w, s) => { x.font = `${w} ${s}px "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif`; };
        x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
        x.drawImage(img, 0, 0, W, bannerH);
        const L0 = 36, R0 = W - 36; let y = bannerH + 44;
        x.textBaseline = 'alphabetic';
        F('700', 14); x.fillStyle = INV.grey; x.textAlign = 'left'; x.fillText('BILL TO', L0, y);
        F('400', 22); x.fillStyle = '#000'; x.fillText(v.client, L0, y + 32);
        [['INVOICE #', v.no], ['DATE', invDate(v.date)], ['DUE DATE', invDate(v.due)]].forEach(([k, val], i) => {
          F('700', 13); x.fillStyle = INV.grey; x.textAlign = 'right'; x.fillText(k, R0 - 150, y + i * 26);
          F('400', 16); x.fillStyle = '#000'; x.fillText(val, R0, y + i * 26);
        });
        y += 74;
        x.fillStyle = INV.mauve; x.fillRect(L0 - 8, y, W - 2 * (L0 - 8), 38);
        F('700', 14); x.fillStyle = '#fff'; x.textAlign = 'left'; x.fillText('Description', L0, y + 25);
        x.textAlign = 'right'; x.fillText('QTY', R0 - 250, y + 25); x.fillText('Price', R0 - 130, y + 25); x.fillText('Amount', R0, y + 25);
        y += 38;
        lines.forEach((l) => {
          F('400', 16); x.fillStyle = '#000'; x.textAlign = 'left';
          let d = String(l.desc); while (x.measureText(d).width > 330 && d.length > 4) d = d.slice(0, -2); if (d !== String(l.desc)) d = d.trim() + '…';
          x.fillText(d, L0, y + 24);
          x.textAlign = 'right'; x.fillText(String(l.qty), R0 - 250, y + 24); x.fillText(invMoney(l.price), R0 - 130, y + 24); x.fillText(invMoney(l.qty * l.price), R0, y + 24);
          y += rowH;
        });
        x.strokeStyle = '#bdbdbd'; x.lineWidth = 1; x.beginPath(); x.moveTo(L0 - 8, y + 0.5); x.lineTo(W - L0 + 8, y + 0.5); x.stroke();
        y += 34; const totTop = y - 20;
        [['Subtotal', sub], ['Delivery', v.delivery], ['Total', v.total], ['Paid', v.amountPaid], ['Previously Paid', v.previouslyPaid]].forEach(([k, val]) => {
          F('400', 16); x.fillStyle = INV.mid; x.textAlign = 'right'; x.fillText(k, R0 - 130, y); x.fillStyle = '#000'; x.fillText(invMoney(val), R0, y); y += 28;
        });
        x.fillStyle = INV.mauve; x.fillRect(W - 360, y - 14, 360 - (L0 - 8), 36);
        F('700', 16); x.fillStyle = '#fff'; x.textAlign = 'right'; x.fillText('BALANCE DUE', R0 - 130, y + 10); x.fillText(invMoney(v.balance), R0, y + 10);
        if (isPaidInFull(v)) {
          x.save(); x.globalCompositeOperation = 'multiply';
          x.drawImage(stampCanvas(v.no, stampDate(v)), W - L0 - 350, y + 34, 340, 152); x.restore();
        }
        y += 78 + 100;   // Terms stay at the bottom, as in the sheet; the gap above them is where the stamp sits
        F('700', 16); x.fillStyle = '#000'; x.textAlign = 'left'; x.fillText('Terms Or Notes', L0, y);
        F('400', 15); x.fillStyle = INV.grey; x.fillText('Thanks for your business.', L0, y + 26);
        x.fillStyle = INV.band; x.fillRect(L0 - 8, H - 26, W - 2 * (L0 - 8), 26);
        c.toBlob((b) => (b ? ok(b) : fail(new Error('Could not create the image.'))), 'image/png');
      };
      img.src = 'icons/invoice-banner.jpg';
    });
  }
  function shareInvoiceImage(no, saveOnly) {
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    toast('Preparing image…');
    invoiceCanvas(v).then((blob) => {
      const file = new File([blob], `${v.no} ${v.client}.png`, { type: 'image/png' });
      if (!saveOnly && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: v.no, text: `Invoice ${v.no} — balance due ${invMoney(v.balance)}` }).catch((e) => { if (e && e.name !== 'AbortError') throw e; });
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      toast(saveOnly ? 'Invoice image saved' : 'Sharing isn\'t available here, so the image was saved');
    }).catch((e) => toast('⚠️ ' + e.message));
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

  /* ---------- top-bar tools ---------- */

  function filterLabel() {
    const p = { all: 'All time', thisMonth: 'This month', lastMonth: 'Last month', thisYear: 'This year' }[flt.period] || flt.period;
    return p + (flt.batch !== 'all' ? ' · ' + flt.batch : '');
  }

  function sheetFilter() {
    const y = new Date().getFullYear();
    const periods = [['all', 'All time'], ['thisMonth', 'This month'], ['lastMonth', 'Last month'], ['thisYear', 'This year'], [String(y - 1), String(y - 1)]];
    const chip = (act, id, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-id="${esc(id)}">${esc(label)}</button>`;
    openSheet(`<h3>Filter</h3><p class="muted small">Period limits sales, expenses and profit (by invoice and order date). Batch limits everything. Owing and stock counts are always as of today.</p>
      <h2>Period</h2><div class="suggest">${periods.map(([k, l]) => chip('set-period', k, l, flt.period === k)).join('')}</div>
      <h2>Batch</h2><div class="suggest">${chip('set-fbatch', 'all', 'All batches', flt.batch === 'all')}${state.batches.slice().sort((a, b) => b.num - a.num).map((b) => chip('set-fbatch', b.id, b.id, flt.batch === b.id)).join('')}</div>
      <div class="btns"><button class="btn" data-act="clear-filter">Clear filter</button><button class="btn primary" data-act="close">Done</button></div>`);
  }

  // Illustrated Add-to-Home-Screen walkthrough (drawn to match Safari's UI; mock colours stay light in dark mode)
  const SHARE = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 15V3M8 7l4-4 4 4M7 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  function sheetInstallHelp() {
    const ua = navigator.userAgent;
    const inApp = /FBAN|FBAV|Instagram|WhatsApp|Snapchat|TikTok|Line\/|GSA\/|; wv\)/i.test(ua);
    const other = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    if (!isIOS) {
      openSheet(`<h3>Install the app</h3><p class="muted small">Your browser installs it from its menu:</p>
        <ol style="line-height:1.9;padding-left:20px"><li><b>Chrome / Edge (Android):</b> tap <b>⋮</b> → <b>Install app</b> (or <b>Add to Home screen</b>)</li>
        <li><b>Samsung Internet:</b> tap <b>☰</b> → <b>Add page to</b> → <b>Home screen</b></li><li><b>Desktop Chrome / Edge:</b> click the install icon in the address bar</li></ol>
        <div class="btns"><button class="btn primary" data-act="close">Got it</button></div>`);
      return;
    }
    const warn = inApp ? '<div class="note bad">⚠️ This looks like an in-app browser (Instagram, Facebook, WhatsApp…). It can\'t install apps. Tap <b>Copy link</b> below, open <b>Safari</b>, and paste it in the address bar.</div>'
      : other ? '<div class="note">You\'re not in Safari. Chrome on iPhone works too: tap the <b>Share</b> icon next to the address bar. If you can\'t find it, open this page in <b>Safari</b> instead.</div>' : '';
    openSheet(`<h3>Add to your iPhone home screen</h3><p class="muted small">Takes about 10 seconds. Once added, the app opens full screen with its own icon.</p>${warn}
      <div class="step"><i>1</i><div><b>Tap the Share button</b><small>The square with an arrow, at the bottom of Safari (on iPad it is at the top).</small></div></div>
      <div class="mock"><div class="safari"><span class="g">‹</span><span class="g">›</span><span class="hl">${SHARE}<em>Share</em></span><span class="g">📖</span><span class="g">❏</span></div></div>
      <div class="step"><i>2</i><div><b>Scroll down and tap “Add to Home Screen”</b><small>It is in the list under the apps row. You may need to swipe up.</small></div></div>
      <div class="mock"><div class="rows"><div>Copy <span>⧉</span></div><div>Add to Bookmarks <span>📖</span></div><div>Add to Favourites <span>☆</span></div>
        <div class="hl">Add to Home Screen <span>⊞</span></div><div>Find on Page <span>🔍</span></div></div></div>
      <div class="step"><i>3</i><div><b>Tap “Add” at the top right</b><small>You can keep the name <b>B-RUIZ</b>.</small></div></div>
      <div class="mock"><div class="dlg"><div class="hdr"><span>Cancel</span><b>Add to Home Screen</b><span class="hl">Add</span></div>
        <div class="body"><img src="icons/icon-192.png" alt="" width="52" height="52"><div><b>B-RUIZ</b><small>${esc(location.host)}</small></div></div></div></div>
      <div class="step"><i>4</i><div><b>Open it from your home screen</b><small>Find the B-RUIZ icon and tap it. Your data is stored on this phone — if you already entered data in Safari, use <b>Download → Full backup</b> first and <b>Restore</b> it after opening the new app.</small></div></div>
      <div class="mock home"><div class="app"><img src="icons/icon-192.png" alt="" width="58" height="58"><span>B-RUIZ</span></div></div>
      <div class="btns"><button class="btn" data-act="copy-link">Copy link</button><button class="btn primary" data-act="close">Got it</button></div>`);
  }

  function sheetDownload() {
    openSheet(`<h3>Download</h3><p class="muted small">Spreadsheets open in Excel or Google Sheets.</p>
      <div class="list" style="margin-top:12px">
        <button class="row tap" data-act="export-json"><span style="font-size:22px">💾</span><div class="grow"><b>Full backup</b><small>Everything, to restore later (.json)</small></div></button>
        <button class="row tap" data-act="csv" data-id="invoices"><span style="font-size:22px">🧾</span><div class="grow"><b>Invoices</b><small>${state.invoices.length} rows (.csv)</small></div></button>
        <button class="row tap" data-act="csv" data-id="items"><span style="font-size:22px">📋</span><div class="grow"><b>Items</b><small>${state.items.length} rows (.csv)</small></div></button>
        <button class="row tap" data-act="csv" data-id="customers"><span style="font-size:22px">👥</span><div class="grow"><b>Customers</b><small>${L.customerStats(state).length} rows (.csv)</small></div></button></div>
      <div class="btns"><button class="btn" data-act="close">Close</button></div>`);
  }

  function csvOf(kind) {
    const q = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    let head, rows;
    if (kind === 'invoices') {
      head = ['Invoice #', 'Bill to', 'Items', 'Status', 'Total', 'Amount paid', 'Previously paid', 'Balance due', 'Delivery', 'Date', 'Due date', 'Quantity', 'Profit', 'Loss', 'Tip'];
      rows = state.invoices.map((v) => [v.no, v.client, v.desc, L.invoiceStatus(v), v.total, v.amountPaid, v.previouslyPaid, v.balance, v.delivery, v.date.slice(0, 10), v.due.slice(0, 10), v.qty, v.profit || '', v.loss || '', v.tip || '']);
    } else if (kind === 'items') {
      head = ['Item ID', 'Batch', 'Store', 'Status', 'Description', 'Customer', 'Cost (store currency)', 'Cost (TTD)', 'Clearing', 'Landed cost', 'Sold for', 'Profit', 'Amount paid', 'Owing', 'Invoice #'];
      rows = state.items.map((i) => { const c = L.itemCalc(state.batches.find((b) => b.id === i.batchId), i);
        return [i.id, i.batchId, i.store, i.status, i.desc, i.customer, i.cost || '', L.r2(c.costTTD) || '', L.r2(c.clearing) || '', L.r2(c.landed) || '', i.sold || '', i.sold > 0 && c.landed ? L.r2(i.sold - c.landed) : '', i.paid || '', i.owing || '', i.invoice]; });
    } else {
      head = ['Customer', 'Status', 'Total owing', 'Total sales', 'Items bought', 'Items owing', 'Profit made', 'Last item', 'Last purchase'];
      rows = L.customerStats(state).map((c) => [c.name, c.status, c.owing, c.sales, c.bought, c.itemsOwing, c.profit, c.lastItem, c.lastDate ? c.lastDate.toISOString().slice(0, 10) : '']);
    }
    return '\ufeff' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
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
      case 'view': hideAmounts = !hideAmounts; setPref('hideAmounts', hideAmounts); return render();
      case 'set-theme': theme = id; setPref('theme', theme); applyTheme(); return render();
      case 'install':
        if (installEvt) { const ev = installEvt; installEvt = null; render(); ev.prompt(); return ev.userChoice.then((r) => { if (r.outcome === 'accepted') setPref('installed', true); }).catch(() => {}); }
        return sheetInstallHelp();
      case 'install-guide': if (installEvt) { const ev = installEvt; installEvt = null; ev.prompt(); return ev.userChoice.then((r) => { if (r.outcome === 'accepted') setPref('installed', true); render(); }).catch(() => {}); } return sheetInstallHelp();
      case 'copy-link': return (navigator.clipboard ? navigator.clipboard.writeText(location.href.split('#')[0]) : Promise.reject()).then(() => toast('Link copied — paste it in Safari'), () => toast('Copy the address from your browser bar'));
      case 'install-dismiss': setPref('installDismissed', Date.now()); return render();
      case 'download': return sheetDownload();
      case 'filter': return sheetFilter();
      case 'settings': closeSheet(); tab = 'more'; moreView = 'settings'; window.scrollTo(0, 0); return render();
      case 'set-period': flt.period = id; setPref('filter', flt); render(); return sheetFilter();
      case 'set-fbatch': flt.batch = id; setPref('filter', flt); render(); return sheetFilter();
      case 'clear-filter': flt = { period: 'all', batch: 'all' }; setPref('filter', flt); render(); return sheetFilter();
      case 'csv': return download(`b-ruiz-${id}.csv`, csvOf(id), 'text/csv');
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
      case 'share-img': return shareInvoiceImage(id, false);
      case 'save-img': return shareInvoiceImage(id, true);
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
      if (['cost', 'sold', 'delivery'].includes(f)) { i[f] = Math.max(0, parseFloat(el.value) || 0); calcBox(i); } else { i[f] = el.value; }
      save();
    } else if (el.form && el.form.id === 'f-batch') {
      const f = el.form, r = L.effectiveRate(state, f.currency.value), c = parseFloat(f.totalCost.value) || 0;
      $('#rate-hint').textContent = `Rate ${r.toFixed(4)} → ${money(c * r)} before clearing.`;
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  /* ---------- files ---------- */

  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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

  /* ---------- Android back button & swipe-down sheets ---------- */

  // Every layer you can back out of (non-home tab, a More sub-screen, an open sheet) is one history entry,
  // so the system Back button / gesture closes the top layer first. At Home, Back asks to press again to exit.
  let hist = 0, skipPops = 0, exitArmed = false, exitTimer, reconTimer;
  const depth = () => (tab !== 'home' ? 1 : 0) + (tab === 'more' && moreView ? 1 : 0) + ($('#sheet').hidden ? 0 : 1);
  function reconcile() {
    reconTimer = null;
    if (skipPops > 0) return;                        // a back traversal is still in flight
    const d = depth();
    while (hist < d) history.pushState({ d: ++hist }, '');
    if (hist > d) { const n = hist - d; hist = d; skipPops = 1; history.go(-n); }
  }
  syncHistory = function () { if (!reconTimer) reconTimer = setTimeout(reconcile, 0); };
  window.addEventListener('popstate', (e) => {
    if (skipPops > 0) { skipPops--; syncHistory(); return; }
    const st = e.state || {};
    if (st.out) {                                    // backed past the app's first screen
      if (exitArmed) { exitArmed = false; history.back(); return; }
      exitArmed = true; clearTimeout(exitTimer); exitTimer = setTimeout(() => { exitArmed = false; }, 2500);
      toast('Press back again to exit'); history.pushState({ d: 0 }, ''); hist = 0; return;
    }
    const n = st.d == null ? 0 : st.d;
    if (n >= hist) return;                           // stale entry from before a reload: nothing to undo
    hist = n;
    if (!$('#sheet').hidden) closeSheet();
    else if (tab === 'more' && moreView) moreView = null;
    else if (tab !== 'home') tab = 'home';
    render();
  });
  history.replaceState({ out: true }, '');
  history.pushState({ d: 0 }, '');

  // Drag a sheet down to dismiss it (only when it is scrolled to the top, so scrolling still works).
  (function () {
    const sh = $('#sheet'), scrim = $('#scrim');
    let y0 = null, dy = 0, t0 = 0, dragging = false, canDrag = false;
    const reset = () => { sh.style.transition = ''; sh.style.transform = ''; scrim.style.transition = ''; scrim.style.opacity = ''; };
    sh.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; dragging = false; canDrag = sh.scrollTop <= 0;
    }, { passive: true });
    sh.addEventListener('touchmove', (e) => {
      if (y0 == null || !canDrag) return;
      dy = e.touches[0].clientY - y0;
      if (!dragging && dy > 10 && sh.scrollTop <= 0) { dragging = true; sh.style.transition = 'none'; scrim.style.transition = 'none'; }
      if (dragging) {
        e.preventDefault();
        const y = Math.max(0, dy);
        sh.style.transform = `translateY(${y}px)`; scrim.style.opacity = String(Math.max(0.2, 1 - y / 500));
      }
    }, { passive: false });
    const end = (cancel) => {
      if (!dragging) { y0 = null; return; }
      const fast = dy / Math.max(1, Date.now() - t0) > 0.6;
      dragging = false; y0 = null;
      sh.style.transition = 'transform .2s ease-out'; scrim.style.transition = 'opacity .2s';
      if (!cancel && (dy > 110 || fast)) {
        sh.style.transform = 'translateY(105%)'; scrim.style.opacity = '0';
        setTimeout(() => { closeSheet(); reset(); }, 190);
      } else { sh.style.transform = ''; scrim.style.opacity = ''; setTimeout(reset, 220); }
    };
    sh.addEventListener('touchend', () => end(false));
    sh.addEventListener('touchcancel', () => end(true));
  })();

  applyTheme();
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  render();
})();

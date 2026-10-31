/* Mobile UI. State lives in localStorage; all rules live in logic.js; all text lives in i18n.js (English + Spanish). */
(function () {
  const L = window.Logic;
  const I = window.I18n, t = I.t, tn = I.tn;
  I.setLang(I.detect());                                        // the saved language, else the phone's language
  const KEY = 'buy-sell-tracker:v1';
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const moneyText = (n) => 'TT$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n) => `<span class="amt">${moneyText(n)}</span>`;   // wrapped so the eye button can blur amounts
  const plain = (html) => String(html).replace(/<[^>]+>/g, '');
  const day = (d) => (d ? new Date(d).toLocaleDateString(I.locale(), { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const STATUSES = ['In Transit', 'Available', 'Owing', 'Paid', 'Closed'];   // stored names; only their display text is translated
  const stLabel = (s) => t('status.' + String(s).replace(' ', ''));
  const invStLabel = (s) => t('invstatus.' + s);
  const custStLabel = (c) => (c.owing > 0 ? t('cust.Owing') : t('cust.UpToDate'));
  const errMsg = (e) => (e && e.code ? t('err.' + e.code) : (e && e.message) || String(e));
  const bStatus = (b) => L.batchStatus(state, b);
  // Batch ids are stored as BATCH-001 (kept as-is in your data); on screen the prefix follows the language: LOTE-001.
  const bl = (id) => String(id).replace(/^BATCH-/, t('batch.prefix') + '-');
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
  const TABS = ['home', 'stock', 'sell', 'people', 'more'];

  let state = load();
  let tab = 'home', moreView = null;
  let stockBatch = null, stockFilter = 'All';
  let selected = new Set();
  let invForm = { client: '', paying: '' };
  let sheetClose = null, toastTimer;
  let syncHistory = () => {};
  let syncKeyboard = () => {};
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
  // The few texts that live in index.html rather than in a template are refreshed whenever the language changes.
  function applyStaticText() {
    $('#back').setAttribute('aria-label', t('aria.back'));
    $('#tabbar').setAttribute('aria-label', t('aria.main'));
    $('#brand').alt = t('aria.logo');
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
      <div class="grow"><b>${t('install.title')}</b><small>${installEvt ? t('install.sub.prompt') : t('install.sub.add')}</small></div>
      <button class="pill-btn solid" data-act="install">${installEvt ? t('install.btn') : t('install.how')}</button>
      <button class="x" data-act="install-dismiss" aria-label="${t('aria.dismiss')}">✕</button></div>`;
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (tab === 'home') render(); });
  window.addEventListener('appinstalled', () => { installEvt = null; setPref('installed', true); toast(t('install.done')); render(); });

  const filtered = () => flt.period !== 'all' || flt.batch !== 'all';

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return L.migrate(JSON.parse(raw)); } catch (e) { /* use default */ }
    return L.defaultState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast(t('err.save')); } }
  function toast(msg) {
    const el = $('#toast'); el.textContent = plain(msg); el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }
  // Run a state change, save, report. Errors become a toast and leave the sheet open.
  function run(fn, ok, keepSheet) {
    try { const r = fn(); save(); if (!keepSheet) closeSheet(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); render(); return r; }
    catch (e) { toast('⚠️ ' + errMsg(e)); }
  }
  const cleanSelected = () => { selected = new Set([...selected].filter((id) => state.items.some((i) => i.id === id))); };
  const batchOf = (i) => state.batches.find((b) => b.id === i.batchId);
  const transitText = (b) => { const p = L.transitParts(b); return t('dur', p); };

  /* ---------- shell ---------- */

  function render() {
    cleanSelected();
    const moreTitles = { invoices: 'title.invoices', items: 'title.items', summary: 'title.summary', settings: 'title.settings' };
    const titles = { home: 'B-RUIZ', stock: stockBatch ? bl(stockBatch) : t('nav.stock'), sell: t('nav.sell'), people: t('nav.people'), more: moreView ? t(moreTitles[moreView]) : t('nav.more') };
    $('#title').textContent = titles[tab];
    $('#back').hidden = !(tab === 'more' && moreView);
    $('#brand').hidden = !$('#back').hidden;
    $('#tabbar').innerHTML = TABS.map((k) => { const label = t('nav.' + k); return `<button data-tab="${k}" class="${k === tab ? 'on' : ''}" aria-label="${label}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg>${label}${k === 'sell' && selected.size ? `<span class="badge">${selected.size}</span>` : ''}</button>`; }).join('');
    const btn = (act, label, icon, extra) => `<button class="round" data-act="${act}" aria-label="${label}"><svg viewBox="0 0 24 24">${ICONS[icon]}</svg>${extra || ''}</button>`;
    $('#appbar-right').innerHTML = $('#back').hidden ? `<div class="tools">${btn('view', hideAmounts ? t('tool.show') : t('tool.hide'), hideAmounts ? 'eyeoff' : 'eye')}${btn('download', t('tool.download'), 'download')}${btn('filter', t('tool.filter'), 'filter', filtered() ? '<i class="dot"></i>' : '')}${btn('settings', t('tool.settings'), 'gear')}</div>` : '';
    document.body.classList.toggle('hide-amounts', hideAmounts);
    $('#view').innerHTML = (tab === 'home' ? installBanner() : '') + { home: Home, stock: Stock, sell: Sell, people: People, more: More }[tab]();
    renderActionBar();
    syncHistory();
    showVersion();
  }

  // The deploy stamps the commit id into the cache name, so the saved copy tells us which version is running.
  function showVersion() {
    const el = $('#ver'); if (!el || !window.caches) return;
    caches.keys().then((ks) => { const k = ks.find((x) => /^buy-sell-/.test(x)); if (k) el.textContent = t('more.version', { v: k.replace('buy-sell-', '') }); }).catch(() => {});
  }

  function renderActionBar() {
    const bar = $('#actionbar'); let html = '';
    if (tab === 'home') html = `<button class="btn primary" data-act="new-batch">${t('btn.newBatch')}</button>`;
    else if (tab === 'stock' && selected.size) html = `<button class="btn primary" data-act="goto-sell">${tn('bar.sell', selected.size)}</button>`;
    else if (tab === 'sell' && selected.size) {
      const p = preview();
      html = `<button class="btn primary" data-act="make-invoice" ${p.errors.length ? 'disabled' : ''}>${t('bar.create', { amount: money(p.total) })}</button>`;
    }
    bar.hidden = !html; bar.innerHTML = html;
  }

  const preview = () => L.previewInvoice(state, { itemIds: [...selected], client: invForm.client, paying: invForm.paying });

  /* ---------- Home ---------- */

  function Home() {
    const tot = L.totals(state, flt);
    const inTransit = state.batches.filter((b) => bStatus(b) === 'In Transit');
    const owing = L.customerStats(state).filter((c) => c.owing > 0).sort((a, b) => b.owing - a.owing).slice(0, 4);
    const recent = L.filterInvoices(state, flt).slice(-3).reverse();
    if (!state.batches.length) return `<div class="empty"><b>${t('home.welcome')}</b>${t('home.welcomeText')}</div>
      <div class="list"><button class="btn primary" data-act="new-batch">${t('btn.newBatch')}</button><button class="btn" data-act="import-xlsx">${t('btn.importXlsx')}</button></div>`;
    return `${filtered() ? `<button class="row tap" data-act="filter" style="margin-bottom:10px;background:var(--tint)"><div class="grow"><b>${t('home.filtered', { label: esc(filterLabel()) })}</b><small>${t('home.filteredHint')}</small></div><span class="chev">›</span></button>` : ''}<div class="stats">
      <div class="stat hero"><span>${t('home.profit')}</span><b>${money(tot.profit)}</b></div>
      <div class="stat"><span>${t('home.sales')}</span><b>${money(tot.sales)}</b></div>
      <div class="stat"><span>${t('home.owing')}</span><b>${money(tot.owing)}</b></div>
      <div class="stat"><span>${t('home.expenses')}</span><b>${money(tot.expense)}</b></div>
      <div class="stat"><span>${t('home.avail')}</span><b>${tot.available} · ${tot.inTransit}</b></div></div>
    <h2>${t('home.quick')}</h2>
    <div class="quick">
      <button data-act="pay-clearing"><i>💳</i>${t('home.payClearing')}</button>
      <button data-act="receive" ${inTransit.length ? '' : 'disabled'}><i>📦</i>${t('home.receive')}</button>
      <button data-act="goto-stock"><i>🏷️</i>${t('home.priceItems')}</button></div>
    <h2>${t('home.batches')}</h2>
    <div class="list">${L.filterBatches(state, flt).slice().sort((a, b) => b.num - a.num).map((b) => {
      const st = L.batchStats(state, b), pct = st.count ? Math.round(st.sold / st.count * 100) : 0;
      return `<button class="row tap" data-act="batch" data-id="${b.id}" style="${bStatus(b) === 'Closed' ? 'opacity:.6' : ''}"><div class="grow"><b>${bl(b.id)} <span class="pill ${bStatus(b).replace(' ', '')}">${stLabel(bStatus(b))}</span></b>
        <small>${esc(b.store)} · ${day(b.datePurchased)} · ${t('home.soldOf', { sold: st.sold, count: st.count })}</small><div class="bar"><i style="width:${pct}%"></i></div></div>
        <div class="end"><b>${money(st.profit)}</b><small>${t('home.profitWord')}</small></div><span class="chev">›</span></button>`; }).join('')}</div>
    ${owing.length ? `<h2>${t('home.whoOwes')}</h2><div class="list">${owing.map((c) => `<button class="row tap" data-act="customer" data-id="${esc(c.name)}"><div class="grow"><b>${esc(c.name)}</b><small>${tn('home.itemsOwing', c.itemsOwing)}</small></div><div class="end"><b class="bad">${money(c.owing)}</b></div><span class="chev">›</span></button>`).join('')}</div>` : ''}
    ${recent.length ? `<h2>${t('home.recent')}</h2><div class="list">${recent.map(invoiceRow).join('')}</div>` : ''}`;
  }

  function invoiceRow(v) {
    const st = L.invoiceStatus(v);
    return `<button class="row tap" data-act="view-inv" data-id="${v.no}"><div class="grow"><b>${v.no} · ${esc(v.client)}</b><small>${esc(v.desc)}</small></div>
      <div class="end"><b>${money(v.total)}</b><span class="pill ${st}">${invStLabel(st)}</span></div></button>`;
  }

  /* ---------- Stock ---------- */

  function Stock() {
    if (!state.batches.length) return `<div class="empty"><b>${t('stock.none')}</b>${t('stock.noneText')}</div>`;
    const open = state.batches.filter((b) => bStatus(b) !== 'Closed' || b.id === stockBatch).sort((a, b) => b.num - a.num);
    if (!open.length) return `<div class="empty"><b>${t('stock.allClosed')}</b>${t('stock.allClosedText')}</div>`;
    if (!open.some((b) => b.id === stockBatch)) stockBatch = open[0].id;
    const b = state.batches.find((x) => x.id === stockBatch);
    const all = state.items.filter((i) => i.batchId === b.id);
    const items = all.filter((i) => stockFilter === 'All' || i.status === stockFilter);
    const st = L.batchStats(state, b);
    const chips = (arr, cur, act, label) => arr.map((x) => `<button class="chip ${x === cur ? 'on' : ''}" data-act="${act}" data-id="${esc(x)}">${esc(label ? label(x) : x)}</button>`).join('');
    return `<div class="chips">${chips(open.map((x) => x.id), stockBatch, 'pick-batch', bl)}<button class="chip" data-act="new-batch">${t('stock.addBatch')}</button></div>
      <div class="row" style="margin-bottom:10px"><div class="grow"><b>${t('stock.invested', { status: stLabel(bStatus(b)), amount: money(st.investment) })}</b><small>${t('stock.clearingLine', { amount: money(b.clearingPaid), pct: (st.clearingPct * 100).toFixed(0), left: st.left })}</small></div>
        <div class="end"><b>${money(st.profit)}</b><small>${t('home.profitWord')}</small></div></div>
      <div class="chips">${chips(['All', ...STATUSES], stockFilter, 'pick-filter', (x) => (x === 'All' ? t('filter.all') : stLabel(x)))}</div>
      <div class="list">${items.map((i) => itemCard(b, i)).join('') || `<div class="empty">${t('stock.noMatch')}</div>`}</div>`;
  }

  function itemCard(b, i) {
    const c = L.itemCalc(b, i), sel = selected.has(i.id);
    return `<div class="item ${sel ? 'sel' : ''}" data-id="${i.id}">
      <label class="chk" aria-label="${t('aria.selectItem')}"><input type="checkbox" data-sel ${sel ? 'checked' : ''}></label>
      <button class="main" data-act="edit-item" data-id="${i.id}"><b>${esc(i.desc) || `<span class="muted">${t('item.untitled')}</span>`}</b>
        <small>${i.id}${i.customer ? ' · ' + esc(i.customer) : ''}${i.invoice ? ' · ' + i.invoice : ''}</small></button>
      <div class="side"><span class="pill ${i.status.replace(' ', '')}">${stLabel(i.status)}</span><b>${i.sold ? money(i.sold) : c.recommended ? '<span class="muted">' + money(c.recommended) + '</span>' : ''}</b></div></div>`;
  }

  /* ---------- Sell ---------- */

  function Sell() {
    if (!selected.size) return `<div class="empty"><b>${t('sell.empty')}</b>${t('sell.emptyText')}</div>
      <button class="btn primary" data-act="goto-stock">${t('sell.choose')}</button>`;
    const items = [...selected].map((id) => state.items.find((i) => i.id === id));
    const custs = L.customerStats(state).map((c) => c.name);
    return `<h2>${t('sell.items', { n: items.length })}</h2><div class="list">${items.map((i) => `<div class="row"><div class="grow"><b>${esc(i.desc) || `<span class="bad">${t('sell.noDesc')}</span>`}</b><small>${i.id}${i.invoice ? t('sell.onInv', { no: i.invoice }) : ''}</small></div>
        <div class="end"><b>${i.sold ? money(i.sold) : `<span class="bad">${t('sell.noPrice')}</span>`}</b></div>
        <button class="chip" data-act="edit-item" data-id="${i.id}">${t('sell.edit')}</button><button class="chip" data-act="unselect" data-id="${i.id}" aria-label="${t('aria.remove')}">✕</button></div>`).join('')}</div>
      <label for="client">${t('sell.customer')}</label><input id="client" name="client" list="custs" value="${esc(invForm.client)}" placeholder="${t('sell.customerPh')}" autocomplete="off">
      <datalist id="custs">${custs.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
      ${custs.length ? `<div class="suggest">${custs.slice(0, 8).map((c) => `<button class="chip" data-act="pick-client" data-id="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
      <label for="paying">${t('sell.paying')}</label>
      <div class="grid2"><input id="paying" name="paying" type="number" inputmode="decimal" step="0.01" min="0" value="${esc(invForm.paying)}" placeholder="0.00"><button class="btn" data-act="pay-full">${t('sell.payFull')}</button></div>
      <div id="prev">${previewBox()}</div>`;
  }

  function previewBox() {
    const p = preview();
    return `<div class="sumbox"><div><span>${t('prev.total', { amount: money(p.delivery) })}</span><span>${money(p.total)}</span></div>
      <div><span>${p.ref ? t('prev.prevRef', { ref: p.ref }) : t('prev.prev')}</span><span>${money(p.prev)}</span></div>
      <div><span>${t('prev.payingNow')}</span><span>${money(p.paying)}</span></div>
      <div class="t"><span>${t('prev.owingAfter')}</span><span>${money(p.balance)}</span></div>
      ${p.tip ? `<div class="good"><span>${t('prev.tip')}</span><span>${money(p.tip)}</span></div>` : ''}
      <div><span>${t('prev.profit')}</span><span>${money(p.profit)}</span></div>
      ${p.loss ? `<div class="bad"><span>${t('prev.loss')}</span><span>${money(p.loss)}</span></div>` : ''}</div>
      ${p.errors.length ? `<div class="err">${esc(t('err.' + p.errors[0]))}</div>` : `<div class="muted small" style="margin-top:8px">${t('prev.ready')}</div>`}`;
  }

  /* ---------- People ---------- */

  function People() {
    const rows = L.customerStats(state);
    if (!rows.length) return `<div class="empty"><b>${t('people.none')}</b>${t('people.noneText')}</div>`;
    return `<input id="q" type="search" placeholder="${t('people.search')}" aria-label="${t('people.search')}" style="margin-bottom:10px"><div class="list" id="custlist">${custRows(rows, '')}</div>`;
  }
  function custRows(rows, q) {
    const f = rows.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.owing - a.owing || a.name.localeCompare(b.name));
    return f.map((c) => `<button class="row tap" data-act="customer" data-id="${esc(c.name)}"><div class="grow"><b>${esc(c.name)}</b><small>${tn('people.sub', c.bought, { amount: money(c.sales) })}</small></div>
      <div class="end"><b class="${c.owing > 0 ? 'bad' : ''}">${c.owing > 0 ? money(c.owing) : ''}</b><span class="pill ${c.owing > 0 ? 'Owing' : 'Up'}">${custStLabel(c)}</span></div></button>`).join('') || `<div class="empty">${t('people.noMatch')}</div>`;
  }

  /* ---------- More ---------- */

  function More() {
    if (moreView === 'invoices') return `<div class="list">${L.filterInvoices(state, flt).slice().reverse().map(invoiceRow).join('') || `<div class="empty">${t('invoices.none')}</div>`}</div>`;
    if (moreView === 'items') return ItemLog();
    if (moreView === 'summary') return Summary();
    if (moreView === 'settings') return Settings();
    const go = (v, icon, label, sub) => `<button class="row tap" data-act="more" data-id="${v}"><span style="font-size:22px">${icon}</span><div class="grow"><b>${label}</b><small>${sub}</small></div><span class="chev">›</span></button>`;
    const act = (a, icon, label, sub, bad) => `<button class="row tap" data-act="${a}"><span style="font-size:22px">${icon}</span><div class="grow"><b${bad ? ' class="bad"' : ''}>${label}</b><small>${sub}</small></div></button>`;
    return `<div class="list">${go('invoices', '🧾', t('more.invoices'), t('more.invoicesSub', { n: state.invoices.length }))}${go('items', '📋', t('more.items'), t('more.itemsSub', { n: state.items.length }))}
      ${go('summary', '📈', t('more.summary'), t('more.summarySub'))}${go('settings', '⚙️', t('more.settings'), t('more.settingsSub'))}</div>
      ${isStandalone() ? '' : `<div class="list" style="margin-top:8px"><button class="row tap" data-act="install-guide"><span style="font-size:22px">📲</span><div class="grow"><b>${t('more.install')}</b><small>${isIOS ? t('more.installIOS') : t('more.installOther')}</small></div><span class="chev">›</span></button></div>`}
      <h2>${t('more.data')}</h2><div class="list">
        ${act('import-xlsx', '📥', t('more.import'), t('more.importSub'))}${act('export-json', '💾', t('more.backup'), t('more.backupSub'))}
        ${act('import-json', '♻️', t('more.restore'), t('more.restoreSub'))}${act('reset', '🗑️', t('more.erase'), t('more.eraseSub'), true)}</div>
      <p class="muted small" style="text-align:center;margin-top:20px">${t('more.local')}<br><span id="ver"></span></p>`;
  }

  function ItemLog() {
    const counts = STATUSES.map((s) => `<div class="stat"><span>${stLabel(s)}</span><b>${state.items.filter((i) => i.status === s).length}</b></div>`).join('');
    return `<div class="stats">${counts}</div><h2>${t('items.all')}</h2><div class="list">${state.items.map((i) => `<button class="row tap" data-act="edit-item" data-id="${i.id}"><div class="grow"><b>${esc(i.desc) || t('item.untitled')}</b><small>${i.id}${i.customer ? ' · ' + esc(i.customer) : ''}</small></div><span class="pill ${i.status.replace(' ', '')}">${stLabel(i.status)}</span></button>`).join('')}</div>`;
  }

  function Summary() {
    const y = state.settings.year, m = L.monthlySummary(state, y), tot = L.totals(state);
    const names = Array.from({ length: 12 }, (_, i) => I.monthShort(i));
    const sum = (k) => m.reduce((a, x) => a + x[k], 0), peak = Math.max(1, ...m.map((x) => Math.max(x.sales, x.expense)));
    const row = (label, k) => `<tr><td><b>${label}</b></td>${m.map((x) => `<td>${x[k] ? Math.round(x[k]).toLocaleString() : '–'}</td>`).join('')}<td><b>${Math.round(sum(k)).toLocaleString()}</b></td></tr>`;
    return `<div class="stats"><div class="stat"><span>${t('summary.sales', { y })}</span><b>${money(sum('sales'))}</b></div><div class="stat"><span>${t('summary.profit', { y })}</span><b>${money(sum('profit'))}</b></div>
      <div class="stat"><span>${t('summary.expenses', { y })}</span><b>${money(sum('expense'))}</b></div><div class="stat"><span>${t('summary.owingNow')}</span><b>${money(tot.owing)}</b></div></div>
      <h2>${t('summary.byMonth')}</h2><div class="mbars">${m.map((x, i) => `<div><i style="height:${x.sales / peak * 90}px"></i><i style="height:${x.expense / peak * 90}px"></i>${names[i][0]}</div>`).join('')}</div>
      <p class="muted small">${t('summary.legend')}</p>
      <div class="table"><table><thead><tr><th></th>${names.map((n) => `<th>${n}</th>`).join('')}<th>${t('summary.total')}</th></tr></thead><tbody>${row(t('summary.rowExpense'), 'expense')}${row(t('summary.rowSales'), 'sales')}${row(t('summary.rowProfit'), 'profit')}</tbody></table></div>`;
  }

  function Settings() {
    const s = state.settings, cur = I.getLang();
    const seg = [['light', t('set.light')], ['dark', t('set.dark')], ['auto', t('set.auto')]];
    return `<h2 style="margin-top:4px">${t('set.language')}</h2>
      <div class="seg two" role="radiogroup" aria-label="${t('set.language')}">${Object.keys(I.LANGS).map((l) => `<button class="${cur === l ? 'on' : ''}" role="radio" aria-checked="${cur === l}" data-act="set-lang" data-id="${l}">${I.LANGS[l]['lang.name']}</button>`).join('')}</div>
      <h2>${t('set.appearance')}</h2>
      <div class="seg" role="radiogroup" aria-label="${t('set.theme')}">${seg.map(([k, l]) => `<button class="${theme === k ? 'on' : ''}" role="radio" aria-checked="${theme === k}" data-act="set-theme" data-id="${k}">${l}</button>`).join('')}</div>
      <p class="muted small">${t('set.autoNote')}</p>
      <h2>${t('set.business')}</h2>
      <form id="f-settings"><div class="grid2"><div><label>${t('set.year')}</label><input name="year" type="number" inputmode="numeric" value="${s.year}"></div>
      <div><label>${t('set.margin')}</label><input name="defaultMargin" type="number" inputmode="decimal" value="${s.defaultMargin}"></div></div>
      <label>${t('set.markup')}</label><input name="markup" type="number" inputmode="decimal" step="0.001" value="${s.markup}">
      ${['USD', 'EUR', 'GBP'].map((c) => `<label>${t('set.rate', { c })}</label><input name="${c}" type="number" inputmode="decimal" step="0.0001" value="${s.rates[c]}">`).join('')}
      <p class="muted small">${t('set.rateNote')}</p>
      <div class="btns"><button class="btn primary">${t('set.save')}</button></div></form>`;
  }

  /* ---------- sheets ---------- */

  function openSheet(html, onClose) {
    sheetClose = onClose || null;
    $('#sheet').innerHTML = `<div class="grab"></div>${html}`; $('#sheet').hidden = false; $('#scrim').hidden = false; $('#sheet').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    syncKeyboard();
    syncHistory();
  }
  function closeSheet() {
    if ($('#sheet').hidden) return;
    $('#sheet').hidden = true; $('#scrim').hidden = true; $('#sheet').innerHTML = ''; document.body.style.overflow = '';
    if (L.cleanNames(state)) save();   // tidy names/descriptions typed in a sheet (e.g. trailing spaces)
    $('#sheet').style.transform = ''; $('#sheet').style.transition = ''; $('#scrim').style.opacity = ''; $('#scrim').style.transition = '';
    syncKeyboard();
    syncHistory();
    const cb = sheetClose; sheetClose = null; if (cb) cb();
  }

  const currencyOpts = () => Object.keys(L.CURRENCIES).map((c) => `<option>${c}</option>`).join('');
  const batchOpts = (list) => list.map((b) => `<option value="${b.id}">${bl(b.id)}</option>`).join('');

  function sheetNewBatch() {
    openSheet(`<h3>${t('batch.new')}</h3><p class="muted small">${t('batch.newNote')}</p>
      <form id="f-batch"><label>${t('batch.store')}</label><input name="store" value="SHEIN" required>
      <div class="grid2"><div><label>${t('batch.count')}</label><input name="count" type="number" inputmode="numeric" min="1" required></div>
      <div><label>${t('batch.currency')}</label><select name="currency">${currencyOpts()}</select></div></div>
      <div class="grid2"><div><label>${t('batch.totalCost')}</label><input name="totalCost" type="number" inputmode="decimal" step="0.01" min="0" required></div>
      <div><label>${t('batch.marginPct')}</label><input name="margin" type="number" inputmode="decimal" value="${state.settings.defaultMargin}"></div></div>
      <p class="muted small" id="rate-hint"></p>
      <div class="btns"><button class="btn primary">${t('batch.create')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`);
  }

  function sheetBatch(id) {
    const b = state.batches.find((x) => x.id === id); if (!b) return;
    const st = L.batchStats(state, b);
    openSheet(`<h3>${bl(b.id)} <span class="pill ${bStatus(b).replace(' ', '')}">${stLabel(bStatus(b))}</span></h3>
      <div class="sumbox"><div><span>${t('batch.store')}</span><span>${esc(b.store)}</span></div><div><span>${t('batch.ordered')}</span><span>${day(b.datePurchased)}</span></div>
      <div><span>${t('batch.cost')}</span><span>${b.totalCost.toFixed(2)} ${b.currency} @ ${b.rate.toFixed(4)}</span></div>
      <div><span>${t('batch.clearingPaid')}</span><span>${money(b.clearingPaid)} (${(st.clearingPct * 100).toFixed(0)}%)</span></div>
      <div><span>${t('batch.invested')}</span><span>${money(st.investment)}</span></div><div><span>${t('batch.sales')}</span><span>${money(st.sales)}</span></div>
      <div><span>${t('batch.profit')}</span><span>${money(st.profit)}</span></div>
      <div><span>${b.dateLastPayment ? t('batch.transitLast') : t('batch.sincePurchase')}</span><span>${transitText(b)}</span></div>
      ${b.dateLastPayment ? `<div><span>${t('batch.lastClearing')}</span><span>${day(b.dateLastPayment)}</span></div>` : ''}</div>
      <form id="f-clear"><input type="hidden" name="batch" value="${b.id}"><label>${t('batch.payClearing')}</label>
      <div class="grid2"><input name="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00"><button class="btn primary">${t('batch.recordPayment')}</button></div></form>
      <div class="btns"><button class="btn" data-act="open-stock" data-id="${b.id}">${t('batch.viewItems')}</button>
      ${bStatus(b) === 'In Transit' ? `<button class="btn" data-act="do-receive" data-id="${b.id}">${t('batch.markReceived')}</button>` : ''}
      ${bStatus(b) !== 'Closed' ? `<button class="btn danger" data-act="close-batch" data-id="${b.id}">${t('batch.close')}</button>` : ''}
      ${st.sold === 0 ? `<button class="btn danger" data-act="del-batch" data-id="${b.id}">${t('batch.delete')}</button>` : ''}</div>
      ${bStatus(b) !== 'Closed' ? `<p class="muted small">${t('batch.closeNote')}</p>` : ''}`);
  }

  function sheetPayClearing() {
    if (!state.batches.length) return toast(t('clear.noBatch'));
    openSheet(`<h3>${t('clear.title')}</h3><form id="f-clear"><label>${t('clear.batch')}</label><select name="batch">${batchOpts(state.batches.filter((b) => bStatus(b) !== 'Closed').reverse())}</select>
      <label>${t('clear.amount')}</label><input name="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" required>
      <div class="btns"><button class="btn primary">${t('batch.recordPayment')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`);
  }

  function sheetReceive() {
    const list = state.batches.filter((b) => bStatus(b) === 'In Transit'); if (!list.length) return toast(t('recv.none'));
    openSheet(`<h3>${t('recv.title')}</h3><p class="muted small">${t('recv.note')}</p>
      <form id="f-receive"><label>${t('clear.batch')}</label><select name="batch">${batchOpts(list)}</select>
      <div class="btns"><button class="btn primary">${t('recv.mark')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`);
  }

  function sheetItem(id) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    const b = batchOf(i);
    openSheet(`<h3>${i.id}</h3><div class="muted small">${bl(b.id)} · ${esc(i.store)}${i.invoice ? t('item.invoice', { no: i.invoice }) : ''}${i.customer ? ' · ' + esc(i.customer) : ''}</div>
      <label>${t('item.desc')}</label><input data-f="desc" value="${esc(i.desc)}" placeholder="${t('item.descPh')}" autocomplete="off">
      <div class="grid2"><div><label>${t('item.cost', { cur: b.currency })}</label><input data-f="cost" type="number" inputmode="decimal" step="0.01" min="0" value="${i.cost || ''}"></div>
      <div><label>${t('item.sold')}</label><input data-f="sold" type="number" inputmode="decimal" step="0.01" min="0" value="${i.sold || ''}"></div></div>
      <div class="grid2"><div><label>${t('item.delivery')}</label><input data-f="delivery" type="number" inputmode="decimal" step="0.01" min="0" value="${i.delivery || ''}"></div>
      <div><label>${t('item.status')}</label><select data-f="status">${STATUSES.map((s) => `<option value="${s}" ${s === i.status ? 'selected' : ''}>${stLabel(s)}</option>`).join('')}</select></div></div>
      <div class="sumbox" id="calc"></div>
      <div class="btns"><button class="btn primary" data-act="${selected.has(i.id) ? 'unselect-close' : 'select-close'}" data-id="${i.id}">${selected.has(i.id) ? t('item.removeInv') : t('item.addInv')}</button>
      <button class="btn" data-act="close">${t('btn.done')}</button></div>`, render);
    $('#sheet').dataset.item = id; calcBox(i);
  }
  function calcBox(i) {
    const c = L.itemCalc(batchOf(i), i);
    $('#calc').innerHTML = `<div><span>${t('calc.costTTD')}</span><span>${money(c.costTTD)}</span></div><div><span>${t('calc.clearing')}</span><span>${money(c.clearing)}</span></div>
      <div class="t"><span>${t('calc.landed')}</span><span>${money(c.landed)}</span></div><div><span>${t('calc.rec')}</span><span>${money(c.recommended)}</span></div>
      <div><span>${i.sold > 0 ? t('calc.profit') : t('calc.profitRec')}</span><span>${c.landed ? money(c.profit) : money(0)}</span></div>`;
  }

  // Invoice design follows the Google Sheets invoice template (banner, mauve table header, balance bar, pink footer).
  // The invoice can be in a different language from the app (customers may read the other one): invoiceLang() / ti().
  const INV = { mauve: '#cea8bd', band: '#e6d2db', grey: '#767676', mid: '#545454' };
  const invoiceLang = () => { const p = pref('invoiceLang', null); return p === 'en' || p === 'es' ? p : I.getLang(); };
  const ti = (key, vars) => t(key, vars, invoiceLang());
  const bannerSrc = () => (invoiceLang() === 'es' ? 'icons/invoice-banner-es.jpg' : 'icons/invoice-banner.jpg');
  const invMoney = (n) => 'TT$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const invDate = (d) => new Date(d).toLocaleDateString('en-GB');
  const invLines = (v) => (v.lines && v.lines.length ? v.lines : [{ desc: v.desc, qty: v.qty, price: v.total - v.delivery }]);

  // "PAID IN FULL" rubber stamp: double border, tilted, worn ink. Seeded by invoice number so it never changes.
  const stampCache = {};
  function stampCanvas(seed, dateText, label) {
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
    x.font = face(size); while (x.measureText(label).width + (label.length - 1) * 5 > 395 && size > 26) { size -= 2; x.font = face(size); }
    spaced(label, W / 2, 128, 5);
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
  const stampDate = (v) => new Date(v.date).toLocaleDateString(I.locale(invoiceLang()), { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').toUpperCase();
  const stampCanvasFor = (v) => stampCanvas(v.no, stampDate(v), ti('doc.stamp'));
  function stampURL(v) { const k = v.no + '|' + v.date + '|' + invoiceLang(); return stampCache[k] || (stampCache[k] = stampCanvasFor(v).toDataURL('image/png')); }

  function sheetInvoice(no) {
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    const lines = invLines(v), sub = lines.reduce((s, l) => s + l.qty * l.price, 0), st = L.invoiceStatus(v), lg = invoiceLang();
    openSheet(`<div class="seg two small" role="radiogroup" aria-label="${t('invUI.lang')}" style="margin-bottom:10px">${Object.keys(I.LANGS).map((l) => `<button class="${lg === l ? 'on' : ''}" role="radio" aria-checked="${lg === l}" data-act="inv-lang" data-id="${l}" data-no="${v.no}">${I.LANGS[l]['lang.name']}</button>`).join('')}</div>
      <div class="printable"><div class="inv"><img class="inv-banner" src="${bannerSrc()}" alt="${ti('doc.bannerAlt')}">
      <div class="inv-body">
        <div class="inv-top"><div><div class="lbl">${ti('doc.billTo')}</div><div class="client">${esc(v.client)}</div></div>
          <div class="inv-meta"><div><span class="lbl">${ti('doc.invoiceNo')}</span><span>${v.no}</span></div><div><span class="lbl">${ti('doc.date')}</span><span>${invDate(v.date)}</span></div><div><span class="lbl">${ti('doc.due')}</span><span>${invDate(v.due)}</span></div></div></div>
        <table class="inv-t"><thead><tr><th>${ti('doc.desc')}</th><th class="r">${ti('doc.qty')}</th><th class="r">${ti('doc.price')}</th><th class="r">${ti('doc.amount')}</th></tr></thead><tbody>
          ${lines.map((l) => `<tr><td>${esc(l.desc)}</td><td class="r">${l.qty}</td><td class="r">${invMoney(l.price)}</td><td class="r">${invMoney(l.qty * l.price)}</td></tr>`).join('')}</tbody></table>
        <div class="inv-sum">${isPaidInFull(v) ? `<img class="stamp" src="${stampURL(v)}" alt="${ti('doc.stampAlt')}">` : ''}<div class="inv-tot"><div><span>${ti('doc.subtotal')}</span><b>${invMoney(sub)}</b></div><div><span>${ti('doc.delivery')}</span><b>${invMoney(v.delivery)}</b></div><div><span>${ti('doc.total')}</span><b>${invMoney(v.total)}</b></div>
          <div><span>${ti('doc.paid')}</span><b>${invMoney(v.amountPaid)}</b></div><div><span>${ti('doc.prevPaid')}</span><b>${invMoney(v.previouslyPaid)}</b></div><div class="due"><span>${ti('doc.balance')}</span><b>${invMoney(v.balance)}</b></div></div></div>
        <div class="inv-terms"><b>${ti('doc.terms')}</b><span>${ti('doc.thanks')}</span></div></div><div class="inv-foot"></div></div></div>
      <div class="muted small" style="margin-top:8px">${t('invUI.status')} <span class="pill ${st}">${invStLabel(st)}</span>${v.profit ? ` · ${t('invUI.profit')} ${money(v.profit)}` : ''}${v.loss ? ` · ${t('invUI.loss')} ${money(v.loss)}` : ''}${v.tip ? ` · ${t('invUI.tip')} ${money(v.tip)}` : ''}</div>
      <div class="btns"><button class="btn primary" data-act="share-img" data-id="${v.no}">${t('invUI.share')}</button>
      <button class="btn" data-act="save-img" data-id="${v.no}">${t('invUI.save')}</button>
      <button class="btn" data-act="print">${t('invUI.print')}</button>
      <button class="btn danger" data-act="del-inv" data-id="${v.no}">${t('invUI.delete')}</button><button class="btn" data-act="close">${t('btn.close')}</button></div>`);
  }

  // Draws the same invoice onto a canvas (800 x N, 2x) so it can be shared or saved as a PNG for WhatsApp etc.
  function invoiceCanvas(v) {
    return new Promise((ok, fail) => {
      const img = new Image(); img.onerror = () => fail(new Error(ti('doc.loadErr')));
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
        F('700', 14); x.fillStyle = INV.grey; x.textAlign = 'left'; x.fillText(ti('doc.billTo'), L0, y);
        F('400', 22); x.fillStyle = '#000'; x.fillText(v.client, L0, y + 32);
        [[ti('doc.invoiceNo'), v.no], [ti('doc.date'), invDate(v.date)], [ti('doc.due'), invDate(v.due)]].forEach(([k, val], i) => {
          F('700', 13); x.fillStyle = INV.grey; x.textAlign = 'right'; x.fillText(k, R0 - 150, y + i * 26);
          F('400', 16); x.fillStyle = '#000'; x.fillText(val, R0, y + i * 26);
        });
        y += 74;
        x.fillStyle = INV.mauve; x.fillRect(L0 - 8, y, W - 2 * (L0 - 8), 38);
        F('700', 14); x.fillStyle = '#fff'; x.textAlign = 'left'; x.fillText(ti('doc.desc'), L0, y + 25);
        x.textAlign = 'right'; x.fillText(ti('doc.qty'), R0 - 250, y + 25); x.fillText(ti('doc.price'), R0 - 130, y + 25); x.fillText(ti('doc.amount'), R0, y + 25);
        y += 38;
        lines.forEach((l) => {
          F('400', 16); x.fillStyle = '#000'; x.textAlign = 'left';
          let d = String(l.desc); while (x.measureText(d).width > 330 && d.length > 4) d = d.slice(0, -2); if (d !== String(l.desc)) d = d.trim() + '…';
          x.fillText(d, L0, y + 24);
          x.textAlign = 'right'; x.fillText(String(l.qty), R0 - 250, y + 24); x.fillText(invMoney(l.price), R0 - 130, y + 24); x.fillText(invMoney(l.qty * l.price), R0, y + 24);
          y += rowH;
        });
        x.strokeStyle = '#bdbdbd'; x.lineWidth = 1; x.beginPath(); x.moveTo(L0 - 8, y + 0.5); x.lineTo(W - L0 + 8, y + 0.5); x.stroke();
        y += 34;
        [[ti('doc.subtotal'), sub], [ti('doc.delivery'), v.delivery], [ti('doc.total'), v.total], [ti('doc.paid'), v.amountPaid], [ti('doc.prevPaid'), v.previouslyPaid]].forEach(([k, val]) => {
          F('400', 16); x.fillStyle = INV.mid; x.textAlign = 'right'; x.fillText(k, R0 - 130, y); x.fillStyle = '#000'; x.fillText(invMoney(val), R0, y); y += 28;
        });
        x.fillStyle = INV.mauve; x.fillRect(W - 360, y - 14, 360 - (L0 - 8), 36);
        F('700', 16); x.fillStyle = '#fff'; x.textAlign = 'right'; x.fillText(ti('doc.balance'), R0 - 130, y + 10); x.fillText(invMoney(v.balance), R0, y + 10);
        if (isPaidInFull(v)) {
          x.save(); x.globalCompositeOperation = 'multiply';
          x.drawImage(stampCanvasFor(v), W - L0 - 350, y + 34, 340, 152); x.restore();
        }
        y += 78 + 100;   // Terms stay at the bottom, as in the sheet; the gap above them is where the stamp sits
        F('700', 16); x.fillStyle = '#000'; x.textAlign = 'left'; x.fillText(ti('doc.terms'), L0, y);
        F('400', 15); x.fillStyle = INV.grey; x.fillText(ti('doc.thanks'), L0, y + 26);
        x.fillStyle = INV.band; x.fillRect(L0 - 8, H - 26, W - 2 * (L0 - 8), 26);
        c.toBlob((b) => (b ? ok(b) : fail(new Error(ti('doc.imgErr')))), 'image/png');
      };
      img.src = bannerSrc();
    });
  }
  function shareInvoiceImage(no, saveOnly) {
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    toast(t('doc.preparing'));
    invoiceCanvas(v).then((blob) => {
      const file = new File([blob], `${v.no} ${v.client}.png`, { type: 'image/png' });
      if (!saveOnly && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: v.no, text: ti('doc.shareText', { no: v.no, amount: invMoney(v.balance) }) }).catch((e) => { if (e && e.name !== 'AbortError') throw e; });
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      toast(saveOnly ? t('doc.saved') : t('doc.noShare'));
    }).catch((e) => toast('⚠️ ' + errMsg(e)));
  }

  function sheetCustomer(name) {
    const c = L.customerStats(state).find((x) => x.name === name); if (!c) return;
    const invs = state.invoices.filter((v) => v.client === name).reverse();
    openSheet(`<h3>${esc(c.name)} <span class="pill ${c.owing > 0 ? 'Owing' : 'Up'}">${custStLabel(c)}</span></h3>
      <div class="sumbox"><div><span>${t('cust.owingLabel')}</span><span>${money(c.owing)}</span></div><div><span>${t('cust.totalSales')}</span><span>${money(c.sales)}</span></div>
      <div><span>${t('cust.itemsBought')}</span><span>${t('cust.itemsBoughtVal', { n: c.bought, o: c.itemsOwing })}</span></div><div><span>${t('cust.profit')}</span><span>${money(c.profit)}</span></div>
      ${c.lastItem ? `<div><span>${t('cust.lastItem')}</span><span>${esc(c.lastItem)}</span></div>` : ''}</div>
      <h2>${t('cust.invoices')}</h2><div class="list">${invs.map(invoiceRow).join('') || `<div class="muted">${t('cust.none')}</div>`}</div>
      <div class="btns"><button class="btn" data-act="close">${t('btn.close')}</button></div>`);
  }

  /* ---------- top-bar tools ---------- */

  const periodLabel = (p) => ({ all: t('flt.allTime'), thisMonth: t('flt.thisMonth'), lastMonth: t('flt.lastMonth'), thisYear: t('flt.thisYear') }[p] || p);
  function filterLabel() { return periodLabel(flt.period) + (flt.batch !== 'all' ? ' · ' + bl(flt.batch) : ''); }

  function sheetFilter() {
    const y = new Date().getFullYear();
    const periods = ['all', 'thisMonth', 'lastMonth', 'thisYear', String(y - 1)];
    const chip = (act, id, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-id="${esc(id)}">${esc(label)}</button>`;
    openSheet(`<h3>${t('flt.title')}</h3><p class="muted small">${t('flt.note')}</p>
      <h2>${t('flt.period')}</h2><div class="suggest">${periods.map((k) => chip('set-period', k, periodLabel(k), flt.period === k)).join('')}</div>
      <h2>${t('flt.batch')}</h2><div class="suggest">${chip('set-fbatch', 'all', t('flt.allBatches'), flt.batch === 'all')}${state.batches.slice().sort((a, b) => b.num - a.num).map((b) => chip('set-fbatch', b.id, bl(b.id), flt.batch === b.id)).join('')}</div>
      <div class="btns"><button class="btn" data-act="clear-filter">${t('flt.clear')}</button><button class="btn primary" data-act="close">${t('btn.done')}</button></div>`);
  }

  // Illustrated Add-to-Home-Screen walkthrough (drawn to match Safari's UI; mock colours stay light in dark mode)
  const SHARE = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 15V3M8 7l4-4 4 4M7 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  function sheetInstallHelp() {
    const ua = navigator.userAgent;
    const inApp = /FBAN|FBAV|Instagram|WhatsApp|Snapchat|TikTok|Line\/|GSA\/|; wv\)/i.test(ua);
    const other = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    if (!isIOS) {
      openSheet(`<h3>${t('ig.android.title')}</h3><p class="muted small">${t('ig.android.note')}</p>
        <ol style="line-height:1.9;padding-left:20px"><li>${t('ig.android.chrome')}</li><li>${t('ig.android.samsung')}</li><li>${t('ig.android.desktop')}</li></ol>
        <div class="btns"><button class="btn primary" data-act="close">${t('btn.gotIt')}</button></div>`);
      return;
    }
    const warn = inApp ? `<div class="note bad">${t('ig.ios.warnInApp')}</div>` : other ? `<div class="note">${t('ig.ios.warnOther')}</div>` : '';
    openSheet(`<h3>${t('ig.ios.title')}</h3><p class="muted small">${t('ig.ios.intro')}</p>${warn}
      <div class="step"><i>1</i><div><b>${t('ig.s1.t')}</b><small>${t('ig.s1.d')}</small></div></div>
      <div class="mock"><div class="safari"><span class="g">‹</span><span class="g">›</span><span class="hl">${SHARE}<em>${t('ig.share')}</em></span><span class="g">📖</span><span class="g">❏</span></div></div>
      <div class="step"><i>2</i><div><b>${t('ig.s2.t')}</b><small>${t('ig.s2.d')}</small></div></div>
      <div class="mock"><div class="rows"><div>${t('ig.copy')} <span>⧉</span></div><div>${t('ig.bookmarks')} <span>📖</span></div><div>${t('ig.favourites')} <span>☆</span></div>
        <div class="hl">${t('ig.addHome')} <span>⊞</span></div><div>${t('ig.find')} <span>🔍</span></div></div></div>
      <div class="step"><i>3</i><div><b>${t('ig.s3.t')}</b><small>${t('ig.s3.d')}</small></div></div>
      <div class="mock"><div class="dlg"><div class="hdr"><span>${t('ig.dlg.cancel')}</span><b>${t('ig.dlg.title')}</b><span class="hl">${t('ig.dlg.add')}</span></div>
        <div class="body"><img src="icons/icon-192.png" alt="" width="52" height="52"><div><b>B-RUIZ</b><small>${esc(location.host)}</small></div></div></div></div>
      <div class="step"><i>4</i><div><b>${t('ig.s4.t')}</b><small>${t('ig.s4.d')}</small></div></div>
      <div class="mock home"><div class="app"><img src="icons/icon-192.png" alt="" width="58" height="58"><span>B-RUIZ</span></div></div>
      <div class="btns"><button class="btn" data-act="copy-link">${t('ig.copyLink')}</button><button class="btn primary" data-act="close">${t('btn.gotIt')}</button></div>`);
  }

  function sheetDownload() {
    const row = (icon, title, sub, attrs) => `<button class="row tap" ${attrs}><span style="font-size:22px">${icon}</span><div class="grow"><b>${title}</b><small>${sub}</small></div></button>`;
    openSheet(`<h3>${t('dl.title')}</h3><p class="muted small">${t('dl.note')}</p>
      <div class="list" style="margin-top:12px">
        ${row('💾', t('dl.full'), t('dl.fullSub'), 'data-act="export-json"')}
        ${row('🧾', t('dl.invoices'), t('dl.rows', { n: state.invoices.length }), 'data-act="csv" data-id="invoices"')}
        ${row('📋', t('dl.items'), t('dl.rows', { n: state.items.length }), 'data-act="csv" data-id="items"')}
        ${row('👥', t('dl.customers'), t('dl.rows', { n: L.customerStats(state).length }), 'data-act="csv" data-id="customers"')}</div>
      <div class="btns"><button class="btn" data-act="close">${t('btn.close')}</button></div>`);
  }

  function csvOf(kind) {
    const q = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = t('csv.' + kind).split('|');
    let rows;
    if (kind === 'invoices') {
      rows = state.invoices.map((v) => [v.no, v.client, v.desc, invStLabel(L.invoiceStatus(v)), v.total, v.amountPaid, v.previouslyPaid, v.balance, v.delivery, v.date.slice(0, 10), v.due.slice(0, 10), v.qty, v.profit || '', v.loss || '', v.tip || '']);
    } else if (kind === 'items') {
      rows = state.items.map((i) => { const c = L.itemCalc(state.batches.find((b) => b.id === i.batchId), i);
        return [i.id, bl(i.batchId), i.store, stLabel(i.status), i.desc, i.customer, i.cost || '', L.r2(c.costTTD) || '', L.r2(c.clearing) || '', L.r2(c.landed) || '', i.sold || '', i.sold > 0 && c.landed ? L.r2(i.sold - c.landed) : '', i.paid || '', i.owing || '', i.invoice]; });
    } else {
      rows = L.customerStats(state).map((c) => [c.name, custStLabel(c), c.owing, c.sales, c.bought, c.itemsOwing, c.profit, c.lastItem, c.lastDate ? c.lastDate.toISOString().slice(0, 10) : '']);
    }
    return '﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
  }

/* ---------- events ---------- */

  function openInvoiceFromSheet(no) { closeSheet(); sheetInvoice(no); }

  document.addEventListener('click', (e) => {
    if (e.target.id === 'scrim') return closeSheet();
    const t_ = e.target.closest('[data-tab],[data-act]'); if (!t_) return;
    if (t_.dataset.tab) { tab = t_.dataset.tab; if (tab === 'more') moreView = null; window.scrollTo(0, 0); return render(); }
    const id = t_.dataset.id;
    switch (t_.dataset.act) {
      case 'close': return closeSheet();
      case 'view': hideAmounts = !hideAmounts; setPref('hideAmounts', hideAmounts); return render();
      case 'set-theme': theme = id; setPref('theme', theme); applyTheme(); return render();
      case 'set-lang': I.setLang(id, true); applyStaticText(); return render();
      case 'inv-lang': setPref('invoiceLang', id); return sheetInvoice(t_.dataset.no);
      case 'install':
        if (installEvt) { const ev = installEvt; installEvt = null; render(); ev.prompt(); return ev.userChoice.then((r) => { if (r.outcome === 'accepted') setPref('installed', true); }).catch(() => {}); }
        return sheetInstallHelp();
      case 'install-guide': if (installEvt) { const ev = installEvt; installEvt = null; ev.prompt(); return ev.userChoice.then((r) => { if (r.outcome === 'accepted') setPref('installed', true); render(); }).catch(() => {}); } return sheetInstallHelp();
      case 'copy-link': return (navigator.clipboard ? navigator.clipboard.writeText(location.href.split('#')[0]) : Promise.reject()).then(() => toast(t('toast.linkCopied')), () => toast(t('toast.copyManual')));
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
      case 'do-receive': return run(() => L.makeAvailable(state, id), (n) => t('recv.done', { id: bl(id), n }));
      case 'close-batch': if (confirm(t('confirm.close', { id: bl(id) }))) run(() => L.closeBatch(state, id), t('batch.closed', { id: bl(id) })); return;
      case 'del-batch': if (confirm(t('confirm.delBatch', { id: bl(id) }))) run(() => L.deleteBatch(state, id), t('batch.deleted', { id: bl(id) })); return;
      case 'open-stock': stockBatch = id; stockFilter = 'All'; tab = 'stock'; closeSheet(); return render();
      case 'goto-stock': tab = 'stock'; return render();
      case 'goto-sell': tab = 'sell'; window.scrollTo(0, 0); return render();
      case 'pick-batch': stockBatch = id; return render();
      case 'pick-filter': stockFilter = id; return render();
      case 'edit-item': return sheetItem(id);
      case 'unselect': selected.delete(id); return render();
      case 'select-close': selected.add(id); closeSheet(); return toast(t('item.added'));
      case 'unselect-close': selected.delete(id); closeSheet(); return;
      case 'pick-client': invForm.client = id; return render();
      case 'pay-full': { const p = preview(); invForm.paying = String(Math.max(0, L.r2(p.total - p.prev))); return render(); }
      case 'make-invoice': return run(() => L.createInvoice(state, { itemIds: [...selected], client: invForm.client, paying: invForm.paying }), (inv) => {
        selected = new Set(); invForm = { client: '', paying: '' }; setTimeout(() => sheetInvoice(inv.no), 0); return t('inv.created', { no: inv.no, amount: money(inv.balance) }); });
      case 'customer': closeSheet(); return sheetCustomer(id);
      case 'view-inv': closeSheet(); return sheetInvoice(id);
      case 'del-inv': if (confirm(t('confirm.delInv', { id }))) run(() => L.deleteInvoice(state, id), t('inv.deleted', { id })); return;
      case 'print': return window.print();
      case 'share-img': return shareInvoiceImage(id, false);
      case 'save-img': return shareInvoiceImage(id, true);
      case 'more': moreView = id; window.scrollTo(0, 0); return render();
      case 'import-xlsx': return pickFile('.xlsx,.xls', importXlsx);
      case 'import-json': return pickFile('.json,application/json', importJson);
      case 'export-json': return download('buy-sell-backup.json', JSON.stringify(state, null, 2));
      case 'reset': if (confirm(t('confirm.reset1')) && confirm(t('confirm.reset2'))) { state = L.defaultState(); selected = new Set(); run(() => 0, t('toast.cleared')); } return;
    }
  });
  $('#back').addEventListener('click', () => { moreView = null; render(); });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f));
    if (f.id === 'f-batch') { const b = run(() => L.createBatch(state, d), (x) => t('batch.created', { id: bl(x.id) })); if (b) { stockBatch = b.id; stockFilter = 'All'; } }
    if (f.id === 'f-clear') run(() => L.payClearing(state, d.batch, d.amount), t('clear.recorded', { id: bl(d.batch) }));
    if (f.id === 'f-receive') run(() => L.makeAvailable(state, d.batch), (n) => t('recv.done', { id: bl(d.batch), n }));
    if (f.id === 'f-settings') run(() => {
      Object.assign(state.settings, { year: +d.year || state.settings.year, markup: +d.markup || 1, defaultMargin: d.defaultMargin === '' ? 100 : +d.defaultMargin });
      ['USD', 'EUR', 'GBP'].forEach((c) => { state.settings.rates[c] = +d[c] || state.settings.rates[c]; });
    }, t('set.saved'), true);
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
      $('#rate-hint').innerHTML = t('batch.rateHint', { rate: r.toFixed(4), amount: money(c * r) });
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  /* ---------- files ---------- */

  const coded = (code) => { const e = new Error(code); e.code = code; return e; };
  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function pickFile(accept, handler) { const f = $('#file'); f.accept = accept; f.value = ''; f.onchange = () => f.files[0] && handler(f.files[0]); f.click(); }
  function importJson(file) {
    file.text().then((t) => { const s = JSON.parse(t); if (!s.batches || !s.items) throw coded('notBackup'); state = L.migrate(s); selected = new Set(); save(); toast(t('toast.restored')); render(); }).catch((e) => toast('⚠️ ' + errMsg(e)));
  }
  function importXlsx(file) {
    if (state.batches.length && !confirm(t('confirm.import'))) return;
    toast(t('toast.reading'));
    loadSheetJS().then((X) => file.arrayBuffer().then((buf) => {
      const wb = X.read(buf, { type: 'array', cellDates: true }), sheets = {};
      ['Batch Log', 'Hidden Master Log', 'Invoice Log'].forEach((n) => { if (wb.Sheets[n]) sheets[n] = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }); });
      if (!sheets['Hidden Master Log'] || !sheets['Batch Log']) throw coded('notWorkbook');
      const imp = L.importWorkbook(sheets); imp.settings.year = state.settings.year; imp.settings.rates = state.settings.rates;
      state = imp; selected = new Set(); stockBatch = null; tab = 'home'; moreView = null; save();
      toast(t('toast.imported', { b: state.batches.length, i: state.items.length, v: state.invoices.length })); render();
    })).catch((e) => toast('⚠️ ' + errMsg(e)));
  }
  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => ok(window.XLSX); s.onerror = () => no(coded('sheetjs')); document.head.appendChild(s);
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
      toast(t('toast.pressBack')); history.pushState({ d: 0 }, ''); hist = 0; return;
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

  // When the on-screen keyboard opens it covers the bottom of the screen. Make the open sheet fill the space between the
  // top of the screen and the keyboard (so it can scroll), keep the tapped field in view, and hide the bottom bars while typing.
  (function () {
    const vv = window.visualViewport, sh = $('#sheet');
    if (!vv) return;
    let lastFocus = null;
    const reset = () => { sh.classList.remove('kb'); sh.style.bottom = ''; sh.style.height = ''; sh.style.maxHeight = ''; };
    // Bring the focused field into view (pop-up or ordinary page) once the keyboard has taken its space.
    // Pages are scrolled by hand: the browser would centre the field in the full screen, not in the space above the keyboard.
    function keepFocusVisible() {
      const el = document.activeElement;
      if (!el || !/^(INPUT|TEXTAREA)$/.test(el.tagName) || el.type === 'checkbox') return;
      setTimeout(() => {
        if (sh.contains(el)) return el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const r = el.getBoundingClientRect(), top = $('.appbar').getBoundingClientRect().bottom + 8, bottom = vv.offsetTop + vv.height - 12;
        if (r.top >= top && r.bottom <= bottom) return;
        window.scrollBy({ top: r.top + r.height / 2 - (top + bottom) / 2, behavior: 'smooth' });
      }, 60);
    }
    function update() {
      const kbh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop), kb = kbh > 100;   // keyboard height in px
      const was = document.body.classList.contains('kb');
      document.body.classList.toggle('kb', kb);
      document.documentElement.style.setProperty('--kb', kb ? kbh + 'px' : '0px');   // lets ordinary pages scroll past the keyboard
      if (kb && !sh.hidden) {
        sh.classList.add('kb'); sh.style.bottom = kbh + 'px'; sh.style.height = Math.max(220, vv.height - 8) + 'px'; sh.style.maxHeight = 'none';
      } else reset();
      if (kb && (!was || document.activeElement !== lastFocus)) keepFocusVisible();
      lastFocus = document.activeElement;
    }
    vv.addEventListener('resize', update); vv.addEventListener('scroll', update);
    document.addEventListener('focusin', () => setTimeout(update, 250));   // some browsers report the resize late
    syncKeyboard = update;
  })();

  // Drag a sheet down to dismiss it (only when it is scrolled to the top, so scrolling still works).
  (function () {
    const sh = $('#sheet'), scrim = $('#scrim');
    let y0 = null, dy = 0, t0 = 0, dragging = false, canDrag = false, onHandle = false;
    const reset = () => { sh.style.transition = ''; sh.style.transform = ''; scrim.style.transition = ''; scrim.style.opacity = ''; };
    sh.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; dragging = false;
      // only the header (the pinned handle bar and the pop-up's title) can be pulled down; content just scrolls
      const title = sh.querySelector('h3');
      onHandle = !!e.target.closest('.grab') || !!(title && title.contains(e.target)); canDrag = onHandle;
    }, { passive: true });
    sh.addEventListener('touchmove', (e) => {
      if (y0 == null || !canDrag) return;
      dy = e.touches[0].clientY - y0;
      if (!dragging && dy > 10 && onHandle) { dragging = true; sh.style.transition = 'none'; scrim.style.transition = 'none'; }
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

  save();   // write back anything repaired while loading (e.g. names with stray spaces)
  applyStaticText();
  applyTheme();
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  render();
})();

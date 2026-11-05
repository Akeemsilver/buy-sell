/* Mobile UI. State lives in localStorage; all rules live in logic.js; all text lives in i18n.js (English + Spanish). */
(function () {
  const L = window.Logic;
  const I = window.I18n, t = I.t, tn = I.tn;
  I.setLang(I.detect());                                        // the saved language, else the phone's language
  const KEY = 'buy-sell-tracker:v1';
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const moneyText = (n) => 'TT$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const moneyBare = (n) => `<span class="amt">${'$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;   // short form with just $ (no TT): for tight spots (the customer strip)
  const money = (n) => `<span class="amt">${moneyText(n)}</span>`;   // wrapped so the eye button can blur amounts
  const plain = (html) => String(html).replace(/<[^>]+>/g, '');
  const day = (d) => (d ? new Date(d).toLocaleDateString(I.locale(), { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const bizName = () => state.settings.businessName || 'B-RUIZ';
  const initials = (n) => String(n).trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase() || '·';
  // Versions shown in Settings > About. APP_VERSION goes up by 0.01 with each release; RULES_VERSION must match the header of firestore.rules (a test checks).
  const APP_VERSION = '1.00', RULES_VERSION = '1.01', CLOUD_LIMIT = 1073741824;
  const NUM_FIELDS = ['cost', 'price', 'sold', 'delivery'];
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

  const PUI = window.PhotoUI;
  let state = load();
  let tab = 'home', moreView = null;
  /* ---------- Back works like on an Android phone: it returns to the place you came from, and never loops ----------
     places: the screens you moved through (tabs, More and Settings screens). pageStack: full-screen pages opened one from another
     (customer -> invoice -> item ...). Going to a place or page that is already in its stack cuts the stack back to it, so Back never
     bounces between two screens. */
  let places = [{ tab: 'home', moreView: null }], pageStack = [], reopening = false;
  const placeKey = (p) => p.tab + '|' + (p.moreView || '');
  function go(next) {
    const i = places.findIndex((p) => placeKey(p) === placeKey(next));
    if (i >= 0) places.length = i + 1; else places.push({ tab: next.tab, moreView: next.moreView || null });
    tab = next.tab; moreView = next.moreView || null;
  }
  function placeBack() {
    if (places.length < 2) return false;
    places.pop(); const p = places[places.length - 1]; tab = p.tab; moreView = p.moreView; return true;
  }
  function enterPage(kind, arg, open, swap) {   // every full-screen page calls this when it opens. swap: replace the page on top (no new step on the Back trail)
    if (reopening) return;
    const key = kind + '|' + arg;
    if (swap && pageStack.length) { pageStack[pageStack.length - 1] = { key, open }; return; }
    const i = pageStack.findIndex((p) => p.key === key);
    if (i >= 0) pageStack.length = i;
    pageStack.push({ key, open });
  }
  function pageBack() {   // one step back from a full-screen page: the page it was opened from, or close
    if (pageStack.length > 1) { pageStack.pop(); const prev = pageStack[pageStack.length - 1]; reopening = true; try { prev.open(); } finally { reopening = false; } render(); }
    else closeSheet();
  }
  function dropPages(key) {   // forget pages that no longer exist (e.g. a deleted invoice), then show the one now on top
    pageStack = pageStack.filter((p) => p.key !== key);
    if (!pageStack.length) return closeSheet();
    reopening = true; try { pageStack[pageStack.length - 1].open(); } finally { reopening = false; } render();
  }
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
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = window.Theme ? Theme.barColor(dark) : (dark ? '#3a1128' : '#741b47');
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
  // Shown at the top of Home whenever the app is not running as an installed app (no way to dismiss it, so it is never "lost").
  // With the browser's own install prompt the button installs; otherwise it opens the how-to-install guide.
  function installBanner() {
    if (isStandalone()) return '';
    return `<div class="install"><img src="icons/logo.png" alt="" width="44" height="44">
      <div class="grow"><b>${t('install.title')}</b><small>${installEvt ? t('install.sub.prompt') : t('install.sub.add')}</small></div>
      <button class="pill-btn solid" data-act="install">${installEvt ? t('install.btn') : t('install.how')}</button></div>`;
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (tab === 'home') render(); });
  window.addEventListener('appinstalled', () => { installEvt = null; toast(t('install.done')); render(); });

  /* ---------- account (Firebase sign-in, cloud copy) ---------- */

  let cloud = { status: 'loading', error: '', email: '', signedIn: false };
  function signInBanner() {
    if (cloud.signedIn || cloud.status === 'loading' || cloud.status === 'unavailable' || Date.now() - pref('signinDismissed', 0) < WEEK) return '';
    return `<div class="install"><div class="grow"><b>${t('acct.banner.title')}</b><small>${t('acct.banner.sub')}</small></div>
      <button class="pill-btn solid" data-act="acct-open">${t('acct.banner.btn')}</button><button class="x" data-act="signin-dismiss" aria-label="${t('aria.dismiss')}">✕</button></div>`;
  }
  const acctErr = (e) => {
    const c = (e && e.code) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return t('acct.err.cred');
    if (/email-already-in-use/.test(c)) return t('acct.err.exists');
    if (/weak-password/.test(c)) return t('acct.err.weak');
    if (/invalid-email|missing-email/.test(c)) return t('acct.err.email');
    if (/network/.test(c)) return t('acct.err.network');
    if (/too-many/.test(c)) return t('acct.err.many');
    if (/popup-closed|cancelled-popup/.test(c)) return t('acct.err.popup');
    if (/unauthorized-domain/.test(c)) return t('acct.err.domain');
    if (/unavailable/.test(c)) return t('acct.err.unavailable');
    return t('acct.err.generic');
  };
  const acctStatus = () => t('acct.st.' + cloud.status);
  function acctCard() {
    return cloud.signedIn
      ? `<div class="sumbox"><div><span>${t('acct.signedInAs', { email: esc(cloud.email) })}</span></div><div class="${cloud.status === 'synced' ? 'good' : /error|rules|unavailable/.test(cloud.status) ? 'bad' : ''}"><span id="acct-st">${acctStatus()}</span></div></div>
         <div class="btns"><button class="btn" data-act="acct-out">${t('acct.signOut')}</button></div><p class="muted small">${t('acct.signOutNote')}</p>`
      : `<div class="row tap" data-act="acct-open" role="button"><div class="grow"><b>${t('acct.notSignedIn')}</b><small>${t('acct.signInSub')}</small></div><span class="chev">›</span></div>`;
  }
  function sheetAccount() {
    if (cloud.signedIn) return openSheet(`<h3>${t('acct.title')}</h3>${acctCard()}<div class="btns"><button class="btn" data-act="close">${t('btn.close')}</button></div>`);
    openSheet(`<h3>${t('acct.title')}</h3><p class="muted small">${t('acct.signInSub')}</p>
      <button class="btn g-google" data-act="acct-google" style="margin-top:12px">${GOOGLE_G}<span>${t('acct.google')}</span></button>
      <p class="muted small" style="text-align:center;margin:14px 0 0">${t('acct.or')}</p>
      <form id="f-acct"><label>${t('acct.email')}</label><input name="email" type="email" inputmode="email" autocomplete="email" required>
      <label>${t('acct.password')}</label><input name="password" type="password" autocomplete="current-password" minlength="6">
      <div id="acct-err" class="err" hidden></div>
      <div class="btns"><button class="btn primary" name="mode" value="in">${t('acct.signIn')}</button><button class="btn" name="mode" value="up">${t('acct.create')}</button>
      <button type="button" class="btn" data-act="acct-forgot">${t('acct.forgot')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`);
  }
  const acctShow = (msg) => { const el = $('#acct-err'); if (el) { el.textContent = msg; el.hidden = !msg; } };
  const acctDone = (p) => { acctShow(''); return p.then(() => { closeSheet(); toast(t('acct.signedIn')); }).catch((e) => acctShow(acctErr(e))); };
  function askConflict() {
    return new Promise((ok) => {
      let done = false; const finish = (v) => { if (!done) { done = true; ok(v); } };
      window.__conflict = finish;
      openSheet(`<h3>${t('acct.conflict.title')}</h3><p>${t('acct.conflict.text')}</p>
        <div class="btns"><button class="btn primary" data-act="conflict" data-id="cloud">${t('acct.conflict.cloud')}</button><button class="btn" data-act="conflict" data-id="phone">${t('acct.conflict.phone')}</button></div>`, () => finish('cancel'));
    });
  }

  /* ---------- welcome / create account / sign in / business setup (neutral look, not the business's colors) ---------- */

  let gateView = null, gateMode = 'create', gateDraft = { name: '', palette: null }, gateForced = false;   // gateForced: opened on purpose from the app (Settings, the Home banner)
  const GOOGLE_G = '<svg class="glogo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.3-3.9 7.1-9.7 7.1-17.1z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.3-8.7 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  const hasData = () => window.Sync.hasData(state);
  function wantedGate() {
    if (cloud.signedIn) {
      gateForced = false;
      if (state.settings.setupDone || hasData()) return null;
      return /synced|syncing/.test(cloud.status) ? 'setup' : 'wait';
    }
    if (gateForced) return 'auth';
    if (cloud.status === 'signedOut' && !hasData() && !pref('gateSkipped', false)) return gateView === 'auth' ? 'auth' : 'welcome';
    return null;
  }
  const swatchRow = (cur) => `<div class="swatches wrap" role="radiogroup" aria-label="${t('set.color')}">${Theme.PALETTES.map((p) => `<button type="button" class="swatch ${cur === p.id ? 'on' : ''}" style="background:${p.brand}" role="radio" aria-checked="${cur === p.id}" aria-label="${t('pal.' + p.id)}" data-act="gate-color" data-id="${p.id}"></button>`).join('')}</div>`;
  const gateHTML = (v) => gatePage(v).replace(/<\/div>$/, gateLang() + '</div>');
  function gatePage(v) {
    if (v === 'welcome') return `<div class="g-wrap g-center"><div class="g-logo">✦</div><h1>${t('gate.welcome')}</h1><p class="g-mute">${t('gate.tag')}</p>
      <button class="g-btn primary" data-act="gate-create">${t('gate.create')}</button><button class="g-btn" data-act="gate-have">${t('gate.have')}</button>
      <p class="g-small">${t('gate.note')}</p><button class="g-link" data-act="gate-skip">${t('gate.skip')}</button><p class="g-small">${t('gate.skipNote')}</p></div>`;
    if (v === 'auth') return `<div class="g-wrap"><button class="g-link" data-act="gate-back">‹ ${t('gate.back')}</button>
      <div class="g-tabs" role="tablist"><button class="${gateMode === 'create' ? 'on' : ''}" role="tab" data-act="gate-tab" data-id="create">${t('gate.tabCreate')}</button><button class="${gateMode === 'in' ? 'on' : ''}" role="tab" data-act="gate-tab" data-id="in">${t('gate.tabSignIn')}</button></div>
      <button class="g-btn g-google" data-act="gate-google" style="margin-top:16px">${GOOGLE_G}<span>${t('acct.google')}</span></button><p class="g-small" style="text-align:center">${t('acct.or')}</p>
      <form id="f-gate"><label>${t('acct.email')}</label><input name="email" type="email" inputmode="email" autocomplete="email" required>
      <label>${t('acct.password')}</label><input name="password" type="password" autocomplete="${gateMode === 'create' ? 'new-password' : 'current-password'}" minlength="6" required>
      <div id="g-err" class="g-err" hidden></div>
      <button class="g-btn primary" style="margin-top:18px">${gateMode === 'create' ? t('acct.create') : t('acct.signIn')}</button>
      ${gateMode === 'in' ? `<button type="button" class="g-link" data-act="gate-forgot">${t('acct.forgot')}</button>` : ''}</form></div>`;
    if (v === 'setup') {
      const cur = gateDraft.palette || Theme.current();
      return `<div class="g-wrap"><h1 style="font-size:24px">${t('gate.setup.title')}</h1><p class="g-mute">${t('gate.setup.sub')}</p>
        <form id="f-setup"><label>${t('gate.bizName')}</label><input name="biz" value="${esc(gateDraft.name)}" placeholder="${t('gate.bizPh')}" autocomplete="off" required>
        <div id="g-err" class="g-err" hidden></div>
        <label>${t('gate.pickColor')}</label>${swatchRow(cur)}
        <div style="margin-top:14px">${themePreview(cur, gateDraft.name || t('gate.bizPh'))}</div>
        <button class="g-btn primary" style="margin-top:18px">${t('gate.continue')}</button></form></div>`;
    }
    return `<div class="g-wrap g-center"><div class="g-logo">✦</div><p class="g-mute">${t('gate.waiting')}</p></div>`;
  }
  const gateLang = () => `<div class="g-lang" role="radiogroup" aria-label="${t('gate.language')}"><span>${t('gate.language')}</span>${Object.keys(I.LANGS).map((l) => `<button type="button" class="${I.getLang() === l ? 'on' : ''}" role="radio" aria-checked="${I.getLang() === l}" data-act="gate-lang" data-id="${l}">${I.LANGS[l]['lang.name']}</button>`).join('')}</div>`;
  // redraw the open page (e.g. after a language change) without losing what was typed
  function regate() {
    const el = $('#gate'), vals = {}; el.querySelectorAll('input[name]').forEach((i) => { vals[i.name] = i.value; });
    el.innerHTML = gateHTML(gateView); el.querySelectorAll('input[name]').forEach((i) => { if (vals[i.name] != null) i.value = vals[i.name]; });
  }
  function updateGate() {
    const el = $('#gate'), want = wantedGate();
    if (want === gateView && (want || el.hidden)) return;
    gateView = want;
    if (!want) { el.hidden = true; el.innerHTML = ''; document.body.style.overflow = ''; return; }
    el.innerHTML = gateHTML(want); el.hidden = false; el.scrollTop = 0; document.body.style.overflow = 'hidden';
  }
  const gateErr = (m) => { const e = $('#g-err'); if (e) { e.textContent = m; e.hidden = !m; } };
  document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('#gate') && /INPUT/.test(e.target.tagName)) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); });
  document.addEventListener('keydown', (e) => {   // Edit batch: the keyboard's Next/Enter goes description → price → cost → Save & next
    if (e.key !== 'Enter' || !e.target.dataset || !e.target.closest || !e.target.closest('.qe')) return; const order = ['desc', 'price', 'cost'], k = order.indexOf(e.target.dataset.f); if (k < 0) return; e.preventDefault();
    if (k < order.length - 1) { const nx = $('.qe [data-f=' + order[k + 1] + ']'); if (nx) nx.focus(); } else { const b = $('.qe .qgo .pr'); if (b) b.click(); }
  });
  document.addEventListener('input', (e) => { if (e.target.name === 'biz' && e.target.form && e.target.form.id === 'f-setup') { gateDraft.name = e.target.value; const n = $('#pv-name'); if (n) n.textContent = e.target.value || t('gate.bizPh'); } });

  const filtered = () => flt.period !== 'all' || flt.batch !== 'all';

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return L.migrate(JSON.parse(raw)); } catch (e) { /* use default */ }
    return L.defaultState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast(t('err.save')); } if (window.Cloud) Cloud.changed(); if (window.Store) Store.schedule(); }
  function toast(msg, ms) {
    const el = $('#toast'); el.textContent = plain(msg); el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms || 3200);
  }
  // Run a state change, save, report. Errors become a toast and leave the sheet open.
  function run(fn, ok, keepSheet) {
    try { const r = fn(); save(); tidyPhotos(); if (!keepSheet) closeSheet(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); render(); return r; }
    catch (e) { toast('⚠️ ' + errMsg(e)); }
  }
  const cleanSelected = () => { selected = new Set([...selected].filter((id) => state.items.some((i) => i.id === id))); };
  const batchOf = (i) => state.batches.find((b) => b.id === i.batchId);
  const transitText = (b) => { const p = L.transitParts(b); return t('dur', p); };

  /* ---------- shell ---------- */

  function render() {
    cleanSelected();
    const moreTitles = { invoices: 'title.invoices', items: 'title.items', summary: 'title.summary', settings: 'title.settings' };
    const titles = { home: bizName(), stock: stockBatch ? bl(stockBatch) : t('nav.stock'), sell: t('nav.sell'), people: t('nav.people'), more: moreView ? (moreView.startsWith('set-') ? { 'set-theme': t('set.theme'), 'set-business': t('set.business'), 'set-invdesign': t('set.invDesign'), 'set-backup': t('set.backupRow'), 'set-about': t('set.storageRow') }[moreView] : t(moreTitles[moreView])) : t('nav.more') };
    $('#title').textContent = titles[tab];
    $('#back').hidden = !(tab === 'more' && moreView);
    const customBrand = !!state.settings.businessName, showBrand = $('#back').hidden;
    $('#brand').hidden = !showBrand || customBrand; $('#brandtxt').hidden = !showBrand || !customBrand; $('#brandtxt').textContent = initials(bizName());
    $('#tabbar').innerHTML = TABS.map((k) => { const label = t('nav.' + k); return `<button data-tab="${k}" class="${k === tab ? 'on' : ''}" aria-label="${label}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg>${label}${k === 'sell' && selected.size ? `<span class="badge">${selected.size}</span>` : ''}</button>`; }).join('');
    const btn = (act, label, icon, extra) => `<button class="round" data-act="${act}" aria-label="${label}"><svg viewBox="0 0 24 24">${ICONS[icon]}</svg>${extra || ''}</button>`;
    $('#appbar-right').innerHTML = ($('#back').hidden || isSettings()) ? `<div class="tools">${btn('view', hideAmounts ? t('tool.show') : t('tool.hide'), hideAmounts ? 'eyeoff' : 'eye')}${btn('download', t('tool.download'), 'download')}${btn('filter', t('tool.filter'), 'filter', filtered() ? '<i class="dot"></i>' : '')}${btn('settings', t('tool.settings'), 'gear')}</div>` : '';
    document.body.classList.toggle('hide-amounts', hideAmounts);
    $('#view').innerHTML = (tab === 'home' ? installBanner() + signInBanner() : '') + { home: Home, stock: Stock, sell: Sell, people: People, more: More }[tab]();
    renderActionBar();
    syncHistory();
    showVersion();
    PUI.hydrate();
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
    const ps = L.photoStats(state, b.id);
    if (stockFilter === 'NeedCheck' && !ps.needCheck) stockFilter = 'All';
    const items = all.filter((i) => (stockFilter === 'All' ? true : stockFilter === 'NeedCheck' ? i.photo && !i.photo.checked : i.status === stockFilter));
    const st = L.batchStats(state, b);
    const chips = (arr, cur, act, label) => arr.map((x) => `<button class="chip ${x === cur ? 'on' : ''}" data-act="${act}" data-id="${esc(x)}">${esc(label ? label(x) : x)}</button>`).join('');
    return `<div class="chips">${chips(open.map((x) => x.id), stockBatch, 'pick-batch', bl)}<button class="chip" data-act="new-batch">${t('stock.addBatch')}</button></div>
      <div class="row" style="margin-bottom:10px"><div class="grow"><b>${t('stock.invested', { status: stLabel(bStatus(b)), amount: money(st.investment) })}</b><small>${t('stock.clearingLine', { amount: money(b.clearingPaid), pct: (st.clearingPct * 100).toFixed(0), left: st.left })}</small></div>
        <div class="end"><b>${money(st.profit)}</b><small>${t('home.profitWord')}</small></div></div>
      <div class="row" style="margin-bottom:10px;flex-wrap:wrap"><div class="grow" style="flex:1 1 100%"><b>${t('photo.progress', { n: ps.withPhoto, total: ps.total })}</b>${ps.needCheck ? `<small class="bad">${tn('photo.needCheck', ps.needCheck)}</small>` : ''}</div>
        ${ps.needCheck ? `<button class="chip on" data-act="photo-check-all" data-id="${b.id}">${t('photo.checkAll')}</button>` : ''}<button class="chip" data-act="photo-add" data-id="${b.id}">📷 ${t('photo.add')}</button></div>
      <div class="chips">${chips(['All', ...STATUSES, ...(ps.needCheck ? ['NeedCheck'] : [])], stockFilter, 'pick-filter', (x) => (x === 'All' ? t('filter.all') : x === 'NeedCheck' ? t('filter.needCheck') + ' (' + ps.needCheck + ')' : stLabel(x)))}</div>
      <div class="list">${items.map((i) => itemCard(b, i)).join('') || `<div class="empty">${t('stock.noMatch')}</div>`}</div>`;
  }

  // The discount a sold item was bought with (shown as a red strip on its picture): the sale percentage, or the real percentage off the selling price if Sold for was changed by hand.
  const boughtOffPct = (i) => {
    const price = Number(i.price) || 0, sold = Number(i.sold) || 0;
    if (!L.isSold(i) || !i.saleOn || price <= 0 || sold <= 0 || sold >= price) return 0;
    return Math.abs(sold - L.salePrice(i)) < 0.01 ? Number(i.discount) : Math.round((1 - sold / price) * 100);
  };
  const offStrip = (i) => { const p = boughtOffPct(i); return p > 0 ? `<small class="saleoff ph-sale">−${p}%</small>` : ''; };
  function itemCard(b, i) {
    const c = L.itemCalc(b, i), sel = selected.has(i.id), noPhoto = L.shareStatus(i) === 'noPhoto';
    const sale = L.salePrice(i), priceHtml = i.sold ? money(i.sold) : sale ? money(sale) : i.price ? money(i.price) : c.recommended ? '<span class="muted">' + money(c.recommended) + '</span>' : '';
    return `<div class="item ${sel ? 'sel' : ''} ${i.status === 'Paid' ? 'paid' : ''}" data-id="${i.id}">
      <label class="chk" aria-label="${t('aria.selectItem')}"><input type="checkbox" data-sel ${sel ? 'checked' : ''}></label>
      <button class="main" data-act="edit-item" data-id="${i.id}">${PUI.thumb(i).replace(/<\/span>$/, (sale && !L.isSold(i) ? `<small class="saleoff ph-sale">−${Number(i.discount)}%</small>` : offStrip(i)) + '</span>')}<span class="txt"><b>${esc(i.desc) || `<span class="muted">${t('item.untitled')}</span>`}</b>
        <small>${i.id}${i.customer ? ' · ' + esc(i.customer) : ''}${i.invoice ? ' · ' + i.invoice : ''}</small></span></button>
      <div class="side"><span class="pill ${i.status.replace(' ', '')}">${stLabel(i.status)}</span><b>${priceHtml}</b></div>
      <button class="share-btn" data-act="photo-share" data-id="${i.id}" aria-label="${t('photo.share')}" ${noPhoto ? 'disabled' : ''}>${SHARE}</button></div>`;
  }

  /* ---------- Sell ---------- */

  // The customer drop-down: a search box and the customers in alphabetical order; typing a new name offers to add it.
  let comboOpen = false;
  function comboRows(q) {
    const stats = L.customerStats(state).slice().sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' })), f = L.cleanName(q).toLowerCase();
    const shown = f ? stats.filter((c) => c.name.toLowerCase().includes(f)) : stats, exact = stats.some((c) => c.name.toLowerCase() === f);
    return (f && !exact ? `<button type="button" class="co new" data-act="combo-new"><i>＋</i><span>${t('sell.addNew', { name: esc(L.cleanName(q)) })}</span></button>` : '')
      + shown.map((c) => `<button type="button" class="co ${c.name === invForm.client ? 'on' : ''}" data-act="pick-client" data-id="${esc(c.name)}"><i>${esc(c.name.trim().charAt(0).toUpperCase() || '?')}</i><span>${esc(c.name)}</span>${c.owing > 0 ? `<small class="bad">${t('cust.stillOwes', { amt: money(c.owing) })}</small>` : ''}</button>`).join('')
      || (f ? '' : `<div class="muted small" style="padding:10px 12px">${t('sell.noCustomers')}</div>`);
  }
  const storeStrip = () => { const n = window.Store ? Store.newCount() : 0; return `<div class="strip"><button data-act="store-link">🔗 ${t('store.copyLink')}</button><button data-act="orders-open">📥 ${t('store.orders')}${n ? `<b>${n}</b>` : ''}</button><button class="sq" data-act="store-open" aria-label="${t('store.settings')}">⚙︎</button></div>`; };
  // Customer picker: a search box with round customer chips under it (alphabetical); typing filters and offers to add the typed name.
  function chipRows(q) {
    const stats = L.customerStats(state).slice().sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' })), f = L.cleanName(q).toLowerCase();
    const exact = stats.some((c) => c.name.toLowerCase() === f), shown = f && !exact ? stats.filter((c) => c.name.toLowerCase().includes(f)) : stats;   // a chosen name shows everyone again
    const ini = (n) => esc(n.trim().charAt(0).toUpperCase() || '?');
    return (f && !exact ? `<button type="button" class="pp new" data-act="combo-new"><i>＋</i>${t('sell.addShort', { name: esc(L.cleanName(q)) })}</button>` : '')
      + shown.map((c) => `<button type="button" class="pp ${c.name === invForm.client ? 'on' : ''}" data-act="pick-client" data-id="${esc(c.name)}"><i>${ini(c.name)}${c.owing > 0 ? '<u></u>' : ''}</i>${esc(c.name)}</button>`).join('')
      || (f ? '' : `<div class="muted small" style="padding:10px 4px">${t('sell.noCustomers')}</div>`);
  }
  function Sell() {
    if (!selected.size) return storeStrip() + `<div class="sx"><div class="empty2"><div class="ic">🧾</div><h3>${t('sell.empty')}</h3><p>${t('sell.emptyText')}</p><button class="btn primary" data-act="goto-stock" style="width:100%">${t('sell.choose')}</button></div></div>`;
    const items = [...selected].map((id) => state.items.find((i) => i.id === id)).filter(Boolean);
    const sub = items.reduce((n, i) => n + L.effectivePrice(i), 0), client = L.cleanName(invForm.client);
    const row = (i) => { const eff = L.effectivePrice(i), sale = L.salePrice(i) > 0 && !L.isSold(i), was = Number(i.price) || 0;
      return `<div class="it"><button class="main" data-act="edit-item" data-id="${i.id}">${PUI.thumb(i).replace(/^<span class="ph/, '<span class="pic ph').replace(/<\/span>$/, (sale ? `<span class="s">−${Number(i.discount)}%</span>` : '') + '</span>')}<span class="t"><b>${esc(i.desc) || `<span class="bad">${t('sell.noDesc')}</span>`}</b><small>${i.id}${i.invoice ? t('sell.onInv', { no: i.invoice }) : ''}</small></span><span class="p">${eff > 0 ? money(eff) : `<span class="bad">${t('sell.noPrice')}</span>`}${sale && was > eff ? `<small><s>${money(was)}</s></small>` : ''}</span></button>
        <button class="x" data-act="unselect" data-id="${i.id}" aria-label="${t('aria.remove')}">✕</button></div>`; };
    return `${storeStrip()}<div class="sx"><div class="steps"><span class="on">① ${t('sell.s1')}</span><span class="${client ? 'on' : ''}">② ${t('sell.s2')}</span><span class="${client ? 'on' : ''}">③ ${t('sell.s3')}</span></div>
      <h4><span>${t('sell.items', { n: items.length })}</span><span class="tapedit">${t('sell.tapEdit')}</span></h4>
      <div class="card">${items.map(row).join('')}<div class="sub"><span>${t('sell.subtotal')}</span><b>${money(sub)}</b></div></div>
      <h4><span>${t('sell.customer')}</span></h4>
      <div class="card"><div class="srch"><span>🔍</span><input id="client" name="client" value="${esc(invForm.client)}" placeholder="${t('sell.customerPh')}" autocomplete="off" enterkeyhint="done"></div><div class="people" id="combolist">${chipRows(invForm.client)}</div></div>
      <h4><span>${t('sell.s3')}</span></h4>
      <div class="card"><div class="pay"><label for="paying">${t('sell.paying')}</label><div class="payrow"><div class="in"><span>TT$</span><input id="paying" name="paying" type="text" inputmode="decimal" value="${esc(invForm.paying)}" placeholder="0.00"></div><button class="full" data-act="pay-full">${t('sell.payFull')}</button></div><div id="prev">${previewBox()}</div></div></div></div>`;
  }

  function previewBox() {
    const p = preview(), due = p.total + p.prev, pct = due > 0 ? Math.max(0, Math.min(100, Math.round(p.paying / due * 100))) : 0;
    return `<div class="meter"><div class="bar"><i style="width:${pct}%"></i></div><div class="l"><span class="a">${t('sell.paidNow', { amt: money(p.paying) })}</span><span class="b">${t('sell.owesAfter', { amt: money(p.balance) })}</span></div></div>
      <div class="sumbox"><div><span>${t('prev.total', { amount: money(p.delivery) })}</span><span>${money(p.total)}</span></div>
      <div><span>${p.ref ? t('prev.prevRef', { ref: p.ref }) : t('prev.prev')}</span><span>${money(p.prev)}</span></div>
      <div><span>${t('prev.payingNow')}</span><span>${money(p.paying)}</span></div>
      <div class="t"><span>${t('prev.owingAfter')}</span><span>${money(p.balance)}</span></div>
      ${p.tip ? `<div class="good"><span>${t('prev.tip')}</span><span>${money(p.tip)}</span></div>` : ''}
      ${p.loss ? `<div class="bad"><span>${t('prev.loss')}</span><span>${money(p.loss)}</span></div>` : ''}</div>
      <div class="profit"><span>🔒 ${t('sell.profitPrivate')}</span><b>${money(p.profit)}</b></div>
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
    return f.map((c) => `<button class="row tap" data-act="customer" data-id="${esc(c.name)}"><div class="grow"><b>${esc(c.name)}</b><small>${tn('people.sub', c.bought, { amount: money(c.sales) })}${L.place(state, c.name) ? ' · 📍 ' + esc(L.place(state, c.name)) : ''}</small></div>
      <div class="end"><b class="${c.owing > 0 ? 'bad' : ''}">${c.owing > 0 ? money(c.owing) : ''}</b><span class="pill ${c.owing > 0 ? 'Owing' : 'Up'}">${custStLabel(c)}</span></div></button>`).join('') || `<div class="empty">${t('people.noMatch')}</div>`;
  }

  /* ---------- More ---------- */

  function More() {
    if (moreView === 'invoices') return `<div class="list">${L.filterInvoices(state, flt).slice().reverse().map(invoiceRow).join('') || `<div class="empty">${t('invoices.none')}</div>`}</div>`;
    if (moreView === 'items') return ItemLog();
    if (moreView === 'summary') return Summary();
    if (moreView === 'settings') return Settings();
    if (moreView && moreView.startsWith('set-')) return SettingsPage();
    const go = (v, icon, label, sub) => `<button class="row tap" data-act="more" data-id="${v}"><span style="font-size:22px">${icon}</span><div class="grow"><b>${label}</b><small>${sub}</small></div><span class="chev">›</span></button>`;
    const act = (a, icon, label, sub, bad) => `<button class="row tap" data-act="${a}"><span style="font-size:22px">${icon}</span><div class="grow"><b${bad ? ' class="bad"' : ''}>${label}</b><small>${sub}</small></div></button>`;
    return `<div class="list">${go('invoices', '🧾', t('more.invoices'), t('more.invoicesSub', { n: state.invoices.length }))}${go('items', '📋', t('more.items'), t('more.itemsSub', { n: state.items.length }))}
      ${go('summary', '📈', t('more.summary'), t('more.summarySub'))}${go('settings', '⚙️', t('more.settings'), t('more.settingsSub'))}</div>
      ${isStandalone() ? '' : `<div class="list" style="margin-top:8px"><button class="row tap" data-act="install-guide"><span style="font-size:22px">📲</span><div class="grow"><b>${t('more.install')}</b><small>${isIOS ? t('more.installIOS') : t('more.installOther')}</small></div><span class="chev">›</span></button></div>`}
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

  /* Settings is a list; each row opens its own page (moreView 'set-...'). The gear opens it, and closes it again. */
  const isSettings = () => tab === 'more' && moreView && (moreView === 'settings' || moreView.startsWith('set-'));
  let themeDraft = null;
  const isDark = () => theme === 'dark' || (theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const curPal = () => Theme.find(state.settings.palette || Theme.saved()).id;
  // A small copy of the Home screen wearing a scheme (the app itself is not touched).
  const themePreview = (id, name) => `<div class="pv" style="${Theme.inline(id, isDark())}"><div class="pv-bar"><i></i><span id="pv-name">${esc(name)}</span></div><div class="pv-body"><div class="pv-hero"><small>${t('pv.profit')}</small><b>TT$ 1,240.00</b></div>
    <div class="pv-row"><div><small>${t('pv.owing')}</small><b>TT$ 300.00</b></div><div><small>${t('nav.stock')}</small><b>6 · 0</b></div></div><div class="pv-chips"><span class="on">${t('filter.all')}</span><span>${stLabel('Available')}</span><span>${stLabel('Paid')}</span></div><div class="pv-btn">${t('pv.batch')}</div></div></div>`;
  const swatchBtns = (sel, act) => Theme.PALETTES.map((p) => `<button type="button" class="swatch ${sel === p.id ? 'on' : ''}" style="background:${p.brand}" role="radio" aria-checked="${sel === p.id}" aria-label="${t('pal.' + p.id)}" data-act="${act}" data-id="${p.id}"></button>`).join('');

  // Settings: one page. An account card, then sections of rows (icon, title, what it does, arrow). Nothing is tucked inside another settings page.
  const trow = (icon, title, sub, attrs, bad) => `<button class="row tap srow" ${attrs}><span class="tile">${icon}</span><div class="grow"><b${bad ? ' class="bad"' : ''}>${title}</b><small>${sub}</small></div><span class="chev">›</span></button>`;
  function Settings() {
    const themeName = { light: t('set.light'), dark: t('set.dark'), auto: t('set.auto') }[theme], nav = (v) => `data-act="more" data-id="${v}"`;
    const acct = cloud.signedIn
      ? `<div class="acctcard"><h3>${t('set.account')}</h3><div class="biz">🏪 ${esc(bizName())}</div><div class="who">${esc(cloud.email)}</div><div class="st ${cloud.status === 'synced' ? 'good' : /error|rules|unavailable/.test(cloud.status) ? 'bad' : ''}" id="acct-st">${acctStatus()}</div><button class="btn" data-act="acct-out">${t('acct.signOut')}</button></div>`
      : `<div class="acctcard"><h3>${t('set.account')}</h3><div class="biz">🏪 ${esc(bizName())}</div><div class="who">${t('set.accountOut')}</div><p class="muted small" style="margin:6px 0 10px">${t('acct.signInSub')}</p><button class="btn primary" data-act="acct-open">${t('acct.signIn')} / ${t('acct.create')}</button></div>`;
    return `${acct}
      <h2>${t('set.sec.app')}</h2><div class="list grp">
        ${trow('🌐', t('set.language'), I.LANGS[I.getLang()]['lang.name'], 'data-act="pick-lang"')}
        ${trow('🌓', t('set.appearance'), themeName, 'data-act="pick-appearance"')}
        ${trow('🎨', t('set.theme'), t('pal.' + curPal()) + ' · ' + t('set.colors', { n: Theme.PALETTES.length }), nav('set-theme'))}
        ${trow('🗣️', t('set.custLang'), { ask: t('cust.ask'), app: t('cust.same'), en: I.LANGS.en['lang.name'], es: I.LANGS.es['lang.name'] }[custMode()], 'data-act="pick-custlang"')}</div>
      <h2>${t('set.sec.business')}</h2><div class="list grp">${trow('🏪', t('set.businessRow'), t('set.businessSub'), nav('set-business'))}
        ${trow('🧾', t('set.invDesign'), t('invd.' + invDesignId()), nav('set-invdesign'))}</div>
      <h2>${t('set.sec.data')}</h2><div class="list grp">
        ${trow('🖼️', t('set.keepRow'), t('keep.' + photoKeep()), 'data-act="pick-keep"')}
        ${trow('💾', t('set.backupRow'), t('set.backupSub'), nav('set-backup'))}
        ${trow('📥', t('more.import'), t('more.importSub'), 'data-act="import-xlsx"')}
        ${trow('📊', t('set.storageRow'), t('set.storageSub'), nav('set-about'))}</div>
      <h2>${t('set.sec.about')}</h2><div class="list grp">
        ${trow('⬆️', t('set.versionRow', { v: APP_VERSION }), t('set.versionSub', { r: RULES_VERSION }), 'data-act="check-update"')}
        ${trow('🛡️', t('set.rulesRow'), t('set.rulesSub', { r: RULES_VERSION }), 'data-act="check-rules"')}
        ${trow('⚠️', t('more.erase'), t('more.eraseSub'), 'data-act="reset"', true)}</div>`;
  }
  // A small pop-up with the choices for one setting; tapping a choice applies it.
  function sheetChoice(title, act, cur, opts, note) {
    openSheet(`<h3>${title}</h3><div class="list" style="margin-top:12px">${opts.map(([k, l]) => `<button class="row tap" data-act="${act}" data-id="${k}"><div class="grow"><b>${l}</b></div><span style="font-weight:900;color:var(--brand)">${cur === k ? '✓' : ''}</span></button>`).join('')}</div>${note ? `<p class="note">${note}</p>` : ''}
      <div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`);
  }
  // Before a photo is shared: which language for the caption? Resolves 'en' | 'es', or null when closed without choosing.
  function shareLang() {
    if (custMode() !== 'ask') return Promise.resolve(custLang());
    const sh = $('#sheet'), was = !sh.hidden && sh.classList.contains('full') && sh.dataset.item ? sh.dataset.item : null;   // the item page it was started from
    return new Promise((ok) => {
      let done = false; const finish = (v) => { if (!done) { done = true; ok(v); if (was) setTimeout(() => sheetItem(was), 0); } };
      window.__shareLang = (lang) => { const ck = $('#sl-never'); if (ck && ck.checked) { setPref('custLang', lang); } finish(lang); };      // 'don't ask again' = from now on always this language
      openSheet(`<h3>${t('share.langTitle')}</h3><p class="muted small">${t('share.langSub')}</p>
        <div class="btns" style="margin-top:12px">${Object.keys(I.LANGS).map((l) => `<button class="btn primary" data-act="share-lang" data-id="${l}">${I.LANGS[l]['lang.name']}</button>`).join('')}</div>
        <label class="chkrow"><input type="checkbox" id="sl-never"><span>${t('share.dontAsk')}</span></label>
        <p class="note">${t('share.note')}</p>
        <div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, () => finish(null));
    });
  }
  function checkUpdate() {
    if (!('serviceWorker' in navigator)) return toast(t('upd.latest'));
    toast(t('upd.checking'));
    navigator.serviceWorker.getRegistration().then((r) => (r ? r.update().then(() => new Promise((ok) => setTimeout(() => ok(r), 1800))) : null))
      .then((r) => { if (r && (r.waiting || r.installing)) return toast(t('upd.found')); toast(t('upd.latest')); }).catch(() => toast(t('upd.latest')));
  }
  function checkRules() {
    if (!window.Cloud || !cloud.signedIn) return toast(t('rules.signIn'));
    toast(t('rules.checking'));
    Cloud.checkRules().then((r) => toast(t('rules.' + r), 6000)).catch(() => toast(t('rules.error'), 6000));
  }
  const fmtBytes = (n) => (n >= 1073741824 ? (n / 1073741824).toFixed(2) + ' GB' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const meter = (id, pct) => `<div class="meter"><i id="${id}" style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
  function AboutPage() {
    const u = window.Cloud ? Cloud.usage() : { bytes: 0, reads: 0, writes: 0, known: false }, c = { b: state.batches.length, i: state.items.length, v: state.invoices.length };
    const line = (k, v, id) => `<div><span>${k}</span><span${id ? ` id="${id}"` : ''}>${v}</span></div>`;
    setTimeout(fillAbout, 0);
    return `<h2 style="margin-top:4px">${t('about.versions')}</h2><div class="sumbox" style="margin-top:0">${line(t('about.app'), APP_VERSION)}${line(t('about.build'), '<span id="ab-build">…</span>')}${line(t('about.rules'), RULES_VERSION)}</div>
      <p class="muted small">${t('about.rulesNote')}</p>
      <h2>${t('about.storage')}</h2><div class="sumbox" style="margin-top:0"><div><span>${t('about.cloud')}</span><b>${cloud.signedIn ? fmtBytes(u.bytes) + ' ' + t('about.of') + ' 1 GB' : t('about.signedOut')}</b></div>${meter('m-cloud', u.bytes / CLOUD_LIMIT * 100)}<p class="muted small" style="margin:4px 0 0">${t('about.cloudNote')}</p></div>
      <div class="sumbox"><div><span>${t('about.phone')}</span><b id="ab-phone">${t('about.measuring')}</b></div>${meter('m-phone', 0)}<p class="muted small" id="ab-phone-note" style="margin:4px 0 0"></p></div>
      <h2>${t('about.counts')}</h2><div class="sumbox" style="margin-top:0">${line(t('about.cBatches'), c.b)}${line(t('about.cItems'), c.i)}${line(t('about.cInvoices'), c.v)}${line(t('about.cPhotos'), '<span id="ab-photos">…</span>')}${line(t('about.origs'), '<span id="ab-orig">…</span>')}${line(t('about.oldThumbs'), '<span id="ab-old">…</span>')}</div>
      <h2>${t('about.usage')}</h2><div class="sumbox" style="margin-top:0">${line(t('about.reads'), u.reads.toLocaleString() + ' / 50,000')}${meter('m-r', u.reads / 500)}${line(t('about.writes'), u.writes.toLocaleString() + ' / 20,000')}${meter('m-w', u.writes / 200)}<p class="muted small" style="margin:4px 0 0">${t('about.usageNote')}</p></div>`;
  }
  // The parts that need the phone to measure something (build id, browser storage, photos, offline tools).
  function fillAbout() {
    const put = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
    if (window.caches) caches.keys().then((ks) => { const k = ks.find((x) => /^buy-sell-/.test(x)); put('ab-build', k ? esc(k.replace('buy-sell-', '')) : '—'); }).catch(() => put('ab-build', '—'));
    const rec = new Blob([localStorage.getItem(KEY) || '']).size;
    const tools = window.caches ? caches.open('vendor-v1').then((c) => c.keys().then((rs) => Promise.all(rs.map((r) => c.match(r).then((x) => (x ? x.clone().blob().then((b) => b.size) : 0)))))).then((a) => a.reduce((x, y) => x + y, 0)).catch(() => 0) : Promise.resolve(0);
    Promise.all([PhotoStore.stats().catch(() => ({ count: 0, bytes: 0 })), tools, navigator.storage && navigator.storage.estimate ? navigator.storage.estimate().catch(() => null) : null]).then(([ph, tl, est]) => {
      put('ab-photos', ph.count);
      const old = L.oldThumbItems(state, Date.now());
      Promise.all(old.map((i) => PhotoStore.get(i.photo.id).then((r) => (r && r.thumb ? r.thumb.size : 0)).catch(() => 0))).then((a) => { const kb = fmtBytes(a.reduce((x, y) => x + y, 0)); put('ab-old', old.length ? t('about.origLine', { n: old.length, mb: kb }) + ` <button class="chip" data-act="free-thumbs" data-n="${old.length}" data-mb="${kb}">${t('about.thumbsBtn')}</button>` : t('about.origNone')); });
      put('ab-orig', ph.origCount ? t('about.origLine', { n: ph.origCount, mb: fmtBytes(ph.origBytes) }) + ` <button class="chip" data-act="free-space" data-n="${ph.origCount}" data-mb="${fmtBytes(ph.origBytes)}">${t('about.free')}</button>` : t('about.origNone'));
      const total = est && est.usage ? est.usage : rec + ph.bytes + tl;
      put('ab-phone', fmtBytes(total) + (est && est.quota ? ' ' + t('about.of') + ' ' + fmtBytes(est.quota) : ''));
      const m = document.getElementById('m-phone'); if (m && est && est.quota) m.style.width = Math.min(100, Math.max(1, total / est.quota * 100)) + '%';
      put('ab-phone-note', t('about.phoneNote', { rec: fmtBytes(rec), ph: fmtBytes(ph.bytes), tools: fmtBytes(tl) }));
    });
  }
  function BackupPage() {
    const act = (a, label, sub, bad) => `<button class="row tap" data-act="${a}"><div class="grow"><b${bad ? ' class="bad"' : ''}>${label}</b><small>${sub}</small></div></button>`;
    return `<div class="list">${act('export-json', t('more.backup'), t('more.backupSub'))}${act('import-json', t('more.restore'), t('more.restoreSub'))}${act('reset', t('more.erase'), t('more.eraseSub'), true)}</div><p class="note">${t('photo.backupNote')}</p>`;
  }
  const invCards = () => {
    const cur = invDesignId();
    return InvDesign.DESIGNS.map((d) => {
      const c = invDesign(d.id), top = d.id === 'classic' ? bannerSrc() : headerURL(d.id), on = cur === d.id;
      return `<div class="dwrap"><button class="dzoom" data-act="inv-design-view" data-id="${d.id}" aria-label="${t('invd.full')}">⤢</button><button class="dsg ${on ? 'on' : ''}" role="radio" aria-checked="${on}" data-act="inv-design" data-id="${d.id}" style="--ih:${c.head};--it:${c.tint || '#f6edf2'}">
        <span class="pg"><img src="${top}" alt=""><i class="th"></i><i class="r1"></i><i class="r2"></i><i class="r3"></i><i class="bd"></i></span><b>${t('invd.' + d.id)}</b>${d.themed ? `<small>${t('invd.themed')}</small>` : ''}</button></div>`;
    }).join('');
  };
  // Colour settings of the chosen design: own colour (or the theme's), lighter/darker, and how far the second colour goes.
  function invColourPanel() {
    const id = invDesignId(), st = invStyle(id), d = InvDesign.find(id);
    if (!d.themed) return `<div class="invset"><h3>${t('invd.colours')} · ${t('invd.' + id)}</h3><p class="muted small" style="margin:0">${t('invd.fixed')}</p></div>`;
    const own = (st.color || '').toLowerCase(), blend = st.blend != null && st.blend !== '' ? st.blend : (InvDesign.BLEND[id] || 0), hasBlend = id in InvDesign.BLEND;
    return `<div class="invset"><h3>${t('invd.colours')} · ${t('invd.' + id)}</h3>
      <div class="swatches"><button type="button" class="chip ${own ? '' : 'on'}" data-act="inv-color" data-id="">${t('invd.theme')}</button>${Theme.PALETTES.map((p) => `<button type="button" class="swatch ${own === p.brand ? 'on' : ''}" style="background:${p.brand}" data-act="inv-color" data-id="${p.brand}" aria-label="${t('pal.' + p.id)}"></button>`).join('')}
        <label class="swatch own" aria-label="${t('invd.custom')}"><input type="color" data-inv="color" value="${own || Theme.brand()}"><span>＋</span></label></div>
      <label for="inv-light">${t('invd.light')}</label><input id="inv-light" type="range" min="-20" max="20" step="1" value="${Number(st.light) || 0}" data-inv="light">
      ${hasBlend ? `<label for="inv-blend">${t('invd.blend')}</label><input id="inv-blend" type="range" min="-90" max="90" step="1" value="${blend}" data-inv="blend">` : ''}
      <div class="btns" style="margin-top:10px"><button type="button" class="btn primary" data-act="invfs-open">🎨 ${t('invd.wheel')} · ${t('invd.fullEditor')}</button><button type="button" class="btn" data-act="inv-reset">${t('invd.reset')}</button></div></div>`;
  }
  function InvDesignPage() {
    const fr = invFrame(), frames = [['tint', t('invd.frameTint')], ['shadow', t('invd.frameShadow')], ['none', t('invd.frameNone')]];
    return `<p class="muted small" style="margin:0 2px 10px">${t('invd.note')}</p>
      <div class="invset"><h3>${t('invd.frame')}</h3><div class="chiprow" role="radiogroup" aria-label="${t('invd.frame')}" style="margin:0">${frames.map(([k, l]) => `<button type="button" class="chip ${fr === k ? 'on' : ''}" role="radio" aria-checked="${fr === k}" data-act="inv-frame" data-id="${k}">${l}</button>`).join('')}</div><p class="muted small" style="margin:8px 0 0">${t('invd.frameNote')}</p></div>
      <div id="invpanel">${invColourPanel()}</div><div class="dsgrid" id="dsgrid" role="radiogroup" aria-label="${t('set.invDesign')}">${invCards()}</div>`;
  }
  /* Full-screen editor: a big live preview of the invoice, a colour wheel, brightness, second colour. Opened from the Invoice design page. */
  let invFsOn = false, invFsHsv = null, invFsTimer = 0, invFsUrl = '';
  const invSample = () => { const d = new Date(); return state.invoices[state.invoices.length - 1] || { no: 'INV00001', client: ti('doc.sampleClient'), date: d.toISOString(), due: new Date(d.getTime() + 6048e5).toISOString(), lines: [{ desc: ti('doc.sampleItem'), qty: 1, price: 250 }], delivery: 0, total: 250, amountPaid: 250, previouslyPaid: 0, balance: 0 }; };
  function invFsPreview() {
    clearTimeout(invFsTimer);
    invFsTimer = setTimeout(() => invoiceCanvas(invSample(), 'image/png', true).then((blob) => { const img = $('#invfs-img'); if (!img) return; const old = invFsUrl; invFsUrl = URL.createObjectURL(blob); img.src = invFsUrl; if (old) setTimeout(() => URL.revokeObjectURL(old), 800); }).catch(() => {}), 90);
  }
  function drawWheel(cv, v) {
    const n = cv.width, im = cv.getContext('2d').createImageData(n, n), r = n / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - r, dy = y + 0.5 - r, dist = Math.hypot(dx, dy), i = (y * n + x) * 4;
      if (dist > r) { im.data[i + 3] = 0; continue; }
      const hex = InvDesign.hsvHex(Math.atan2(dy, dx) * 180 / Math.PI, dist / r, v); im.data[i] = parseInt(hex.slice(1, 3), 16); im.data[i + 1] = parseInt(hex.slice(3, 5), 16); im.data[i + 2] = parseInt(hex.slice(5, 7), 16); im.data[i + 3] = Math.min(255, (r - dist) * 255);
    }
    cv.getContext('2d').putImageData(im, 0, 0);
  }
  function invFsControls() {
    const id = invDesignId(), d = InvDesign.find(id), st = invStyle(id), el = $('#invfs-ctl'); if (!el) return;
    if (!d.themed) { el.innerHTML = `<p class="muted small" style="margin:6px 0">${t('invd.fixed')}</p><button class="btn primary" data-act="invfs-close">${t('btn.done')}</button>`; return; }
    invFsHsv = InvDesign.hsvOf(InvDesign.colours(id, Theme.brand(), Object.assign({}, st, { light: 0 })).head);
    const blend = st.blend != null && st.blend !== '' ? st.blend : (InvDesign.BLEND[id] || 0);
    el.innerHTML = `<div class="wheelbox"><canvas id="invwheel" width="440" height="440" aria-label="${t('invd.wheel')}"></canvas><i id="wheelpin"></i></div>
      <label for="invfs-v">${t('invd.bright')}</label><input id="invfs-v" type="range" min="25" max="100" step="1" value="${Math.round(invFsHsv.v * 100)}" data-invfs="v">
      ${id in InvDesign.BLEND ? `<label for="invfs-b">${t('invd.blend')}</label><input id="invfs-b" type="range" min="-90" max="90" step="1" value="${blend}" data-inv="blend">` : ''}
      <div class="btns"><button class="btn" data-act="invfs-theme">${t('invd.theme')}</button><button class="btn" data-act="inv-reset">${t('invd.reset')}</button><button class="btn primary" data-act="invfs-close">${t('btn.done')}</button></div>`;
    const cv = $('#invwheel'); drawWheel(cv, invFsHsv.v); placePin();
    const pick = (e) => { const r = cv.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), rad = r.width / 2; invFsHsv.h = Math.atan2(dy, dx) * 180 / Math.PI; invFsHsv.s = Math.min(1, Math.hypot(dx, dy) / rad); invFsApply(); };
    cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); cv.dataset.drag = '1'; pick(e); };
    cv.onpointermove = (e) => { if (cv.dataset.drag) pick(e); };
    cv.onpointerup = cv.onpointercancel = () => { delete cv.dataset.drag; };
  }
  function placePin() {
    const pin = $('#wheelpin'), cv = $('#invwheel'); if (!pin || !cv || !invFsHsv) return; const a = invFsHsv.h * Math.PI / 180, rr = invFsHsv.s * 50;
    pin.style.left = 50 + Math.cos(a) * rr + '%'; pin.style.top = 50 + Math.sin(a) * rr + '%'; pin.style.background = InvDesign.hsvHex(invFsHsv.h, invFsHsv.s, invFsHsv.v);
  }
  function invFsApply() { setInvStyle({ color: InvDesign.hsvHex(invFsHsv.h, invFsHsv.s, invFsHsv.v), light: 0 }); placePin(); invFsPreview(); const g = $('#dsgrid'); if (g) g.innerHTML = invCards(); }
  function invFsChips() { $('#invfs-chips').innerHTML = InvDesign.DESIGNS.map((d) => `<button class="chip ${invDesignId() === d.id ? 'on' : ''}" data-act="invfs-pick" data-id="${d.id}">${t('invd.' + d.id)}</button>`).join(''); }
  function openInvEditor() {
    let el = $('#invfs'); if (!el) { el = document.createElement('section'); el.id = 'invfs'; el.className = 'invfs'; el.setAttribute('aria-label', t('invd.editor')); document.body.appendChild(el); }
    el.innerHTML = `<div class="invfs-top"><div class="chiprow" id="invfs-chips"></div><button class="vx" data-act="invfs-close" aria-label="${t('btn.close')}">✕</button></div><div class="invfs-prev"><img id="invfs-img" alt=""></div><div class="invfs-ctl" id="invfs-ctl"></div>`;
    el.hidden = false; invFsOn = true; document.body.style.overflow = 'hidden'; invFsChips(); invFsControls(); invFsPreview();
  }
  function closeInvEditor() { const el = $('#invfs'); if (el) el.hidden = true; invFsOn = false; document.body.style.overflow = ''; if (moreView === 'set-invdesign') render(); }
  function setInvStyle(patch) {
    const id = invDesignId(); state.settings.invoiceStyle = Object.assign({}, state.settings.invoiceStyle); state.settings.invoiceStyle[id] = Object.assign({}, state.settings.invoiceStyle[id], patch); save();
  }
  function SettingsPage() {
    const s = state.settings, cur = I.getLang();
    if (moreView === 'set-about') return AboutPage();
    if (moreView === 'set-backup') return BackupPage();
    if (moreView === 'set-invdesign') return InvDesignPage();
    if (moreView === 'set-theme') {
      const sel = themeDraft || curPal(), changed = sel !== curPal();
      return `<div class="swatches wrap" role="radiogroup" aria-label="${t('set.theme')}">${swatchBtns(sel, 'draft-palette')}</div>
        <p class="muted small" style="margin:8px 2px 0"><b>${t('pal.' + sel)}</b>${changed ? '' : ' · ' + t('set.current')} · ${t('set.themeNote')}</p>
        <h2>${t('set.preview')}</h2>${themePreview(sel, bizName())}
        <div class="btns"><button class="btn primary" data-act="apply-palette" ${changed ? '' : 'disabled'}>${t('set.apply')}</button></div>`;
    }
    return `<form id="f-settings"><label>${t('set.bizName')}</label><input name="businessName" value="${esc(bizName())}" autocomplete="off">
      <label>${t('set.bizCity')}</label><input name="bizCity" value="${esc(s.bizCity || '')}" autocomplete="off"><div class="grid2"><div><label>${t('set.bizPhone')}</label><input name="bizPhone" type="text" inputmode="tel" value="${esc(s.bizPhone || '')}" autocomplete="off"></div><div><label>${t('set.bizEmail')}</label><input name="bizEmail" type="text" inputmode="email" value="${esc(s.bizEmail || '')}" autocomplete="off"></div></div><div class="grid2"><div><label>${t('set.year')}</label><input name="year" type="text" inputmode="numeric" value="${s.year}"></div>
      <div><label>${t('set.margin')}</label><input name="defaultMargin" type="text" inputmode="decimal" value="${s.defaultMargin}"></div></div>
      <label>${t('set.markup')}</label><input name="markup" type="text" inputmode="decimal" step="0.001" value="${s.markup}">
      ${['USD', 'EUR', 'GBP'].map((c) => `<label>${t('set.rate', { c })}</label><input name="${c}" type="text" inputmode="decimal" step="0.0001" value="${s.rates[c]}">`).join('')}
      <p class="muted small">${t('set.rateNote')}</p>
      <div class="btns"><button class="btn primary">${t('set.save')}</button></div></form>`;
  }

  /* ---------- sheets ---------- */

  // Every screen is full-screen: a pop-up (title + content) is turned into a page with the same back bar as the others.
  function asPage(html) {
    const m = /^\s*<h3>([\s\S]*?)<\/h3>/.exec(html), cls = /^\s*<div class="(fullbar|cpage)/.test(html);
    if (cls) return html;
    const title = m ? m[1] : '', rest = m ? html.slice(m[0].length) : html;
    return `<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${title}</b></div></div><div class="ap">${rest}</div>`;
  }
  function openSheet(html, onClose, full) {
    if (!full) { html = asPage(html); full = true; }
    sheetClose = onClose || null; $('#sheet').classList.toggle('full', !!full); document.body.classList.toggle('page-open', !!full);   // full-screen pages keep the bottom tab bar
    $('#sheet').innerHTML = `<div class="grab"></div>${html}`; $('#sheet').hidden = false; $('#scrim').hidden = false; $('#sheet').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    syncKeyboard();
    syncHistory();
    PUI.hydrate();
  }
  function closeSheet() {
    if ($('#sheet').hidden) return;
    pageStack = [];
    $('#sheet').hidden = true; $('#scrim').hidden = true; $('#sheet').innerHTML = ''; $('#sheet').classList.remove('full'); document.body.classList.remove('page-open'); invLangSession = null; document.body.style.overflow = '';
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
      <div class="grid2"><div><label>${t('batch.count')}</label><input name="count" type="text" inputmode="numeric" min="1" required></div>
      <div><label>${t('batch.currency')}</label><select name="currency">${currencyOpts()}</select></div></div>
      <div class="grid2"><div><label>${t('batch.totalCost')}</label><input name="totalCost" type="text" inputmode="decimal" step="0.01" min="0" required></div>
      <div><label>${t('batch.marginPct')}</label><input name="margin" type="text" inputmode="decimal" value="${state.settings.defaultMargin}"></div></div>
      <p class="muted small" id="rate-hint"></p>
      <div class="btns"><button class="btn primary">${t('batch.create')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`);
  }

  function sheetBatch(id) {
    const b = state.batches.find((x) => x.id === id); if (!b) return;
    enterPage('batch', id, () => sheetBatch(id));
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
      <div class="grid2"><input name="amount" type="text" inputmode="decimal" step="0.01" min="0" placeholder="0.00"><button class="btn primary">${t('batch.recordPayment')}</button></div></form>
      <div class="btns bbtns"><button class="btn primary" data-act="qe-open" data-id="${b.id}">✏️ ${t('qe.btn')}</button><div class="brow"><button class="btn tw" data-act="photo-add" data-id="${b.id}"><span>📷 ${t('photo.add')}</span><small>${t('photo.progress', { n: L.photoStats(state, b.id).withPhoto, total: L.photoStats(state, b.id).total })}</small></button>
      <button class="btn tw" data-act="open-stock" data-id="${b.id}"><span>${t('batch.viewItems')}</span></button></div>
      ${bStatus(b) === 'In Transit' ? `<button class="btn" data-act="do-receive" data-id="${b.id}">${t('batch.markReceived')}</button>` : ''}
      <div class="brow">${bStatus(b) !== 'Closed' ? `<button class="btn danger" data-act="close-batch" data-id="${b.id}">${t('batch.close')}</button>` : ''}
      ${st.sold === 0 ? `<button class="btn danger" data-act="del-batch" data-id="${b.id}">${t('batch.delete')}</button>` : ''}</div></div>
      ${bStatus(b) !== 'Closed' ? `<p class="muted small">${t('batch.closeNote')}</p>` : ''}`);
  }

  function sheetPayClearing() {
    if (!state.batches.length) return toast(t('clear.noBatch'));
    openSheet(`<h3>${t('clear.title')}</h3><form id="f-clear"><label>${t('clear.batch')}</label><select name="batch">${batchOpts(state.batches.filter((b) => bStatus(b) !== 'Closed').reverse())}</select>
      <label>${t('clear.amount')}</label><input name="amount" type="text" inputmode="decimal" step="0.01" min="0" placeholder="0.00" required>
      <div class="btns"><button class="btn primary">${t('batch.recordPayment')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`);
  }

  function sheetReceive() {
    const list = state.batches.filter((b) => bStatus(b) === 'In Transit'); if (!list.length) return toast(t('recv.none'));
    openSheet(`<h3>${t('recv.title')}</h3><p class="muted small">${t('recv.note')}</p>
      <form id="f-receive"><label>${t('clear.batch')}</label><select name="batch">${batchOpts(list)}</select>
      <div class="btns"><button class="btn primary">${t('recv.mark')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`);
  }

  // Previous / next arrows (with "4 of 8") for the top bar, to flip through the items of one batch without going back.
  const navArrows = (ids, id, act) => { const n = ids.indexOf(id); if (n < 0 || ids.length < 2) return ''; return `<div class="nx"><span class="c">${t('nav.ofN', { n: n + 1, total: ids.length })}</span><button data-act="${act}" data-id="${ids[n - 1] || ''}" ${n ? '' : 'disabled'} aria-label="${t('nav.prev')}">‹</button><button data-act="${act}" data-id="${ids[n + 1] || ''}" ${n < ids.length - 1 ? '' : 'disabled'} aria-label="${t('nav.next')}">›</button></div>`; };
  const batchIds = (batchId, unsoldOnly) => state.items.filter((x) => x.batchId === batchId && (!unsoldOnly || !L.isSold(x))).map((x) => x.id).sort();
  function sheetItem(id, swap) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    enterPage('item', id, () => sheetItem(id), swap);
    const b = batchOf(i), sold = L.isSold(i);
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${i.id}</b><small>${bl(b.id)} · ${esc(i.store)}${i.invoice ? t('item.invoice', { no: i.invoice }) : ''}${i.customer ? ' · ' + esc(i.customer) : ''}</small></div>${navArrows(batchIds(b.id, false), i.id, 'item-go')}</div>
      ${sold ? `<div class="lockbar">🔒 <div><b>${t('item.locked')}</b><small>${i.invoice ? t('item.lockedNote', { no: i.invoice }) : t('item.lockedNoInv')}</small>${(() => { const iv = state.invoices.find((x) => x.no === i.invoice); return iv && iv.balance > 0 && !iv.updatedBy ? `<button class="pay-btn" data-act="pay-inv" data-id="${iv.no}" data-back="item" data-item="${i.id}" style="margin-top:8px">${t('pay.btn')} · ${t('cust.stillOwes', { amt: money(iv.balance) })}</button>` : ''; })()}</div></div>` : ''}
      ${PUI.photoBox(i)}
      <fieldset class="lockset" ${sold ? 'disabled' : ''}>
      <label>${t('item.desc')}</label><input data-f="desc" value="${esc(i.desc)}" placeholder="${t('item.descPh')}" autocomplete="off">
      <label>🔒 ${t('item.cost', { cur: b.currency })} <span class="privnote">${t('item.privateNote')}</span></label><input data-f="cost" type="text" inputmode="decimal" step="0.01" min="0" value="${i.cost || ''}">
      <label>${t('item.price')}</label><div class="grid2" id="pricerow"><input data-f="price" type="text" inputmode="decimal" step="0.01" min="0" value="${i.price || ''}" placeholder="0.00"><button class="btn" type="button" data-act="use-rec" data-id="${i.id}">${t('item.useRec')}</button></div>
      <div id="saleblock">${saleHTML(i)}</div>
      <p class="muted small">${t('item.shownNote')}</p>
      <div class="grid2"><div><label>${t('item.sold')}</label><input data-f="sold" type="text" inputmode="decimal" step="0.01" min="0" value="${i.sold || ''}"></div>
      <div><label>${t('item.delivery')}</label><input data-f="delivery" type="text" inputmode="decimal" step="0.01" min="0" value="${i.delivery || ''}"></div></div>
      <div class="sumbox" id="calc"></div>
      <label>${t('item.status')}</label><select data-f="status">${STATUSES.map((s) => `<option value="${s}" ${s === i.status ? 'selected' : ''}>${stLabel(s)}</option>`).join('')}</select>
      </fieldset>
      ${sold ? `<div class="btns">${i.invoice ? `<button class="btn" data-act="view-inv" data-id="${i.invoice}">${t('item.viewInv')}</button><button class="btn danger" data-act="return-inv" data-id="${i.invoice}">${t('item.returnInv')}</button>` : `<button class="btn danger" data-act="return-item" data-id="${i.id}">${t('item.returnItem')}</button>`}<button class="btn" data-act="close">${t('btn.done')}</button></div>`
      : `<div class="btns"><button class="btn primary" data-act="${selected.has(i.id) ? 'unselect-close' : 'select-close'}" data-id="${i.id}">${selected.has(i.id) ? t('item.removeInv') : t('item.addInv')}</button>
      <button class="btn" data-act="close">${t('btn.done')}</button></div>`}`, render, true);
    $('#sheet').dataset.item = id; updateSale(i);
  }
  /* Edit batch: one unsold item at a time with its picture, description, price, cost and sale; Save & next moves on. */
  function sheetQuick(batchId, id, swap) {
    const ids = batchIds(batchId, true), i = state.items.find((x) => x.id === id); if (!i || !ids.length) return;
    enterPage('quick', batchId, () => sheetQuick(batchId, id), swap);
    const b = batchOf(i), n = ids.indexOf(id);
    const strip = ids.map((x, k) => { const it = state.items.find((y) => y.id === x); return `<button class="qt ${x === id ? 'on' : ''} ${String(it.desc || '').trim() ? 'done' : ''}" data-act="qe-go" data-id="${x}" data-b="${batchId}" aria-label="${x}">${it.photo ? `<img data-ph="${it.photo.id}" data-kind="thumb" alt="">` : `<em>${k + 1}</em>`}</button>`; }).join('');
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('qe.title')}</b><small>${bl(b.id)} · ${esc(i.store)}</small></div>${navArrows(ids, id, 'qe-go')}</div>
      <div class="qe"><div class="qstrip" id="qstrip">${strip}</div>
      <div class="qbig">${i.photo ? `<img data-ph="${i.photo.id}" data-kind="${i.photo.noFull ? 'thumb' : 'full'}" alt="">` : `<span class="qnone">${t('photo.noPhoto')}</span>`}</div>
      <div class="qf"><label>${t('item.desc')}</label><input data-f="desc" value="${esc(i.desc)}" placeholder="${t('item.descPh')}" autocomplete="off" enterkeyhint="next">
      <div class="grid2"><div><label>${t('item.price')}</label><input data-f="price" type="text" inputmode="decimal" value="${i.price || ''}" placeholder="0.00" enterkeyhint="next"></div><div><label>🔒 ${t('item.cost', { cur: b.currency })}</label><input data-f="cost" type="text" inputmode="decimal" value="${i.cost || ''}" placeholder="0.00" enterkeyhint="done"></div></div>
      <button class="btn" type="button" data-act="use-rec" data-id="${i.id}" style="width:100%;margin-top:10px">${t('item.useRec')}</button>
      <div id="saleblock" style="margin-top:6px">${saleHTML(i)}</div>
      <div class="sumbox" id="calc"></div></div>
      <div class="qgo"><button class="sk" data-act="qe-next" data-id="${i.id}" data-skip="1">${t('qe.skip')}</button><button class="pr" data-act="qe-next" data-id="${i.id}">${n < ids.length - 1 ? t('qe.saveNext') : t('qe.saveDone')}</button></div></div>`, render, true);
    $('#sheet').dataset.item = id; updateSale(i);
    const cur = $('#qstrip .qt.on'); if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function quickNext(id, skip) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    if (!skip && document.activeElement && document.activeElement.blur) document.activeElement.blur();   // saves the box being typed in
    const ids = batchIds(i.batchId, true), n = ids.indexOf(id);
    if (n >= 0 && n < ids.length - 1) { sheetQuick(i.batchId, ids[n + 1], true); window.scrollTo(0, 0); $('#sheet').scrollTop = 0; return; }
    toast(t('qe.allDone')); pageStack = []; closeSheet(); sheetBatch(i.batchId);
  }
  /* A sale takes a percentage off the selling price: a switch, quick percentages, and the sale price worked out for you. */
  function saleSum(i) {
    const pct = Number(i.discount) || 0, sp = L.salePrice(i);
    return `<div><span>${t('item.sellingWas')}</span><span class="${sp ? 'was' : ''}">${money(Number(i.price) || 0)}</span></div><div><span>${t('item.discountRow')}</span><span>${pct ? '−' + pct + '%' : '—'}</span></div>
      <div class="t"><span class="big">${t('item.salePriceLbl')}</span><span class="big">${money(sp)}</span></div>`;
  }
  function saleHTML(i) {
    const on = !!i.saleOn, pct = Number(i.discount) || 0;
    return `<div class="sw2"><div><b>${t('item.onSale')}</b><small>${t('item.onSaleSub')}</small></div><button type="button" class="tog ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${t('item.onSale')}" data-act="toggle-sale" data-id="${i.id}"></button></div>
      ${on ? `<div class="chiprow">${[10, 20, 25, 50].map((c) => `<button type="button" class="chip ${pct === c ? 'on' : ''}" data-act="sale-pct" data-id="${i.id}" data-v="${c}">${c}%</button>`).join('')}<button type="button" class="chip" data-act="sale-other" data-id="${i.id}">${t('item.saleOther')}</button></div>
      <label>${t('item.discount')}</label><input data-f="discount" type="text" inputmode="decimal" value="${pct ? pct + '%' : ''}" placeholder="${t('item.discountPh')}" autocomplete="off">
      <div class="sumbox" id="salesum">${saleSum(i)}</div>` : ''}`;
  }
  // Keeps everything that depends on the prices in step (profit lines, sale summary, the locked selling price).
  function updateSale(i) {
    calcBox(i); refreshTag(i);
    const sold = $('#sheet [data-f=sold]'); if (sold) { const v = L.salePrice(i) || Number(i.price) || 0; sold.placeholder = v ? L.r2(v).toFixed(2) : ''; }   // what Add to invoice would use
    const sum = $('#salesum'); if (sum) sum.innerHTML = saleSum(i);
  }
  // The price tag as it will appear on the shared picture (the item page shows it over the photo).
  function tagHTML(i) {
    const sale = L.salePrice(i), price = Number(i.price) || 0;
    if (sale > 0) return `<b>${invMoney(sale)}</b><s>${invMoney(price)}</s><em>${t('photo.off', { pct: Number(i.discount) }, invoiceLang())}</em>`;
    return price > 0 ? `<b>${invMoney(price)}</b>` : '';
  }
  function refreshTag(i) { const el = $('#ptag'); if (el) { el.innerHTML = tagHTML(i); el.hidden = !el.innerHTML; } }
  function refreshSaleBlock(i) { const el = $('#saleblock'); if (el) el.innerHTML = saleHTML(i); updateSale(i); }
  const parsePct = (v) => Math.min(99, Math.max(0, Math.round((parseFloat(String(v).replace('%', '').replace(',', '.')) || 0) * 100) / 100));

  function calcBox(i) {
    const c = L.itemCalc(batchOf(i), i), has = c.landed > 0, price = Number(i.price) || 0, sold = Number(i.sold) || 0, sale = L.salePrice(i);
    const line = (label, price0, strong) => { const ok = has && price0 > 0, v = L.r2(price0 - c.landed); return `<div${strong ? ' class="t"' : ''}><span>${label}</span><span class="${ok && v < 0 ? 'bad' : ''}">${ok ? money(v) : '—'}</span></div>`; };
    // First profit line follows the selling-price part: a sale price while a sale is on; otherwise the Selling price box (empty or equal to the recommended price = "recommended").
    // A second line (sold for) appears only when something is typed in Sold for.
    const isRec = price <= 0 || Math.abs(price - c.recommended) < 0.005;
    if (L.isSold(i)) {   // a sold item, in three short blocks: what it cost, what it sold for, and the profit (to date while it is still owing)
      const so = L.r2(c.paid - c.landed), owing = Math.max(0, L.r2(sold - c.paid)), row = (k, v, cls) => `<div><span>${k}</span><span class="${cls || ''}">${v}</span></div>`;
      const profitRow = (k, price0) => { const v = L.r2(price0 - c.landed); return row(k, has && price0 > 0 ? money(v) : '—', has && v < 0 ? 'bad' : ''); };
      $('#calc').innerHTML = `<h5>${t('calc.secCost')}</h5>${row(t('calc.costTTD'), money(c.costTTD))}${row(t('calc.clearing'), money(c.clearing))}<div class="t"><span>${t('calc.landed')}</span><span>${money(c.landed)}</span></div>
        <h5>${t('calc.secPrice')}</h5>${row(t('calc.rec'), money(c.recommended))}${row(t('calc.soldFor'), money(sold))}
        <h5>${t('calc.secProfit')}</h5>${profitRow(t('calc.atRec'), c.recommended)}${profitRow(t('calc.atSold'), sold)}
        ${owing > 0 ? `<h5>${t('calc.secPayments')}</h5>${row(t('calc.received'), money(c.paid))}${row(t('calc.balanceOwing'), money(owing), 'bad')}
          <div class="t big"><span>${t('calc.profitToDate')}</span><span class="${so < 0 ? 'bad' : ''}">${has ? money(so) : '—'}</span></div>${has && so < 0 ? `<p class="muted small" style="margin:6px 0 0">${t('calc.notCovered', { amt: money(-so) })}</p>` : ''}`
        : `<div class="t big"><span>${t('calc.profitMade')}</span><span class="${so < 0 ? 'bad' : ''}">${has ? money(so) : '—'}</span></div>`}`;
      return;
    }
    const first = sale > 0 ? line(t('calc.profitSale'), sale, true) : line(isRec ? t('calc.profitRec') : t('calc.profitPrice'), isRec ? c.recommended : price, true);
    $('#calc').innerHTML = `<div><span>${t('calc.costTTD')}</span><span>${money(c.costTTD)}</span></div><div><span>${t('calc.clearing')}</span><span>${money(c.clearing)}</span></div>
      <div class="t"><span>${t('calc.landed')}</span><span>${money(c.landed)}</span></div><div><span>${t('calc.rec')}</span><span>${money(c.recommended)}</span></div>
      ${first}${sold > 0 ? line(t('calc.profitSold'), sold, false) : ''}`;
  }

  // Invoice design follows the Google Sheets invoice template (banner, mauve table header, balance bar, pink footer).
  // The invoice can be in a different language from the app (customers may read the other one): invoiceLang() / ti().
  const INV = { mauve: '#cea8bd', band: '#e6d2db', grey: '#767676', mid: '#545454' };
  // "Language for customers" (Settings) decides invoices and the caption of shared photos: same as the app, English or Spanish.
  // The English | Español switch on an invoice only changes that invoice while it is open.
  let invLangSession = null;
  // custMode: 'ask' (the default: ask when sharing), 'app' (same as the app), 'en' or 'es'. Older saved choices carry over.
  const custMode = () => { const v = pref('custLang', null); if (v === 'ask' || v === 'app' || v === 'en' || v === 'es') return v; return pref('askShareLang', true) ? 'ask' : 'app'; };
  const custLang = () => { const m = custMode(); return m === 'en' || m === 'es' ? m : I.getLang(); };
  const invoiceLang = () => invLangSession || custLang();
  const ti = (key, vars) => t(key, vars, invoiceLang());
  const bannerSrc = () => (invoiceLang() === 'es' ? 'icons/invoice-banner-es.jpg' : 'icons/invoice-banner.jpg');
  // Invoice design (Settings): the picture at the top and the colours of the table. 'classic' is the flower picture; the others are drawn here.
  let designOverride = null;   // used to preview a design full screen without choosing it
  const invDesignId = () => designOverride || InvDesign.find(state.settings.invoiceDesign).id;
  const invStyle = (id) => ((state.settings.invoiceStyle || {})[id || invDesignId()]) || {};   // the owner's colour changes for a design
  const invDesign = (id) => InvDesign.colours(id || invDesignId(), Theme.brand(), invStyle(id));
  const invBiz = () => {
    const s = state.settings, own = !!(s.businessName || s.bizCity || s.bizPhone || s.bizEmail);
    return { name: s.businessName || 'B.RUIZ', lines: (own ? [s.bizCity, s.bizPhone, s.bizEmail] : ['Chaguanas', '18683658857', 'berilexy.ruiz93@gmail.com']).filter(Boolean), logo: s.businessName ? null : invLogo };
  };
  const invLogo = new Image(); invLogo.src = 'icons/icon-512.png';
  const headCache = {};
  function headerCanvas(id, S) {
    const b = invBiz(), W = 800, c = document.createElement('canvas'); c.width = W * S; c.height = InvDesign.HEAD_H * S;
    const x = c.getContext('2d'); x.scale(S, S); InvDesign.drawHeader(x, id, W, { name: b.name, lines: b.lines, title: ti('doc.invoiceWord'), logo: b.logo && b.logo.complete && b.logo.naturalWidth ? b.logo : null }, Theme.brand(), invStyle(id)); return c;
  }
  function headerURL(id) {
    const b = invBiz(), k = [id, invoiceLang(), b.name, b.lines.join('|'), Theme.brand(), JSON.stringify(invStyle(id)), b.logo && b.logo.complete ? 1 : 0].join('~');
    return headCache[k] || (headCache[k] = headerCanvas(id, 2).toDataURL('image/png'));
  }
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

  function sheetInvoice(no, swap) {   // swap: show this invoice in place of the one on screen (the payment history rows do this)
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    enterPage('invoice', no, () => sheetInvoice(no), swap);
    let latest = v; while (latest.updatedBy) { const n = state.invoices.find((x) => x.no === latest.updatedBy); if (!n || n === latest) break; latest = n; }
    const isLatest = latest === v;
    const lines = invLines(v), sub = lines.reduce((s, l) => s + l.qty * l.price, 0), st = L.invoiceStatus(v), lg = invoiceLang();
    // Small pictures of the items sold on this invoice: the same stored thumbnail the stock list uses, nothing is copied.
    const chain = L.invoiceChain(state, v.no), dShort = (d) => new Date(d).toLocaleDateString(I.locale(I.getLang()), { day: 'numeric', month: 'short', year: 'numeric' });
    const hist = chain.length > 1 ? `<div class="hist"><h4>${t('inv.history')}</h4>${chain.slice().reverse().map((h) => `<button class="hrow ${h.no === v.no ? 'now' : ''}" data-act="inv-swap" data-id="${h.no}"><span class="hl"><b>${h.no}</b><small>${dShort(h.date)}${h.no === v.no ? ' · ' + t('inv.histNow') : ''}</small></span><span class="hr"><b>${t('inv.histPaid', { amt: money(h.amountPaid) })}</b><small class="${h.balance > 0 ? 'bad' : 'good'}">${h.balance > 0 ? t('inv.histOwes', { amt: money(h.balance) }) : t('inv.histFull')}</small></span></button>`).join('')}</div>` : '';
    const withPhoto = state.items.filter((x) => x.invoice === v.no && x.photo);
    const thumbs = withPhoto.length ? `<div class="thumbs"><h4>${t('inv.itemsOn')}</h4><div class="trow">${withPhoto.map((x) => { const d = L.photoDaysLeft(state, x, Date.now()); return `<button class="tb" data-act="edit-item" data-back="inv" data-inv="${v.no}" data-id="${x.id}" aria-label="${esc(x.desc || x.id)}"><span class="im"><img data-ph="${x.photo.id}" data-kind="thumb" alt="">${offStrip(x)}${d != null && d > 0 ? `<span class="bd">${tn('inv.daysLeft', d)}</span>` : ''}</span><span class="nm">${esc(x.desc || x.id)}</span></button>`; }).join('')}</div></div>` : '';
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${v.no}</b><small>${esc(v.client)}</small></div></div>${isLatest ? '' : `<div class="earlier"><span>${t('inv.earlier')}</span><button class="chip" data-act="inv-swap" data-id="${latest.no}">${t('inv.backLatest')}</button></div>`}<div class="seg two small" role="radiogroup" aria-label="${t('invUI.lang')}" style="margin-bottom:10px">${Object.keys(I.LANGS).map((l) => `<button class="${lg === l ? 'on' : ''}" role="radio" aria-checked="${lg === l}" data-act="inv-lang" data-id="${l}" data-no="${v.no}">${I.LANGS[l]['lang.name']}</button>`).join('')}</div>
      <div class="printable"><button class="fsbtn" data-act="inv-full" data-id="${v.no}" aria-label="${t('invd.full')}">⤢</button><div class="inv" style="--ih:${invDesign().head};--it:${invDesign().tint || 'transparent'};--ib:${invDesign().band}"><img class="inv-banner" src="${invDesignId() === 'classic' ? bannerSrc() : headerURL(invDesignId())}" alt="${ti('doc.bannerAlt')}">
      <div class="inv-body">
        <div class="inv-top"><div><div class="lbl">${ti('doc.billTo')}</div><div class="client">${esc(v.client)}</div></div>
          <div class="inv-meta"><div><span class="lbl">${ti('doc.invoiceNo')}</span><span>${v.no}</span></div><div><span class="lbl">${ti('doc.date')}</span><span>${invDate(v.date)}</span></div><div><span class="lbl">${ti('doc.due')}</span><span>${invDate(v.due)}</span></div></div></div>
        <table class="inv-t"><thead><tr><th>${ti('doc.desc')}</th><th class="r">${ti('doc.qty')}</th><th class="r">${ti('doc.price')}</th><th class="r">${ti('doc.amount')}</th></tr></thead><tbody>
          ${lines.map((l) => `<tr><td>${esc(l.desc)}</td><td class="r">${l.qty}</td><td class="r">${invMoney(l.price)}</td><td class="r">${invMoney(l.qty * l.price)}</td></tr>`).join('')}</tbody></table>
        <div class="inv-sum">${isPaidInFull(v) ? `<img class="stamp" src="${stampURL(v)}" alt="${ti('doc.stampAlt')}">` : ''}<div class="inv-tot"><div><span>${ti('doc.subtotal')}</span><b>${invMoney(sub)}</b></div><div><span>${ti('doc.delivery')}</span><b>${invMoney(v.delivery)}</b></div><div><span>${ti('doc.total')}</span><b>${invMoney(v.total)}</b></div>
          <div><span>${ti('doc.paid')}</span><b>${invMoney(v.amountPaid)}</b></div><div><span>${ti('doc.prevPaid')}</span><b>${invMoney(v.previouslyPaid)}</b></div><div class="due"><span>${ti('doc.balance')}</span><b>${invMoney(v.balance)}</b></div></div></div>
        <div class="inv-terms"><b>${ti('doc.terms')}</b><span>${ti('doc.thanks')}</span></div></div><div class="inv-foot"></div></div></div>
      <div class="muted small" style="margin-top:8px">${t('invUI.status')} <span class="pill ${st}">${invStLabel(st)}</span>${v.balance > 0 && !v.updatedBy ? ` <button class="pay-btn" data-act="pay-inv" data-id="${v.no}" data-back="inv" style="margin-left:6px">${t('pay.btn')}</button>` : ''}${v.profit ? ` · ${t('invUI.profit')} ${money(v.profit)}` : ''}${v.loss ? ` · ${t('invUI.loss')} ${money(v.loss)}` : ''}${v.tip ? ` · ${t('invUI.tip')} ${money(v.tip)}` : ''}</div>
      ${hist}${thumbs}
      <div class="b22"><button class="btn primary" data-act="share-pdf" data-id="${v.no}">${t('invUI.shareBtn')}</button><button class="btn primary" data-act="download-pdf" data-id="${v.no}">${t('invUI.download')}</button>
      ${isLatest ? `<button class="btn danger" data-act="del-inv" data-id="${v.no}">${t('invUI.delete')}</button>` : ''}<button class="btn ${isLatest ? '' : 'span2'}" data-act="close">${t('btn.close')}</button></div>`, null, true);
    const sheetInv = document.querySelector('#sheet .inv'); if (sheetInv) sheetInv.style.minHeight = Math.round(sheetInv.offsetWidth * 1.4142) + 'px';   // A4 portrait like the picture
  }

  // Draws the same invoice onto a canvas (800 x N, 2x) so it can be shared or saved as a PNG for WhatsApp etc.
  // The picture people receive: the invoice as a sheet of paper on a background, so it stands out from the chat. 'tint' = soft colour, 'shadow' = white with a shadow under the sheet, 'none' = the page alone.
  const invFrame = () => ['tint', 'shadow', 'none'].includes(state.settings.invoiceFrame) ? state.settings.invoiceFrame : 'tint';
  function framedCanvas(card, mode, S, brand) {
    const M = 56 * S, R = 26 * S, w = card.width + 2 * M, h = card.height + 2 * M, o = document.createElement('canvas'); o.width = w; o.height = h;
    const g = o.getContext('2d'), path = () => { g.beginPath(); g.moveTo(M + R, M); g.arcTo(M + card.width, M, M + card.width, M + card.height, R); g.arcTo(M + card.width, M + card.height, M, M + card.height, R); g.arcTo(M, M + card.height, M, M, R); g.arcTo(M, M, M + card.width, M, R); g.closePath(); };
    g.fillStyle = mode === 'tint' ? InvDesign.mix(brand || '#7a1f33', '#ffffff', 0.9) : '#ffffff'; g.fillRect(0, 0, w, h);
    if (mode === 'shadow') {
      g.save(); g.shadowColor = 'rgba(0,0,0,.32)'; g.shadowBlur = 48 * S; g.shadowOffsetY = 18 * S; g.fillStyle = '#fff'; path(); g.fill(); g.restore();
      g.save(); g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 10 * S; g.shadowOffsetY = 3 * S; g.fillStyle = '#fff'; path(); g.fill(); g.restore();
    }
    g.save(); path(); g.clip(); g.drawImage(card, M, M); g.restore();
    return o;
  }
  function invoiceCanvas(v, type, frame, scale, quality) {
    return new Promise((ok, fail) => {
      const img = new Image(); img.onerror = () => fail(new Error(ti('doc.loadErr')));
      img.onload = () => {
        const W = 800, S = scale || 2, lines = invLines(v), sub = lines.reduce((s, l) => s + l.qty * l.price, 0), D = invDesign(), classic = invDesignId() === 'classic';
        const bannerH = classic ? Math.round(W * img.naturalHeight / img.naturalWidth) : InvDesign.HEAD_H, rowH = 36;
        const H = Math.max(bannerH + 508 + lines.length * rowH + 62, Math.round(W * 1.4142));   // A4 portrait (1 : 1.414) like a paper invoice; longer invoices grow taller. Pink band sits right under the notes
        const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
        const x = c.getContext('2d'); x.scale(S, S);
        const F = (w, s) => { x.font = `${w} ${s}px "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif`; };
        x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
        if (classic) x.drawImage(img, 0, 0, W, bannerH); else x.drawImage(headerCanvas(invDesignId(), S), 0, 0, W, bannerH);
        const L0 = 36, R0 = W - 36; let y = bannerH + 44;
        x.textBaseline = 'alphabetic';
        F('700', 14); x.fillStyle = INV.grey; x.textAlign = 'left'; x.fillText(ti('doc.billTo'), L0, y);
        F('400', 22); x.fillStyle = '#000'; x.fillText(v.client, L0, y + 32);
        [[ti('doc.invoiceNo'), v.no], [ti('doc.date'), invDate(v.date)], [ti('doc.due'), invDate(v.due)]].forEach(([k, val], i) => {
          F('700', 13); x.fillStyle = INV.grey; x.textAlign = 'right'; x.fillText(k, R0 - 150, y + i * 26);
          F('400', 16); x.fillStyle = '#000'; x.fillText(val, R0, y + i * 26);
        });
        y += 74;
        x.fillStyle = D.head; x.fillRect(L0 - 8, y, W - 2 * (L0 - 8), 38);
        F('700', 14); x.fillStyle = '#fff'; x.textAlign = 'left'; x.fillText(ti('doc.desc'), L0, y + 25);
        x.textAlign = 'right'; x.fillText(ti('doc.qty'), R0 - 250, y + 25); x.fillText(ti('doc.price'), R0 - 130, y + 25); x.fillText(ti('doc.amount'), R0, y + 25);
        y += 38;
        lines.forEach((l, li) => {
          if (D.tint && li % 2) { x.fillStyle = D.tint; x.fillRect(L0 - 8, y, W - 2 * (L0 - 8), rowH); }
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
        x.fillStyle = D.head; x.fillRect(W - 360, y - 14, 360 - (L0 - 8), 36);
        F('700', 16); x.fillStyle = '#fff'; x.textAlign = 'right'; x.fillText(ti('doc.balance'), R0 - 130, y + 10); x.fillText(invMoney(v.balance), R0, y + 10);
        if (isPaidInFull(v)) {
          x.save(); x.globalCompositeOperation = 'multiply';
          x.drawImage(stampCanvasFor(v), W - L0 - 350, y + 34, 340, 152); x.restore();
        }
        y = H - 62;   // Terms stay at the bottom, as in the sheet; the empty space above them is where the stamp sits
        F('700', 16); x.fillStyle = '#000'; x.textAlign = 'left'; x.fillText(ti('doc.terms'), L0, y);
        F('400', 15); x.fillStyle = INV.grey; x.fillText(ti('doc.thanks'), L0, y + 26);
        x.fillStyle = D.band; x.fillRect(0, H - 26, W, 26);   // the footer bar runs edge to edge of the sheet
        const out = frame && invFrame() !== 'none' ? framedCanvas(c, invFrame(), S, Theme.brand()) : c;
        out.toBlob((b) => (b ? ok(b) : fail(new Error(ti('doc.imgErr')))), type || 'image/png', quality || 0.92);
      };
      img.src = invDesignId() === 'classic' ? bannerSrc() : 'icons/logo.png';
    });
  }
  // The PDF page is US Letter, white, with the invoice as a smaller sheet in the middle and a soft shadow so its edges show.
  function letterPage(card) {
    const pw = Math.round(card.width / 0.72), ph = Math.round(pw * 11 / 8.5), o = document.createElement('canvas'); o.width = pw; o.height = ph;
    const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, pw, ph);
    const k = Math.min(1, (0.88 * ph) / card.height), dw = Math.round(card.width * k), dh = Math.round(card.height * k), x = Math.round((pw - dw) / 2), y = Math.round((ph - dh) / 2);
    g.save(); g.shadowColor = 'rgba(0,0,0,.30)'; g.shadowBlur = pw * 0.014; g.shadowOffsetY = pw * 0.006; g.fillStyle = '#fff'; g.fillRect(x, y, dw, dh); g.restore();
    g.save(); g.shadowColor = 'rgba(0,0,0,.22)'; g.shadowBlur = pw * 0.003; g.shadowOffsetY = pw * 0.001; g.fillStyle = '#fff'; g.fillRect(x, y, dw, dh); g.restore();
    g.drawImage(card, x, y, dw, dh);
    return o;
  }
  // Share the invoice as a PDF file straight from the phone (the share sheet gets the file; nothing has to be downloaded first).
  function shareInvoicePdf(no, download) {
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    toast(t('doc.preparing'));
    invoiceCanvas(v, 'image/png', false, 2.6).then(async (blob) => {   // the sheet is drawn big (about 340 dots per inch at its printed size), then placed on a Letter page
      const card = await createImageBitmap(blob), page = letterPage(card), jpg = await new Promise((ok) => page.toBlob(ok, 'image/jpeg', 0.95));
      const pdf = Pdf.jpegToPdf(new Uint8Array(await jpg.arrayBuffer()), page.width, page.height, { w: 612, h: 792 });
      const file = new File([pdf], `${v.no} ${v.client}.pdf`, { type: 'application/pdf' });
      if (!download && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: v.no, text: ti('doc.shareText', { no: v.no, amount: invMoney(v.balance) }) }).catch((e) => { if (e && e.name !== 'AbortError') throw e; });
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      toast(download ? t('doc.saved') : t('doc.noSharePdf'));
    }).catch((e) => toast('⚠️ ' + errMsg(e)));
  }
  function shareInvoiceImage(no, saveOnly) {
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    toast(t('doc.preparing'));
    invoiceCanvas(v, 'image/png', true).then((blob) => {
      const file = new File([blob], `${v.no} ${v.client}.png`, { type: 'image/png' });
      if (!saveOnly && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: v.no, text: ti('doc.shareText', { no: v.no, amount: invMoney(v.balance) }) }).catch((e) => { if (e && e.name !== 'AbortError') throw e; });
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      toast(saveOnly ? t('doc.saved') : t('doc.noShare'));
    }).catch((e) => toast('⚠️ ' + errMsg(e)));
  }

  /* ---------- recording a later payment ---------- */
  let payInv = null;
  const parseAmt = (v) => Math.max(0, parseFloat(String(v || '').replace(',', '.')) || 0);
  function payUpdate() {
    const v = payInv, el = $('#pay-amt'); if (!v || !el) return;
    const amt = parseAmt(el.value), left = Math.round((v.balance - amt) * 100) / 100, box = $('#pay-after'), save = $('#pay-save');
    box.className = 'pm-after' + (amt > v.balance + 0.005 ? ' bad' : left <= 0.004 && amt > 0 ? '' : ' mid');
    box.innerHTML = amt <= 0 ? `<span>${t('pay.after')}</span><span>—</span>` : amt > v.balance + 0.005 ? `<span>${t('pay.tooMuch')}</span><span></span>` : `<span>${t('pay.after')}</span><span>${left <= 0.004 ? '✓ ' + t('pay.afterPaid') : t('pay.afterOwes', { amt: money(left) })}</span>`;
    save.disabled = amt <= 0 || amt > v.balance + 0.005;
  }
  function sheetPay(no) {
    const v = state.invoices.find((x) => x.no === no); if (!v || v.updatedBy || v.balance <= 0) return;
    enterPage('pay', no, () => sheetPay(no));
    payInv = v;
    const d = new Date(), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('pay.title')}</b><small>${v.no} · ${esc(v.client)}</small></div></div>
      <div class="pm-sum"><div><span>${t('pay.total')}</span><b>${money(v.total)}</b></div><div><span>${t('pay.so')}</span><b>${money(v.amountPaid + v.previouslyPaid)}</b></div><div class="o"><span>${t('pay.owes')}</span><b>${money(v.balance)}</b></div></div>
      <label for="pay-amt">${t('pay.amount')}</label><div class="pm-row"><input id="pay-amt" class="pm-in" type="text" inputmode="decimal" placeholder="0.00" autocomplete="off"><button class="btn" data-act="pay-full-amt">${t('pay.full')}</button></div>
      <label for="pay-date">${t('pay.date')}</label><input id="pay-date" type="date" value="${iso}" max="${iso}">
      <div class="pm-after mid" id="pay-after"></div>
      <div class="pm-note">${t('pay.note', { no: L.nextInvoiceNo(state), old: v.no })}</div>
      <div class="btns"><button class="btn primary" id="pay-save" data-act="pay-save" data-id="${v.no}" disabled>${t('pay.save')}</button><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`,
      () => { payInv = null; }, true);
    payUpdate();
  }

  // Edit a customer: name (changes it everywhere) and where they are from.
  function sheetCustEdit(name) {
    enterPage('custedit', name, () => sheetCustEdit(name));
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('cust.editTitle')}</b><small>${esc(name)}</small></div></div>
      <div style="height:8px"></div><label for="ce-name">${t('cust.name')}</label><input id="ce-name" value="${esc(name)}" autocomplete="off" enterkeyhint="done">
      <label for="ce-loc">📍 ${t('cust.location')}</label><input id="ce-loc" value="${esc(L.place(state, name))}" placeholder="${t('cust.placePh')}" autocomplete="off" enterkeyhint="done">
      <p class="muted small" style="margin:10px 2px">${t('cust.renameNote')}</p>
      <div class="btns"><button class="btn primary" data-act="cust-save" data-id="${esc(name)}">${t('btn.save')}</button><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, null, true);
  }

  // A customer's page: who they are to the business (not an account). Summary, then every invoice with its items; tap an invoice to see it, tap a picture to see the item.
  function sheetCustomer(name) {
    const c = L.customerStats(state).find((x) => x.name === name); if (!c) return;
    enterPage('customer', name, () => sheetCustomer(name));
    const allInvs = state.invoices.filter((v) => v.client === name), invs = L.latestInvoices(state, name).sort((x, y) => new Date(y.date) - new Date(x.date));   // one card per purchase: the newest invoice of each
    const mon = (d) => new Date(d).toLocaleDateString(I.locale(I.getLang()), { month: 'short', year: 'numeric' }), day = (d) => new Date(d).toLocaleDateString(I.locale(I.getLang()), { day: 'numeric', month: 'short' });
    const lastCap = invs.length ? t('cust.lastBought', { d: day(invs[0].date) }).replace(/^./, (ch) => ch.toUpperCase()) : '';
    const since = allInvs.length ? t('cust.since', { d: mon(allInvs.reduce((m, v) => (new Date(v.date) < new Date(m) ? v.date : m), allInvs[0].date)) }) : t('cust.noInv'), last = invs.length ? ' · ' + t('cust.lastBought', { d: day(invs[0].date) }) : '';
    const owing = c.owing > 0, card = (v) => {
      const its = state.items.filter((x) => x.invoice === v.no), st = L.invoiceStatus(v), due = v.balance > 0, pct = v.total > 0 ? Math.max(0, Math.min(100, (v.total - v.balance) / v.total * 100)) : 100;
      // One compact tile per purchase: invoice number (and PAY) on top; under it the pictures, date and items; amount and status at the right; a thin progress line when something is owing.
      const nPay = L.invoiceChain(state, v.no).length, label = its.length === 1 ? esc(its[0].desc || its[0].id) : tn('cust.itemsN', its.length || v.qty || 1);
      const shown = its.slice(0, 3), more = its.length - shown.length;
      const stack = shown.map((x, n) => `<button class="tn" style="z-index:${9 - n}" data-act="edit-item" data-id="${x.id}" aria-label="${esc(x.desc || x.id)}">${x.photo ? `<img data-ph="${x.photo.id}" data-kind="thumb" alt="">` : '<em>·</em>'}${offStrip(x)}</button>`).join('') + (more > 0 ? `<span class="more">+${more}</span>` : '');
      return `<div class="cp-inv cv2 ${due ? 'due' : ''}" data-act="view-inv" data-id="${v.no}">
        <div class="c2-top"><button class="num" data-act="view-inv" data-id="${v.no}"><b>${v.no}</b></button>${due && !v.updatedBy ? `<button class="pay-btn" data-act="pay-inv" data-id="${v.no}" data-from="${esc(name)}" data-back="cust">${t('pay.btn')}</button>` : ''}</div>
        <div class="c2-mid"><div class="c2-stack">${stack}</div><div class="c2-txt"><small>${day(v.date)}</small><b>${label}${nPay > 1 ? ' · ' + tn('cust.paymentsN', nPay) : ''}</b></div><div class="c2-r"><b>${money(v.total)}</b>${due ? `<span class="owes">${t('cust.stillOwes', { amt: money(v.balance) })}</span>` : `<span class="ok">● ${invStLabel(st)}</span>`}</div></div>
        ${due ? `<div class="c2-bar"><i style="width:${pct}%"></i></div>` : ''}</div>`;
    };
    openSheet(`<div class="cpage"><div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${esc(c.name)}</b><small>${since}</small></div><button class="fb-edit" data-act="cust-edit" data-id="${esc(name)}">${t('cust.edit')}</button></div>
      <div class="cp-hero ${owing ? 'owe' : ''}"><div class="av">${esc(c.name.trim().charAt(0).toUpperCase() || '?')}</div><div class="who"><div class="nm">${esc(c.name)}</div><small>${invs.length ? lastCap : since}</small><button class="cp-loc ${L.place(state, name) ? '' : 'none'}" data-act="cust-edit" data-id="${esc(name)}">📍 ${L.place(state, name) ? esc(L.place(state, name)) : t('cust.addPlace')}</button></div><span class="pill ${owing ? 'Owing' : 'Up'}">${owing ? t('cust.owes', { amt: money(c.owing) }) : custStLabel(c)}</span></div>
      <div class="cp-tiles"><div class="tile ${owing ? 'bad' : ''}"><small>${t('cust.owingLabel')}</small><b>${moneyBare(c.owing)}</b></div><div class="tile"><small>${t('cust.totalSales')}</small><b>${moneyBare(c.sales)}</b></div>
        <div class="tile"><small>${t('cust.itemsBought')}</small><b>${c.bought}</b>${c.itemsOwing ? `<small class="bad">${t('cust.itemsOwing', { n: c.itemsOwing })}</small>` : ''}</div><div class="tile"><small>${t('cust.profit')}</small><b>${moneyBare(c.profit)}</b></div></div>
      <h2>${t('cust.invoices')} <span class="muted" style="float:right;text-transform:none;letter-spacing:0">${invs.length}</span></h2>${invs.map(card).join('') || `<div class="muted">${t('cust.none')}</div>`}
      <p class="muted small" style="margin:10px 2px 0">${invs.length ? t('cust.tapHint') : ''}</p></div>`, null, true);
  }

  /* ---------- online store: settings, orders ---------- */
  const SCore = window.StoreCore;
  const storeCfg = () => SCore.norm(state.settings.store);
  function storeSet(patch) { const c = Object.assign(storeCfg(), patch); if (!c.id) c.id = SCore.newId(20); state.settings.store = c; save(); }
  const ago = (d) => { if (!d) return ''; const m = Math.floor((Date.now() - d.getTime()) / 60000); return m < 1 ? t('ago.now') : m < 60 ? t('ago.min', { n: m }) : m < 1440 ? t('ago.hour', { n: Math.floor(m / 60) }) : d.toLocaleDateString(I.locale(I.getLang()), { day: 'numeric', month: 'short' }); };
  function copyText(txt) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(() => true, () => false); const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* none */ } ta.remove(); return Promise.resolve(ok); }
  const swt = (act, id, on) => `<button class="tog ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="${act}" data-id="${id}"></button>`;
  function sheetStore() {
    enterPage('store', '', () => sheetStore());
    const c = storeCfg(), inf = Store.info(), link = Store.link(c), signed = cloud.signedIn;
    const cnt = (b) => ({ a: state.items.filter((i) => i.batchId === b.id && i.status === 'Available').length, t: state.items.filter((i) => i.batchId === b.id && i.status === 'In Transit').length });
    const stat = !signed ? '' : inf.error === 'permission-denied' ? `<div class="err">${t('store.needRules')}</div>` : inf.error ? `<div class="err">${t('store.pubError')}</div>` : inf.busy ? `<p class="muted small">${t('store.publishing')}</p>` : inf.at ? `<p class="muted small">${t('store.published', { n: inf.count, when: ago(new Date(inf.at)) })} · ${t(inf.sharp ? 'store.picsSharp' : 'store.picsSmall')}</p>` : '';
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('store.title')}</b><small>${t('store.sub')}</small></div></div>
      <div class="ap">${signed ? '' : `<div class="card"><div class="rw"><div class="t"><b>${t('store.needAccount')}</b><small>${t('store.needAccountSub')}</small></div><button class="pbtn" data-act="acct-open">${t('acct.signIn')}</button></div></div>`}
      ${c.id ? `<div class="link"><span>${esc(link)}</span><button data-act="store-link">${t('store.copy')}</button></div>` : `<button class="btn primary" style="width:100%" data-act="store-create" ${signed ? '' : 'disabled'}>${t('store.create')}</button>`}
      ${c.id ? stat : ''}
      ${c.id ? `<div class="card"><div class="rw"><div class="t"><b>${t('store.open')}</b><small>${t('store.openSub')}</small></div>${swt('store-toggle', 'open', c.open)}</div></div>
      <h4><span>${t('store.batches')}</span></h4><div class="card">${state.batches.map((b) => { const n = cnt(b), on = c.batches.includes(b.id); return `<button class="rw sbat" data-act="store-batch" data-id="${b.id}"><span class="ck ${on ? 'on' : ''}">${on ? '✓' : ''}</span><div class="t"><b>${bl(b.id)}</b><small>${t('store.batchCount', { a: n.a, t: n.t })}</small></div></button>`; }).join('') || `<div class="rw muted">${t('store.noBatches')}</div>`}</div>
      ${(() => { const n = SCore.shown(state, c).length; return n ? `<p class="muted small" style="margin:-2px 2px 10px">${t('store.willShow', { n })}</p>` : `<div class="err" style="margin:-2px 0 10px">${t('store.noneShown')}</div>`; })()}
      <div class="card"><div class="rw"><div class="t"><b>${t('store.transit')}</b><small>${t('store.transitSub')}</small></div>${swt('store-toggle', 'inTransit', c.inTransit)}</div></div>
      <h4><span>${t('store.locations')}</span></h4><div class="card">${c.locations.map((l) => `<button class="rw sloc" data-act="store-loc" data-id="${l.id}"><div class="t"><b>${esc(l.name)}</b><small>${[l.pickup ? t('store.pickup') + ' · ' + t('store.free') : '', l.delivery ? t('store.delivery') + ' ' + money(l.price) : ''].filter(Boolean).join(' · ')}</small></div><span class="chev">›</span></button>`).join('')}<button class="rw sloc add" data-act="store-loc" data-id="new">＋ ${t('store.addLoc')}</button></div>
      <div class="card"><div class="rw"><div class="t"><b>${t('store.name')}</b></div><input class="sfield" data-store="name" value="${esc(c.name)}" placeholder="${esc(bizName())}" autocomplete="off" enterkeyhint="done"></div><div class="rw"><div class="t"><b>${t('store.whatsapp')}</b><small>${t('store.whatsappSub')}</small></div><input class="sfield" data-store="whatsapp" inputmode="tel" value="${esc(c.whatsapp)}" placeholder="868 555 0100" autocomplete="off" enterkeyhint="done"></div></div>
      <button class="btn" style="width:100%;margin-top:6px" data-act="store-publish" ${signed ? '' : 'disabled'}>${t('store.publishNow')}</button><p class="muted small" style="margin:10px 2px">${t('store.note')}</p>` : ''}</div>`, null, true);
  }
  function sheetLocation(id) {
    const c = storeCfg(), l = c.locations.find((x) => x.id === id) || { id: '', name: '', pickup: true, delivery: true, price: 25 };
    enterPage('storeloc', id, () => sheetLocation(id));
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t(id === 'new' ? 'store.addLoc' : 'store.editLoc')}</b><small>${esc(l.name)}</small></div></div>
      <div class="ap"><label for="sl-name">${t('store.locName')}</label><input id="sl-name" value="${esc(l.name)}" placeholder="${t('store.locPh')}" autocomplete="off" enterkeyhint="done">
      <div class="card" style="margin-top:12px"><div class="rw"><div class="t"><b>${t('store.pickup')}</b><small>${t('store.pickupSub')}</small></div>${swt('sl-flag', 'pickup', l.pickup)}</div><div class="rw"><div class="t"><b>${t('store.delivery')}</b><small>${t('store.deliverySub')}</small></div>${swt('sl-flag', 'delivery', l.delivery)}</div></div>
      <label for="sl-price">${t('store.deliveryPrice')}</label><input id="sl-price" type="text" inputmode="decimal" value="${l.price || ''}" placeholder="0.00" autocomplete="off" enterkeyhint="done">
      <div class="btns"><button class="btn primary" data-act="store-loc-save" data-id="${id}">${t('btn.save')}</button>${id === 'new' ? '' : `<button class="btn danger" data-act="store-loc-del" data-id="${id}">${t('btn.delete')}</button>`}</div></div>`, null, true);
  }
  let ordFilter = 'new';
  const ordWhen = (o) => ago(Store.when(o));
  const optText = (o) => `${o.option === 'delivery' ? t('store.delivery') : t('store.pickup')} · ${esc(o.location)}`;
  const stBadge = (o) => `<span class="obadge ${o.status}">${t('ord.' + o.status)}</span>`;
  function sheetOrders() {
    enterPage('orders', '', () => sheetOrders());
    const all = Store.orders(), shown = all.filter((o) => (ordFilter === 'done' ? o.status === 'done' || o.status === 'declined' : o.status === ordFilter));
    const cnt = (f) => all.filter((o) => (f === 'done' ? o.status === 'done' || o.status === 'declined' : o.status === f)).length;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('store.orders')}</b><small>${t('ord.count', { n: all.length })}</small></div></div>
      <div class="ap"><div class="chiprow ordchips">${['new', 'confirmed', 'done'].map((f) => `<button class="chip ${ordFilter === f ? 'on' : ''}" data-act="ord-filter" data-id="${f}">${t('ord.f.' + f)} ${cnt(f)}</button>`).join('')}</div>
      ${shown.map((o) => `<button class="card ocard" data-act="order-open" data-id="${o.id}"><div class="rw" style="align-items:flex-start"><div class="t"><b>${esc(o.code || SCore.orderCode(o.id))} ${stBadge(o)}</b><small>${esc(o.name)} · ${esc(o.phone)} · ${ordWhen(o)}</small><small style="display:block;margin-top:3px">${optText(o)}</small></div><b>${money(o.total)}</b></div><div class="rw"><div class="t"><small>${tn('cust.itemsN', (o.items || []).length)}</small></div><span class="rev">${t('ord.review')} ›</span></div></button>`).join('') || `<div class="empty" style="padding:30px 0"><b>${t('ord.none')}</b>${t('ord.noneText')}</div>`}</div>`, null, true);
  }
  function sheetOrder(id) {
    const o = Store.orders().find((x) => x.id === id); if (!o) return;
    enterPage('order', id, () => sheetOrder(id));
    const rows = (o.items || []).map((i) => { const it = state.items.find((x) => x.id === i.id), gone = !it || L.isSold(it), tr = it && it.status === 'In Transit'; return `<div class="rw"><div class="t"><b>${esc(i.name)}</b><small class="${gone ? 'bad' : ''}">${gone ? t('ord.gone') : tr ? '⏳ ' + t('ord.transit') : t('ord.available')}</small></div><b>${money(i.price)}</b></div>`; }).join('');
    const msg = t('ord.waMsg', { name: o.name, code: o.code || SCore.orderCode(o.id) });
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${esc(o.code || SCore.orderCode(o.id))}</b><small>${esc(o.name)} · ${ordWhen(o)}</small></div></div>
      <div class="ap"><div class="card"><div class="rw"><div class="t"><b>${esc(o.name)}</b><small>${esc(o.phone)}</small></div><a class="pbtn wa" href="${SCore.waLink(o.phone, msg)}" target="_blank" rel="noopener">💬 WhatsApp</a><a class="gbtn wa" href="tel:${esc(SCore.digits(o.phone))}">📞</a></div><div class="rw"><div class="t"><b>${optText(o)}</b><small>${o.option === 'delivery' ? money(o.deliveryPrice) : t('store.free')}</small></div>${stBadge(o)}</div></div>
      <h4><span>${t('ord.items')}</span></h4><div class="card">${rows}<div class="rw tot"><div class="t"><b>${t('ord.total')}</b></div><b>${money(o.total)}</b></div></div>
      ${o.status === 'new' ? `<div class="btnrow"><button class="pbtn" data-act="order-confirm" data-id="${o.id}">${t('ord.confirm')}</button><button class="gbtn" data-act="order-decline" data-id="${o.id}">${t('ord.decline')}</button></div><p class="muted small" style="margin:10px 2px">${t('ord.confirmNote')}</p>`
        : o.status === 'confirmed' ? `<div class="btnrow"><button class="pbtn" data-act="order-done" data-id="${o.id}">${t('ord.markDone')}</button><button class="gbtn" data-act="order-confirm" data-id="${o.id}">${t('ord.openSell')}</button></div>` : ''}</div>`, null, true);
  }
  function confirmOrder(o) {
    const its = (o.items || []).map((i) => state.items.find((x) => x.id === i.id)).filter((it) => it && !L.isSold(it)), missing = (o.items || []).length - its.length;
    if (!its.length) return toast(t('ord.noneLeft'));
    its.forEach((it) => selected.add(it.id)); invForm.client = o.name; invForm.paying = '';
    if (o.option === 'delivery' && o.deliveryPrice > 0) its[0].delivery = o.deliveryPrice;
    save(); if (o.status === 'new') Store.setStatus(o.id, 'confirmed').catch(() => toast(t('store.pubError')));
    closeSheet(); go({ tab: 'sell', moreView: null }); window.scrollTo(0, 0); render(); toast(missing ? t('ord.someGone', { n: missing }) : t('ord.opened'));
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
      <p class="note">${t('photo.backupNote')}</p>
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
    if (comboOpen && !e.target.closest('#combo')) { comboOpen = false; const pop = $('#combopop'); if (pop) pop.hidden = true; const ar = document.querySelector('.combo-btn i'); if (ar) ar.textContent = '▾'; }
    const t_ = e.target.closest('[data-tab],[data-act]'); if (!t_) return;
    if (t_.dataset.tab) { themeDraft = null; if (!$('#sheet').hidden) closeSheet(); go({ tab: t_.dataset.tab, moreView: null }); window.scrollTo(0, 0); return render(); }
    const id = t_.dataset.id;
    if (/^(photo|ed|viewer)-/.test(t_.dataset.act || '')) return PUI.act(t_.dataset.act, id, t_);
    switch (t_.dataset.act) {
      case 'close': return pageBack();
      case 'view': hideAmounts = !hideAmounts; setPref('hideAmounts', hideAmounts); return render();
      case 'set-theme': theme = id; setPref('theme', theme); applyTheme(); closeSheet(); return render();
      case 'set-lang': I.setLang(id, true); applyStaticText(); closeSheet(); return render();
      case 'inv-swap': return sheetInvoice(id, true);
      case 'inv-lang': invLangSession = id; return sheetInvoice(t_.dataset.no);
      case 'install':
        if (installEvt) { const ev = installEvt; installEvt = null; render(); ev.prompt(); return ev.userChoice.then((r) => { if (r.outcome === 'accepted') setPref('installed', true); }).catch(() => {}); }
        return sheetInstallHelp();
      case 'install-guide': if (installEvt) { const ev = installEvt; installEvt = null; ev.prompt(); return ev.userChoice.then((r) => { if (r.outcome === 'accepted') setPref('installed', true); render(); }).catch(() => {}); } return sheetInstallHelp();
      case 'copy-link': return (navigator.clipboard ? navigator.clipboard.writeText(location.href.split('#')[0]) : Promise.reject()).then(() => toast(t('toast.linkCopied')), () => toast(t('toast.copyManual')));
      case 'install-dismiss': setPref('installDismissed', Date.now()); return render();
      case 'gate-lang': I.setLang(id, true); applyStaticText(); regate(); return;
      case 'gate-create': gateMode = 'create'; gateView = null; gateView = 'auth'; $('#gate').innerHTML = gateHTML('auth'); return;
      case 'gate-have': gateMode = 'in'; gateView = 'auth'; $('#gate').innerHTML = gateHTML('auth'); return;
      case 'gate-back': if (gateForced) { gateForced = false; updateGate(); return; } gateView = 'welcome'; $('#gate').innerHTML = gateHTML('welcome'); return;
      case 'gate-tab': gateMode = id; $('#gate').innerHTML = gateHTML('auth'); return;
      case 'gate-skip': setPref('gateSkipped', true); return updateGate();
      case 'gate-google': return Cloud.signInGoogle().then(() => toast(t('acct.signedIn')), (e) => gateErr(acctErr(e)));
      case 'gate-forgot': { const em = ($('#f-gate [name=email]') || {}).value; if (!em) return gateErr(t('acct.needEmail')); return Cloud.reset(em).then(() => gateErr(t('acct.resetSent', { email: em })), (e) => gateErr(acctErr(e))); }
      case 'gate-color': gateDraft.palette = id; regate(); return;
      case 'acct-open': if (cloud.signedIn) return sheetAccount(); closeSheet(); gateForced = true; gateMode = hasData() ? 'in' : 'create'; gateView = null; updateGate(); return;
      case 'signin-dismiss': setPref('signinDismissed', Date.now()); return render();
      case 'acct-google': return acctDone(Cloud.signInGoogle());
      case 'acct-forgot': { const em = ($('#f-acct [name=email]') || {}).value; if (!em) return acctShow(t('acct.needEmail')); return Cloud.reset(em).then(() => acctShow(t('acct.resetSent', { email: em })), (e) => acctShow(acctErr(e))); }
      case 'acct-out': return Cloud.signOut().then(() => { closeSheet(); toast(t('acct.signedOut')); });
      case 'conflict': { const f = window.__conflict; if (f) f(id); closeSheet(); return; }          // answer first: closing the pop-up counts as 'cancel'
      case 'download': return sheetDownload();
      case 'filter': return sheetFilter();
      case 'settings':
        closeSheet();
        if (isSettings()) { themeDraft = null; while (places.length > 1 && isSettings()) placeBack(); if (isSettings()) go({ tab: 'home', moreView: null }); }   // the gear closes Settings again: back to where you were
        else go({ tab: 'more', moreView: 'settings' });
        window.scrollTo(0, 0); return render();
      case 'pick-lang': return sheetChoice(t('set.language'), 'set-lang', I.getLang(), Object.keys(I.LANGS).map((l) => [l, I.LANGS[l]['lang.name']]));
      case 'pick-appearance': return sheetChoice(t('set.appearance'), 'set-theme', theme, [['light', t('set.light')], ['dark', t('set.dark')], ['auto', t('set.auto')]]);
      case 'share-lang': { const f = window.__shareLang; if (f) f(id); closeSheet(); return; }     // answer first: closing the pop-up counts as 'cancel'
      case 'pick-custlang': return sheetChoice(t('set.custLang'), 'set-custlang', custMode(), [...Object.keys(I.LANGS).map((l) => [l, I.LANGS[l]['lang.name']]), ['app', t('cust.same')], ['ask', t('cust.ask')]], t('cust.note'));
      case 'pick-keep': return sheetChoice(t('set.keepRow'), 'set-keep', photoKeep(), ['1', '2', '7', 'sold'].map((k) => [k, t('keep.' + k)]), t('keep.note'));
      case 'set-keep': state.settings.photoKeep = id; save(); closeSheet(); PUI.sweep(photoKeep()); return render();
      case 'pay-inv': return sheetPay(id);
      case 'pay-full-amt': { if (payInv) { $('#pay-amt').value = String(payInv.balance); payUpdate(); } return; }
      case 'pay-save': {
        const amt = parseAmt($('#pay-amt').value), dv = $('#pay-date').value, date = dv ? new Date(dv + 'T12:00:00') : new Date();
        try { const inv = L.recordPayment(state, id, amt, date); save(); tidyPhotos(); toast(t('pay.saved', { no: inv.no })); pageStack = pageStack.filter((p) => p.key !== 'pay|' + id && p.key !== 'invoice|' + id); render(); return sheetInvoice(inv.no); } catch (e) { return toast('⚠️ ' + errMsg(e)); }
      }
      case 'free-thumbs': { const n = Number(t_.dataset.n) || 0; if (!confirm(t('about.thumbsAsk', { n, mb: t_.dataset.mb }))) return; return PUI.removeOldThumbs().then((r) => { toast(t('about.freed', { mb: fmtBytes(r.bytes) })); fillAbout(); }); }
      case 'free-space': { const n = Number(t_.dataset.n) || 0; if (!confirm(t('about.freeAsk', { n, mb: t_.dataset.mb }))) return; return PUI.freeOriginals().then((r) => { toast(t('about.freed', { mb: fmtBytes(r.bytes) })); fillAbout(); }); }
      case 'set-custlang': setPref('custLang', id); closeSheet(); return render();
      case 'check-update': return checkUpdate();
      case 'check-rules': return checkRules();
      case 'draft-palette': themeDraft = id; return render();
      case 'apply-palette': if (!themeDraft) return; state.settings.palette = themeDraft; Theme.apply(themeDraft); themeDraft = null; applyTheme(); save(); toast(t('set.applied')); return render();
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
      case 'item-go': if (id) { sheetItem(id, true); $('#sheet').scrollTop = 0; } return;
      case 'qe-open': { const ids = batchIds(id, true); if (!ids.length) return toast(t('qe.none')); return sheetQuick(id, ids[0]); }
      case 'qe-go': if (id) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); const it = state.items.find((x) => x.id === id); if (it) { sheetQuick(it.batchId, id, true); $('#sheet').scrollTop = 0; } } return;
      case 'qe-next': return quickNext(id, !!t_.dataset.skip);
      case 'open-stock': stockBatch = id; stockFilter = 'All'; closeSheet(); go({ tab: 'stock', moreView: null }); return render();
      case 'goto-stock': go({ tab: 'stock', moreView: null }); return render();
      case 'goto-sell': go({ tab: 'sell', moreView: null }); window.scrollTo(0, 0); return render();
      case 'pick-batch': stockBatch = id; return render();
      case 'pick-filter': stockFilter = id; return render();
      case 'edit-item': return sheetItem(id);
      case 'toggle-sale': { const it = state.items.find((x) => x.id === id); if (!it) return; if (L.isSold(it)) return toast(t('item.lockedToast')); it.saleOn = !it.saleOn; save(); return refreshSaleBlock(it); }
      case 'sale-pct': { const it = state.items.find((x) => x.id === id); if (!it) return; if (L.isSold(it)) return toast(t('item.lockedToast')); it.saleOn = true; it.discount = Number(t_.dataset.v); save(); return refreshSaleBlock(it); }
      case 'sale-other': { const f = $('#sheet [data-f=discount]'); if (f) { f.focus(); f.select(); } return; }
      case 'use-rec': { const it = state.items.find((x) => x.id === id); if (!it) return; if (L.isSold(it)) return toast(t('item.lockedToast')); const c = L.itemCalc(batchOf(it), it); if (!c.recommended) return toast(t('item.noRec')); it.price = c.recommended; save(); const f = $('#sheet [data-f=price]'); if (f) f.value = c.recommended; return updateSale(it); }
      case 'unselect': selected.delete(id); return render();
      case 'select-close': { const it = state.items.find((x) => x.id === id); if (it && L.isSold(it)) return toast(t('item.lockedToast')); if (it) { L.prefillSold(it); save(); } selected.add(id); closeSheet(); } return toast(t('item.added'));
      case 'unselect-close': selected.delete(id); closeSheet(); return;
      case 'store-link': { const c = storeCfg(); if (!c.id) return sheetStore(); return copyText(Store.link(c)).then((ok) => toast(ok ? t('store.copied') : Store.link(c))); }
      case 'store-open': return sheetStore();
      case 'store-create': storeSet({}); Store.publish(true); return sheetStore();
      case 'store-toggle': { const c = storeCfg(); storeSet({ [id]: !c[id] }); return sheetStore(); }
      case 'store-batch': { const c = storeCfg(); storeSet({ batches: c.batches.includes(id) ? c.batches.filter((x) => x !== id) : c.batches.concat(id) }); return sheetStore(); }
      case 'store-publish': toast(t('store.publishing')); Store.publish(true).then(() => { const inf = Store.info(); toast(inf.error === 'permission-denied' ? t('store.needRules') : inf.error ? t('store.pubError') : t('store.donePub', { n: inf.count })); }); return;
      case 'store-loc': return sheetLocation(id);
      case 'sl-flag': { const on = !t_.classList.contains('on'); t_.classList.toggle('on', on); t_.setAttribute('aria-checked', on); return; }
      case 'store-loc-save': {
        const name = L.cleanName($('#sl-name').value), pickup = $('[data-act=sl-flag][data-id=pickup]').classList.contains('on'), delivery = $('[data-act=sl-flag][data-id=delivery]').classList.contains('on'), price = Math.max(0, parseFloat(String($('#sl-price').value).replace(',', '.')) || 0);
        if (!name) return toast(t('store.needLocName')); if (!pickup && !delivery) return toast(t('store.needOption'));
        const c = storeCfg(), loc = { id: id === 'new' ? SCore.newId(8) : id, name, pickup, delivery, price };
        storeSet({ locations: id === 'new' ? c.locations.concat(loc) : c.locations.map((l) => (l.id === id ? loc : l)) }); pageStack = pageStack.filter((p) => p.key !== 'storeloc|' + id); return dropPages('storeloc|' + id);
      }
      case 'store-loc-del': { const c = storeCfg(); storeSet({ locations: c.locations.filter((l) => l.id !== id) }); return dropPages('storeloc|' + id); }
      case 'orders-open': { const c = storeCfg(); if (!c.id) return sheetStore(); return sheetOrders(); }
      case 'ord-filter': ordFilter = id; return sheetOrders();
      case 'order-open': return sheetOrder(id);
      case 'order-confirm': { const o = Store.orders().find((x) => x.id === id); return o && confirmOrder(o); }
      case 'order-decline': if (confirm(t('ord.declineAsk'))) Store.setStatus(id, 'declined').then(() => { toast(t('ord.declined')); dropPages('order|' + id); }).catch(() => toast(t('store.pubError'))); return;
      case 'order-done': Store.setStatus(id, 'done').then(() => { toast(t('ord.done')); dropPages('order|' + id); }).catch(() => toast(t('store.pubError'))); return;
      case 'pick-client': invForm.client = id; comboOpen = false; return render();
      case 'combo-toggle': comboOpen = !comboOpen; render(); if (comboOpen) { const f = $('#client'); if (f) f.focus(); } return;
      case 'combo-new': comboOpen = false; return render();
      case 'pay-full': { const p = preview(); invForm.paying = String(Math.max(0, L.r2(p.total - p.prev))); return render(); }
      case 'make-invoice': return run(() => L.createInvoice(state, { itemIds: [...selected], client: invForm.client, paying: invForm.paying }), (inv) => {
        selected = new Set(); invForm = { client: '', paying: '' }; setTimeout(() => sheetInvoice(inv.no), 0); return t('inv.created', { no: inv.no, amount: money(inv.balance) }); });
      case 'customer': return sheetCustomer(id);
      case 'cust-edit': return sheetCustEdit(id);
      case 'cust-save': {
        const to = $('#ce-name').value, loc = $('#ce-loc').value;
        try {
          if (L.cleanName(to).toLowerCase() !== id.toLowerCase() && L.otherCustomerNamed(state, id, to) && !confirm(t('cust.mergeAsk', { name: L.canonicalName(state, to), old: id }))) return;
          const final = L.renameCustomer(state, id, to); L.setPlace(state, final, loc); save(); tidyPhotos();
          pageStack = pageStack.filter((p) => p.key !== 'custedit|' + id && p.key !== 'customer|' + id); toast(t('cust.saved')); render(); return sheetCustomer(final);
        } catch (e) { return toast('⚠️ ' + errMsg(e)); }
      }
      case 'view-inv': return sheetInvoice(id);
      case 'return-inv': { const n = state.items.filter((x) => x.invoice === id).length; if (confirm(t('item.returnAsk', { no: id, n }))) { closeSheet(); run(() => L.deleteInvoice(state, id), t('item.returned')); } return; }
      case 'return-item': if (confirm(t('item.returnItemAsk', { id }))) { closeSheet(); run(() => L.returnItem(state, id), t('item.returned')); } return;
      case 'del-inv': if (confirm(t('confirm.delInv', { id }))) { try { L.deleteInvoice(state, id); save(); tidyPhotos(); toast(t('inv.deleted', { id })); } catch (e) { return toast('⚠️ ' + errMsg(e)); } dropPages('invoice|' + id); render(); } return;
      case 'print': return window.print();
      case 'share-img': return shareInvoiceImage(id, false);
      case 'share-pdf': return shareInvoicePdf(id, false);
      case 'download-pdf': return shareInvoicePdf(id, true);
      case 'save-img': return shareInvoiceImage(id, true);
      case 'inv-full': case 'inv-design-view': {
        const real = state.invoices.find((x) => x.no === id), d = new Date();
        const sample = { no: 'INV00001', client: ti('doc.sampleClient'), date: d.toISOString(), due: new Date(d.getTime() + 6048e5).toISOString(), lines: [{ desc: ti('doc.sampleItem'), qty: 1, price: 250 }], delivery: 0, total: 250, amountPaid: 250, previouslyPaid: 0, balance: 0 };
        const inv = real || state.invoices[state.invoices.length - 1] || sample;
        designOverride = t_.dataset.act === 'inv-design-view' ? id : null; toast(t('doc.preparing'));
        return invoiceCanvas(inv, 'image/png', true).then((blob) => PUI.openViewer(URL.createObjectURL(blob))).catch((e) => toast('⚠️ ' + errMsg(e))).finally(() => { designOverride = null; });
      }
      case 'inv-frame': state.settings.invoiceFrame = id; save(); return render();
      case 'invfs-open': return openInvEditor();
      case 'invfs-close': return closeInvEditor();
      case 'invfs-pick': state.settings.invoiceDesign = id; save(); invFsChips(); invFsControls(); invFsPreview(); return;
      case 'invfs-theme': setInvStyle({ color: null, light: 0 }); invFsControls(); invFsPreview(); return;
      case 'inv-color': setInvStyle({ color: id || null }); return render();
      case 'inv-reset': { const m = Object.assign({}, state.settings.invoiceStyle); delete m[invDesignId()]; state.settings.invoiceStyle = m; save(); if (invFsOn) { invFsControls(); invFsPreview(); } return render(); }
      case 'inv-design': state.settings.invoiceDesign = id; save(); toast(t('invd.saved')); return render();
      case 'more': go({ tab: 'more', moreView: id }); window.scrollTo(0, 0); return render();
      case 'import-xlsx': return pickFile('.xlsx,.xls', importXlsx);
      case 'import-json': return pickFile('.json,application/json', importJson);
      case 'export-json': return download('buy-sell-backup.json', JSON.stringify(state, null, 2));
      case 'reset': if (confirm(t('confirm.reset1')) && confirm(t('confirm.reset2'))) { state = L.defaultState(); selected = new Set(); run(() => 0, t('toast.cleared')); } return;
    }
  });
  $('#back').addEventListener('click', () => { themeDraft = null; if (!placeBack()) go({ tab: 'home', moreView: null }); render(); });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f));
    if (f.id === 'f-gate') { gateErr(''); const em = d.email.trim(); return (gateMode === 'create' ? Cloud.signUp(em, d.password) : Cloud.signIn(em, d.password)).then(() => toast(t('acct.signedIn')), (e) => gateErr(acctErr(e))); }
    if (f.id === 'f-setup') { const name = (d.biz || '').trim(); if (!name) return gateErr(t('gate.bizNeed')); state.settings.businessName = /^b-?ruiz$/i.test(name) ? '' : name; state.settings.palette = gateDraft.palette || Theme.current(); Theme.apply(state.settings.palette); applyTheme(); state.settings.setupDone = true; save(); gateView = null; updateGate(); return render(); }
    if (f.id === 'f-acct') { acctShow(t('acct.working')); const em = d.email.trim(); return acctDone(d.mode === 'up' ? Cloud.signUp(em, d.password) : Cloud.signIn(em, d.password)); }
    if (f.id === 'f-batch') { const b = run(() => L.createBatch(state, d), (x) => t('batch.created', { id: bl(x.id) })); if (b) { stockBatch = b.id; stockFilter = 'All'; } }
    if (f.id === 'f-clear') run(() => L.payClearing(state, d.batch, d.amount), t('clear.recorded', { id: bl(d.batch) }));
    if (f.id === 'f-receive') run(() => L.makeAvailable(state, d.batch), (n) => t('recv.done', { id: bl(d.batch), n }));
    if (f.id === 'f-settings') run(() => {
      Object.assign(state.settings, { businessName: /^b-?ruiz$/i.test((d.businessName || '').trim()) ? '' : (d.businessName || '').trim(), bizCity: (d.bizCity || '').trim(), bizPhone: (d.bizPhone || '').trim(), bizEmail: (d.bizEmail || '').trim(), year: +d.year || state.settings.year, markup: +d.markup || 1, defaultMargin: d.defaultMargin === '' ? 100 : +d.defaultMargin });
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
      const i = state.items.find((x) => x.id === $('#sheet').dataset.item), f = el.dataset.f; if (L.isSold(i)) return;
      if (f === 'discount') { i.discount = parsePct(el.value); el.value = i.discount ? i.discount + '%' : ''; save(); return refreshSaleBlock(i); }   // "50" becomes "50%"
      i[f] = NUM_FIELDS.includes(f) ? Math.max(0, parseFloat(String(el.value).replace(',', '.')) || 0) : el.value;
      save(); updateSale(i);
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.invfs) { invFsHsv.v = Number(el.value) / 100; drawWheel($('#invwheel'), invFsHsv.v); invFsApply(); return; }
    if (el.dataset.store) { storeSet({ [el.dataset.store]: el.value }); return; }
    if (el.id === 'pay-amt') { payUpdate(); return; }
    if (el.dataset.place !== undefined) { L.setPlace(state, el.dataset.place, el.value); save(); return; }
    if (el.dataset.inv) { if (invFsOn) invFsPreview(); setInvStyle({ [el.dataset.inv]: el.dataset.inv === 'color' ? el.value : Number(el.value) }); const g = $('#dsgrid'); if (g) g.innerHTML = invCards(); return; }
    if (el.id === 'client' || el.id === 'paying') { invForm[el.name] = el.value; $('#prev').innerHTML = previewBox(); renderActionBar(); if (el.id === 'client') { const l = $('#combolist'); if (l) l.innerHTML = chipRows(el.value); const bt = document.querySelector('.combo-btn span'); if (bt) bt.textContent = L.cleanName(el.value) || t('sell.customerPick'); } }
    else if (el.id === 'q') $('#custlist').innerHTML = custRows(L.customerStats(state), el.value);
    else if (el.dataset.f && $('#sheet').dataset.item) {
      const i = state.items.find((x) => x.id === $('#sheet').dataset.item), f = el.dataset.f;
      if (f === 'discount') { i.discount = parsePct(el.value); updateSale(i); }
      else if (NUM_FIELDS.includes(f)) { i[f] = Math.max(0, parseFloat(String(el.value).replace(',', '.')) || 0); updateSale(i); } else { i[f] = el.value; }
      save();
    } else if (el.form && el.form.id === 'f-batch') {
      const f = el.form, r = L.effectiveRate(state, f.currency.value), c = parseFloat(String(f.totalCost.value).replace(',', '.')) || 0;
      $('#rate-hint').innerHTML = t('batch.rateHint', { rate: r.toFixed(4), amount: money(c * r) });
    }
  });
  // Enter in a field closes the keyboard and leaves the cursor and the scroll where they were (it never jumps to the next field).
  const plainField = (el) => el && el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|file)$/.test(el.type) && !el.form;
  // Tell the phone's keyboard to show a Done key (not Next) BEFORE a field is focused: every field gets enterkeyhint="done" as soon as it appears.
  const hintDone = (root) => { (root.querySelectorAll ? root.querySelectorAll('input:not([enterkeyhint]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit])') : []).forEach((el) => { if (!el.form) el.setAttribute('enterkeyhint', 'done'); }); if (root.matches && root.matches('input:not([enterkeyhint])') && !root.form) root.setAttribute('enterkeyhint', 'done'); };
  hintDone(document);
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) hintDone(n); }))).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && plainField(e.target) && !e.shiftKey) {                  // Tab = the phone's Next key, if it still shows one
      e.preventDefault(); const sh = $('#sheet'), inSheet = !sh.hidden && sh.contains(e.target), pos = inSheet ? sh.scrollTop : window.scrollY;
      e.target.blur();
      const restore = () => { if (inSheet) sh.scrollTop = pos; else window.scrollTo(0, pos); };
      [0, 80, 200, 400].forEach((ms) => setTimeout(restore, ms));   // the keyboard takes a moment to close and the screen resizes
      return;
    }
    if (e.key === 'Escape') { if (PUI.isOpen()) PUI.back(); else closeSheet(); } });

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
      state = imp; selected = new Set(); stockBatch = null; tab = 'home'; moreView = null; places = [{ tab: 'home', moreView: null }]; save();
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
  const depth = () => (places.length - 1) + ($('#sheet').hidden ? 0 : Math.max(1, pageStack.length)) + PUI.layers();
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
    if (PUI.isOpen()) PUI.back();
    else if (!$('#sheet').hidden) pageBack();
    else if (places.length > 1) { themeDraft = null; placeBack(); }
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

  const debounce = (fn, ms) => { let h; return () => { clearTimeout(h); h = setTimeout(fn, ms); }; };
  const photoKeep = () => ['1', '2', '7', 'sold'].includes(state.settings.photoKeep) ? state.settings.photoKeep : '2';   // how long an original screenshot stays after the photo is saved
  const tidyPhotos = debounce(() => { PUI.cleanup(); PUI.sweep(photoKeep()); }, 2500);
  Store.init({ state: () => state, bizName, refresh: () => { const top = pageStack[pageStack.length - 1]; if (top && top.key === 'store' && !$('#sheet').hidden) { const sc = $('#sheet').scrollTop; reopening = true; try { top.open(); } finally { reopening = false; } $('#sheet').scrollTop = sc; } },
    onOrders: () => { const top = pageStack[pageStack.length - 1]; if (!$('#sheet').hidden && top && (top.key === 'orders' || top.key.startsWith('order|'))) { reopening = true; try { top.open(); } finally { reopening = false; } } else if ($('#sheet').hidden && tab === 'sell') render(); } });
  PUI.init({ state: () => state, save, render, toast, esc, bl, openSheet, closeSheet, confirm: (m) => window.confirm(m), sync: () => syncHistory(), invMoney: (n) => invMoney(n), invoiceLang: () => invoiceLang(), shareLang, tagHTML });
  Cloud.init({
    getState: () => state,
    askConflict,
    onStatus: (i) => { const was = cloud.signedIn; cloud = i; if (i.status === 'synced' && window.Store) { Store.schedule(); Store.listen(); } else if (!i.signedIn && window.Store) Store.stopListen(); updateGate(); const el = $('#acct-st'); if (el && was === i.signedIn) { el.textContent = acctStatus(); el.parentNode.className = i.status === 'synced' ? 'good' : /error|rules|unavailable/.test(i.status) ? 'bad' : ''; } else if (tab === 'home' || (tab === 'more' && moreView === 'settings')) render(); },
    onRemote: () => { L.migrate(state); updateGate(); if (state.settings.palette) { Theme.apply(state.settings.palette); applyTheme(); } try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } const a = document.activeElement; if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && $('#view').contains(a)) return setTimeout(render, 2000); render(); },
  });
  save();   // write back anything repaired while loading (e.g. names with stray spaces)
  applyStaticText();
  if (state.settings.palette) Theme.apply(state.settings.palette);
  applyTheme();
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  render();
  setTimeout(() => PUI.sweep(photoKeep()), 3000);   // timers on screenshots and on sold items' photos run when the app opens
})();

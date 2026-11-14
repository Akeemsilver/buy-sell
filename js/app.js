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
  const signed = (n) => (n < 0 ? '−' + money(-n) : money(n));   // −TT$ 300.00
  const cur$ = (c) => (c === 'USD' ? 'US$' : c);   // US$ 50.00, like TT$ 347.47; other currencies keep their code in front
  const money = (n) => `<span class="amt">${moneyText(n)}</span>`;   // wrapped so the eye button can blur amounts
  const plain = (html) => String(html).replace(/<[^>]+>/g, '');
  const day = (d) => (d ? new Date(d).toLocaleDateString(I.locale(), { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const bizName = () => state.settings.businessName || 'B-RUIZ';
  const initials = (n) => String(n).trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase() || '·';
  // Versions shown in Settings > About. APP_VERSION goes up by 0.01 with each release; RULES_VERSION must match the header of firestore.rules (a test checks).
  const APP_VERSION = '1.00', RULES_VERSION = '1.07', CLOUD_LIMIT = 1073741824;
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
    bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    dots: '<circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
    download: '<path d="M12 4v11"/><path d="M7.5 11 12 15.5 16.5 11"/><path d="M5 19.5h14"/>',
    filter: '<path d="M3.5 5h17l-6.5 8v6l-4 2v-8z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    stock: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    sell: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9v10h16V9"/><path d="M4 9a3 3 0 0 0 5.3 1.8A3 3 0 0 0 12 12a3 3 0 0 0 2.7-1.2A3 3 0 0 0 20 9"/><path d="M10 19v-5h4v5"/>',
    promote: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.5 6.5a8 8 0 0 1 0 11"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3.5 2.8 3.5 6"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  };
  const TABS = ['home', 'stock', 'sell', 'promote', 'more'];   // Customers moved into More; the Customer log page still works as an internal tab 'people'

  const PUI = window.PhotoUI;
  let state = load();
  let tab = 'home', moreView = null, homeAfterSignIn = false;   // set when someone signs in on purpose: they land on Home, not wherever they were
  /* ---------- Back works like on an Android phone: it returns to the place you came from, and never loops ----------
     places: the screens you moved through (tabs, More and Settings screens). pageStack: full-screen pages opened one from another
     (customer -> invoice -> item ...). Going to a place or page that is already in its stack cuts the stack back to it, so Back never
     bounces between two screens. */
  let places = [{ tab: 'home', moreView: null }], pageStack = [], reopening = false;
  const placeKey = (p) => p.tab + '|' + (p.moreView || '');
  try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }   // the browser must not jump the page to the top itself when the app goes Back
  let restoreY = null;   // Back returns to the scroll position the page you came from had
  function go(next) {
    if (places.length) places[places.length - 1].y = window.scrollY;
    const i = places.findIndex((p) => placeKey(p) === placeKey(next));
    if (i >= 0) places.length = i + 1; else places.push({ tab: next.tab, moreView: next.moreView || null });
    tab = next.tab; moreView = next.moreView || null;
  }
  function placeBack() {
    if (places.length < 2) return false;
    places.pop(); const p = places[places.length - 1]; tab = p.tab; moreView = p.moreView; restoreY = p.y || 0; return true;
  }
  // Coming back to a page opens it again from the top, so each page remembers how far it was scrolled when you left it.
  function updStrip() { const sh = $('#sheet'), bar = sh && sh.querySelector('.stk'), tr = sh && sh.querySelector('.fstep'), fb = sh && sh.querySelector('.fullbar'); if (!bar || !tr || !fb) return; const gone = tr.getBoundingClientRect().bottom < fb.getBoundingClientRect().bottom + 4; if (bar.hidden === gone) { bar.hidden = !gone; bar.setAttribute('aria-hidden', String(!gone)); } }
  document.addEventListener('DOMContentLoaded', () => { const sh = $('#sheet'); if (sh) sh.addEventListener('scroll', updStrip, { passive: true }); });
  function restoreSheetY(y) { if (!y) return; const sh = $('#sheet'), go = () => { sh.scrollTop = y; updStrip(); }; go(); requestAnimationFrame(go); setTimeout(go, 150); }
  function enterPage(kind, arg, open, swap) {   // every full-screen page calls this when it opens. swap: replace the page on top (no new step on the Back trail)
    if (reopening) return;
    if (!swap) { const cur = pageStack[pageStack.length - 1], sh = $('#sheet'); if (cur && !sh.hidden && !sh.classList.contains('small')) cur.y = sh.scrollTop; }
    const key = kind + '|' + arg;
    if (swap && pageStack.length) { pageStack[pageStack.length - 1] = { key, open }; return; }
    const i = pageStack.findIndex((p) => p.key === key);
    if (i >= 0) pageStack.length = i;
    pageStack.push({ key, open });
  }
  function pageBack() {   // one step back from a full-screen page: the page it was opened from, or close
    if ($('#sheet').classList.contains('small')) return closeSheet();   // a pop-up on top: just dismiss it
    if (pageStack.length > 1) { pageStack.pop(); const prev = pageStack[pageStack.length - 1]; reopening = true; try { prev.open(); } finally { reopening = false; } render(); restoreSheetY(prev.y); }
    else closeSheet();
  }
  function dropPages(key) {   // forget pages that no longer exist (e.g. a deleted invoice), then show the one now on top
    pageStack = pageStack.filter((p) => p.key !== key);
    if (!pageStack.length) return closeSheet();
    reopening = true; try { pageStack[pageStack.length - 1].open(); } finally { reopening = false; } render(); restoreSheetY(pageStack[pageStack.length - 1].y);
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
    return `<div class="install"><img src="icons/icon-192.png" alt="" width="44" height="44">
      <div class="grow"><b>${t('install.title')}</b><small>${installEvt ? t('install.sub.prompt') : t('install.sub.add')}</small></div>
      <button class="pill-btn solid" data-act="install">${installEvt ? t('install.btn') : t('install.how')}</button></div>`;
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (tab === 'home') render(); });
  window.addEventListener('appinstalled', () => { installEvt = null; toast(t('install.done')); render(); });

  /* ---------- account (Firebase sign-in, cloud copy) ---------- */

  let cloud = { status: 'loading', error: '', email: '', signedIn: false, uid: '' };
  // Team: my rank in the shared business and what that rank may do (kept on the phone so the app knows it before the cloud answers)
  let team = null, joinReqs = [], reqErr = '';
  const teamCache = () => { try { const c = JSON.parse(localStorage.getItem('buy-sell-team')); return c && (!cloud.uid || c.uid === cloud.uid) ? c : null; } catch (e) { return null; } };
  const myRank = () => { if (team) return team.rank; const c = teamCache(); if (c) return c.rank; return cloud.signedIn && cloud.status !== 'signedOut' && !(state.settings.setupDone || hasData()) ? 'seller' : 'owner'; };   // alone on this phone, or an existing business that has not heard from the cloud yet: everything; a brand-new person who has not been placed yet: the lowest rank
  const teamPerms = () => (team ? team.perms : (teamCache() || {}).perms) || null;
  const can = (cap) => Team.can(teamPerms(), myRank(), cap);
  const myName = () => (team && team.names && team.names[cloud.uid]) || (cloud.email || '').split('@')[0];
  /* ---------- customers as people: a name, a number, nicknames and old numbers ---------- */
  const PE = window.People;
  let peopleOn = false;   // switched on once the customers have profiles (when signed in: after the cloud copy has arrived)
  const peopleBlocked = () => (state.peopleV || 0) > PE.V;   // the cloud holds a newer shape than this app knows: customers are read-only until the app updates
  const rankName = (r) => t('rank.' + r);
  // Turn the customer profiles on: once, on the owner's phone, after the cloud copy has arrived, and only after a backup is kept.
  function peopleCheck() {
    if (peopleOn || !window.People) return;
    if (peopleBlocked()) return;
    if (Array.isArray(state.people)) { peopleOn = true; return; }
    if (cloud.status === 'loading' || (cloud.signedIn && cloud.status !== 'synced') || myRank() !== 'owner' || !hasData()) return;
    const snap = JSON.stringify({ at: new Date().toISOString(), state });
    let kept = false; try { localStorage.setItem('buy-sell-backup-before-people', snap); kept = true; } catch (e) { /* too big for the phone's storage: give a file instead */ }
    if (!kept) { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([snap], { type: 'application/json' })); a.download = 'shopivo-backup-before-customers.json'; document.body.appendChild(a); a.click(); a.remove(); kept = true; } catch (e) { /* none */ } }
    if (!kept) return;
    try { PE.ensure(state); peopleOn = true; save(); setTimeout(() => toast(t('people.ready')), 600); } catch (e) { state.people = undefined; delete state.people; delete state.decisions; peopleOn = false; }
  }
  const sharedBusiness = () => !!(team && Object.keys(team.members || {}).length > 1);
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
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const lastEmail = () => { try { return localStorage.getItem('buy-sell-last-email') || ''; } catch (e) { return ''; } };
  const rememberEmail = (em) => { try { if (em) localStorage.setItem('buy-sell-last-email', em); } catch (e) { /* private mode */ } };
  const acctStatus = () => t('acct.st.' + cloud.status);
  const chPwHTML = () => (Cloud.hasPassword && cloud.signedIn && Cloud.hasPassword() ? `<form id="f-chpw" class="card" style="padding:14px;margin-top:14px"><b>${t('acct.chPw')}</b><span class="pwbox" style="margin-top:10px"><input name="cur" type="password" autocomplete="current-password" required placeholder="${t('acct.curPw')}"><button type="button" class="eye" data-act="pw-eye" aria-label="${t('acct.showPw')}">👁</button></span><span class="pwbox" style="margin-top:10px"><input name="password" type="password" autocomplete="new-password" minlength="6" required placeholder="${t('acct.newPw')}"><button type="button" class="eye" data-act="pw-eye" aria-label="${t('acct.showPw')}">👁</button></span><div id="acct-err" class="err" hidden></div><button class="btn primary" style="margin-top:10px;width:100%">${t('acct.chPwBtn')}</button></form>` : '');
  const addPwHTML = () => (Cloud.hasPassword && cloud.signedIn && !Cloud.hasPassword() ? `<form id="f-addpw" class="card" style="padding:14px;margin-top:14px"><b>${t('acct.addPw')}</b><p class="muted small">${t('acct.addPwSub')}</p><span class="pwbox"><input name="password" type="password" autocomplete="new-password" minlength="6" required placeholder="${t('acct.password')}"><button type="button" class="eye" data-act="pw-eye" aria-label="${t('acct.showPw')}">👁</button></span><div id="acct-err" class="err" hidden></div><button class="btn primary" style="margin-top:10px;width:100%">${t('acct.addPwBtn')}</button></form>` : '');
  function acctCard() {
    return cloud.signedIn
      ? `<div class="sumbox"><div><span>${t('acct.signedInAs', { email: esc(cloud.email) })}</span></div><div class="${cloud.status === 'synced' ? 'good' : /error|rules|unavailable/.test(cloud.status) ? 'bad' : ''}"><span id="acct-st">${acctStatus()}</span></div></div>
         <div class="btns"><button class="btn" data-act="acct-out">${t('acct.signOut')}</button></div><p class="muted small">${t('acct.signOutNote')}</p>`
      : `<div class="row tap" data-act="acct-open" role="button"><div class="grow"><b>${t('acct.notSignedIn')}</b><small>${t('acct.signInSub')}</small></div><span class="chev">›</span></div>`;
  }
  function sheetAccount() {
    if (cloud.signedIn) return openSheet(`<h3>${t('acct.title')}</h3>${acctCard()}${addPwHTML()}<div class="btns"><button class="btn" data-act="close">${t('btn.close')}</button></div>`);
    openSheet(`<h3>${t('acct.title')}</h3><p class="muted small">${t('acct.signInSub')}</p>
      ${IOS ? '' : `<button class="btn g-google" data-act="acct-google" style="margin-top:12px">${GOOGLE_G}<span>${t('acct.google')}</span></button>
      <p class="muted small" style="text-align:center;margin:8px 4px 0">${t('acct.googleNote')}</p>
      <p class="muted small" style="text-align:center;margin:14px 0 0">${t('acct.or')}</p>`}
      <form id="f-acct"><label>${t('acct.email')}</label><input name="email" type="email" inputmode="email" autocomplete="email" required>
      <label>${t('acct.password')}</label><span class="pwbox"><input name="password" type="password" autocomplete="current-password" minlength="6"><button type="button" class="eye" data-act="pw-eye" aria-label="${t('acct.showPw')}">👁</button></span>
      <div id="acct-err" class="err" hidden></div>
      <div class="btns"><button class="btn primary" name="mode" value="in">${t('acct.signIn')}</button><button class="btn" name="mode" value="up">${t('acct.create')}</button>
      <button type="button" class="btn" data-act="acct-forgot">${t('acct.forgot')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`, 'sheet');
  }
  // Items become Available only after you say the final clearing is paid (a batch stops asking for clearing payments from then on).
  function askReceived(id) {
    const b = state.batches.find((x) => x.id === id); if (!b) return;
    const st = L.batchStats(state, b);
    openSmall(`<h3>${t('recv.checkTitle')}</h3><p>${t('recv.checkText')}</p><div class="pd"><span>${t('recv.paidSoFar')}</span><b>${money(b.clearingPaid)} (${(st.clearingPct * 100).toFixed(0)}%)</b></div>
      <div class="btns"><button class="btn primary" data-act="recv-yes" data-id="${id}">${t('recv.yes')}</button><button class="btn" data-act="close">${t('recv.notYet')}</button></div>`, 'card');
  }
  const acctShow = (msg) => { const el = $('#acct-err'); if (el) { el.textContent = msg; el.hidden = !msg; } };
  const acctDone = (p) => { acctShow(''); return p.then(() => { closeSheet(); toast(t('acct.signedIn')); }).catch((e) => acctShow(acctErr(e))); };
  function askConflict() {
    return new Promise((ok) => {
      let done = false; const finish = (v) => { if (!done) { done = true; ok(v); } };
      window.__conflict = finish;
      openSmall(`<h3>${t('acct.conflict.title')}</h3><p>${t('acct.conflict.text')}</p>
        <div class="btns"><button class="btn primary" data-act="conflict" data-id="cloud">${t('acct.conflict.cloud')}</button><button class="btn" data-act="conflict" data-id="phone">${t('acct.conflict.phone')}</button></div>`, 'card', () => finish('cancel'));
    });
  }

  /* ---------- welcome / create account / sign in / business setup (neutral look, not the business's colors) ---------- */

  let gateForgot = false, gateJoin = false, reqRank = {}, gateView = null, gateMode = 'create', gateDraft = { name: '', palette: null, logo: '' }, gateForced = false;   // gateForced: opened on purpose from the app (Settings, the Home banner)
  const GOOGLE_G = '<svg class="glogo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.3-3.9 7.1-9.7 7.1-17.1z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.3-8.7 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  const hasData = () => window.Sync.hasData(state);
  function wantedGate() {
    if (cloud.signedIn && /^(choose|pending|declined|removed)$/.test(cloud.status)) { gateForced = false; return cloud.status === 'choose' ? (gateJoin ? 'join' : 'choose') : cloud.status; }
    if (cloud.signedIn) {
      gateForced = false;
      if (state.settings.setupDone || hasData()) return null;
      return /synced|syncing/.test(cloud.status) ? 'setup' : 'wait';
    }
    if (gateForgot && cloud.status === 'signedOut') return 'forgot';
    if (gateForced) return 'auth';
    if (cloud.status === 'signedOut' && !hasData() && !pref('gateSkipped', false)) return gateView === 'auth' ? 'auth' : 'welcome';
    return null;
  }
  const swatchRow = (cur) => `<div class="swatches wrap" role="radiogroup" aria-label="${t('set.color')}">${Theme.PALETTES.map((p) => `<button type="button" class="swatch ${cur === p.id ? 'on' : ''}" style="background:${p.brand}" role="radio" aria-checked="${cur === p.id}" aria-label="${t('pal.' + p.id)}" data-act="gate-color" data-id="${p.id}"></button>`).join('')}</div>`;
  const gateHTML = (v) => gatePage(v).replace(/<\/div>$/, gateLang() + '</div>');
  function gatePage(v) {
    if (v === 'welcome') return `<div class="g-wrap g-center"><div class="g-logo"><img src="icons/icon-192.png" alt="Shopivo"></div><h1>${t('gate.welcome')}</h1><p class="g-mute">${t('gate.tag')}</p>
      <button class="g-btn primary" data-act="gate-create">${t('gate.create')}</button><button class="g-btn" data-act="gate-have">${t('gate.have')}</button>
      <p class="g-small">${t('gate.note')}</p><button class="g-link" data-act="gate-skip">${t('gate.skip')}</button><p class="g-small">${t('gate.skipNote')}</p></div>`;
    if (v === 'auth') {
      const gbtn = `<button class="g-btn g-google" data-act="gate-google">${GOOGLE_G}<span>${t('acct.google')}</span></button><p class="g-small" style="text-align:center;margin-top:8px">${t('acct.googleNote')}</p>`;
      const form = `<form id="f-gate"><label>${t('acct.email')}</label><input name="email" type="email" inputmode="email" autocomplete="email" value="${gateMode === 'in' ? esc(lastEmail()) : ''}" required>
      <label>${t('acct.password')}</label><span class="pwbox"><input name="password" type="password" autocomplete="${gateMode === 'create' ? 'new-password' : 'current-password'}" minlength="6" required><button type="button" class="eye" data-act="pw-eye" aria-label="${t('acct.showPw')}">👁</button></span>
      <div id="g-err" class="g-err" hidden></div>
      <button class="g-btn primary" style="margin-top:18px">${gateMode === 'create' ? t('acct.create') : t('acct.signIn')}</button>
      ${gateMode === 'in' ? `<button type="button" class="g-link" data-act="gate-forgot">${t('acct.forgot')}</button>` : ''}</form>`;
      const or = `<p class="g-small" style="text-align:center;margin:14px 0">${t('acct.or')}</p>`;
      return `<div class="g-wrap"><button class="g-link" data-act="gate-back">‹ ${t('gate.back')}</button>
      <div class="g-tabs" role="tablist"><button class="${gateMode === 'create' ? 'on' : ''}" role="tab" data-act="gate-tab" data-id="create">${t('gate.tabCreate')}</button><button class="${gateMode === 'in' ? 'on' : ''}" role="tab" data-act="gate-tab" data-id="in">${t('gate.tabSignIn')}</button></div>
      ${IOS ? `<p class="g-small" style="margin:14px 2px 0">${t(gateMode === 'create' ? 'gate.iosCreate' : 'gate.iosHint')}</p>${form}` : `<div style="margin-top:16px">${gbtn}</div>${or}${form}`}</div>`;
    }
    if (v === 'forgot') return `<div class="g-wrap"><button class="g-link" data-act="gate-forgotback">‹ ${t('gate.back')}</button><h1 style="font-size:24px">${t('fp.title')}</h1><p class="g-mute">${t('fp.sub')}</p>
      <form id="f-forgot"><label>${t('acct.email')}</label><input name="email" type="email" inputmode="email" autocomplete="email" value="${esc(lastEmail())}" required>
      <div id="g-err" class="g-err" hidden></div><button class="g-btn primary" style="margin-top:18px">${t('fp.send')}</button></form>
      <p class="g-small" style="margin-top:14px">${t('fp.spam')}</p><p class="g-small">${t('fp.link')}</p><p class="g-small">${t('fp.google')}</p></div>`;
    if (v === 'choose') return `<div class="g-wrap g-center"><div class="g-logo"><img src="icons/icon-192.png" alt="Shopivo"></div><h1>${t('gate.chooseTitle')}</h1><p class="g-mute">${t('gate.chooseSub')}</p>
      <button class="g-btn primary" data-act="gate-newbiz">${t('gate.newBiz')}</button><button class="g-btn" data-act="gate-joinbiz">${t('gate.joinBiz')}</button>
      <div id="g-err" class="g-err" hidden></div><button class="g-link" data-act="acct-out">${t('acct.signOut')}</button></div>`;
    if (v === 'join') return `<div class="g-wrap"><button class="g-link" data-act="gate-joinback">‹ ${t('gate.back')}</button><h1 style="font-size:24px">${t('gate.joinTitle')}</h1><p class="g-mute">${t('gate.joinSub')}</p>
      <form id="f-join"><label>${t('gate.codeLabel')}</label><input name="code" class="g-code" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" placeholder="ABCDEF" required>
      <div id="g-err" class="g-err" hidden></div><button class="g-btn primary" style="margin-top:18px">${t('gate.requestJoin')}</button></form></div>`;
    if (v === 'pending') return `<div class="g-wrap g-center"><div class="g-logo">⏳</div><h1>${t('gate.pendingTitle')}</h1><p class="g-mute">${t('gate.pendingSub')}</p>
      <button class="g-btn" data-act="gate-cancelreq">${t('gate.cancelReq')}</button><button class="g-link" data-act="acct-out">${t('acct.signOut')}</button></div>`;
    if (v === 'declined') return `<div class="g-wrap g-center"><div class="g-logo">✋</div><h1>${t('gate.declinedTitle')}</h1><p class="g-mute">${t('gate.declinedSub')}</p>
      <button class="g-btn primary" data-act="gate-tryagain">${t('gate.tryAgain')}</button><button class="g-btn" data-act="gate-removed-ok">${t('gate.newBiz')}</button><button class="g-link" data-act="acct-out">${t('acct.signOut')}</button></div>`;
    if (v === 'removed') return `<div class="g-wrap g-center"><div class="g-logo">👋</div><h1>${t('gate.removedTitle')}</h1><p class="g-mute">${t('gate.removedSub')}</p>
      <button class="g-btn primary" data-act="gate-removed-ok">${t('gate.continue')}</button><button class="g-link" data-act="acct-out">${t('acct.signOut')}</button></div>`;
    if (v === 'setup') {
      const cur = gateDraft.palette || Theme.current();
      return `<div class="g-wrap"><h1 style="font-size:24px">${t('gate.setup.title')}</h1><p class="g-mute">${t('gate.setup.sub')}</p>
        <form id="f-setup"><label>${t('gate.bizName')}</label><input name="biz" value="${esc(gateDraft.name)}" placeholder="${t('gate.bizPh')}" autocomplete="off" required>
        <div id="g-err" class="g-err" hidden></div>
        <label>${t('gate.logo')}</label><div class="glrow"><span class="glpv" id="gate-logo-pv">${gateDraft.logo ? `<img src="${gateDraft.logo}" alt="">` : esc(initials(gateDraft.name || '?'))}</span><div><button type="button" class="g-btn" data-act="gate-logo-pick" id="gate-logo-btn">${t(gateDraft.logo ? 'gate.logoChange' : 'gate.logoAdd')}</button><small>${t('gate.logoSub')}</small></div><input type="file" id="gate-logo-file" accept="image/*" hidden></div>
        <label>${t('gate.pickColor')}</label>${swatchRow(cur)}
        <div style="margin-top:14px">${themePreview(cur, gateDraft.name || t('gate.bizPh'))}</div>
        <button class="g-btn primary" style="margin-top:18px">${t('gate.continue')}</button></form></div>`;
    }
    return `<div class="g-wrap g-center"><div class="g-logo"><img src="icons/icon-192.png" alt="Shopivo"></div><p class="g-mute">${t('gate.waiting')}</p></div>`;
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
  const gateErr = (m) => { const e = $('#g-err'); if (e) { e.textContent = m; e.hidden = !m; e.classList.remove('ok'); } };
  document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('#gate') && /INPUT/.test(e.target.tagName)) setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); });
  /* Number boxes (prices, costs, amounts, phone numbers) show a tick on the keyboard, and the tick just closes the keyboard: the page stays
     where it is (it does not jump to the next box and it does not submit anything). */
  const NUMSEL = 'input[inputmode=decimal],input[inputmode=numeric],input[inputmode=tel],input[type=tel],input[type=number]';
  const hintNums = (root) => root.querySelectorAll(NUMSEL).forEach((el) => { if (el.getAttribute('enterkeyhint') !== 'done') el.setAttribute('enterkeyhint', 'done'); });
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) { if (n.matches(NUMSEL)) n.setAttribute('enterkeyhint', 'done'); hintNums(n); } }))).observe(document.body, { childList: true, subtree: true });
  hintNums(document);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !e.target || !e.target.matches) return;
    if (e.target.matches(NUMSEL)) { e.preventDefault(); e.target.blur(); return; }   // the tick: close the keyboard, stay on this page
    if (e.target.dataset && (e.target.dataset.f === 'desc' || e.target.dataset.f === 'descS') && e.target.closest('.qe')) { e.preventDefault(); const nx = $('.qe [data-f=cost]'); if (nx) nx.focus(); }   // Edit items: description, then cost
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'w-es') { e.preventDefault(); const b = $('[data-act=word-add]'); if (b) b.click(); } });
  document.addEventListener('input', (e) => { if (e.target.name === 'biz' && e.target.form && e.target.form.id === 'f-setup') { gateDraft.name = e.target.value; const n = $('#pv-name'); if (n) n.textContent = e.target.value || t('gate.bizPh'); } });

  const filtered = () => flt.period !== 'all' || flt.batch !== 'all';

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return L.migrate(JSON.parse(raw)); } catch (e) { /* use default */ }
    return L.defaultState();
  }
  function save() { if (peopleOn) { try { PE.ensure(state); } catch (e) { /* ignore */ } } try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast(t('err.save')); } if (window.Cloud) Cloud.changed(); if (window.Store) Store.schedule(); }
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

  // The two buttons at the top right: the bell (notifications, with the number of new things) and the gear (Settings).
  // The top bar: a search button where the page has a search, the bell, and a ⋮ menu (filter, settings). The page's own search box stays hidden; the button opens one over the bar.
  const pageSearchSel = () => (tab === 'sell' && !moreView ? '.oq' : tab === 'more' && moreView === 'orders' ? '.oq' : tab === 'more' && moreView === 'deliveries' ? '.dq' : tab === 'more' && moreView === 'batches' ? '.blq' : tab === 'more' && moreView === 'invoices' ? '.iq' : tab === 'more' && moreView === 'items' ? '.itq' : tab === 'people' ? '.cq' : '');
  function renderTools() {
    const el = $('#appbar-right'); if (!el) return;
    const btn = (act, label, icon, extra, id) => `<button class="round" data-act="${act}"${id ? ` data-id="${id}"` : ''} aria-label="${label}"><svg viewBox="0 0 24 24">${ICONS[icon]}</svg>${extra || ''}</button>`;
    const n = ($('#back').hidden || isSettings()) ? notifCount() : 0, sel = pageSearchSel(), active = sel === '.oq' ? ordQ.trim() : sel === '.dq' ? dlvQ.trim() : sel === '.iq' ? invQ.trim() : sel === '.itq' ? itQ.trim() : sel === '.cq' ? cuQ.trim() : '';
    const sbtn = sel ? btn('tsearch-open', t('tool.search'), 'search', active ? '<i class="dot"></i>' : '') : '';
    if (tab === 'more' && moreView === 'batches') { const k = blCount(blF); el.innerHTML = `<div class="tools">${sbtn}${k ? btn('bl-filter-open', t('tool.filter'), 'filter', `<b class="nb">${k}</b>`) : ''}${btn('tmenu', t('tool.more'), 'dots', '', 'bl')}</div>`; return; }   // the funnel shows only while a filter is on
    if (tab === 'more' && moreView === 'deliveries') { el.innerHTML = `<div class="tools">${sbtn}${btn('tmenu', t('tool.more'), 'dots', !dset().home ? '<i class="dot"></i>' : '', 'dlv')}</div>`; return; }   // same ⋮ menu as the other logs, plus a Delivery settings shortcut
    if (tab === 'more' && moreView === 'orders') { el.innerHTML = `<div class="tools">${sbtn}${btn('tmenu', t('tool.more'), 'dots', !dset().home ? '<i class="dot"></i>' : '', 'ord')}</div>`; return; }
    if (tab === 'more' && moreView === 'items') { el.innerHTML = `<div class="tools">${sbtn}</div>`; return; }
    if (tab === 'more' && moreView === 'invoices') { const k = (flt.period !== 'all' ? 1 : 0) + (flt.batch !== 'all' ? 1 : 0); el.innerHTML = `<div class="tools">${sbtn}${k ? btn('filter', t('tool.filter'), 'filter', `<b class="nb">${k}</b>`) : ''}${btn('tmenu', t('tool.more'), 'dots', '', 'inv')}</div>`; return; }
    el.innerHTML = ($('#back').hidden || isSettings()) ? `<div class="tools">${sbtn}${btn('bell', t('notif.title'), 'bell', n ? `<b class="nb">${n > 9 ? '9+' : n}</b>` : '')}${btn('tmenu', t('tool.more'), 'dots', filtered() ? '<i class="dot"></i>' : '', 'main')}</div>` : '';
  }
  /* search over the top bar: it types into the page's own search box (hidden), so every page keeps its own search logic */
  let tsKey = '';
  function closeTopSearch(keep) {
    const o = $('#tsearch'); if (!o) return;
    o.remove(); const pi = $(pageSearchSel()); if (!keep && pi && pi.value) { pi.value = ''; pi.dispatchEvent(new Event('input', { bubbles: true })); }
    renderTools(); syncHistory();
  }
  function openTopSearch() {
    const sel = pageSearchSel(), page = sel && $(sel); if (!page) return;
    closeTopSearch(true); tsKey = tab + '|' + moreView;
    const hd = document.querySelector('.appbar'), cs = getComputedStyle(hd), o = document.createElement('div'); o.id = 'tsearch'; o.className = 'tsearch';
    o.style.cssText = `height:${hd.getBoundingClientRect().height}px;background:${cs.backgroundColor};padding-top:${cs.paddingTop}`;
    o.innerHTML = `<button type="button" class="tsb" data-act="tsearch-close" aria-label="${t('aria.back')}">‹</button><label class="tsf"><span aria-hidden="true">🔍</span><input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('tool.search'))}" value="${esc(page.value)}"><button type="button" class="tsx" data-act="tsearch-close" aria-label="${t('tool.closeSearch')}">✕</button></label>`;
    document.body.appendChild(o); const f = o.querySelector('input'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); syncHistory();
  }
  function closeTopMenu() { ['tmenu', 'tmscrim'].forEach((i) => { const e = document.getElementById(i); if (e) e.remove(); }); }
  function openTopMenu(kind) {
    closeTopMenu();
    const row = (act, ic, label, on) => `<button type="button" class="tmi" data-act="${act}"><span class="tmic" aria-hidden="true">${ic}</span><span class="tml">${label}</span>${on ? '<i class="dot on"></i>' : ''}</button>`;
    const ss = row('store-settings', '🏪', t('hub.settings'), !dset().home);   // Store settings (with Store location) from the Store page and every log
    const rows = kind === 'inv' ? row('filter', '☰', t('tool.filter'), filtered()) + ss : kind === 'ord' ? ss : kind === 'dlv' ? row('settings', '⚙️', t(isSettings() ? 'tm.closeSet' : 'tool.settings'), false) + ss + row('pickup-open', '🛵', t('hub.delivery'), false) + row('dlv-settings', '🚚', t('dlv.settings'), false) : kind === 'bl' ? row('bl-filter-open', '☰', t('tool.filter'), blCount(blF) > 0) + ss : (tab === 'promote' ? '' : row('filter', '☰', t('tool.filter'), filtered())) + row('settings', '⚙️', t(isSettings() ? 'tm.closeSet' : 'tool.settings'), false) + (tab === 'sell' && !moreView ? ss : '') + (tab === 'people' && peopleOn ? row('fix-open', '🛠️', t('fx.title'), PE.missingNumber(state).length > 0) : '');
    const sc = document.createElement('div'); sc.id = 'tmscrim'; sc.className = 'tmscrim'; sc.dataset.close = '1';
    const m = document.createElement('div'); m.id = 'tmenu'; m.className = 'tmenu'; m.setAttribute('role', 'menu'); m.innerHTML = rows;
    const hd = document.querySelector('.appbar').getBoundingClientRect(); m.style.top = (hd.bottom - 6) + 'px';
    document.body.appendChild(sc); document.body.appendChild(m);
  }
  function render() {
    if ($('#tsearch') && tsKey !== tab + '|' + moreView) closeTopSearch(true);
    closeTopMenu();
    cleanSelected();
    const moreTitles = { deliveries: 'more.deliveries', orders: 'more.orders', batches: 'more.batches', invoices: 'title.invoices', items: 'title.items', summary: 'title.summary', settings: 'title.settings' };
    const titles = { home: bizName(), stock: stockBatch && stockFilter !== 'NoPrice' ? bl(stockBatch) : t('nav.stock'), sell: moreView === 'invoice' ? (pendingOrder ? t('ord.confirmTitle') : t('sell.newInv')) : t('nav.sell'), people: t('cu.title'), promote: t('nav.promote'), more: moreView ? (moreView.startsWith('set-') ? { 'set-theme': t('set.theme'), 'set-business': t('set.business'), 'set-invdesign': t('set.invDesign'), 'set-backup': t('set.backupRow'), 'set-about': t('set.storageRow'), 'set-password': t('acct.chPw') }[moreView] : t(moreTitles[moreView])) : t('nav.more') };
    $('#title').textContent = titles[tab];
    $('#back').hidden = !((tab === 'more' || tab === 'sell') && moreView);
    const hasLogo = !!state.settings.bizLogo, customBrand = !!state.settings.businessName, showBrand = $('#back').hidden, imgBrand = hasLogo || !customBrand;
    { const want = hasLogo ? state.settings.bizLogo : 'icons/logo.png'; if ($('#brand').getAttribute('src') !== want) $('#brand').src = want; }
    $('#brand').hidden = !showBrand || !imgBrand; $('#brandtxt').hidden = !showBrand || imgBrand; $('#brandtxt').textContent = initials(bizName());
    $('#tabbar').innerHTML = TABS.map((k) => { const label = t('nav.' + k); return `<button data-tab="${k}" class="${k === tab || (k === 'more' && tab === 'people') ? 'on' : ''}" aria-label="${label}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg>${label}${k === 'stock' && selected.size ? `<span class="badge">${selected.size}</span>` : ''}</button>`; }).join('');
    renderTools(); syncAppbarH();
    document.body.classList.toggle('hide-amounts', hideAmounts); document.body.classList.toggle('nocosts', !can('costs'));
    const chipX = tab === 'stock' && $('.stchips') ? $('.stchips').scrollLeft : 0;   // a tap on a filter chip keeps the row where it was scrolled
    $('#view').innerHTML = (tab === 'home' ? installBanner() + signInBanner() : '') + { home: Home, stock: Stock, sell: SellTab, people: People, promote: Promote, more: More }[tab]();
    if (chipX && $('.stchips')) $('.stchips').scrollLeft = chipX;
    renderActionBar();
    syncHistory();
    showVersion();
    PUI.hydrate();
    if (tab === 'more' && moreView === 'items') itFitBar();
    if (tab === 'promote') prPreview();
    if (restoreY !== null) { const y = restoreY; restoreY = null; window.scrollTo(0, y); requestAnimationFrame(() => window.scrollTo(0, y)); }
  }

  // The deploy stamps the commit id into the cache name, so the saved copy tells us which version is running.
  function showVersion() {
    const el = $('#ver'); if (!el || !window.caches) return;
    caches.keys().then((ks) => { const k = ks.find((x) => /^buy-sell-/.test(x)); if (k) el.textContent = t('more.version', { v: k.replace('buy-sell-', '') }); }).catch(() => {});
  }

  function renderActionBar() {
    const bar = $('#actionbar'); let html = '';
    if (tab === 'home' && state.batches.length) html = `<button class="fab" data-act="new-batch">${t('btn.newBatch')}</button>`;
    else if (tab === 'stock' && selected.size) html = `<div class="dual"><button class="btn sale" data-act="sale-open">🏷 ${t('sale.btn')}</button><button class="btn primary go" data-act="goto-sell">${tn('bar.sell', selected.size)}</button></div>`;
    else if (tab === 'sell' && moreView === 'invoice' && selected.size) {
      const p = preview();
      html = `<button class="btn primary" data-act="make-invoice" ${p.errors.length ? 'disabled' : ''}>${t(pendingOrder ? 'ord.confirmBar' : 'bar.create', { amount: money(p.total) })}</button>`;
    }
    bar.classList.toggle('fabbar', tab === 'home'); bar.hidden = !html; bar.innerHTML = html;
  }

  const preview = () => L.previewInvoice(state, { itemIds: [...selected], client: invForm.client, paying: invForm.paying, allowZero: !!pendingOrder });

  /* ---------- Home ---------- */

  const TRANSIT_LATE_DAYS = 14;
  function Home() {
    const tot = L.totals(state, flt);
    const inTransit = state.batches.filter((b) => bStatus(b) === 'In Transit').sort((a, b) => b.num - a.num);
    const owingAll = L.customerStats(state).filter((c) => c.owing > 0).sort((a, b) => b.owing - a.owing), owing = owingAll.slice(0, 3);
    const recent = L.filterInvoices(state, flt).slice(-3).reverse();
    if (!state.batches.length) return `<div class="empty"><b>${t('home.welcome')}</b>${t('home.welcomeText')}</div>
      <div class="list"><button class="btn primary" data-act="new-batch">${t('btn.newBatch')}</button><button class="btn" data-act="import-xlsx">${t('btn.importXlsx')}</button></div>`;
    const hr = new Date().getHours(), greet = t(hr < 12 ? 'hm.morning' : hr < 18 ? 'hm.afternoon' : 'hm.evening'), nm = String(myName() || '').trim(), who = nm ? nm.charAt(0).toUpperCase() + nm.slice(1) : '';
    const noPrice = state.items.filter(isNoPrice).length;
    const orders = window.Store && storeCfg().id ? Store.newCount() : 0, oweTotal = owingAll.reduce((n, c) => n + c.owing, 0);
    const need = (icon, bg, title, sub, n, act, hot) => `<button class="hnr" data-act="${act}"><span class="hic" style="background:${bg}">${icon}</span><div class="t"><b>${title}</b><small>${sub}</small></div><span class="hcnt${hot ? ' hot' : ''}">${n}</span><span class="chev">›</span></button>`;
    const rows = [];
    const wayDays = (b) => Math.max(0, Math.floor((Date.now() - new Date(b.datePurchased).getTime()) / 864e5)), oldest = inTransit.slice().sort((a, b) => wayDays(b) - wayDays(a))[0];   // always shown while a batch is on the way; red once the oldest has been on the way 14 days or more
    const wayTxt = (b) => (wayDays(b) < 1 ? t('hm.wayToday', { b: blShort(b.id) }) : t(inTransit.length === 1 ? 'hm.wayOne' : 'hm.wayMany', { b: blShort(b.id), n: wayDays(b) }));
    if (inTransit.length) rows.push(need('📦', 'var(--infobg)', t('hm.wayTitle'), wayTxt(oldest), inTransit.length, 'goto-transit', wayDays(oldest) >= TRANSIT_LATE_DAYS));
    if (orders) rows.push(need('🛒', 'var(--warnbg)', t('hm.ordTitle'), t('hm.ordSub'), orders, 'orders-open', true));
    if (owingAll.length) rows.push(need('💰', 'var(--warnbg)', t('hm.oweTitle'), t('hm.oweSub', { amt: money(oweTotal) }), owingAll.length, 'goto-owing', true));
    if (!state.settings.bizLogo && state.settings.businessName && state.settings.setupDone && !pref('logoNudgeOff', false)) rows.push(need('🖼️', 'var(--infobg)', t('hm.logoTitle'), t('hm.logoSub'), '+', 'logo-go', false));   // goes away once a logo is added (or once the page has been opened)
    if (peopleOn && PE.missingNumber(state).length) rows.push(need('📞', 'var(--infobg)', t('hm.phoneTitle'), t('hm.phoneSub'), PE.missingNumber(state).length, 'phones-open', false));
    if (window.Store && Store.needsPublish && Store.needsPublish()) rows.unshift(need('📤', 'var(--warnbg)', t('hm.pubTitle'), t('hm.pubSub'), '!', 'goto-publish', true));
    if (noPrice) rows.push(need('🏷️', 'var(--okbg)', t('hm.noPriceTitle'), t('hm.noPriceSub'), noPrice, 'goto-nopr', false));
    const needs = `<div class="hsec"><h3>${t('hm.needs')}</h3></div><div class="hneeds">${rows.join('') || `<div class="hnr done"><span class="hic" style="background:var(--okbg)">✅</span><div class="t"><b>${t('hm.caught')}</b><small>${t('hm.caughtSub')}</small></div></div>`}</div>`;
    const batches = L.filterBatches(state, flt).slice().sort((a, b) => b.num - a.num).slice(0, 3);
    return `${filtered() ? `<button class="row tap" data-act="filter" style="margin-bottom:10px;background:var(--tint)"><div class="grow"><b>${t('home.filtered', { label: esc(filterLabel()) })}</b><small>${t('home.filteredHint')}</small></div><span class="chev">›</span></button>` : ''}
    <div class="hgreet"><small>${greet}</small>${who ? `<b>${esc(who)}</b>` : ''}</div>
    <div class="hhero"><small>${t(can('costs') ? 'home.profit' : 'home.sales')}</small><b>${money(can('costs') ? tot.profit : tot.sales)}</b><button class="eyeb" data-act="view" aria-label="${hideAmounts ? t('tool.show') : t('tool.hide')}"><svg viewBox="0 0 24 24">${ICONS[hideAmounts ? 'eyeoff' : 'eye']}</svg></button></div>
    <div class="hkp"><div class="costonly"><small>${t('hm.salesPaid')}</small><b>${money(tot.sales)}</b></div><div class="ow"><small>${t('hm.owingTile')}</small><b>${money(tot.owing)}</b></div><div class="costonly"><small>${t('hm.expTile')}</small><b>${money(tot.expense)}</b></div></div>
    ${needs}
    <div class="hact"><button data-act="pay-clearing"><i>💳</i>${t('home.payClearing')}</button><button data-act="receive" ${inTransit.length ? '' : 'disabled'}><i>📦</i>${t('home.receive')}</button><button data-act="goto-stock"><i>🏷️</i>${t('home.priceItems')}</button></div>
    ${owing.length ? `<div class="hsec"><h3>${t('home.whoOwes')}</h3><button class="hall" data-act="goto-owing">${t('hm.seeAll')}</button></div><div class="list">${owing.map((c) => `<button class="row tap" data-act="customer" data-id="${esc(c.name)}"><div class="grow"><b>${esc(clabel(c.name))}</b><small>${tn('home.itemsOwing', c.itemsOwing)}</small></div><div class="end"><b class="bad">${money(c.owing)}</b></div><span class="chev">›</span></button>`).join('')}</div>` : ''}
    <div class="hsec"><h3>${t('hm.latest')}</h3><button class="hall" data-act="more" data-id="batches">${t('hm.seeAll')}</button></div>
    <div class="hbs">${batches.map((b) => { const st = L.batchStats(state, b), pct = st.count ? Math.round(st.sold / st.count * 100) : 0; return `<button class="hbc" data-act="batch" data-id="${b.id}"><b>${esc(blShort(b.id))}</b><small>${esc(b.store)} · ${t('home.soldOf', { sold: st.sold, count: st.count })}</small><div class="bar"><i style="width:${pct}%"></i></div><span class="costonly ${st.profit < 0 ? 'neg' : 'pos'}">${st.profit < 0 ? '−' : '+'}${fmt2(Math.abs(st.profit))}</span></button>`; }).join('')}</div>
    ${recent.length ? `<div class="hsec"><h3>${t('hm.recent')}</h3><button class="hall" data-act="more" data-id="invoices">${t('hm.seeAll')}</button></div><div class="list">${recent.map(invoiceRow).join('')}</div>` : ''}<div style="height:70px"></div>`;
  }

  function invoiceRow(v0) {
    const st = L.invoiceStatus(v0), v = v0.void ? Object.assign({}, v0, v0.void.was) : v0;
    return `<button class="row tap" data-act="view-inv" data-id="${v0.no}"${v0.void ? ' style="opacity:.75"' : ''}><div class="grow"><b>${v0.no} · ${esc(clabel(v0.client))}</b><small>${esc(I.getLang() === 'es' ? (() => { try { return invLines(v0).map((l) => lineName(l, 'es')).join(', ') || v0.desc; } catch (e) { return v0.desc; } })() : v0.desc)}${v0.void ? ' · ' + t(v0.void.kind === 'cancelled' ? 'inv.voidCancelled' : 'inv.voidReturned', { date: dayMon(new Date(v0.void.date)) }) : ''}</small></div>
      <div class="end"><b${v0.void ? ' style="text-decoration:line-through"' : ''}>${money(v.total)}</b><span class="pill ${st}">${invStLabel(st)}</span></div></button>`;
  }

  /* ---------- Stock ---------- */

  const isNoPrice = (i) => (i.status === 'In Transit' || i.status === 'Available') && String(i.desc || '').trim() && !(Number(i.price) > 0) && !(L.salePrice(i) > 0);   // waiting for a price
  function Stock() {
    if (!state.batches.length) return `<div class="empty"><b>${t('stock.none')}</b>${t('stock.noneText')}</div>`;
    const open = state.batches.filter((b) => bStatus(b) !== 'Closed' || b.id === stockBatch).sort((a, b) => b.num - a.num);
    if (!open.length) return `<div class="empty"><b>${t('stock.allClosed')}</b>${t('stock.allClosedText')}</div>`;
    if (!open.some((b) => b.id === stockBatch)) stockBatch = open[0].id;
    const b = state.batches.find((x) => x.id === stockBatch);
    const all = state.items.filter((i) => i.batchId === b.id);
    const ps = L.photoStats(state, b.id);
    if (stockFilter === 'NeedCheck' && !ps.needCheck) stockFilter = 'All';
    const noPr = state.items.filter(isNoPrice), nop = stockFilter === 'NoPrice';   // the No price filter looks across every batch
    const items = nop ? noPr.slice().sort((x, y) => (state.batches.find((z) => z.id === y.batchId) || {}).num - (state.batches.find((z) => z.id === x.batchId) || {}).num || String(x.id).localeCompare(String(y.id))) : all.filter((i) => (stockFilter === 'All' ? true : stockFilter === 'NeedCheck' ? i.photo && !i.photo.checked : i.status === stockFilter));
    const st = L.batchStats(state, b);
    const cnt = (x) => all.filter((i) => i.status === x).length;
    const chip = (act, id, label, n, extra) => `<button type="button" class="itchip${extra ? ' ' + extra : ''}${stockFilter === id ? ' on' : ''}" data-act="${act}" data-id="${esc(id)}">${label}${n !== undefined ? ` <b>${n}</b>` : ''}</button>`;
    const chips = chip('pick-filter', 'All', t('filter.all'), all.length) + STATUSES.map((x) => chip('pick-filter', x, x === 'In Transit' ? t('it.arriving') : stLabel(x), cnt(x))).join('') + (noPr.length || nop ? chip('pick-filter', 'NoPrice', t('stock.noPrice'), noPr.length, 'warn') : '') + (ps.needCheck ? chip('pick-filter', 'NeedCheck', t('filter.needCheck'), ps.needCheck) : '');
    const bar = `<div class="itbar"><button type="button" class="itsel${nop ? '' : ' on'}" data-act="batch-pick"><span class="v">${t('it.batch')}<small>${nop ? t('it.allBatches') : esc(blShort(b.id).replace(/^\D+\s*/, ''))}</small></span><span class="dd">▾</span></button><button type="button" class="itgb" data-act="new-batch">${t('btn.newBatch')}</button></div>`;
    const hero = nop ? `<div class="blhero i3 sthero"><div><small>${t('it.items')}</small><b>${items.length}</b></div><div class="mid"><small>${t('stock.needPrice')}</small><b>${items.length}</b></div><div class="rt"><small>${t('hm.batchesN')}</small><b>${new Set(items.map((i) => i.batchId)).size}</b></div><div class="sub">${t('stock.noPriceSub')}</div></div>`
      : `<div class="blhero i3 sthero" role="button" tabindex="0" data-act="batch-info" data-id="${b.id}"><div><small>${t('stock.invested2')}</small><b>${money(st.investment)}</b></div><div class="mid costonly"><small>${t('stock.profitAll')}</small><b>${money(st.profit)}</b></div><div class="rt"><small>${t('it.items')}</small><b>${all.length}</b></div><div class="sub">${stLabel(bStatus(b))} · ${t('stock.clearingLine', { amount: money(b.clearingPaid), pct: (st.clearingPct * 100).toFixed(0), left: st.left })}</div></div>`;
    const pw = nop ? { n: items.filter((i) => i.photo).length, total: items.length } : { n: ps.withPhoto, total: ps.total };   // the photo row always stays, so the page never jumps when a filter is tapped
    const photo = `<div class="phrow"><div class="grow"><b>${t('photo.progress', { n: pw.n, total: pw.total })}</b>${!nop && ps.needCheck ? `<small class="bad">${tn('photo.needCheck', ps.needCheck)}</small>` : ''}</div>${!nop && ps.needCheck ? `<button class="chip on" data-act="photo-check-all" data-id="${b.id}">${t('photo.checkAll')}</button>` : ''}<button class="chip" data-act="photo-add" data-id="${b.id}"${nop ? ' disabled' : ''}>📷 ${t('photo.add')}</button><button class="chip" data-act="qe-open" data-id="${b.id}"${nop ? ' disabled' : ''}>✏️ ${t('qe.short')}</button></div>`;
    const notin = nop ? '' : (() => { const sc = storeCfg(); return sc.id && !sc.batches.includes(b.id) && all.some((i) => i.status === 'Available' && String(i.desc || '').trim()) ? `<div class="row notin" style="margin-bottom:10px;flex-wrap:wrap"><div class="grow"><b>${t('store.notIn')}</b><small>${t('store.notInSub')}</small></div><button class="chip on" data-act="store-addbatch" data-id="${b.id}">${t('store.addBatch')}</button></div>` : ''; })();
    return `${bar}${hero}${photo}${notin}<div class="itchips stchips">${chips}</div>${selBar(items)}<div class="list stlist">${stockRows(nop ? null : b, items) || `<div class="empty">${t('stock.noMatch')}</div>`}</div>`;
  }

  // The discount a sold item was bought with (shown as a red strip on its picture): the sale percentage, or the real percentage off the selling price if Sold for was changed by hand.
  // Sale for everything picked in Stock: percentage chips, an example, one big button.
  let salePct = 25;
  function saleExample() {
    const its = [...selected].map((id) => state.items.find((i) => i.id === id)).filter((i) => i && !L.isLocked(i)); if (!its.length) return '';
    const same = its.every((x) => SCore.sameName(x.desc) === SCore.sameName(its[0].desc) && L.r2(Number(x.price) || 0) === L.r2(Number(its[0].price) || 0)), p = Number(its[0].price) || 0;
    const sub = same && its[0].desc ? esc(its[0].desc) + ' ×' + its.length + (p ? ' · ' + money(p) + ' ' + t('sale.each') : '') : tn('sale.items', its.length);
    return { sub, p: same && p ? p : 0 };
  }
  function salePctDraw(other) {
    const el = $('#bulksale'); if (!el) return; const ex = saleExample();
    el.innerHTML = saleBody(ex, other);
    if (other) { const f = $('#sale-in'); if (f) f.focus(); }
  }
  function saleBody(ex, other) {
    const chips = [10, 20, 25, 50].map((c) => `<button type="button" class="${!other && salePct === c ? 'on' : ''}" data-act="sale-pick" data-v="${c}">${c}%</button>`).join('') + `<button type="button" class="${other ? 'on' : ''}" data-act="sale-other">${t('item.saleOther')}</button>`;
    const pctNow = other ? 0 : salePct;
    return `<div class="pc">${chips}</div>${other ? `<input id="sale-in" type="text" inputmode="decimal" placeholder="${t('item.discountPh')}" autocomplete="off">` : ''}
      ${ex && ex.p && pctNow ? `<div class="ex"><span>${t('sale.price')}</span><span><s>${money(ex.p)}</s><b>${money(L.r2(ex.p * (1 - pctNow / 100)))}</b></span></div>` : ''}`;
  }
  function sheetSale() {
    const its = [...selected].map((id) => state.items.find((i) => i.id === id)).filter((i) => i && !L.isLocked(i)); if (!its.length) return;
    const ex = saleExample(), cur = its.find((x) => x.saleOn && x.discount); salePct = cur ? Number(cur.discount) : 25;
    const std = [10, 20, 25, 50].includes(salePct) ? false : true;
    openSmall(`<h3>${tn('sale.title', its.length)}</h3><p>${ex.sub}</p><div id="bulksale">${saleBody(ex, std)}</div>
      <div class="btns"><button class="btn primary" data-act="sale-apply">${tn('sale.title', its.length)}</button></div>
      <a class="lnk2" data-act="sale-off" role="button" tabindex="0">${tn('sale.take', its.length)}</a>`, 'sheet');
  }
  // A design with many pieces (more than 10) is one row until opened; everything else is one row per item.
  const GRP_BIG = 10; let grpOpen = new Set();
  function stockRows(b, items) {
    const counts = {}; items.forEach((i) => { if (i.grp && !L.isLocked(i)) counts[i.grp] = (counts[i.grp] || 0) + 1; });
    const done = new Set(); let out = '';
    items.forEach((i) => {
      const big = i.grp && !L.isLocked(i) && counts[i.grp] > GRP_BIG;
      const bb = b || state.batches.find((x) => x.id === i.batchId), tag = !b;
      if (!big) { out += itemCard(bb, i, tag); return; }
      if (grpOpen.has(i.grp)) { if (!done.has(i.grp)) { done.add(i.grp); out += `<button class="row tap grpclose" data-act="grp-toggle" data-id="${i.grp}">▲ ${grpName(i)} ×${counts[i.grp]} · ${t('grp.collapse')}</button>`; } out += itemCard(bb, i, tag); return; }
      if (done.has(i.grp)) return; done.add(i.grp);
      const mem = items.filter((x) => x.grp === i.grp && !L.isLocked(x)), all = mem.every((x) => selected.has(x.id)), cnt = L.sizeCounts(state, i), sale = L.salePrice(i);
      out += `<div class="item grp ${all ? 'sel' : ''}" data-grp="${i.grp}"><label class="chk" aria-label="${t('aria.selectItem')}"><input type="checkbox" data-selgrp="${i.grp}" ${all ? 'checked' : ''}></label>
        <button class="main" data-act="grp-toggle" data-id="${i.grp}">${PUI.thumb(i)}<span class="txt"><b>${grpName(i)} <em class="gxn">×${mem.length}</em></b><small>${esc(sizeSummary(cnt)) || t('size.none')}</small></span></button>
        <div class="side"><span class="pill ${i.status.replace(' ', '')}">${stLabel(i.status)}</span><b>${sale ? money(sale) : i.price ? money(i.price) : ''}</b></div><span class="chev">›</span></div>`;
    });
    return out;
  }
  // Above the list once something is picked: how many, Select all, Clear.
  function selBar(items) {
    if (!selected.size) return '';
    const pool = items.filter((i) => !L.isLocked(i));
    return `<div class="selbar"><span><b>${t('sel.n', { n: selected.size })}</b> ${t('sel.ofM', { m: pool.length })}</span><span><button data-act="sel-all">${t('sel.all', { m: pool.length })}</button> <button data-act="sel-clear">${t('sel.clear')}</button></span></div>`;
  }
  const boughtOffPct = (i) => {
    const price = Number(i.price) || 0, sold = Number(i.sold) || 0;
    if (!L.isSold(i) || !i.saleOn || price <= 0 || sold <= 0 || sold >= price) return 0;
    return Math.abs(sold - L.salePrice(i)) < 0.01 ? Number(i.discount) : Math.round((1 - sold / price) * 100);
  };
  const offStrip = (i) => { const p = boughtOffPct(i); return p > 0 ? `<small class="saleoff ph-sale">−${p}%</small>` : ''; };
  function itemCard(b, i, tag) {
    const c = L.itemCalc(b, i), sel = selected.has(i.id), noPhoto = L.shareStatus(i) === 'noPhoto';
    const sale = L.salePrice(i), priceHtml = i.sold ? money(i.sold) : sale ? money(sale) : i.price ? money(i.price) : c.recommended ? '<span class="muted">' + money(c.recommended) + '</span>' : '';
    const noPriceTag = isNoPrice(i) ? `<span class="nopr">${t('stock.noPrice')}</span>` : '';
    return `<div class="item ${sel ? 'sel' : ''} ${i.status === 'Paid' ? 'paid' : ''}" data-id="${i.id}">
      <label class="chk" aria-label="${t('aria.selectItem')}"><input type="checkbox" data-sel ${sel ? 'checked' : ''}></label>
      <button class="main" data-act="edit-item" data-id="${i.id}">${PUI.thumb(i).replace(/<\/span>$/, (sale && !L.isSold(i) ? `<small class="saleoff ph-sale">−${Number(i.discount)}%</small>` : offStrip(i)) + '</span>')}<span class="txt"><b>${esc(dn(i)) || `<span class="muted">${t('item.untitled')}</span>`}${String(i.desc || '').trim() && !String(i.size || '').trim() && !L.isSold(i) ? ` <i class="szwarn" title="${t('size.missingTip')}">!</i>` : ''}</b>
        <small>${i.id}${i.size ? ' · <b class="szb">' + esc(szLabel(i.size)) + '</b>' : ''}${tag ? `<span class="bl2">${esc(blShort(i.batchId))}</span>` : ''}</small>${i.customer || i.invoice || (L.isHeld(i) && !L.isSold(i)) ? `<small>${[i.customer ? esc(i.customer) : '', i.invoice || '', L.isHeld(i) && !L.isSold(i) ? '🔒 ' + t('stock.ordered') : ''].filter(Boolean).join(' · ')}</small>` : ''}</span></button>
      <div class="side"><span class="pill ${i.status.replace(' ', '')}">${stLabel(i.status)}</span><b>${isNoPrice(i) ? noPriceTag : priceHtml}</b></div>
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
  /* ---------- Store tab: run the online store; the invoice page lives inside it ---------- */
  const hubOpen = () => tab === 'sell' && !moreView && $('#sheet').hidden;
  const SellTab = () => (moreView === 'invoice' ? Sell() : StoreHub());
  function StoreHub() {
    const c = storeCfg(), signed = cloud.signedIn, inf = Store.info();
    if (!c.id) return `<div class="sth"><div class="box"><div class="rw2"><div class="t"><b>${t('hub.setup')}</b><small>${t('store.needAccountSub')}</small></div></div><div class="lnk">${signed ? `<button class="btn primary" style="flex:1" data-act="store-create">${t('store.create')}</button>` : `<button class="btn primary" style="flex:1" data-act="acct-open">${t('acct.signIn')}</button>`}</div></div></div>`;
    const live = SCore.shown(state, c, Store.reserved()).length;
    const stat = !signed ? '' : inf.error === 'permission-denied' ? t('store.needRules') : inf.error === 'timeout' ? t('store.pubSlow') : inf.error ? t('store.pubError') : inf.busy ? t('store.publishing') : inf.at ? t('store.published', { n: inf.count, when: ago(new Date(inf.at)) }) + ' · ' + t(inf.sharp ? 'store.picsSharp' : 'store.picsSmall') : '';
    const hidden = state.items.filter((i) => c.batches.includes(i.batchId) && i.status === 'Available' && String(i.desc || '').trim() && !(Number(i.price) > 0) && !(L.salePrice(i) > 0)), hid0 = hidden[0];
    const batchRow = (b) => { const a = state.items.filter((i) => i.batchId === b.id && i.status === 'Available').length, tr = state.items.filter((i) => i.batchId === b.id && i.status === 'In Transit').length; return `<div class="rw2"><div class="t"><b>${bl(b.id)}</b><small>${t('store.batchCount', { a, t: tr })}</small></div>${swt('store-batch', b.id, c.batches.includes(b.id))}</div>`; };
    const link = (act, ic, label) => `<button data-act="${act}">${ic} ${label}</button>`;
    return `<div class="sth"><div class="box"><div class="rw2"><div class="t"><div class="live ${c.open ? '' : 'off'}"><i></i>${c.open ? t('hub.open2') : t('hub.closed')}</div><small>${esc(c.open ? t('hub.liveSub', { n: live }) : t('store.openSub'))}</small></div>${swt('store-toggle', 'open', c.open)}</div>
      <div class="lnk">${link('store-link', '🔗', t('store.copy') + ' ' + t('hub.link'))}${link('store-share', '📤', t('hub.share'))}${link('store-preview', '👁', t('hub.preview'))}</div>${c.id ? `<div class="lkurl"><span class="lku" tabindex="0">${esc(Store.link(c).replace(/^https?:\/\//, ''))}</span><button type="button" class="lkc" data-act="store-link" aria-label="${t('store.copy')} ${t('hub.link')}">${t('store.copy')}</button></div>` : ''}</div>
      <h4><span>${t('store.orders')}</span><span class="ha">${toDeliver().length ? `<a data-act="deliveries-open">🚚 ${t('dv.btn')} (${toDeliver().length})</a>` : ''}<a data-act="orders-open">${t('hub.seeAll')}</a></span></h4>
      ${ordHead(true)}
      <div class="ordp" data-lim="5">${ordPanel(5)}</div>
      ${(() => { const open = pref('hubBatchesOpen', false), all = state.batches.slice().sort((a, b) => b.num - a.num), shownN = all.filter((b) => c.batches.includes(b.id)).length, chv = `<svg viewBox="0 0 14 8" width="14" height="8" aria-hidden="true" style="transition:transform .2s;transform:rotate(${open ? 180 : 0}deg)"><path d="M1 1l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        if (!open) return `<h4 style="align-items:center"><span>${t('hub.see')}</span><button class="foldb" data-act="batches-fold" aria-label="${t('hub.seeOpen')}" aria-expanded="false">${chv}</button></h4><div class="box"><button class="rw2 tap" data-act="batches-fold"><div class="t"><b>${t('hub.batchesShown', { n: shownN })}</b><small>${t('hub.liveSub', { n: live })} · ${t('hub.tapChoose')}</small></div><span class="foldc">${chv}</span></button></div>`;
        return `<h4 style="align-items:center"><button class="foldt" data-act="batches-fold" aria-expanded="true"><span>${t('hub.see')}</span>${chv}</button>${all.length ? `<span class="allsw">${t('store.selAll')} ${swt('store-batch-all', 'all', all.every((b) => c.batches.includes(b.id)))}</span>` : ''}</h4>
          <div class="box">${all.slice(0, 5).map(batchRow).join('') || `<div class="rw2"><div class="t"><small>${t('stock.none')}</small></div></div>`}${all.length ? `<button class="rw2 tap" data-act="batches-log" style="justify-content:space-between;color:var(--brand);font-weight:800"><span>${t('hub.openBatchLog')} · ${all.length}</span><span>›</span></button>` : ''}</div>`; })()}
      ${hid0 ? `<div class="warn"><span style="font-size:20px">⚠️</span><div><b>${tn('hub.hidden', hidden.length)}</b><br><small>${t('hub.hiddenSub')}</small></div><button class="fx" data-act="open-stock" data-id="${hid0.batchId}">${t('hub.fix')}</button></div>` : ''}
      <h4 class="hsec"><span>${t('hub.settings')}</span></h4>
      ${settingsGroups(c, true)}
      <div class="pubcard ${inf.error || !signed ? 'bad' : ''}"><i></i><div><b>${!signed ? t('store.needAccount') : inf.error ? t('hub.pubProblem') : inf.busy ? t('store.publishing') : inf.at ? t('hub.upToDate') : t('hub.notYet')}</b><small>${esc(stat)}</small></div></div>
      <button class="pubbtn" data-act="store-publish" ${signed ? '' : 'disabled'}>${t('store.publishNow')}</button><p class="pubnote">${t('hub.autoNote')}</p></div>`;
  }
  function Sell() {
    if (!selected.size) return `<div class="sx"><div class="empty2"><div class="ic">🧾</div><h3>${t('sell.empty')}</h3><p>${t('sell.emptyText')}</p><button class="btn primary" data-act="goto-stock" style="width:100%">${t('sell.choose')}</button><button class="btn qsbtn" data-act="quick-sale" style="width:100%;margin-top:10px">⚡ ${t('qs.btn')}</button></div></div>`;
    const items = [...selected].map((id) => state.items.find((i) => i.id === id)).filter(Boolean);
    const sub = items.reduce((n, i) => n + L.effectivePrice(i), 0), client = L.cleanName(invForm.client), fromOrder = !!pendingOrder;   // what a customer ordered cannot be edited or taken off here
    const row = (i) => { const eff = L.effectivePrice(i), sale = L.salePrice(i) > 0 && !L.isSold(i), was = Number(i.price) || 0;
      return `<div class="it"><${fromOrder ? 'div' : 'button'} class="main" ${fromOrder ? '' : `data-act="edit-item" data-id="${i.id}"`}>${PUI.thumb(i).replace(/^<span class="ph/, '<span class="pic ph').replace(/<\/span>$/, (sale ? `<span class="s">−${Number(i.discount)}%</span>` : '') + '</span>')}<span class="t"><b>${esc(dn(i)) || `<span class="bad">${t('sell.noDesc')}</span>`}</b><small>${i.id}${i.size ? ' · ' + esc(szLabel(i.size)) : ''}${i.invoice ? t('sell.onInv', { no: i.invoice }) : ''}</small></span><span class="p">${eff > 0 ? money(eff) : `<span class="bad">${t('sell.noPrice')}</span>`}${sale && was > eff ? `<small><s>${money(was)}</s></small>` : ''}</span></${fromOrder ? 'div' : 'button'}>
        ${fromOrder ? '' : `<button class="x" data-act="unselect" data-id="${i.id}" aria-label="${t('aria.remove')}">✕</button>`}</div>`; };
    if (fromOrder) {   // an order: customer first, then what they ordered with the delivery cost in plain view, then payment (no steps bar)
      const pv = preview(), dl = pv.delivery;
      return `<div class="sx"><h4 id="sx-customer"><span>${t('sell.customer')}</span></h4>${orderCustomerCard()}
      <h4 id="sx-items"><span>${t('sell.items', { n: items.length })}</span></h4>
      <div class="card">${items.map(row).join('')}<div class="sub"><span>${t('sell.subtotal')}</span><b>${money(sub)}</b></div>${dl > 0 ? `<div class="sub dl"><span>🚚 ${t('sell.deliveryRow')}</span><b>${money(dl)}</b></div>` : ''}<div class="sub tot"><span>${t('sell.totalRow')}</span><b>${money(pv.total)}</b></div></div>
      <h4 id="sx-pay"><span>${t('sell.s3')}</span></h4>
      <div class="card"><div class="pay"><label for="paying">${t('sell.paying')}</label><div class="payrow"><div class="in"><span>TT$</span><input id="paying" name="paying" type="text" inputmode="decimal" value="${esc(invForm.paying)}" placeholder="0.00"></div><button class="full" data-act="pay-full">${t('sell.payFull')}</button></div><div id="prev">${previewBox()}</div></div></div></div>`;
    }
    return `<div class="sx"><div class="steps"><button type="button" class="on" data-act="sx-go" data-id="items">① ${t('sell.s1')}</button><button type="button" class="${client ? 'on' : ''}" data-act="sx-go" data-id="customer">② ${t('sell.s2')}</button><button type="button" class="${client ? 'on' : ''}" data-act="sx-go" data-id="pay">③ ${t('sell.s3')}</button></div>
      <h4 id="sx-items"><span>${t('sell.items', { n: items.length })}</span>${fromOrder ? '' : `<span class="tapedit">${t('sell.tapEdit')}</span>`}</h4>
      <div class="card">${items.map(row).join('')}<div class="sub"><span>${t('sell.subtotal')}</span><b>${money(sub)}</b></div></div>
      <button type="button" class="qsadd" data-act="quick-sale">⚡ ${t('qs.add')}</button>
      <h4 id="sx-customer"><span>${t('sell.customer')}</span></h4>
      ${orderCustomerCard() || `<div class="card"><div class="srch"><span>🔍</span><input id="client" name="client" value="${esc(invForm.client)}" placeholder="${t('sell.customerPh')}" autocomplete="off" enterkeyhint="done"></div><div class="people" id="combolist">${chipRows(invForm.client)}</div></div>`}
      <h4 id="sx-pay"><span>${t('sell.s3')}</span></h4>
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
      <div class="profit costonly"><span>🔒 ${t('sell.profitPrivate')}</span><b>${money(p.profit)}</b></div>
      ${p.errors.length ? `<div class="err">${esc(t('err.' + p.errors[0]))}</div>` : `<div class="muted small" style="margin-top:8px">${t('prev.ready')}</div>`}`;
  }

  /* ---------- People ---------- */

  /* ---------- Customer log: Overview (a card per customer), Money and Items tables (the spreadsheet's Customer Log columns) ---------- */
  let cuTab = 'overview', cuStat = 'all', cuQ = '', cuSort = { col: 'owing', dir: 'desc' };
  const cuVal = (c, col) => {
    switch (col) {
      case 'name': return c.name.toLowerCase();
      case 'owing': return c.owing > 0 ? c.owing : null;
      case 'sales': return c.sales > 0 ? c.sales : null;
      case 'profit': return c.bought && c.profit !== 0 ? c.profit : null;
      case 'bought': return c.bought > 0 ? c.bought : null;
      case 'itemsOwing': return c.itemsOwing > 0 ? c.itemsOwing : null;
      case 'lastItem': return c.lastItem ? String(c.lastItem).toLowerCase() : null;
      case 'lastDate': return c.lastDate && c.lastDate.getTime() > 0 ? c.lastDate.getTime() : null;
      default: return null;
    }
  };
  const cuAl = { name: '', lastItem: 'l', lastDate: 'c' };
  const custStats = () => L.customerStats(state).map((c) => { const p = PE.byKey(state, c.name); return Object.assign(c, { p, disp: p ? p.name : c.name, label: PE.label(state, c.name, L.place(state, c.name)), phone: p ? p.phone : '' }); });
  const cdisp = (key) => PE.name(state, key);
  const clabel = (key) => PE.label(state, key, L.place(state, key));
  const pav = (c) => { const p = c.p || { id: c.name, key: c.name, phone: '' }; return `<span class="pav" style="background:${PE.color(p)}">${esc(((c.disp || c.name).trim().charAt(0) || '?').toUpperCase())}${p.phone ? `<i>${PE.last4(p.phone)}</i>` : ''}</span>`; };
  const lastSeen = (key) => { const ds = state.invoices.filter((v) => v.client === key).map((v) => new Date(v.date).getTime()); return ds.length ? new Date(Math.max(...ds)) : null; };
  const seenTxt = (key) => { const d = lastSeen(key); return d ? t('pp.lastOrder', { when: ago(d) }) : t('pp.noOrders'); };
  const townOf = (p) => L.place(state, p.key) || ((window.Store ? Store.orders() : []).filter((x) => PE.same(x.phone, p.phone)).sort((a, b) => (Store.when(b) || 0) - (Store.when(a) || 0))[0] || {}).location || '';
  const pside = (o, p, title2) => `<div class="pair"><div class="nw"><b>${t('pp.onOrder')}</b>${esc(o.name)}<br>📞 ${PE.fmt(o.phone) || '—'}${o.place ? '<br>📍 ' + esc(o.place) : ''}<br><small>${t('pp.thisOrder')}</small></div><div><b>${title2 || t('pp.yours')}</b>${esc(p.name)}<br>📞 ${esc(p.phone) || t('pp.noNumber')}${townOf(p) ? '<br>📍 ' + esc(townOf(p)) : ''}<br><small>${seenTxt(p.key)}</small></div></div>`;
  const pbtn = (id, label, cls, note) => `<button type="button" class="btn ${cls}" data-act="pp-pick" data-id="${id}">${label}</button>${note ? `<p class="pnote">${note}</p>` : ''}`;
  function askChoice(html) { return new Promise((ok) => { let done = false; window.__pp = (v) => { if (!done) { done = true; ok(v); } }; openSmall(html, 'card', () => { if (!done) { done = true; ok(''); } }); }); }
  const pcard = (title, sub, body) => `<h3>${title}</h3><p>${sub}</p>${body}`;
  // The number and place for a new customer (walk-ins and call-ins): a number is needed.
  function askPhone(name) {
    return askChoice(`<h3>${t('pp.newTitle', { name: esc(name) })}</h3><p>${t('pp.newSub')}</p><form id="f-pphone"><input name="phone" type="text" inputmode="tel" placeholder="${t('pp.number')}" autocomplete="off" required><input name="place" type="text" placeholder="${t('pp.place')}" autocomplete="off"><div class="btns"><button class="btn primary">${t('pp.save')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`).then((v) => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } });
  }
  // Who is this order from? Returns the customer key the invoice goes to ('' when you backed out). Asks only when the number and name do not already agree.
  async function resolveOrderCustomer(o) {
    if (peopleBlocked()) { toast(t('people.update')); return ''; }
    const ord = { name: L.cleanName(o.name), phone: o.phone, place: o.location || o.place || '', order: o.id || '' }, by = myName(), cls = PE.classify(state, ord);
    let key = '', ch = '';
    if (cls.kind === 'match') key = cls.profile.key;
    else if (cls.kind === 'fill') { PE.opFill(state, cls.profile.id, ord, by); key = cls.profile.key; }
    else if (cls.kind === 'new') key = PE.opFresh(state, ord, by).profile.key;
    else if (cls.kind === 'newName') {
      const p = cls.candidates[0];
      ch = await askChoice(pcard(t('pp.aTitle', { name: esc(ord.name) }), t('pp.aSub'), pside(ord, p) + pbtn('same', t('pp.same'), 'primary', t('pp.sameNoteNick', { name: esc(ord.name), who: esc(p.name) })) + pbtn('diff', t('pp.diff'), 'alt', t('pp.diffNote', { name: esc(ord.name), who: esc(p.name) })) + pbtn('shared', t('pp.shared'), 'alt', t('pp.sharedNote')) + pbtn('later', t('pp.later'), '', t('pp.laterNote'))));
      if (!ch) return '';
      key = ch === 'same' ? (PE.opSame(state, p.id, ord, by), p.key) : ch === 'diff' ? PE.opDifferent(state, p.id, ord, by).profile.key : ch === 'shared' ? PE.opShared(state, p.id, ord, by).profile.key : PE.opLater(state, ord, by, [p.id]).profile.key;
    } else if (cls.kind === 'newNumber') {
      const p = cls.candidates[0];
      ch = await askChoice(pcard(t('pp.bTitle'), t('pp.bSub'), pside(ord, p) + pbtn('same', t('pp.sameNew'), 'primary', t('pp.sameNewNote', { num: PE.fmt(ord.phone), old: esc(p.phone || t('pp.noNumber')) })) + pbtn('diff', t('pp.diffCust'), 'alt', t('pp.diffCustNote', { name: esc(ord.name) })) + pbtn('later', t('pp.later'), '', t('pp.laterNote'))));
      if (!ch) return '';
      key = ch === 'same' ? (PE.opNewNumberSame(state, p.id, ord, by), p.key) : ch === 'diff' ? PE.opNewCustomer(state, ord, by).profile.key : PE.opLater(state, ord, by, [p.id]).profile.key;
    } else if (cls.kind === 'oldNumber') {
      const p = cls.candidates[0];
      ch = await askChoice(pcard(t('pp.cTitle'), t('pp.cSub', { num: PE.fmt(ord.phone), who: esc(p.name), main: esc(p.phone || t('pp.noNumber')) }), pside(ord, Object.assign({}, p, { phone: p.phone })) + pbtn('keep', t('pp.keep'), 'primary') + pbtn('main', t('pp.makeMain'), 'alt') + pbtn('new', t('pp.newCust'), '', t('pp.newCustNote', { num: PE.fmt(ord.phone), who: esc(p.name) }))));
      if (!ch) return '';
      key = ch === 'keep' ? (PE.opOldKeep(state, p.id, ord, by), p.key) : ch === 'main' ? (PE.opOldMain(state, p.id, ord, by), p.key) : PE.opOldNew(state, p.id, ord, by).profile.key;
    }
    save(); if (o.id && window.Store) Store.patch(o.id, { cust: key }).catch(() => {});
    return key;
  }
  // A typed customer on a walk-in or call-in invoice: someone you already have, or a new customer who needs a number.
  async function resolveWalkIn(raw) {
    const name = L.cleanName(raw); if (!name || !peopleOn) return name;
    const have = PE.byKey(state, name); if (have) return have.key;
    const v = await askPhone(name); if (!v) return '';
    if (!PE.valid(v.phone)) { toast(t('pp.badPhone')); return ''; }
    return resolveOrderCustomer({ name, phone: v.phone, place: v.place });
  }
  /* "Add phone numbers": the customers who have no number yet */
  function sheetPhones() {
    enterPage('phones', '', () => sheetPhones());
    const list = PE.missingNumber(state).slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })), sug = PE.suggest(state, window.Store ? Store.orders() : []);
    const row = (p) => { const s = sug(p), town = townOf(p); return `<div class="card phc"><div class="t"><b>${esc(p.name)}</b>${town ? `<small>📍 ${esc(town)}</small>` : ''}</div><input class="pkin phin" type="text" inputmode="tel" data-phonefor="${p.id}" placeholder="${t('pp.number')}" autocomplete="off" enterkeyhint="done">${s ? `<button type="button" class="chip" data-act="phone-use" data-id="${p.id}" data-v="${esc(s)}">${t('ph.use', { num: s })}</button>` : ''}<button type="button" class="phno" data-act="no-number" data-id="${p.id}">${t('ph.none')}</button></div>`; };
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('ph.title')}</b><small>${t('ph.sub')}</small></div></div><div class="ap">${list.map(row).join('') || `<div class="empty"><b>${t('ph.done')}</b></div>`}</div>`, null, true);
  }
  async function savePhone(pid, value) {
    if (peopleBlocked()) return toast(t('people.update'));
    const r = PE.setNumber(state, pid, value, myName());
    if (r.error) return toast(t('pp.badPhone'));
    if (r.conflict) {
      const me = PE.byId(state, pid), owner = r.conflict[0];
      const ch = await askChoice(pcard(t('pp.tTitle', { who: esc(owner.name) }), t('pp.tSub', { name: esc(me.name) }), `<div class="pair"><div class="nw"><b>${t('pp.addingTo')}</b>${esc(me.name)}<br>${townOf(me) ? '📍 ' + esc(townOf(me)) + '<br>' : ''}<small>${seenTxt(me.key)}</small></div><div><b>${t('pp.alreadyHas')}</b>${esc(owner.name)}<br>${townOf(owner) ? '📍 ' + esc(townOf(owner)) + '<br>' : ''}<small>${seenTxt(owner.key)}</small></div></div>` + pbtn('merge', t('pp.merge'), 'primary') + pbtn('diff', t('pp.diff'), 'alt', t('pp.tDiffNote', { who: esc(owner.name), name: esc(me.name) }))));
      if (ch === 'merge') { try { PE.merge(state, me.id, owner.id, myName()); save(); toast(t('mg.done')); } catch (e) { toast('⚠️ ' + t('fx.cannot')); } }
      return sheetPhones();
    }
    save(); toast(t('ph.saved')); sheetPhones();
  }

  /* ---------- Fix customers: decisions, possible duplicates, missing numbers; profile tools; split and merge ---------- */
  const custMatch = (c, q) => { const x = String(q || '').trim().toLowerCase(); if (!x) return true; const p = c.p, dg = PE.digits(x); return c.name.toLowerCase().includes(x) || (c.disp || '').toLowerCase().includes(x) || String(c.lastItem || '').toLowerCase().includes(x) || !!(p && (p.nicks.some((n) => n.toLowerCase().includes(x)) || (dg.length >= 3 && ([p.phone].concat(p.prev.map((e) => e.phone))).some((n) => PE.digits(n).includes(dg))))); };
  const fxRow = (act, ic, bg, title, sub, n) => `<button class="hnr" data-act="${act}"><span class="hic" style="background:${bg}">${ic}</span><div class="t"><b>${title}</b><small>${sub}</small></div>${n ? `<span class="hcnt">${n}</span>` : ''}<span class="chev">›</span></button>`;
  const dupKey = (x) => [x.a.id, x.b.id].sort().join('|');
  const dupList = () => { const no = new Set(state.settings.dupNo || []); return PE.duplicates(state, (k) => L.place(state, k)).filter((x) => !no.has(dupKey(x))); };
  function sheetFix() {
    enterPage('fix', '', () => sheetFix());
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('fx.title')}</b><small>${t('fx.sub')}</small></div></div><div class="ap"><div class="hneeds">${fxRow('fix-decisions', '🕘', 'var(--warnbg)', t('fx.decisions'), t('fx.decisionsSub'), (state.decisions || []).filter((d) => !d.undone).length)}${fxRow('fix-dups', '👥', 'var(--infobg)', t('fx.dups'), t('fx.dupsSub'), dupList().length)}${fxRow('phones-open', '📞', 'var(--okbg)', t('fx.noNum'), t('fx.noNumSub'), PE.missingNumber(state).length)}</div><p class="muted small" style="margin:12px 2px">${t('fx.profileNote')}</p></div>`, null, true);
  }
  function sheetDecisions() {
    enterPage('fixdec', '', () => sheetDecisions());
    const list = (state.decisions || []).filter((d) => !d.undone).slice(0, 80);
    const row = (d) => `<div class="dec"><b>${esc(d.k ? t(d.k, d.a || {}) : d.text)}</b><small>${esc(dayMon(new Date(d.at)))}${d.by ? ' · ' + t('fx.by', { who: esc(d.by) }) : ''}${d.order ? ' · ' + esc(d.order) : ''}</small>${PE.canUndo(state, d.id) ? `<button type="button" class="chg" data-act="dec-undo" data-id="${d.id}">${t(d.kind === 'merge' || d.kind === 'split' ? 'fx.separate' : 'fx.change')}</button>` : `<small class="muted">${t('fx.cannot')}</small>`}</div>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('fx.decisions')}</b><small>${t('fx.decisionsSub')}</small></div></div><div class="ap">${list.length ? `<div class="card pkc">${list.map(row).join('')}</div>` : `<div class="empty"><b>${t('fx.none')}</b></div>`}</div>`, null, true);
  }
  function sheetDups() {
    enterPage('fixdup', '', () => sheetDups());
    const list = dupList(), side = (p) => `<div><b>${t('fx.customer')}</b>${esc(p.name)}<br>📞 ${esc(p.phone) || t('pp.noNumber')}<br>${townOf(p) ? '📍 ' + esc(townOf(p)) + ' · ' : ''}${tn('notif.items', state.items.filter((i) => i.customer === p.key).length)}</div>`;
    const card = (x) => `<div class="card"><div class="pair">${side(x.a)}${side(x.b)}</div><div class="rtag" style="display:inline-block;margin:0 0 6px">${t(x.why === 'number' ? 'fx.sameNumber' : x.why === 'later' ? 'fx.pending' : 'fx.similar')}</div><button type="button" class="btn primary" data-act="dup-merge" data-id="${x.a.id}" data-b="${x.b.id}">${t('fx.mergeInto', { name: esc(x.a.name) })}</button><button type="button" class="btn" data-act="dup-no" data-id="${x.a.id}" data-b="${x.b.id}" data-d="${x.decision || ''}">${t('fx.notSame')}</button></div>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('fx.dups')}</b><small>${tn('fx.pairs', list.length)}</small></div></div><div class="ap">${list.map(card).join('') || `<div class="empty"><b>${t('fx.none')}</b></div>`}</div>`, null, true);
  }
  // On a customer's page: number, nicknames, old numbers, and the tools (change number, nickname, split, merge).
  const noteTxt = (n) => { const m = /^(taken by|merged from) (.+)$/.exec(n); return n === 'replaced' ? t('pf.replaced') : m ? t(m[1] === 'taken by' ? 'pf.takenBy' : 'pf.mergedFrom', { name: m[2] }) : n; };
  function peopleBox(c) {
    const p = c.p; if (!p || !peopleOn) return '';
    const nicks = p.nicks.map((n) => `<span class="tag">${esc(n)}<button type="button" class="tx" data-act="pf-nick-del" data-id="${p.id}" data-n="${esc(n)}" aria-label="${t('pf.dropNick')}">✕</button></span>`).join('');
    const prev = p.prev.map((e) => `<div class="row"><span>${esc(e.phone)}<small>${e.until ? t('pf.until', { d: esc(dayMon(new Date(e.until))) }) : ''}${e.note ? ' · ' + esc(noteTxt(e.note)) : ''}</small></span><span class="tag warn">${t('pf.old')}</span></div>`).join('');
    return `<div class="pfbox"><div class="row"><span>📞 ${p.phone ? `<b>${esc(p.phone)}</b> <small>(${t('pf.main')})</small>` : `<span class="bad">${t('pf.noNumber')}</span>`}${p.shared ? ` <span class="tag">${t('pp.shared')}</span>` : ''}</span><button type="button" class="chip" data-act="pf-number" data-id="${p.id}">${t('pf.setNumber')}</button></div>
      <div class="row"><span>${t('pf.also')}<br>${nicks || '<small>—</small>'}</span><button type="button" class="chip" data-act="pf-nick-add" data-id="${p.id}">＋ ${t('pf.addNick')}</button></div>
      ${prev ? `<div class="row"><b>${t('pf.before')}</b></div>${prev}` : ''}
      ${(() => { const fr = p.free || { on: false, zones: [] }, zn = (fr.zones || []).map(zoneName).filter(Boolean); return `<div class="row"><span>🎁 <b>${t('fd.title')}</b><br><small>${fr.on ? (zn.length ? esc(zn.join(', ')) : t('fd.noPlaces')) : t('fd.off')}</small></span>${swt('pf-free', p.id, fr.on)}</div>${fr.on ? `<div class="row"><span class="pfrule">${t('fd.rule')}</span><button type="button" class="chip" data-act="pf-free-places" data-id="${p.id}">${t('fd.choose')}</button></div>` : ''}`; })()}
      <div class="pfb"><button type="button" class="btn" data-act="split-open" data-id="${p.id}">${t('pf.split')}</button><button type="button" class="btn" data-act="merge-open" data-id="${p.id}">${t('pf.merge')}</button></div></div>`;
  }
  function askText(title, sub, ph) {
    return askChoice(`<h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}<form id="f-pf"><input name="v" type="text" placeholder="${esc(ph || '')}" autocomplete="off" required><div class="btns"><button class="btn primary">${t('pp.save')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`).then((v) => { try { return String(v || '').trim(); } catch (e) { return ''; } });
  }
  window.__pf = (v) => { if (window.__pp) window.__pp(v); };
  async function peopleAct(a, id, el) {
    if (peopleBlocked()) return toast(t('people.update'));
    const p = PE.byId(state, id);
    if (a === 'split-open') return sheetSplit(id);
    if (a === 'merge-open') return sheetMergePick(id);
    if (!p && a !== 'split-go' && a !== 'merge-go') return;
    if (a === 'pf-free') { p.free = p.free || { on: false, zones: [] }; p.free.zones = p.free.zones || []; p.free.on = !p.free.on; if (p.free.on && !p.phone) { p.free.on = false; return toast(t('fd.needNumber')); } save(); sheetCustomer(p.key); if (p.free.on && !p.free.zones.length) sheetFreePlaces(p.id); return; }
    if (a === 'pf-free-places') return sheetFreePlaces(p.id);
    if (a === 'pf-nick-add') { const v = await askText(t('pf.addNick'), t('pf.addNickSub', { name: esc(p.name) }), t('pf.nickPh')); if (!v) return; const n = L.cleanName(v), other = PE.list(state).find((q) => q.id !== p.id && PE.nameMatch(q, n)); PE.addNickTo ? PE.addNickTo(p, n) : (p.nicks.some((x) => x.toLowerCase() === n.toLowerCase()) || n.toLowerCase() === p.name.toLowerCase() || p.nicks.push(n)); save(); toast(other ? t('pf.nickShared') : t('cust.saved')); return sheetCustomer(p.key); }
    if (a === 'pf-nick-del') { p.nicks = p.nicks.filter((x) => x !== el.dataset.n); save(); return sheetCustomer(p.key); }
    if (a === 'pf-number') { const v = await askText(t('pf.setNumber'), t('pf.numberSub', { name: esc(p.name) }), t('pp.number')); if (!v) return; const r = PE.setNumber(state, p.id, v, myName()); if (r.error) return toast(t('pp.badPhone')); if (r.conflict) { const owner = r.conflict[0]; const ch = await askChoice(pcard(t('pp.tTitle', { who: esc(owner.name) }), t('pp.tSub', { name: esc(p.name) }), pbtn('merge', t('pp.merge'), 'primary') + pbtn('diff', t('pp.diff'), 'alt', t('pp.tDiffNote', { who: esc(owner.name), name: esc(p.name) })))); if (ch === 'merge') { try { PE.merge(state, p.id, owner.id, myName()); save(); toast(t('mg.done')); return sheetCustomer(owner.key); } catch (e) { return toast('⚠️ ' + t('fx.cannot')); } } return; } save(); toast(t('ph.saved')); return sheetCustomer(p.key); }
    if (a === 'merge-go') { const b = PE.byId(state, el.dataset.b), me = PE.byId(state, id); if (!b || !me) return; const y = await askCard(t('mg.ask', { from: esc(me.name), into: esc(b.name) }), { ok: t('pp.merge') }); if (!y) return; try { PE.merge(state, me.id, b.id, myName()); save(); pageStack = pageStack.filter((x) => !/^(customer|mergepick|custedit)\|/.test(x.key)); toast(t('mg.done')); render(); return sheetCustomer(b.key); } catch (e) { return toast('⚠️ ' + t('fx.cannot')); } }
    if (a === 'split-go') {
      const nos = [...document.querySelectorAll('[data-split]:checked')].map((e) => e.dataset.split), name = L.cleanName($('#sp-name').value), phone = $('#sp-phone').value.trim();
      if (!nos.length) return toast(t('sp.needInv')); if (!name) return toast(t('pp.needName')); if (!PE.valid(phone)) return toast(t('pp.badPhone'));
      try { const r = PE.split(state, id, { nos, name, phone }, myName()); save(); pageStack = pageStack.filter((x) => !/^(customer|split|custedit)\|/.test(x.key)); toast(t('sp.done')); render(); return sheetCustomer(r.profile.key); } catch (e) { return toast('⚠️ ' + (e.message === 'totals' ? t('fx.totals') : t('fx.cannot'))); }
    }
  }
  // On an order: who the number belongs to, and whether delivery was free for them.
  const placeNorm = (v) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const storeZones = () => SCore.normZones(storeCfg().zones);
  const zoneName = (id) => { const z = storeZones().find((x) => x.id === id); return z ? z.name : ''; };
  const pinZones = (o) => (SCore.geo(o.lat, o.lng) ? SCore.zonesAt(SCore.areaZones(storeZones()), Number(o.lat), Number(o.lng)) : []);
  const pinHot = (o) => (o.option === 'delivery' && SCore.geo(o.lat, o.lng) ? SCore.hotAt(storeZones(), Number(o.lat), Number(o.lng)) : []);   // the order's pin is inside one of your high-risk spots
  // the customer whose free zones include the zone the order's pin is in (and whose main number is on the order)
  const freeProfile = (o) => { if (!peopleOn || o.option !== 'delivery') return null; const hit = pinZones(o).map((z) => z.id); return PE.mainOwners(state, o.phone).find((p) => p.free && p.free.on && (p.free.zones || []).some((id) => hit.includes(id))) || null; };
  // The zone behind the place the customer picked, how far the pin is outside it, and the place (and price) of the zone the pin is really in.
  const pickedZone = (o) => { const l = storeCfg().locations.find((x) => placeNorm(x.name) === placeNorm(o.location)); return l && l.zone ? storeZones().find((z) => z.id === l.zone && !z.risk) || null : null; };
  const pinGap = (o, z) => { const g = SCore.geo(o.lat, o.lng); return g && z ? (z.poly ? SCore.nearestZone([z], g.lat, g.lng).m : Math.max(0, Math.round(SCore.metres(g.lat, g.lng, z.lat, z.lng) - z.r))) : 0; };
  const pinPlace = (o) => { const c = storeCfg(), ids = pinZones(o).map((z) => z.id); return c.locations.find((l) => l.zone && ids.includes(l.zone) && !l.risk && !l.off && l.delivery && SCore.priceOf(c, l) > 0) || null; };
  const normalFee = (o) => { const c = storeCfg(), l = c.locations.find((x) => placeNorm(x.name) === placeNorm(o.location)), g = SCore.geo(o.lat, o.lng); return l ? (g ? SCore.feeAt(c, l, g.lat, g.lng) : SCore.priceOf(c, l)) : 0; };
  function orderWho(o) {
    if (!peopleOn || !o.phone) return '';
    const p = PE.mainOwners(state, o.phone)[0]; if (!p) return '';
    const fp = freeProfile(o);
    return `<small class="owho">👤 ${esc(clabel(p.key))}${fp ? ' · <b class="ofree">🎁 ' + t('fd.badge') + '</b>' : ''}</small>`;
  }
  function sheetFreePlaces(pid) {
    const p = PE.byId(state, pid); if (!p) return;
    const cur = (p.free && p.free.zones) || [], zs = SCore.areaZones(storeZones()).slice().sort((x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' }));
    if (!zs.length) return openSmall(`<h3>${t('fd.placesTitle', { name: esc(p.name) })}</h3><p>${t('fd.noZones')}</p><div class="btns"><button class="btn primary" data-act="zones-open">${t('zn.open')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet');
    openSmall(`<h3>${t('fd.placesTitle', { name: esc(p.name) })}</h3><p>${t('fd.placesSub')}</p><form id="f-free" data-pid="${pid}"><div class="fpl">${zs.map((z) => `<label class="tkr"><input type="checkbox" value="${esc(z.id)}" ${cur.includes(z.id) ? 'checked' : ''}><span>${esc(z.name)}</span></label>`).join('')}</div><div class="btns"><button class="btn primary">${t('pp.save')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`, 'sheet');
  }
  /* ---------- delivery regions: North / West / East / Central / South, a base fee each, growing with the pin's distance from the hub ---------- */
  const RG_COL = { N: '#7c3aed', W: '#0891b2', E: '#ea580c', C: '#16a34a', S: '#2563eb' }, RG_HUB = { N: 'Port of Spain', W: 'Carenage', E: 'Tunapuna', C: 'Chaguanas', S: 'San Fernando' };
  function rgMap(rs) {
    const R = SCore.RG, L = -62, Rr = -60.8, T = 10.95, B = 9.95, X = (g) => Math.round((g + 61.98) * 983), Y = (a) => Math.round((10.93 - a) * 1000), P = (pts) => pts.map((q) => X(q[1]) + ',' + Y(q[0])).join(' ');
    const polys = { N: [[R.y1, R.x1], [R.y1, R.x2], [T, R.x2], [T, R.x1]], W: [[R.y1, L], [R.y1, R.x1], [T, R.x1], [T, L]], E: [[R.y1, R.x2], [R.y1, R.x3], [R.y2, R.x3], [R.y2, Rr], [T, Rr], [T, R.x2]], C: [[R.y2, L], [R.y2, R.x3], [R.y1, R.x3], [R.y1, L]], S: [[B, L], [B, Rr], [R.y2, Rr], [R.y2, L]] };
    const at = { N: [10.745, -61.49], W: [10.74, -61.69], E: [10.74, -61.17], C: [10.47, -61.46], S: [10.19, -61.4] }, shape = window.TTShape || [];
    return `<svg viewBox="10 10 1110 940" class="rgmap" role="img" aria-label="${t('rg.title')}"><defs><clipPath id="rgclip"><polygon points="${P(shape)}"/></clipPath></defs><polygon points="${P(shape)}" class="rgland"/><g clip-path="url(#rgclip)">${Object.keys(polys).map((k) => `<polygon points="${P(polys[k])}" fill="${RG_COL[k]}" fill-opacity=".3" stroke="#fff" stroke-width="4"/>`).join('')}</g><polygon points="${P(shape)}" class="rgedge"/>`
      + rs.map((r) => `<circle cx="${X(r.hub[1])}" cy="${Y(r.hub[0])}" r="9" fill="#fff" stroke="${RG_COL[r.id]}" stroke-width="5"/><text x="${X(at[r.id][1])}" y="${Y(at[r.id][0])}" class="rgt" fill="${RG_COL[r.id]}">${esc(t('rg.' + r.id))}</text><text x="${X(at[r.id][1])}" y="${Y(at[r.id][0]) + 38}" class="rgs" fill="${RG_COL[r.id]}">${r.base > 0 ? esc(moneyText(r.base).replace('TT$ ', 'TT$').replace(/\.00$/, '')) : esc(t('rg.notSet'))}</text>`).join('') + '</svg>';
  }
  function sheetRegions() {
    enterPage('regions', '', () => sheetRegions());
    const c = storeCfg(), rs = c.regions, cnt = (id) => c.locations.filter((l) => l.delivery && SCore.regionOfPlace(c, l) === id).length, none = rs.every((r) => !(r.base > 0));
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('rg.title')}</b><small>${t('rg.sub')}</small></div></div>
      <div class="pd"><div class="card rgcard">${rgMap(rs)}<p class="muted small" style="margin:6px 2px 0">${t('rg.mapNote')}</p></div>
      <p class="lead" style="margin:10px 2px">${t('rg.how')}</p>
      <div class="card pkc">${rs.map((r) => `<div class="pkr"><button type="button" class="pkn" data-act="region-edit" data-id="${r.id}"><b><span class="rgdot" style="background:${RG_COL[r.id]}"></span>${t('rg.' + r.id)}</b><small>${tn('rg.placesN', cnt(r.id))} · ${t('rg.hub', { h: RG_HUB[r.id] })}</small></button><span class="pkp">${r.base > 0 ? moneyText(r.base) : t('rg.notSet')}</span></div>`).join('')}</div>
      ${!none ? `<button type="button" class="pkadd" data-act="region-all">🧭 ${t('rg.all')}</button><p class="muted small" style="margin:6px 2px">${t('rg.allSub')}</p>` : ''}${none ? `<button type="button" class="pkadd" data-act="region-suggest">✨ ${t('rg.suggest')}</button><p class="muted small" style="margin:6px 2px">${t('rg.suggestSub')}</p>` : ''}</div>`, null, true);
  }
  const rgExample = (base, free, perKm, cap) => { const km = free + 5; return base > 0 ? t('rg.ex', { km, fee: moneyText(Math.round((base + Math.min(cap, 5 * perKm)) / 5) * 5) }) : t('rg.exNone'); };
  function sheetRegion(id) {
    const c = storeCfg(), r = c.regions.find((x) => x.id === id); if (!r) return;
    enterPage('region', id, () => sheetRegion(id));
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('rg.' + id)}</b><small>${t('rg.hub', { h: RG_HUB[id] })}</small></div></div>
      <div class="ap"><div class="fld"><label for="rg-base">${t('rg.base')}</label><input id="rg-base" data-rg="1" inputmode="decimal" value="${r.base || ''}" placeholder="0" autocomplete="off" enterkeyhint="done"></div>
      <div class="fld"><label for="rg-free">${t('rg.free')}</label><input id="rg-free" data-rg="1" inputmode="decimal" value="${r.free}" autocomplete="off" enterkeyhint="done"><small>${t('rg.freeSub')}</small></div>
      <div class="fld"><label for="rg-perkm">${t('rg.perKm')}</label><input id="rg-perkm" data-rg="1" inputmode="decimal" value="${r.perKm}" autocomplete="off" enterkeyhint="done"></div>
      <div class="fld"><label for="rg-cap">${t('rg.cap')}</label><input id="rg-cap" data-rg="1" inputmode="decimal" value="${r.cap}" autocomplete="off" enterkeyhint="done"><small>${t('rg.capSub')}</small></div>
      <div class="card hotinfo" id="rg-ex">${rgExample(r.base, r.free, r.perKm, r.cap)}</div>
      <div class="btns"><button class="btn primary" data-act="region-save" data-id="${id}">${t('btn.save')}</button></div></div>`, null, true);
  }
  function sheetZones() {
    seedHot(); enterPage('zones', '', () => sheetZones());
    const c = storeCfg(), byName = (x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' }), zs = SCore.areaZones(c.zones).slice().sort(byName), hot = c.zones.filter((z) => z.risk).sort(byName);
    const row = (z) => `<div class="pkr"><button type="button" class="pkn" data-act="zone-edit" data-id="${z.id}"><b>${z.risk ? '⚠️ ' : ''}${esc(z.name)}</b><small>${z.poly ? t('zn.shapeTag', { n: z.poly.length }) : t('zn.circleTag', { km: (z.r / 1000).toFixed(1).replace(/\.0$/, '') })}</small></button></div>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('zn.title')}</b><small>${t('zn.count2', { n: zs.length, h: hot.length })}</small></div></div><div class="ap"><p class="muted small" style="margin:6px 2px 10px">${t('zn.sub')}</p>
      <div class="card pkc">${zs.map(row).join('') || `<p class="muted small">${t('zn.rowNone')}</p>`}</div>
      <button type="button" class="pkadd" data-act="zone-add">＋ ${t('zn.add')}</button>${zs.length ? '' : `<button type="button" class="pkadd" data-act="zone-starter">🇹🇹 ${t('zn.starter')}</button><p class="muted small">${t('zn.starterSub')}</p>`}
      <h4 class="pkh" style="margin-top:22px">${t('zn.hotTitle')} <span class="rtag">${hot.length}</span></h4><p class="muted small" style="margin:0 2px 8px">${t('zn.hotSub')}</p>
      <div class="card pkc">${hot.map(row).join('') || `<p class="muted small">${t('zn.hotNone')}</p>`}</div>
      <button type="button" class="pkadd" data-act="zone-add" data-risk="1">＋ ${t('zn.hotAdd')}</button>${hot.length ? '' : `<button type="button" class="pkadd" data-act="zone-starter-hot">⚠️ ${t('zn.hotStarter')}</button><p class="muted small">${t('zn.hotStarterSub')}</p>`}</div>`, null, true);
  }
  const refreshHot = () => { const k = pageStack.length ? pageStack[pageStack.length - 1].key : ''; if (k.startsWith('storeloc|')) return sheetLocation(k.split('|')[1]); return refreshPick(); };
  function openZone(id, risk, preset) {
    const c = storeCfg(), z = id && id !== 'new' ? c.zones.find((x) => x.id === id) : null;
    ZoneMap.open({ zones: c.zones, zone: z, risk: !!risk, preset: preset || null, T: { name: t('zn.name'), radius: t('zn.radius'), circle: t('zn.circle'), shape: t('zn.shape'), addCorner: t('zn.addCorner'), undo: t('zn.undo'), save: t('pp.save'), del: t('zn.del'), cancel: t('btn.cancel'), hint: t('zn.hint'), hintShape: t('zn.hintShape'), need: t('zn.need'), corners: t('zn.corners'), here: t('mp.here'), mapNoLib: t('mp.nolib'), risk: t('zn.riskLabel') },
      onSave: (nz) => {
        const cfg = storeCfg(), list = cfg.zones.slice(), i = list.findIndex((x) => x.id === nz.id), pl = preset && preset.place ? preset.place : (z && z.place) || '';
        if (nz.risk && pl) nz.place = pl;
        if (i >= 0) list[i] = nz; else list.push(nz);
        let locs = cfg.locations; if (nz.risk && pl) locs = locs.map((l) => (l.id === pl && l.risk ? Object.assign({}, l, { risk: false, off: false }) : l));   // an old "hidden" mark becomes the spot: the place shows again at its normal price
        storeSet({ zones: list, locations: locs }); toast(t(nz.risk ? 'hot.saved' : 'zn.saved')); if ($('#sheet').hidden) return; const k = pageStack.length ? pageStack[pageStack.length - 1].key : ''; if (k.startsWith('storeloc|') || k.startsWith('risk|') || k.startsWith('places|')) return refreshHot(); sheetZones();
      },
      onDelete: (zid) => askCard(t('zn.delAsk'), { danger: true, ok: t('zn.del') }).then((y) => { if (!y) return; storeSet({ zones: storeCfg().zones.filter((x) => x.id !== zid) }); PE.list(state).forEach((p) => { if (p.free && p.free.zones) p.free.zones = p.free.zones.filter((x) => x !== zid); }); save(); sheetZones(); }),
      onError: (m) => toast(m) });
  }
  function sheetSplit(pid) {
    const p = PE.byId(state, pid); if (!p) return;
    enterPage('split', pid, () => sheetSplit(pid));
    const invs = L.latestInvoices(state, p.key).sort((a, b) => new Date(b.date) - new Date(a.date));
    const row = (v) => { const o = orderOfInvoice(v.no); return `<label class="tkr"><input type="checkbox" data-split="${v.no}"><span>${esc(v.no)} · ${money(v.total)}${v.balance > 0 ? ' <span class="cu-ow">(' + t('cust.owingLabel').toLowerCase() + ')</span>' : ''}<small class="muted"> ${esc(dayMon(new Date(v.date)))}${o && o.phone ? ' · ' + esc(PE.fmt(o.phone)) : ''}</small></span></label>`; };
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('sp.title', { name: esc(p.name) })}</b><small>${t('sp.sub')}</small></div></div><div class="ap"><h4>${t('sp.tick')}</h4><div class="card pkc">${invs.map(row).join('') || `<p class="muted small">${t('cust.none')}</p>`}</div>
      <div class="card"><label for="sp-name">${t('sp.name')}</label><input id="sp-name" value="${esc(p.name)}" autocomplete="off"><label for="sp-phone">${t('sp.phone')}</label><input id="sp-phone" type="text" inputmode="tel" autocomplete="off" placeholder="${t('pp.number')}"></div>
      <div class="sum" id="sp-sum" hidden></div><div class="btns"><button class="btn primary" data-act="split-go" data-id="${pid}">${t('sp.go')}</button></div></div>`, null, true);
  }
  function splitSummary(pid) {
    const p = PE.byId(state, pid), ticks = [...document.querySelectorAll('[data-split]:checked')].map((e) => e.dataset.split), box = $('#sp-sum'); if (!box || !p) return;
    const owing = ticks.reduce((n, no) => { const v = state.invoices.find((x) => x.no === no); return n + (v ? Math.max(0, Number(v.balance) || 0) : 0); }, 0), nm = L.cleanName($('#sp-name').value), ph = PE.fmt($('#sp-phone').value);
    box.hidden = !ticks.length; box.textContent = ticks.length ? t('sp.summary', { n: ticks.length, amt: 'TT$' + owing.toFixed(2), name: nm || '…', phone: ph || '…', old: p.name }) : '';
  }
  function sheetMergePick(pid) {
    const p = PE.byId(state, pid); if (!p) return;
    enterPage('mergepick', pid, () => sheetMergePick(pid));
    const others = PE.list(state).filter((q) => q.id !== pid).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('mg.title', { name: esc(p.name) })}</b><small>${t('mg.pick')}</small></div></div><div class="ap"><div class="card pkc">${others.map((q) => `<button type="button" class="pkr tapr" data-act="merge-go" data-id="${pid}" data-b="${q.id}"><span class="pkn"><b>${esc(clabel(q.key))}</b><small>${esc(q.phone) || t('pp.noNumber')}</small></span><span class="chev">›</span></button>`).join('')}</div></div>`, null, true);
  }

  function cuMain() {
    const all = custStats(), q = cuQ.trim().toLowerCase(), base = all.filter((c) => custMatch(c, q));
    const list = base.filter((c) => cuStat === 'all' || (cuStat === 'owing') === (c.owing > 0));
    const col = cuSort.col, dir = cuSort.dir === 'asc' ? 1 : -1;
    const sorted = list.map((c) => ({ c, v: cuVal(c, col) })).sort((a, b) => { if (a.v === null && b.v === null) return a.c.name.localeCompare(b.c.name); if (a.v === null) return 1; if (b.v === null) return -1; const r = typeof a.v === 'string' ? a.v.localeCompare(b.v) : a.v - b.v; return r ? r * dir : a.c.name.localeCompare(b.c.name); }).map((x) => x.c);
    const owingN = base.filter((c) => c.owing > 0).length, dsh = '<span class="dsh">—</span>';
    const tabs = [['overview', 'bl.tabOverview'], ['money', 'cu.tabMoney'], ['items', 'cu.tabItems']];
    const chips = [['all', t('filter.all'), base.length], ['owing', t('cust.Owing'), owingN], ['ok', t('cust.UpToDate'), base.length - owingN]].map(([k, l, n]) => `<button type="button" class="itchip${cuStat === k ? ' on' : ''}" data-act="cu-chip" data-id="${k}">${l} <b>${n}</b></button>`).join('');
    const hero = `<div class="blhero i3"><div><small>${t('cu.customers')}</small><b>${list.length.toLocaleString()}</b></div><div class="ow"><small>${t('it.owing')}</small><b>${money(list.reduce((n, c) => n + c.owing, 0))}</b></div><div class="rt"><small>${t('it.sales')}</small><b>${money(list.reduce((n, c) => n + c.sales, 0))}</b></div></div>`;
    const head = `${hero}<div class="blseg">${tabs.map(([k, l]) => `<button class="${cuTab === k ? 'on' : ''}" data-act="cu-tab" data-id="${k}">${t(l)}</button>`).join('')}</div><div class="itchips" style="margin-top:12px">${chips}</div>`;
    if (!sorted.length) return `${head}<div class="empty">${t('people.noMatch')}</div>`;
    if (cuTab === 'overview') {
      return `${head}<div class="itlist">${sorted.map((c) => {
        const ow = c.owing > 0, sub = c.lastItem ? t('cu.lastBought', { item: esc(c.lastItem), d: c.lastDate && c.lastDate.getTime() > 0 ? day(c.lastDate) : '' }).replace(/ · $/, '') : (c.bought ? tn('notif.items', c.bought) : t('cu.noPurchases')), place = c.p ? townOf(c.p) : L.place(state, c.name);
        return `<div class="itc" role="button" tabindex="0" data-act="customer" data-id="${esc(c.name)}" style="--c:${ow ? '#f0b34a' : '#4fc27a'}">${peopleOn ? pav(c) : ''}<div class="t"><b>${esc(c.label)}</b>${peopleOn ? `<small>${c.phone ? '📞 ' + esc(c.phone) : '<span class="nonum">' + t('pp.noNumber') + '</span>'}${place ? ' · 📍 ' + esc(place) : ''}</small>` : ''}<small>${sub}${!peopleOn && place ? ' · 📍 ' + esc(place) : ''}</small></div><div class="e">${ow ? `<b class="cu-ow">${fmt2(c.owing)}</b><small class="itst">${t('cu.nOfOwing', { n: c.itemsOwing, m: c.bought })}</small>` : `<b class="cu-ok">${t('cust.UpToDate')}</b><small class="itst">${tn('notif.items', c.bought)}</small>`}</div></div>`; }).join('')}</div>`;
    }
    const costs = can('costs');
    const cols = cuTab === 'money' ? [['name', t('cu.h.customer')], ['owing', t('cu.h.owing')], ['sales', t('cu.h.sales')]].concat(costs ? [['profit', t('cu.h.profit')]] : [])
      : [['name', t('cu.h.customer')], ['bought', t('cu.h.bought')], ['itemsOwing', t('cu.h.itemsOwing')], ['lastItem', t('cu.h.lastItem')], ['lastDate', t('cu.h.lastDate')]];
    const cell = (c, k) => ({
      owing: `<span class="n">${c.owing > 0 ? `<span class="cu-ow">${fmt2(c.owing)}</span>` : dsh}</span>`, sales: `<span class="n">${c.sales > 0 ? fmt2(c.sales) : dsh}</span>`,
      profit: `<span class="n">${!c.bought || c.profit === 0 ? dsh : c.profit > 0 ? `<span class="gp">${fmt2(c.profit)}</span>` : `<span class="lossr">${fmt2(-c.profit)}</span>`}</span>`,
      bought: `<span class="n">${c.bought || dsh}</span>`, itemsOwing: `<span class="n">${c.itemsOwing ? `<span class="cu-ow">${c.itemsOwing}</span>` : dsh}</span>`,
      lastItem: `<span class="n l">${c.lastItem ? esc(c.lastItem) : dsh}</span>`, lastDate: `<span class="n c">${c.lastDate && c.lastDate.getTime() > 0 ? day(c.lastDate) : dsh}</span>` })[k];
    const rows = sorted.map((c) => `<div class="itr" role="button" tabindex="0" data-act="customer" data-id="${esc(c.name)}" style="--c:${c.owing > 0 ? '#f0b34a' : '#4fc27a'}"><span class="itf"><i></i><span><b>${esc(c.label)}</b><small class="itst ${c.owing > 0 ? 'itst-Owing' : 'itst-Paid'}">${custStLabel(c)}</small></span></span>${cols.slice(1).map(([k]) => cell(c, k)).join('')}</div>`).join('');
    const sum = (f) => sorted.reduce((n, c) => n + f(c), 0), tot = { owing: fmt2(sum((c) => c.owing)), sales: fmt2(sum((c) => c.sales)), bought: sum((c) => c.bought), itemsOwing: sum((c) => c.itemsOwing), profit: (() => { const v = sum((c) => c.profit); return v >= 0 ? `<span class="gp">${fmt2(v)}</span>` : `<span class="lossr">${fmt2(-v)}</span>`; })() };
    const hd = cols.map(([k, label]) => `<button type="button" class="shd${cuSort.col === k ? ' on' : ''}${cuAl[k] ? ' ' + cuAl[k] : ''}" data-act="cu-sort" data-id="${k}" aria-label="${esc(label)}">${label}${cuSort.col === k ? `<i>${cuSort.dir === 'asc' ? '▲' : '▼'}</i>` : ''}</button>`).join('');
    const tr = `<div class="itr tt"><span class="itf"><b>${t('bl.total')}</b></span>${cols.slice(1).map(([k]) => `<span class="n">${tot[k] !== undefined && tot[k] !== '' && tot[k] !== 0 ? `<b>${tot[k]}</b>` : ''}</span>`).join('')}</div>`;
    return `${head}<div class="itbox"><div class="itwrap"><div class="itt" style="--cols:${cuTab === 'money' ? '140px repeat(' + (cols.length - 1) + ',112px)' : '140px 120px 120px 150px 120px'}"><div class="itr h">${hd}</div>${rows}${tr}</div></div></div>`;
  }
  function cuRefresh() { const m = $('#cumain'); if (!m) return; const w = m.querySelector('.itwrap'), sx = w ? w.scrollLeft : 0, cx = m.querySelector('.itchips') ? m.querySelector('.itchips').scrollLeft : 0; m.innerHTML = cuMain(); const w2 = m.querySelector('.itwrap'); if (w2 && sx) w2.scrollLeft = sx; const c2 = m.querySelector('.itchips'); if (c2 && cx) c2.scrollLeft = cx; renderTools(); }
  function People() {
    if (!L.customerStats(state).length) return `<div class="empty"><b>${t('people.none')}</b>${t('people.noneText')}</div>`;
    return `<div class="oqbar"><span aria-hidden="true">🔍</span><input class="cq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('people.search'))}" aria-label="${esc(t('people.search'))}" value="${esc(cuQ)}"></div><div id="cumain">${cuMain()}</div>`;
  }

  /* ---------- Promote: pick items, make a picture (collage or one each), share it or the store link to WhatsApp, Facebook, TikTok ---------- */
  let prMode = 'pictures', prWhich = 'new', prPicks = null, prFormat = 'collage', prPrices = null, prCaption = null, prFiles = { sig: '', files: [], urls: [] }, prIdx = 0, prBusy = false;
  const PR_ICON = { whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z', facebook: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z', tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' };
  const prGlyph = (k, size) => `<svg viewBox="0 0 24 24" width="${size || 26}" height="${size || 26}" fill="#fff" aria-hidden="true"><path d="${PR_ICON[k]}"/></svg>`;
  const prPool = () => { const seen = new Set(); return state.items.filter((i) => i.photo && (i.status === 'Available' || i.status === 'In Transit') && String(i.desc || '').trim()).filter((i) => { if (!i.grp) return true; if (seen.has(i.grp)) return false; seen.add(i.grp); return true; }); };
  const prList = () => {
    const pool = prPool();
    if (prWhich === 'sale') return pool.filter((i) => L.salePrice(i) > 0);
    if (prWhich === 'new') { const nums = state.batches.slice().sort((a, b) => b.num - a.num).slice(0, 2).map((b) => b.id); return pool.filter((i) => nums.includes(i.batchId)); }
    return pool;
  };
  const prShowPrices = () => (prPrices === null ? storeCfg().showPrices : prPrices);
  const prChosen = () => { const l = prList(); if (prPicks === null) return l.slice(0, 6); return l.filter((i) => prPicks.has(i.id)); };
  const prWaNumber = () => { const c = storeCfg(); return SCore.validPhone(c.whatsapp) ? SCore.waLink(c.whatsapp) : ''; };
  function prAutoCaption() {
    const c = storeCfg(), name = c.name || bizName(), head = t(prWhich === 'sale' ? 'pr.capSale' : prWhich === 'new' ? 'pr.capNew' : 'pr.capAll', { name });
    if (prMode === 'link' || prShowPrices()) return c.id ? `${head} ${t('pr.order')} ${Store.link(c)}` : head;
    const wa = prWaNumber(); return wa ? `${head} ${t('pr.msg')} ${wa}` : head;
  }
  const prCaptionNow = () => (prCaption !== null ? prCaption : prAutoCaption());
  const loadImg = (u) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = u; });
  const cover = (g, im, x, y, w, h) => { const k = Math.max(w / im.width, h / im.height), sw = w / k, sh = h / k; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h); g.restore(); };
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const brandNow = () => (window.Theme && Theme.brand ? Theme.brand() : '#741b47');
  function pricePill(g, x, y, i, k) {   // a white pill with the price (and the old price crossed out on a sale); never a cost
    const sale = L.salePrice(i), now = plain(money(sale > 0 ? sale : Number(i.price) || 0)), was = sale > 0 ? plain(money(Number(i.price) || 0)) : '';
    g.font = `800 ${Math.round(30 * k)}px system-ui,Arial`; const w1 = g.measureText(now).width; g.font = `600 ${Math.round(22 * k)}px system-ui,Arial`; const w2 = was ? g.measureText(was).width + 14 * k : 0;
    const w = w1 + w2 + 36 * k, h = 52 * k; g.fillStyle = 'rgba(255,255,255,.96)'; rrect(g, x, y - h, w, h, h / 2); g.fill();
    g.fillStyle = brandNow(); g.textBaseline = 'middle'; g.font = `800 ${Math.round(30 * k)}px system-ui,Arial`; g.fillText(now, x + 18 * k, y - h / 2 + 1);
    if (was) { g.fillStyle = '#7b7080'; g.font = `600 ${Math.round(22 * k)}px system-ui,Arial`; const wx = x + 18 * k + w1 + 14 * k; g.fillText(was, wx, y - h / 2 + 1); g.fillRect(wx, y - h / 2 + 1, g.measureText(was).width, 2 * k); }
  }
  const toBlob = (cv) => new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.9));
  async function prMake() {   // the pictures to share: one collage, or one picture per item
    const list = prChosen(), prices = prShowPrices(), c = storeCfg(), name = c.name || bizName(), sub = t(prWhich === 'sale' ? 'pr.subSale' : prWhich === 'new' ? 'pr.subNew' : 'pr.subAll');
    const foot = prices ? t('pr.footPrices') : t('pr.footMsg'), imgs = await Promise.all(list.map((i) => PUI.url(i.photo.id, 'full').then((u) => (u ? loadImg(u) : null)).then((im) => im || PUI.url(i.photo.id, 'thumb').then((u) => (u ? loadImg(u) : null)))));
    const items = list.map((i, n) => ({ i, im: imgs[n] })).filter((x) => x.im), out = [], lg = state.settings.bizLogo ? await loadImg(state.settings.bizLogo).catch(() => null) : null, circ = (g, x, y, r) => { if (!lg) return; g.save(); g.beginPath(); g.arc(x + r, y + r, r, 0, 6.2832); g.closePath(); g.clip(); g.drawImage(lg, x, y, r * 2, r * 2); g.restore(); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(x + r, y + r, r, 0, 6.2832); g.stroke(); };
    if (!items.length) return out;
    if (prFormat === 'each') {
      for (const { i, im } of items) { const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 1080, 1350); cover(g, im, 0, 0, 1080, 1350);
        const gr = g.createLinearGradient(0, 1000, 0, 1350); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.65)'); g.fillStyle = gr; g.fillRect(0, 1000, 1080, 350);
        g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; g.font = '800 48px system-ui,Arial'; g.fillText(dn(i), 40, 1262, 1000); g.font = '600 28px system-ui,Arial'; g.fillText(name, 40, 1310, 1000);
        circ(g, 40, 40, 48);
        if (prices && (Number(i.price) > 0 || L.salePrice(i) > 0)) pricePill(g, 40, 1212, i, 1);
        out.push(new File([await toBlob(cv)], 'promo-' + i.id + '.jpg', { type: 'image/jpeg' })); }
      return out;
    }
    const n = Math.min(items.length, 6), odd = n % 2 === 1, rows = Math.ceil(n / 2), cw = 530, ch = n === 1 ? 1100 : 660, W = 1080, H = 170 + (n === 1 ? ch + 16 : rows * (ch + 8) + 8) + 100, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const hg = g.createLinearGradient(0, 0, W, 170); hg.addColorStop(0, brandNow()); hg.addColorStop(1, '#2a0b1d'); g.fillStyle = hg; g.fillRect(0, 0, W, 170);
    g.fillStyle = '#fff'; g.textBaseline = 'alphabetic'; const tx = lg ? 176 : 40; circ(g, 40, 37, 48); g.font = '800 60px system-ui,Arial'; g.fillText(name, tx, 84, 1040 - tx); g.font = '600 30px system-ui,Arial'; g.globalAlpha = .85; g.fillText(sub, tx, 130, 1040 - tx); g.globalAlpha = 1;
    items.slice(0, n).forEach(({ i, im }, k) => { const last = odd && k === n - 1, x = last ? 8 : 8 + (k % 2) * (cw + 8), y = 170 + 8 + Math.floor(k / 2) * (ch + 8), w = last ? W - 16 : cw; cover(g, im, x, y, w, ch); if (prices && (Number(i.price) > 0 || L.salePrice(i) > 0)) pricePill(g, x + 16, y + ch - 16, i, 1); });   // an odd last picture spreads across the whole width
    g.fillStyle = brandNow(); g.textAlign = 'center'; g.font = '700 32px system-ui,Arial'; g.fillText(foot, W / 2, H - 38, 1000); out.push(new File([await toBlob(cv)], 'promo-' + Date.now() + '.jpg', { type: 'image/jpeg' }));
    return out;
  }
  function prSig() { return [prFormat, prShowPrices(), prChosen().map((i) => i.id + ':' + (i.price || '') + ':' + (i.discount || '') + ':' + (i.saleOn ? 1 : 0)).join(','), (storeCfg().name || ''), (state.settings.bizLogo || '').length].join('|'); }
  async function prEnsure() { const sig = prSig(); if (prFiles.sig === sig && prFiles.files.length) return prFiles.files; const files = await prMake(); (prFiles.urls || []).forEach((u) => URL.revokeObjectURL(u)); prFiles = { sig, files, urls: files.map((f) => URL.createObjectURL(f)) }; prIdx = Math.min(prIdx, Math.max(0, files.length - 1)); return files; }
  let prTimer = null;
  function prPreview() { clearTimeout(prTimer); prTimer = setTimeout(async () => { const box = $('#prprev'); if (!box || prMode !== 'pictures') return; if (!prChosen().length) { box.innerHTML = ''; return; } box.innerHTML = `<div class="muted small">${t('pr.making')}</div>`; try { await prEnsure(); const b2 = $('#prprev'); if (b2 && prFiles.urls.length) { const n = prFiles.urls.length, many = prFormat === 'each' && n > 1; b2.innerHTML = `<div class="prcar">${many ? `<button type="button" class="prar l" data-act="pr-prev" aria-label="${t('nav.prev')}">‹</button>` : ''}<img src="${prFiles.urls[prIdx] || prFiles.urls[0]}" alt="" class="prpimg" data-prswipe="1">${many ? `<button type="button" class="prar r" data-act="pr-next" aria-label="${t('nav.next')}">›</button>` : ''}</div><div class="muted small" style="margin-top:6px">${prFormat === 'each' ? (many ? (prIdx + 1) + ' / ' + n : tn('pr.pictures', n)) : t('pr.oneCollage')}</div>`; } } catch (e) { /* the preview is optional */ } }, 250); }
  function prRefresh() { const el = $('#promote'); if (!el) return; el.innerHTML = prBody(); PUI.hydrate(); prPreview(); }
  function prBody() {
    const c = storeCfg(), list = prList(), chosen = prChosen(), sel = new Set(chosen.map((i) => i.id)), prices = prShowPrices();
    const chip = (act, id, label, on) => `<button type="button" class="itchip${on ? ' on' : ''}" data-act="${act}" data-id="${id}">${label}</button>`;
    const grid = list.slice(0, 60).map((i) => `<button type="button" class="prt${sel.has(i.id) ? ' on' : ''}" data-act="pr-pick" data-id="${esc(i.id)}" aria-label="${esc(dn(i))}" aria-pressed="${sel.has(i.id)}">${PUI.thumb(i)}</button>`).join('');
    const plat = (k, label, bg) => `<button type="button" class="prp" data-act="pr-share" data-id="${k}"><i style="background:${bg}">${k === 'more' ? '⋯' : prGlyph(k)}</i>${label}</button>`;
    const noStore = !c.id;
    return `<div class="prseg"><button type="button" class="${prMode === 'pictures' ? 'on' : ''}" data-act="pr-mode" data-id="pictures">${t('pr.pictures')}</button><button type="button" class="${prMode === 'link' ? 'on' : ''}" data-act="pr-mode" data-id="link">${t('pr.storeLink')}</button></div>
      ${prMode === 'pictures' ? `<div class="hsec"><h3>${t('pr.choose')}</h3></div><div class="itchips" style="margin:0 0 6px">${chip('pr-which', 'new', t('pr.new'), prWhich === 'new')}${chip('pr-which', 'sale', t('pr.sale'), prWhich === 'sale')}${chip('pr-which', 'all', t('pr.all'), prWhich === 'all')}${chip('pr-which', 'picks', t('pr.picks'), prWhich === 'picks')}</div>
        ${list.length ? `<div class="prgrid">${grid}</div><div class="muted small" style="margin:6px 2px 0">${t('pr.n', { n: chosen.length })}</div>` : `<div class="empty">${t('pr.noItems')}</div>`}
        <div class="hsec"><h3>${t('pr.options')}</h3></div>
        <div class="rw2 prrow"><div class="t"><b>${t('pr.showPrices')}</b><small>${t('pr.showPricesSub')}</small></div>${swt('pr-prices', 'x', prices)}</div>
        <div class="hsec"><h3>${t('pr.format')}</h3></div><div class="itchips" style="margin:0">${chip('pr-format', 'collage', t('pr.collage'), prFormat === 'collage')}${chip('pr-format', 'each', t('pr.each'), prFormat === 'each')}</div>
        <div id="prprev" class="prprev"></div>` : `<div class="hsec"><h3>${t('pr.linkHead')}</h3></div>${noStore ? `<div class="warn"><span style="font-size:20px">🏪</span><div><b>${t('pr.noStore')}</b></div><button class="fx" data-act="store-open">${t('hub.fix')}</button></div>` : `<div class="prlink">${esc(Store.link(c))}</div>`}`}
      <div class="hsec"><h3>${t('pr.caption')}</h3></div><textarea id="pr-cap" class="prcap" rows="4" spellcheck="true">${esc(prCaptionNow())}</textarea>
      <div class="hsec"><h3>${t('pr.shareTo')}</h3></div><div class="prplat">${plat('whatsapp', 'WhatsApp', '#25D366')}${plat('facebook', 'Facebook', '#0866FF')}${plat('tiktok', 'TikTok', '#000')}${plat('more', t('pr.more'), 'var(--tint)')}</div>
      <div class="prplat prsec2"><button type="button" class="btn" data-act="pr-copy">📋 ${t('pr.copy')}</button>${prMode === 'pictures' ? `<button type="button" class="btn" data-act="pr-save">⬇️ ${t('pr.save')}</button>` : ''}</div>
      <p class="muted small" style="margin:12px 2px 0">${t('pr.waHint')}</p><div style="height:90px"></div>`;
  }
  function Promote() { return `<div id="promote">${prBody()}</div>`; }
  async function prShare(k) {
    const c = storeCfg(), text = prCaptionNow(), link = c.id ? Store.link(c) : '', name = c.name || bizName(), enc = encodeURIComponent;
    if (prMode === 'link') {
      if (!link) return toast(t('pr.noStore'));
      if (k === 'whatsapp') return void window.open('https://wa.me/?text=' + enc(text), '_blank', 'noopener');
      if (k === 'facebook') return void window.open('https://www.facebook.com/sharer/sharer.php?u=' + enc(link), '_blank', 'noopener');
      if (k === 'tiktok') return copyText(link).then(() => toast(t('pr.ttLink')));
      if (navigator.share) return navigator.share({ title: name, text, url: link }).catch((e) => { if (e && e.name !== 'AbortError') toast('⚠️ ' + errMsg(e)); });
      return copyText(text).then(() => toast(t('store.copied')));
    }
    if (!prChosen().length) return toast(t('pr.noItems'));
    if (prBusy) return; prBusy = true; toast(t('pr.making'));
    try {
      const files = await prEnsure(); if (!files.length) return toast(t('pr.noItems'));
      if (navigator.canShare && navigator.canShare({ files })) { await navigator.share({ files, text, title: name }).catch((e) => { if (e && e.name !== 'AbortError') throw e; }); return; }
      files.forEach((f) => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); });   // no share sheet here: the pictures are saved instead
      if (k === 'whatsapp') window.open('https://wa.me/?text=' + enc(text), '_blank', 'noopener');
      toast(t('pr.saved'));
    } catch (e) { toast('⚠️ ' + errMsg(e)); } finally { prBusy = false; }
  }

  /* ---------- Invoice log: four tabs like the Batch Log. Overview, Money and Profit / Loss carry the spreadsheet's columns; Items shows each invoice's thumbnails ---------- */
  let invTab = 'overview', invQ = '', invSort = { col: 'inv', dir: 'desc' };   // Profit / Loss tab: newest invoice on top until a column title is tapped
  const IL_COL = { Paid: '#4fc27a', Owing: '#f0b34a', Updated: '#6c7bb5', Returned: '#8c7f91', Cancelled: '#8c7f91' };
  const invEff = (v) => (v.void ? Object.assign({}, v, v.void.was) : v);   // a returned invoice keeps its old amounts in void.was
  const invFind = (q) => { const x = String(q || '').trim().toLowerCase(), all = L.filterInvoices(state, flt).slice().reverse(); return x ? all.filter((v) => [v.no, v.client, v.desc].some((f) => String(f || '').toLowerCase().includes(x))) : all; };
  const invLiveOnly = (v) => !v.void && !v.updatedBy;   // the totals count each purchase once
  const ilDay = (d) => (d ? day(d) : '');
  function invoiceLogRows(q) {
    const list = invFind(q);
    if (!list.length) return `<div class="opanel"><div class="oempty"><span class="em">🧾</span><span>${String(q || '').trim() ? t('ord.noMatch', { q: esc(String(q).trim()) }) : t('invoices.none')}</span></div></div>`;
    const live = list.filter(invLiveOnly), sum = (f) => live.reduce((n, v) => n + (Number(f(v)) || 0), 0), dsh = '<span class="dsh">—</span>', amt = (n) => (Number(n) > 0 ? fmt2(n) : dsh);
    const invN = (v) => parseInt(String(v.no).replace(/\D/g, ''), 10) || 0;
    const sortList = (src, val) => src.slice().sort((a, b2) => { if (invSort.col === 'inv') return invSort.dir === 'asc' ? invN(a) - invN(b2) : invN(b2) - invN(a);
      const x = val(a), y = val(b2); if (x > 0 && y > 0) return x !== y ? (invSort.dir === 'desc' ? y - x : x - y) : invN(a) - invN(b2); if (x > 0) return -1; if (y > 0) return 1; return invN(a) - invN(b2); });   // rows with nothing in that column come last, lowest invoice number first
    const shd = (col, label, cost) => `<button type="button" class="shd${invSort.col === col ? ' on' : ''}${cost ? ' costonly' : ''}" data-act="inv-sort" data-id="${col}" aria-label="${esc(label)}"${invSort.col === col ? ` aria-sort="${invSort.dir === 'asc' ? 'ascending' : 'descending'}"` : ''}>${label}${invSort.col === col ? `<i>${invSort.dir === 'asc' ? '▲' : '▼'}</i>` : ''}</button>`;
    if (invTab === 'money') {
      const mf = { total: 'total', paid: 'amountPaid', prev: 'previouslyPaid', bal: 'balance', dlv: 'delivery' };
      const msorted = sortList(list, (v0) => Math.max(0, Number(invEff(v0)[mf[invSort.col]]) || 0));
      const rows = msorted.map((v0) => { const v = invEff(v0), st = L.invoiceStatus(v0), dim = v0.void || v0.updatedBy;
        return `<div class="tr s-${st}${dim ? ' dim' : ''}" role="button" tabindex="0" data-act="view-inv" data-id="${v0.no}"><span class="inum" style="--stripe:${IL_COL[st]}"><b>${esc(v0.no)}</b><small>${invStLabel(st)}</small></span><span class="n">${fmt2(v.total)}</span><span class="n">${amt(v.amountPaid)}</span><span class="n">${amt(v.previouslyPaid)}</span><span class="n">${v.balance > 0 ? `<span class="ow">${fmt2(v.balance)}</span>` : dsh}</span><span class="n">${amt(v0.delivery)}</span></div>`; }).join('');
      const bal = sum((v) => v.balance);
      return `<div class="imbox"><div class="imhd" id="imhd"><div class="bltbl im"><div class="tr h">${shd('inv', t('il.h.invoice'))}${shd('total', t('il.h.total'))}${shd('paid', t('il.h.paid'))}${shd('prev', t('il.h.prev'))}${shd('bal', t('il.h.balance'))}${shd('dlv', t('il.h.delivery'))}</div></div></div><div class="imwrap" id="imwrap"><div class="bltbl im">${rows}<div class="tr t"><span>${t('bl.total')}</span><span class="n">${fmt2(sum((v) => v.total))}</span><span class="n">${fmt2(sum((v) => v.amountPaid))}</span><span class="n">${fmt2(sum((v) => v.previouslyPaid))}</span><span class="n">${bal > 0 ? `<span class="ow">${fmt2(bal)}</span>` : dsh}</span><span class="n">${fmt2(sum((v) => v.delivery))}</span></div></div></div></div><p class="muted small" style="margin:10px 2px">${t('il.moneyNote')}</p>`;
    }
    if (invTab === 'pl') {
      const plf = { profit: 'profit', loss: 'loss', tip: 'tip' };
      const sorted = sortList(list, (v0) => { const v = invEff(v0), n = Number(v[plf[invSort.col]]) || 0; return invSort.col === 'loss' ? Math.abs(n) : Math.max(0, n); });
      const rows = sorted.map((v0) => { const v = invEff(v0), st = L.invoiceStatus(v0), dim = v0.void || v0.updatedBy;
        return `<div class="tr s-${st}${dim ? ' dim' : ''}" role="button" tabindex="0" data-act="view-inv" data-id="${v0.no}"><i class="st" style="background:${IL_COL[st]}"></i><span class="inum"><b>${esc(v0.no)}</b><small>${invStLabel(st)}</small></span><span class="n costonly">${Number(v.profit) > 0 ? `<span class="pos">${fmt2(v.profit)}</span>` : dsh}</span><span class="n costonly">${Number(v.loss) !== 0 ? `<span class="lossr">${fmt2(Math.abs(Number(v.loss)))}</span>` : dsh}</span><span class="n costonly">${amt(v.tip)}</span></div>`; }).join('');
      const lossAll = list.reduce((n, v0) => n + Math.abs(Number(invEff(v0).loss) || 0), 0), net = sum((v) => v.profit) - lossAll;
      return `<div class="bltbl ipl"><div class="tr h">${shd('inv', t('il.h.invoice'))}${shd('profit', t('il.h.profit'), true)}${shd('loss', t('il.h.loss'), true)}${shd('tip', t('il.h.tip'), true)}</div>${rows}<div class="tr t"><span>${t('bl.total')}</span><span class="n costonly"><span class="pos">${fmt2(sum((v) => v.profit))}</span></span><span class="n costonly"><span class="lossr">${fmt2(lossAll)}</span></span><span class="n costonly">${fmt2(sum((v) => v.tip))}</span></div></div><div class="netl costonly"><span>${t('il.net')}</span><b class="${net < 0 ? 'lossr' : 'pos'}">${money(net)}</b></div><p class="muted small" style="margin:10px 2px">${t('il.plNote')}</p>`;
    }
    if (invTab === 'items') {
      return list.map((v0) => { const st = L.invoiceStatus(v0), col = IL_COL[st], pu = L.purchaseOf(state, v0.no), its = (v0.void ? ((pu && pu.inv.void && pu.inv.void.items) || v0.void.items || []).map((r) => state.items.find((x) => x.id === r.id)) : pu ? pu.items : []).filter(Boolean).sort((a, b2) => (a.id < b2.id ? -1 : 1));
        const th = its.map((i) => `<button type="button" class="blth" data-act="edit-item" data-id="${esc(i.id)}" data-inv="${esc(pu ? pu.inv.no : v0.no)}" aria-label="${esc(dn(i) || i.id)}"><span class="blp">${i.photo ? `<img data-ph="${esc(i.photo.id)}" data-kind="thumb" alt="">` : `<em>${esc(String(i.id).split('-').pop())}</em>`}<span class="blpr">${Number(i.sold) > 0 || Number(i.price) > 0 ? fmt2(Number(i.sold) > 0 ? i.sold : L.salePrice(i) || i.price) : '—'}</span></span><small>${esc(i.id)}</small></button>`).join('');
        return `<div class="bli${v0.void ? ' dim' : ''}" role="button" tabindex="0"><i class="stripe" style="background:${col}"></i><div class="blh" data-act="view-inv" data-id="${v0.no}"><b>${esc(v0.no)} · ${esc(clabel(v0.client))}</b><span class="chip2 s-${st}">${invStLabel(st)}</span><small>${tn('notif.items', its.length || Number(v0.qty) || 0)}</small></div>${its.length ? `<div class="blrail">${th}</div>` : `<div class="muted small">${t('il.noItems')}</div>`}</div>`; }).join('');
    }
    return list.map((v0) => { const v = invEff(v0), st = L.invoiceStatus(v0), col = IL_COL[st], paidPct = v.total > 0 ? Math.max(0, Math.min(100, Math.round((v.total - v.balance) / v.total * 100))) : 0, qty = Number(v0.qty) || invLines(v0).reduce((n, l) => n + (Number(l.qty) || 0), 0);
      const desc = I.getLang() === 'es' ? (() => { try { return invLines(v0).map((l) => lineName(l, 'es')).join(', ') || v0.desc; } catch (e) { return v0.desc; } })() : v0.desc;
      const tags = [tn('notif.items', qty), v0.void ? t(v0.void.kind === 'cancelled' ? 'il.cancelledOn' : 'il.returnedOn', { d: ilDay(v0.void.date) }) : t('il.invoiced', { d: ilDay(v0.date) }), !v0.void && !v0.updatedBy && v0.due && v.balance > 0 ? t('il.due', { d: ilDay(v0.due) }) : '', v0.updatedBy ? t('il.updatedTo', { no: esc(v0.updatedBy) }) : ''].filter(Boolean);
      return `<div class="blr${v0.void ? ' cl' : ''}" role="button" tabindex="0" data-act="view-inv" data-id="${v0.no}"><i class="stripe" style="background:${col}"></i>
        <span class="ring" style="background:conic-gradient(${col} ${(v0.void ? 100 : paidPct) * 3.6}deg,color-mix(in srgb,var(--line) 80%,transparent) 0)"><b>${v0.void ? '↩' : v0.updatedBy ? '↻' : paidPct + '%'}</b></span>
        <div class="mid"><div class="nm">${esc(v0.no)} · ${esc(clabel(v0.client))}</div><div class="sub idesc">${esc(desc)}</div><div class="itags">${tags.map((x) => `<span>${x}</span>`).join('')}</div></div>
        <div class="rt"><b class="ist s-${st}">${invStLabel(st)}</b>${v.balance > 0 && !v0.updatedBy ? `<small class="owes">${t('il.owes', { amt: fmt2(v.balance) })}</small>` : ''}<small class="invt${v0.void ? ' x' : ''}">${money(v.total)}</small></div></div>`; }).join('');
  }
  // the Money table: its title row sticks under the app bar while the page scrolls, and slides sideways together with the rows
  const syncAppbarH = () => { const h = document.querySelector('.appbar'); if (h) document.documentElement.style.setProperty('--ah', h.getBoundingClientRect().height + 'px'); };
  window.addEventListener('resize', syncAppbarH);
  document.addEventListener('scroll', (e) => { const w = e.target; if (w && w.id === 'imwrap') { const h = document.getElementById('imhd'); if (h) h.scrollLeft = w.scrollLeft; } }, true);
  function InvoiceLog() {
    const all = L.filterInvoices(state, flt).filter(invLiveOnly), billed = all.reduce((n, v) => n + (Number(v.total) || 0), 0), bal = all.reduce((n, v) => n + (Number(v.balance) || 0), 0);
    const ifb = filtered() ? filterBar(filterLabel(), 'filter', 'filter-clear-all', t('fil.invoices', { x: all.length, y: state.invoices.filter(invLiveOnly).length })) : '';
    return `${ifb}<div class="blhero i3"><div><small>${t('il.billed')}</small><b>${money(billed)}</b></div><div class="pg"><small>${t('il.paid')}</small><b>${money(billed - bal)}</b></div><div class="ow"><small>${t('il.balDue')}</small><b>${money(bal)}</b></div></div>
      <div class="oqbar" style="margin-top:2px"><span aria-hidden="true">🔍</span><input class="iq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('tool.search'))}" aria-label="${esc(t('tool.search'))}" value="${esc(invQ)}"></div>
      <div class="blseg">${[['overview', 'bl.tabOverview'], ['money', 'il.tabMoney'], ['pl', 'bl.tabPL'], ['items', 'bl.tabItems']].map(([k, l]) => `<button class="${invTab === k ? 'on' : ''}" data-act="inv-tab" data-id="${k}">${t(l)}</button>`).join('')}</div>
      <div id="ilog">${invoiceLogRows(invQ)}</div>`;
  }

  /* ---------- More ---------- */

  function More() {
    if (moreView === 'invoices') return InvoiceLog();
    if (moreView === 'items') return ItemLog();
    if (moreView === 'batches') return BatchLog();
    if (moreView === 'orders') return OrderLog();
    if (moreView === 'deliveries') { if (window.Store && dset().home) Store.measure(dset().home); return DeliveryLog(); }
    if (moreView === 'summary') return Summary();
    if (moreView === 'settings') return Settings();
    if (moreView && moreView.startsWith('set-')) return SettingsPage();
    const go = (v, icon, label, sub) => `<button class="row tap" data-act="more" data-id="${v}"><span style="font-size:22px">${icon}</span><div class="grow"><b>${label}</b><small>${sub}</small></div><span class="chev">›</span></button>`;
    const act = (a, icon, label, sub, bad) => `<button class="row tap" data-act="${a}"><span style="font-size:22px">${icon}</span><div class="grow"><b${bad ? ' class="bad"' : ''}>${label}</b><small>${sub}</small></div></button>`;
    return `<div class="list">${go('invoices', '🧾', t('more.invoices'), t('more.invoicesSub', { n: state.invoices.length }))}${(() => { const cs = L.customerStats(state); return `<button class="row tap" data-act="goto-customers"><span style="font-size:22px">👥</span><div class="grow"><b>${t('cu.title')}</b><small>${t('cu.moreSub', { n: cs.length, m: cs.filter((c) => c.owing > 0).length })}</small></div><span class="chev">›</span></button>`; })()}${can('orders') ? go('deliveries', '🚚', t('more.deliveries'), t('more.deliveriesSub', { n: window.Store ? Store.orders().filter((o) => o.status === 'confirmed' && o.option === 'delivery').length : 0 })) : ''}${can('orders') ? go('orders', '🛍️', t('more.orders'), t('more.ordersSub', { n: window.Store ? Store.orders().length : 0 })) : ''}${go('batches', '📦', t('more.batches'), t('more.batchesSub', { n: state.batches.length }))}${go('items', '📋', t('more.items'), t('more.itemsSub', { n: state.items.length }))}
      ${can('costs') ? go('summary', '📈', t('more.summary'), t('more.summarySub')) : ''}${act('words-open', '🔤', t('words.title'), t('words.sub'))}${go('settings', '⚙️', t('more.settings'), t('more.settingsSub'))}</div>
      ${isStandalone() ? '' : `<div class="list" style="margin-top:8px"><button class="row tap" data-act="install-guide"><span style="font-size:22px">📲</span><div class="grow"><b>${t('more.install')}</b><small>${isIOS ? t('more.installIOS') : t('more.installOther')}</small></div><span class="chev">›</span></button></div>`}
      <p class="muted small" style="text-align:center;margin-top:20px">${t('more.local')}<br><span id="ver"></span></p>`;
  }

  const dayLong = (d) => { const v = new Date(d); if (isNaN(v)) return ''; const m = v.toLocaleDateString(I.locale(I.getLang()), { month: 'short' }).replace(/\./g, ''); return String(v.getDate()).padStart(2, '0') + ' ' + m.charAt(0).toUpperCase() + m.slice(1) + ' ' + v.getFullYear(); };   // 12 Oct 2026: three letters, capital first letter
  // Batch Log: three tabs (Overview cards, Profit / Loss table, Owing table), a filter with several choices, and the search box
  let blSort = { col: 'batch', dir: 'desc' };   // Profit / Loss and Owing tabs: newest batch on top until a column title is tapped
  let blTab = 'overview', blF = { store: [], status: [], items: [] }, blDraft = null;
  const BL_COL = { 'In Transit': '#f0b34a', Received: '#4fc27a', Closed: '#8c7f91' };
  const blCount = (f) => f.store.length + f.status.length + f.items.length;
  const blPass = (b, f) => {
    const inStore = storeCfg().batches.includes(b.id), bs = bStatus(b), left = L.batchStats(state, b).left > 0, any = (arr, test) => !arr.length || arr.some(test);
    return any(f.store, (k) => (k === 'in') === inStore) && any(f.status, (k) => ({ transit: 'In Transit', received: 'Received', closed: 'Closed' }[k] === bs)) && any(f.items, (k) => (k === 'avail') === left);
  };
  const blList = (q) => L.batchSearch(state.batches, q).filter(({ b }) => blPass(b, blF));
  const fmt2 = (n) => '<span class="amt">' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>';   // wrapped so the eye button blurs it with the other amounts
  const signed2 = (n) => (n < 0 ? '−' : '') + fmt2(Math.abs(n));
  const blShort = (id) => { const x = String(bl(id)), m = x.match(/^([A-Za-zÁÉÍÓÚÑ]+)-?(\d+)$/); return m ? m[1].charAt(0) + m[1].slice(1).toLowerCase() + ' ' + m[2] : x; };
  const blRow = (b, inner) => `<div class="tr" role="button" tabindex="0" data-act="batch" data-id="${b.id}"><i class="st" style="background:${BL_COL[bStatus(b)] || BL_COL.Closed}"></i><b>${esc(blShort(b.id))}</b>${inner}</div>`;
  const dash = '<span class="dsh">—</span>';
  const dayTxt = (n) => t(n === 1 ? 'bl.day1' : 'bl.days', { n });
  function batchLogRows(q) {
    const res = blList(q);
    if (!res.length) return `<div class="empty">${blCount(blF) && !String(q || '').trim() ? t('bl.noMatch') : t('bp.none', { q: esc(String(q || '').trim()) })}</div>`;
    const c = storeCfg();
    const bN = (b) => parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
    const bshd = (col, label, cost) => `<button type="button" class="shd${blSort.col === col ? ' on' : ''}${cost ? ' costonly' : ''}" data-act="bl-sort" data-id="${col}" aria-label="${esc(label)}"${blSort.col === col ? ` aria-sort="${blSort.dir === 'asc' ? 'ascending' : 'descending'}"` : ''}>${label}${blSort.col === col ? `<i>${blSort.dir === 'asc' ? '▲' : '▼'}</i>` : ''}</button>`;
    const bsort = (list, val, signed) => list.slice().sort((x, y) => { if (blSort.col === 'batch') return blSort.dir === 'asc' ? bN(x.b) - bN(y.b) : bN(y.b) - bN(x.b);
      const a = val(x.b), b2 = val(y.b); if (signed) return a !== b2 ? (blSort.dir === 'desc' ? b2 - a : a - b2) : bN(x.b) - bN(y.b);
      if (a > 0 && b2 > 0) return a !== b2 ? (blSort.dir === 'desc' ? b2 - a : a - b2) : bN(x.b) - bN(y.b); if (a > 0) return -1; if (b2 > 0) return 1; return bN(x.b) - bN(y.b); });   // batches with nothing in that column come last
    if (blTab === 'pl') {
      let ti = 0, ts = 0;
      const plv = { invested: (b) => L.batchStats(state, b).investment, sales: (b) => L.batchStats(state, b).sales, pl: (b) => L.batchStats(state, b).net };
      const rows = bsort(res, plv[blSort.col] || (() => 0), blSort.col === 'pl').map(({ b }) => { const st = L.batchStats(state, b); ti += st.investment; ts += st.sales; return blRow(b, `<span class="n costonly">${fmt2(st.investment)}</span><span class="n">${fmt2(st.sales)}</span><span class="n costonly ${st.net < 0 ? 'neg' : 'pos'}">${signed2(st.net)}</span>`); }).join('');
      const tn2 = Math.round((ts - ti) * 100) / 100;
      return `<div class="bltbl pl"><div class="tr h">${bshd('batch', t('bl.h.batch'))}${bshd('invested', t('bl.h.invested'), true)}${bshd('sales', t('bl.h.sales'))}${bshd('pl', t('bl.h.pl'), true)}</div>${rows}<div class="tr t"><span>${t('bl.total')}</span><span class="n costonly">${fmt2(ti)}</span><span class="n">${fmt2(ts)}</span><span class="n costonly ${tn2 < 0 ? 'neg' : 'pos'}">${signed2(tn2)}</span></div></div><p class="blnote">${t('bl.note.pl')}</p>`;
    }
    if (blTab === 'owing') {
      const owv = { owing: (b) => L.batchOwing(state, b).owing, people: (b) => L.batchOwing(state, b).people, waiting: (b) => { const o = L.batchOwing(state, b); return o.owing > 0 && o.oldestDays !== null ? o.oldestDays + 1 : 0; } };
      const rows = bsort(res, owv[blSort.col] || (() => 0)).map(({ b }) => { const o = L.batchOwing(state, b); return blRow(b, `<span class="n">${o.owing > 0 ? `<span class="ow">${fmt2(o.owing)}</span>` : dash}</span><span class="n">${o.people ? o.people : dash}</span><span class="n">${o.oldestDays !== null && o.owing > 0 ? `<span class="${o.oldestDays > 10 ? 'neg' : ''}">${dayTxt(o.oldestDays)}</span>` : dash}</span>`); }).join('');
      const tot = L.owingFor(state, res.map((x) => x.b));
      return `<div class="bltbl ow"><div class="tr h">${bshd('batch', t('bl.h.batch'))}${bshd('owing', t('bl.h.owing'))}${bshd('people', t('bl.h.people'))}${bshd('waiting', t('bl.h.waiting'))}</div>${rows}<div class="tr t"><span>${t('bl.total')}</span><span class="n"><span class="ow">${tot.owing > 0 ? fmt2(tot.owing) : '—'}</span></span><span class="n">${tot.people || '—'}</span><span class="n">${tot.oldestDays !== null && tot.owing > 0 ? dayTxt(tot.oldestDays) : '—'}</span></div></div><p class="blnote">${t('bl.note.owing')}</p>`;
    }
    if (blTab === 'items') {
      return res.map(({ b }) => { const st = L.batchStats(state, b), bs = bStatus(b), col = BL_COL[bs] || BL_COL.Closed, its = state.items.filter((x) => x.batchId === b.id).sort((x, y) => (x.id < y.id ? -1 : 1));
        const th = its.map((i) => { const sold = L.isSold(i); return `<button type="button" class="blth${sold ? ' sold' : ''}" data-act="edit-item" data-id="${esc(i.id)}" data-bt="${b.id}" aria-label="${esc(dn(i) || i.id)}"><span class="blp">${i.photo ? `<img data-ph="${esc(i.photo.id)}" data-kind="thumb" alt="">` : `<em>${esc(String(i.id).split('-').pop())}</em>`}<span class="blpr">${sold ? t('bl.soldTag') : (Number(i.price) > 0 ? fmt2(L.salePrice(i) || i.price) : '—')}</span></span><small>${esc(i.id)}</small></button>`; }).join('');
        return `<div class="bli"><div class="blh"><b>${esc(blShort(b.id))}</b><span class="chip2" style="color:${col}"><i></i>${stLabel(bs)}</span><small>${st.sold ? t('bl.ofSold', { n: st.count }).replace(/^/, st.sold + ' ') : tn('notif.items', its.length)}</small></div>${its.length ? `<div class="blrail">${th}</div>` : `<div class="muted small">${t('bl.noItems')}</div>`}</div>`; }).join('');
    }
    return res.map(({ b }) => { const st = L.batchStats(state, b), pc = st.count ? Math.round(st.sold / st.count * 100) : 0, bs = bStatus(b), col = BL_COL[bs] || BL_COL.Closed, on = c.batches.includes(b.id);
      return `<div class="blr${bs === 'Closed' ? ' cl' : ''}" role="button" tabindex="0" data-act="batch" data-id="${b.id}"><i class="stripe" style="background:${col}"></i>
        <span class="ring" style="background:conic-gradient(${col} ${pc * 3.6}deg,color-mix(in srgb,var(--line) 80%,transparent) 0)"><b>${pc}%</b></span>
        <div class="mid"><div class="nm">${esc(bl(b.id))}<span class="chip2" style="color:${col}"><i></i>${stLabel(bs)}</span></div><div class="sub">${esc(b.store)} · ${dayLong(b.datePurchased)}</div><div class="sub"><b>${st.sold}</b> ${t('bl.ofSold', { n: st.count })}</div></div>
        <div class="rt"><div class="swl ${on ? 'on' : ''}">${swt('store-batch', b.id, on)}<span>${t(on ? 'bl.inStore' : 'bl.hidden')}</span></div><small class="costonly">${money(st.investment)}<span class="invl">${t('bl.invested')}</span></small></div></div>`; }).join('');
  }
  // "In transit ✕ · 6 of 9 batches": names what is filtered and clears it in one tap (the funnel in the top bar opens the panel)
  const filterBar = (label, openAct, clearAct, line) => `<div class="fbar"><button type="button" class="fch" data-act="${openAct}">${esc(label)}<i role="button" data-act="${clearAct}" aria-label="${t('bl.clear')}">✕</i></button><small>${esc(line)}</small></div>`;
  function BatchLog() {
    const c = storeCfg(), n = state.batches.length, inN = state.batches.filter((b) => c.batches.includes(b.id)).length;
    const hero = true ? `<div class="blhero"><div><small>${t('bl.customersSee')}</small><b>${t('bl.xOfY', { x: inN, y: n })}</b></div>${n ? `<div class="sa">${t('store.selAll')}${swt('store-batch-all', 'all', n > 0 && inN === n)}</div>` : ''}</div>` : '';
    const fl = [...blF.store.map((k) => t(k === 'in' ? 'bl.f.in' : 'bl.f.out')), ...blF.status.map((k) => stLabel({ transit: 'In Transit', received: 'Received', closed: 'Closed' }[k])), ...blF.items.map((k) => t(k === 'avail' ? 'bl.avail' : 'bl.notAvail'))];
    const fbar = fl.length ? filterBar(fl.length === 1 ? fl[0] : t('fil.n', { n: fl.length }), 'bl-filter-open', 'bl-clear-all', t('fil.batches', { x: blList('').length, y: n })) : '';
    return `${fbar}${hero}<div class="oqbar" style="margin-top:2px"><span aria-hidden="true">🔍</span><input class="blq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('bp.search'))}" aria-label="${esc(t('bp.search'))}"></div>
      <div class="blseg">${[['overview', 'bl.tabOverview'], ['pl', 'bl.tabPL'], ['owing', 'bl.tabOwing'], ['items', 'bl.tabItems']].map(([k, l]) => `<button class="${blTab === k ? 'on' : ''}" data-act="bl-tab" data-id="${k}">${t(l)}</button>`).join('')}</div>
      <div id="blog">${batchLogRows('')}</div>`;
  }
  // The filter panel: several choices at once; choices in different groups combine
  function sheetBlFilter() {
    if (!blDraft) blDraft = { store: blF.store.slice(), status: blF.status.slice(), items: blF.items.slice() };
    const d = blDraft, chip = (g, k, label) => `<button type="button" class="cp ${d[g].includes(k) ? 'on' : ''}" data-act="bl-chip" data-id="${g}:${k}">${label}</button>`;
    const n = L.batchSearch(state.batches, '').filter(({ b }) => blPass(b, d)).length;
    openSmall(`<div class="blf"><div class="blfh"><h3>${t('bl.filter')}</h3><button type="button" class="alink" data-act="bl-clear">${t('bl.clear')}</button></div>
      <div class="blfg">${t('bl.fg.store')}</div><div class="chips">${chip('store', 'in', t('bl.f.in'))}${chip('store', 'out', t('bl.f.out'))}</div>
      <div class="blfg">${t('bl.fg.status')}</div><div class="chips">${chip('status', 'transit', stLabel('In Transit'))}${chip('status', 'received', stLabel('Received'))}${chip('status', 'closed', stLabel('Closed'))}</div>
      <div class="blfg">${t('bl.fg.items')}</div><div class="chips">${chip('items', 'avail', t('bl.avail'))}${chip('items', 'none', t('bl.notAvail'))}</div>
      <p class="muted small" style="margin:12px 0 0">${t('bl.pickMany')}</p>
      <div class="btns"><button class="btn primary" data-act="bl-apply">${t(n === 1 ? 'bl.show1' : 'bl.show', { n })}</button><button class="btn" data-act="bl-cancel">${t('btn.cancel')}</button></div></div>`, 'sheet');
  }

  /* ---------- Item log: Overview (a card per item), Sales, Cost & Profit; filtered by batch, status and search ---------- */
  let itTab = 'overview', itQ = '', itStat = 'all', itBatches = [], itGroup = false, itSort = { col: 'item', dir: 'asc' }, itLimit = 100;
  const IT_COL = { Paid: '#4fc27a', Owing: '#f0b34a', Available: '#6d83e0', 'In Transit': '#8c7f91', Closed: '#8c7f91' };
  const itStLabel = (st) => (st === 'In Transit' ? t('it.arriving') : stLabel(st));
  const itNum = (id) => parseInt(String(id).replace(/\D/g, ''), 10) || 0;
  const itBatch = (i) => state.batches.find((b) => b.id === i.batchId);
  const itBase = () => {   // batch + search, before the status chips
    const q = itQ.trim().toLowerCase(), set = itBatches.length ? new Set(itBatches) : null;
    return state.items.filter((i) => (!set || set.has(i.batchId)) && (!q || [i.id, dn(i), i.desc, i.customer, i.invoice].some((x) => String(x || '').toLowerCase().includes(q))));
  };
  const itThumb = (i) => `<span class="ithm">${i.photo ? `<span class="ph"><img data-ph="${i.photo.id}" data-kind="thumb" alt=""></span>` : `<span class="ph none"><i>${esc(String(i.id).split('-').pop())}</i></span>`}</span>`;
  const itInvTag = (i) => (i.invoice ? `<span class="invc" role="button" data-act="view-inv" data-id="${esc(i.invoice)}">${esc(i.invoice)}</span>` : '');
  const itCols = () => {
    const cur = [...new Set(itBase().map((i) => (itBatch(i) || {}).currency).filter(Boolean))];
    return { sales: [['item', t('it.h.item')], ['customer', t('it.h.customer')], ['invoice', t('it.h.invoice')], ['date', t('it.h.date')], ['sold', t('it.h.sold')], ['paid', t('it.h.paid')], ['owing', t('it.h.owing')]],
      cost: [['item', t('it.h.item')], ['cost', cur.length === 1 ? t('it.h.costCur', { cur: cur[0] === 'USD' ? 'US$' : cur[0] }) : t('it.h.cost')], ['ttd', t('it.h.ttd')], ['landed', t('it.h.landed')], ['sug', t('it.h.sug')], ['sold', t('it.h.sold')], ['paid', t('it.h.paid')], ['pct', t('it.h.pct')], ['pl', t('it.h.pl')]] };
  };
  const itVal = (i, col) => {
    const c = L.itemCalc(itBatch(i), i), sold = L.isSold(i), pos = (n) => (Number(n) > 0 ? Number(n) : null), inv = i.invoice ? state.invoices.find((v) => v.no === i.invoice) : null;
    switch (col) {
      case 'item': return itNum(i.id);
      case 'customer': return String(i.customer || '').trim().toLowerCase() || null;
      case 'invoice': return i.invoice ? itNum(i.invoice) : null;
      case 'date': return inv && inv.date ? new Date(inv.date).getTime() || null : null;
      case 'sold': return pos(i.sold);
      case 'paid': return pos(i.paid);
      case 'owing': return pos(i.owing);
      case 'cost': return pos(i.cost);
      case 'ttd': return pos(c.costTTD);
      case 'landed': return pos(c.landed);
      case 'sug': return pos(c.recommended);
      case 'pct': return sold && c.landed > 0 ? c.profitSoFar / c.landed : null;
      case 'pl': return sold && c.landed > 0 ? c.profitSoFar : null;
      default: return null;
    }
  };
  const itSorted = (list) => {
    const col = itSort.col, dir = itSort.dir === 'asc' ? 1 : -1, dec = list.map((i) => ({ i, v: itVal(i, col), n: itNum(i.id) }));
    dec.sort((a, b) => { if (a.v === null && b.v === null) return a.n - b.n; if (a.v === null) return 1; if (b.v === null) return -1; const c = typeof a.v === 'string' ? a.v.localeCompare(b.v) : a.v - b.v; return c ? c * dir : a.n - b.n; });
    return dec.map((d) => d.i);
  };
  const itAl = { customer: 'l', invoice: 'c', date: 'c', paid: 'c' };   // text columns: left or centred; money columns: right. The title always follows its column.
  const itPaidCell = (i, dsh) => (i.status === 'Paid' ? `<span class="pf">${t('it.paidFull')}</span>` : Number(i.paid) > 0 ? `<span class="pp">${fmt2(i.paid)}</span>` : dsh);
  function itRows(list) {
    const dsh = '<span class="dsh">—</span>', total = list.length, shown = list.slice(0, itLimit), isOv = itTab === 'overview', cols = isOv ? null : itCols()[itTab];
    const head = (b) => { const its = state.items.filter((x) => x.batchId === b.id); return `<div class="itgh"><b>${esc(blShort(b.id))}</b><span>${t('it.groupHead', { n: its.length, s: its.filter(L.isSold).length })}</span></div>`; };
    const row = (i) => {
      const st = i.status, col = IT_COL[st] || IT_COL.Closed, c = L.itemCalc(itBatch(i), i), sold = L.isSold(i);
      if (isOv) {
        const amt = sold ? fmt2(i.sold) : Number(i.price) > 0 ? fmt2(L.salePrice(i) || i.price) : '—', who = esc(i.customer || ''), tag = itInvTag(i);
        return `<div class="itc" role="button" tabindex="0" data-act="edit-item" data-id="${esc(i.id)}" style="--c:${col}">${itThumb(i)}<div class="t"><b>${esc(dn(i)) || t('item.untitled')}</b><small>${esc(i.id)}</small><small>${who || tag ? `${who}${tag}` : (sold ? '' : t('it.noInvoice'))}</small></div><div class="e"><b${sold ? '' : ' class="mute"'}>${amt}</b><small class="itst itst-${st.replace(' ', '')}">${itStLabel(st)}</small>${Number(i.owing) > 0 ? `<small class="owes">${t('it.owes', { amt: fmt2(i.owing) })}</small>` : ''}</div></div>`;
      }
      const prof = sold && c.landed > 0 ? c.profitSoFar : null;
      const cell = (k) => ({
        customer: `<span class="n l">${esc(i.customer || '') || dsh}</span>`, invoice: `<span class="n c">${itInvTag(i) || dsh}</span>`,
        date: `<span class="n c">${(() => { const v = i.invoice && state.invoices.find((x) => x.no === i.invoice); return v && v.date ? day(v.date) : dsh; })()}</span>`,
        sold: `<span class="n">${Number(i.sold) > 0 ? fmt2(i.sold) : dsh}</span>`, paid: `<span class="n c">${itPaidCell(i, dsh)}</span>`, owing: `<span class="n">${Number(i.owing) > 0 ? `<span class="ow">${fmt2(i.owing)}</span>` : dsh}</span>`,
        cost: `<span class="n">${Number(i.cost) > 0 ? fmt2(i.cost) : dsh}</span>`, ttd: `<span class="n">${c.costTTD > 0 ? fmt2(c.costTTD) : dsh}</span>`, landed: `<span class="n">${c.landed > 0 ? fmt2(c.landed) : dsh}</span>`, sug: `<span class="n">${c.recommended > 0 ? fmt2(c.recommended) : dsh}</span>`,
        pct: `<span class="n">${prof === null ? dsh : (prof / c.landed * 100).toFixed(1) + '%'}</span>`, pl: `<span class="n">${prof === null ? dsh : prof >= 0 ? `<span class="gp">${fmt2(prof)}</span>` : `<span class="lossr">${fmt2(-prof)}</span>`}</span>` })[k];
      return `<div class="itr" role="button" tabindex="0" data-act="edit-item" data-id="${esc(i.id)}" style="--c:${col}"><span class="itf"><i></i>${itThumb(i)}<span><b>${esc(i.id)}</b><small class="itst itst-${st.replace(' ', '')}">${itStLabel(st)}</small></span></span>${cols.slice(1).map(([k]) => cell(k)).join('')}</div>`;
    };
    let out = '', last = null;
    shown.forEach((i) => { if (itGroup && i.batchId !== last) { last = i.batchId; const b = itBatch(i); if (b) out += head(b); } out += row(i); });
    const more = total > shown.length ? `<button class="itmore" data-act="it-more">${t('it.showMore', { n: total - shown.length })}</button>` : '';
    if (isOv) return `<div class="itlist">${out}</div>${more}`;
    const sum = (f) => list.reduce((n, i) => n + (Number(f(i)) || 0), 0), tot = { sold: fmt2(sum((i) => i.sold)), paid: fmt2(sum((i) => i.paid)), owing: fmt2(sum((i) => i.owing)), ttd: fmt2(sum((i) => L.itemCalc(itBatch(i), i).costTTD)), landed: fmt2(sum((i) => L.itemCalc(itBatch(i), i).landed)), pl: (() => { const v = sum((i) => { const c = L.itemCalc(itBatch(i), i); return L.isSold(i) && c.landed > 0 ? c.profitSoFar : 0; }); return v >= 0 ? `<span class="gp">${fmt2(v)}</span>` : `<span class="lossr">${fmt2(-v)}</span>`; })() };
    const hd = cols.map(([k, label], n) => `<button type="button" class="shd${itSort.col === k ? ' on' : ''}${itAl[k] ? ' ' + itAl[k] : ''}" data-act="it-sort" data-id="${k}" aria-label="${esc(label)}">${label}${itSort.col === k ? `<i>${itSort.dir === 'asc' ? '▲' : '▼'}</i>` : ''}</button>`).join('');
    const tr = `<div class="itr tt"><span class="itf"><b>${t('bl.total')}</b></span>${cols.slice(1).map(([k]) => `<span class="n">${tot[k] ? `<b>${tot[k]}</b>` : ''}</span>`).join('')}</div>`;
    return `<div class="itbox"><div class="itwrap"><div class="itt" style="--cols:128px repeat(${cols.length - 1},116px)"><div class="itr h">${hd}</div>${out}${tr}</div></div></div>${more}`;
  }
  function itMain() {
    const base = itBase(), list = itSorted(base.filter((i) => itStat === 'all' || i.status === itStat));
    const sales = list.filter(L.isSold).reduce((n, i) => n + (Number(i.sold) || 0), 0), owing = list.reduce((n, i) => n + (Number(i.owing) || 0), 0);
    const tabs = [['overview', 'bl.tabOverview'], ['sales', 'it.tabSales']].concat(can('costs') ? [['cost', 'it.tabCost']] : []);
    if (itTab === 'cost' && !can('costs')) itTab = 'overview';
    const chips = [['all', t('filter.all'), base.length]].concat(STATUSES.map((st) => [st, itStLabel(st), base.filter((i) => i.status === st).length])).map(([k, label, n]) => `<button type="button" class="itchip${itStat === k ? ' on' : ''}" data-act="it-chip" data-id="${k}">${label} <b>${n}</b></button>`).join('');
    const picked = itBatches.length ? itBatches.map((id) => String(id).replace(/^BATCH-/, '')).join(', ') : t('filter.all');
    return `<div class="blhero i3"><div><small>${t('it.sales')}</small><b>${money(sales)}</b></div><div class="ow"><small>${t('it.owing')}</small><b>${money(owing)}</b></div><div class="rt"><small>${t('it.items')}</small><b>${list.length.toLocaleString()}</b></div></div>
      <div class="blseg">${tabs.map(([k, l]) => `<button class="${itTab === k ? 'on' : ''}" data-act="it-tab" data-id="${k}">${t(l)}</button>`).join('')}</div>
      <div class="itbar"><button type="button" class="itsel${itBatches.length ? ' on' : ''}" data-act="it-bpick"><span class="v">${t('it.batch')}<small data-full="${esc(picked)}" data-n="${itBatches.length}">${esc(picked)}</small></span>${itBatches.length ? `<span class="x" role="button" data-act="it-bclear" aria-label="${t('it.clear')}">✕</span>` : '<span class="dd">▾</span>'}</button><button type="button" class="itgb${itGroup ? ' on' : ''}" data-act="it-group" aria-pressed="${itGroup}">${t('it.group')}${itGroup ? ' ✓' : ''}</button></div>
      <div class="itchips">${chips}</div>
      ${list.length ? itRows(list) : `<div class="empty">${t('stock.noMatch')}</div>`}`;
  }
  function itFitBar() {   // a long list of batches shortens to "12 batches" only when the names do not fit
    const sm = document.querySelector('.itsel .v small'); if (!sm) return;
    sm.textContent = sm.dataset.full; const n = Number(sm.dataset.n) || 0;
    if (n > 1 && sm.scrollWidth > sm.clientWidth + 1) sm.textContent = t('it.nBatches', { n });
  }
  function itRefresh() { const m = $('#itmain'); if (!m) return; const wrap = m.querySelector('.itwrap'), sx = wrap ? wrap.scrollLeft : 0, cx = m.querySelector('.itchips') ? m.querySelector('.itchips').scrollLeft : 0; m.innerHTML = itMain(); const w2 = m.querySelector('.itwrap'); if (w2 && sx) w2.scrollLeft = sx; const c2 = m.querySelector('.itchips'); if (c2 && cx) c2.scrollLeft = cx; PUI.hydrate(); itFitBar(); renderTools(); }
  let itBQ = '';   // search inside the Choose batches pop-up
  const itBMatches = () => {
    const q = itBQ.trim().toLowerCase(), all = state.batches.slice().sort((a, b) => b.num - a.num);
    return q ? all.filter((b) => [b.id, blShort(b.id), b.store, dayLong(b.datePurchased)].some((x) => String(x || '').toLowerCase().includes(q))) : all;
  };
  function itPickRows() {
    const list = itBMatches(), q = itBQ.trim(), cnt = (b) => state.items.filter((i) => i.batchId === b.id);
    const allRow = q ? '' : `<button type="button" class="bo${itBatches.length ? '' : ' on'}" data-act="it-bclear2"><span class="ck">${itBatches.length ? '' : '✓'}</span><div class="t"><b>${t('it.allBatches')}</b><small>${state.items.length.toLocaleString()} ${t('it.items').toLowerCase()}</small></div></button>`;
    const info = q ? `<div class="pickinfo">${t('it.matchN', { n: list.length, total: state.batches.length })}</div>` : '';
    const rows = list.map((b) => { const its = cnt(b), on = itBatches.includes(b.id); return `<button type="button" class="bo${on ? ' on' : ''}" data-act="it-btoggle" data-id="${b.id}"><span class="ck">${on ? '✓' : ''}</span><div class="t"><b>${esc(blShort(b.id))}</b><small>${esc(b.store)} · ${t('it.groupHead', { n: its.length, s: its.filter(L.isSold).length })}</small></div></button>`; }).join('');
    const sel = q && list.length && !list.every((b) => itBatches.includes(b.id)) ? `<button type="button" class="itselall" data-act="it-bsel">${t('it.selectThese', { n: list.length })}</button>` : '';
    return `${info}${allRow}${rows || (q ? `<div class="empty">${t('it.noBatch')}</div>` : '')}${sel}`;
  }
  function itPickRefresh() { const el = $('#itpick'); if (el) el.innerHTML = itPickRows(); const x = document.querySelector('.itbs .oqx'); if (x) x.hidden = !itBQ; }
  function sheetItBatches(keep) {
    if (!keep) itBQ = '';
    openSmall(`<div class="blf"><div class="blfh"><h3>${t('it.pick')}</h3></div><p class="muted small" style="margin:0 0 8px">${t('it.pickSub')}</p>
      <div class="oqbar itbs"><span aria-hidden="true">🔍</span><input class="itbq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('it.searchBatches'))}" aria-label="${esc(t('it.searchBatches'))}" value="${esc(itBQ)}"><button type="button" class="oqx" data-act="it-bqx" aria-label="${t('it.clear')}"${itBQ ? '' : ' hidden'}>✕</button></div>
      <div class="itpick" id="itpick">${itPickRows()}</div>
      <div class="btns"><button class="btn" data-act="it-bclear2">${t('it.clear')}</button><button class="btn primary" data-act="it-bdone">${t('it.done')}</button></div></div>`, 'sheet');
  }
  function ItemLog() {
    return `<div class="oqbar"><span aria-hidden="true">🔍</span><input class="itq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('tool.search'))}" aria-label="${esc(t('tool.search'))}" value="${esc(itQ)}"></div><div id="itmain">${itMain()}</div>`;
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
      ? `<div class="acctcard"><h3>${t('set.account')}</h3><div class="biz">🏪 ${esc(bizName())}</div><div class="who">${esc(cloud.email)}</div><div class="st ${cloud.status === 'synced' ? 'good' : /error|rules|unavailable/.test(cloud.status) ? 'bad' : ''}" id="acct-st">${acctStatus()}</div>${addPwHTML()}<button class="btn" data-act="acct-out">${t('acct.signOut')}</button></div>`
      : `<div class="acctcard"><h3>${t('set.account')}</h3><div class="biz">🏪 ${esc(bizName())}</div><div class="who">${t('set.accountOut')}</div><p class="muted small" style="margin:6px 0 10px">${t('acct.signInSub')}</p><button class="btn primary" data-act="acct-open">${t('acct.signIn')} / ${t('acct.create')}</button></div>`;
    return `${acct}
      <h2>${t('set.sec.app')}</h2><div class="list grp">
        ${trow('🌐', t('set.language'), I.LANGS[I.getLang()]['lang.name'], 'data-act="pick-lang"')}
        ${trow('🌓', t('set.appearance'), themeName, 'data-act="pick-appearance"')}
        ${trow('🎨', t('set.theme'), t('pal.' + curPal()) + ' · ' + t('set.colors', { n: Theme.PALETTES.length }), nav('set-theme'))}
        ${trow('🗣️', t('set.custLang'), { auto: t('cust.auto'), ask: t('cust.ask'), app: t('cust.same'), en: I.LANGS.en['lang.name'], es: I.LANGS.es['lang.name'] }[custMode()], 'data-act="pick-custlang"')}
        ${cloud.signedIn && Cloud.hasPassword && Cloud.hasPassword() ? trow('🔑', t('acct.chPw'), t('set.pwSub'), nav('set-password')) : ''}</div>
      <h2>${t('set.sec.business')}</h2><div class="list grp">${trow('🏪', t('set.businessRow'), t('set.businessSub'), nav('set-business'))}
        ${trow('🧾', t('set.invDesign'), t('invd.' + invDesignId()), nav('set-invdesign'))}
        <div class="row srow"><span class="tile">🛍️</span><div class="grow"><b>${t('store.left')}</b><small>${t('store.leftSub')}</small></div>${swt('store-left', 'showLeft', storeCfg().showLeft)}</div></div>
      ${cloud.signedIn && team ? (can('team') ? `<h2>${t('team.sec')}</h2><div class="list grp">${trow('👥', t('team.row'), t('team.rowSub', { n: Object.keys(team.members || {}).length }) + (joinReqs.length ? ' · ' + t('team.waiting', { n: joinReqs.length }) : ''), 'data-act="team-open"')}${trow('🔑', t('perm.row'), t('perm.sub'), 'data-act="perm-open"')}</div>` : `<h2>${t('team.sec')}</h2><div class="list grp"><div class="row srow"><span class="tile">🏷️</span><div class="grow"><b>${t('team.mine')}</b><small>${rankName(team.rank)}</small></div></div></div>`) : ''}
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
    openSmall(`<h3>${title}</h3><div class="list" style="margin-top:12px">${opts.map(([k, l]) => `<button class="row tap" data-act="${act}" data-id="${k}"><div class="grow"><b>${l}</b></div><span style="font-weight:900;color:var(--brand)">${cur === k ? '✓' : ''}</span></button>`).join('')}</div>${note ? `<p class="note">${note}</p>` : ''}
      <div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet');
  }
  // Before a photo is shared: which language for the caption? Resolves 'en' | 'es', or null when closed without choosing.
  function shareLang() {
    if (custMode() !== 'ask') return Promise.resolve(custLang());
    return new Promise((ok) => {
      let done = false; const finish = (v) => { if (!done) { done = true; ok(v); } };
      window.__shareLang = (lang) => { const ck = $('#sl-never'); if (ck && ck.checked) { setPref('custLangV2', lang); } finish(lang); };      // 'don't ask again' = from now on always this language
      openSmall(`<h3>${t('share.langTitle')}</h3><p class="muted small">${t('share.langSub')}</p>
        <div class="btns" style="margin-top:12px">${Object.keys(I.LANGS).map((l) => `<button class="btn primary" data-act="share-lang" data-id="${l}">${I.LANGS[l]['lang.name']}</button>`).join('')}</div>
        <label class="chkrow"><input type="checkbox" id="sl-never"><span>${t('share.dontAsk')}</span></label>
        <p class="note">${t('share.note')}</p>
        <div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet', () => finish(null));
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
    return `<div class="list">${act('export-json', t('more.backup'), t('more.backupSub'))}${act('import-json', t('more.restore'), t('more.restoreSub'))}${act('reset', t('more.erase'), t('more.eraseSub'), true)}</div>
      <h2>${t('dl.sheet')}</h2><div class="list">${[['invoices', '🧾', t('dl.invoices'), state.invoices.length], ['items', '📋', t('dl.items'), state.items.length], ['customers', '👥', t('dl.customers'), L.customerStats(state).length]].map(([k, ic, ti, n]) => `<button class="row tap" data-act="csv" data-id="${k}"><span style="font-size:22px">${ic}</span><div class="grow"><b>${ti}</b><small>${t('dl.rows', { n })}</small></div></button>`).join('')}</div><p class="note">${t('photo.backupNote')}</p>`;
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
    if (moreView === 'set-password') return chPwHTML() || '<p class="muted">' + t('set.pwNone') + '</p>';
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
    return `<div class="lgcard"><span class="lgpv">${s.bizLogo ? `<img src="${s.bizLogo}" alt="">` : esc(initials(bizName()))}</span><div class="t"><b>${t('logo.title')}</b><small>${t('logo.sub')}</small><div class="lgbt"><button type="button" class="btn" data-act="logo-pick">${t(s.bizLogo ? 'logo.change' : 'logo.add')}</button>${s.bizLogo ? `<button type="button" class="btn" data-act="logo-remove">${t('logo.remove')}</button>` : ''}</div></div><input type="file" id="logo-file" accept="image/*" hidden></div>
      <form id="f-settings"><label>${t('set.bizName')}</label><input name="businessName" value="${esc(bizName())}" autocomplete="off">
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
  // Small decisions are pop-ups, not pages: 'card' (a question in the middle, two buttons) or 'sheet' (a list of choices from the bottom).
  // They open over whatever is showing; closing them puts that page back (answering first, so the page shows the new state).
  let smallPrev = null;
  // The full-screen page under a card or pop-up stays visible behind it (a still copy; the real page is reopened when the card closes).
  let ghost = null, keepGhost = false;
  const removeGhost = () => { if (ghost) { ghost.remove(); ghost = null; } };
  function openSmall(html, kind, onClose) {
    const sh = $('#sheet');
    if (!sh.hidden && !sh.classList.contains('small') && pageStack.length) smallPrev = { stack: pageStack.slice(), open: pageStack[pageStack.length - 1].open, y: sh.scrollTop };
    if (!sh.hidden && sh.classList.contains('full') && !sh.classList.contains('small')) {
      removeGhost(); ghost = document.createElement('div'); ghost.className = 'sheet full ghost'; ghost.setAttribute('aria-hidden', 'true');
      ghost.innerHTML = sh.innerHTML.replace(/\sid="/g, ' data-gid="'); document.body.appendChild(ghost); ghost.scrollTop = sh.scrollTop; keepGhost = true;
    } else if (ghost && sh.classList.contains('small')) keepGhost = true;
    openSheet(html, () => {
      removeGhost();
      const p = smallPrev; smallPrev = null; if (onClose) onClose();
      if (p) { reopening = true; try { p.open(); } finally { reopening = false; } pageStack = p.stack; restoreSheetY(p.y); }
    }, kind);
  }
  // A question with Yes / Cancel in the same card style (replaces the phone's plain confirm box). Resolves true or false.
  function askCard(text, opts) {
    opts = opts || {};
    return new Promise((ok) => {
      let done = false; const finish = (v) => { if (!done) { done = true; ok(v); } };
      window.__ask = finish;
      openSmall(`<h3>${opts.title || t('confirm.title')}</h3><p>${esc(text)}</p>
        <div class="btns"><button class="btn ${opts.danger ? 'dsolid' : 'primary'}" data-act="ask-yes">${opts.ok || t('btn.yes')}</button><button class="btn" data-act="close">${opts.no || t('btn.cancel')}</button></div>`, 'card', () => finish(false));
    });
  }
  function openSheet(html, onClose, full) {
    voiceStop(); removeItemPill();
    if (keepGhost) keepGhost = false; else removeGhost();
    const kind = full === 'card' || full === 'sheet' ? full : null;
    if (kind) full = false; else if (!full) { html = asPage(html); full = true; }
    $('#sheet').classList.toggle('card', kind === 'card'); $('#sheet').classList.toggle('small', !!kind); $('#sheet').classList.remove('pick', 'hdr');
    sheetClose = onClose || null; $('#sheet').classList.toggle('full', !!full); document.body.classList.toggle('page-open', !!full);   // full-screen pages keep the bottom tab bar
    $('#sheet').innerHTML = `<div class="grab"></div>${html}`; $('#sheet').hidden = false; $('#scrim').hidden = false; $('#sheet').scrollTop = 0;
    document.body.style.overflow = 'hidden';
    syncKeyboard();
    syncHistory();
    PUI.hydrate();
  }
  let ordDirty = false;   // an order changed while a page was open on top of the Store list: redraw the list when that page closes
  function closeSheet() {
    if ($('#sheet').hidden) return;
    voiceStop(); removeItemPill();
    pageStack = [];
    $('#sheet').hidden = true; $('#scrim').hidden = true; $('#sheet').innerHTML = ''; $('#sheet').classList.remove('full', 'card', 'small', 'pick', 'hdr'); document.body.classList.remove('page-open'); invLangSession = null; invLangAuto = null; document.body.style.overflow = '';
    if (L.cleanNames(state)) save();   // tidy names/descriptions typed in a sheet (e.g. trailing spaces)
    $('#sheet').style.transform = ''; $('#sheet').style.transition = ''; $('#scrim').style.opacity = ''; $('#scrim').style.transition = '';
    if (ordDirty) { ordDirty = false; render(); }
    syncKeyboard();
    syncHistory();
    const cb = sheetClose; sheetClose = null; if (cb) cb();
  }

  const currencyOpts = () => Object.keys(L.CURRENCIES).map((c) => `<option>${c}</option>`).join('');
  const batchOpts = (list) => list.map((b) => `<option value="${b.id}">${bl(b.id)}</option>`).join('');

  // Quick sale: something that is not in your stock. It is kept as its own one-item batch so the cost and profit stay right.
  function sheetQuickSale() {
    enterPage('quicksale', '', () => sheetQuickSale());
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('qs.title')}</b><small>${t('qs.sub')}</small></div></div>
      <div class="pd"><form id="f-quick"><div class="fld"><label for="qs-name">${t('qs.name')}</label><input id="qs-name" name="name" placeholder="${t('ex.label')} ${t('qs.namePh')}" autocomplete="off" required></div>
      <div class="grid2"><div class="fld"><label for="qs-price">${t('qs.price')}</label><input id="qs-price" name="price" type="text" inputmode="decimal" placeholder="0.00" autocomplete="off" required></div>
      <div class="fld"><label for="qs-cost">${t('qs.cost')}</label><input id="qs-cost" name="cost" type="text" inputmode="decimal" placeholder="0.00" autocomplete="off"></div></div>
      <p class="muted small">${t('qs.note')}</p>
      <div class="btns"><button class="btn primary">${t('qs.go')}</button></div></form></div>`, null, true);
  }
  function quickSale(d) {
    const name = String(d.name || '').trim(), price = parseAmt(d.price), cost = parseAmt(d.cost) || 0;
    if (!name) return toast(t('qs.needName')); if (!(price > 0)) return toast(t('qs.needPrice'));
    try {
      const b = L.createBatch(state, { store: t('qs.batchName'), count: 1, totalCost: cost, currency: 'TTD', margin: 0 });
      L.makeAvailable(state, b.id); const it = state.items.find((x) => x.batchId === b.id); it.desc = name; it.price = price; it.cost = cost;
      selected.add(it.id); save(); closeSheet(); go({ tab: 'sell', moreView: 'invoice' }); render(); window.scrollTo(0, 0);
    } catch (e) { toast('⚠️ ' + errMsg(e)); }
  }
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

  const clearOpen = new Set();   // received batches whose clearing payment was opened again (to fix a mistake)
  /* ---------- batch picker (search) and the batch details pop-up ---------- */
  function bpRows(q) {
    const res = L.batchSearch(state.batches, q), k = String(q || '').trim();
    if (!res.length) return `<div class="none">${t('bp.none', { q: esc(k) })}</div>`;
    return res.map(({ b, kind }) => { const a = state.items.filter((i) => i.batchId === b.id && i.status === 'Available').length, tr = state.items.filter((i) => i.batchId === b.id && i.status === 'In Transit').length, bs = bStatus(b);
      const why = kind === 'ends' ? t('bp.ends', { q: esc(k) }) : kind === 'has' ? t('bp.has', { q: esc(k) }) : '';
      return `<button class="bprow ${b.id === stockBatch ? 'on' : ''}" data-act="batch-pick-do" data-id="${esc(b.id)}"><div><b>${esc(bl(b.id))}</b><small>${why ? why + ' · ' : ''}${t('store.batchCount', { a, t: tr })}${b.store ? ' · ' + esc(b.store) : ''}</small></div><span class="pill ${bs.replace(' ', '')}">${stLabel(bs)}</span></button>`; }).join('');
  }
  function sheetBatchPick() {
    openSheet(`<h3>${t('bp.title')}</h3>
      <div class="oqbar"><span aria-hidden="true">🔍</span><input class="bq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('bp.search'))}" aria-label="${esc(t('bp.search'))}"><span class="muted small" id="bp-n">${t('bp.n', { n: state.batches.length })}</span></div>
      <div class="bpl" id="bpl">${bpRows('')}</div>`, null, 'sheet');
    $('#sheet').classList.add('pick', 'hdr');
    const cur = $('#bpl .bprow.on'); if (cur) cur.scrollIntoView({ block: 'center' });
  }
  function sheetBatchInfo(id) {
    const b = state.batches.find((x) => x.id === id); if (!b) return;
    const st = L.batchStats(state, b), bs = bStatus(b), its = state.items.filter((i) => i.batchId === b.id), ps = L.photoStats(state, b.id);
    const n = (s) => its.filter((i) => i.status === s).length, tot = Math.max(1, its.length), seg = (s, c) => `<i style="width:${n(s) / tot * 100}%;background:${c}"></i>`;
    const lg = (s, c) => `<span><b style="background:${c}"></b>${n(s)} ${stLabel(s).toLowerCase()}</span>`;
    const sc = storeCfg(), ln = (a, v) => `<div class="ln"><span>${a}</span><b>${v}</b></div>`;
    openSheet(`<h3>${esc(bl(b.id))} <span class="pill ${bs.replace(' ', '')}">${stLabel(bs)}</span></h3><p class="muted small bi-sub">${esc(b.store)}${b.store ? ' · ' : ''}${t('batch.ordered')} ${day(b.datePurchased)}</p>
      <div class="bi-kp costonly"><div><small>${t('batch.invested')}</small><b>${money(st.investment)}</b></div><div><small>${t('home.profitWord')}</small><b class="ok">${money(st.profit)}</b></div><div><small>${t('batch.sales')}</small><b>${money(st.sales)}</b></div><div><small>${t('batch.clearingPaid')}</small><b>${money(b.clearingPaid)}</b><small>${(st.clearingPct * 100).toFixed(0)}%</small></div></div>
      <div class="bi-card"><div class="bi-bar">${seg('Paid', '#66bb6a')}${seg('Owing', '#ffb74d')}${seg('Available', '#5c6bc0')}${seg('In Transit', '#4fc3f7')}</div><div class="bi-lg">${lg('Paid', '#66bb6a')}${lg('Owing', '#ffb74d')}${lg('Available', '#5c6bc0')}${lg('In Transit', '#4fc3f7')}</div></div>
      <div class="bi-card">${ln(t('bi.items'), its.length + ' · ' + t('bi.withPhotos', { n: ps.withPhoto }))}${can('costs') ? ln(t('batch.cost'), cur$(b.currency) + ' ' + b.totalCost.toFixed(2) + ' @ ' + b.rate.toFixed(4)) : ''}${ln(t('bi.margin'), (Number(b.margin) || 0) + '%')}${b.dateReceived ? ln(t('bi.received'), day(b.dateReceived)) : ''}${ln(b.dateLastPayment ? t('batch.transitLast') : t('batch.sincePurchase'), transitText(b))}${b.dateLastPayment ? ln(t('batch.lastClearing'), day(b.dateLastPayment)) : ''}${sc.id ? ln(t('bi.inStore'), sc.batches.includes(b.id) ? t('bi.on') : t('bi.off')) : ''}</div>
      <div class="btns"><button class="btn primary" data-act="batch" data-id="${b.id}">${t('bi.open')}</button><button class="btn" data-act="close">${t('btn.close')}</button></div>`, null, 'sheet');
    $('#sheet').classList.add('hdr');
  }
  function sheetBatch(id) {
    const b = state.batches.find((x) => x.id === id); if (!b) return;
    enterPage('batch', id, () => sheetBatch(id));
    const st = L.batchStats(state, b), inTransit = bStatus(b) === 'In Transit', showClear = inTransit || clearOpen.has(b.id);
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${bl(b.id)} <span class="pill ${bStatus(b).replace(' ', '')}">${stLabel(bStatus(b))}</span></b></div>${inTransit ? '' : `<button class="dots" data-act="batch-more" data-id="${b.id}" aria-label="${t('batch.more')}">⋮</button>`}</div><div class="ap bpg">
      <div class="bkeys"><div class="costonly"><small>${t('batch.invested')}</small><b>${money(st.investment)}</b></div><div><small>${t('batch.sales')}</small><b>${money(st.sales)}</b></div><div class="costonly pl"><small>${t('batch.profit')} · ${Math.max(0, st.netPct)}%</small><b>${money(Math.max(0, st.net))}</b></div></div>
      <div class="bexp"><span class="muted small costonly">${t('batch.expected')}: ${money(st.profit)}</span><button class="ed" type="button" data-act="batch-edit-jump">${t('batch.editJump')} ↓</button></div>
      <div class="bsec">
        <h6>${t('batch.secMoney')}</h6>
        <div class="ln costonly"><span>${t('batch.purchaseCost')}</span><b>${cur$(b.currency)} ${b.totalCost.toFixed(2)}</b></div>
        <div class="ln costonly"><span>${t('batch.rate')}</span><b>${b.rate.toFixed(4)}</b></div>
        <div class="ln costonly"><span>${t('batch.costTTD')}</span><b>${money(st.costTTD)}</b></div>
        <div class="ln"><span>${t('batch.clearingPaid')}</span><b>${money(b.clearingPaid)} (${(st.clearingPct * 100).toFixed(0)}%)</b></div>
        <div class="ln costonly net"><span>${t('batch.profitLoss')}</span><b class="${st.net < 0 ? 'neg' : 'pos'}">${signed(st.net)}</b></div>
        ${st.net < 0 ? `<div class="ln costonly"><span>${t('batch.toEarnBack')}</span><b>${money(-st.net)}</b></div>` : ''}
        <h6>${t('batch.secItems')}</h6>
        <div class="ln"><span>${t('batch.store')}</span><b>${esc(b.store) || '—'}</b></div>
        <div class="ln"><span>${t('batch.itemsTotal')}</span><b>${st.count}</b></div>
        <div class="ln"><span>${t('batch.itemsSold')}</span><b>${st.sold}</b></div>
        <div class="ln"><span>${t('batch.itemsLeft')}</span><b>${st.left}</b></div>
        <h6>${t('batch.secDates')}</h6>
        <div class="ln"><span>${t('batch.dateBought')}</span><b>${day(b.datePurchased)}</b></div>
        ${b.dateReceived ? `<div class="ln"><span>${t('batch.dateReceived')}</span><b>${day(b.dateReceived)}</b></div>` : ''}
        <div class="ln"><span>${b.dateLastPayment ? t('batch.transitLast') : t('batch.sincePurchase')}</span><b>${transitText(b)}</b></div>
        ${b.dateLastPayment ? `<div class="ln"><span>${t('batch.lastClearing')}</span><b>${day(b.dateLastPayment)}</b></div>` : ''}
      </div>
      ${showClear ? `${bStatus(b) === 'In Transit' ? '' : `<div class="note2">${t('clear.reopened')}</div>`}<form id="f-clear" class="bsec bpay"><input type="hidden" name="batch" value="${b.id}"><label>${t('batch.payClearing')}</label>
      <div class="bbar"><i style="width:${Math.min(100, Math.round(st.clearingPct * 100))}%"></i></div>
      <div class="grid2"><input name="amount" type="text" inputmode="decimal" step="0.01" min="0" placeholder="0.00"><button class="btn primary">${t('batch.recordPayment')}</button></div></form>` : ''}
      <h5 class="gh" id="bpg-items">${t('batch.groupItems')}</h5>
      <div class="bsec bact"><button class="btn primary" data-act="qe-open" data-id="${b.id}">✏️ ${t('qe.btn')}</button>
      <div class="brow"><button class="btn tw" data-act="photo-add" data-id="${b.id}"><span>📷 ${t('photo.add')}</span><small>${t('photo.progress', { n: L.photoStats(state, b.id).withPhoto, total: L.photoStats(state, b.id).total })}</small></button>
      <button class="btn tw" data-act="open-stock" data-id="${b.id}"><span>${t('batch.viewItems')}</span></button></div></div>
      <h5 class="gh">${t('batch.groupBatch')}</h5>
      <div class="bsec bact">${bStatus(b) === 'In Transit' ? `<button class="btn brecv" id="bpg-recv" data-act="do-receive" data-id="${b.id}">${t('batch.markReceived')}</button>` : ''}
      ${bStatus(b) !== 'Closed' || st.sold === 0 ? `<div class="bdz"><div class="brow">${bStatus(b) !== 'Closed' ? `<button class="btn danger tw" data-act="close-batch" data-id="${b.id}"><span>${t('batch.close')}</span></button>` : ''}
      ${st.sold === 0 ? `<button class="btn danger tw" data-act="del-batch" data-id="${b.id}"><span>${t('batch.deleteShort')}</span><small>${t('batch.deleteSmall')}</small></button>` : ''}</div>
      ${bStatus(b) !== 'Closed' ? `<p class="muted small">${t('batch.closeNote')}</p>` : ''}</div>` : ''}</div></div>`, null, true);
  }

  function sheetPayClearing() {
    const open = state.batches.filter((b) => bStatus(b) === 'In Transit').reverse(); if (!open.length) return toast(t(state.batches.length ? 'clear.noTransit' : 'clear.noBatch'));
    openSmall(`<h3>${t('clear.title')}</h3><form id="f-clear"><label>${t('clear.batch')}</label><select name="batch">${batchOpts(open)}</select>
      <label>${t('clear.amount')}</label><input name="amount" type="text" inputmode="decimal" step="0.01" min="0" placeholder="0.00" required>
      <div class="btns"><button class="btn primary">${t('batch.recordPayment')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`, 'sheet');
  }

  function sheetReceive() {
    const list = state.batches.filter((b) => bStatus(b) === 'In Transit'); if (!list.length) return toast(t('recv.none'));
    openSmall(`<h3>${t('recv.title')}</h3><p class="muted small">${t('recv.note')}</p>
      <form id="f-receive"><label>${t('clear.batch')}</label><select name="batch">${batchOpts(list)}</select>
      <div class="btns"><button class="btn primary">${t('recv.mark')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`);
  }

  /* Voice: a microphone button next to the description (and the Spanish name). Uses the phone browser's speech recognition (Chrome on
     Android; Safari on iPhone); where it is not available the button is simply not shown. On the description, words are added after what
     is typed; in the Spanish name box they replace it. */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const MIC_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
  const micBtn = (act) => (SR ? `<button type="button" class="mic" data-act="${act || 'mic'}" aria-label="${t('mic.tap')}">${MIC_SVG}</button>` : '');
  let rec = null, heardTimer = 0;
  function voiceUi(on, text, row) {
    document.querySelectorAll('.mic').forEach((b) => b.classList.toggle('on', !!on));
    document.querySelectorAll('.listen, .heard').forEach((e) => e.remove());
    row = row || document.querySelector('.dscrow, .esrow'); if (!row) return;
    const inp = row.querySelector('input');
    if (inp) { if (on) { inp.dataset.ph = inp.placeholder; inp.placeholder = t('mic.listeningBox'); } else if (inp.dataset.ph) inp.placeholder = inp.dataset.ph; }
    if (on) row.insertAdjacentHTML('afterend', `<div class="listen"><i></i><span>${t('mic.listening')}</span></div>`);
    else if (text) { row.insertAdjacentHTML('afterend', `<div class="heard">🎤 ${t('mic.heard', { text: esc(text) })}</div>`); clearTimeout(heardTimer); heardTimer = setTimeout(() => { const h = document.querySelector('.heard'); if (h) h.remove(); }, 6000); }
  }
  function voiceStop() { const r = rec; rec = null; if (r) { try { r.abort(); } catch (e) { /* already stopped */ } } }
  function voiceToggle(forSpanish) {
    if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } return; }
    const box = document.querySelector(forSpanish === 'en' ? '#en-name' : forSpanish ? '#es-name' : '.dscrow input'); if (!box || !SR) return;
    const row = box.closest('.dscrow, .esrow'), r = new SR(); r.lang = forSpanish === 'en' ? 'en-US' : (forSpanish || I.getLang() === 'es') ? 'es-419' : 'en-US'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    let heard = '', failed = false; rec = r;
    r.onstart = () => voiceUi(true, '', row);
    r.onresult = (e) => { heard = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim(); const l = document.querySelector('.listen span'); if (l && heard) l.textContent = '… ' + heard; };
    r.onerror = (e) => { failed = true; const c = e && e.error; if (c === 'aborted') return; toast(t(c === 'not-allowed' || c === 'service-not-allowed' ? 'mic.denied' : c === 'no-speech' ? 'mic.noSpeech' : c === 'network' ? 'mic.network' : 'mic.noSpeech')); };
    r.onend = () => {
      const mine = rec === r; rec = null;
      if (!mine || !document.body.contains(box)) return voiceUi(false, '', row);
      voiceUi(false, failed ? '' : heard, row);
      if (!heard || failed) return;
      const cur = box.value.trim(), clean = heard.replace(/[.。]+$/, ''), cap = clean.charAt(0).toUpperCase() + clean.slice(1);
      box.value = forSpanish ? cap : (cur ? cur + ' ' + clean : cap);
      box.dispatchEvent(new Event('change', { bubbles: true }));
    };
    try { r.start(); } catch (e) { rec = null; toast(t('mic.noSpeech')); }
  }

  /* Word library and the Spanish name of an item (shown to Spanish-speaking visitors of the store). */
  const Wd = window.Words;
  function wordList() {
    if (state.settings.wordsSeeded !== 3) { state.settings.words = Wd.seed(state.settings.words || []); state.settings.wordsSeeded = 3; save(); }   // 3 = the big starter list that knows grammar
    return state.settings.words || [];
  }
  const esBadge = (i) => { const sp = Wd.spanish(i, wordList()); return sp.state === 'none' ? '' : `<u class="${sp.state === 'ok' ? 'ok' : ''}">${sp.state === 'ok' ? '✓' : '!'}</u>`; };
  // On an English phone the description is the English name and 🇪🇸 is the Spanish name; on a Spanish phone it is the other way round.
  const esMode = () => I.getLang() === 'es';
  const enBadge = (i) => { const e = Wd.english(i, wordList()); return e.state === 'none' ? '' : `<u class="${e.state === 'ok' ? 'ok' : ''}">${e.state === 'ok' ? '✓' : '!'}</u>`; };
  const flagInner = (i) => (esMode() ? '🇬🇧' + enBadge(i) : '🇪🇸' + esBadge(i));
  const descShown = (i) => (esMode() ? Wd.spanish(i, wordList()).es : i.desc);
  const esBtn = (i) => `<button type="button" class="fl2" data-act="${esMode() ? 'en-open' : 'es-open'}" data-id="${i.id}" aria-label="${t(esMode() ? 'en.aria' : 'es.aria')}">${flagInner(i)}</button>`;
  function refreshEs(i) { const b = document.querySelector(`.fl2[data-id="${i.id}"]`); if (b) b.innerHTML = flagInner(i); }
  // a name typed or spoken in Spanish: it is the Spanish name, and the English one is worked out from it (unless you confirmed an English one)
  function setSpanishName(i, v) {
    v = String(v || '');
    if (!v.trim()) { delete i.nameEs; i.esSet = false; delete i.esFor; L.applyToGroup(state, i, ['nameEs', 'esSet', 'esFor']); return; }
    i.nameEs = v; i.esSet = true;
    if (!(i.enSet && i.enFor === v)) {
      const e = Wd.toEnglish(v, wordList());
      if (!e.missing.length || !String(i.desc || '').trim()) i.desc = e.en;   // never replace a good English name with a half-understood one
      i.enSet = false; delete i.enFor;
    }
    i.esFor = i.desc;
    L.applyToGroup(state, i, ['desc', 'nameEs', 'esSet', 'esFor', 'enSet', 'enFor']);
  }
  function sheetEnglish(id) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    const e = Wd.english(i, wordList());
    openSmall(`<h3>🇬🇧 ${t('en.label')}</h3><p>${t('en.sub')}</p><label>${t('en.label')}</label>
      <div class="esrow"><input id="en-name" value="${esc(i.desc || e.en)}" placeholder="${t('en.ph')}" autocomplete="off" enterkeyhint="done">${micBtn('mic-en')}</div>
      ${e.missing.length ? `<div class="warn">⚠️ <span>${t('en.missing', { words: e.missing.map((w) => '“' + esc(w) + '”').join(', ') })}</span><button type="button" data-act="en-addwords" data-id="${id}">${t('en.add')}</button></div>` : ''}
      <div class="btns"><button class="btn primary" data-act="en-done" data-id="${id}">${t('es.done')}</button></div>
      <a class="lnk" data-act="es-lib">${t('es.openLib')}</a>`, 'sheet');
  }
  function sheetAddWordsEn(id) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    const miss = Wd.english(i, wordList()).missing; if (!miss.length) return sheetEnglish(id);
    openSmall(`<h3>${t('en.addTitle')}</h3><p>${t('en.addSub')}</p>
      ${miss.map((w) => `<div class="wb"><div class="w"><b>${esc(w)}</b><i>→</i><input data-ws="${esc(w)}" placeholder="${t('en.wordPh')}" autocomplete="off"></div>${typeSelect('', 'a', 'data-wt')}</div>`).join('')}
      <div class="btns"><button class="btn primary" data-act="en-savewords" data-id="${id}">${t('en.save')}</button></div><a class="lnk" data-act="es-lib">${t('es.openLib')}</a>`, 'sheet');
  }
  function sheetSpanish(id) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    const sp = Wd.spanish(i, wordList());
    openSmall(`<h3>🇪🇸 ${t('es.label')}</h3><p>${t('es.sub')}</p><label>${t('es.label')}</label>
      <div class="esrow"><input id="es-name" value="${esc(sp.es)}" placeholder="${t('es.ph')}" autocomplete="off" enterkeyhint="done">${micBtn('mic-es')}</div>
      ${sp.missing.length ? `<div class="warn">⚠️ <span>${t('es.missing', { words: sp.missing.map((w) => '“' + esc(w) + '”').join(', ') })}</span><button type="button" data-act="es-addwords" data-id="${id}">${t('es.add')}</button></div>` : ''}
      <div class="btns"><button class="btn primary" data-act="es-done" data-id="${id}">${t('es.done')}</button></div>
      <a class="lnk" data-act="es-lib">${t('es.openLib')}</a>`, 'sheet');
  }
  const typeSelect = (id, cur, attrs) => `<select ${id ? `id="${id}"` : ''} ${attrs || ''} aria-label="${t('words.type')}">${['nm', 'nf', 'npm', 'npf', 'a', 'ai', 'm', 'p', 'c', 'x'].map((k) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${t('words.t.' + k)}</option>`).join('')}</select>`;
  function sheetAddWords(id) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    const miss = Wd.spanish(i, wordList()).missing; if (!miss.length) return sheetSpanish(id);
    openSmall(`<h3>${t('es.addTitle')}</h3><p>${t('es.addSub')}</p>
      ${miss.map((w) => `<div class="wb"><div class="w"><b>${esc(w)}</b><i>→</i><input data-w="${esc(w)}" placeholder="${t('words.spanish')}" autocomplete="off"></div>${typeSelect('', 'a', 'data-wt')}</div>`).join('')}
      <div class="btns"><button class="btn primary" data-act="es-savewords" data-id="${id}">${t('es.save')}</button></div><a class="lnk" data-act="es-lib">${t('es.openLib')}</a>`, 'sheet');
  }
  let wordQ = '', wordGroup = 'all';
  const wordGroups = ['clothes', 'shoes', 'colours', 'styles', 'materials', 'more', ''];
  function wordsListHTML() {
    const q = Wd.norm(wordQ), list = wordList().filter((w) => (wordGroup === 'all' || (wordGroup === 'yours' ? !w.c : w.c === wordGroup)) && (!q || Wd.norm(w.en).includes(q) || Wd.norm(w.es).includes(q)));
    const html = wordGroups.map((g) => {
      const rows = list.filter((w) => (w.c || '') === g).sort((x, y) => x.en.localeCompare(y.en));
      return rows.length ? `<h4><span>${g ? t('words.c.' + g) : t('words.yours')}</span></h4><div class="card">${rows.map((w) => `<div class="pair"><button class="pm" data-act="word-edit" data-id="${esc(w.en)}"><b>${esc(w.en)}</b><i>→</i><span class="t2">${esc(w.es)}</span></button><button class="x" data-act="word-del" data-id="${esc(w.en)}" aria-label="${t('btn.delete')}">✕</button></div>`).join('')}</div>` : '';
    }).join('');
    return html || `<div class="empty">${t('words.empty')}</div>`;
  }
  const wordsChips = () => ['all', 'clothes', 'shoes', 'colours', 'styles', 'materials', 'more', 'yours'].map((g) => `<button class="${wordGroup === g ? 'on' : ''}" data-act="word-group" data-id="${g}">${g === 'all' ? t('words.all') : g === 'yours' ? t('words.yours') : t('words.c.' + g)}</button>`).join('');
  function sheetWords(swap) {
    enterPage('words', '', () => sheetWords(), swap);
    const list = wordList();
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('words.title')}</b><small id="wcount">${t('words.count', { n: list.length })}</small></div><button class="dots" data-act="words-more" aria-label="${t('batch.more')}">⋮</button></div>
      <div class="ap lib">${state.settings.wordsHideNote ? '' : `<div class="starter">📚<b>${t('words.starter', { n: Wd.STARTER.length })}</b><button data-act="word-hide">${t('words.hide')}</button></div>`}
      <h4><span>${t('words.try')}</span></h4><div class="card try"><input id="w-try" placeholder="${t('words.tryPh')}" autocomplete="off"><div id="w-tryout" class="tryout">${t('words.tryHelp')}</div></div>
      <div class="srch2"><span>🔍</span><input id="w-q" value="${esc(wordQ)}" placeholder="${t('words.search')}" autocomplete="off"></div>
      <div class="tabs" id="wchips">${wordsChips()}</div>
      <h4><span>${t('words.add')}</span></h4><div class="card"><div class="add"><input id="w-en" placeholder="${t('words.english')}" autocomplete="off"><i>→</i><input id="w-es" placeholder="${t('words.spanish')}" autocomplete="off" enterkeyhint="done"><button class="go" data-act="word-add" aria-label="${t('words.add')}">＋</button></div><div class="addt">${typeSelect('w-t', 'a')}</div></div>
      <div id="wlist">${wordsListHTML()}</div></div>`, null, true);
  }
  function tryName() {
    const f = $('#w-try'), out = $('#w-tryout'); if (!f || !out) return; const v = f.value.trim();
    if (!v) { out.textContent = t('words.tryHelp'); return; }
    const r = Wd.translate(v, wordList()); out.innerHTML = `<b>${esc(r.es)}</b>${r.missing.length ? `<small>${t('es.missing', { words: r.missing.map((x) => '“' + esc(x) + '”').join(', ') })}</small>` : ''}`;
  }
  const wordsRefresh = () => { const l = $('#wlist'); if (l) l.innerHTML = wordsListHTML(); const c = $('#wchips'); if (c) c.innerHTML = wordsChips(); const n = $('#wcount'); if (n) n.textContent = t('words.count', { n: wordList().length }); };
  // How the store works (sizes, identical items as one card): both languages, tabs.
  let shLang = null;
  function sheetStoreHelp(swap) {
    enterPage('storehelp', '', () => sheetStoreHelp(), swap);
    const L2 = shLang || (I.getLang() === 'es' ? 'es' : 'en'), tt = (k, v) => t(k, v, L2), li = (k) => tt(k).split('|').map((x) => `<li>${x}</li>`).join('');
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${tt('sh.title')}</b><small>English · Español</small></div></div>
      <div class="ap lib wh"><div class="tabs">${['en', 'es'].map((l) => `<button class="${L2 === l ? 'on' : ''}" data-act="sh-lang" data-id="${l}">${l === 'en' ? 'English' : 'Español'}</button>`).join('')}</div>
      <p>${tt('sh.intro')}</p>
      <h4><span>${tt('sh.s1')}</span></h4><div class="card whc"><ul>${li('sh.s1b')}</ul></div>
      <h4><span>${tt('sh.s2')}</span></h4><div class="card whc"><ul>${li('sh.s2b')}</ul></div>
      <h4><span>${tt('sh.ex')}</span></h4><div class="card whc"><ol>${li('sh.exb')}</ol></div>
      <h4><span>${tt('sh.s3')}</span></h4><div class="card whc"><ul>${li('sh.s3b')}</ul></div></div>`, null, true);
  }
  // How the library works: written in both languages (tabs), with live examples worked out from the owner's own words.
  let whLang = null;
  function sheetWordsHelp(swap) {
    enterPage('wordshelp', '', () => sheetWordsHelp(), swap);
    const L2 = whLang || (I.getLang() === 'es' ? 'es' : 'en'), tt = (k, v) => t(k, v, L2), list = wordList();
    const ex = ['Blue dress', 'Red top', 'Red and blue jacket', 'Red, white and blue dress', 'Long sleeve shirt', 'Long sleeve jacket', 'Short sleeve shirt', 'Short pants', 'Blue short pants', 'Black dresses', 'Blue linen set'];
    const para = (k) => `<p>${tt(k)}</p>`, li = (k) => tt(k).split('|').map((x) => `<li>${x}</li>`).join('');
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${tt('wh.title')}</b><small>English · Español</small></div></div>
      <div class="ap lib wh"><div class="tabs">${['en', 'es'].map((l) => `<button class="${L2 === l ? 'on' : ''}" data-act="wh-lang" data-id="${l}">${l === 'en' ? 'English' : 'Español'}</button>`).join('')}</div>
      ${para('wh.intro')}
      <h4><span>${tt('wh.s1')}</span></h4><div class="card whc"><ul>${li('wh.s1b')}</ul></div>
      <h4><span>${tt('wh.s2')}</span></h4><div class="card whc"><ol>${li('wh.s2b')}</ol></div>
      <h4><span>${tt('wh.exT')}</span></h4><div class="card whc"><div class="wex"><b>Blue short pants</b><span>→ ${esc(Wd.translate('Blue short pants', list).es)}</span></div><ol>${li('wh.exB')}</ol></div>
      <h4><span>${tt('wh.more')}</span></h4><div class="card">${ex.map((e) => `<div class="pair"><span class="pm"><b>${e}</b><i>→</i><span class="t2">${esc(Wd.translate(e, list).es)}</span></span></div>`).join('')}</div>
      <h4><span>${tt('wh.tipsT')}</span></h4><div class="card whc"><ul>${li('wh.tips')}</ul></div>
      <p class="muted small">${tt('wh.limit')}</p></div>`, null, true);
  }
  function sheetWordEdit(en) {
    const w = wordList().find((x) => Wd.norm(x.en) === Wd.norm(en)); if (!w) return;
    openSmall(`<h3>${t('words.edit')}</h3><label>${t('words.english')}</label><input id="we-en" value="${esc(w.en)}" autocomplete="off"><label>${t('words.spanish')}</label><input id="we-es" value="${esc(w.es)}" autocomplete="off"><label>${t('words.type')}</label>${typeSelect('we-t', Wd.typeOf(w))}
      <div class="btns"><button class="btn primary" data-act="word-save" data-id="${esc(w.en)}">${t('btn.save')}</button><button class="btn danger" data-act="word-del2" data-id="${esc(w.en)}">${t('btn.delete')}</button><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet');
  }
  /* ---------- Sizes, "How many of these?" and groups (one design = several pieces, each its own item) ---------- */
  const SZ_STD = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size'];
  const SZ_SHOE_CH = ['6', '7', '8', '9', '10', '11', '12'];
  const SZ_KIDS_CH = ['6M', '12M', '2Y', '4Y', '6Y', '8Y', '10Y'];
  const SHOE_RE = /shoe|sandal|boot|heel|sneaker|slipper|flat|loafer|slide|croc|wedge|pump|mule|clog|trainer|zapato|bota|tenis|chancla|tacon/i;
  const KIDS_RE = /baby|kid|girl|boy|child|toddler|infant|onesie|beb[eé]|ni[nñ]|infantil/i;
  const sizeKind = (desc) => { const d = String(desc || ''); return SHOE_RE.test(d) ? 'shoe' : KIDS_RE.test(d) ? 'kids' : 'cloth'; };
  const range = (a, b, step) => { const o = []; for (let x = a; x <= b + 1e-9; x += step) o.push(String(Math.round(x * 10) / 10)); return o; };
  const SZ_SETS = {
    cloth: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'One size'],
    kids: ['0-3M', '3-6M', '6-9M', '9-12M', '12-18M', '18-24M', '2Y', '3Y', '4Y', '5Y', '6Y', '7Y', '8Y', '10Y', '12Y', '14Y'],
    shoeUS: range(5, 13, 0.5), shoeEU: range(35, 46, 1).map((x) => 'EU ' + x), shoeUK: range(3, 12, 0.5).map((x) => 'UK ' + x),
  };
  const szLabel = (z) => (z === 'One size' ? t('size.one') : z);
  const lockToast = (i) => toast(t(L.isSold(i) ? 'item.lockedToast' : 'item.orderedToast'));
  const grpOf = (i) => L.groupOf(state, i);
  const grpName = (i) => esc(String(dn(i) || '').trim() || t('item.untitled'));
  const sizeSummary = (list) => list.filter((c) => c.s).map((c) => szLabel(c.s) + ' ×' + c.n).join(' · ');
  // The items one "Edit batch" page walks through: a design with several pieces is one stop.
  const quickIds = (batchId) => state.items.filter((x) => x.batchId === batchId && !L.isLocked(x)).filter((x) => !x.grp || grpOf(x)[0] === x).map((x) => x.id).sort();
  const idNo = (id) => String(id).split('-')[1] || id;
  const onQuick = () => !!document.querySelector('#sheet .qe');
  function grpNote(i, single) {
    const g = grpOf(i); if (g.length < 2) return '';
    const cnt = L.sizeCounts(state, i), sm = sizeSummary(cnt), none = '—';
    const lbl = (list, withPct) => { const m = new Map(); list.forEach((x) => { const k = (String(x.size || '').trim() || none) + (withPct ? '|' + x.discount : ''); m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].map(([k, n]) => { const [zz, pc] = k.split('|'); return szLabel(zz) + ' ×' + n + (pc ? ' (' + pc + '%)' : ''); }).join(' · '); };
    const on = g.filter((x) => x.saleOn && Number(x.discount) > 0), off = g.filter((x) => !on.includes(x));
    const saleLine = !on.length ? '' : !off.length && new Set(on.map((x) => x.discount)).size === 1 ? t('grp.saleAll', { n: g.length, pct: on[0].discount }) : t('grp.saleSome', { on: lbl(on, true), off: lbl(off, false) });
    const prices = new Map(); g.forEach((x) => { const k = L.r2(Number(x.price) || 0); prices.set(k, (prices.get(k) || []).concat(x)); });
    const priceLine = prices.size > 1 ? t('grp.priceDiff', { list: [...prices.entries()].map(([p, l]) => lbl(l, false) + ' ' + money(p)).join(' · ') }) : '';
    return `<div class="gnote" id="gnote" data-s="${single ? 1 : ''}">🧩<div><b>${grpName(i)} · ${tn('grp.items', g.length)}</b> (${idNo(g[0].id)}–${idNo(g[g.length - 1].id)})${sm ? '<br>' + sm : ''}${saleLine ? '<br><b>' + saleLine + '</b>' : ''}${priceLine ? '<br>' + priceLine : ''}<small>${single ? t('grp.noteOne', { n: g.length }) : t('grp.note', { n: g.length })}</small></div></div>`;
  }
  const refreshNote = (i) => { const gn = $('#gnote'); if (gn) gn.outerHTML = grpNote(i, !!gn.dataset.s); };
  // On one item's own page, a sale or price change on a piece of a group asks who it is for: this size, just this item, or the whole design.
  function scopeAsk(it, kind, sub) {
    const g = grpOf(it); if (g.length < 2) return Promise.resolve([it]);
    const zz = String(it.size || '').trim(), same = zz ? g.filter((x) => String(x.size || '').trim().toLowerCase() === zz.toLowerCase()) : [it], sm = sizeSummary(L.sizeCounts(state, it));
    const allSame = same.length === g.length, hasSame = same.length > 1 && !allSame;
    const row = (v, ic, ti, no, rec) => `<button class="sc ${rec ? 'rec' : ''}" data-act="scope-pick" data-v="${v}"><i>${ic}</i><span>${ti}<small>${no}</small></span>${rec ? `<em>${t('scope.suggested')}</em>` : ''}</button>`;
    const rows = (hasSame ? row('same', '👕', t('scope.same', { n: same.length, s: szLabel(zz) }), tn('scope.identical', same.length), true) : '')
      + row('one', '1️⃣', t('scope.justThis'), zz && !same.length ? '' : (same.length === 1 && zz ? t('scope.onlySize', { id: it.id, s: szLabel(zz) }) : t('scope.only', { id: it.id })), !hasSame && !allSame)
      + row('all', '🧩', t('scope.all', { n: g.length }), sm || '', allSame);
    return new Promise((ok) => {
      let done = false; const fin = (v) => { if (!done) { done = true; ok(v === 'same' ? same : v === 'one' ? [it] : v === 'all' ? g : null); } }; window.__scope = fin;
      openSmall(`<h3>${t('scope.title.' + kind)}</h3><p>${esc(String(it.desc || '').trim() || t('item.untitled'))}${zz ? ' · ' + t('scope.size', { s: esc(szLabel(zz)) }) : ''} · ${sub}</p>${rows}<a class="cn" data-act="close" role="button">${t('btn.cancel')}</a>`, 'sheet', () => fin(null));
    });
  }
  async function setSale(it, saleOn, pct) {
    const who = onQuick() ? grpOf(it) : (saleOn && pct == null && !(Number(it.discount) > 0)) ? [it] : await scopeAsk(it, saleOn ? 'sale' : 'off', saleOn ? t('scope.pctOff', { pct: pct != null ? pct : Number(it.discount) || 0 }) : t('scope.saleOff'));
    if (!who) { if (typeof discOld !== 'undefined' && discOld.id === it.id) it.discount = discOld.v; discOld = { id: '', v: 0 }; save(); return refreshSaleBlock(it); }
    who.concat(it).forEach((x) => { x.saleOn = saleOn; if (pct != null) x.discount = pct; });
    discOld = { id: '', v: 0 }; save(); refreshSaleBlock(it); refreshNote(it);
  }
  async function setPrice(it, v, oldV) {
    const who = onQuick() ? grpOf(it) : await scopeAsk(it, 'price', t('scope.priceTo', { p: money(v) }));
    const f = $('#sheet [data-f=price]');
    if (!who) { it.price = oldV; if (f) f.value = oldV || ''; return updateSale(it); }
    who.concat(it).forEach((x) => { x.price = v; }); if (f) f.value = v || '';
    save(); updateSale(it); refreshNote(it);
  }
  let discOld = { id: '', v: 0 };
  // The Size section. One piece: chips that slide sideways + More…; several pieces: a button that opens the Split-by-size picker.
  let qeTried = false;
  function szSection(i, single, req) {
    const members = single ? [i] : grpOf(i), n = members.length, missing = members.filter((x) => !String(x.size || '').trim()).length;
    const bad = req && qeTried && missing, hl = !req && single && n === 1 && missing && String(i.desc || '').trim() !== '', head = `<label>${t('size.label')}${req && missing ? ` <span class="req">${t('size.required')}</span>` : ''}${hl ? ` <span class="nz">· ${t('size.pick')}</span>` : ''}</label>`;
    let body;
    if (n === 1) {
      const cur = String(i.size || '').trim(), k = sizeKind(i.desc), set = k === 'shoe' ? SZ_SHOE_CH : k === 'kids' ? SZ_KIDS_CH : SZ_STD, std = set.find((z) => z.toLowerCase() === cur.toLowerCase());
      body = `<div class="szchips">${set.map((z) => `<button type="button" class="${std === z ? 'on' : ''}" data-act="size-set" data-id="${i.id}" data-v="${z}">${szLabel(z)}</button>`).join('')}<button type="button" class="${cur && !std ? 'on' : ''}" data-act="szp-open" data-id="${i.id}" data-single="1">${cur && !std ? esc(cur) : t('size.more')}</button></div>`;
    } else {
      const sm = sizeSummary(L.sizeCounts(state, i)), placed = n - missing;
      body = `<button type="button" class="btnz ${missing ? '' : 'ok'}" data-act="szp-open" data-id="${i.id}"><span>${t('size.split')}</span><small class="${missing ? 'bad' : ''}">${missing ? t('size.placed', { n: placed, total: n }) : esc(sm)}</small></button>`;
    }
    return `<div class="szrow ${bad ? 'err' : ''} ${hl ? 'hl' : ''}" id="szrow" data-kind="${sizeKind(i.desc)}" data-single="${single ? 1 : ''}" data-req="${req ? 1 : ''}">${head}${body}${bad ? `<p class="errtxt">${t('size.choose')}</p>` : ''}</div>`;
  }
  const scrollSize = () => { const on = document.querySelector('#szrow .szchips .on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' }); };
  function refreshSize(i) { const el = $('#szrow'); if (el) { el.outerHTML = szSection(i, !!el.dataset.single, !!el.dataset.req); scrollSize(); } refreshNote(i); refreshStripTile(i); refreshGo(i); }
  // After typing: refresh the notes around the Size row, and rebuild the row itself only when its chips change (a rebuild under a finger loses the tap).
  function refreshAfterEdit(i) { const el = $('#szrow'); if (el && el.dataset.kind !== sizeKind(i.desc)) return refreshSize(i); refreshNote(i); refreshStripTile(i); refreshGo(i); }
  const refreshStripTile = (i) => { const q = document.querySelector(`#qstrip .qt[data-id="${i.id}"]`); if (q) q.className = 'qt ' + (q.classList.contains('on') ? 'on ' : '') + stripState(i); };
  const stripState = (i) => (!String(i.desc || '').trim() ? '' : L.needsSize(state, i) ? 'warn' : 'done');
  function refreshGo(i) { const b = document.querySelector('.qgo .pr'); if (b) b.classList.toggle('blocked', L.needsSize(state, i)); }
  // Quick page: rebuild in place (keeps the scroll position).
  function reQuick(i) { const y = $('#sheet').scrollTop; sheetQuick(i.batchId, i.id, true); $('#sheet').scrollTop = y; }
  // "How many of these?"
  const qtyHtml = (i) => `<div class="stp" id="qtybox"><button type="button" data-act="qty-dec" data-id="${i.id}" aria-label="−">−</button><input data-qty="${i.id}" type="text" inputmode="numeric" value="${grpOf(i).length}" aria-label="${t('qty.label')}"><button type="button" data-act="qty-inc" data-id="${i.id}" aria-label="+">+</button></div>`;
  function slotsCard(free, need) {
    return new Promise((ok) => {
      let done = false; const fin = (v) => { if (!done) { done = true; ok(v); } }; window.__slots = fin;
      openSmall(`<h3>${tn('qty.onlyLeft', free)}</h3><p>${t('qty.onlyLeftNote', { need })}</p>
        <div class="btns"><button class="btn primary" data-act="slots-add">${tn('qty.addSpots', need - free)}</button>${free ? `<button class="btn" data-act="slots-use">${t('qty.useLeft', { n: free })}</button>` : ''}<button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'card', () => fin(null));
    });
  }
  async function setQty(i, want) {
    want = Math.max(1, Math.min(300, parseInt(want, 10) || 1));
    const cur = grpOf(i).length; if (want === cur) return reQuick(i);
    if (want > cur) {
      let need = want - cur; const free = L.freeSlots(state, i.batchId).filter((x) => x !== i).length;
      if (free < need) {
        const ch = await slotsCard(free, need);
        if (ch === 'add') L.addItems(state, i.batchId, need - free); else if (ch === 'use' && free) need = free; else return reQuick(i);
      }
      try { L.makeCopies(state, i.id, need); } catch (e) { toast('⚠️ ' + errMsg(e)); return reQuick(i); }
      save(); render(); return reQuick(i);   // only the count changes; the size picker opens when the owner taps Split by size
    }
    const ok = await askCard(tn('qty.dropAsk', cur - want, { name: String(i.desc || '').trim() || t('item.untitled') }), { danger: true, ok: t('qty.dropOk') });
    if (ok) { L.dropCopies(state, i.id, cur - want); save(); render(); }
    reQuick(i);
  }

  /* The Split-by-size picker: tap a size = one more, hold (or tap the number) = type how many. */
  const SZ_TABS = ['cloth', 'shoe', 'kids', 'mine'];
  let szp = null, holdT = null, holdFired = false;
  const szpList = () => szp.tab === 'cloth' ? SZ_SETS.cloth : szp.tab === 'kids' ? SZ_SETS.kids : szp.tab === 'mine' ? (state.settings.mySizes || []) : szp.sys === 'EU' ? SZ_SETS.shoeEU : szp.sys === 'UK' ? SZ_SETS.shoeUK : SZ_SETS.shoeUS;
  const szpTotal = () => Object.values(szp.d).reduce((a, b) => a + b, 0);
  function szpOpen(i, single) {
    const g = single ? [i] : grpOf(i), d = {};
    g.forEach((x) => { const z = String(x.size || '').trim(); if (z) d[z] = (d[z] || 0) + 1; });
    szp = { id: i.id, single: !!single, n: g.length, d, tab: { cloth: 'cloth', shoe: 'shoe', kids: 'kids' }[sizeKind(i.desc)], sys: 'US', pop: null, view: 'grid', last: '' };
    openSmall(`<div id="szp">${szpHtml()}</div>`, 'sheet', () => { szp = null; });
  }
  const szpDraw = () => { const el = $('#szp'); if (el) el.innerHTML = szpHtml(); };
  function szpHtml() {
    const it = state.items.find((x) => x.id === szp.id), n = szp.n;
    if (szp.view === 'add') return `<h3>${t('szp.addTitle')}</h3><p>${t('szp.addSub')}</p>
      <label>${t('szp.typed')}</label><input id="szp-typed" placeholder="${t('szp.typedPh')}" autocomplete="off">
      <label>${t('szp.range')}</label><div class="grid3"><input id="szp-from" type="text" inputmode="decimal" placeholder="${t('szp.from')}"><input id="szp-to" type="text" inputmode="decimal" placeholder="${t('szp.to')}"><input id="szp-step" type="text" inputmode="decimal" placeholder="${t('szp.step')}"></div>
      <div class="btns"><button class="btn primary" data-act="szp-addsave">${t('btn.save')}</button><button class="btn" data-act="szp-view">${t('btn.cancel')}</button></div>`;
    const total = szpTotal(), rest = n - total, list = szpList();
    const tabs = SZ_TABS.map((k) => `<button type="button" class="${szp.tab === k ? 'on' : ''}" data-act="szp-tab" data-v="${k}">${t('szp.tab.' + k)}</button>`).join('');
    const sys = szp.tab === 'shoe' ? `<div class="szsys">${['US', 'EU', 'UK'].map((s) => `<button type="button" class="${szp.sys === s ? 'on' : ''}" data-act="szp-sys" data-v="${s}">${s}</button>`).join('')}</div>` : '';
    const tiles = list.map((z) => `<button type="button" class="szt ${szp.d[z] ? 'on' : ''}" data-v="${esc(z)}" data-act="szp-tap">${esc(szLabel(z))}${szp.d[z] && !szp.single ? `<i class="bd" data-act="szp-pop" data-v="${esc(z)}">${szp.d[z]}</i>` : ''}</button>`).join('');
    // sizes that were typed in elsewhere (not in the grid) still show so they can be changed
    const extra = Object.keys(szp.d).filter((z) => !list.includes(z) && !Object.values(SZ_SETS).some((s) => s.includes(z)) && !(state.settings.mySizes || []).includes(z)).map((z) => `<button type="button" class="szt on" data-v="${esc(z)}" data-act="szp-tap">${esc(z)}${szp.single ? '' : `<i class="bd" data-act="szp-pop" data-v="${esc(z)}">${szp.d[z]}</i>`}</button>`).join('');
    const sm = Object.keys(szp.d).filter((z) => szp.d[z] > 0).sort(L.cmpSize).map((z) => szLabel(z) + ' ×' + szp.d[z]).join(' · ');
    let pop = '';
    if (szp.pop) { const cur = szp.d[szp.pop] || 0, max = rest + cur; pop = `<div class="szpop"><b>${t('szp.howMany', { s: esc(szLabel(szp.pop)) })}</b><input id="szp-n" type="text" inputmode="numeric" value="${cur || ''}" placeholder="0" aria-label="${t('szp.howMany', { s: szLabel(szp.pop) })}">
      <div class="chiprow">${max > 0 ? `<button type="button" class="chip" data-act="szp-all" data-v="${max}">${t('szp.all', { n: max })}</button>` : ''}<button type="button" class="chip" data-act="szp-zero">${t('szp.none')}</button></div>
      <div class="btns"><button class="btn" data-act="szp-popx">${t('btn.cancel')}</button><button class="btn primary" data-act="szp-popset">✓ ${t('szp.set')}</button></div></div>`; }
    const ok = szp.single ? total === 1 : total === n;
    return `<h3>${szp.single ? t('szp.titleOne') : t('szp.title', { name: grpName(it) })}</h3>
      <div class="sztabs">${tabs}</div>${sys}
      <div class="szgrid">${tiles}${extra}<button type="button" class="szt add" data-act="szp-view" data-v="add">＋ ${t('szp.add')}</button></div>
      ${pop}
      ${szp.single ? '' : `<p class="szsum ${ok ? 'ok' : 'bad'}">${sm || t('szp.nothing')} <b>${t('szp.ofN', { n: total, total: n })}</b></p>${rest > 0 && szp.last ? `<button type="button" class="chip" data-act="szp-rest">${t('szp.putRest', { n: rest, s: szLabel(szp.last) })}</button>` : ''}<p class="muted small">${t('szp.hint')}</p>`}
      <div class="btns"><button class="btn primary ${ok ? '' : 'blocked'}" data-act="szp-done">${t('btn.done')}</button></div>`;
  }
  function szpApply() {
    const it = state.items.find((x) => x.id === szp.id); if (!it) return false;
    if (szp.single) { const z = Object.keys(szp.d).find((k) => szp.d[k] > 0); if (!z) return false; it.size = z; save(); return true; }
    if (szpTotal() !== szp.n) { toast(t('szp.mustMatch', { n: szp.n })); return false; }
    try { L.setSizes(state, it, Object.keys(szp.d).filter((z) => szp.d[z] > 0).map((z) => ({ s: z, n: szp.d[z] }))); save(); return true; } catch (e) { toast('⚠️ ' + errMsg(e)); return false; }
  }
  const szpTap = (z) => {
    if (szp.single) { szp.d = { [z]: 1 }; szp.last = z; return szpDraw(); }
    if (szpTotal() >= szp.n) return toast(t('szp.full', { n: szp.n }));
    szp.d[z] = (szp.d[z] || 0) + 1; szp.last = z; szp.pop = null; szpDraw();
  };
  const szpPopOpen = (z) => { if (!szp || szp.single) return; szp.pop = z; szp.last = z; szpDraw(); const f = $('#szp-n'); if (f) { f.focus(); f.select(); } };
  function szpSaveTyped() {
    const raw = ($('#szp-typed').value || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean), a = parseFloat(String($('#szp-from').value).replace(',', '.')), b = parseFloat(String($('#szp-to').value).replace(',', '.')), st = parseFloat(String($('#szp-step').value).replace(',', '.')) || 1;
    let more = raw.slice(); if (isFinite(a) && isFinite(b) && b >= a && (b - a) / st <= 60) more = more.concat(range(a, b, st));
    if (!more.length) return toast(t('szp.addNone'));
    const mine = (state.settings.mySizes || []).slice(); more.forEach((z) => { if (!mine.some((m) => m.toLowerCase() === z.toLowerCase())) mine.push(z); });
    state.settings.mySizes = mine.sort(L.cmpSize); save(); szp.tab = 'mine'; szp.view = 'grid'; szpDraw();
  }
  // Holding a size tile (about half a second) opens the "how many" box.
  document.addEventListener('pointerdown', (e) => { holdFired = false; const b = e.target.closest && e.target.closest('.szt[data-act=szp-tap]'); if (!b || e.target.closest('.bd')) return; clearTimeout(holdT); holdT = setTimeout(() => { holdT = null; holdFired = true; szpPopOpen(b.dataset.v); }, 450); });
  ['pointerup', 'pointercancel', 'pointerleave', 'scroll'].forEach((ev) => document.addEventListener(ev, () => { clearTimeout(holdT); holdT = null; }, true));
  document.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest('.szt')) e.preventDefault(); });
  // Previous / next arrows (with "4 of 8") for the top bar, to flip through the items of one batch without going back.
  const navArrows = (ids, id, act) => { const n = ids.indexOf(id); if (n < 0 || ids.length < 2) return ''; return `<div class="nx"><span class="c">${t('nav.ofN', { n: n + 1, total: ids.length })}</span><button data-act="${act}" data-id="${ids[n - 1] || ''}" ${n ? '' : 'disabled'} aria-label="${t('nav.prev')}">‹</button><button data-act="${act}" data-id="${ids[n + 1] || ''}" ${n < ids.length - 1 ? '' : 'disabled'} aria-label="${t('nav.next')}">›</button></div>`; };
  let itemNavIds = null;   // the items a swipe moves through: the invoice or order the item was opened from (null: the item's batch)
  const batchIds = (batchId, unsoldOnly) => state.items.filter((x) => x.batchId === batchId && (!unsoldOnly || !L.isLocked(x))).map((x) => x.id).sort();
  /* moving to the next or last item: the photo slides out and the next photo slides in (dir 1 = next, -1 = last); the details below fade and shift a little while they change */
  let sliding = false;
  const slideParts = () => { const sh = $('#sheet'), sw = sh.querySelector('.swbox');
    const mv = sw ? [...sw.querySelectorAll('.photo-big, .swe')] : [];
    const fd = (sw ? [...sw.querySelectorAll(':scope > .btn')] : []).concat([...sh.children].filter((e) => e !== sw && !e.classList.contains('fullbar') && !e.classList.contains('grab')));
    return { mv, fd }; };
  const setParts = (list, tr, op, ms) => list.forEach((e) => { e.style.transition = ms ? `transform ${ms}ms cubic-bezier(.2,.9,.3,1), opacity ${ms}ms` : 'none'; e.style.transform = tr; e.style.opacity = op; });
  function slideItem(id, dir) {
    if (!id || sliding) return; const sh = $('#sheet');
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { sheetItem(id, true); sh.scrollTop = 0; return; }
    sliding = true; sh.style.overflowX = 'hidden';
    let p = slideParts(); setParts(p.mv, `translateX(${-dir * 112}%)`, '', 170); setParts(p.fd, `translateX(${-dir * 6}%)`, '0', 170);
    setTimeout(() => {
      sheetItem(id, true); sh.scrollTop = 0; p = slideParts();
      setParts(p.mv, `translateX(${dir * 112}%)`, '', 0); setParts(p.fd, `translateX(${dir * 6}%)`, '0', 0); void sh.offsetWidth;
      setParts(p.mv, '', '', 230); setParts(p.fd, '', '', 230);
      setTimeout(() => { [...p.mv, ...p.fd].forEach((e) => { e.style.transition = ''; e.style.transform = ''; e.style.opacity = ''; }); sh.style.overflowX = ''; sliding = false; }, 260);
    }, 160);
  }
  const itemNavList = (i) => (itemNavIds && itemNavIds.includes(i.id) ? itemNavIds : batchIds(i.batchId, false));
  function removeItemPill() { const p = document.getElementById('inavpill'); if (p) p.remove(); }
  function showItemPill(i) {   // bottom right, under the thumb: ‹ 2 of 10 ›
    removeItemPill(); const ids = itemNavList(i), n = ids.indexOf(i.id); if (ids.length < 2 || n < 0) return;
    const p = document.createElement('div'); p.id = 'inavpill'; p.className = 'inavpill';
    p.innerHTML = `<button type="button" data-act="item-go" data-dir="prev" data-id="${ids[n - 1] || ''}" ${n ? '' : 'disabled'} aria-label="${t('nav.prev')}">‹</button><b>${t('nav.ofN', { n: n + 1, total: ids.length })}</b><button type="button" data-act="item-go" data-dir="next" data-id="${ids[n + 1] || ''}" ${n < ids.length - 1 ? '' : 'disabled'} aria-label="${t('nav.next')}">›</button>`;
    document.body.appendChild(p);
  }
  function sheetItem(id, swap) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    enterPage('item', id, () => sheetItem(id), swap);
    const b = batchOf(i), sold = L.isSold(i), ord = !sold && L.isHeld(i), lock = sold || ord, ordr = ord ? Store.orders().find((o) => o.status === 'new' && (o.items || []).some((x) => x.id === i.id)) : null;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${sold ? t('item.soldTitle') : ord ? t('item.orderedTitle') : t('item.editTitle')}</b><small>${i.id} · ${bl(b.id)} · ${esc(i.store)}${i.invoice ? t('item.invoice', { no: i.invoice }) : ''}${i.customer ? ' · ' + esc(clabel(i.customer)) : ''}</small></div><div class="tools">${(() => { const nb = notifCount(); return `<button class="round" data-act="bell" aria-label="${t('notif.title')}"><svg viewBox="0 0 24 24">${ICONS.bell}</svg>${nb ? `<b class="nb">${nb > 9 ? '9+' : nb}</b>` : ''}</button>`; })()}<button class="round" data-act="page-more" aria-label="${t('batch.more')}"><svg viewBox="0 0 24 24">${ICONS.dots}</svg></button></div></div>
      ${ord ? `<div class="lockbar">🔒 <div><b>${t('item.orderedLock')}</b><small>${t('item.orderedNote')}</small>${ordr ? `<button class="pay-btn" data-act="order-open" data-id="${ordr.id}">${t('item.viewOrder')}</button>` : ''}</div></div>` : ''}
      ${sold ? `<div class="lockbar">🔒 <div><b>${t('item.locked')}</b><small>${i.invoice ? t('item.lockedNote', { no: i.invoice }) : t('item.lockedNoInv')}</small>${(() => { const iv = state.invoices.find((x) => x.no === i.invoice); return iv && iv.balance > 0 && !iv.updatedBy ? `<button class="pay-btn" data-act="pay-inv" data-id="${iv.no}" data-back="item" data-item="${i.id}" style="margin-top:8px">${t('pay.btn')} · ${t('cust.stillOwes', { amt: money(iv.balance) })}</button>` : ''; })()}</div></div>` : ''}
      ${(() => { const ids = itemNavList(i), n = ids.indexOf(i.id); if (ids.length < 2 || n < 0) return PUI.photoBox(i); return `<div class="swbox" data-swipe="1">${PUI.photoBox(i)}${n > 0 ? `<button type="button" class="swe l" data-act="item-go" data-id="${ids[n - 1]}" aria-label="${t('nav.prev')}">‹</button>` : ''}${n < ids.length - 1 ? `<button type="button" class="swe r" data-act="item-go" data-id="${ids[n + 1]}" aria-label="${t('nav.next')}">›</button>` : ''}</div>`; })()}
      <fieldset class="lockset" ${lock || !can('stock') ? 'disabled' : ''}>
      <label>${t('item.desc')}</label><div class="dscrow"><input data-f="${esMode() ? 'descS' : 'desc'}" value="${esc(descShown(i))}" placeholder="${t('item.descPh')}" autocomplete="off">${micBtn()}${esBtn(i)}</div>${lock ? '' : szSection(i, true, false)}${lock ? '' : grpNote(i, true)}
      <div class="costonly"><label>🔒 ${t('item.cost', { cur: b.currency })} <span class="privnote">${t('item.privateNote')}</span></label><input data-f="cost" type="text" inputmode="decimal" step="0.01" min="0" value="${i.cost || ''}"></div>
      <div class="mrow" id="pricerow"><div><label>${t('item.price')}</label><input data-f="price" type="text" inputmode="decimal" step="0.01" min="0" value="${i.price || ''}" placeholder="0.00"></div><div><label class="ghost">&nbsp;</label><button class="btn" type="button" data-act="use-rec" data-id="${i.id}">${t('item.recShort')}</button></div></div>
      <div id="saleblock">${saleHTML(i)}</div>
      ${esMode() ? `<label>${t('item.details')}</label><textarea class="dta" data-f="detailsEs" rows="3" maxlength="600" placeholder="${t('item.detailsPh')}">${esc(i.detailsEs || '')}</textarea>
      <label>${t('item.detailsEn')}</label><textarea class="dta" data-f="details" rows="3" maxlength="600" placeholder="${t('item.detailsEnPh')}">${esc(i.details || '')}</textarea>` : `<label>${t('item.details')}</label><textarea class="dta" data-f="details" rows="3" maxlength="600" placeholder="${t('item.detailsPh')}">${esc(i.details || '')}</textarea>
      <label>${t('item.detailsEs')}</label><textarea class="dta" data-f="detailsEs" rows="3" maxlength="600" placeholder="${t('item.detailsEsPh')}">${esc(i.detailsEs || '')}</textarea>`}
      <p class="muted small">${t('item.detailsNote')}</p>
      <p class="muted small">${t('item.shownNote')}</p>
      <div class="grid2"><div><label>${t('item.sold')}</label><input data-f="sold" type="text" inputmode="decimal" step="0.01" min="0" value="${i.sold || ''}"></div>
      <div><label>${t('item.delivery')}</label><input data-f="delivery" type="text" inputmode="decimal" step="0.01" min="0" value="${i.delivery || ''}"></div></div>
      <div class="sumbox costonly" id="calc"></div>
      <label>${t('item.status')}</label><select data-f="status">${STATUSES.map((s) => `<option value="${s}" ${s === i.status ? 'selected' : ''}>${stLabel(s)}</option>`).join('')}</select>
      </fieldset>
      ${(sold || ord) ? pinRow(orderOfItem(i.id)) : ''}
      ${sold ? `<div class="btns">${i.invoice ? `<button class="btn" data-act="view-inv" data-id="${i.invoice}">${t('item.viewInv')}</button><button class="btn danger" data-act="return-inv" data-id="${i.invoice}">${t('item.returnInv')}</button>` : `<button class="btn danger" data-act="return-item" data-id="${i.id}">${t('item.returnItem')}</button>`}<button class="btn" data-act="close">${t('btn.done')}</button></div>`
      : `<div class="btns">${ord ? '' : `<button class="btn primary" data-act="${selected.has(i.id) ? 'unselect-close' : 'select-close'}" data-id="${i.id}">${selected.has(i.id) ? t('item.removeInv') : t('item.addInv')}</button>`}
      <button class="btn" data-act="close">${t('btn.done')}</button></div>`}`, render, true);
    $('#sheet').dataset.item = id; updateSale(i); scrollSize(); showItemPill(i);
    { const pb = document.querySelector('#sheet .swbox .photo-big'); if (pb) { if (getComputedStyle(pb).position === 'static') pb.style.position = 'relative'; document.querySelectorAll('#sheet .swbox > .swe').forEach((b) => pb.appendChild(b)); } }   // the side arrows sit on the photo itself
    const hlr = $('#szrow.hl'); if (hlr) setTimeout(() => hlr.scrollIntoView({ block: 'center' }), 60);   // an item with a name but no size: bring the Size block into view
  }
  /* Edit batch: one unsold item at a time with its picture, description, price, cost and sale; Save & next moves on. */
  function sheetQuick(batchId, id, swap) {
    let i = state.items.find((x) => x.id === id); if (!i) return;
    if (i.grp) { const f = grpOf(i)[0]; if (f) i = f; id = i.id; }
    const ids = quickIds(batchId); if (!ids.length) return;
    enterPage('quick', batchId, () => sheetQuick(batchId, id), swap);
    const b = batchOf(i), n = ids.indexOf(id);
    const strip = ids.map((x, k) => { const it = state.items.find((y) => y.id === x), gn = grpOf(it).length; return `<button class="qt ${x === id ? 'on' : ''} ${stripState(it)}" data-id="${x}" data-act="qe-go" data-b="${batchId}" aria-label="${x}">${it.photo ? `<img data-ph="${it.photo.id}" data-kind="thumb" alt="">` : `<em>${k + 1}</em>`}${gn > 1 ? `<u class="gx">×${gn}</u>` : ''}</button>`; }).join('');
    const blocked = L.needsSize(state, i);
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('qe.title')}</b><small>${bl(b.id)} · ${esc(i.store)}</small></div>${ids.length > 1 && n >= 0 ? `<div class="nx qcount"><span class="c">${t('nav.ofN', { n: n + 1, total: ids.length })}</span></div>` : ''}<button class="dots" data-act="page-more" aria-label="${t('batch.more')}">⋮</button></div>
      <div class="qe"><div class="qstrip" id="qstrip">${strip}</div>
      <div class="qbig" data-qswipe="1">${n > 0 ? `<button type="button" class="qsw l" data-act="qe-go" data-id="${ids[n - 1]}" data-b="${batchId}" aria-label="${t('nav.prev')}">‹</button>` : ''}${n < ids.length - 1 ? `<button type="button" class="qsw r" data-act="qe-go" data-id="${ids[n + 1]}" data-b="${batchId}" aria-label="${t('nav.next')}">›</button>` : ''}${i.photo ? `<img data-ph="${i.photo.id}" data-kind="${i.photo.noFull ? 'thumb' : 'full'}" alt="">` : `<span class="qnone">${t('photo.noPhoto')}</span>`}</div>
      <div class="qf"><label>${t('item.desc')}</label><div class="dscrow"><input data-f="${esMode() ? 'descS' : 'desc'}" value="${esc(descShown(i))}" placeholder="${t('item.descPh')}" autocomplete="off" enterkeyhint="next">${micBtn()}${esBtn(i)}</div>
      <div class="mrow"><div class="costonly"><label>🔒 ${t('item.cost', { cur: b.currency })}</label><input data-f="cost" type="text" inputmode="decimal" value="${i.cost || ''}" placeholder="0.00" enterkeyhint="done"></div><div><label>${t('qty.label')}</label>${qtyHtml(i)}</div></div>
      <div class="mrow"><div><label>${t('item.price')}</label><input data-f="price" type="text" inputmode="decimal" value="${i.price || ''}" placeholder="0.00" enterkeyhint="done"></div><div><label class="ghost">&nbsp;</label><button class="btn" type="button" data-act="use-rec" data-id="${i.id}">${t('item.recShort')}</button></div></div>
      ${szSection(i, false, true)}${grpNote(i)}
      <div id="saleblock" style="margin-top:6px">${saleHTML(i)}</div>
      <div class="sumbox costonly" id="calc"></div></div>
      <div class="qgo"><button class="sk" data-act="qe-next" data-id="${i.id}" data-skip="1">${t('qe.skip')}</button><button class="pr ${blocked ? 'blocked' : ''}" data-act="qe-next" data-id="${i.id}">${n < ids.length - 1 ? t('qe.saveNext') : t('qe.saveDone')}</button></div></div>`, render, true);
    $('#sheet').dataset.item = id; updateSale(i); scrollSize();
    const cur = $('#qstrip .qt.on'); if (cur) cur.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function quickNext(id, skip) {
    const i = state.items.find((x) => x.id === id); if (!i) return;
    if (!skip && document.activeElement && document.activeElement.blur) document.activeElement.blur();   // saves the box being typed in
    if (!skip && L.needsSize(state, i)) { qeTried = true; reQuick(i); const r = $('#szrow'); if (r) r.scrollIntoView({ block: 'center' }); return; }
    qeTried = false;
    const ids = quickIds(i.batchId), n = ids.indexOf(i.grp ? grpOf(i)[0].id : id);
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
  let invLangSession = null, invLangAuto = null;   // an English / Español pick for the invoice on screen; invLangAuto true/false once Auto was tapped / left
  // custMode: 'auto' (the default: the invoice shows in the app's language, and what is sent goes out in the customer's), 'app', 'en', 'es' or 'ask' (photo captions only). Saved under a new key, so everyone starts on Auto.
  const custMode = () => { const v = pref('custLangV2', null); return v === 'auto' || v === 'ask' || v === 'app' || v === 'en' || v === 'es' ? v : 'auto'; };
  const custLang = () => { const m = custMode(); return m === 'en' || m === 'es' ? m : I.getLang(); };
  const autoActive = () => invLangSession == null && (invLangAuto !== null ? invLangAuto : custMode() === 'auto');
  const invoiceLang = () => invLangSession || (invLangAuto === true ? I.getLang() : custLang());
  // The language each customer reads, remembered from earlier sends (store orders already carry the language the customer used)
  const clientKey = (n) => String(n || '').trim().toLowerCase();
  const savedLang = (name) => { const m = (state.settings.clientLang || {})[clientKey(name)]; return m === 'en' || m === 'es' ? m : ''; };
  const setClientLang = (name, lang) => { if (!clientKey(name)) return; const cur = Object.assign({}, state.settings.clientLang); if (lang === 'en' || lang === 'es') cur[clientKey(name)] = lang; else delete cur[clientKey(name)]; state.settings.clientLang = cur; save(); };
  const rememberLang = (name, lang) => { if ((lang === 'en' || lang === 'es') && savedLang(name) !== lang) setClientLang(name, lang); };
  const orderLangOf = (name) => { const o = Store.orders().filter((x) => clientKey(x.name) === clientKey(name) && (x.lang === 'en' || x.lang === 'es')).sort((a, b) => (Store.when(b) || 0) - (Store.when(a) || 0))[0]; return o ? o.lang : ''; };
  const knownLang = (no, name) => { const m = savedLang(name); if (m) return m; const o = no ? orderOfInvoice(no) : null; if (o && (o.lang === 'en' || o.lang === 'es')) return o.lang; return orderLangOf(name) || null; };
  const langFor = (v) => (autoActive() ? knownLang(v.no, v.client) : invoiceLang());   // null = Auto does not know yet: ask
  const underLang = (lang, fn) => { if (!lang) return fn(); const prev = invLangSession; invLangSession = lang; try { return fn(); } finally { invLangSession = prev; } };
  const ti = (key, vars) => t(key, vars, invoiceLang());
  const bannerSrc = () => (invoiceLang() === 'es' ? 'icons/invoice-banner-es.jpg' : 'icons/invoice-banner.jpg');
  // Invoice design (Settings): the picture at the top and the colours of the table. 'classic' is the flower picture; the others are drawn here.
  let designOverride = null;   // used to preview a design full screen without choosing it
  const invDesignId = () => designOverride || InvDesign.find(state.settings.invoiceDesign).id;
  const invStyle = (id) => ((state.settings.invoiceStyle || {})[id || invDesignId()]) || {};   // the owner's colour changes for a design
  const invDesign = (id) => InvDesign.colours(id || invDesignId(), Theme.brand(), invStyle(id));
  const invBiz = () => {
    const s = state.settings, own = !!(s.businessName || s.bizCity || s.bizPhone || s.bizEmail);
    return { name: s.businessName || 'B.RUIZ', lines: (own ? [s.bizCity, s.bizPhone, s.bizEmail] : ['Chaguanas', '18683658857', 'berilexy.ruiz93@gmail.com']).filter(Boolean), logo: bizLogoImage() || (s.businessName ? null : invLogo) };
  };
  // The business's own logo (a small picture kept in the settings): drawn on invoices once it has loaded.
  let bizLogoSrc = '', bizLogoImg = null;
  const bizLogoImage = () => { const sx = state.settings.bizLogo || ''; if (!sx) return null; if (sx !== bizLogoSrc) { bizLogoSrc = sx; bizLogoImg = new Image(); bizLogoImg.onload = () => { Object.keys(headCache).forEach((k) => delete headCache[k]); }; bizLogoImg.src = sx; } return bizLogoImg; };
  const invLogo = new Image(); invLogo.src = 'icons/bruiz-logo-512.png';
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
  const esName = (it) => { const sp = Wd.spanish(it, wordList()); return sp.es || it.desc; };   // the Spanish name of an item (the saved one, or the word list's best translation)
  const dn = (i) => (I.getLang() === 'es' ? esName(i) : (i.desc || ''));   // an item's name on screen: Spanish when the app is in Spanish (the saved Spanish name, or the word list's translation)
  const lineName = (l, lg) => {
    if ((lg || invoiceLang()) !== 'es') {   // an English invoice: a name that was written in Spanish (an imported sheet, say) is shown in English when the word list understands every word of it
      const m = String(l.desc).split(' · '), base = m[0].trim(); if (!base) return l.desc;
      try { const e = Wd.toEnglish(base, wordList()); if (e.en && !e.missing.length) return e.en + (m.length > 1 ? ' · ' + m.slice(1).join(' · ') : ''); } catch (err) { /* keep the saved name */ }
      return l.desc;
    }
    const m = String(l.desc).split(' · '), base = m[0].trim(), it = state.items.find((x) => String(x.desc || '').trim() === base); return it ? esName(it) + (m.length > 1 ? ' · ' + m.slice(1).join(' · ') : '') : l.desc; };
  const invLines = (v) => (v.lines && v.lines.length ? v.lines : [{ desc: v.desc, qty: v.qty, price: v.total - v.delivery }]);

  // "PAID IN FULL" rubber stamp: double border, tilted, worn ink. Seeded by invoice number so it never changes.
  const stampCache = {};
  function stampCanvas(seed, dateText, label, kind) {
    const W = 560, H = 250, S = 2, INK = kind === 'due' ? '180,83,9' : '24,112,58', lbl = String(label).split('\n');
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
    if (lbl.length > 1) {   // two lines, same bold lettering as PAID IN FULL, one size for both lines and both languages
      let hs = 32; const hf = (z) => `900 ${z}px Roboto, "Arial Black", "Helvetica Neue", Arial, sans-serif`, wd = (l, z) => { x.font = hf(z); return x.measureText(l).width + (l.length - 1) * 3; };
      while (Math.max(...lbl.map((l) => wd(l, hs))) > 395 && hs > 20) hs -= 2; x.font = hf(hs);
      spaced(lbl[0], W / 2, 94, 3); spaced(lbl[1], W / 2, 94 + hs + 10, 3); x.fillRect(82, 94 + hs + 22, 396, 2.5);
    } else {
    let size = 74; const face = (s) => `900 ${s}px Roboto, "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    x.font = face(size); while (x.measureText(label).width + (label.length - 1) * 5 > 395 && size > 26) { size -= 2; x.font = face(size); }
    spaced(label, W / 2, 128, 5);
    x.fillRect(82, 145, 396, 2.5);
    }
    x.font = `700 21px Roboto, "Helvetica Neue", Arial, sans-serif`; spaced(`B-RUIZ  •  ${dateText}`, W / 2, lbl.length > 1 ? 182 : 177, 3);
    // worn ink: speckles and a few rough patches knocked out, deterministic per invoice
    x.shadowBlur = 0; x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(0,0,0,${0.35 + rnd() * 0.65})`; x.beginPath(); x.arc(rnd() * W, rnd() * H, 0.35 + rnd() * rnd() * 1.7, 0, 7); x.fill(); }
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(0,0,0,${0.25 + rnd() * 0.5})`; x.beginPath(); x.arc(rnd() * W, rnd() * H, 1.6 + rnd() * 3.4, 0, 7); x.fill(); }
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(rnd() * W, rnd() * H, 18 + rnd() * 50, 0.8 + rnd() * 1.4); }
    return ink;
  }
  const isPaidInFull = (v) => v.total > 0 && v.balance <= 0;
  // The money lines above the balance: a Subtotal only when a delivery fee sits between it and the Total, and Previously Paid only when there was an earlier payment
  const totRows = (v, sub) => { const rows = []; if ((Number(v.delivery) || 0) > 0) rows.push(['doc.subtotal', sub], ['doc.delivery', v.delivery]); rows.push(['doc.total', v.total], ['doc.paid', v.amountPaid]); if ((Number(v.previouslyPaid) || 0) > 0) rows.push(['doc.prevPaid', v.previouslyPaid]); return rows; };
  const stampDate = (v, lg) => new Date(v.date).toLocaleDateString(I.locale(lg || invoiceLang()), { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').toUpperCase();
  // Which stamp an invoice carries: green PAID IN FULL once paid; amber DELIVERED / COLLECTED + BALANCE DUE when handed over with money still owing; none otherwise
  const stampKind = (v) => { if (!v || v.void) return ''; if (isPaidInFull(v)) return 'paid'; const o = v.no ? orderOfInvoice(v.no) : null; if (o && o.status === 'done') return o.option === 'delivery' ? 'del' : 'col'; return ''; };
  const STAMP_KEY = { paid: 'doc.stamp', del: 'doc.stampDel', col: 'doc.stampCol' };
  const stampCanvasFor = (v, lg) => { const k = stampKind(v), due = k === 'del' || k === 'col', tl = (key) => t(key, {}, lg || invoiceLang()); return stampCanvas(v.no, stampDate(v, lg), due ? tl(STAMP_KEY[k]) + '\n' + tl('doc.stampDue') : tl('doc.stamp'), due ? 'due' : 'ok'); };
  // The small two-line note under the balance while money is owing and the order is still to be handed over: "To be delivered / Payment due on delivery"
  const invNote = (v, lg) => { const tl = (key) => t(key, {}, lg || invoiceLang()); if (!v || v.void || isPaidInFull(v)) return null; const o = v.no ? orderOfInvoice(v.no) : null; if (!o || o.status !== 'confirmed') return null;
    const del = o.option === 'delivery', soon = (o.items || []).some(itemArriving), part = (Number(v.amountPaid) || 0) + (Number(v.previouslyPaid) || 0) > 0;
    if (handedN(o) > 0 && toHand(o).length) return [tl('inv.ln.partial').replace('{n}', handedN(o)).replace('{m}', (o.items || []).length), tl('inv.ln.balRest')];   // some items have gone out, the rest are still to come
    return [tl(soon ? 'inv.ln.soon' : del ? 'inv.ln.deliver' : 'inv.ln.pickup'), tl(part ? (del ? 'inv.ln.balDel' : 'inv.ln.balPick') : (del ? 'inv.ln.payDel' : 'inv.ln.payPick'))]; };   // in the language this invoice is being drawn in, not the phone's
  function stampURL(v) { const k = v.no + '|' + v.date + '|' + invoiceLang() + '|' + stampKind(v); return stampCache[k] || (stampCache[k] = stampCanvasFor(v).toDataURL('image/png')); }

  // "Returned on 8 Nov · 2 items back in stock · TT$ 200 had been paid" — shown on a returned or cancelled invoice
  const voidBanner = (v0) => { if (!v0.void) return ''; const d = v0.void, n = (d.items || []).length, paid = num_(d.was.amountPaid) + num_(d.was.previouslyPaid);
    return `<div class="voidbar"><b>↩ ${t(d.kind === 'cancelled' ? 'inv.voidCancelled' : 'inv.voidReturned', { date: dayMon(new Date(d.date)) })}</b>${n ? `<small>${(d.items || []).map((i) => esc(i.name) + (i.size ? ' · ' + esc(szLabel(i.size)) : '')).join(', ')}</small>` : ''}${paid > 0 ? `<small>${t('inv.voidPaid', { amount: money(paid) })}</small>` : ''}${d.fee > 0 ? `<small>${t('inv.voidFee', { amount: money(d.fee) })}</small>` : ''}</div>`; };
  const num_ = (x) => Number(x) || 0;
  function sheetInvoice(no, swap) {   // swap: show this invoice in place of the one on screen (the payment history rows do this)
    const v0 = state.invoices.find((x) => x.no === no); if (!v0) return;
    const v = v0.void ? Object.assign({}, v0, v0.void.was) : v0;   // a returned invoice is shown as it was, with a note
    enterPage('invoice', no, () => sheetInvoice(no), swap);
    let latest = v; while (latest.updatedBy) { const n = state.invoices.find((x) => x.no === latest.updatedBy); if (!n || n === latest) break; latest = n; }
    const isLatest = latest === v;
    const spotRow = pinRow(orderOfInvoice(v0.no));   // the delivery pin of the order this invoice came from
    const lines = invLines(v), sub = lines.reduce((s, l) => s + l.qty * l.price, 0), st = L.invoiceStatus(v), lg = invoiceLang();
    // Small pictures of the items sold on this invoice: the same stored thumbnail the stock list uses, nothing is copied.
    const chain = L.invoiceChain(state, v.no), dShort = (d) => new Date(d).toLocaleDateString(I.locale(I.getLang()), { day: 'numeric', month: 'short', year: 'numeric' });
    const hist = chain.length > 1 ? `<div class="hist"><h4>${t('inv.history')}</h4>${chain.slice().reverse().map((h) => `<button class="hrow ${h.no === v.no ? 'now' : ''}" data-act="inv-swap" data-id="${h.no}"><span class="hl"><b>${h.no}</b><small>${dShort(h.date)}${h.no === v.no ? ' · ' + t('inv.histNow') : ''}</small></span><span class="hr"><b>${t('inv.histPaid', { amt: money(h.amountPaid) })}</b><small class="${h.balance > 0 ? 'bad' : 'good'}">${h.balance > 0 ? t('inv.histOwes', { amt: money(h.balance) }) : t('inv.histFull')}</small></span></button>`).join('')}</div>` : '';
    const withPhoto = state.items.filter((x) => x.invoice === v.no && x.photo);
    const thumbs = withPhoto.length ? `<div class="thumbs"><h4>${t('inv.itemsOn')}</h4><div class="trow">${withPhoto.map((x) => { const d = L.photoDaysLeft(state, x, Date.now()); return `<button class="tb" data-act="edit-item" data-back="inv" data-inv="${v.no}" data-id="${x.id}" aria-label="${esc(dn(x) || x.id)}"><span class="im"><img data-ph="${x.photo.id}" data-kind="thumb" alt="">${offStrip(x)}${d != null && d > 0 ? `<span class="bd">${tn('inv.daysLeft', d)}</span>` : ''}</span><span class="nm">${esc(dn(x) || x.id)}</span></button>`; }).join('')}</div></div>` : '';
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${v.no}</b><small>${esc(clabel(v.client))}</small></div></div>${voidBanner(v0)}${v0.returnNote ? `<div class="voidbar soft">↩ ${tn('inv.returnedFrom', v0.returnNote.items.length, { no: v0.returnNote.from })}${v0.returnNote.fee > 0 ? ' · ' + t('inv.feeIn', { amount: money(v0.returnNote.fee) }) : ''}</div>` : ''}${isLatest ? '' : `<div class="earlier"><span>${t('inv.earlier')}</span><button class="chip" data-act="inv-swap" data-id="${latest.no}">${t('inv.backLatest')}</button></div>`}<div class="seg three small" role="radiogroup" aria-label="${t('invUI.lang')}" style="margin-bottom:10px"><button class="${autoActive() ? 'on' : ''}" role="radio" aria-checked="${autoActive()}" data-act="inv-lang" data-id="auto" data-no="${v.no}">${t('inv.auto')}</button>${Object.keys(I.LANGS).map((l) => `<button class="${lg === l && !autoActive() ? 'on' : ''}" role="radio" aria-checked="${lg === l && !autoActive()}" data-act="inv-lang" data-id="${l}" data-no="${v.no}">${I.LANGS[l]['lang.name']}</button>`).join('')}</div>
      <div class="printable"><button class="fsbtn" data-act="inv-full" data-id="${v.no}" aria-label="${t('invd.full')}">⤢</button><div class="inv" style="--ih:${invDesign().head};--it:${invDesign().tint || 'transparent'};--ib:${invDesign().band}"><img class="inv-banner" src="${invDesignId() === 'classic' ? bannerSrc() : headerURL(invDesignId())}" alt="${ti('doc.bannerAlt')}">
      <div class="inv-body">
        <div class="inv-top"><div><div class="lbl">${ti('doc.billTo')}</div><div class="client">${esc(cdisp(v.client))}</div></div>
          <div class="inv-meta"><div><span class="lbl">${ti('doc.invoiceNo')}</span><span>${v.no}</span></div><div><span class="lbl">${ti('doc.date')}</span><span>${invDate(v.date)}</span></div><div><span class="lbl">${ti('doc.due')}</span><span>${invDate(v.due)}</span></div></div></div>
        <table class="inv-t"><thead><tr><th>${ti('doc.desc')}</th><th class="r">${ti('doc.qty')}</th><th class="r">${ti('doc.price')}</th><th class="r">${ti('doc.amount')}</th></tr></thead><tbody>
          ${lines.map((l) => `<tr><td>${esc(lineName(l))}</td><td class="r">${l.qty}</td><td class="r">${invMoney(l.price)}</td><td class="r">${invMoney(l.qty * l.price)}</td></tr>`).join('')}</tbody></table>
        <div class="inv-sum">${stampKind(v) && !v0.void ? `<img class="stamp" src="${stampURL(v)}" alt="${ti('doc.stampAlt')}">` : ''}<div class="inv-tot">${totRows(v, sub).map(([k, val]) => `<div><span>${ti(k)}</span><b>${invMoney(val)}</b></div>`).join('')}<div class="due"><span>${ti('doc.balance')}</span><b>${invMoney(v.balance)}</b></div></div>${(() => { const nt = invNote(v); return nt ? `<div class="inv-note"><b>${esc(nt[0])}</b><span>${esc(nt[1])}</span></div>` : ''; })()}</div>
        <div class="inv-terms"><b>${ti('doc.terms')}</b><span>${ti('doc.thanks')}</span></div></div><div class="inv-foot"></div></div></div>
      <div class="muted small" style="margin-top:8px">${t('invUI.status')} <span class="pill ${st}">${invStLabel(st)}</span>${v.by ? ` · ${t('inv.by', { name: esc(v.by) })}` : ''}${v.refundDue > 0 ? ` <b class="bad">${t('ret.refundDue', { amount: money(v.refundDue) })}</b>` : ''}${v.balance > 0 && !v.updatedBy && !v0.void ? ` <button class="pay-btn" data-act="pay-inv" data-id="${v.no}" data-back="inv" style="margin-left:6px">${t('pay.btn')}</button>` : ''}${!v0.void && v.profit ? `<span class="costonly"> · ${t('invUI.profit')} ${money(v.profit)}</span>` : ''}${!v0.void && v.loss ? `<span class="costonly"> · ${t('invUI.loss')} ${money(v.loss)}</span>` : ''}${!v0.void && v.tip ? `<span class="costonly"> · ${t('invUI.tip')} ${money(v.tip)}</span>` : ''}</div>
      ${hist}${thumbs}${spotRow}
      ${(() => { const who = esc(clabel(v.client || '')), k = autoActive() ? knownLang(v.no, v.client) : invoiceLang(); return `<p class="muted small sendnote">${autoActive() ? (k ? t('inv.sendAuto', { lang: I.LANGS[k]['lang.name'], who }) : t('inv.sendAsk', { who })) : t('inv.sendFixed', { lang: I.LANGS[k]['lang.name'] })}</p>`; })()}<div class="b22"><button class="btn primary" data-act="share-pdf" data-id="${v.no}">${t('invUI.shareBtn')}</button><button class="btn primary" data-act="download-pdf" data-id="${v.no}">${t('invUI.download')}</button>
      ${(() => { const rr = isLatest && !v0.void && state.items.some((x) => x.invoice === v.no), cc = isLatest && !v0.void; return (rr ? `<button class="btn rs ${cc ? '' : 'span2'}" data-act="return-open" data-id="${v.no}">↩ ${t('ret.btn')}</button>` : '') + (cc ? `<button class="btn rs ${rr ? '' : 'span2'}" data-act="del-inv" data-id="${v.no}">${t('invUI.cancel')}</button>` : ''); })()}<button class="btn slim span2" data-act="close">${t('btn.close')}</button></div>`, null, true);
    const sheetInv = document.querySelector('#sheet .inv'); if (sheetInv) sheetInv.style.minHeight = Math.round(sheetInv.offsetWidth * 1.4142) + 'px';   // A4 portrait like the picture
    setTimeout(() => { if (!$('#sheet').hidden && $('#sheet .inv')) prefetchPdf(v.no); }, 600);   // build the PDF now, so Share answers the tap at once
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
  function invoiceCanvas(v, type, frame, scale, quality, lang) {
    const LG = lang || invoiceLang(), ti = (key, vars) => t(key, vars, LG);   // this drawing speaks LG all the way through (it loads the banner first, so the screen may change in between)
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
        F('700', 16); x.fillStyle = INV.grey; x.textAlign = 'left'; x.fillText(ti('doc.billTo'), L0, y);
        F('400', 26); x.fillStyle = '#000'; x.fillText(v.client, L0, y + 32);
        [[ti('doc.invoiceNo'), v.no], [ti('doc.date'), invDate(v.date)], [ti('doc.due'), invDate(v.due)]].forEach(([k, val], i) => {
          F('700', 15); x.fillStyle = INV.grey; x.textAlign = 'right'; x.fillText(k, R0 - 150, y + i * 26);
          F('400', 19); x.fillStyle = '#000'; x.fillText(val, R0, y + i * 26);
        });
        y += 74;
        x.fillStyle = D.head; x.fillRect(L0 - 8, y, W - 2 * (L0 - 8), 38);
        F('700', 16); x.fillStyle = '#fff'; x.textAlign = 'left'; x.fillText(ti('doc.desc'), L0, y + 25);
        x.textAlign = 'right'; x.fillText(ti('doc.qty'), R0 - 250, y + 25); x.fillText(ti('doc.price'), R0 - 130, y + 25); x.fillText(ti('doc.amount'), R0, y + 25);
        y += 38;
        lines.forEach((l, li) => {
          if (D.tint && li % 2) { x.fillStyle = D.tint; x.fillRect(L0 - 8, y, W - 2 * (L0 - 8), rowH); }
          F('400', 19); x.fillStyle = '#000'; x.textAlign = 'left';
          const ld = lineName(l, LG); let d = String(ld); while (x.measureText(d).width > 330 && d.length > 4) d = d.slice(0, -2); if (d !== String(ld)) d = d.trim() + '…';
          x.fillText(d, L0, y + 24);
          x.textAlign = 'right'; x.fillText(String(l.qty), R0 - 250, y + 24); x.fillText(invMoney(l.price), R0 - 130, y + 24); x.fillText(invMoney(l.qty * l.price), R0, y + 24);
          y += rowH;
        });
        x.strokeStyle = '#bdbdbd'; x.lineWidth = 1; x.beginPath(); x.moveTo(L0 - 8, y + 0.5); x.lineTo(W - L0 + 8, y + 0.5); x.stroke();
        y += 34;
        totRows(v, sub).map(([k, val]) => [ti(k), val]).forEach(([k, val]) => {
          F('400', 19); x.fillStyle = INV.mid; x.textAlign = 'right'; x.fillText(k, R0 - 130, y); x.fillStyle = '#000'; x.fillText(invMoney(val), R0, y); y += 33;
        });
        x.fillStyle = D.head; x.fillRect(W - 360, y - 14, 360 - (L0 - 8), 36);
        F('700', 19); x.fillStyle = '#fff'; x.textAlign = 'right'; x.fillText(ti('doc.balance'), R0 - 130, y + 10); x.fillText(invMoney(v.balance), R0, y + 10);
        if (stampKind(v) && !v.void) {
          x.save(); x.globalCompositeOperation = 'multiply';
          x.drawImage(stampCanvasFor(v, LG), W - L0 - 350, y + 34, 340, 152); x.restore();
        }
        const nt = invNote(v, LG); if (nt) { x.textAlign = 'right'; F('700', 19); x.fillStyle = '#222'; x.fillText(nt[0], R0, y + 104); F('400', 16); x.fillStyle = '#555'; x.fillText(nt[1], R0, y + 126); }
        y = H - 62;   // Terms stay at the bottom, as in the sheet; the empty space above them is where the stamp sits
        F('700', 19); x.fillStyle = '#000'; x.textAlign = 'left'; x.fillText(ti('doc.terms'), L0, y);
        F('400', 17); x.fillStyle = INV.grey; x.fillText(ti('doc.thanks'), L0, y + 26);
        x.fillStyle = D.band; x.fillRect(0, H - 26, W, 26);   // the footer bar runs edge to edge of the sheet
        const out = frame && invFrame() !== 'none' ? framedCanvas(c, invFrame(), S, Theme.brand()) : c;
        out.toBlob((b) => (b ? ok(b) : fail(new Error(ti('doc.imgErr')))), type || 'image/png', quality || 0.92);
      };
      img.src = invDesignId() === 'classic' ? (LG === 'es' ? 'icons/invoice-banner-es.jpg' : 'icons/invoice-banner.jpg') : 'icons/logo.png';
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
  // The invoice PDF is built ahead of time, as soon as the invoice screen is open, so Share can answer the tap at once:
  // the phone only allows its share sheet right after a tap, and drawing the sheet takes a few seconds.
  const pdfFiles = new Map(), pdfBusy = new Map(); let pdfQueue = Promise.resolve();   // finished PDFs and PDFs being drawn, kept in the phone's memory only (one per invoice and language); drawn one at a time
  const pdfKey = (v) => JSON.stringify([v, Object.assign({}, state.settings, { clientLang: 0 }), invoiceLang(), invDesignId(), stampKind(v), invNote(v), state.items.length]);
  async function buildInvoicePdf(v, lang) {
    const blob = await invoiceCanvas(v, 'image/png', false, 2.6, undefined, lang);   // the sheet is drawn big (about 340 dots per inch at its printed size), then placed on a Letter page
    const card = await createImageBitmap(blob), page = letterPage(card), jpg = await new Promise((ok) => page.toBlob(ok, 'image/jpeg', 0.95));
    const pdf = Pdf.jpegToPdf(new Uint8Array(await jpg.arrayBuffer()), page.width, page.height, { w: 612, h: 792 });
    return new File([pdf], `${v.no} ${cdisp(v.client)}.pdf`, { type: 'application/pdf' });
  }
  function readyPdf(v, lang) {   // a promise for this invoice's PDF (in the given language, or the one on screen): the finished one, the one being drawn, or a new one
    const key = underLang(lang, () => pdfKey(v));
    if (pdfFiles.has(key)) return Promise.resolve(pdfFiles.get(key));
    if (pdfBusy.has(key)) return pdfBusy.get(key);
    const lg = lang || invoiceLang();
    const p = pdfQueue.catch(() => {}).then(() => buildInvoicePdf(v, lg)).then((file) => { pdfFiles.set(key, file); while (pdfFiles.size > 6) pdfFiles.delete(pdfFiles.keys().next().value); return file; }).finally(() => { pdfBusy.delete(key); });
    pdfQueue = p; pdfBusy.set(key, p); return p;
  }
  // Draw ahead: the customer's language first, and (both = true) the other language too, since it costs nothing but a few seconds of the phone's time
  const prefetchPdf = (no, both) => { const v = state.invoices.find((x) => x.no === no); if (!v) return; const first = langFor(v) || invoiceLang(); (both ? [first, first === 'en' ? 'es' : 'en'] : [first]).forEach((l) => readyPdf(v, l).catch(() => { /* drawn again when Share is tapped */ })); };
  const sharePdfFile = (v, file, lang) => navigator.share({ files: [file], title: v.no, text: underLang(lang, () => ti('doc.shareText', { no: v.no, amount: invMoney(v.balance) })) }).then(() => true).catch((e) => { if (e && e.name !== 'AbortError') throw e; return false; });
  const savePdfFile = (file) => { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); };
  // Auto does not know which language this customer reads yet: ask once (the answer is remembered)
  function askClientLang(name) {
    return new Promise((ok) => {
      let done = false; const finish = (v) => { if (!done) { done = true; ok(v); } };
      window.__clLang = finish;
      openSmall(`<h3>${t('cl.title', { who: esc(name || '') })}</h3><p class="muted small">${t('cl.sub')}</p>
        <div class="btns" style="margin-top:12px">${Object.keys(I.LANGS).map((l) => `<button class="btn primary" data-act="cl-pick" data-id="${l}">${I.LANGS[l]['lang.name']}</button>`).join('')}<button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'card', () => finish(null));
    });
  }
// After the confirmation message goes out on WhatsApp, offer to send the invoice PDF too (a WhatsApp link can carry text but not a file)
  let pdfPrompt = null, pdfPromptTimer = 0;
  function showPdfPrompt() {
    const no = pdfPrompt; if (!no) return; pdfPrompt = null; clearTimeout(pdfPromptTimer);
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    askCard(t('ord.pdfAsk', { name: v.client || '' }), { title: t('ord.pdfTitle'), ok: t('ord.pdfOk'), no: t('ord.pdfNo') }).then((y) => { if (y) shareInvoicePdf(no, false); });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && pdfPrompt) setTimeout(showPdfPrompt, 400); });
  function shareInvoicePdf(no, download) {
    const v = state.invoices.find((x) => x.no === no); if (!v) return;
    const explicit = invLangSession != null && !autoActive(), lang0 = langFor(v);
    if (lang0 === null) return askClientLang(v.client).then((l) => { if (!l) return; rememberLang(v.client, l); return sendPdf(v, l, download); });
    if (explicit) rememberLang(v.client, lang0);
    return sendPdf(v, lang0, download);
  }
  function sendPdf(v, lang, download) {
    const canShare = (f) => !download && navigator.canShare && navigator.canShare({ files: [f] });
    const ord = orderOfInvoice(v.no), done = (pr) => pr.then((sent) => { if (sent && ord) markInvSent(ord, v.no); });   // sharing an order's invoice ticks 'Invoice sent' on the order
    const cachedKey = underLang(lang, () => pdfKey(v));
    if (pdfFiles.has(cachedKey)) {   // already drawn: answer the tap straight away
      const f = pdfFiles.get(cachedKey);
      if (canShare(f)) return done(sharePdfFile(v, f, lang)).catch((e) => toast('⚠️ ' + errMsg(e)));
      savePdfFile(f); return toast(download ? t('doc.saved') : t('doc.noSharePdf'));
    }
    toast(t('doc.preparingPdf'));
    readyPdf(v, lang).then((f) => {
      if (!canShare(f)) { savePdfFile(f); return toast(download ? t('doc.saved') : t('doc.noSharePdf')); }
      // the phone may let the tap expire while the PDF is drawn: try, and if it refuses ask for one more tap
      return done(sharePdfFile(v, f, lang)).catch((e) => {
        if (e && e.name === 'NotAllowedError') return askCard(t('doc.pdfReady'), { ok: t('invUI.shareBtn'), title: t('doc.pdfReadyTitle') }).then((y) => (y ? done(sharePdfFile(v, f, lang)).catch((er) => toast('⚠️ ' + errMsg(er))) : undefined));
        throw e;
      });
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
  let payPending = null;   // the payment waiting for a yes on the confirmation card
  let payOrd = '';   // the order page a payment was started from: after saving, go back to it
  function sheetPay(no) {
    const v = state.invoices.find((x) => x.no === no); if (!v || v.updatedBy || v.balance <= 0) return;
    enterPage('pay', no, () => sheetPay(no));
    payInv = v;
    const d = new Date(), iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('pay.title')}</b><small>${v.no} · ${esc(clabel(v.client))}</small></div></div>
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
  let clName = '', ceLang = '';
  function sheetCustEdit(name) {
    ceLang = savedLang(name);
    enterPage('custedit', name, () => sheetCustEdit(name));
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('cust.editTitle')}</b><small>${esc(name)}</small></div></div>
      <div style="height:8px"></div><label for="ce-name">${t('cust.name')}</label><input id="ce-name" value="${esc(name)}" autocomplete="off" enterkeyhint="done">
      <label for="ce-loc">📍 ${t('cust.location')}</label><input id="ce-loc" value="${esc(L.place(state, name))}" placeholder="${t('cust.placePh')}" autocomplete="off" enterkeyhint="done">
      <div class="lg-field"><label>🗣️ ${t('cl.field')}</label><div class="lg-seg"><button type="button" class="${ceLang === '' ? 'on' : ''}" data-act="ce-lang" data-id="">${t('inv.auto')}</button><button type="button" class="${ceLang === 'en' ? 'on' : ''}" data-act="ce-lang" data-id="en">EN</button><button type="button" class="${ceLang === 'es' ? 'on' : ''}" data-act="ce-lang" data-id="es">ES</button></div></div>
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
      const nPay = L.invoiceChain(state, v.no).length, label = its.length === 1 ? esc(dn(its[0]) || its[0].id) : tn('cust.itemsN', its.length || v.qty || 1);
      const shown = its.slice(0, 3), more = its.length - shown.length, arr = its.filter((x) => { const bt = state.batches.find((y) => y.id === x.batchId); return !!bt && bt.status === 'In Transit'; }).length;   // items whose batch has not been received yet (an invoiced item no longer says In Transit itself)
      const stack = shown.map((x, n) => `<button class="tn" style="z-index:${9 - n}" data-act="edit-item" data-inv="${v.no}" data-id="${x.id}" aria-label="${esc(dn(x) || x.id)}">${x.photo ? `<img data-ph="${x.photo.id}" data-kind="thumb" alt="">` : '<em>·</em>'}${offStrip(x)}</button>`).join('') + (more > 0 ? `<span class="more">+${more}</span>` : '');
      return `<div class="cp-inv cv2 ${due ? 'due' : ''}" data-act="view-inv" data-id="${v.no}">
        <div class="c2-top"><button class="num" data-act="view-inv" data-id="${v.no}"><b>${v.no}</b></button>${due && !v.updatedBy ? `<button class="pay-btn" data-act="pay-inv" data-id="${v.no}" data-from="${esc(name)}" data-back="cust">${t('pay.btn')}</button>` : ''}</div>
        <div class="c2-mid"><div class="c2-stack">${stack}</div><div class="c2-txt"><small>${day(v.date)}</small><b>${label}${nPay > 1 ? ' · ' + tn('cust.paymentsN', nPay) : ''}</b>${arr ? `<small class="arr">⏳ ${arr < its.length ? t('cust.arrN', { n: arr, m: its.length }) : t('ord.transit')}</small>` : ''}</div><div class="c2-r"><b>${money(v.total)}</b>${due ? `<span class="owes">${t('cust.stillOwes', { amt: money(v.balance) })}</span>` : `<span class="ok">● ${invStLabel(st)}</span>`}</div></div>
        ${due ? `<div class="c2-bar"><i style="width:${pct}%"></i></div>` : ''}${pinRow(orderOfInvoice(v.no))}</div>`;
    };
    openSheet(`<div class="cpage"><div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${esc(clabel(name))}</b><small>${since}</small></div><button class="fb-edit" data-act="cust-edit" data-id="${esc(name)}">${t('cust.edit')}</button></div>
      <div class="cp-hero ${owing ? 'owe' : ''}"><div class="av">${esc(c.name.trim().charAt(0).toUpperCase() || '?')}</div><div class="who"><div class="nm">${esc(clabel(name))}</div><div class="lastrow"><small>${invs.length ? lastCap : since}</small><span class="pill ${owing ? 'Owing' : 'Up'}">${owing ? t('cust.owes', { amt: money(c.owing) }) : custStLabel(c)}</span></div><div class="locrow"><button class="cp-loc ${L.place(state, name) ? '' : 'none'}" data-act="cust-edit" data-id="${esc(name)}">📍 ${L.place(state, name) ? esc(L.place(state, name)) : t('cust.addPlace')}</button><button class="lg-chip" data-act="cust-lang" data-id="${esc(name)}" aria-label="${t('cl.field')}"><i>🗣️</i>${(() => { const k = savedLang(name) || orderLangOf(name); return k ? k.toUpperCase() : t('cl.chipAuto'); })()}</button></div></div></div>
      <div class="cp-tiles"><div class="tile ${owing ? 'bad' : ''}"><small>${t('cust.owingLabel')}</small><b>${moneyBare(c.owing)}</b></div><div class="tile"><small>${t('cust.totalSales')}</small><b>${moneyBare(c.sales)}</b></div>
        <div class="tile"><small>${t('cust.itemsBought')}</small><b>${c.bought}</b>${c.itemsOwing ? `<small class="bad">${t('cust.itemsOwing', { n: c.itemsOwing })}</small>` : ''}</div><div class="tile costonly"><small>${t('cust.profit')}</small><b>${moneyBare(c.profit)}</b></div></div>
      ${peopleOn ? peopleBox({ p: PE.byKey(state, name) }) : ''}
      <h2>${t('cust.invoices')} <span class="muted" style="float:right;text-transform:none;letter-spacing:0">${invs.length}</span></h2>${invs.map(card).join('') || `<div class="muted">${t('cust.none')}</div>`}
      <p class="muted small" style="margin:10px 2px 0">${invs.length ? t('cust.tapHint') : ''}</p></div>`, null, true);
    const nmEl = document.querySelector('#sheet .cp-hero .nm');   // a long name gets smaller type first, then a second line, so nothing is cut off
    if (nmEl) { const base = parseFloat(getComputedStyle(nmEl).fontSize); let f = base; while (nmEl.scrollWidth > nmEl.clientWidth && f > base * 0.7) { f -= 1; nmEl.style.fontSize = f + 'px'; } if (nmEl.scrollWidth > nmEl.clientWidth) nmEl.classList.add('wrap'); }
  }

  /* ---------- online store: settings, orders ---------- */
  const SCore = window.StoreCore;
  const storeCfg = () => SCore.norm(state.settings.store);
  function storeSet(patch) { const c = Object.assign(storeCfg(), patch); if (!c.id) c.id = SCore.newId(20); if (patch && 'zones' in patch) Object.assign(c, SCore.syncZonePlaces(c)); state.settings.store = c; save(); }
  // Every delivery zone is also a place customers can pick: keep the two in step (also fixes what existed before this was added).
  // The starter high-risk spots go in once (the seller can edit or delete any of them; a deleted one does not come back).
  function seedHot() {
    try {
      const c = storeCfg(); if (!c.id || c.hotSeeded) return false;
      const have = new Set(c.zones.map((z) => z.name.toLowerCase())), link = (z) => { const m = c.locations.filter((l) => z.name.toLowerCase().startsWith(l.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0]; return m ? Object.assign({}, z, { place: m.id }) : z; };
      const add = ZoneData.hot().filter((z) => !have.has(z.name.toLowerCase())).map(link);
      storeSet({ zones: c.zones.concat(add), hotSeeded: true }); if (add.length) setTimeout(() => toast(t('hot.seeded', { n: add.length })), 400); return true;
    } catch (e) { return false; }
  }
  function ensureZonePlaces() { try { const c = storeCfg(); if (!c.id || !c.zones.length) return false; const sy = SCore.syncZonePlaces(c); if (!sy.changed) return false; storeSet({ locations: sy.locations, bands: sy.bands }); return true; } catch (e) { return false; } }
  // 3-letter month in the app language ("Nov", "ene"), and the day in the phone's own time zone
  const mon3 = (d) => d.toLocaleDateString(I.locale(I.getLang()), { month: 'short' }).replace('.', '').slice(0, 3);
  const dayMon = (d) => d.getDate() + ' ' + mon3(d) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  // just now / 8 min ago / 8 h ago (first 24 hours), Yesterday, 2 d ago, 3 d ago, then the date (7 Nov)
  const ago = (d) => {
    if (!d) return ''; const m = Math.floor((Date.now() - d.getTime()) / 60000), days = Math.floor(m / 1440);
    if (m < 1) return t('ago.now'); if (m < 60) return t('ago.min', { n: m }); if (m < 1440) return t('ago.hour', { n: Math.floor(m / 60) });
    return days === 1 ? t('ago.yesterday') : days <= 3 ? t('ago.days', { n: days }) : dayMon(d);
  };
  // the exact moment in the phone's own clock: "Fri 7 Nov, 5:04 pm"
  const fullWhen = (d) => d ? d.toLocaleDateString(I.locale(I.getLang()), { weekday: 'short' }).replace('.', '') + ' ' + dayMon(d) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
  function copyText(txt) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(() => true, () => false); const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* none */ } ta.remove(); return Promise.resolve(ok); }
  const swt = (act, id, on) => `<button class="tog ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-act="${act}" data-id="${id}"></button>`;
  function sheetStore() {
    enterPage('store', '', () => sheetStore());
    const c = storeCfg(), inf = Store.info(), link = Store.link(c), signed = cloud.signedIn;
    const cnt = (b) => ({ a: state.items.filter((i) => i.batchId === b.id && i.status === 'Available').length, t: state.items.filter((i) => i.batchId === b.id && i.status === 'In Transit').length });
    const stat = !signed ? '' : inf.error === 'permission-denied' ? `<div class="err">${t('store.needRules')}</div>` : inf.error === 'timeout' ? `<div class="err">${t('store.pubSlow')}</div>` : inf.error ? `<div class="err">${t('store.pubError')}</div>` : inf.busy ? `<p class="muted small">${t('store.publishing')}</p>` : inf.at ? `<p class="muted small">${t('store.published', { n: inf.count, when: ago(new Date(inf.at)) })} · ${t(inf.sharp ? 'store.picsSharp' : 'store.picsSmall')}</p>` : '';
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('store.title')}</b><small>${t('store.sub')}</small></div><button class="dots" data-act="store-more" aria-label="${t('batch.more')}">⋮</button></div>
      <div class="ap">${signed ? '' : `<div class="card"><div class="rw"><div class="t"><b>${t('store.needAccount')}</b><small>${t('store.needAccountSub')}</small></div><button class="pbtn" data-act="acct-open">${t('acct.signIn')}</button></div></div>`}
      ${c.id ? `<div class="link"><span>${esc(link)}</span><button data-act="store-link">${t('store.copy')}</button></div>` : `<button class="btn primary" style="width:100%" data-act="store-create" ${signed ? '' : 'disabled'}>${t('store.create')}</button>`}
      ${c.id ? stat : ''}
      ${c.id ? `<div class="card"><div class="rw"><div class="t"><b>${t('store.open')}</b><small>${t('store.openSub')}</small></div>${swt('store-toggle', 'open', c.open)}</div></div>
      <h4><span>${t('store.batches')}</span></h4><div class="card">${state.batches.map((b) => { const n = cnt(b), on = c.batches.includes(b.id); return `<button class="rw sbat" data-act="store-batch" data-id="${b.id}"><span class="ck ${on ? 'on' : ''}">${on ? '✓' : ''}</span><div class="t"><b>${bl(b.id)}</b><small>${t('store.batchCount', { a: n.a, t: n.t })}</small></div></button>`; }).join('') || `<div class="rw muted">${t('store.noBatches')}</div>`}</div>
      ${(() => { const n = SCore.shown(state, c).length; return n ? `<p class="muted small" style="margin:-2px 2px 10px">${t('store.willShow', { n })}</p>` : `<div class="err" style="margin:-2px 0 10px">${t('store.noneShown')}</div>`; })()}
      <div class="card"><div class="rw"><div class="t"><b>${t('store.autoNew')}</b><small>${t('store.autoNewSub')}</small></div>${swt('store-toggle', 'autoNew', c.autoNew)}</div></div>
      <div class="card"><div class="rw"><div class="t"><b>${t('store.transit')}</b><small>${t('store.transitSub')}</small></div>${swt('store-toggle', 'inTransit', c.inTransit)}</div></div>
      <div class="card"><div class="rw"><div class="t"><b>${t('store.prices')}</b><small>${t(c.showPrices ? 'store.pricesOn' : 'store.pricesOff')}</small></div>${swt('store-toggle', 'showPrices', c.showPrices)}</div>
        <div class="rw"><div class="t"><b>${t('store.left')}</b><small>${t('store.leftSub')}</small></div>${swt('store-toggle', 'showLeft', c.showLeft)}</div></div>
      <button class="libbtn" data-act="words-open"><span class="ic">🔤</span><span class="tx"><b>${t('words.title')}</b><small>${t('words.openLibSub', { n: wordList().length })}</small></span><span class="chev">›</span></button>
      <h4><span>${t('store.locations')}</span></h4><div class="card">${c.locations.map((l) => `<button class="rw sloc" data-act="store-loc" data-id="${l.id}"><div class="t"><b>${esc(l.name)}</b><small>${[l.pickup ? t('store.pickup') + ' · ' + t('store.free') : '', l.delivery ? t('store.delivery') + ' ' + money(l.price) : ''].filter(Boolean).join(' · ')}</small></div><span class="chev">›</span></button>`).join('')}<button class="rw sloc add" data-act="store-loc" data-id="new">＋ ${t('store.addLoc')}</button></div>
      <div class="card"><div class="rw"><div class="t"><b>${t('store.name')}</b></div><input class="sfield" data-store="name" value="${esc(c.name)}" placeholder="${esc(bizName())}" autocomplete="off" enterkeyhint="done"></div><div class="rw"><div class="t"><b>${t('store.whatsapp')}</b><small>${t('store.whatsappSub')}</small></div><input class="sfield" data-store="whatsapp" inputmode="tel" value="${esc(c.whatsapp)}" placeholder="868 555 0100" autocomplete="off" enterkeyhint="done"></div></div>
      <button class="btn" style="width:100%;margin-top:6px" data-act="store-publish" ${signed ? '' : 'disabled'}>${t('store.publishNow')}</button><p class="muted small" style="margin:10px 2px">${t('store.note')}</p>` : ''}</div>`, null, true);
  }
  // Pickup and delivery: only the places, with what each offers; tap one to change it, or add a place.
  // The store settings rows, in groups: the store, delivery, and (on the Store page) the store-page switches.
  const setRow = (act, title, sub, kw) => `<button class="rw2 tap" data-act="${act}" data-kw="${esc((title + ' ' + sub + ' ' + (kw || '')).replace(/<[^>]*>/g, ' '))}"><div class="t"><b>${title}</b><small>${sub}</small></div><span class="chev">›</span></button>`;
  const spotsSub = (c) => (c.spots.length ? tn('sset.spotsN', c.spots.length) : t('sset.spotsNone'));
  const settingsGroups = (c, withSwitches) => {
    const h = dset().home, riskN = c.zones.filter((z) => z.risk).length, st = guideSteps(c), gdone = st.filter((x) => x.done).length, needsN = c.locations.filter((l) => needsP(c, l)).length, grp = (title, rows) => `<div class="sgrp"><h4><span>${title}</span></h4><div class="box">${rows}</div></div>`;
    return `<div class="ssq"><input id="sset-q" type="search" placeholder="${esc(t('sset.search'))}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="search"></div><p class="muted small ssnone" id="sset-none" hidden>${t('sset.noMatch')}</p>
      ${grp(t('sset.yours'), setRow('dlv-home', '📍 ' + t('sset.loc'), h ? esc(h.name || t('ds.pinSet')) : `<span style="color:var(--bad,#cf4b4b)">${t('sset.locNone')}</span>`, 'store location pin home hub ubicación tienda') + setRow('contact-open', t('hub.contact'), esc(c.name || bizName()) + ' · ' + (esc(c.whatsapp) || t('store.whatsappSub')), 'name whatsapp phone contact nombre') + setRow('words-open', t('hub.spanish'), t('words.openLibSub', { n: wordList().length }), 'spanish words español palabras'))}
      ${grp(t('sset.secGuide'), setRow('guide-open', '🧭 ' + t('guide.title'), t('sset.guideSub', { n: gdone, m: st.length }), 'setup guide start steps first time guía pasos empezar'))}
      ${grp(t('sset.secAreas'), setRow('regions-page', t('rg.title'), c.regions.some((r) => r.base > 0) ? tn('rg.rowSet', c.regions.filter((r) => r.base > 0).length) : t('rg.rowNone'), 'regions north south east west central fee base price map regiones norte sur este oeste centro tarifa') + setRow('places-page', t('pk.placesH'), pdSummary(c), 'places list prices search lugares precios buscar') + (needsN ? setRow('places-needs', t('pk.needsRow', { n: needsN }), t('pk.needsSub'), 'needs price missing sin precio') : '') + setRow('zones-page', t('zn.title'), c.zones.length ? t('zn.count2', { n: SCore.areaZones(c.zones).length, h: riskN }) : t('zn.rowNone'), 'zones circles map areas draw zonas círculos mapa') + setRow('spots-page', t('pk.spots'), spotsSub(c), 'pickup spots collect meeting point recoger puntos'))}
      ${grp(t('sset.secTools'), setRow('price-helper', t('prh.title'), t('prh.row'), 'price helper distance road km calculator how much to charge distancia carretera calculadora cuánto cobrar') + setRow('pricecheck', t('prc.title'), t('prc.sub'), 'price check pattern chart compare revisión precios comparar'))}
      ${grp(t('sset.secOffers'), setRow('free-rule', t('fr.title'), freeSum(c), 'free delivery items ladder spend regulars km entrega gratis artículos') + setRow('coupons-page', t('cp.title'), cpSum(c), 'coupon discount code percent voucher cupón descuento código'))}
      ${grp(t('sset.secMore'), setRow('risk-page', t('pk.risk'), tn('pk.riskCountN', riskN), 'high risk dangerous unsafe areas alto riesgo peligro zonas') + setRow('dlv-settings', t('dlv.settings'), dset().charge ? t('dc.rowOn', { rate: moneyText(dset().perKm) + (dset().count === 'both' ? ' ' + t('dc.bothShort') : '') }) : t('sset.ratesSub'), 'delivery costs routes rate per km export route stats past deliveries costos rutas tarifa') + setRow('pickup-open', t('sset.more'), t('sset.moreSub'), 'more options quick selection price ranges starter pack bands rangos paquete inicial'))}
      ${withSwitches ? grp(t('sset.page'), `<div class="rw2" data-kw="prices show store page precios"><div class="t"><b>${t('store.prices')}</b><small>${t(c.showPrices ? 'store.pricesOn' : 'store.pricesOff')}</small></div>${swt('store-toggle', 'showPrices', c.showPrices)}</div>
        <div class="rw2" data-kw="items left quedan"><div class="t"><b>${t('store.left')}</b><small>${t('hub.leftSub')}</small></div>${swt('store-toggle', 'showLeft', c.showLeft)}</div>
        <div class="rw2" data-kw="transit tránsito"><div class="t"><b>${t('store.transit')}</b><small>${t('hub.transitSub')}</small></div>${swt('store-toggle', 'inTransit', c.inTransit)}</div>
        <div class="rw2" data-kw="batches automatically lotes"><div class="t"><b>${t('store.autoNew')}</b><small>${t('hub.autoSub')}</small></div>${swt('store-toggle', 'autoNew', c.autoNew)}</div>
        <button class="rw2 tap" data-act="store-open" data-kw="all store settings link name logo todos ajustes"><div class="t"><b>${t('hub.all')}</b></div><span class="chev">›</span></button>`) : grp(t('sset.page'), setRow('store-open', t('hub.all'), '', 'all store settings link name logo'))}`;
  };
  // Typing in the settings search keeps only the rows that match every word (in English or Spanish).
  const fold2 = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filterSettings = (q) => { const words = fold2(q).split(/\s+/).filter(Boolean); let any = false; document.querySelectorAll('.sgrp').forEach((g) => { let vis = 0; g.querySelectorAll('[data-kw]').forEach((r) => { const ok = !words.length || words.every((w) => fold2(r.dataset.kw).includes(w)); r.hidden = !ok; if (ok) vis++; }); g.hidden = !vis; if (vis) any = true; }); const none = document.getElementById('sset-none'); if (none) none.hidden = any || !words.length; };
  function sheetStoreSettings() {
    enterPage('storeset', '', () => sheetStoreSettings());
    const c = storeCfg(), h = dset().home, row = (act, title, sub) => `<button class="rw2 tap" data-act="${act}"><div class="t"><b>${title}</b><small>${sub}</small></div><span class="chev">›</span></button>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('hub.settings')}</b></div></div><div class="ap sth">${settingsGroups(c, false)}</div>`, null, true);
  }
  // One short line for the Store page: how many places, how many are switched off, how many zones.
  const pdSummary = (c) => { if (!c.locations.length && !c.zones.length) return t('hub.deliveryNone'); const off = c.locations.filter((l) => { const b = SCore.bandOf(c, l); return l.off || (b && b.on === false); }).length; return t('pd.summary', { n: c.locations.length, off, z: SCore.areaZones(c.zones).length }); };
  const hotOf = (placeId) => storeCfg().zones.find((z) => z.risk && z.place === placeId) || null;   // the high-risk spot drawn for this place, if any
  const placeRowH = (c, l) => { const b = SCore.bandOf(c, l), live = !l.off && !(b && b.on === false); return `<div class="pkr ${live ? '' : 'dim'}" data-n="${esc(l.name.toLowerCase())}"><button type="button" class="pkn" data-act="store-loc" data-id="${l.id}"><b>${esc(l.name)}</b><small>${l.pickup ? t('store.pickup') + ' · ' : ''}${l.delivery ? t('store.delivery') + ' ' + money(placeFee(c, l)) + (SCore.usesDistance(l, distRateOwner()) ? ' 📏' : '') : ''}${needsP(c, l) ? ` <span class="rtag np">${t('pk.needsPrice')}</span>` : ''}${hotOf(l.id) || l.risk ? ` <span class="rtag">${t('pk.riskTag')}</span>` : ''}</small></button>${swt('place-on', l.id, !l.off)}</div>`; };
  // Re-draw whichever of the three delivery pages is on top.
  const refreshPick = () => { const k = pageStack.length ? pageStack[pageStack.length - 1].key : ''; return k.startsWith('places|') ? sheetPlaces(plF) : k.startsWith('risk|') ? sheetRisk() : k.startsWith('spots|') ? sheetSpots() : sheetPickup(); };
  let plF = 'all', plQ = '';
  function sheetPlaces(f) {
    if (f) plF = f; ensureZonePlaces(); enterPage('places', '', () => sheetPlaces());
    const c = storeCfg(), liveOf = (l) => { const b = SCore.bandOf(c, l); return !l.off && !(b && b.on === false); }, hotOfP = (l) => !!hotOf(l.id) || l.risk;
    const test = { all: () => true, needs: (l) => needsP(c, l), risk: hotOfP, off: (l) => !liveOf(l) }, list = c.locations.filter(test[plF] || test.all).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    const chip = (k, label, n) => `<button type="button" class="chip ${plF === k ? 'on' : ''}" data-act="pl-filter" data-id="${k}">${label} <b>${n}</b></button>`;
    openSheet(`<div class="fullbar${plQ ? ' searching' : ''}"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div class="fbt"><b>${t('pk.placesH')}</b><small>${pdSummary(c)}</small></div><button type="button" class="fb-s" data-act="pl-search-open" aria-label="${esc(t('tool.search'))}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS.search}</svg>${plQ ? '<i class="dot"></i>' : ''}</button>
        <label class="fbs"><span aria-hidden="true">🔍</span><input id="pl-q" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('pl.search'))}" value="${esc(plQ)}"><button type="button" class="fbx" data-act="pl-search-close" aria-label="${t('tool.closeSearch')}">✕</button></label></div>
      <div class="pd"><div class="itchips" style="margin:10px 0">${chip('all', t('filter.all'), c.locations.length)}${chip('needs', t('pk.needsPrice'), c.locations.filter(test.needs).length)}${chip('risk', t('pk.riskTag'), c.locations.filter(test.risk).length)}${chip('off', t('pl.off'), c.locations.filter(test.off).length)}</div>
      <div class="card pkc" id="pl-list">${list.map((l) => placeRowH(c, l)).join('') || `<p class="muted small">${t('pd.tip')}</p>`}</div>
      <button type="button" class="pkadd" data-act="store-loc" data-id="new">＋ ${t('pd.add')}</button></div>`, null, true);
    plSearch();
  }
  const plSearch = () => { const q = plQ.trim().toLowerCase(); document.querySelectorAll('#pl-list .pkr').forEach((r) => { r.hidden = !!q && !(r.dataset.n || '').includes(q); }); };
  function sheetRisk() {
    seedHot(); enterPage('risk', '', () => sheetRisk());
    const c = storeCfg(), byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }), spots = c.zones.filter((z) => z.risk).sort(byName), legacy = c.locations.filter((l) => l.risk && !hotOf(l.id)).sort(byName);
    const pName = (z) => { const l = c.locations.find((x) => x.id === z.place); return l ? t('hot.fromPlace', { p: esc(l.name) }) : ''; };
    const sizeOf = (z) => (z.poly ? t('zn.shapeTag', { n: z.poly.length }) : t('zn.circleTag', { km: (z.r / 1000).toFixed(1).replace(/\.0$/, '') }));
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('pk.risk')}</b><small>${tn('pk.riskCountN', spots.length)}</small></div></div>
      <div class="pd"><div class="card hotinfo"><b>${t('hot.what')}</b><p>${t('hot.whatSub')}</p></div>
      <div class="card pkc">${spots.map((z) => `<div class="pkr"><button type="button" class="pkn" data-act="hot-edit" data-id="${z.id}"><b>⚠️ ${esc(z.name)}</b><small>${[pName(z), sizeOf(z)].filter(Boolean).join(' · ')}</small></button></div>`).join('') || `<p class="muted small">${t('hot.none')}</p>`}</div>
      <button type="button" class="pkadd" data-act="places-page">📍 ${t('hot.fromPlaces')}</button>
      ${legacy.length ? `<h4 class="pkh">${t('hot.legacy')}</h4><p class="muted small" style="margin:0 2px 8px">${t('hot.legacySub')}</p><div class="card pkc">${legacy.map((l) => `<div class="pkr"><span class="pkn"><b>${esc(l.name)}</b></span><button type="button" class="chip" data-act="place-hot" data-id="${l.id}">${t('hot.draw')}</button></div>`).join('')}</div>` : ''}</div>`, null, true);
  }
  // Pick high-risk areas from your places (tick as many as you like), or type one that is not in the list.
  function sheetRiskPick() {
    const c = storeCfg(), cand = c.locations.filter((l) => !l.risk).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    openSmall(`<h3>${t('pk.riskAdd')}</h3><p>${t('pk.riskPickSub')}</p><form id="f-riskpick"><div class="oqbar" style="margin-bottom:8px"><span aria-hidden="true">🔍</span><input id="rp-q" class="cq" type="search" autocomplete="off" placeholder="${esc(t('pl.search'))}"></div><div class="fpl" id="rp-list">${cand.map((l) => `<label class="tkr" data-n="${esc(l.name.toLowerCase())}"><input type="checkbox" value="${l.id}"><span>${esc(l.name)}</span></label>`).join('') || `<p class="muted small">${t('pk.riskNoPlaces')}</p>`}</div><input name="name" type="text" autocomplete="off" placeholder="${esc(t('pk.riskOther'))}"><div class="btns"><button class="btn primary">${t('btn.save')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`, 'sheet');
  }
  const kmLabel = (k) => (k > 0 ? t('fr.within', { km: k }) : t('fr.anywhere'));
  const freeSum = (c) => { const r = c.freeRule, p = []; if (r.tiers.length) p.push(tn('fr.sumTiers', r.tiers.length)); if (r.spend.on) p.push(t('fr.sumSpend', { a: moneyText(r.spend.amt) })); return p.length ? p.join(' · ') : t('fr.none'); };
  const cpSum = (c) => (c.couponRule.on ? t('cp.sum', { min: moneyText(c.couponRule.min), v: cpOffer(c.couponRule) }) : t('fr.none'));
  const reachName = (c) => { const g = SCore.reachCentre(c, dset().home); return g ? g.name || '' : ''; };
  // one switch for the sticker and the floating line on the store page; they only show when free delivery rules or coupons are on
  const offerSwitchCard = (c) => `<div class="card" style="margin-bottom:12px"><div class="rw"><div class="t"><b>${t('off.title')}</b><small>${t((c.freeRule.tiers.length || c.freeRule.spend.on || c.couponRule.on) ? 'off.sub' : 'off.subNone')}</small></div>${swt('offer-toggle', 'showOffer', c.showOffer)}</div></div>`;
  function sheetFreeRule() {
    enterPage('freerule', '', () => sheetFreeRule());
    const c = storeCfg(), r = c.freeRule, centre = reachName(c);
    const tier = (x, i) => `<div class="tierr"><span class="pkp">${t('fr.tierN')}</span><input class="pkin tn" inputmode="numeric" data-tier="n" data-i="${i}" value="${x.n}" aria-label="${t('fr.itemsU')}"><span class="pkp">${t('fr.itemsU')}</span><span class="arr">→</span><input class="pkin tk2" inputmode="decimal" data-tier="km" data-i="${i}" value="${x.km || ''}" placeholder="∞" aria-label="km"><span class="pkp">km</span><button type="button" class="tx" data-act="fr-tier-del" data-id="${i}" aria-label="${t('btn.delete')}">×</button></div><div class="tsub">${x.n} ${t('fr.itemsU')} · ${kmLabel(x.km)} <button type="button" class="lnk" data-act="fr-places" data-id="${x.km || 0}">${t('fr.seePlaces', { n: SCore.placesInReach(c, x.km, dset().home).length })} ›</button></div>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('fr.title')}</b><small>${t('fr.sub')}</small></div></div>
      <div class="ap">${offerSwitchCard(c)}<p class="lead" style="margin:0 2px 10px">${t('fr.how')}</p>
      <div class="card" style="margin-bottom:12px"><div class="t" style="padding:14px 16px 4px"><b>${t('fr.items')}</b><small>${t('fr.itemsSub')}</small></div><div class="tiers">${r.tiers.map(tier).join('') || `<p class="muted small" style="margin:6px 16px">${t('fr.noTiers')}</p>`}</div>
        <div class="btns" style="padding:0 16px 14px"><button type="button" class="btn alt" data-act="fr-tier-add">＋ ${t('fr.addLevel')}</button>${r.tiers.length ? '' : `<button type="button" class="btn alt" data-act="fr-suggest">✨ ${t('fr.suggest')}</button>`}</div></div>
      <div class="card" style="margin-bottom:12px"><div class="rw"><div class="t"><b>${t('fr.spend')}</b><small>${t('fr.spendSub')}</small></div>${swt('fr-on', 'spend', r.spend.on)}</div><div class="pkb ${r.spend.on ? '' : 'dim'}"><span class="pkp">TT$</span><input class="pkin" inputmode="decimal" data-rule="amt" value="${r.spend.amt}" aria-label="${t('fr.spend')}"><span class="arr">→</span><input class="pkin tk2" inputmode="decimal" data-rule="km" value="${r.spend.km || ''}" placeholder="∞" aria-label="km"><span class="pkp">km</span></div>${r.spend.on ? `<div class="tsub"><button type="button" class="lnk" data-act="fr-places" data-id="${r.spend.km || 0}">${t('fr.seePlaces', { n: SCore.placesInReach(c, r.spend.km, dset().home).length })} ›</button></div>` : ''}</div>
      <div class="card" style="margin-bottom:12px"><button type="button" class="rw2 tap" data-act="fr-centre"><div class="t"><b>${t('fr.from')}</b><small>${centre ? esc(centre) : t('fr.fromNone')}</small></div><span class="chev">›</span></button></div>
      <p class="muted small" style="margin:6px 2px">${t('fr.kmNote')}</p></div>`, null, true);
  }
  function sheetReachCentre() {
    enterPage('reach', '', () => sheetReachCentre());
    const c = storeCfg(), byName = (x, y) => x.name.localeCompare(y.name, undefined, { sensitivity: 'base' }), zs = SCore.areaZones(c.zones).slice().sort(byName), cur = c.freeRule.centre;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('fr.from')}</b><small>${t('fr.fromSub')}</small></div></div>
      <div class="pd"><div class="card pkc"><div class="pkr"><button type="button" class="pkn" data-act="fr-centre-pick" data-id=""><b>${t('fr.fromHome')}</b><small>${esc(reachName(Object.assign({}, c, { freeRule: Object.assign({}, c.freeRule, { centre: null }) })) || t('fr.fromNone'))}</small></button>${!cur ? '<span class="pkp">✓</span>' : ''}</div>${zs.map((z) => `<div class="pkr"><button type="button" class="pkn" data-act="fr-centre-pick" data-id="${z.id}"><b>${esc(z.name)}</b></button>${cur && cur.name === z.name ? '<span class="pkp">✓</span>' : ''}</div>`).join('')}</div></div>`, null, true);
  }
  /* ---------- coupons: earned on a big order, sent by WhatsApp, used on the next order ---------- */
  const ordersAt = () => Store.orders().map((o) => ({ id: o.id, coupon: SCore.orderCoupon(o), status: o.status, at: o.createdAt && o.createdAt.toMillis ? o.createdAt.toMillis() : 0 }));
  const cpOffer = (c, lg) => (c.kind === 'pct' ? t('cp.pctText', { v: c.value }, lg) + (c.cap > 0 ? ' ' + t('cp.capText', { m: moneyText(c.cap) }, lg) : '') : c.kind === 'delivery' ? (c.km > 0 ? t('cp.delKm', { km: c.km }, lg) : t('cp.delText', {}, lg)) : t('cp.offText', { v: moneyText(c.value) }, lg));
  const cpDate = (ms, lg) => new Date(ms).toLocaleDateString(lg === 'es' ? 'es' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  /* ---------- price helper and price check: distance by road from the store to a spot or to each place, and what to charge ---------- */
  const homeKey = () => { const h = dset().home; return h ? h.lat + ',' + h.lng : ''; };
  const roadCache = () => { const rc = dset().roadCache; return rc && rc.from === homeKey() && rc.km ? rc.km : {}; };
  // the road distance if the routing service answers, else an estimate (straight line x 1.3), marked as such
  const roadOrEst = async (a, b) => { const r = await Store.road(a, b), line = SCore.lineKm(a, b); return r != null ? { km: r, src: 'road', line } : { km: Math.round(line * 1.3 * 10) / 10, src: 'est', line }; };
  const placeRows = () => { const c = storeCfg(), h = dset().home, cache = roadCache(); if (!h) return []; return c.locations.filter((l) => l.delivery && !l.risk && l.zone && placeFee(c, l) > 0).map((l) => { const z = c.zones.find((q) => q.id === l.zone); if (!z) return null; const line = SCore.lineKm(h, { lat: z.lat, lng: z.lng }), road = cache[l.id]; return { id: l.id, name: l.name, price: placeFee(c, l), line, km: road != null ? road : Math.round(line * 1.3 * 10) / 10, road: road != null, lat: z.lat, lng: z.lng, off: !!l.off }; }).filter(Boolean).sort((a, b) => a.km - b.km); };
  const noHomeCard = () => `<div class="card" style="padding:16px"><p style="margin:0 0 10px">${t('prh.noHome')}</p><button class="btn primary" data-act="dlv-home">📍 ${t('prh.setHome')}</button></div>`;
  let ph = null, pcRun = false;
  const topKey = () => (pageStack.length ? pageStack[pageStack.length - 1].key : '');
  function phCompute(g) {
    const h = dset().home; if (!h) return; ph = { g, busy: true }; sheetPriceHelper();
    roadOrEst(h, g).then((r) => { ph = { g, busy: false, km: r.km, src: r.src, line: r.line }; if (topKey().startsWith('pricehelper|')) { const y = window.scrollY; sheetPriceHelper(); window.scrollTo(0, y); } });
    if (!g.name) MapPick.nameOf(g.lat, g.lng, I.getLang()).then((n) => { if (n && ph && ph.g === g) { g.name = n; if (topKey().startsWith('pricehelper|')) { const y = window.scrollY; sheetPriceHelper(); window.scrollTo(0, y); } } });
  }
  function sheetPriceHelper() {
    enterPage('pricehelper', '', () => sheetPriceHelper());
    const c = storeCfg(), h = dset().home;
    let body = '';
    if (!h) body = noHomeCard();
    else {
      body = `<button type="button" class="btn primary" style="width:100%" data-act="ph-pick">🗺️ ${t(ph ? 'prh.again' : 'prh.pick')}</button>`;
      if (ph && ph.busy) body += `<div class="card phres"><div class="mut">${t('prh.busy')}</div></div>`;
      else if (ph) {
        const g = ph.g, area = SCore.areaZones(c.zones), inz = SCore.zonesAt(area, g.lat, g.lng)[0], nz = inz || (SCore.nearestZone(area, g.lat, g.lng) || {}).zone, place = nz && c.locations.find((l) => l.zone === nz.id && l.delivery), rf = SCore.regionFee(c.regions, g.lat, g.lng), rid = SCore.regionAt(g.lat, g.lng), rows = placeRows(), near = SCore.nearRows(rows, ph.km).slice(0, 4);
        const sug = [], addS = (label, price) => { price = Math.round(price / 5) * 5; if (price > 0 && !sug.some((x) => x.price === price)) sug.push({ label, price }); };
        const rate = SCore.rateFee(dset(), ph.km); if (rate != null) addS(t('prh.suggRate'), rate);
        if (near.length) { const ps = near.map((r) => r.price).sort((a, b) => a - b); addS(t('prh.suggNear'), ps[Math.floor(ps.length / 2)]); }
        if (rf) addS(t('prh.suggRegion'), rf.fee);
        body += `<div class="card phres"><div class="phbig">${ph.src === 'road' ? '' : '≈ '}${ph.km} km <small>${t(ph.src === 'road' ? 'prh.byRoad' : 'prh.est')}</small></div><div class="mut">${t('prh.line', { km: ph.line })}${g.name ? ' · ' + esc(g.name) : ''}</div>
          <div class="phln"><span>${t('prh.region')}</span><b>${t('rg.' + rid)}${rf ? ' · ' + moneyText(rf.fee) : ''}</b></div>
          <div class="phln"><span>${t('prh.nearest')}</span><b>${nz ? esc(nz.name) + (inz ? '' : ' (' + t('prh.outside') + ')') : '–'}${place ? ' · ' + t('prh.priceNow', { p: moneyText(placeFee(c, place)) }) : ''}</b></div></div>
          <h4 class="pkh">${t('prh.near')}</h4><div class="card pkc">${near.map((r) => `<div class="pkr"><span class="pkn"><b>${esc(r.name)}</b><small>${r.road ? '' : '≈ '}${r.km} km</small></span><span class="pkp">${moneyText(r.price)}</span></div>`).join('') || `<p class="muted small" style="margin:8px 14px">${t('prh.nearNone')}</p>`}<button type="button" class="pkadd" data-act="pricecheck">📊 ${t('prh.open')}</button></div>
          ${sug.length ? `<h4 class="pkh">${t('prh.sugg')}</h4><div class="card" style="padding:12px 14px">${sug.map((x) => `<div class="phsg"><span><b>${moneyText(x.price)}</b><small>${x.label}</small></span>${place ? `<button type="button" class="btn alt" data-act="ph-set" data-id="${x.price}" data-ord="${place.id}">${t('prh.use', { z: esc(place.name) })}</button>` : ''}</div>`).join('')}</div>` : ''}
          <button type="button" class="btn" style="width:100%;margin-top:10px" data-act="ph-add">＋ ${t('prh.add')}</button>`;
      }
    }
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('prh.title')}</b><small>${t('prh.sub')}</small></div></div><div class="pd">${body}</div>`, null, true);
  }
  const pcChart = (rows, flags) => { if (!rows.length) return ''; const W = 330, H = 150, mk = Math.max(10, ...rows.map((r) => r.km)), mp = Math.max(20, ...rows.map((r) => r.price)), X = (k) => 20 + k / mk * (W - 30), Y = (p) => H - 18 - p / mp * (H - 30); return `<svg viewBox="0 0 ${W} ${H}" class="pcchart"><polyline points="${rows.map((r) => X(r.km) + ',' + Y(r.price)).join(' ')}" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="2"/>${rows.map((r) => `<circle cx="${X(r.km)}" cy="${Y(r.price)}" r="5" fill="${flags[r.id] ? '#d6336c' : 'var(--brand)'}"/>`).join('')}<text x="20" y="${H - 3}" font-size="10" fill="currentColor" fill-opacity=".6">0 km</text><text x="${W - 46}" y="${H - 3}" font-size="10" fill="currentColor" fill-opacity=".6">${Math.round(mk)} km</text><text x="2" y="12" font-size="10" fill="currentColor" fill-opacity=".6">${Math.round(mp)}</text></svg>`; };
  // under each place: what the distance rule would charge (red = more than now, green = less)
  const byDist = (r) => { const rate = distRateOwner(); if (!(rate.perKm > 0 || rate.base > 0)) return ''; const x = SCore.distanceFee(rate, r.km); if (x.fee == null) return ''; return `<small class="${x.fee > r.price ? 'pcup' : x.fee < r.price ? 'pcdn' : ''}">📏 ${t('dc.byDist')}: ${moneyText(x.fee)} · ${x.both} km ${t('dc.bothShort')}</small>`; };
  function sheetPriceCheck() {
    enterPage('pricecheck', '', () => sheetPriceCheck());
    const h = dset().home; let body = '';
    if (!h) body = noHomeCard();
    else {
      const rows = placeRows(), fl = Object.fromEntries(SCore.priceFlags(rows).map((x) => [x.id, x.flag])), done = rows.filter((r) => r.road).length, sm = SCore.smoothPrices(rows, 5), changes = sm.filter((x) => x.price !== (rows.find((r) => r.id === x.id) || {}).price);
      body = `<div class="card pccard"><div class="pct">${t('prc.chart')}</div>${pcChart(rows, fl)}<div class="mut" style="padding:0 4px 4px">${t('prc.chartSub')}</div></div>
        <div class="card pkc" style="margin-top:10px"><div class="pkr"><span class="pkn"><b id="pc-prog">${pcRun ? t('prc.measuring', { done, total: rows.length }) : t('prc.measured', { n: done, t: rows.length })}</b><small>${t('prc.est')}</small></span><button type="button" class="chip" data-act="pc-measure" ${pcRun ? 'disabled' : ''}>${t('prc.measure')}</button></div></div>
        <div class="card pkc" style="margin-top:10px">${rows.map((r) => `<div class="pkr"><span class="pkn"><b>${esc(r.name)}</b>${fl[r.id] ? `<small class="pcfl">⚠ ${t(fl[r.id] === 'dear' ? 'prc.dear' : 'prc.cheap')}</small>` : ''}${byDist(r)}</span><span class="pck">${r.road ? '' : '≈ '}${r.km} km</span><span class="pkp">${moneyText(r.price)}</span></div>`).join('') || `<p class="muted small" style="margin:8px 14px">${t('prc.none')}</p>`}</div>
        ${rows.length && !dset().charge && (dset().perKm > 0 || dset().base > 0) ? `<button type="button" class="btn" style="width:100%;margin-top:10px" data-act="ds-charge-pc">📏 ${t('dc.pcBtn')}</button>` : ''}${rows.length ? `<button type="button" class="btn" style="width:100%;margin-top:10px" data-act="pc-smooth">${t('prc.smooth')}${changes.length ? ' (' + changes.length + ')' : ''}</button>` : ''}`;
    }
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('prc.title')}</b><small>${t('prc.sub')}</small></div></div><div class="pd">${body}</div>`, null, true);
  }
  async function pcMeasure() {
    const h = dset().home; if (!h || pcRun) return; pcRun = true; const rows = placeRows(); let done = rows.filter((r) => r.road).length, fails = 0; const prog = () => { const el = document.getElementById('pc-prog'); if (el) el.textContent = t('prc.measuring', { done, total: rows.length }); }; prog();
    for (const r of rows) {
      if (r.road) continue; if (!topKey().startsWith('pricecheck|')) break;
      const km = await Store.road(h, { lat: r.lat, lng: r.lng });
      if (km != null) { const rc = dset().roadCache, cur = rc && rc.from === homeKey() && rc.km ? Object.assign({}, rc.km) : {}; cur[r.id] = km; saveDset({ roadCache: { from: homeKey(), km: cur } }); done++; prog(); } else if (++fails >= 3) break;
      await new Promise((ok) => setTimeout(ok, 1100));
    }
    pcRun = false; if (fails) toast(t('prc.partial')); if (topKey().startsWith('pricecheck|')) { const y = window.scrollY; sheetPriceCheck(); window.scrollTo(0, y); }
  }
  function sheetReach(km) {
    enterPage('reachlist', String(km), () => sheetReach(km));
    const c = storeCfg(), list = SCore.placesInReach(c, km, dset().home), centre = reachName(c);
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${km > 0 ? t('fr.placesTitle', { km }) : t('fr.placesAny')}</b><small>${tn('fr.placesN', list.length)}${km > 0 && centre ? ' · ' + t('fr.fromShort', { z: esc(centre) }) : ''}</small></div></div>
      <div class="pd"><div class="card pkc">${list.map((x) => `<div class="pkr ${x.off ? 'dim' : ''}"><span class="pkn"><b>${esc(x.name)}</b>${x.off ? `<small>${t('fr.placeOff')}</small>` : ''}</span><span class="pkp">${x.km == null ? '' : x.km + ' km'}</span></div>`).join('') || `<p class="muted small" style="margin:8px 14px">${t('fr.placesNone')}</p>`}</div>
      ${km > 0 ? `<p class="muted small" style="margin:8px 2px">${t('fr.placesNote')}</p>` : ''}</div>`, null, true);
  }
  function sheetCoupons() {
    enterPage('coupons', '', () => sheetCoupons());
    const c = storeCfg(), r = c.couponRule, use = SCore.couponUse(ordersAt()), now = Date.now(), list = c.coupons.slice().sort((x, y) => y.made - x.made);
    const chip = (k) => `<button type="button" class="chip ${r.kind === k ? 'on' : ''}" data-act="cp-kind" data-id="${k}">${t(k === 'delivery' ? 'cp.kDel' : k === 'pct' ? 'cp.kPct' : 'cp.kOff')}</button>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('cp.title')}</b><small>${t('cp.sub')}</small></div></div>
      <div class="ap">${offerSwitchCard(c)}<div class="card" style="margin-bottom:12px"><div class="rw"><div class="t"><b>${t('cp.on')}</b><small>${t('cp.onSub')}</small></div>${swt('cp-on', 'on', r.on)}</div></div>
      <div class="card ${r.on ? '' : 'dimcard'}" style="margin-bottom:12px"><div class="fld" style="padding:14px 16px 0"><label>${t('cp.min')}</label><input class="pkin wide" inputmode="decimal" data-cpr="min" value="${r.min}"><small>${t('cp.minSub')}</small></div>
        <div style="padding:6px 16px 0"><label>${t('cp.kind')}</label><div class="chips">${chip('pct')}${chip('off')}${chip('delivery')}</div></div>
        ${r.kind === 'pct' ? `<div class="fld" style="padding:12px 16px 0"><label>${t('cp.valPct')}</label><input class="pkin wide" inputmode="decimal" data-cpr="value" value="${r.value}"></div><div class="fld" style="padding:12px 16px 0"><label>${t('cp.cap')}</label><input class="pkin wide" inputmode="decimal" data-cpr="cap" value="${r.cap || ''}" placeholder="${t('cp.noCap')}"><small>${t('cp.capSub')}</small></div>` : r.kind === 'off' ? `<div class="fld" style="padding:12px 16px 0"><label>${t('cp.valOff')}</label><input class="pkin wide" inputmode="decimal" data-cpr="value" value="${r.value}"></div>` : `<div class="fld" style="padding:12px 16px 0"><label>${t('cp.km')}</label><input class="pkin wide" inputmode="decimal" data-cpr="km" value="${r.km || ''}" placeholder="${t('fr.anywhere')}"><small>${t('cp.kmSub')}</small><button type="button" class="lnk" data-act="fr-places" data-id="${r.km || 0}">${t('fr.seePlaces', { n: SCore.placesInReach(c, r.km, dset().home).length })} ›</button></div>`}
        <div class="fld" style="padding:12px 16px 14px"><label>${t('cp.days')}</label><input class="pkin wide" inputmode="numeric" data-cpr="days" value="${r.days}"><small>${t('cp.how')}</small></div></div>
      <h4 class="pkh">${t('cp.made')}</h4><div class="card pkc">${list.map((x) => { const st = SCore.couponState(x, use, now); return `<div class="pkr"><span class="pkn"><b>${esc(x.code)} · ${esc(x.name || '')}</b><small>${esc(cpOffer(x))} · ${t('cp.st.' + st)}${st === 'live' ? ' · ' + t('cp.until', { d: cpDate(x.exp) }) : ''}</small></span></div>`; }).join('') || `<p class="muted small" style="margin:8px 14px">${t('cp.none')}</p>`}</div></div>`, null, true);
  }
  // Opens WhatsApp straight to the customer with the coupon message (in their language), ready to send.
  const cpSendWa = (o, cp) => { const lg = cp.lang === 'es' || o.lang === 'es' ? 'es' : 'en', days = Math.max(1, Math.round((cp.exp - cp.made) / 86400000)), msg = t('cp.msg', { name: (o.name || '').split(' ')[0], biz: bizName(), code: cp.code, offer: cpOffer(cp, lg), days, date: cpDate(cp.exp, lg) }, lg), w = window.open(SCore.waLink(o.phone, msg), '_blank'); if (!w) toast(t('ord.waBlocked')); };
  // On an order that is paid in full and big enough: make the coupon (once per order) and send it by WhatsApp.
  const couponCard = (o, pay) => {
    const c = storeCfg(), r = c.couponRule; if (!r.on || o.status === 'declined') return '';
    const mine = c.coupons.find((x) => x.order === o.id), sub = (o.items || []).reduce((n, i) => n + (Number(i.price) || 0), 0);
    if (!mine) { if (!(pay && pay.owing <= 0 && sub >= r.min && SCore.validPhone(o.phone))) return ''; return `<div class="card cpcard"><div class="t"><b>🎟 ${t('cp.reward')}</b><small>${t('cp.rewardSub', { v: esc(cpOffer(r)) })}</small></div><button type="button" class="btn primary" data-act="cpn-make" data-id="${o.id}">${t('cp.make')}</button></div>`; }
    const st = SCore.couponState(mine, SCore.couponUse(ordersAt()), Date.now());
    return `<div class="card cpcard"><div class="t"><b>🎟 ${esc(mine.code)}</b><small>${esc(cpOffer(mine))} · ${t('cp.st.' + st)}${st === 'live' ? ' · ' + t('cp.until', { d: cpDate(mine.exp) }) : ''}</small></div><button type="button" class="btn wa" data-act="cpn-send" data-id="${o.id}">${t('cp.send')}</button></div>`;
  };
  function sheetPickup() {
    ensureZonePlaces(); seedHot();
    enterPage('pickup', '', () => sheetPickup());
    const c = storeCfg(), on = (l) => { const b = SCore.bandOf(c, l); return !l.off && !(b && b.on === false); }, nOn = c.locations.filter(on).length, nOff = c.locations.length - nOn;
    const mode = (k) => `<button type="button" class="chip ${c.areaMode === k ? 'on' : ''}" data-act="area-mode" data-id="${k}">${t('pk.' + k)}</button>`;
    const price = (l) => money(SCore.priceOf(c, l)), risks = c.locations.filter((l) => l.risk);
    const bandRow = (b) => { const n = c.locations.filter((l) => l.band === b.id).length; return `<div class="pkb ${b.on ? '' : 'dim'}"><span class="pkp">TT$</span><input class="pkin" inputmode="decimal" data-bandprice="${b.id}" value="${b.price}" aria-label="${t('pk.bandPrice')}"><div class="pkt"><b>${esc(b.name || t('pk.range'))}</b><small>${tn('pk.nPlaces', n)}</small></div>${swt('band-on', b.id, b.on)}${n ? '' : `<button type="button" class="pkx" data-act="band-del" data-id="${b.id}" aria-label="${t('btn.delete')}">✕</button>`}</div>`; };
    const placeRow = (l) => `<div class="pkr ${on(l) ? '' : 'dim'}"><button type="button" class="pkn" data-act="store-loc" data-id="${l.id}"><b>${esc(l.name)}</b><small>${l.pickup ? t('store.pickup') + ' · ' : ''}${l.delivery ? t('store.delivery') + ' ' + price(l) : ''}${needsP(c, l) ? ` <span class="rtag np">${t('pk.needsPrice')}</span>` : ''}${l.risk ? ` <span class="rtag">${t('pk.riskTag')}</span>` : ''}</small></button>${swt('place-on', l.id, !l.off)}</div>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('sset.more')}</b><small>${t('sset.moreSub')}</small></div></div>
      <div class="pd">
      ${c.locations.some((l) => l.risk) ? `<div class="card pkc"><h4>${t('pk.quick')}</h4><div class="chips">${mode('safe')}${mode('all')}${mode('custom')}</div><p class="muted small">${t('pk.quickSub')}</p><p class="muted small"><b>${t('pk.count', { on: nOn, off: nOff })}</b></p></div>` : ''}
      ${c.bands.length ? '' : `<button type="button" class="addp towns" data-act="store-towns">🇹🇹 ${t('pk.towns')}</button><p class="lead" style="margin-top:8px">${t('pk.townsSub')}</p>`}
      ${c.bands.length || c.locations.some((l) => l.band) ? `<details class="oldr" open><summary>${t('pd.oldRanges')}</summary><p class="muted small" style="margin:8px 2px">${t('pd.oldRangesSub')}</p>
      ${c.bands.length ? `<h4 class="pkh">${t('pk.bands')}</h4><div class="card pkc">${c.bands.map(bandRow).join('')}<button type="button" class="pkadd" data-act="band-add">＋ ${t('pk.bandAdd')}</button><p class="muted small">${t('pk.bandsSub')}</p></div>` : ''}
      </details>` : ''}
      ${!c.locations.some((l) => l.risk) && c.bands.length && !c.locations.some((l) => l.band) ? `<p class="muted small" style="margin:8px 2px">${t('sset.moreNone')}</p>` : ''}
      </div>`, null, true);
  }
  // Pickup spots: the meeting points for pickup orders, as their own page.
  const spotRowH = (x) => `<div class="pkr ${x.on ? '' : 'dim'}"><button type="button" class="pkn" data-act="spot-edit" data-id="${x.id}"><b>${esc(x.name)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}</button>${swt('spot-on', x.id, x.on)}<button type="button" class="pkx" data-act="spot-del" data-id="${x.id}" aria-label="${t('pk.spotDel')}">✕</button></div>`;
  function sheetSpots() {
    enterPage('spots', '', () => sheetSpots());
    const c = storeCfg();
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('pk.spots')}</b><small>${t('sset.spotsSub')}</small></div></div>
      <div class="pd"><div class="card pkc"><p class="muted small" style="margin-top:0">${t('pk.spotsSub')}</p><div class="pkb"><span class="pkp">TT$</span><input class="pkin" id="pk-spotprice" inputmode="decimal" data-spotprice="1" value="${c.spotPrice || ''}" placeholder="0.00" aria-label="${t('pk.spotPrice')}"><div class="pkt"><b>${t('pk.spotPrice')}</b></div></div>${c.spots.map(spotRowH).join('')}<button type="button" class="pkadd" data-act="spot-add">＋ ${t('pk.spotAdd')}</button></div></div>`, null, true);
  }
  // The delivery setup guide: each step ticked when done; tap any step, or the Next button.
  const guideSteps = (c) => { const needs = c.locations.some((l) => needsP(c, l)), hasP = c.locations.some((l) => l.delivery); return [
    { act: 'dlv-home', title: t('guide.s.loc'), done: !!dset().home }, { act: 'regions-page', title: t('guide.s.regions'), done: c.regions.some((r) => r.base > 0) },
    { act: needs ? 'places-needs' : 'places-page', title: t('guide.s.places'), done: hasP && !needs }, { act: 'spots-page', title: t('guide.s.spots'), done: c.spots.length > 0, opt: true },
    { act: 'free-rule', title: t('guide.s.free'), done: c.freeRule.tiers.length > 0 || c.freeRule.spend.on, opt: true }, { act: 'coupons-page', title: t('guide.s.coupons'), done: c.couponRule.on, opt: true }]; };
  function sheetGuide() {
    enterPage('guide', '', () => sheetGuide());
    const c = storeCfg(), st = guideSteps(c), done = st.filter((x) => x.done).length, nx = st.find((x) => !x.done);
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('guide.title')}</b><small>${t('guide.sub')}</small></div></div>
      <div class="pd"><div class="card gdhero"><b>${t('sset.guideSub', { n: done, m: st.length })}</b><div class="gdbar"><i style="width:${Math.round(done / st.length * 100)}%"></i></div>${nx ? `<button type="button" class="btn primary" style="width:100%" data-act="${nx.act}">${t('guide.next', { s: nx.title })} ›</button>` : `<p style="margin:8px 0 0">✓ ${t('guide.done')}</p>`}</div>
      <div class="card pkc">${st.map((x) => `<button type="button" class="gdrow" data-act="${x.act}"><span class="gdck ${x.done ? 'on' : ''}">${x.done ? '✓' : ''}</span><span class="gdt"><b>${x.title}</b>${x.opt ? `<small>${t('guide.opt')}</small>` : ''}</span><span class="chev">›</span></button>`).join('')}</div></div>`, null, true);
  }
  // Store name and WhatsApp: two boxes and how they look to customers (saves as you type).
  function sheetContact() {
    enterPage('storecontact', '', () => sheetContact());
    const c = storeCfg(), nm = c.name || bizName();
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('hub.contact')}</b><small>${t('ct.sub')}</small></div></div>
      <div class="pd"><div class="fld"><label for="ct-name">${t('store.name')}</label><input id="ct-name" data-store="name" value="${esc(c.name)}" placeholder="${esc(bizName())}" autocomplete="off" enterkeyhint="done"><small>${t('ct.nameSub')}</small></div>
      <div class="fld"><label for="ct-wa">${t('store.whatsapp')}</label><input id="ct-wa" data-store="whatsapp" inputmode="tel" value="${esc(c.whatsapp)}" placeholder="${t('ex.label')} 1 868 555 0100" autocomplete="off" enterkeyhint="done"><small>${t('ct.waSub')}</small></div>
      <div class="fld"><label for="ct-slug">${t('slug.label')}</label><div class="slugrow"><input id="ct-slug" data-slug="1" value="${esc(c.slug || '')}" placeholder="${esc(SCore.slugify(c.name || bizName()))}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="done"><button class="btn" data-act="store-slug">${t('slug.save')}</button></div><small id="ct-slugmsg">${c.slug ? '' : t('slug.sub')}</small><div class="prlink" id="ct-slugurl">${esc(Store.link(c) || '')}</div></div>
      <div class="pvw"><div class="cap">${t('ct.how')}</div><div class="top"><span class="lg" id="ct-pl">${esc((nm.trim().charAt(0) || '?').toUpperCase())}</span><span id="ct-pn">${esc(nm)}</span></div><div class="wab">${t('ct.wa')}</div></div>
      <p class="lead" style="margin-top:14px">${t('ct.saves')}</p></div>`, null, true);
  }
  function sheetLocation(id) {
    const c = storeCfg(), l = c.locations.find((x) => x.id === id) || { id: '', name: '', pickup: true, delivery: true, price: 25, risk: false, off: false, band: '' };
    enterPage('storeloc', id, () => sheetLocation(id));
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t(id === 'new' ? 'store.addLoc' : 'store.editLoc')}</b><small>${esc(l.name)}</small></div></div>
      <div class="ap"><label for="sl-name">${t('store.locName')}</label><input id="sl-name" value="${esc(l.name)}" placeholder="${t('store.locPh')}" autocomplete="off" enterkeyhint="done">
      <div class="card" style="margin-top:12px"><div class="rw"><div class="t"><b>${t('store.pickup')}</b><small>${t('store.pickupSub')}</small></div>${swt('sl-flag', 'pickup', l.pickup)}</div><div class="rw"><div class="t"><b>${t('store.delivery')}</b><small>${t('store.deliverySub')}</small></div>${swt('sl-flag', 'delivery', l.delivery)}</div></div>
      ${(() => { const rgId = SCore.regionOfPlace(c, l), rgr = c.regions.find((r) => r.id === rgId), hasBase = !!(rgr && rgr.base > 0), rate = distRateOwner(), canDist = (rate.perKm > 0 || rate.base > 0), dp = canDist ? SCore.distPlace(c, Object.assign({}, l, { dm: true }), rate, dset().home, roadCache()) : null, mode = l.dm ? 'dist' : l.band ? 'b:' + l.band : (l.rm || (!(l.price > 0) && hasBase) ? 'region' : 'own'), o = (v, txt) => `<option value="${v}" ${mode === v ? 'selected' : ''}>${txt}</option>`;
        return `<label for="sl-mode">${t('sl.price')}</label><select id="sl-mode">${o('region', hasBase ? t('sl.modeRegionFee', { r: t('rg.' + rgId), f: moneyText(rgr.base) }) : t('sl.modeRegion'))}${canDist ? o('dist', dp && dp.fee != null ? t('dc.optDist', { fee: moneyText(dp.fee), km: dp.both }) : t('dc.optDistNo')) : ''}${c.bands.map((b) => o('b:' + b.id, `TT$ ${b.price}${b.name ? ' · ' + esc(b.name) : ''}`)).join('')}${o('own', t('sl.modeOwn'))}</select>
        <p class="muted small" id="sl-rnote" style="margin:6px 2px;${mode === 'region' || mode === 'dist' ? '' : 'display:none'}">${mode === 'dist' ? t('dc.distNote') : hasBase || !rgId ? t('sl.regionNote') : t('sl.noBase')}</p>
        ${l.zone ? '' : `<label for="sl-rg">${t('sl.region')}</label><select id="sl-rg"><option value="">${t('sl.regionAuto', { r: rgId ? t('rg.' + rgId) : '-' })}</option>${SCore.REGIONS.map((r) => `<option value="${r.id}" ${l.rg === r.id ? 'selected' : ''}>${t('rg.' + r.id)}</option>`).join('')}</select>`}
        <div id="sl-own" style="${mode === 'own' ? '' : 'display:none'}"><label for="sl-price">${t('store.deliveryPrice')}</label><input id="sl-price" type="text" inputmode="decimal" value="${l.price || ''}" placeholder="0.00" autocomplete="off" enterkeyhint="done"></div>`; })()}
      <div class="btns"><button class="btn primary" data-act="store-loc-save" data-id="${id}">${t('btn.save')}</button>${id === 'new' ? '' : `<button class="btn danger" data-act="store-loc-del" data-id="${id}">${t('btn.delete')}</button>`}</div>
      ${id === 'new' ? '' : (() => { const h = hotOf(id); return h ? `<div class="card hotcard"><div class="t"><b>⚠️ ${t('hot.has', { z: esc(h.name) })}</b><small>${t('hot.sub')}</small></div><div class="btns"><button class="btn alt" data-act="hot-edit" data-id="${h.id}">${t('hot.edit')}</button><button class="btn alt" data-act="hot-remove" data-id="${h.id}">${t('hot.remove')}</button></div></div>` : `<div class="card hotcard"><div class="t"><b>⚠️ ${t('hot.title')}</b><small>${t('hot.sub')}</small></div><button class="btn hotbtn" data-act="place-hot" data-id="${id}">⚠️ ${t('hot.btn')}</button></div>`; })()}</div>`, null, true);
  }
  let ordFilter = 'new';
  const ordWhen = (o) => ago(Store.when(o));
  const optText = (o) => `${o.option === 'delivery' ? t('store.delivery') : t('store.pickup')} · ${esc(o.location)}`;
  const stBadge = (o) => { const st = stageOf(o); return st === 'handed' ? `<span class="obadge confirmed">${t('ord.stHanded')}</span>` : `<span class="obadge ${o.status}">${t(o.status === 'confirmed' ? (o.option === 'delivery' ? 'ord.toDeliver' : 'ord.toCollect') : 'ord.' + o.status)}</span>`; };
  // The actions each permission covers (the click handler refuses them when your rank does not allow it)
  const ACT_NEEDS = {};
  Object.entries({
    sell: ['make-invoice', 'pay-inv', 'pay-save', 'pay-go', 'pay-no', 'pay-full', 'pay-full-amt', 'pay-clearing'],
    orders: ['ord-sent-mark', 'order-confirm', 'loc-yes', 'loc-no', 'order-decline', 'order-done', 'order-delete', 'wait-open', 'wait-batch', 'dv-toggle', 'dv-all', 'dv-go', 'order-cancel', 'dlv-done', 'dlv-plan', 'dlv-plan-set', 'dlv-plan-date', 'ord-send-inv', 'dlv-way', 'dlv-thanks', 'km-save', 'km-reset'],
    stock: ['new-batch', 'del-batch', 'do-receive', 'recv-yes', 'receive', 'import-json', 'import-xlsx', 'split-group', 'qe-open', 'qe-go', 'qe-next', 'sale-apply', 'sale-off', 'toggle-sale', 'use-rec', 'szp-addsave', 'szp-done', 'es-savewords', 'es-addwords', 'es-done', 'word-add', 'word-del', 'word-del2', 'word-save', 'word-edit', 'free-space', 'free-thumbs'],
    costs: ['csv', 'export-json'],
    refunds: ['return-open', 'return-inv', 'return-item', 'ret-all', 'ret-do', 'del-inv'],
    storeSettings: ['pickup-open', 'store-settings', 'store-create', 'store-toggle', 'store-addbatch', 'store-batch', 'store-batch-all', 'store-loc', 'store-loc-save', 'store-loc-del', 'store-left', 'store-publish', 'dlv-settings', 'dlv-home', 'regions-page', 'ds-charge', 'ds-charge-pc', 'ds-count', 'ds-mode', 'offer-toggle', 'guide-open', 'spots-page', 'price-helper', 'pricecheck', 'ph-pick', 'ph-set', 'ph-add', 'pc-measure', 'pc-smooth', 'free-rule', 'fr-on', 'fr-tier-add', 'fr-tier-del', 'fr-suggest', 'fr-centre', 'fr-centre-pick', 'coupons-page', 'fr-places', 'cp-on', 'cp-kind', 'cpn-make', 'cpn-send', 'region-edit', 'region-suggest', 'region-save', 'region-all', 'ds-here', 'ds-map', 'ds-linkopen', 'ds-linkgo', 'ds-recalc', 'ds-recalc-close'],
  }).forEach(([cap, acts]) => acts.forEach((a) => { ACT_NEEDS[a] = cap; }));
  /* ---------- the team: people, ranks, the business code, what each rank may do, handing the business over ---------- */
  const teamTop = () => (pageStack.length ? pageStack[pageStack.length - 1].key : '');
  function refreshTeamSheets() { const k = teamTop(); if ($('#sheet') && !$('#sheet').hidden && !$('#sheet').classList.contains('small')) { if (k === 'team|') sheetTeam(); else if (k === 'perms|') sheetPerms(); else if (k === 'notif|') sheetNotifs(); else if (k.startsWith('req|')) sheetRequest(k.slice(4)); } }
  let reqFetched = 0;
  const fetchRequests = () => { if (can('team') && Cloud.refreshRequests && Date.now() - reqFetched > 4000) { reqFetched = Date.now(); Cloud.refreshRequests().catch((e) => { reqErr = (e && e.code) || 'error'; }); } };
  function sheetTeam() {
    if (!can('team') || !team) return;
    enterPage('team', '', () => sheetTeam());
    fetchRequests();
    const ppl = Team.people(team.members, team.names);
    const reqs = joinReqs.map((r) => { const when = r.createdAt && r.createdAt.toMillis ? ago(new Date(r.createdAt.toMillis())) : ''; return `<button class="rqrow" data-act="req-open" data-id="${esc(r.uid)}"><span class="av">${esc((r.name || r.email || '?').trim().charAt(0).toUpperCase())}</span><div class="t"><b>${esc(r.name || r.email || '')}</b><small>${esc(r.email || '')}${when ? ' · ' + t('req.asked', { ago: when }) : ''}</small></div><span class="nw">${t('team.review')}</span></button>`; }).join('');
    const rows = ppl.map((p) => { const nm = p.name || t('team.unnamed'), you = p.uid === cloud.uid, tap = !you && p.rank !== 'owner';
      return `<${tap ? 'button class="row tap"' : 'div class="row"'} ${tap ? `data-act="team-person" data-id="${esc(p.uid)}"` : ''}><div class="grow"><b>${esc(nm)}${you ? ' · ' + t('team.you') : ''}</b></div><span class="pill rk-${p.rank}">${rankName(p.rank)}</span>${tap ? '<span class="chev">›</span>' : ''}</${tap ? 'button' : 'div'}>`; }).join('');
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('team.title')}</b><small>${esc(bizName())}</small></div></div><div class="ap">
      ${reqErr ? `<div class="card treq"><div class="rw"><div class="t"><b>⚠️ ${t('team.reqError')}</b><small>${esc(reqErr)} · ${t('team.reqErrorHint')}</small></div></div></div>` : ''}
      ${joinReqs.length ? `<h4><span>${t('team.requests')}</span></h4>${reqs}` : ''}
      <h4><span>${t('team.people')}</span></h4><div class="list">${rows}</div>
      <h4><span>${t('team.code')}</span></h4><div class="card codecard"><div class="cin"><div class="codebig" aria-label="${t('team.code')}">${esc(team.code || '······')}</div><p class="muted small" style="margin:6px 0 10px">${t('team.codeNote')}</p>
        <div class="tbtns"><button class="btn" data-act="team-copy">${t('team.copy')}</button><button class="btn" data-act="team-newcode">${t('team.newCode')}</button></div></div></div>
      <div class="list" style="margin-top:14px">${trow('🔑', t('perm.row'), t('perm.sub'), 'data-act="perm-open"')}</div>
      <div class="tbtns" style="margin-top:14px"><button class="btn" data-act="team-check">${t('team.check')}</button><button class="btn" data-act="team-refresh">${t('team.refresh')}</button></div>
      <div class="tbtns" style="margin-top:18px"><button class="btn rs" data-act="xfer-open">${t('xfer.btn')}</button></div><p class="muted small" style="margin:8px 2px 24px">${t('xfer.note')}</p></div>`, null, true);
  }
  const CAP_WORDS = ['sell', 'orders', 'stock', 'refunds', 'storeSettings', 'costs'];
  const rankSummary = (rank) => { const P = Team.fill(team && team.perms)[rank] || {}, w = CAP_WORDS.filter((c) => P[c]).map((c) => t('req.cap.' + c)); const x = w.length ? w.join(', ') : t('req.cap.none'); return x.charAt(0).toUpperCase() + x.slice(1) + '.'; };
  function sheetRequest(uid) {
    if (!can('team') || !team) return;
    const r = joinReqs.find((x) => x.uid === uid); if (!r) return dropPages('req|' + uid);
    enterPage('req', uid, () => sheetRequest(uid));
    const rk = reqRank[uid] || 'seller', when = r.createdAt && r.createdAt.toMillis ? ago(new Date(r.createdAt.toMillis())) : '', nm = r.name || r.email || '';
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('req.title')}</b><small>${esc(bizName())}</small></div></div><div class="ap">
      <div class="rqbig"><span class="av">${esc(nm.trim().charAt(0).toUpperCase() || '?')}</span><div><b>${esc(nm)}</b><small>${esc(r.email || '')}</small>${when ? `<small>${t('req.askedFull', { ago: when })}</small>` : ''}</div></div>
      <h4><span>${t('req.choose')}</span></h4>
      ${['seller', 'supervisor', 'manager'].map((k) => `<button class="rkc ${rk === k ? 'on' : ''}" data-act="req-rank" data-id="${esc(uid)}" data-rank="${k}"><span class="dot"></span><div><b>${rankName(k)}</b><small>${esc(rankSummary(k))}</small></div></button>`).join('')}
      <p class="muted small" style="margin:6px 2px 12px">${t('req.later')}</p>
      <button class="btn primary" style="width:100%;margin-top:6px" data-act="req-approve" data-id="${esc(uid)}">${t('req.letIn', { rank: rankName(rk) })}</button>
      <button class="btn rs" style="width:100%;margin-top:10px" data-act="req-decline" data-id="${esc(uid)}">${t('team.decline')}</button></div>`, null, true);
  }
  const PERM_ROWS = ['sell', 'orders', 'stock', 'refunds', 'storeSettings', 'costs'];
  function sheetPerms() {
    if (!can('team') || !team) return;
    enterPage('perms', '', () => sheetPerms());
    const P = Team.fill(team.perms), ranks = ['seller', 'supervisor', 'manager'];
    const row = (c) => `<div class="prow"><div class="pl"><b>${t('perm.' + c)}</b><small>${t('perm.' + c + 'Sub')}</small></div>${ranks.map((r) => `<button class="tg ${P[r][c] ? 'on' : ''}" role="switch" aria-checked="${P[r][c]}" aria-label="${rankName(r)}" data-act="perm-toggle" data-id="${r}:${c}"></button>`).join('')}</div>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('perm.title')}</b><small>${t('perm.sub')}</small></div></div><div class="ap">
      <div class="prow phead"><div class="pl"></div>${ranks.map((r) => `<span>${rankName(r)}</span>`).join('')}</div>${PERM_ROWS.map(row).join('')}
      <div class="prow fixed"><div class="pl"><b>${t('perm.team')}</b><small>${t('perm.teamSub')}</small></div><span class="ownonly">${t('rank.owner')}</span></div>
      <p class="muted small" style="margin:12px 2px 24px">${t('perm.note')}</p></div>`, null, true);
  }
  const savePerms = (P) => { team.perms = P; try { localStorage.setItem('buy-sell-team', JSON.stringify({ uid: cloud.uid, rank: team.rank, perms: P })); } catch (e) { /* ignore */ } return Cloud.setPerms(P); };
  let teamPick = '', xferTo = '';
  function sheetPerson(uid) {
    const nm = (team.names && team.names[uid]) || t('team.unnamed'), cur = team.members[uid]; teamPick = uid;
    openSmall(`<h3>${esc(nm)}</h3><p class="muted small">${t('team.rankNote')}</p><div class="list" style="margin-top:10px">${['seller', 'supervisor', 'manager'].map((k) => `<button class="row tap" data-act="team-setrank" data-id="${k}"><div class="grow"><b>${rankName(k)}</b></div><span style="font-weight:900;color:var(--brand)">${cur === k ? '✓' : ''}</span></button>`).join('')}</div>
      <div class="btns"><button class="btn rs" data-act="team-remove">${t('team.remove')}</button><button class="btn" data-act="close">${t('btn.close')}</button></div>`, 'card');
  }
  // handing the business to someone else: pick the person, then three pop-ups, the last one asks you to type TRANSFER
  function xferStart() {
    const others = Team.people(team.members, team.names).filter((p) => p.uid !== cloud.uid);
    if (!others.length) return toast(t('xfer.nobody'));
    openSmall(`<h3>${t('xfer.pick')}</h3><div class="list" style="margin-top:10px">${others.map((p) => `<button class="row tap" data-act="xfer-pick" data-id="${esc(p.uid)}"><div class="grow"><b>${esc(p.name || t('team.unnamed'))}</b></div><span class="pill rk-${p.rank}">${rankName(p.rank)}</span></button>`).join('')}</div><div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'card');
  }
  function xferSteps(uid) {
    xferTo = uid; const nm = (team.names && team.names[uid]) || t('team.unnamed');
    askCard(t('xfer.q1', { name: nm }), { title: t('xfer.t1'), ok: t('xfer.next'), no: t('btn.cancel') }).then((y1) => { if (!y1) return;
      askCard(t('xfer.q2', { name: nm }), { title: t('xfer.t2'), danger: true, ok: t('xfer.next'), no: t('btn.cancel') }).then((y2) => { if (!y2) return;
        openSmall(`<h3>${t('xfer.t3')}</h3><p>${esc(t('xfer.q3', { name: nm }))}</p><input id="xfer-in" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="TRANSFER" style="margin-top:6px">
          <div class="btns"><button class="btn dsolid" id="xfer-go" data-act="xfer-go" disabled>${t('xfer.go')}</button><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'card'); }); });
  }
  document.addEventListener('input', (e) => { if (e.target.id === 'ds-try') { const b = document.getElementById('ds-trybox'); if (b) b.innerHTML = dcTry(dset(), e.target.value); return; } if (e.target.id === 'sset-q') { filterSettings(e.target.value); return; } if (e.target.dataset && e.target.dataset.rg) { const g = (i) => parseAmt(($('#' + i) || {}).value), ex = $('#rg-ex'); if (ex) ex.textContent = rgExample(g('rg-base'), g('rg-free'), g('rg-perkm'), g('rg-cap')); return; } if (e.target.id === 'pl-q') { plQ = e.target.value; plSearch(); } else if (e.target.id === 'rp-q') { const q = e.target.value.trim().toLowerCase(); document.querySelectorAll('#rp-list .tkr').forEach((r) => { r.hidden = !!q && !(r.dataset.n || '').includes(q); }); } });
  document.addEventListener('input', (e) => { if (e.target.id === 'xfer-in') { const b = $('#xfer-go'); if (b) b.disabled = e.target.value.trim().toUpperCase() !== 'TRANSFER'; } });

  /* ---------- notifications (the bell) ---------- */
  // Built from what the app knows, each time: new store orders, things that need attention, and reminders. "New" = not yet seen on the
  // bell page (the page marks everything seen when it is closed); a new order stays new until it is dealt with.
  let notifCache = [];
  const DAY = 864e5;
  const seenNotifs = () => { const v = pref('notifSeen', {}); return v && typeof v === 'object' ? v : {}; };
  function notifList() {
    const out = [], now = Date.now(), c = storeCfg();
    const add = (n) => out.push(n);
    if (can('team')) joinReqs.forEach((r) => add({ key: 'join:' + r.uid, grp: 'attn', ic: '👥', always: true, title: t('notif.join', { name: esc(r.name || r.email || '') }), sub: t('notif.joinSub'), go: ['req-open', r.uid] }));
    if (window.Store) {
      Store.orders().filter((o) => o.status === 'confirmed').forEach((o) => { const lat = latestInvOf(o), cf = tsAt(o.confirmedAt); if (lat && o.invSentNo !== lat.no && cf && cf.getTime() > INV_FROM && Date.now() - cf.getTime() > 5 * 60000) add({ key: 'send:' + o.id + ':' + lat.no, grp: 'attn', ic: '📤', always: true, title: t('notif.sendInv', { name: esc(o.name) }), sub: t('notif.sendInvSub', { code: esc(o.code || SCore.orderCode(o.id)), no: lat.no }), go: ['order-open', o.id] }); });
      Store.orders().filter((o) => o.status === 'new' || (Store.ageMs(o) > 0 && Store.ageMs(o) < 7 * DAY && o.status !== 'declined' && ['new', 'confirmed'].includes(stageOf(o)))).forEach((o) => add({ key: 'order:' + o.id, grp: 'orders', ic: '🛍️', always: o.status === 'new', title: t('notif.order', { code: esc(o.code || SCore.orderCode(o.id)), name: esc(o.name) }), sub: tn('notif.items', (o.items || []).length) + ' · ' + (o.option === 'delivery' ? t('store.delivery') : t('store.pickup')) + ' · ' + money(o.total), when: Store.when(o) ? ago(Store.when(o)) : '', go: ['order-open', o.id] }));
    }
    state.batches.filter((b) => bStatus(b) !== 'Closed').forEach((b) => {
      const mine = state.items.filter((i) => i.batchId === b.id && !L.isSold(i));
      const noSize = mine.filter((i) => String(i.desc || '').trim() && !String(i.size || '').trim()).length;
      if (noSize) add({ key: 'size:' + b.id + ':' + noSize, grp: 'attn', ic: '📏', title: tn('notif.noSize', noSize), sub: t('notif.noSizeSub', { b: bl(b.id) }), go: ['stock', b.id, 'All'] });
      const chk = L.photoStats(state, b.id).needCheck;
      if (chk) add({ key: 'photos:' + b.id + ':' + chk, grp: 'attn', ic: '📷', title: tn('notif.photos', chk), sub: t('notif.photosSub', { b: bl(b.id) }), go: ['stock', b.id, 'NeedCheck'] });
      if (c.id && !c.batches.includes(b.id)) { const hid = mine.filter((i) => i.status === 'Available' && String(i.desc || '').trim() && Number(i.price) > 0).length; if (hid) add({ key: 'nis:' + b.id + ':' + hid, grp: 'attn', ic: '🏪', title: t('notif.notIn', { b: bl(b.id) }), sub: tn('notif.hidden', hid), go: ['stock', b.id, 'All'] }); }
      if (bStatus(b) === 'In Transit') { const days = Math.floor((now - new Date(b.datePurchased).getTime()) / DAY); if (days >= 30) add({ key: 'transit:' + b.id, grp: 'remind', ic: '📦', title: t('notif.transit', { b: bl(b.id), n: days }), sub: t('notif.transitSub'), go: ['batch', b.id] }); }
    });
    if (peopleOn && PE.missingNumber(state).length) add({ key: 'phones:' + PE.missingNumber(state).length, grp: 'attn', ic: '📞', title: t('hm.phoneTitle'), sub: t('hm.phoneSub'), go: ['phones-open', ''] });
    if (c.id && window.Store && Store.needsPublish && Store.needsPublish()) add({ key: 'needpub', grp: 'attn', ic: '📤', always: true, title: t('hm.pubTitle'), sub: t('hm.pubSub'), go: ['goto-publish', ''] });
    if (c.id && window.Store) { if (Store.info().error) add({ key: 'storeerr', grp: 'attn', ic: '⚠️', title: t('notif.storeErr'), sub: t('notif.storeErrSub'), go: ['store-open', ''] }); if (!c.open) add({ key: 'storeclosed', grp: 'attn', ic: '🔒', title: t('notif.storeClosed'), sub: t('notif.storeClosedSub'), go: ['store-open', ''] }); }
    // Only invoices that are still current count: an older invoice that was replaced by an updated one (or returned) is cleared by it.
    const owes = new Map(); state.invoices.forEach((v) => { if (v.updatedBy || v.void || !(Number(v.balance) > 0.004)) return; let root = v, g = 0; while (root.ref && g++ < 50) { const prev = state.invoices.find((x) => x.no === root.ref); if (!prev) break; root = prev; }
      const o = owes.get(v.client) || { amt: 0, since: Infinity }; o.amt += Number(v.balance); o.since = Math.min(o.since, new Date(root.date).getTime() || Infinity); owes.set(v.client, o); });
    owes.forEach((o, name) => { if (o.since !== Infinity && now - o.since >= 7 * DAY) add({ key: 'owes:' + name, grp: 'remind', ic: '💳', title: t('notif.owes', { name: esc(clabel(name)), amt: money(o.amt) }), sub: t('notif.owesSub', { date: new Date(o.since).toLocaleDateString(I.locale(I.getLang()), { day: 'numeric', month: 'short' }) }), go: ['customer', name] }); });
    if (now > Date.UTC(2027, 0, 15) && now < Date.UTC(2027, 1, 10)) add({ key: 'billing', grp: 'remind', ic: '☁️', title: t('notif.billing'), sub: t('notif.billingSub'), go: ['', ''] });
    return out;
  }
  const notifUnread = (n, seen) => n.always || !seen[n.key];
  const INV_FROM = window.__invFrom || 1794158226039;   // invoice reminders only for orders confirmed after the update that introduced them
  // the bell's tabs
  const NOTIF_TABS = [['orders', 'notif.tOrders'], ['invoices', 'notif.tInvoices'], ['team', 'notif.tTeam'], ['stock', 'notif.tStock'], ['store', 'notif.tStore'], ['other', 'notif.tOther']];
  const notifCat = (n) => { const k = String(n.key || ''); return k.startsWith('order:') ? 'orders' : /^(send|owes):/.test(k) ? 'invoices' : k.startsWith('join:') ? 'team' : /^(size|photos|nis|transit):/.test(k) ? 'stock' : /^store/.test(k) ? 'store' : 'other'; };
  let notifTab = 'all';
  const notifCount = () => { try { const seen = seenNotifs(); return notifList().filter((n) => notifUnread(n, seen)).length; } catch (e) { return 0; } };
  function notifMarkSeen() { const seen = {}; notifList().forEach((n) => { seen[n.key] = 1; }); setPref('notifSeen', seen); }
  function sheetNotifs() {
    enterPage('notif', '', () => sheetNotifs());
    fetchRequests();
    const list = notifList(), seen = seenNotifs(), unread = list.filter((n) => notifUnread(n, seen)).length; notifCache = list;
    const row = (n) => `<button class="it2 ${notifUnread(n, seen) ? 'new' : ''}" data-act="notif-go" data-id="${list.indexOf(n)}">${notifUnread(n, seen) ? '<i class="dotn"></i>' : ''}<span class="ic2">${n.ic}</span><span class="tx2"><b>${n.title}</b><small>${n.sub}</small></span><span class="ago">${esc(n.when || '')}</span></button>`;
    const grp = (k, label) => { const g = list.filter((n) => n.grp === k); return g.length ? `<h4><span>${t(label)}</span></h4><div class="card">${g.map(row).join('')}</div>` : ''; };
    const cats = NOTIF_TABS.filter(([c]) => list.some((n) => notifCat(n) === c)); if (notifTab !== 'all' && !cats.some(([c]) => c === notifTab)) notifTab = 'all';
    const nb = (c) => { const k = list.filter((n) => (c === 'all' || notifCat(n) === c) && notifUnread(n, seen)).length; return k ? `<span class="nb">${k}</span>` : ''; };
    const tabs = cats.length > 1 ? `<div class="bt" role="tablist"><button class="${notifTab === 'all' ? 'on' : ''}" role="tab" data-act="notif-tab" data-id="all">${t('notif.tAll')}${nb('all')}</button>${cats.map(([c, l]) => `<button class="${notifTab === c ? 'on' : ''}" role="tab" data-act="notif-tab" data-id="${c}">${t(l)}${nb(c)}</button>`).join('')}</div>` : '';
    const body = notifTab === 'all' ? `${grp('attn', 'notif.gAttn')}${grp('orders', 'notif.gOrders')}${grp('remind', 'notif.gRemind')}` : `<div class="card">${list.filter((n) => notifCat(n) === notifTab).map(row).join('')}</div>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('notif.title')}</b><small>${unread ? tn('notif.newN', unread) : t('notif.none')}</small></div></div>
      <div class="bn">${tabs}${unread ? `<button class="chip on" data-act="notif-read" style="margin:6px 0 0">${t('notif.readAll')}</button>` : ''}${body}${list.length ? '' : `<div class="empty"><b>${t('notif.none')}</b>${t('notif.noneText')}</div>`}</div>`, () => { notifMarkSeen(); render(); }, true);
  }
  // Tapping a line closes the page and goes to the thing it is about (the same screens the rest of the app opens).
  function notifGo(i) {
    const n = notifCache[i]; if (!n || !n.go[0]) return;
    const [act, arg, f] = n.go; closeSheet();
    if (act === 'stock') { stockBatch = arg; stockFilter = f || 'All'; go({ tab: 'stock', moreView: null }); window.scrollTo(0, 0); return render(); }
    const b = document.createElement('button'); b.dataset.act = act; b.dataset.id = arg; document.body.appendChild(b); b.click(); b.remove();
  }
  /* ---------- deliveries: every confirmed delivery order with its pin, and one route for all of them ---------- */
  const toDeliver = () => Store.orders().filter((o) => o.status === 'confirmed' && o.option === 'delivery').slice().sort((a, b) => (Store.when(a) || 0) - (Store.when(b) || 0));
  const orderPin = (o) => (o && o.option === 'delivery' ? SCore.geo(o.lat, o.lng) : null);
  const orderOfInvoice = (no) => Store.orders().find((o) => o.invoice && L.invoiceForward(state, o.invoice).some((x) => x.no === no));
  const orderOfItem = (id) => Store.orders().filter((o) => o.status !== 'declined' && (o.items || []).some((i) => i.id === id)).sort((a, b) => (Store.when(b) || 0) - (Store.when(a) || 0))[0];
  const pinRow = (o) => { const gp = orderPin(o); return gp ? `<div class="dspot-c"><span class="dp" aria-hidden="true">📍</span><span class="dt">${esc(o.spot || t('spot.h'))}</span><a class="navbtn" data-act="pin-open" href="${navHref(gp, o.spot)}" target="_blank" rel="noopener" aria-label="${t('km.navigate')}" title="${t('km.navigate')}">${NAV_ICON}</a></div>` : ''; };   // one slim row: the pin, the place, and the Google Maps and Waze icons
  const ICON_GMAPS = '<img src="icons/gmaps.png" alt="" width="40" height="40">', ICON_WAZE = '<img src="icons/waze.png" alt="" width="40" height="40">';   // the Google Maps and Waze app icons (copied from the seller's own phone)
  const spotBtns = (gp) => { const ml = SCore.mapLinks(gp.lat, gp.lng); return `<a class="ic" data-act="pin-open" href="${ml.google}" target="_blank" rel="noopener" aria-label="Google Maps" title="Google Maps">${ICON_GMAPS}</a><a class="ic" data-act="pin-open" href="${ml.waze}" target="_blank" rel="noopener" aria-label="Waze" title="Waze">${ICON_WAZE}</a>`; };   // each icon with its name under it is one tap target
  // Delivered / Collected: asks first (a tap by mistake must not move the order on) and says where the order will go
  function markHanded(id) {
    const po = Store.orders().find((x) => x.id === id); if (!po) return;
    const dl = po.option === 'delivery', ow = (L.orderPay(state, orderInvoice(po)) || {}).owing || 0, how = dl ? t('ord.delivered') : t('ord.collected');
    return askCard(t(dl ? 'ord.askDelivered' : 'ord.askCollected') + ' ' + (ow > 0 ? t('ord.askOwing', { amount: plain(money(ow)) }) : t('ord.askPaid')), { title: t(dl ? 'ord.askTitleDel' : 'ord.askTitleCol'), ok: t(dl ? 'ord.yesDelivered' : 'ord.yesCollected'), no: t('ord.no') }).then((y) => {
      if (y) Store.setStatus(id, 'done', tripsOf(po).length ? { trips: tripsOf(po).concat({ at: Date.now(), ids: toHand(po).map((i) => i.id) }) } : undefined).then(() => { ordDirty = true; toast(ow > 0 ? t('ord.toastHanded', { how, amount: plain(money(ow)) }) : t('ord.toastDone', { how })); const here = pageStack.length && pageStack[pageStack.length - 1].key === 'order|' + id; if (here) setTimeout(() => { sheetOrder(id, true); if (ow <= 0 && pageStack.length > 1) pageStack = pageStack.slice(-1); }, 450); else dropPages('order|' + id); }).catch(() => toast(t('store.pubError'))); });
  }
  // From a "Waiting for items to arrive" box: open the batch the late item is in, scrolled to the Mark received button
  function openBatchToReceive(bid) {
    sheetBatch(bid);
    setTimeout(() => { const b = $('#bpg-recv'); if (!b) return; b.scrollIntoView({ behavior: 'auto', block: 'center' }); b.classList.add('pulse'); setTimeout(() => b.classList.remove('pulse'), 2600); }, 380);
  }
  function waitOpen(id) {
    const o = Store.orders().find((x) => x.id === id); if (!o) return;
    const by = new Map(); toHand(o).filter(itemArriving).forEach((i) => { const it = state.items.find((x) => x.id === i.id); if (it && it.batchId) by.set(it.batchId, (by.get(it.batchId) || 0) + 1); });
    if (by.size === 1) return openBatchToReceive([...by.keys()][0]);
    if (by.size > 1) openSmall(`<h3>${t('wo.title')}</h3><p class="muted small" style="margin:0 0 6px">${t('wo.sub')}</p>${[...by].map(([bid, n]) => `<button type="button" class="row tap" data-act="wait-batch" data-id="${esc(bid)}"><div class="grow"><b>${esc((state.batches.find((x) => x.id === bid) || {}).id || bid)}</b><small>${tn('notif.items', n)}</small></div><span class="rgo">›</span></button>`).join('')}<div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet');
  }
  /* ---------- part deliveries: choose what goes out now; items still on their way cannot be picked ---------- */
  let dvOrd = '', dvSel = null;
  function sheetDeliver(id, keep) {
    const o = Store.orders().find((x) => x.id === id); if (!o) return;
    const del = o.option === 'delivery', left = toHand(o), ready = left.filter((i) => !itemArriving(i));
    if (!keep || dvOrd !== id || !dvSel) { dvOrd = id; dvSel = new Set(ready.map((i) => i.id)); }
    const row = (i) => { const wait = itemArriving(i), it = state.items.find((x) => x.id === i.id), on = !wait && dvSel.has(i.id);
      return `<div class="dvr${wait ? ' wait' : ''}"${wait ? '' : ` role="button" tabindex="0" data-act="dv-toggle" data-id="${esc(i.id)}"`}><span class="dvc${on ? ' on' : ''}">${wait ? '–' : on ? '✓' : ''}</span><span class="othumb">${it ? PUI.thumb(it) : '<span class="ph"></span>'}</span><div class="t"><b>${esc(it ? dn(it) : i.name)}${i.size ? ' · ' + esc(szLabel(i.size)) : ''}</b><small>${esc(i.id)}</small></div>${wait ? opl('arr', '⏳ ' + t('ord.pl.arr')) : `<b>${money(i.price)}</b>`}</div>`; };
    const n = dvSel.size;
    openSmall(`<div class="dvp"><h3>${t(del ? 'pdl.title' : 'pdl.titleCol')}</h3><small class="muted">${esc(o.code || SCore.orderCode(o.id))} · ${esc(o.name)}</small>
      <div class="dvall"><button type="button" class="alink" data-act="dv-all">${t('pdl.all')}</button></div>${left.map(row).join('')}
      <p class="muted small" style="margin:10px 2px 12px">${t('pdl.foot')}</p>
      <div class="btns"><button class="btn primary" data-act="dv-go" data-id="${id}"${n ? '' : ' disabled'}>✅ ${del ? tn('pdl.btn', n || 0) : tn('pdl.btnCol', n || 0)} ›</button><button class="btn" data-act="close">${t('btn.cancel')}</button></div></div>`, 'sheet');
  }
  // What the customer is told after a handover: what went out today, what is still to come, and what is still owed
  function waHandover(o, ids) {
    const lang = o.lang === 'es' || o.lang === 'en' ? o.lang : (knownLang('', o.name) || undefined), plain = (n) => 'TT$ ' + (Number(n) || 0).toFixed(2), del = o.option === 'delivery';
    const nm = (i) => (lang === 'es' && state.items.find((x) => x.id === i.id) ? esName(state.items.find((x) => x.id === i.id)) : i.name) + (i.size ? ' (' + i.size + ')' : '');
    const out = (o.items || []).filter((i) => ids.includes(i.id)), rest = (o.items || []).filter((i) => !handedAt(o, i.id) && !ids.includes(i.id));
    const ow = (L.orderPay(state, orderInvoice(o)) || {}).owing || 0;
    const msg = [(storeCfg().name || bizName()) + ' · ' + (o.code || SCore.orderCode(o.id)), t(del ? 'wa.h.headDel' : 'wa.h.headPick', { name: o.name }, lang), '',
      t(del ? 'wa.h.doneDel' : 'wa.h.donePick', { date: dayMon(new Date()) }, lang), out.map((i) => '• ' + nm(i)).join('\n')]
      .concat(rest.length ? ['', t('wa.h.rest', {}, lang), rest.map((i) => '• ' + nm(i) + (itemArriving(i) ? ' – ' + t('wa.h.arr', {}, lang) : '')).join('\n')] : [])
      .concat(ow > 0 ? ['', t(rest.length ? 'wa.h.balRest' : 'wa.h.bal', { amount: plain(ow) }, lang)] : []).concat(['', t('wa.h.thanks', {}, lang)]).join('\n');
    const w = window.open(SCore.waLink(o.phone, msg), '_blank'); if (!w) toast(t('ord.waBlocked'));
  }
  function deliverNow(id) {
    const o = Store.orders().find((x) => x.id === id); if (!o || !dvSel || !dvSel.size) return;
    const ids = [...dvSel], left = toHand(o), all = ids.length === left.length, trips = tripsOf(o).concat({ at: Date.now(), ids });
    closeSheet();
    const job = all ? Store.setStatus(id, 'done', { trips }) : Store.patch(id, { trips });
    job.then(() => { ordDirty = true; dvSel = null; toast(t('pdl.toast', { n: handedN(Object.assign({}, o, { trips })), m: (o.items || []).length }));
      const here = pageStack.length && pageStack[pageStack.length - 1].key === 'order|' + id; if (here) setTimeout(() => sheetOrder(id, true), 450);
      askCard(t('pdl.askMsg', { name: o.name }), { title: t('pdl.askTitle'), ok: t('pdl.send'), no: t('pdl.later') }).then((y) => { if (y) waHandover(o, ids); });
    }).catch(() => toast(t('store.pubError')));
  }
  /* ---------- delivery log: every delivery and pickup, by day, with the distance driven ---------- */
  let dlvTab = 'deliveries', dlvView = 'list', dlvQ = '', dlvDay = '', dlvMonth = (() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })(), dlvLink = false;
  function dset() { return Object.assign({ home: null, base: 0, perKm: 0, freeKm: 0, round: 5, costKm: 0, showRate: true, charge: false, count: 'one', mode: 'up' }, state.settings.delivery || {}); }
  // Distance pricing: the seller's rate (settings.delivery) decides what a place charges when it is priced by distance.
  const distRateOwner = () => Object.assign({}, dset(), { charge: !!dset().charge });
  const placeFee = (c, l) => { const dp = SCore.distPlace(c, l, distRateOwner(), dset().home, roadCache()); return dp && dp.fee != null ? dp.fee : SCore.priceOf(c, l); };
  const needsP = (c, l) => SCore.needsPrice(c, l) && !(SCore.usesDistance(l, distRateOwner()) && SCore.distPlace(c, l, distRateOwner(), dset().home, roadCache()));
  const saveDset = (patch) => { state.settings.delivery = Object.assign(dset(), patch); save(); };
  const dlvWhen = (o) => (o.status === 'done' ? (tsAt(o.doneAt) || Store.when(o)) : null);
  const dlvDayLabel = (d) => d.toLocaleDateString(I.locale(I.getLang()), { weekday: 'short' }).replace('.', '') + ' ' + dayMon(d);
  const dlvTime = (d) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const kmText = (o) => { const km = Number(o.km); return Number.isFinite(km) && o.km != null ? km.toFixed(1) + ' km' + (o.kmSrc === 'line' ? ' ~' : '') : (SCore.geo(o.lat, o.lng) && dset().home ? '…' : '—'); };
  const kmNum = (o) => (o.km != null && Number.isFinite(Number(o.km)) ? Number(o.km) : null);
  const planLabel = (k) => { if (!k) return ''; const today = SCore.dayKey(new Date()), tom = SCore.dayKey(new Date(Date.now() + 864e5)); return k === today ? t('dlv.today') : k === tom ? t('dlv.tomorrow') : dlvDayLabel(new Date(k + 'T12:00:00')); };
  function dlvRow(o) {
    const isDel = o.option === 'delivery', gp = isDel ? SCore.geo(o.lat, o.lng) : null, km = kmNum(o), d = dset(), w = dlvWhen(o), pending = o.status === 'confirmed';
    const rate = isDel && km != null && d.showRate ? SCore.rateFee(d, km) : null, cost = isDel && km != null ? SCore.tripCost(km, d.costKm) : null, fee = Number(o.deliveryPrice) || 0, prof = cost != null ? Math.round((fee - cost) * 100) / 100 : null;
    const area = [esc(o.location || ''), o.spot ? esc(o.spot) : ''].filter(Boolean).join(' · ') || esc(t(isDel ? 'store.delivery' : 'store.pickup'));
    const owe = pending ? ((L.orderPay(state, orderInvoice(o)) || {}).owing || 0) : 0, plan = pending && o.planDay ? `<span class="dpl p">📅 ${esc(planLabel(o.planDay))}</span>` : '';
    const fin = [fee > 0 && isDel ? t('dlv.feeIs', { amount: plain(money(fee)) }) : ''].concat(rate != null ? [t('dlv.yourRate', { amount: plain(money(rate)) })] : []).filter(Boolean).join(' · ') + (prof != null ? ` <span class="${prof < 0 ? 'loss' : 'gain'} costonly">· ${t(prof < 0 ? 'dlv.loss' : 'dlv.profit', { amount: plain(money(Math.abs(prof))) })}</span>` : '');
    const r1 = o.status === 'done' ? `<span class="dpl d">${t(isDel ? 'ord.delivered' : 'ord.collected')}${w ? ' ' + dlvTime(w) : ''}</span>` : isDel ? `<b>${esc(kmText(o))}</b>` : `<b>${tn('notif.items', (o.items || []).length)}</b>`;
    const r2 = isDel ? (km != null ? `<small>${t('dlv.rt', { km: (km * 2).toFixed(1) })}</small>` : '') : `<small>${money(o.total)}</small>`;
    const addr = [o.spot, o.location].map((x) => String(x || '').trim()).filter(Boolean).join(', '), navTo = gp ? navHref(gp, o.spot) : addr ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addr) : '';   // a map pin when there is one, otherwise the place they typed
    const navb = isDel && navTo ? `<a class="navbtn dnavb" data-act="pin-open" href="${navTo}" target="_blank" rel="noopener" aria-label="${t('km.navigate')}" title="${t('km.navigate')}">${NAV_ICON}</a>` : '';   // the compass sits at the right end of the button row
    const chips = pending ? `<div class="dchips">${isDel ? `<button class="dchip" data-act="dlv-way" data-id="${o.id}">📲 ${t('dlv.onWay')}</button><button class="dchip" data-act="dlv-plan" data-id="${o.id}">📅 ${t(o.planDay ? 'dlv.change' : 'dlv.plan')}</button>` : ''}<button class="dchip go" data-act="dlv-done" data-id="${o.id}" aria-label="${t(isDel ? 'ord.delivered' : 'ord.collected')}">✅ ${t('dlv.markDone')}</button>${navb}</div>` : (isDel ? `<div class="dchips"><button class="dchip" data-act="dlv-thanks" data-id="${o.id}">💬 ${t('dlv.thanks')}</button>${navb}</div>` : '');
    const foot = (fin && isDel) || owe > 0 ? `<div class="dfin"><span>${fin}</span>${owe > 0 ? `<b class="col">${t('dlv.collectAmt', { amount: plain(money(owe)) })}</b>` : ''}</div>` : '';
    return `<div class="dcard2 c"><button class="dr" data-act="order-open" data-id="${o.id}"><div class="m"><b>${o.status === 'done' ? '✅ ' : ''}${esc(o.name)} · ${esc(o.code || SCore.orderCode(o.id))}${gp ? ' <span class="pinm">📍</span>' : ''}</b><small>${area}${plan}</small></div><div class="e">${r1}${r2}</div></button>
      ${o.note ? `<div class="dnote">📝 ${esc(o.note)}</div>` : ''}${chips}${foot}</div>`;
  }
  function DeliveryLog() {
    const all = Store.orders().filter((o) => o.status === 'confirmed' || o.status === 'done'), isDel = (o) => o.option === 'delivery', mine = (o) => (dlvTab === 'done' ? true : dlvTab === 'deliveries' ? isDel(o) : !isDel(o)), d = dset();
    const pend = all.filter((o) => o.status === 'confirmed'), pd = pend.filter(isDel), pp = pend.filter((o) => !isDel(o)), nItems = (a) => a.reduce((n, o) => n + (o.items || []).length, 0);
    const hit = (o) => SCore.deliveryMatch(o, dlvQ, dlvWhen(o) || Store.when(o)), today = SCore.dayKey(new Date());
    const pending = (dlvTab === 'done' ? [] : pend.filter(mine).filter(hit)).sort((a, b) => (a.planDay || '9') < (b.planDay || '9') ? -1 : (a.planDay || '9') > (b.planDay || '9') ? 1 : ordKey(a) - ordKey(b)), doneEntries = all.flatMap((o) => (tripsOf(o).length ? tripsOf(o).map((tr, n) => Object.assign({}, o, { status: 'done', doneAt: { toMillis: () => tr.at }, items: (o.items || []).filter((i) => (tr.ids || []).includes(i.id)), deliveryPrice: n === 0 ? o.deliveryPrice : 0, total: (o.items || []).filter((i) => (tr.ids || []).includes(i.id)).reduce((m, i) => m + (Number(i.price) || 0), 0) })) : o.status === 'done' ? [o] : [])), done = doneEntries.filter((o) => mine(o)).filter(hit);   // every trip is its own entry: its own day, items and distance driven
    const byDay = new Map(); done.forEach((o) => { const k = SCore.dayKey(dlvWhen(o) || new Date()); byDay.set(k, (byDay.get(k) || []).concat(o)); });
    const planned = new Map(); pending.filter((o) => o.planDay && isDel(o)).forEach((o) => planned.set(o.planDay, (planned.get(o.planDay) || 0) + 1));
    const driven = (a) => a.reduce((n, o) => n + (Number(o.km) > 0 ? 2 * Number(o.km) : 0), 0);
    const dayHead = (k, a) => { const dn = a.filter(isDel), cn = a.length - dn.length, km = driven(dn), dd = new Date(k + 'T12:00:00'); return `<div class="dday"><span>${dlvDayLabel(dd)}</span><span>${[dn.length ? t('dlv.nDeliveredN', { n: dn.length }) : '', cn ? t('dlv.nCollectedN', { n: cn }) : '', km > 0 ? t('dlv.driven', { km: km.toFixed(1) }) : ''].filter(Boolean).join(' · ')}</span></div>`; };
    // today's run: the stops planned for today (or every pending delivery with a pin when nothing is planned), nearest first from the store, in one Google Maps route
    const runSet = (pd.filter((o) => o.planDay === today).length ? pd.filter((o) => o.planDay === today) : pd).filter((o) => SCore.geo(o.lat, o.lng)), run = SCore.nearestFirst(d.home, runSet.map((o) => ({ lat: o.lat, lng: o.lng, id: o.id }))), runLink = SCore.routeLink(run);
    const runBtn = dlvTab === 'deliveries' && run.length >= 1 ? `<a class="dvroute slim" href="${runLink}" target="_blank" rel="noopener" data-act="pin-open" title="${esc(t(pd.filter((o) => o.planDay === today).length ? 'dlv.runToday' : 'dlv.runAll'))}">🧭 ${t('dlv.run', { n: Math.min(10, run.length) })}</a>` : '';
    const head = `<div class="oqbar"><span aria-hidden="true">🔍</span><input class="dq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('dlv.search'))}" value="${esc(dlvQ)}" aria-label="${esc(t('dlv.search'))}"><button class="oqx" data-act="dlv-q-clear" ${dlvQ ? '' : 'hidden'}>✕</button></div>
      <div class="seg dseg dthree"><button class="${dlvTab === 'deliveries' ? 'on' : ''}" data-act="dlv-tab" data-id="deliveries">${t('dlv.t.deliver')} ${pd.length}</button><button class="${dlvTab === 'pickups' ? 'on' : ''}" data-act="dlv-tab" data-id="pickups">${t('dlv.t.collect')} ${pp.length}</button><button class="${dlvTab === 'done' ? 'on' : ''}" data-act="dlv-tab" data-id="done" aria-label="${esc(t('dlv.t.done'))} ${doneEntries.length}"><span class="tk" aria-hidden="true">✓</span> ${t('dlv.t.done')} ${doneEntries.length}</button></div>
      <div class="dvw"><button class="${dlvView === 'list' ? 'on' : ''}" data-act="dlv-view" data-id="list">📋 ${t('dlv.list')}</button><button class="${dlvView === 'cal' ? 'on' : ''}" data-act="dlv-view" data-id="cal">📅 ${t('dlv.cal')}</button></div>`;
    const section = (title, list) => (list.length ? `<div class="dday"><span>${title}</span><span>${list.length}</span></div>${list.map(dlvRow).join('')}` : '');
    const pendingBlocks = () => {
      if (!pending.length) return '';
      if (dlvTab !== 'deliveries') return section(t('dlv.pending'), pending);
      const over = pending.filter((o) => o.planDay && o.planDay < today), td = pending.filter((o) => o.planDay === today), later = pending.filter((o) => o.planDay && o.planDay > today), none = pending.filter((o) => !o.planDay);
      const laterDays = [...new Set(later.map((o) => o.planDay))].sort();
      return section(t('dlv.overdue'), over) + section(t('dlv.todayH'), td) + laterDays.map((k) => section(dlvDayLabel(new Date(k + 'T12:00:00')), later.filter((o) => o.planDay === k))).join('') + section(t('dlv.unplanned'), none);
    };
    let body = '';
    if (dlvView === 'cal') {
      const { y, m } = dlvMonth, loc = I.locale(I.getLang()), cells = SCore.monthGrid(y, m);
      const wd = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(loc, { weekday: 'short' }).replace('.', '').slice(0, 3));
      const inMonth = done.filter((o) => { const dd = dlvWhen(o) || new Date(); return dd.getFullYear() === y && dd.getMonth() === m; }), kmM = driven(inMonth), feeM = inMonth.reduce((n, o) => n + (Number(o.deliveryPrice) || 0), 0), costM = inMonth.reduce((n, o) => n + (SCore.tripCost(o.km, d.costKm) || 0), 0);
      const sel = dlvDay && (byDay.get(dlvDay) || planned.get(dlvDay)) ? [dlvDay] : [...byDay.keys()].filter((k) => k.startsWith(y + '-' + String(m + 1).padStart(2, '0'))).sort().reverse();
      body = `<div class="cal"><div class="mh"><button data-act="dlv-prev" aria-label="‹">‹</button><b>${esc(new Date(y, m, 1).toLocaleDateString(loc, { month: 'long', year: 'numeric' }))}</b><button data-act="dlv-next" aria-label="›">›</button></div><div class="wd">${wd.map((w) => `<span>${esc(w)}</span>`).join('')}</div>
        <div class="gr calgrid">${cells.map((c) => { const n = (byDay.get(c.key) || []).length, pl = planned.get(c.key) || 0; return `<span class="${c.inMonth ? '' : 'o'} ${n ? 'h' : ''} ${pl ? 'pl' : ''} ${c.key === dlvDay ? 'sel' : ''} ${c.key === today ? 'td' : ''}" data-act="dlv-day" data-id="${c.key}">${c.day}${n || pl ? `<em>${n ? n : ''}${pl ? '<u>' + pl + '</u>' : ''}</em>` : ''}</span>`; }).join('')}</div></div>
        <p class="dhint">${t('dlv.swipe')}<br>${t('dlv.legend')}</p>
        <div class="dsum"><div><small>${t('dlv.month')}</small><b>${inMonth.length}</b></div>${dlvTab !== 'pickups' ? `<div><small>${t('dlv.dist')}</small><b>${kmM.toFixed(1)} km</b></div><div><small>${t('dlv.fees')}</small><b>${money(feeM)}</b></div>${d.costKm > 0 ? `<div><small>${t('dlv.profitWord')}</small><b class="${feeM - costM < 0 ? 'loss' : 'gain'}">${money(feeM - costM)}</b></div>` : ''}` : ''}</div>
        ${dlvDay && planned.get(dlvDay) ? section(planLabel(dlvDay), pending.filter((o) => o.planDay === dlvDay)) : ''}${sel.filter((k) => byDay.get(k)).map((k) => dayHead(k, byDay.get(k)) + byDay.get(k).map(dlvRow).join('')).join('') || (dlvDay && planned.get(dlvDay) ? '' : `<div class="none">${t('dlv.none')}</div>`)}`;
    } else {
      const days = [...byDay.keys()].sort().reverse();
      body = pendingBlocks() + (dlvTab === 'done' ? days.map((k) => dayHead(k, byDay.get(k)) + byDay.get(k).map(dlvRow).join('')).join('') : '');   // what is already handed over lives in the Done tab, never in To deliver / To collect
      if (!body) body = `<div class="opanel"><div class="oempty"><span class="em">${dlvQ.trim() ? '🔍' : dlvTab === 'deliveries' ? '🚚' : dlvTab === 'pickups' ? '🛍️' : '✅'}</span><span>${dlvQ.trim() ? t('dlv.noMatch', { q: esc(dlvQ.trim()) }) : t('dlv.empty.' + dlvTab)}</span>${dlvQ.trim() ? '' : `<small>${t('dlv.emptyHint.' + dlvTab)}</small>`}</div></div>`;
    }
    return `<div class="dlv">${head}${dlvView === 'list' ? runBtn : ''}<div id="dlvbody">${body}</div></div>`;
  }
  const dlvRefresh = () => { if (tab === 'more' && moreView === 'deliveries') { const x = $('#dlvbody'); if (x) { const tmp = document.createElement('div'); tmp.innerHTML = DeliveryLog(); const nb = tmp.querySelector('#dlvbody'); if (nb) x.innerHTML = nb.innerHTML; const q = document.querySelector('.oqx[data-act=dlv-q-clear]'); if (q) q.hidden = !dlvQ; } } };
  const dlvMapT = () => ({ mapHint: t('mp.hint'), mapSearch: t('mp.search'), spotHere: t('mp.here'), close: t('btn.close'), mapOk: t('mp.ok'), mapNear: (x) => t('mp.near', { x }), mapCancel: t('btn.cancel'), spotBlocked: t('mp.blocked'), mapNone: t('mp.none'), mapNoLib: t('mp.nolib') });
  function dlvSetHome(g) { saveDset({ home: { lat: g.lat, lng: g.lng, name: g.name || '' } }); toast(t('ds.homeSet')); if (g.name == null || g.name === '') MapPick.nameOf(g.lat, g.lng, I.getLang()).then((n) => { if (n) { const h = dset().home; if (h && h.lat === g.lat) { saveDset({ home: Object.assign({}, h, { name: n }) }); if (!$('#sheet').hidden && pageStack.length && pageStack[pageStack.length - 1].key === 'dsettings') sheetDeliverySettings(); } } }); Store.measure(dset().home, true).then((n) => { if (n) toast(t('ds.measured', { n })); }); if (!$('#sheet').hidden && pageStack.length && pageStack[pageStack.length - 1].key === 'dsettings') sheetDeliverySettings(); }
  // "Try a distance": one way, there and back, the fee and the rounding examples
  const dcTry = (d, km) => { const r = Object.assign({}, d, { count: d.count }), x = SCore.distanceFee(r, parseAmt(km)); return x.fee == null ? `<p class="muted small" style="margin:6px 0 0">${t('ds.noRate')}</p>` : `<div class="ln"><span>${t('dc.tryBoth')}</span><b>${x.both} km</b></div><div class="ln"><span>${t('dc.tryCount')}</span><b>${x.counted} km</b></div><div class="ln"><span>${t('dc.tryFee')}</span><b class="big" style="color:var(--brand)">${money(x.fee)}</b></div>`; };
  function sheetDeliverySettings() {
    enterPage('dsettings', '', () => sheetDeliverySettings());
    const dpins = toDeliver().map((o) => SCore.geo(o.lat, o.lng)).filter(Boolean);
    const d = dset(), st = SCore.deliveryStats(Store.orders().filter((o) => o.status === 'done'), d.costKm), h = d.home, ex = st.avgKm || 7.4, exFee = SCore.rateFee(d, ex);
    const inp = (k, v, label) => `<div class="ln"><span>${label}</span><input class="dinp" data-dset="${k}" type="text" inputmode="decimal" autocomplete="off" value="${v ? v : ''}" placeholder="0"></div>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${t('dlv.settings')}</b></div></div><div class="ap dsp">
      <div class="dcard"><h5>${t('ds.store')}</h5>${h ? `<div class="pinrow"><span class="big">🏠</span><div class="t"><b>${esc(h.name || t('ds.pinSet'))}</b><small>${h.lat}, ${h.lng}</small></div></div>` : `<p class="muted small" style="margin:0 0 8px">${t('ds.notSet')}</p>`}
        <div class="dbtns"><button class="btn" data-act="ds-here">📍 ${t('ds.here')}</button><button class="btn" data-act="ds-map">🗺️ ${t('ds.map')}</button></div>
        ${dlvLink ? `<div class="linkrow"><input id="ds-link" placeholder="${esc(t('ds.linkPh'))}" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn primary" data-act="ds-linkgo">${t('ds.linkGo')}</button></div>` : `<a class="dlk" data-act="ds-linkopen">${t('ds.link')}</a>`}</div>
      <div class="dcard"><h5>${t('dc.title')}</h5><div class="rw"><div class="t"><b>${t('dc.on')}</b><small>${t('dc.onSub')}</small></div>${swt('ds-charge', 'charge', d.charge)}</div>
        <label style="margin-top:8px">${t('dc.count')}</label><div class="chips" style="margin:0"><button type="button" class="chip ${d.count === 'both' ? 'on' : ''}" data-act="ds-count" data-id="both">${t('dc.both')}</button><button type="button" class="chip ${d.count === 'both' ? '' : 'on'}" data-act="ds-count" data-id="one">${t('dc.oneWay')}</button></div>
        <label>${t('dc.mode')}</label><div class="chips" style="margin:0"><button type="button" class="chip ${d.mode === 'up' ? 'on' : ''}" data-act="ds-mode" data-id="up">${t('dc.up', { s: d.round || 5 })}</button><button type="button" class="chip ${d.mode === 'near' ? 'on' : ''}" data-act="ds-mode" data-id="near">${t('dc.near', { s: d.round || 5 })}</button><button type="button" class="chip ${d.mode === 'none' ? 'on' : ''}" data-act="ds-mode" data-id="none">${t('dc.none')}</button></div>
        <p class="muted small" style="margin:8px 0 0">${t('dc.how')}</p></div>
      <div class="dcard"><h5>${t('dc.try')}</h5><div class="ln"><span>${t('dc.tryOne')}</span><input class="dinp" id="ds-try" type="text" inputmode="decimal" autocomplete="off" value="19" aria-label="${t('dc.tryOne')}"></div><div id="ds-trybox">${dcTry(d, 19)}</div></div>
      <div class="dcard"><h5>${t('ds.rates')}</h5>${inp('base', d.base, t('ds.base'))}${inp('perKm', d.perKm, t('ds.perKm'))}${inp('freeKm', d.freeKm, t('ds.free'))}${inp('round', d.round, t('ds.round'))}${inp('costKm', d.costKm, t('ds.costKm'))}<label class="chkrow" style="margin-top:8px"><input type="checkbox" data-dsshow ${d.showRate ? 'checked' : ''}><span>${t('ds.showRate')}</span></label></div>
      <div class="dcalc" id="ds-ex">${exFee == null ? t('ds.noRate') : t('ds.example', { km: ex, fee: money(exFee) })}</div>
      <div class="dcard" style="margin-top:12px"><h5>${t('ds.past')}</h5>
        ${st.n ? `<div class="ln"><span>${t('ds.n')}</span><b>${st.n}</b></div><div class="ln"><span>${t('ds.avgKm')}</span><b>${st.avgKm} km</b></div><div class="ln"><span>${t('ds.avgFee')}</span><b>${money(st.avgFee)}</b></div><div class="ln"><span>${t('ds.perKmAvg')}</span><b>${money(st.perKm)}</b></div>${d.costKm > 0 ? `<div class="ln"><span>${t('ds.avgCost')}</span><b>${money(st.avgCost)}</b></div><div class="ln"><span>${t('ds.profitTotal')}</span><b class="${st.profit < 0 ? 'loss' : 'gain'}">${money(st.profit)}</b></div><div class="ln"><span>${t('ds.lossN')}</span><b>${st.lossN}</b></div>` : ''}
        ${st.bands.map((b) => `<div class="dbd"><span class="l">${b.label}</span><i style="width:${Math.max(3, Math.round(b.n / st.n * 100))}%"></i><span class="r">${b.n}${b.n ? ' · ' + plain(money(b.avgFee)) : ''}</span></div>`).join('')}${d.costKm > 0 ? st.bands.filter((b) => b.n && b.avgCost > b.avgFee).map((b) => `<p class="dsug">💡 <b>${t('ds.sugg')}</b> · ${t('ds.suggLine', { label: b.label, cost: plain(money(b.avgCost)), fee: plain(money(b.avgFee)) })}</p>`).join('') : ''}` : `<p class="muted small" style="margin:0">${t('ds.noData')}</p>`}
        <p class="muted small" style="margin:10px 0 0">${t('ds.how')}</p></div>
      <div class="btns"><button class="btn" data-act="ds-recalc">🔄 ${t('ds.recalc')}</button>${dpins.length > 1 ? `<a class="btn" href="${SCore.routeLink(dpins)}" target="_blank" rel="noopener" data-act="pin-open">🧭 ${t('dv.route', { n: Math.min(10, dpins.length) })}</a>` : ''}<button class="btn" data-act="dlv-export">⬇️ ${t('dlv.export')}</button></div></div>`, null, true);
  }
  function planSave(id, day) { closeSheet(); return Store.patch(id, { planDay: day || null }).then(() => { toast(t('dlv.planSaved')); render(); }).catch(() => toast(t('store.pubError'))); }
  function sheetPlan(id) {
    const o = Store.orders().find((x) => x.id === id); if (!o) return;
    openSmall(`<h3>${t('dlv.planTitle')}</h3><p class="muted small">${esc(o.name)} · ${esc(o.code || SCore.orderCode(o.id))}</p>
      <div class="btns"><button class="btn primary" data-act="dlv-plan-set" data-id="today" data-ord="${id}">${t('dlv.planToday')}</button><button class="btn" data-act="dlv-plan-set" data-id="tomorrow" data-ord="${id}">${t('dlv.planTomorrow')}</button></div>
      <div class="stackrow"><input id="plan-date" type="date" value="${esc(o.planDay || '')}" aria-label="${esc(t('dlv.planPick'))}"><button class="btn primary" data-act="dlv-plan-date" data-id="${id}">${t('dlv.planSave')}</button></div>
      ${o.planDay ? `<div class="btns" style="margin-top:10px"><button class="btn" data-act="dlv-plan-set" data-id="clear" data-ord="${id}">${t('dlv.planClear')}</button></div>` : ''}`, 'card');
  }
  function dlvWhatsApp(id, key) {
    const o = Store.orders().find((x) => x.id === id); if (!o) return;
    const lang = o.lang === 'es' || o.lang === 'en' ? o.lang : undefined, msg = t(key, { name: o.name, code: o.code || SCore.orderCode(o.id), store: storeCfg().name || bizName() }, lang);
    const w = window.open(SCore.waLink(o.phone, msg), '_blank'); if (!w) toast(t('ord.waBlocked'));
  }
  function sheetKm(id) {
    const o = Store.orders().find((x) => x.id === id); if (!o) return;
    openSmall(`<h3>${t('km.title')}</h3><p class="muted small">${t('km.hint')}</p>
      <div class="stackrow"><input id="km-in" type="text" inputmode="decimal" autocomplete="off" value="${o.km != null ? esc(Number(o.km).toFixed(1)) : ''}" placeholder="0.0"><button class="btn primary" data-act="km-save" data-id="${id}">${t('km.save')}</button></div>
      ${dset().home && SCore.geo(o.lat, o.lng) ? `<div class="btns" style="margin-top:10px"><button class="btn" data-act="km-reset" data-id="${id}">${t('km.reset')}</button></div>` : ''}`, 'card');
  }
const NAV_ICON = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M15.8 8.2l-2.1 5.5-5.5 2.1 2.1-5.5z" fill="currentColor" stroke="none"/></svg>';
  const navHref = (gp, label) => (/Android/i.test(navigator.userAgent) ? 'geo:' + gp.lat + ',' + gp.lng + '?q=' + gp.lat + ',' + gp.lng + '(' + encodeURIComponent(label || '') + ')' : SCore.mapLinks(gp.lat, gp.lng).google);   // geo: makes an Android phone list every map app it has
  const dlvCard = (o) => { if (o.option !== 'delivery') return ''; const gp = orderPin(o), km = kmNum(o); if (!gp && km == null) return '';
    const dist = km == null ? (dset().home ? t('km.measuring') : `<a data-act="dlv-home">${t('km.noHome')}</a>`) : (o.kmSrc === 'line' ? t('km.line2', { km: km.toFixed(1) }) : t('km.line', { km: km.toFixed(1) }) + (o.kmSrc === 'manual' ? ' · ' + t('km.manual') : '')) + ' · ' + t('dlv.roundTrip', { km: (km * 2).toFixed(1) });
    return `<div class="card dcardn"><div class="rw"><span class="pn" aria-hidden="true">📍</span><div class="t"><b>${esc(o.spot || t('spot.h'))}</b><small>${dist}${km != null || dset().home ? ` <a data-act="km-edit" data-id="${o.id}">${t('km.edit')}</a>` : ''}</small></div>${gp ? `<a class="navbtn" data-act="pin-open" href="${navHref(gp, o.spot)}" target="_blank" rel="noopener" aria-label="${t('km.navigate')}" title="${t('km.navigate')}">${NAV_ICON}</a>` : ''}</div></div>`; };
  // Where the pin falls in your delivery zones, whether delivery was free, and the button to charge it after all.
  const zoneCard = (o) => {
    if (o.option !== 'delivery') return '';
    const zs = pinZones(o), hot = pinHot(o), has = storeZones().length > 0, pin = SCore.geo(o.lat, o.lng), fee = normalFee(o), freed = Number(o.deliveryPrice) === 0 && fee > 0, fp = freeProfile(o);
    if (!has && !freed) return '';
    const pz = pin ? pickedZone(o) : null, gap = pz ? pinGap(o, pz) : 0, pp = pin && o.status === 'new' ? pinPlace(o) : null, ppFee = pp ? SCore.priceOf(storeCfg(), pp) : 0;
    const outWarn = pin && has && !zs.length && !hot.length ? `<p class="zwarn zout">⚠️ ${t('zn.outWarn')}</p>` : '';
    const farWarn = pz && gap > 1500 ? `<p class="zwarn zout">⚠️ ${t('zn.farWarn', { z: esc(pz.name), km: (gap / 1000).toFixed(1) })}</p>` : '';
    const pinBtn = farWarn && pp && o.status === 'new' && Math.abs(ppFee - (Number(o.deliveryPrice) || 0)) > 0.004 ? `<button type="button" class="btn alt" data-act="fee-pin" data-id="${o.id}">${t('fee.pinBtn', { z: esc(pp.name), fee: money(ppFee) })}</button>` : '';
    const hotWarn = hot.length ? `<p class="zwarn zhot">⚠️ ${t('zn.hotWarn', { z: esc(hot.map((z) => z.name).join(', ')) })}</p>` : '';
    const nz = pin && !zs.length ? SCore.nearestZone(SCore.areaZones(storeZones()), Number(o.lat), Number(o.lng)) : null, where = !pin ? t('zn.noPin') : zs.length ? t('zn.inZone', { z: esc(zs.map((z) => z.name).join(', ')) }) : t('zn.outZone') + (nz ? ' · ' + t('zn.nearest', { z: esc(nz.zone.name), km: (nz.m / 1000).toFixed(1) }) : '');
    const warn = freed && !fp ? `<p class="zwarn">⚠️ ${t(pin ? 'zn.warnFree' : 'zn.warnNoPin')}</p>` : '';
    const btn = freed && o.status === 'new' ? `<button type="button" class="btn alt" data-act="fee-charge" data-id="${o.id}">${t('fee.btn', { fee: money(fee) })}</button>` : '';
    return `<div class="card zcard"><div class="rw"><span class="pn" aria-hidden="true">🗺️</span><div class="t"><b>${where}</b>${freed ? `<small>🎁 ${t(fp ? 'zn.freeOk' : 'zn.freeNow')}</small>` : o.feeChanged ? `<small>${t('fee.changed')}</small>` : ''}</div></div>${hotWarn}${outWarn}${farWarn}${warn}${btn}${pinBtn}</div>`;
  };
  const kmLine = (o) => { if (o.option !== 'delivery' || !(SCore.geo(o.lat, o.lng) || o.km != null)) return ''; const km = kmNum(o); return `<div class="card kmcard"><div class="rw"><div class="t"><b>${t('km.title')}</b><small>${km == null ? t('km.measuring') : o.kmSrc === 'line' ? t('km.line2', { km: km.toFixed(1) }) : t('km.line', { km: km.toFixed(1) }) + (o.kmSrc === 'manual' ? ' · ' + t('km.manual') : '')}${km != null ? ' · ' + t('dlv.roundTrip', { km: (km * 2).toFixed(1) }) : ''}</small></div><button class="dchip" data-act="km-edit" data-id="${o.id}">✏️ ${t('km.edit')}</button></div></div>`; };
  function dlvExport() {
    const q = (v) => { const x = v == null ? '' : String(v); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }, d = dset();
    const rows = Store.orders().filter((o) => o.status === 'confirmed' || o.status === 'done').sort((a, b) => ordKey(a) - ordKey(b)).map((o) => { const w = dlvWhen(o), c = Store.when(o), km = o.km != null && Number.isFinite(Number(o.km)) ? Number(o.km) : '';
      return [o.code || SCore.orderCode(o.id), o.name, o.phone, o.option, o.location, o.spot || '', o.lat != null ? o.lat : '', o.lng != null ? o.lng : '', km, o.kmSrc || '', o.deliveryPrice != null ? o.deliveryPrice : '', km !== '' ? (SCore.rateFee(d, km) == null ? '' : SCore.rateFee(d, km)) : '', o.status, c ? c.toISOString() : '', w ? w.toISOString() : '']; });
    const head = ['Order', 'Customer', 'Phone', 'Type', 'Area', 'Place', 'Latitude', 'Longitude', 'Km', 'Km source', 'Fee charged', 'Your rate', 'Status', 'Ordered', 'Delivered'];
    download('b-ruiz-deliveries.csv', [head].concat(rows).map((r) => r.map(q).join(',')).join('\n'), 'text/csv');
  }
  /* ---------- order rows: status pill + date ---------- */
  const tsAt = (v) => (v && v.toMillis ? new Date(v.toMillis()) : null);   // a saved moment (the phone shows it in its own time zone)
  const itemArriving = (i) => { const it = state.items.find((x) => x.id === i.id), b = it && state.batches.find((y) => y.id === it.batchId); return !!it && !L.isSold(it) ? it.status === 'In Transit' : !!b && bStatus(b) === 'In Transit'; };
  const opl = (k, label) => `<span class="opl ${k}">${label}</span>`;
  /* part deliveries: an order can be handed over in trips. o.trips = [{ at, ids }] is the record of what went out and when (an order with no trips and status done was handed over in one go) */
  const tripsOf = (o) => (Array.isArray(o.trips) ? o.trips : []);
  const handedAt = (o, id) => { const tr = tripsOf(o).find((x) => (x.ids || []).includes(id)); return tr ? new Date(tr.at) : null; };
  const toHand = (o) => (o.status === 'done' || o.status === 'declined' ? [] : (o.items || []).filter((i) => !handedAt(o, i.id)));   // still to hand over
  const handedN = (o) => (o.items || []).length - toHand(o).length;
  // One pill, the most urgent first: arriving soon, then owing, then paid
  function orderPill(o, withAmt) {
    if (o.status === 'declined') return opl('gone', t(o.returned ? 'ord.pl.returned' : o.cancelled ? 'ord.pl.cancelled' : 'ord.pl.declined'));
    if (o.status !== 'done' && toHand(o).some(itemArriving)) return opl('arr', t('ord.pl.arr'));   // no hourglass here: the room goes to the date
    const pay = L.orderPay(state, orderInvoice(o)); if (!pay) return '';
    return pay.owing > 0 ? opl('owing', withAmt ? t('ord.pl.owingAmt', { amount: money(pay.owing) }) : t('ord.pl.owing')) : opl('paid', '✓ ' + t('ord.pl.paid'));
  }
  function ordRow(o, match) {
    const n = tn('notif.items', (o.items || []).length), when = o.status === 'done' && tsAt(o.doneAt) ? t(o.option === 'delivery' ? 'ord.delivered' : 'ord.collected') + ' ' + ago(tsAt(o.doneAt)) : (o.option === 'delivery' ? t('store.delivery') : t('store.pickup')) + ' · ' + ago(Store.when(o));
    const hotO = o.status === 'new' && pinHot(o).length > 0;
    return `<button class="ord${hotO ? ' hot' : ''}" data-act="order-open" data-id="${o.id}"><span class="ic">${hotO ? '⚠️' : '🛍️'}</span><div class="mid"><b>${esc(o.code || SCore.orderCode(o.id))} · ${esc(o.name)}${o.option === 'delivery' && SCore.geo(o.lat, o.lng) ? ' <span class="pinm" title="' + t('spot.h') + '">📍</span>' : ''}${hotO ? ' <span class="hotm">' + t('hot.tag') + '</span>' : ''}${o.option === 'delivery' && o.status === 'new' && !SCore.geo(o.lat, o.lng) ? ' <span class="rtag np">' + t('ord.noPin') + '</span>' : ''}</b><small>${n} · ${when}</small>${match ? `<small class="omatch">${esc(t('ord.m.' + match.kind, { text: match.text }))}</small>` : ''}</div><div class="end"><b>${money(o.total)}</b>${orderPill(o, stageOf(o) === 'handed')}</div></button>`;
  }
  let ordLimit = 20, ordQ = '';
  const ORD_TABS = ['new', 'confirmed', 'handed', 'done'], HUB_TABS = ['new', 'confirmed', 'handed'];   // the Store page lists orders still in progress; completed ones live in the Order Log
  const stageOf = (o) => L.orderStage(o, L.orderPay(state, orderInvoice(o)));
  // search box + the four tabs (the tabs step aside while searching)
  const ordHead = (hub) => { const tabs = hub ? HUB_TABS : ORD_TABS, cur = hub && ordFilter === 'done' ? 'new' : ordFilter, cnt = {}; ORD_TABS.forEach((f) => { cnt[f] = 0; }); Store.orders().forEach((o) => { cnt[stageOf(o)]++; });
    return `<div class="oqbar"><span aria-hidden="true">🔍</span><input class="oq" type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t('ord.search'))}" value="${esc(ordQ)}" aria-label="${esc(t('ord.search'))}"><button class="oqx" data-act="ord-q-clear" aria-label="${t('ord.clear')}" ${ordQ ? '' : 'hidden'}>✕</button></div>
      <div class="seg ordseg${tabs.length === 4 ? ' four' : ''}" ${ordQ.trim() ? 'hidden' : ''}>${tabs.map((f) => `<button class="${cur === f ? 'on' : ''}" data-act="ord-filter" data-id="${f}"${f === 'done' ? ` aria-label="${esc(t('ord.f.done'))} ${cnt[f]}"` : ''}>${f === 'done' ? `<span class="tk" aria-hidden="true">✓</span> ${cnt[f]}` : `${t('ord.f.' + f)} ${cnt[f]}`}</button>`).join('')}</div>`; };   // the Order Log has four tabs: Completed is a green tick, so the labels have room
  // newest first: the moment of the latest thing that happened to the order
  const ordKey = (o) => { const c = Store.when(o), t0 = (v) => (tsAt(v) ? tsAt(v).getTime() : 0), c0 = c ? c.getTime() : 0;
    return Math.max(c0, o.status === 'done' ? t0(o.doneAt) : o.status === 'confirmed' ? t0(o.confirmedAt) : o.status === 'declined' ? t0(o.declinedAt) : 0); };
  const newestFirst = (a) => a.slice().sort((x, y) => ordKey(y) - ordKey(x));
  function ordPanel(limit) {
    const all = newestFirst(Store.orders()), q = ordQ.trim(), hub = limit <= 5;
    const more = (n, lim) => (n > lim ? `<button class="btn more" data-act="ord-more">${t('ord.showMore', { n: Math.min(20, n - lim) })}</button>` : '');
    const logBtn = (n) => `<button class="btn more logbtn" data-act="orders-open">${t('ord.openLog')} · ${n}</button>`;   // the store page shows only the newest 5; the rest lives in the order log
    const panel = (inner) => `<div class="opanel">${inner}</div>`;   // on the store page the orders sit in a soft panel, so you can see where they appear
    if (q) {
      const hits = all.map((o) => ({ o, st: stageOf(o), m: L.orderMatch(state, o, q, orderInvoice(o)) })).filter((x) => x.m);
      if (!hits.length) return panel(`<div class="oempty"><span class="em">🔍</span><span>${t('ord.noMatch', { q: esc(q) })}</span></div>`);
      const lim = hub ? limit : Math.max(limit, ordLimit), shown = hits.slice(0, lim);
      const body = ORD_TABS.map((st) => { const g = shown.filter((x) => x.st === st); return g.length ? `<div class="ostage">${t('ord.f.' + st).toUpperCase()} · ${hits.filter((x) => x.st === st).length}</div>${g.map((x) => ordRow(x.o, x.m)).join('')}` : ''; }).join('');
      return hub ? panel(body + (hits.length > lim ? logBtn(hits.length) : '')) : body + more(hits.length, lim);
    }
    const flt = hub && ordFilter === 'done' ? 'new' : ordFilter, list = all.filter((o) => stageOf(o) === flt), owed = flt === 'handed' ? list.reduce((n, o) => n + ((L.orderPay(state, orderInvoice(o)) || {}).owing || 0), 0) : 0;
    const tot = owed > 0 ? `<div class="otot">${tn('ord.nOrders', list.length)} · <b>${t('ord.stillToCollect', { amount: money(owed) })}</b></div>` : '';
    if (!list.length) return panel(`<div class="oempty"><span class="em">🛍️</span><span>${t('ord.empty.' + flt)}</span><small>${t('ord.emptyHint.' + flt)}</small></div>`);   // the same empty card on the Store page and in the Order Log
    const rows = list.slice(0, limit).map((o) => ordRow(o)).join('');
    return hub ? panel(tot + rows + logBtn(list.length)) : tot + rows + more(list.length, limit);
  }
  const refreshOrders = () => { document.querySelectorAll('.ordov').forEach((e) => { e.innerHTML = ordOverview(); }); document.querySelectorAll('.ordp').forEach((e) => { e.innerHTML = ordPanel(Number(e.dataset.lim) || 20); }); document.querySelectorAll('.ordseg').forEach((e) => { e.hidden = !!ordQ.trim(); }); document.querySelectorAll('.oqx').forEach((e) => { e.hidden = !ordQ; }); };
  // More > Order log: every order, with the search box and the same four tabs (nothing is ever removed from it)
  // A small summary above the Order Log: what still has to go out, what is on its way, and what is owed
  function ordOverview() {
    let del = 0, col = 0, arr = 0, owed = 0, oldest = -1;
    Store.orders().forEach((o) => {
      const st = stageOf(o);
      if (st === 'confirmed') { const left = toHand(o), ready = left.filter((i) => !itemArriving(i)).length; if (o.option === 'delivery') del += ready; else col += ready; arr += left.length - ready; }
      if (st === 'confirmed' || st === 'handed') { const ow = (L.orderPay(state, orderInvoice(o)) || {}).owing || 0; if (ow > 0) { owed += ow; const since = tsAt(o.confirmedAt) || Store.when(o); if (since) oldest = Math.max(oldest, Math.floor((Date.now() - since) / 864e5)); } }
    });
    const arrTxt = arr ? tn('ov.arriving', arr) : '', oldTxt = oldest < 0 ? '' : oldest < 1 ? t('ov.oldestToday') : tn('ov.oldest', oldest);
    return `<div class="ovc"><div class="ovr"><button type="button" class="tp" data-act="ov-go" data-id="deliveries"><small>${t('ov.toDeliver')}</small><b>${del}</b></button><button type="button" class="tp" data-act="ov-go" data-id="pickups"><small>${t('ov.toCollect')}</small><b>${col}</b></button><div class="${owed > 0 ? 'ow' : ''}"><small>${t('ov.owed')}</small><b>${money(owed)}</b></div></div>${arrTxt || oldTxt ? `<div class="ovf"><span>${arrTxt ? '⏳ ' + arrTxt : ''}</span><span>${oldTxt}</span></div>` : ''}</div>`;
  }
  function OrderLog() { return `<div class="sth"><div class="ordov">${ordOverview()}</div>${ordHead()}<div class="ordp" data-lim="${ordLimit}">${ordPanel(ordLimit)}</div></div>`; }
  // The invoice an order was turned into (saved on the order; older orders: the invoice their sold items are on).
  // An order's saved invoice number only counts when that invoice was made after the order arrived. After a reset or an import the
  // numbers start again, and an old number could otherwise point at someone else's invoice.
  const invBelongs = (o, no) => { const inv = state.invoices.find((v) => v.no === no); if (!inv) return false; const at = tsAt(o.createdAt), d = new Date(inv.date); return !(at && !isNaN(d) && d.getTime() < at.getTime() - 3600000); };
  const orderLinkLost = (o) => !!(o.invoice && !invBelongs(o, o.invoice));
  const orderInvoice = (o) => (o.invoice && invBelongs(o, o.invoice) ? o.invoice : '') || ((o.items || []).map((i) => state.items.find((x) => x.id === i.id)).find((it) => it && it.invoice && L.isSold(it)) || {}).invoice || '';
  Object.defineProperty(L, 'orderHold', { get: () => new Set(Store.reserved()), configurable: true });   // items inside unanswered orders are locked like sold ones
  let pendingOrder = null, custLock = false;   // the order whose invoice page is open, and whether its customer card is locked in
  // The customer on the invoice page of an order: one card instead of the search list.
  function orderCustomerCard() {
    if (!pendingOrder || !custLock) return '';
    const o = Store.orders().find((x) => x.id === pendingOrder); if (!o) return '';
    return `<div class="cc"><span class="av">${esc((o.name || '?').trim().charAt(0).toUpperCase())}</span><div class="t"><b>${esc(o.name)}</b><small>${esc(o.phone)} · ${o.option === 'delivery' ? t('store.delivery') : t('store.pickup')} · ${esc(o.location)}</small></div></div>`;
  }
  // Opens WhatsApp to the customer with the message already written (the owner taps Send). In the customer's own language when the order carries it.
  function waOpen(o, key, inv) {
    const lang = o.lang === 'es' || o.lang === 'en' ? o.lang : (knownLang('', o.name) || undefined), plain = (n) => 'TT$ ' + (Number(n) || 0).toFixed(2);
    const names = (inv ? state.items.filter((i) => i.invoice === inv.no) : []).map((i) => (lang === 'es' ? esName(i) : i.desc) + (i.size ? ' (' + i.size + ')' : '')).join(', ') || tn('notif.items', (o.items || []).length, {}, lang);
    let where = (o.option === 'delivery' ? t('store.delivery', {}, lang) : t('store.pickup', {}, lang)) + ' · ' + o.location;
    const pin = o.option === 'delivery' ? SCore.geo(o.lat, o.lng) : null; if (pin) where += ' 📍 ' + SCore.mapLinks(pin.lat, pin.lng).view + ' ';   // the space keeps the full stop out of the link
    const lines = (inv ? state.items.filter((i) => i.invoice === inv.no) : []).map((i) => '• ' + (lang === 'es' ? esName(i) : i.desc) + (i.size ? ' (' + i.size + ')' : '') + ' · ' + (itemArriving({ id: i.id }) ? '⏳ ' + t('wa.soon', {}, lang) : t('wa.ready', {}, lang))).join('\n') || names;
    const tot = plain(inv ? inv.total : o.total), fees = o.option === 'delivery' && o.feeChanged && Number(o.deliveryPrice) > 0 ? t('wa.feeChanged', { fee: plain(o.deliveryPrice), total: tot }, lang) : o.option === 'pickup' && Number(o.deliveryPrice) > 0 ? t('wa.feesSpot', { fee: plain(o.deliveryPrice), total: tot }, lang) : o.option === 'delivery' && Number(o.deliveryPrice) > 0 ? t('wa.feesDel', { fee: plain(o.deliveryPrice), total: tot }, lang) : o.option === 'delivery' ? t('wa.feesTotal', { total: tot }, lang) : t('wa.feesPick', { total: tot }, lang);
    const msg = t(key, { name: o.name, code: o.code || SCore.orderCode(o.id), items: names, list: lines, fees, where, total: tot, how: t(o.option === 'delivery' ? 'ord.howDel' : 'ord.howPick', {}, lang), store: storeCfg().name || bizName() }, lang);
    const w = window.open(SCore.waLink(o.phone, msg), '_blank'); if (!w) toast(t('ord.waBlocked'));
  }
  function orderCancel(id) {
    const o = Store.orders().find((x) => x.id === id); if (!o) return;
    const inv = orderInvoice(o), code = o.code || SCore.orderCode(o.id);
    return askCard(t('ord.cancelAsk', { code }), { danger: true, ok: t('ord.cancelOk') }).then((y) => {
      if (!y) return;
      try { if (inv) { const pu = L.purchaseOf(state, inv); if (pu && pu.items.length) L.returnItems(state, inv, pu.items.map((x) => x.id), new Date(), 'cancelled'); save(); tidyPhotos(); } } catch (e) { return toast('⚠️ ' + errMsg(e)); }
      Store.setStatus(o.id, 'declined', { cancelled: true }).then(() => { toast(t('ord.cancelled')); dropPages('order|' + o.id); render(); waOpen(o, 'ord.waCancelled'); }).catch(() => toast(t('store.pubError')));
    });
  }
  /* ---------- returns: put items from an invoice back in stock ---------- */
  function sheetReturn(no, ordId) {
    const pu = L.purchaseOf(state, no); if (!pu || !pu.items.length) return toast(t('ret.nothing'));
    const rows = pu.items.map((i) => `<label class="rtrow"><input type="checkbox" data-ret value="${esc(i.id)}"><span class="rt-t"><b>${esc(dn(i))}${i.size ? ' · ' + esc(szLabel(i.size)) : ''}</b><small>${esc(i.id)}</small></span><b>${money(L.effectivePrice(i))}</b></label>`).join('');
    openSmall(`<h3>${t('ret.title')}</h3><p class="muted small">${pu.inv.no} · ${esc(pu.inv.client)}</p>
      <div class="rt-all"><button class="chip" data-act="ret-all">${t('ret.all')}</button></div>
      <div class="rt-sum" id="rt-sum" data-inv="${pu.inv.no}" data-ord="${esc(ordId || '')}"></div>
      <div class="rt-list">${rows}</div>
      <label class="rt-fee"><span><b>${t('ret.feeLabel')}</b><small>${t('ret.feeNote')}</small></span><span class="in"><em>TT$</em><input id="rt-fee" type="text" inputmode="decimal" autocomplete="off" value="${num_(pu.inv.delivery) > 0 ? num_(pu.inv.delivery).toFixed(2) : ''}" placeholder="0.00"></span></label>
      <div class="btns"><button class="btn danger" id="rt-go" data-act="ret-do" disabled>${t('ret.go.other', { n: 0 })}</button><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet');
    $('#sheet').classList.add('hdr'); retRefresh();
  }
  function retPicked() { return [...document.querySelectorAll('#sheet [data-ret]:checked')].map((e) => e.value); }
  function retRefresh() {
    const box = $('#rt-sum'); if (!box) return; const ids = retPicked(), go = $('#rt-go');
    go.disabled = !ids.length; go.textContent = tn('ret.go', ids.length);
    if (!ids.length) { box.innerHTML = ''; return; }
    const fee = parseAmt(($('#rt-fee') || {}).value), pv = L.returnPreview(state, box.dataset.inv, ids, fee);
    box.innerHTML = `<div class="ln"><span>${t('ret.paid')}</span><b>${money(pv.paid)}</b></div>${pv.all ? `<div class="ln"><span>${t('ret.invoiceGone')}</span><b>—</b></div>` : `<div class="ln"><span>${t('ret.newTotal')}</span><b>${money(pv.newTotal)}</b></div>${pv.owing > 0 ? `<div class="ln"><span>${t('ret.stillOwing')}</span><b>${money(pv.owing)}</b></div>` : ''}`}
      ${fee > 0 ? `<div class="ln"><span>${t('ret.fee')}</span><b>${money(fee)}</b></div>` : ''}
      ${pv.refund > 0 ? `<div class="ln due"><span>${t('ret.refund')}</span><b>${money(pv.refund)}</b></div>` : ''}${pv.owesFee > 0 ? `<div class="ln due"><span>${t('ret.owesFee')}</span><b>${money(pv.owesFee)}</b></div>` : ''}`;
  }
  const itemPill = (o, i, it) => { if (o.status === 'declined') return ''; const hd = o.status !== 'done' ? handedAt(o, i.id) : null; const k = hd ? opl('paid', '✓ ' + t(o.option === 'delivery' ? 'ord.pl.deliveredOn' : 'ord.pl.collectedOn', { date: dayMon(hd) })) : o.status !== 'done' && itemArriving(i) ? opl('arr', '⏳ ' + t('ord.pl.arr')) : it && L.isSold(it) && it.invoice ? (it.status === 'Paid' ? opl('paid', '✓ ' + t('ord.pl.paid')) : opl('owing', t('ord.pl.owing'))) : ''; return k ? `<div class="ipl">${k}</div>` : ''; };
  function sheetOrder(id, swap) {
    const o = Store.orders().find((x) => x.id === id); if (!o) return;
    enterPage('order', id, () => sheetOrder(id), swap);
    const rows = (o.items || []).map((i) => { const it = state.items.find((x) => x.id === i.id), gone = !it || L.isSold(it), tr = it && it.status === 'In Transit', sold = it && L.isSold(it) && it.invoice;
      const back = o.status === 'done' && it && !L.isSold(it) && !it.invoice, sub = sold && o.status !== 'new' ? t('ord.soldOn', { no: it.invoice }) : back ? t('ord.returned') : gone ? t('ord.gone') : tr ? '⏳ ' + t('ord.transit') : t('ord.available');
      const CHEV = '<svg viewBox="0 0 10 16" width="9" height="15" aria-hidden="true"><path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      return `<div class="rw itm${it ? ' go' : ''}"${it ? ` role="button" tabindex="0" data-act="edit-item" data-ord="${o.id}" data-id="${esc(it.id)}"` : ''}><span class="othumb">${it ? PUI.thumb(it) : '<span class="ph"></span>'}</span><div class="t"><b>${esc(it ? dn(it) : i.name)}${i.size ? ' · ' + esc(szLabel(i.size)) : ''}</b><small class="${gone && o.status === 'new' ? 'bad' : ''}">${esc(i.id)} · ${sub}</small>${itemPill(o, i, it)}</div><span class="rgo">${it ? CHEV : ''}</span><b class="rp">${money(i.price)}</b></div>`; }).join('');
    const msg = t('ord.waMsg', { name: o.name, code: o.code || SCore.orderCode(o.id) }), inv = orderInvoice(o), pay = L.orderPay(state, inv);
    const gp = o.option === 'delivery' ? SCore.geo(o.lat, o.lng) : null, ml = gp ? SCore.mapLinks(gp.lat, gp.lng) : null;   // the pin the customer chose on the map
    const stage = stageOf(o), sib = newestFirst(Store.orders().filter((x) => stageOf(x) === stage)), at = sib.findIndex((x) => x.id === id);
    const nav = sib.length > 1 ? `<div class="fnav"><button data-act="order-nav" data-id="${sib[(at - 1 + sib.length) % sib.length].id}" aria-label="${t('flow.prev')}">‹</button><button data-act="order-nav" data-id="${sib[(at + 1) % sib.length].id}" aria-label="${t('flow.next')}">›</button></div>` : '';
    const partN = o.status === 'confirmed' && handedN(o) > 0 ? ' ' + t('ord.nOfM', { n: handedN(o), m: (o.items || []).length }) : '';   // part delivered: "Delivered 1 of 2"
    const stepBar = o.status === 'declined' ? '' : `<div class="fstep">${ORD_TABS.map((k, n) => `<span class="${n < ORD_TABS.indexOf(stage) ? 'dn' : n === ORD_TABS.indexOf(stage) ? 'on' : ''}">${t('flow.' + (k === 'new' ? 'ordered' : k === 'handed' ? (o.option === 'delivery' ? 'delivered' : 'collected') : k))}${k === 'handed' ? partN : ''}</span>`).join('')}</div>`;
    const stIdx = ORD_TABS.indexOf(stage), stName = (k) => t('flow.' + (k === 'new' ? 'ordered' : k === 'handed' ? (o.option === 'delivery' ? 'delivered' : 'collected') : k));
    const stripBar = o.status === 'declined' ? '' : `<div class="stk" hidden aria-hidden="true"><div class="dots">${ORD_TABS.map((k, n) => `<i class="${n < stIdx ? 'dn' : n === stIdx ? 'on' : ''}">${n < stIdx ? '✓' : ''}</i>${n < ORD_TABS.length - 1 ? `<b class="${n < stIdx ? 'dn' : ''}"></b>` : ''}`).join('')}</div><span class="lab">${stName(ORD_TABS[stIdx])}<small>${t('ord.stepOf', { n: stIdx + 1, total: ORD_TABS.length })}</small></span></div>`;
    const owingNow = pay && pay.owing > 0 ? pay.owing : 0;
    const lat = latestInvOf(o), canAct = stage !== 'new' && o.status !== 'declined', sentLatest = lat && o.invSentNo === lat.no;
    const ckRow = (ok, title, sub, btn, attrs) => `<div class="r ${ok ? 'ok' : 'todo'}${attrs ? ' tap' : ''}" ${attrs || ''}><i>${ok ? '✓' : '○'}</i><span class="tx">${title}${sub ? `<small>${sub}</small>` : ''}</span>${btn || ''}</div>`;
    const sumCard = stage === 'new' || o.status === 'declined' ? '' : `<div class="cklist">${ckRow(true, t('ck.confirmed'), tsAt(o.confirmedAt) ? fullWhen(tsAt(o.confirmedAt)) : '')}${!lat && orderLinkLost(o) ? ckRow(false, t('ck.invLost'), t('ck.invLostSub', { no: o.invoice })) : ''}${lat ? ckRow(true, t('ck.inv', { no: lat.no }), pay ? (pay.owing > 0 ? (pay.paid > 0 ? t('ck.paidOwing', { paid: money(pay.paid), owing: money(pay.owing) }) : t('ck.owingOnly', { owing: money(pay.owing) })) : t('ck.paidFull')) : '', `<button type="button" class="ckview" data-act="view-inv" data-id="${lat.no}">${t('ck.view')} ›</button>`, `role="button" tabindex="0" data-act="view-inv" data-id="${lat.no}"`) : ''}${lat ? (sentLatest ? ckRow(true, t('ck.sent'), o.invSentAt ? fullWhen(new Date(o.invSentAt)) : '') : ckRow(false, t(o.invSentNo ? 'ck.updNotSent' : 'ck.notSent'), o.invSentNo ? t('ck.sentEarlier', { no: o.invSentNo }) : '', canAct ? `<span class="sbtns"><button class="sendbtn ${o.invSentNo ? 'soft' : ''}" data-act="ord-send-inv" data-id="${o.id}">${t(o.invSentNo ? 'ck.sendUpd' : 'ck.send')}</button><button class="alink" data-act="ord-sent-mark" data-id="${o.id}">${t('ck.already')}</button></span>` : '')) : ''}</div>`;
    const spotCard = (o.note ? `<h4><span>${t('ord.notes')}</span></h4><div class="card"><div class="rw"><div class="t"><small style="white-space:pre-wrap">${esc(o.note)}</small></div></div></div>` : '') + dlvCard(o) + zoneCard(o);   // last on the page, after the items, payment and timeline
    const payCard = pay ? `<h4><span>${t('ord.payment')}</span></h4><div class="card pay"><div class="hd">${pay.owing <= 0 ? opl('paid', '✓ ' + t('ord.pl.paidFull')) : opl('owing', t(pay.paid > 0 ? 'ord.pl.part' : 'ord.pl.owing'))}${pay.owing > 0 ? `<span class="big">${t('ord.owingAmt', { amount: money(pay.owing) })}</span>` : ''}</div><div class="bar"><i style="width:${pay.total > 0 ? Math.round(pay.paid / pay.total * 100) : 0}%"></i></div>
      <div class="ln"><span>${t('ord.invTotal')}</span><b>${money(pay.total)}</b></div><div class="ln"><span>${t('ord.paidSoFar')}</span><b>${money(pay.paid)}</b></div><div class="ln ${pay.owing > 0 ? 'due' : 'ok'}"><span>${t('ord.stillOwing')}</span><b>${money(pay.owing)}</b></div>${pay.owing > 0 && o.status !== 'declined' ? `<div class="paybar"><button class="btn primary" data-act="pay-inv" data-id="${pay.inv}" data-ord="${o.id}">💳 ${t('ord.payBtn')}</button></div>` : ''}</div>` : '';
    const dateOnly = (d) => d.toLocaleDateString(I.locale(I.getLang()), { weekday: 'short' }).replace('.', '') + ' ' + dayMon(d);   // a payment is saved with a day, not a time
    const step = (on, label, d, extra, dOnly) => `<div class="s ${on ? 'on' : ''}"><i></i><div><b>${label}${extra || ''}</b><small>${d ? (dOnly ? dateOnly(d) : fullWhen(d)) : on ? '' : t('ord.tl.notYet')}</small></div></div>`;
    const handed = t(o.option === 'delivery' ? 'ord.delivered' : 'ord.collected');
    // what happened, in the order it happened (steps not reached yet come last); the balance sits under the last payment only
    const ev = [{ at: Store.when(o), h: step(true, t('ord.tl.ordered'), Store.when(o)) }];
    if (o.status !== 'new') ev.push({ at: tsAt(o.confirmedAt) || Store.when(o), h: step(o.status !== 'declined' || !!tsAt(o.confirmedAt), t('ord.tl.confirmed'), tsAt(o.confirmedAt)) });
    if (pay) pay.payments.forEach((x) => ev.push({ at: new Date(x.date), pay: true, h: step(true, t('ord.tl.payment'), new Date(x.date), ' · ' + money(x.amount), true) }));
    if (o.status === 'declined') ev.push({ at: tsAt(o.declinedAt) || new Date(8.64e15), h: step(true, t(o.returned ? 'ord.pl.returned' : o.cancelled ? 'ord.pl.cancelled' : 'ord.pl.declined'), tsAt(o.declinedAt)) });
    else if (o.status === 'confirmed') ev.push({ at: new Date(8.64e15), h: step(false, handed, null) });
    else if (o.status === 'done') ev.push({ at: tsAt(o.doneAt) || new Date(8.64e15), h: step(true, handed, tsAt(o.doneAt)) });
    ev.forEach((e, n) => { e.n = n; }); ev.sort((x, y) => (x.at - y.at) || (x.n - y.n));
    const lastPay = ev.map((e) => !!e.pay).lastIndexOf(true);
    if (lastPay >= 0 && pay && pay.owing > 0) ev[lastPay].h += `<div class="s on"><i></i><div><b class="tlbal">${t('ord.tl.balance', { amt: money(pay.owing) })}</b><small>${t('ord.pl.owing')}</small></div></div>`;
    const tl = ev.map((e) => e.h);
    const tlCard = o.status === 'new' ? '' : `<h4><span>${t('ord.timeline')}</span></h4><div class="card tl">${tl.join('')}</div>`;
    openSheet(`<div class="fullbar"><button data-act="close" aria-label="${t('aria.back')}">‹</button><div><b>${esc(o.code || SCore.orderCode(o.id))}</b><small>${esc(o.name)} · ${fullWhen(Store.when(o))}</small></div>${nav}</div>${stripBar}
      <div class="ap">${stepBar}${pinHot(o).length && o.status === 'new' ? `<div class="hotban"><b>⚠️ ${t('hot.banner')}</b><span>${t('hot.sure', { z: esc(pinHot(o).map((z) => z.name).join(', ')) })}</span></div>` : ''}${sumCard}<div class="card"><div class="rw"><div class="t"><b>${esc(o.name)}</b><small>${esc(o.phone)}</small>${orderWho(o)}</div><a class="ibtn wapp" href="${SCore.waLink(o.phone, msg)}" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg></a><a class="ibtn" href="tel:${esc(SCore.digits(o.phone))}" aria-label="${t('ord.call')}"><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></a></div><div class="rw"><div class="t"><b>${optText(o)}</b><small>${o.option === 'delivery' ? money(o.deliveryPrice) : t('store.free')}</small></div>${stage === 'new' ? '' : stBadge(o)}</div></div>
      <h4><span>${t('ord.items')}</span></h4><div class="card">${rows}<div class="rw tot"><div class="t"><b>${t('ord.total')}</b></div><b>${money(o.total)}</b></div></div>
      ${payCard}${couponCard(o, L.orderPay(state, orderInvoice(o)))}${tlCard}${spotCard}
      ${o.status === 'new' ? `<div class="btnrow"><button class="pbtn" data-act="order-confirm" data-id="${o.id}">${t('flow.accept')}</button><button class="gbtn" data-act="order-decline" data-id="${o.id}">${t('ord.decline')}</button></div><p class="muted small" style="margin:10px 2px">${t('ord.acceptNote')}</p>`
        : o.status === 'confirmed' ? `<div class="fnext">${(() => { const left = toHand(o), wait = left.filter(itemArriving); if (left.length && wait.length === left.length) return `<button type="button" class="fwait" data-act="wait-open" data-id="${o.id}">⏳ ${tn('ord.waitingN', wait.length)} ›</button>`; return owingNow > 0 ? `<button class="gbtn" data-act="order-done" data-id="${o.id}">${t(o.option === 'delivery' ? 'flow.skipDel' : 'flow.skipCol')}</button>` : `<button class="pbtn" data-act="order-done" data-id="${o.id}">${t(o.option === 'delivery' ? 'flow.nextDel' : 'flow.nextCol')}</button>`; })()}</div><p class="ocancel"><button data-act="order-cancel" data-id="${o.id}">${t('ord.cancelThis')}</button><small>${t('ord.cancelNote')}</small></p>`
        : o.status === 'done' && inv && (L.purchaseOf(state, inv) || { items: [] }).items.length ? `<div class="btnrow"><button class="gbtn" data-act="return-open" data-id="${inv}" data-ord="${o.id}" style="flex:1;grid-column:1 / -1">↩ ${t('ret.btn')}</button></div>` : (o.status === 'done' || o.status === 'declined') ? `<p class="ocancel"><button data-act="order-delete" data-id="${o.id}">${t('ord.delete')}</button><small>${t('ord.deleteNote')}</small></p>` : ''}</div>`, null, true);   // the invoice opens from its row in the checklist above
    if (lat && !sentLatest && canAct) setTimeout(() => { if (pageStack.length && pageStack[pageStack.length - 1].key === 'order|' + id) prefetchPdf(lat.no, true); }, 800);
  }
  const orderItemsLeft = (o) => (o.items || []).map((i) => state.items.find((x) => x.id === i.id)).filter((it) => it && !L.isSold(it));
  // Delivery orders: look at the place first (and open it in a map app); pickups confirm straight away
  function confirmOrder(o) {
    const its = orderItemsLeft(o), missing = (o.items || []).length - its.length;
    if (!its.length) return toast(t('ord.noneLeft'));
    if (o.option !== 'delivery') return doConfirmOrder(o);
    const gp = orderPin(o), km = kmNum(o), place = o.spot || o.location || '';
    openSmall(`${pinHot(o).length ? `<div class="hotban"><b>⚠️ ${t('hot.banner')}</b><span>${t('hot.sure', { z: esc(pinHot(o).map((z) => z.name).join(', ')) })}</span></div>` : ''}<h3>${t('loc.title')}</h3><p><b>${esc(place)}</b>${o.spot && o.location ? '<br>' + esc(o.location) : ''}${km != null ? '<br>' + t('loc.km', { km: km.toFixed(1) }) : ''}${missing ? '<br><br>⚠️ ' + t('ord.someGone', { n: missing }) : ''}${(() => { const g = SCore.geo(o.lat, o.lng), zz = pickedZone(o); return g && storeZones().length && !pinZones(o).length && !pinHot(o).length ? '<br><br>⚠️ ' + t('zn.outWarn') : (zz && pinGap(o, zz) > 1500 ? '<br><br>⚠️ ' + t('zn.farWarn', { z: esc(zz.name), km: (pinGap(o, zz) / 1000).toFixed(1) }) : ''); })()}<br><br>${t('loc.ask')}</p>
      <div class="btns">${gp ? `<a class="btn navopen" data-act="pin-open" href="${navHref(gp, o.spot)}" target="_blank" rel="noopener">🧭 ${t('loc.open')}</a>` : ''}<button class="btn primary" data-act="loc-yes" data-id="${o.id}">${t(pinHot(o).length ? 'hot.confirmAnyway' : 'loc.yes')}</button><button class="btn rs" data-act="loc-no" data-id="${o.id}">${t('loc.no')}</button><button class="btn" data-act="close">${t('loc.later')}</button></div>`, 'card');
  }
  // Confirms the order, makes its invoice (nothing paid yet) and opens WhatsApp with the confirmation message
  async function doConfirmOrder(o) {
    const its = orderItemsLeft(o); if (!its.length) return toast(t('ord.noneLeft'));
    let who = o.name; if (peopleOn) { who = await resolveOrderCustomer(o); if (!who) return; if (!orderItemsLeft(o).length) return toast(t('ord.noneLeft')); }
    try {
      if ((o.option === 'delivery' || o.option === 'pickup') && o.deliveryPrice > 0) its[0].delivery = o.deliveryPrice;   // a pickup spot carries its small fee too
      const inv = L.createInvoice(state, { itemIds: its.map((x) => x.id), client: who, paying: '0', allowZero: true });
      if (sharedBusiness()) inv.by = myName();   // who made it, once there is more than one person in the business
      save(); tidyPhotos();
      Store.setStatus(o.id, 'confirmed', { invoice: inv.no }).catch(() => toast(t('store.pubError')));
      waOpen(o, 'ord.waConfirm', inv);
      toast(t('inv.created', { no: inv.no, amount: money(inv.balance) })); render();
      setTimeout(() => prefetchPdf(inv.no, true), 700); setTimeout(() => prefetchPdf(inv.no, true), 2500);
      setTimeout(() => { if (pageStack.length && pageStack[pageStack.length - 1].key === 'order|' + o.id) sheetOrder(o.id, true); }, 600);
    } catch (e) { toast('⚠️ ' + errMsg(e)); }
  }
  function declineOrder(id) {
    return askCard(t('ord.declineAsk'), { danger: true, ok: t('ord.decline') }).then((y) => { if (y) { const o = Store.orders().find((x) => x.id === id); Store.setStatus(id, 'declined').then(() => { toast(t('ord.declined')); dropPages('order|' + id); if (o) waOpen(o, 'ord.waDeclined'); }).catch(() => toast(t('store.pubError'))); } });
  }
  // The newest invoice of an order (a payment makes a new invoice number) and whether it has been sent
  const latestInvOf = (o) => { const first = orderInvoice(o); if (!first) return null; const ch = L.invoiceForward(state, first); return ch.length ? ch[ch.length - 1] : state.invoices.find((x) => x.no === first) || null; };
  function markInvSent(o, no) { Store.patch(o.id, { invSentNo: no, invSentAt: Date.now() }).then(() => { toast(t('ck.sentToast')); setTimeout(() => { if (pageStack.length && pageStack[pageStack.length - 1].key === 'order|' + o.id) sheetOrder(o.id, true); }, 500); }).catch(() => toast(t('store.pubError'))); }

  /* ---------- top-bar tools ---------- */

  const periodLabel = (p) => ({ all: t('flt.allTime'), thisMonth: t('flt.thisMonth'), lastMonth: t('flt.lastMonth'), thisYear: t('flt.thisYear') }[p] || p);
  function filterLabel() { return periodLabel(flt.period) + (flt.batch !== 'all' ? ' · ' + bl(flt.batch) : ''); }

  function sheetFilter() {
    const y = new Date().getFullYear();
    const periods = ['all', 'thisMonth', 'lastMonth', 'thisYear', String(y - 1)];
    const chip = (act, id, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-id="${esc(id)}">${esc(label)}</button>`;
    openSmall(`<h3>${t('flt.title')}</h3><p class="muted small">${t('flt.note')}</p>
      <h2>${t('flt.period')}</h2><div class="suggest">${periods.map((k) => chip('set-period', k, periodLabel(k), flt.period === k)).join('')}</div>
      <h2>${t('flt.batch')}</h2><div class="suggest">${chip('set-fbatch', 'all', t('flt.allBatches'), flt.batch === 'all')}${state.batches.slice().sort((a, b) => b.num - a.num).map((b) => chip('set-fbatch', b.id, bl(b.id), flt.batch === b.id)).join('')}</div>
      <div class="btns"><button class="btn" data-act="clear-filter">${t('flt.clear')}</button><button class="btn primary" data-act="close">${t('btn.done')}</button></div>`, 'sheet');
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

  // Nothing downloads on a single tap: a card asks first (Yes / Cancel), in case it was tapped by mistake.
  const confirmDownload = (file, fn) => askCard(t('dl.ask', { name: file }), { title: t('dl.askTitle'), ok: t('dl.yes') }).then((ok) => { if (ok) fn(); });
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

  if (window.SelectPicker) SelectPicker.install(() => ({ cancel: t('btn.cancel'), done: t('btn.done'), search: t('pick.search'), choose: t('pick.choose'), none: t('people.noMatch') }));   // our own picker instead of the browser's list
  const KEEP_SCROLL = new Set(['ds-charge', 'ds-count', 'ds-mode', 'offer-toggle', 'fr-on', 'cp-on', 'cp-kind', 'fr-tier-del', 'area-mode', 'place-on', 'risk-flag', 'band-on', 'band-del', 'spot-on', 'spot-del', 'pl-filter', 'pl-search-close', 'hot-remove', 'zone-starter', 'zone-starter-hot']);
  document.addEventListener('click', (e) => {
    if (e.target.id === 'scrim') return closeSheet();
    if (e.target.id === 'tmscrim') return closeTopMenu();
    if (e.target.closest && e.target.closest('#tmenu')) setTimeout(closeTopMenu, 0);   // a menu row does its job, then the menu closes
    if (comboOpen && !e.target.closest('#combo')) { comboOpen = false; const pop = $('#combopop'); if (pop) pop.hidden = true; const ar = document.querySelector('.combo-btn i'); if (ar) ar.textContent = '▾'; }
    const t_ = e.target.closest('[data-tab],[data-act]'); if (!t_) return;
    if (t_.dataset.tab) { themeDraft = null; if (!$('#sheet').hidden) closeSheet(); go({ tab: t_.dataset.tab, moreView: null }); window.scrollTo(0, 0); return render(); }
    const id = t_.dataset.id;
    if (/^(photo|ed|viewer)-/.test(t_.dataset.act || '')) return PUI.act(t_.dataset.act, id, t_);
    { const a = t_.dataset.act, need = a === 'more' && /^(set-business|set-invdesign)$/.test(id || '') ? 'storeSettings' : ACT_NEEDS[a]; if (/^(team|perm|xfer|req)-/.test(a) || a === 'reset' ? !can('team') : need && !can(need)) return toast(t('team.noAccess')); }
    // These switches redraw their page; the page must stay exactly where it was scrolled.
    if (KEEP_SCROLL.has(t_.dataset.act)) { const sh0 = $('#sheet'), y0 = sh0.scrollTop, w0 = window.scrollY; queueMicrotask(() => { sh0.scrollTop = y0; if (window.scrollY !== w0) window.scrollTo(0, w0); }); }
    switch (t_.dataset.act) {
      case 'team-open': return sheetTeam();
      case 'req-open': return sheetRequest(id);
      case 'req-rank': reqRank[id] = t_.dataset.rank; return sheetRequest(id);
      case 'req-approve': { const r = joinReqs.find((x) => x.uid === id); return r && Cloud.approve(id, reqRank[id] || 'seller', r.name || r.email || '').then(() => { delete reqRank[id]; dropPages('req|' + id); toast(t('team.approved', { name: r.name || r.email || '' })); }).catch(() => toast(t('store.pubError'))); }
      case 'req-decline': return Cloud.decline(id).then(() => { dropPages('req|' + id); toast(t('team.declined')); }).catch(() => toast(t('store.pubError')));
      case 'perm-open': return sheetPerms();
      case 'team-reqrank': reqRank[id] = t_.dataset.rank; return sheetTeam();
      case 'team-approve': { const r = joinReqs.find((x) => x.uid === id); return r && Cloud.approve(id, reqRank[id] || 'seller', r.name || r.email || '').then(() => { delete reqRank[id]; toast(t('team.approved', { name: r.name || r.email || '' })); }).catch(() => toast(t('store.pubError'))); }
      case 'team-decline': return Cloud.decline(id).then(() => toast(t('team.declined'))).catch(() => toast(t('store.pubError')));
      case 'team-person': return sheetPerson(id);
      case 'team-refresh': reqFetched = 0; toast(t('team.checking')); return Cloud.refreshRequests().then((l) => toast(l.length ? t('team.found', { n: l.length }) : t('team.noneWaiting'))).catch((e) => { reqErr = (e && e.code) || 'error'; sheetTeam(); toast(t('team.reqError')); });
      case 'team-check': toast(t('team.checking')); return Cloud.checkSharing().then((r) => { const word = (v) => (v === 'ok' ? t('team.chk.ok') : v === 'nocode' ? t('team.chk.nocode') : v === 'missing' ? t('team.chk.missing') : t('team.chk.fail', { code: v })); askCard(t('team.chk.team') + ': ' + word(r.team) + ' · ' + t('team.chk.code') + ': ' + word(r.code) + ' · ' + t('team.chk.requests') + ': ' + word(r.requests), { title: t('team.check'), ok: t('btn.close'), no: t('btn.cancel') }); }).catch(() => toast(t('store.pubError')));
      case 'team-setrank': return Cloud.setRank(teamPick, id).then(() => { closeSheet(); toast(t('team.rankSet')); }).catch(() => toast(t('store.pubError')));
      case 'team-remove': { const uid = teamPick, nm = (team.names && team.names[uid]) || t('team.unnamed'); closeSheet(); return askCard(t('team.removeAsk', { name: nm }), { danger: true, ok: t('team.remove') }).then((y) => { if (y) Cloud.removeMember(uid).then(() => toast(t('team.removed'))).catch(() => toast(t('store.pubError'))); }); }
      case 'team-copy': return (navigator.clipboard ? navigator.clipboard.writeText(team.code) : Promise.reject()).then(() => toast(t('team.copied')), () => toast(team.code));
      case 'team-newcode': return askCard(t('team.newCodeAsk'), { ok: t('team.newCode') }).then((y) => { if (y) Cloud.newCode().then(() => toast(t('team.newCodeDone'))).catch(() => toast(t('store.pubError'))); });
      case 'perm-toggle': { const [r, c] = id.split(':'), P = Team.fill(team.perms); P[r][c] = !P[r][c]; savePerms(P).catch(() => toast(t('store.pubError'))); sheetPerms(); return render(); }
      case 'xfer-open': return xferStart();
      case 'xfer-pick': closeSheet(); return xferSteps(id);
      case 'xfer-go': { const to = xferTo; closeSheet(); return Cloud.transfer(to).then(() => { dropPages('team|'); toast(t('xfer.done')); }).catch(() => toast(t('store.pubError'))); }
      case 'close': return pageBack();
      case 'view': hideAmounts = !hideAmounts; setPref('hideAmounts', hideAmounts); return render();
      case 'set-theme': theme = id; setPref('theme', theme); applyTheme(); closeSheet(); return render();
      case 'set-lang': I.setLang(id, true); applyStaticText(); closeSheet(); return render();
      case 'inv-swap': return sheetInvoice(id, true);
      case 'inv-lang': { if (id === 'auto') { invLangSession = null; invLangAuto = true; } else { invLangSession = id; invLangAuto = false; } return sheetInvoice(t_.dataset.no); }
      case 'cl-pick': { const f = window.__clLang; if (f) f(id); closeSheet(); return; }
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
      case 'gate-google': homeAfterSignIn = true; return Cloud.signInGoogle().then(() => toast(t('acct.signedIn')), (e) => gateErr(acctErr(e)));
      case 'gate-newbiz': return Cloud.createBusiness('').catch((e) => gateErr(t('gate.err', { m: (e && e.message) || '' })));
      case 'pw-eye': { const i = t_.parentNode.querySelector('input'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; t_.textContent = show ? '🙈' : '👁'; t_.setAttribute('aria-label', t(show ? 'acct.hidePw' : 'acct.showPw')); return; }
      case 'gate-joinbiz': gateJoin = true; gateView = null; return updateGate();
      case 'gate-joinback': gateJoin = false; gateView = null; return updateGate();
      case 'gate-cancelreq': return Cloud.cancelJoin();
      case 'gate-tryagain': return Cloud.cancelJoin().then(() => { gateJoin = true; gateView = null; updateGate(); });
      case 'gate-removed-ok': gateJoin = false; return Cloud.cancelJoin();
      case 'gate-forgot': case 'acct-forgot': { const em = ($('#f-gate [name=email]') || $('#f-acct [name=email]') || {}).value; if (em) rememberEmail(em.trim()); closeSheet(); gateForgot = true; gateView = null; updateGate(); return; }
      case 'gate-forgotback': gateForgot = false; gateMode = 'in'; gateView = 'auth'; $('#gate').innerHTML = gateHTML('auth'); return;
      case 'gate-color': gateDraft.palette = id; regate(); return;
      case 'acct-open': if (cloud.signedIn) return sheetAccount(); closeSheet(); gateForced = true; gateMode = hasData() ? 'in' : 'create'; gateView = null; updateGate(); return;
      case 'signin-dismiss': setPref('signinDismissed', Date.now()); return render();
      case 'acct-google': homeAfterSignIn = true; return acctDone(Cloud.signInGoogle());
      case 'acct-out': return Cloud.signOut().then(() => { closeSheet(); gateJoin = false; gateForced = true; gateMode = 'in'; gateView = null; updateGate(); toast(t('acct.signedOut')); });
      case 'conflict': { const f = window.__conflict; if (f) f(id); closeSheet(); return; }          // answer first: closing the pop-up counts as 'cancel'
      case 'bell': notifTab = 'all'; return sheetNotifs();
      case 'notif-tab': notifTab = id; return sheetNotifs();
      case 'notif-read': notifMarkSeen(); return sheetNotifs();
      case 'notif-go': return notifGo(Number(id));
      case 'filter': return sheetFilter();
      case 'tsearch-open': return openTopSearch();
      case 'tsearch-close': return closeTopSearch();
      case 'tsearch-clear': { const f = $('#tsearch input'); if (f) { f.value = ''; f.focus(); f.dispatchEvent(new Event('input', { bubbles: true })); } return; }
      case 'tmenu': return openTopMenu(id);
      case 'settings':
        closeSheet();
        if (isSettings()) { themeDraft = null; while (places.length > 1 && isSettings()) placeBack(); if (isSettings()) go({ tab: 'home', moreView: null }); }   // the gear closes Settings again: back to where you were
        else go({ tab: 'more', moreView: 'settings' });
        window.scrollTo(0, 0); return render();
      case 'pick-lang': return sheetChoice(t('set.language'), 'set-lang', I.getLang(), Object.keys(I.LANGS).map((l) => [l, I.LANGS[l]['lang.name']]));
      case 'pick-appearance': return sheetChoice(t('set.appearance'), 'set-theme', theme, [['light', t('set.light')], ['dark', t('set.dark')], ['auto', t('set.auto')]]);
      case 'share-lang': { const f = window.__shareLang; if (f) f(id); closeSheet(); return; }     // answer first: closing the pop-up counts as 'cancel'
      case 'pick-custlang': return sheetChoice(t('set.custLang'), 'set-custlang', custMode(), [['auto', t('cust.auto')], ...Object.keys(I.LANGS).map((l) => [l, I.LANGS[l]['lang.name']]), ['app', t('cust.same')], ['ask', t('cust.ask')]], t('cust.note'));
      case 'pick-keep': return sheetChoice(t('set.keepRow'), 'set-keep', photoKeep(), ['1', '2', '7', 'sold'].map((k) => [k, t('keep.' + k)]), t('keep.note'));
      case 'set-keep': state.settings.photoKeep = id; save(); closeSheet(); PUI.sweep(photoKeep()); return render();
      case 'return-open': { const ro = t_.dataset.ord || ''; return askCard(t('ret.popDesc'), { title: t('ret.popTitle'), ok: t('ret.popOk'), no: t('ret.popNo') }).then((y) => { if (y) sheetReturn(id, ro); }); }
      case 'ret-all': { const bx = [...document.querySelectorAll('#sheet [data-ret]')], on = bx.some((e) => !e.checked); bx.forEach((e) => { e.checked = on; }); return retRefresh(); }
      case 'ret-do': { const box = $('#rt-sum'), ids = retPicked(), inv = box && box.dataset.inv, ordId = box && box.dataset.ord; if (!ids.length) return;
        try {
          const r = L.returnItems(state, inv, ids, undefined, 'returned', parseAmt(($('#rt-fee') || {}).value)); save(); tidyPhotos(); closeSheet();
          const money_ = r.owesFee > 0 ? t('ret.doneOwes', { amount: plain(money(r.owesFee)) }) : r.refund > 0 ? t('ret.doneRefund', { amount: plain(money(r.refund)) }) : tn('ret.done', ids.length);
          const po = ordId && Store.orders().find((x) => x.id === ordId);
          if (po && r.all) Store.setStatus(ordId, 'declined', { returned: true }).catch(() => toast(t('store.pubError')));
          render(); toast(money_);
          if (po && !r.all) sheetOrder(ordId); else if (po) dropPages('order|' + ordId);
        } catch (e) { toast('⚠️ ' + errMsg(e)); }
        return; }
      case 'pay-inv': payOrd = t_.dataset.ord || ''; return sheetPay(id);
      case 'pay-full-amt': { if (payInv) { $('#pay-amt').value = String(payInv.balance); payUpdate(); } return; }
      case 'pay-save': {
        const amt = parseAmt($('#pay-amt').value), dv = $('#pay-date').value, date = dv ? new Date(dv + 'T12:00:00') : new Date(), inv0 = state.invoices.find((x) => x.no === id);
        if (!inv0 || !(amt > 0)) return;
        payPending = { id, amt, dv, text: $('#pay-amt').value, date };
        const left = Math.round((inv0.balance - amt) * 100) / 100, paidOff = left <= 0.004;
        const row = (a, b, c) => `<div class="pcr"><span>${a}</span><b${c ? ` class="${c}"` : ''}>${b}</b></div>`;
        return openSmall(`<h3>${t('pay.cfTitle')}</h3><p class="muted small" style="margin:0 0 6px">${esc(inv0.no)} · ${esc(clabel(inv0.client))}</p>${row(t('pay.cfNow'), money(amt))}${row(t('pay.cfAfter'), money(Math.max(0, left)), paidOff ? 'ok' : 'owe')}${row(t('pay.cfStatus'), paidOff ? '✓ ' + t('pay.afterPaid') : t('ord.pl.owing'), paidOff ? 'ok' : 'owe')}
          <div class="btns"><button class="btn primary" data-act="pay-go" data-id="${esc(id)}">${t('pay.cfYes')}</button><button class="btn" data-act="pay-no">${t('pay.cfNo')}</button></div>`, 'card');
      }
      case 'pay-no': { const pp = payPending; closeSheet(); setTimeout(() => { const el = $('#pay-amt'); if (el && pp) { el.value = pp.text; payUpdate(); } }, 380); return; }
      case 'pay-go': {
        const pp = payPending; if (!pp || pp.id !== id) return; payPending = null; closeSheet();
        try { const inv = L.recordPayment(state, id, pp.amt, pp.date); if (sharedBusiness()) inv.by = myName(); save(); tidyPhotos(); prefetchPdf(inv.no, true);   // the new invoice's PDF is drawn right now (both languages), so Send answers at once
          toast(t('pay.saved', { no: inv.no })); pageStack = pageStack.filter((p) => p.key !== 'pay|' + id && p.key !== 'invoice|' + id); render(); if (payOrd && Store.orders().some((x) => x.id === payOrd)) { const back = payOrd; payOrd = ''; return sheetOrder(back); } return sheetInvoice(inv.no); } catch (e) { return toast('⚠️ ' + errMsg(e)); }
      }
      case 'free-thumbs': { const n = Number(t_.dataset.n) || 0; return askCard(t('about.thumbsAsk', { n, mb: t_.dataset.mb })).then((y) => { if (!y) return; return PUI.removeOldThumbs().then((r) => { toast(t('about.freed', { mb: fmtBytes(r.bytes) })); fillAbout(); }); }); }
      case 'free-space': { const n = Number(t_.dataset.n) || 0; return askCard(t('about.freeAsk', { n, mb: t_.dataset.mb })).then((y) => { if (!y) return; return PUI.freeOriginals().then((r) => { toast(t('about.freed', { mb: fmtBytes(r.bytes) })); fillAbout(); }); }); }
      case 'set-custlang': setPref('custLangV2', id); closeSheet(); return render();
      case 'check-update': return checkUpdate();
      case 'check-rules': return checkRules();
      case 'draft-palette': themeDraft = id; return render();
      case 'apply-palette': if (!themeDraft) return; state.settings.palette = themeDraft; Theme.apply(themeDraft); themeDraft = null; applyTheme(); save(); toast(t('set.applied')); return render();
      case 'set-period': flt.period = id; setPref('filter', flt); render(); return sheetFilter();
      case 'set-fbatch': flt.batch = id; setPref('filter', flt); render(); return sheetFilter();
      case 'bl-clear-all': blF = { store: [], status: [], items: [] }; return render();
      case 'filter-clear-all': flt = { period: 'all', batch: 'all' }; setPref('filter', flt); return render();
      case 'clear-filter': flt = { period: 'all', batch: 'all' }; setPref('filter', flt); render(); return sheetFilter();
      case 'csv': return confirmDownload(`b-ruiz-${id}.csv`, () => download(`b-ruiz-${id}.csv`, csvOf(id), 'text/csv'));
      case 'new-batch': return sheetNewBatch();
      case 'pay-clearing': return sheetPayClearing();
      case 'receive': return sheetReceive();
      case 'batch': return sheetBatch(id);
      case 'do-receive': return askReceived(id);
      case 'recv-yes': return run(() => L.makeAvailable(state, id), (n) => t('recv.done', { id: bl(id), n }));
      case 'ask-yes': { const f = window.__ask; if (f) f(true); return closeSheet(); }       // answer first: closing the card counts as 'no'
      case 'batch-more': return openSmall(`<h3>${t('batch.more')}</h3><div class="list" style="margin-top:12px"><button class="row tap" data-act="open-clearing" data-id="${id}"><span style="font-size:22px">💳</span><div class="grow"><b>${t('batch.openClearing')}</b><small>${t('batch.openClearingSub')}</small></div></button></div><div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet');
      case 'open-clearing': clearOpen.add(id); return closeSheet();
      case 'close-batch': return askCard(t('confirm.close', { id: bl(id) }), { danger: true, ok: t('batch.close') }).then((y) => { if (y) run(() => L.closeBatch(state, id), t('batch.closed', { id: bl(id) })); });
      case 'del-batch': return askCard(t('confirm.delBatch', { id: bl(id) }), { danger: true, ok: t('batch.deleteShort') }).then((y) => { if (y) run(() => L.deleteBatch(state, id), t('batch.deleted', { id: bl(id) })); });
      case 'mic': return voiceToggle(false);
      case 'mic-es': return voiceToggle(true);
      case 'mic-en': return voiceToggle('en');
      case 'en-open': return sheetEnglish(id);
      case 'en-addwords': return sheetAddWordsEn(id);
      case 'en-savewords': { let words = wordList(); document.querySelectorAll('#sheet [data-ws]').forEach((inp) => { const en = inp.value.trim(); if (en) words = Wd.put(words, en, inp.dataset.ws, '', (inp.closest('.wb').querySelector('[data-wt]') || {}).value || 'a'); }); state.settings.words = words; save(); return sheetEnglish(id); }
      case 'en-done': { const i = state.items.find((x) => x.id === id), v = ($('#en-name').value || '').trim(); if (i && v) { const es = Wd.spanish(i, wordList()).es; i.desc = v; i.enSet = true; i.enFor = es; if (i.esSet) i.esFor = i.desc; L.applyToGroup(state, i, ['desc', 'esFor', 'enSet', 'enFor']); save(); refreshEs(i); refreshAfterEdit(i); } return closeSheet(); }
      case 'es-open': return sheetSpanish(id);
      case 'es-addwords': return sheetAddWords(id);
      case 'es-savewords': { document.querySelectorAll('.sheet .wb').forEach((row) => { const inp = row.querySelector('[data-w]'), sel = row.querySelector('[data-wt]'); if (inp.value.trim()) state.settings.words = Wd.put(wordList(), inp.dataset.w, inp.value, '', sel ? sel.value : 'a'); }); save(); toast(t('words.saved')); return closeSheet(); }
      case 'es-done': { const i = state.items.find((x) => x.id === id), v = ($('#es-name').value || '').trim(); if (i) { const auto = Wd.translate(i.desc, wordList()); if (!v || (v === auto.es && !auto.missing.length)) { i.esSet = false; delete i.nameEs; delete i.esFor; } else { i.nameEs = v; i.esSet = true; i.esFor = i.desc; } L.applyToGroup(state, i, ['nameEs', 'esSet', 'esFor']); save(); } return closeSheet(); }
      case 'es-lib': closeSheet(); return sheetWords();
      case 'size-set': { const i = state.items.find((x) => x.id === id); if (!i) return; if (L.isLocked(i)) return lockToast(i); const v = t_.dataset.v; i.size = String(i.size || '').toLowerCase() === v.toLowerCase() ? '' : v; save(); return refreshSize(i); }
      case 'qty-inc': case 'qty-dec': { const it = state.items.find((x) => x.id === id); if (!it) return; const g = grpOf(it).length; return setQty(it, g + (t_.dataset.act === 'qty-inc' ? 1 : -1)); }
      case 'scope-pick': { const f = window.__scope; if (f) f(t_.dataset.v); return closeSheet(); }
      case 'slots-add': case 'slots-use': { const f = window.__slots; if (f) f(t_.dataset.act === 'slots-add' ? 'add' : 'use'); return closeSheet(); }
      case 'szp-open': { const it = state.items.find((x) => x.id === id); if (!it) return; if (L.isLocked(it)) return lockToast(it); return szpOpen(it, !!t_.dataset.single); }
      case 'szp-tap': if (holdFired) { holdFired = false; return; } return szpTap(t_.dataset.v);
      case 'szp-pop': return szpPopOpen(t_.dataset.v);
      case 'szp-tab': szp.tab = t_.dataset.v; szp.pop = null; return szpDraw();
      case 'szp-sys': szp.sys = t_.dataset.v; return szpDraw();
      case 'szp-view': szp.view = t_.dataset.v === 'add' ? 'add' : 'grid'; return szpDraw();
      case 'szp-addsave': return szpSaveTyped();
      case 'szp-popx': szp.pop = null; return szpDraw();
      case 'szp-popset': { const z = szp.pop, cur = szp.d[z] || 0, max = szp.n - (szpTotal() - cur); let v = Math.max(0, parseInt(($('#szp-n').value || '0').replace(/\D/g, ''), 10) || 0); v = Math.min(v, max); if (v) szp.d[z] = v; else delete szp.d[z]; szp.pop = null; return szpDraw(); }
      case 'szp-all': { $('#szp-n').value = t_.dataset.v; return; }
      case 'szp-zero': { $('#szp-n').value = '0'; return; }
      case 'szp-rest': { const z = szp.last, rest = szp.n - szpTotal(); if (z && rest > 0) { szp.d[z] = (szp.d[z] || 0) + rest; szpDraw(); } return; }
      case 'szp-done': { const ok = szp.single ? szpTotal() === 1 : szpTotal() === szp.n; if (!ok) return toast(szp.single ? t('szp.pickOne') : t('szp.mustMatch', { n: szp.n })); if (szpApply()) { qeTried = false; closeSheet(); } return; }
      case 'size-other': { const i = state.items.find((x) => x.id === id); if (!i) return; if (L.isLocked(i)) return lockToast(i); return openSmall(`<h3>${t('size.label')}</h3><p>${t('size.otherSub')}</p><input id="size-in" value="${esc(i.size || '')}" placeholder="${t('size.ph')}" autocomplete="off" maxlength="20"><div class="btns"><button class="btn primary" data-act="size-save" data-id="${id}">${t('btn.save')}</button><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet'); }
      case 'size-save': { const i = state.items.find((x) => x.id === id); if (i) { i.size = ($('#size-in').value || '').trim().slice(0, 20); save(); } return closeSheet(); }
      case 'store-left': { const c = storeCfg(); state.settings.store = Object.assign(c, { showLeft: !c.showLeft }); save(); t_.classList.toggle('on', !!state.settings.store.showLeft); t_.setAttribute('aria-checked', String(!!state.settings.store.showLeft)); return; }
      case 'store-more': return openSmall(`<h3>${t('batch.more')}</h3><div class="ap" style="padding:12px 0 0"><div class="card" style="margin:0"><div class="rw"><div class="t"><b>${t('store.left')}</b><small>${t('store.leftSub')}</small></div>${swt('store-left', 'showLeft', storeCfg().showLeft)}</div></div></div><div class="list" style="margin-top:12px"><button class="row tap" data-act="store-help"><span style="font-size:22px">💡</span><div class="grow"><b>${t('sh.menu')}</b><small>${t('sh.menuSub')}</small></div></button></div><div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet');
      case 'store-help': closeSheet(); return sheetStoreHelp();
      case 'sh-lang': shLang = id; return sheetStoreHelp(true);
      case 'words-open': return sheetWords();
      case 'page-more': { const cur = state.items.find((x) => x.id === $('#sheet').dataset.item), sp = cur && cur.grp && !L.isLocked(cur) && grpOf(cur).length > 1 ? `<button class="row tap" data-act="split-group" data-id="${cur.id}"><span style="font-size:22px">🧩</span><div class="grow"><b>${t('grp.split')}</b><small>${t('grp.splitSub')}</small></div></button>` : ''; return openSmall(`<h3>${t('batch.more')}</h3><div class="list" style="margin-top:12px">${sp}<button class="row tap" data-act="words-from-menu"><span style="font-size:22px">🔤</span><div class="grow"><b>${t('words.openLib')}</b><small>${t('words.openLibSub', { n: wordList().length })}</small></div></button></div><div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet'); }
      case 'words-from-menu': closeSheet(); return sheetWords();
      case 'word-group': wordGroup = id; return wordsRefresh();
      case 'word-hide': state.settings.wordsHideNote = true; save(); { const n = document.querySelector('.starter'); if (n) n.remove(); } return;
      case 'word-add': { const en = $('#w-en'), es = $('#w-es'); if (!en.value.trim() || !es.value.trim()) return toast(t('words.needBoth')); state.settings.words = Wd.put(wordList(), en.value, es.value, '', $('#w-t').value); save(); en.value = ''; es.value = ''; wordGroup = 'all'; wordQ = ''; $('#w-q').value = ''; wordsRefresh(); toast(t('words.saved')); return en.focus(); }
      case 'words-more': return openSmall(`<h3>${t('batch.more')}</h3><div class="list" style="margin-top:12px"><button class="row tap" data-act="words-help"><span style="font-size:22px">💡</span><div class="grow"><b>${t('wh.menu')}</b><small>${t('wh.menuSub')}</small></div></button></div><div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet');
      case 'words-help': closeSheet(); return sheetWordsHelp();
      case 'wh-lang': whLang = id; return sheetWordsHelp(true);
      case 'word-edit': return sheetWordEdit(id);
            case 'word-save': { const en = ($('#we-en').value || '').trim(), es = ($('#we-es').value || '').trim(); if (!en || !es) return toast(t('words.needBoth')); const old = wordList().find((x) => Wd.norm(x.en) === Wd.norm(id)); let w = Wd.drop(wordList(), id); w = Wd.put(w, en, es, old ? old.c : '', $('#we-t').value); state.settings.words = w; save(); return closeSheet(); }
      case 'word-del': case 'word-del2': state.settings.words = Wd.drop(wordList(), id); save(); toast(t('words.removed')); if (t_.dataset.act === 'word-del2') return closeSheet(); return wordsRefresh();
      case 'item-go': if (id) { if ($('#inavpill')) slideItem(id, t_.classList.contains('r') || t_.dataset.dir === 'next' ? 1 : -1); else { sheetItem(id, true); $('#sheet').scrollTop = 0; } } return;
      case 'qe-open': { const ids = quickIds(id); if (!ids.length) return toast(t('qe.none')); qeTried = false; return sheetQuick(id, ids[0]); }
      case 'qe-go': if (id) { qeTried = false; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); const it = state.items.find((x) => x.id === id); if (it) { sheetQuick(it.batchId, id, true); $('#sheet').scrollTop = 0; } } return;
      case 'qe-next': return quickNext(id, !!t_.dataset.skip);
      case 'open-stock': stockBatch = id; stockFilter = 'All'; closeSheet(); go({ tab: 'stock', moreView: null }); return render();
      case 'quick-sale': return sheetQuickSale();
      case 'goto-publish': if (!$('#sheet').hidden) closeSheet(); go({ tab: 'sell', moreView: null }); render(); return requestAnimationFrame(() => { const b = document.querySelector('.pubbtn'); if (b) { b.scrollIntoView({ block: 'center' }); b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 2500); } });
      case 'goto-stock': go({ tab: 'stock', moreView: null }); render(); window.scrollTo(0, 0); return requestAnimationFrame(() => window.scrollTo(0, 0));
      case 'grp-toggle': grpOpen.has(id) ? grpOpen.delete(id) : grpOpen.add(id); return render();
      case 'sel-all': { state.items.filter((i) => i.batchId === stockBatch && !L.isLocked(i)).forEach((i) => selected.add(i.id)); return render(); }
      case 'sel-clear': selected.clear(); return render();
      case 'sale-open': return sheetSale();
      case 'sale-pick': salePct = Number(t_.dataset.v); salePctDraw(); return;
      case 'sale-other': if (document.querySelector('#bulksale')) { salePct = 0; salePctDraw(true); return; } { const f = $('#sheet [data-f=discount]'); if (f) { f.focus(); f.select(); } return; }
      case 'sale-apply': { const ids = [...selected], v = document.querySelector('#sale-in') ? parsePct($('#sale-in').value) : salePct; if (!(v > 0)) return toast(t('sale.pickFirst')); const n = L.bulkSale(state, ids, v); save(); closeSheet(); render(); return toast(tn('sale.done', n, { pct: v })); }
      case 'sale-off': { const n = L.clearSale(state, [...selected]); save(); closeSheet(); render(); return toast(tn('sale.off', n)); }
      case 'split-group': { const it = state.items.find((x) => x.id === id); if (it) { L.splitFromGroup(state, id); save(); closeSheet(); render(); toast(t('grp.splitDone')); } return; }
      case 'goto-sell': go({ tab: 'sell', moreView: 'invoice' }); window.scrollTo(0, 0); return render();
      case 'pick-batch': stockBatch = id; if (stockFilter === 'NoPrice') stockFilter = 'All'; return render();
      case 'batch-pick': return sheetBatchPick();
      case 'batch-pick-do': stockBatch = id; stockFilter = 'All'; closeSheet(); window.scrollTo(0, 0); return render();
      case 'batch-info': return sheetBatchInfo(id);
      case 'pick-filter': stockFilter = id; return render();
      case 'edit-item': { const iv = t_.dataset.inv, od = t_.dataset.ord, bt = t_.dataset.bt; itemNavIds = bt ? state.items.filter((x) => x.batchId === bt).map((x) => x.id).sort() : iv ? state.items.filter((x) => x.invoice === iv).map((x) => x.id).sort() : od ? ((Store.orders().find((o) => o.id === od) || {}).items || []).map((x) => x.id).filter((x) => state.items.some((y) => y.id === x)).sort() : null; return sheetItem(id); }
      case 'toggle-sale': { const it = state.items.find((x) => x.id === id); if (!it) return; if (L.isLocked(it)) return lockToast(it); return setSale(it, !it.saleOn, null); }
      case 'sale-pct': { const it = state.items.find((x) => x.id === id); if (!it) return; if (L.isLocked(it)) return lockToast(it); return setSale(it, true, Number(t_.dataset.v)); }
      case 'use-rec': { const it = state.items.find((x) => x.id === id); if (!it) return; if (L.isLocked(it)) return lockToast(it); const c = L.itemCalc(batchOf(it), it); if (!c.recommended) return toast(t('item.noRec')); const old = it.price; if (onQuick()) { it.price = c.recommended; L.applyToGroup(state, it, ['price']); save(); const f = $('#sheet [data-f=price]'); if (f) f.value = c.recommended; return updateSale(it); } return setPrice(it, c.recommended, old); }
      case 'sx-go': { const el = document.getElementById('sx-' + id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      case 'unselect': selected.delete(id); return render();
      case 'select-close': { const it = state.items.find((x) => x.id === id); if (it && L.isLocked(it)) return lockToast(it); if (it) { L.prefillSold(it); save(); } selected.add(id); closeSheet(); } return toast(t('item.added'));
      case 'unselect-close': selected.delete(id); closeSheet(); return;
      case 'store-share': { const c = storeCfg(); if (!c.id) return sheetStore(); const url = Store.link(c), name = c.name || bizName(); if (navigator.share) return navigator.share({ title: name, text: t('store.shareText', { name }), url }).catch(() => {}); return copyText(url).then((ok) => toast(ok ? t('store.copied') : url)); }
      case 'store-preview': { const c = storeCfg(); if (!c.id) return sheetStore(); window.open(Store.link(c), '_blank', 'noopener'); return; }
      case 'store-link': { const c = storeCfg(); if (!c.id) return sheetStore(); return copyText(Store.link(c)).then((ok) => toast(ok ? t('store.copied') : Store.link(c))); }
      case 'store-open': return sheetStore();
      case 'store-settings': closeSheet(); return sheetStoreSettings();
      case 'pickup-open': return sheetPickup();
      case 'contact-open': return sheetContact();
      case 'store-create': storeSet({}); Store.publish(true).then(async () => { const c = storeCfg(), want = SCore.slugify(c.name || bizName()); if (c.slug || SCore.slugError(want) || !Store.claim) return; if (!(await Store.claim(want))) { storeSet({ slug: want }); Store.publish(true); if (!$('#sheet').hidden) sheetStore(); } }); return sheetStore();
      case 'store-slug': { const inp = $('#ct-slug'), name = SCore.slugify(inp ? inp.value : ''), msg = $('#ct-slugmsg'); if (inp) inp.value = name; if (msg) msg.textContent = t('slug.checking');
        return Store.claim(name).then((e) => { if (e) { if (msg) msg.textContent = t('slug.e.' + e); return; } storeSet({ slug: name }); Store.publish(true); toast(t('slug.saved')); if (msg) msg.textContent = ''; const u = $('#ct-slugurl'); if (u) u.textContent = Store.link(storeCfg()); }); }
      case 'store-addbatch': { const sc = storeCfg(); if (!sc.batches.includes(id)) storeSet({ batches: sc.batches.concat(id) }); toast(t('store.batchAdded')); return render(); }
      case 'store-toggle': { const c = storeCfg(); if (id === 'showPrices' && c.showPrices && !SCore.validPhone(c.whatsapp)) { toast(t('store.pricesNeedWa')); return; }   // with prices off, customers need a WhatsApp number to reach you
        storeSet({ [id]: !c[id] }); return hubOpen() ? render() : sheetStore(); }
      case 'batch-edit-jump': { const h = $('#bpg-items'); if (h) h.scrollIntoView({ behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); return; }
      case 'bl-tab': blTab = id; if (blSort.col !== 'batch' && !({ pl: ['invested', 'sales', 'pl'], owing: ['owing', 'people', 'waiting'] }[id] || []).includes(blSort.col)) blSort = { col: 'batch', dir: 'desc' }; return render();
      case 'goto-customers': go({ tab: 'people', moreView: null }); render(); window.scrollTo(0, 0); return requestAnimationFrame(() => window.scrollTo(0, 0));
      case 'goto-transit': blF = { store: [], status: ['transit'], items: [] }; blTab = 'overview'; go({ tab: 'more', moreView: 'batches' }); render(); window.scrollTo(0, 0); return requestAnimationFrame(() => window.scrollTo(0, 0));
      case 'goto-nopr': { stockFilter = 'NoPrice'; go({ tab: 'stock', moreView: null }); render(); window.scrollTo(0, 0); const end = () => { const c = $('.stchips'); if (c) c.scrollLeft = c.scrollWidth; }; end(); return requestAnimationFrame(() => { window.scrollTo(0, 0); end(); }); }   // the chip row is scrolled to the end so No price is in view
      case 'goto-owing': cuStat = 'owing'; cuQ = ''; go({ tab: 'people', moreView: null }); render(); window.scrollTo(0, 0); return requestAnimationFrame(() => window.scrollTo(0, 0));   // from Home: the Customer log already filtered to who owes
      case 'pr-mode': prMode = id; prCaption = null; return prRefresh();
      case 'pr-which': prWhich = id; prPicks = id === 'picks' ? new Set() : null; prCaption = null; return prRefresh();
      case 'pr-pick': { const cur = new Set(prChosen().map((x) => x.id)); if (cur.has(id)) cur.delete(id); else cur.add(id); prPicks = cur; return prRefresh(); }
      case 'gate-logo-pick': { const f = $('#gate-logo-file'); if (f) f.click(); return; }
      case 'logo-go': try { localStorage.setItem('buy-sell-pref:logoNudgeOff', 'true'); } catch (e) { /* shown again next time */ } go({ tab: 'more', moreView: 'set-business' }); window.scrollTo(0, 0); return render();
      case 'logo-pick': { const f = $('#logo-file'); if (f) f.click(); return; }
      case 'logo-remove': state.settings.bizLogo = ''; save(); Store.publish && Store.publish(true); return render();
      case 'pr-format': prFormat = id; prIdx = 0; return prRefresh();
      case 'pr-prev': case 'pr-next': { const n = prFiles.urls.length; if (n > 1) { prIdx = (prIdx + (t_.dataset.act === 'pr-next' ? 1 : n - 1)) % n; const im = $('#prprev .prpimg'), ct = $('#prprev .muted'); if (im) im.src = prFiles.urls[prIdx]; if (ct) ct.textContent = (prIdx + 1) + ' / ' + n; } return; }
      case 'pr-prices': prPrices = !prShowPrices(); prCaption = null; return prRefresh();
      case 'pr-share': return prShare(id);
      case 'pr-copy': return copyText(prCaptionNow()).then(() => toast(t('store.copied')));
      case 'pr-save': return prEnsure().then((files) => { if (!files.length) return toast(t('pr.noItems')); files.forEach((f) => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }); toast(t('pr.saved')); }).catch((e) => toast('⚠️ ' + errMsg(e)));
      case 'cu-tab': cuTab = id; return cuRefresh();
      case 'cu-chip': cuStat = id; return cuRefresh();
      case 'cu-sort': { if (cuSort.col === id) cuSort.dir = cuSort.dir === 'desc' ? 'asc' : 'desc'; else cuSort = { col: id, dir: id === 'name' || id === 'lastItem' ? 'asc' : 'desc' }; return cuRefresh(); }
      case 'it-tab': itTab = id; itSort = { col: 'item', dir: 'asc' }; itLimit = 100; return itRefresh();
      case 'it-chip': itStat = id; itLimit = 100; return itRefresh();
      case 'it-sort': { if (itSort.col === id) itSort.dir = itSort.dir === 'desc' ? 'asc' : 'desc'; else itSort = { col: id, dir: id === 'item' || id === 'customer' ? 'asc' : 'desc' }; return itRefresh(); }
      case 'it-group': itGroup = !itGroup; return itRefresh();
      case 'it-more': itLimit += 100; return itRefresh();
      case 'it-bpick': return sheetItBatches();
      case 'it-btoggle': itBatches = itBatches.includes(id) ? itBatches.filter((x) => x !== id) : itBatches.concat(id); itLimit = 100; return itPickRefresh();
      case 'it-bclear2': itBatches = []; itLimit = 100; return itPickRefresh();
      case 'it-bsel': { itBMatches().forEach((b) => { if (!itBatches.includes(b.id)) itBatches.push(b.id); }); itLimit = 100; return itPickRefresh(); }
      case 'it-bqx': { itBQ = ''; const f = document.querySelector('.itbq'); if (f) { f.value = ''; f.focus(); } return itPickRefresh(); }
      case 'it-bclear': itBatches = []; itLimit = 100; return itRefresh();
      case 'it-bdone': closeSheet(); return itRefresh();
      case 'bl-sort': { if (blSort.col === id) blSort.dir = blSort.dir === 'desc' ? 'asc' : 'desc'; else blSort = { col: id, dir: id === 'batch' ? 'asc' : 'desc' }; const l = $('#blog'); if (l) l.innerHTML = batchLogRows($('.blq') ? $('.blq').value : ''); return; }
      case 'inv-tab': invTab = id; return render();
      case 'inv-sort': { if (invSort.col === id) invSort.dir = invSort.dir === 'desc' ? 'asc' : 'desc'; else invSort = { col: id, dir: id === 'inv' ? 'asc' : 'desc' }; const l = $('#ilog'), w0 = document.getElementById('imwrap'), sx = w0 ? w0.scrollLeft : 0; if (l) l.innerHTML = invoiceLogRows(invQ); const w1 = document.getElementById('imwrap'), h1 = document.getElementById('imhd'); if (w1 && sx) { w1.scrollLeft = sx; if (h1) h1.scrollLeft = sx; } return; }   // keep the Money table where it was scrolled sideways
      case 'bl-filter-open': blDraft = null; return sheetBlFilter();
      case 'bl-chip': { const [g, k] = id.split(':'); if (!blDraft) blDraft = { store: blF.store.slice(), status: blF.status.slice(), items: blF.items.slice() }; blDraft[g] = blDraft[g].includes(k) ? blDraft[g].filter((x) => x !== k) : blDraft[g].concat(k); return sheetBlFilter(); }
      case 'bl-clear': blDraft = { store: [], status: [], items: [] }; return sheetBlFilter();
      case 'bl-apply': if (blDraft) blF = blDraft; blDraft = null; closeSheet(); return render();
      case 'bl-cancel': blDraft = null; return closeSheet();
      case 'batches-fold': setPref('hubBatchesOpen', !pref('hubBatchesOpen', false)); return render();
      case 'batches-log': go({ tab: 'more', moreView: 'batches' }); window.scrollTo(0, 0); return render();
      case 'store-batch-all': { const c = storeCfg(), all = state.batches.map((b) => b.id), on = all.every((x) => c.batches.includes(x)); storeSet({ batches: on ? [] : all }); return hubOpen() || (tab === 'more' && moreView === 'batches') ? render() : sheetStore(); }   // all on -> turn every batch off; otherwise turn every batch on
      case 'store-batch': { const c = storeCfg(); storeSet({ batches: c.batches.includes(id) ? c.batches.filter((x) => x !== id) : c.batches.concat(id) }); return hubOpen() || (tab === 'more' && moreView === 'batches') ? render() : sheetStore(); }
      case 'store-publish': toast(t('store.publishing')); Store.publish(true).then((ran) => { const inf = Store.info(); toast(inf.error === 'permission-denied' ? t('store.needRules') : inf.error === 'timeout' ? t('store.pubSlow') : inf.error ? t('store.pubError') : !ran && inf.busy ? t('store.stillPub') : !ran ? t('store.notRan') : t('store.donePub', { n: inf.count })); }); return;
      case 'store-loc': return sheetLocation(id);
      case 'sl-flag': { const on = !t_.classList.contains('on'); t_.classList.toggle('on', on); t_.setAttribute('aria-checked', on); return; }
      case 'store-loc-save': {
        const name = L.cleanName($('#sl-name').value), pickup = $('[data-act=sl-flag][data-id=pickup]').classList.contains('on'), delivery = $('[data-act=sl-flag][data-id=delivery]').classList.contains('on'), price = Math.max(0, parseFloat(String($('#sl-price').value).replace(',', '.')) || 0);
        if (!name) return toast(t('store.needLocName')); if (!pickup && !delivery) return toast(t('store.needOption'));
        const c = storeCfg(), old = c.locations.find((x) => x.id === id) || {}, modeSel = ($('#sl-mode') || {}).value || 'own', rgSel = $('#sl-rg'), flag = document.querySelector('[data-act=sl-flag][data-id=risk]'), risk = !!old.risk;
        const bandId = modeSel.startsWith('b:') ? modeSel.slice(2) : '', rm = modeSel === 'region', dm = modeSel === 'dist', priced = price > 0 || !!bandId || rm || dm, loc = { id: id === 'new' ? SCore.newId(8) : id, name, pickup, delivery, price, band: bandId, rm, dm, rg: rgSel ? rgSel.value : (old.rg || ''), risk, zone: old.zone || '', auto: !!old.auto && !priced, off: id === 'new' ? risk && c.areaMode === 'safe' : (old.auto && priced ? false : !!old.off) };
        if (loc.zone && name !== old.name) storeSet({ zones: c.zones.map((z) => (z.id === loc.zone ? Object.assign({}, z, { name }) : z)) });
        const list = id === 'new' ? c.locations.concat(loc) : c.locations.map((l) => (l.id === id ? loc : l)); storeSet({ locations: c.areaMode === 'safe' ? SCore.applyMode({ locations: list, bands: c.bands }, 'safe').locations : list }); pageStack = pageStack.filter((p) => p.key !== 'storeloc|' + id); return dropPages('storeloc|' + id);
      }
      case 'sl-band': { document.querySelectorAll('#sl-bands .chip').forEach((b) => b.classList.toggle('on', b === t_)); return; }
      case 'area-mode': { const c = storeCfg(), r = SCore.applyMode(c, id); storeSet({ areaMode: r.areaMode, locations: r.locations }); return sheetPickup(); }
      case 'place-on': { const c = storeCfg(); storeSet({ areaMode: 'custom', locations: c.locations.map((l) => (l.id === id ? Object.assign({}, l, { off: !l.off }) : l)) }); return refreshPick(); }
      case 'band-on': { const c = storeCfg(); storeSet({ bands: c.bands.map((b) => (b.id === id ? Object.assign({}, b, { on: !b.on }) : b)) }); return sheetPickup(); }
      case 'band-del': { const c = storeCfg(); storeSet({ bands: c.bands.filter((b) => b.id !== id) }); return sheetPickup(); }
      case 'band-add': return openSmall(`<h3>${t('pk.bandAdd')}</h3><form id="f-band"><label>${t('pk.bandPrice')}</label><input name="price" inputmode="decimal" placeholder="0.00" autocomplete="off" required><label>${t('pk.bandName')}</label><input name="name" autocomplete="off"><div class="btns"><button class="btn primary">${t('btn.save')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`, 'sheet');
      case 'risk-flag': { const c = storeCfg(), list = c.locations.map((l) => (l.id === id ? Object.assign({}, l, { risk: false }) : l)); storeSet({ locations: c.areaMode === 'safe' ? SCore.applyMode({ locations: list, bands: c.bands }, 'safe').locations : list }); return refreshPick(); }
      case 'risk-add': return sheetRisk();
      case 'risk-add-old': return openSmall(`<h3>${t('pk.riskAdd')}</h3><form id="f-risk"><label>${t('pk.riskName')}</label><input name="name" autocomplete="off" required><div class="btns"><button class="btn primary">${t('btn.save')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`, 'sheet');
      case 'spot-on': { const c = storeCfg(); storeSet({ spots: c.spots.map((x) => (x.id === id ? Object.assign({}, x, { on: !x.on }) : x)) }); return refreshPick(); }
      case 'spot-del': { const c = storeCfg(); storeSet({ spots: c.spots.filter((x) => x.id !== id) }); return refreshPick(); }
      case 'spot-add': case 'spot-edit': { const x = t_.dataset.act === 'spot-edit' ? storeCfg().spots.find((q) => q.id === id) : null; return openSmall(`<h3>${t(x ? 'pk.spotEdit' : 'pk.spotAdd')}</h3><form id="f-spot"><input type="hidden" name="sid" value="${x ? esc(x.id) : ''}"><label>${t('pk.spotName')}</label><input name="name" value="${x ? esc(x.name) : ''}" placeholder="${t('pk.spotNamePh')}" autocomplete="off" required><label>${t('pk.spotNote')}</label><input name="note" value="${x ? esc(x.note) : ''}" placeholder="${t('pk.spotNotePh')}" autocomplete="off"><div class="btns"><button class="btn primary">${t('pk.spotSave')}</button><button type="button" class="btn" data-act="close">${t('btn.cancel')}</button></div></form>`, 'sheet'); }
      case 'store-towns': {
        const c = storeCfg();
        return askCard(t('pk.townsAsk'), { ok: t('pk.townsOk') }).then((y) => { if (!y) return; const r = SCore.seedTT(c), next = SCore.applyMode({ locations: r.locations, bands: r.bands }, 'safe'); storeSet({ bands: r.bands, locations: next.locations, areaMode: 'safe' }); toast(t('pk.townsDone')); sheetPickup(); });
      }
      case 'store-loc-del': { const c = storeCfg(); if ((c.locations.find((l) => l.id === id) || {}).zone) return toast(t('pk.fromZone')); storeSet({ locations: c.locations.filter((l) => l.id !== id) }); return dropPages('storeloc|' + id); }
      case 'pin-open': return;   // the link itself opens Google Maps or Waze; this only stops the card behind it from reacting
      case 'dlv-tab': dlvTab = id; dlvDay = ''; return render();
      case 'ov-go': dlvTab = id === 'pickups' ? 'pickups' : 'deliveries'; dlvView = 'list'; dlvQ = ''; dlvDay = ''; if (!$('#sheet').hidden) closeSheet(); go({ tab: 'more', moreView: 'deliveries' }); window.scrollTo(0, 0); return render();
      case 'dlv-view': dlvView = id; dlvDay = ''; return render();
      case 'dlv-prev': case 'dlv-next': { const d = new Date(dlvMonth.y, dlvMonth.m + (t_.dataset.act === 'dlv-next' ? 1 : -1), 1); dlvMonth = { y: d.getFullYear(), m: d.getMonth() }; dlvDay = ''; return render(); }
      case 'dlv-day': dlvDay = dlvDay === id ? '' : id; return render();
      case 'dlv-q-clear': dlvQ = ''; document.querySelectorAll('.dq').forEach((e) => { e.value = ''; }); return dlvRefresh();
      case 'dlv-menu': { const h = dset().home, pins = toDeliver().map((o) => SCore.geo(o.lat, o.lng)).filter(Boolean), route = SCore.routeLink(pins);
        return openSmall(`<h3>${t('dlv.title')}</h3><div class="dlvmenu">
          <button class="btn" data-act="store-settings">🏪 ${t('hub.settings')}</button>
          <button class="btn" data-act="dlv-settings">⚙️ ${t('dlv.settings')}</button>
          <button class="btn" data-act="dlv-home">📍 ${t(h ? 'dlv.changeHome' : 'dlv.setHome')}</button>
          ${pins.length > 1 ? `<a class="btn" href="${route}" target="_blank" rel="noopener" data-act="pin-open">🧭 ${t('dv.route', { n: Math.min(10, pins.length) })}</a>` : ''}
          <button class="btn" data-act="ds-recalc-close">🔄 ${t('ds.recalc')}</button>
          <button class="btn" data-act="dlv-export">⬇️ ${t('dlv.export')}</button>
          <button class="btn" data-act="close">${t('btn.close')}</button></div>`, 'sheet'); }
      case 'dlv-settings': closeSheet(); return sheetDeliverySettings();
      case 'dlv-home': closeSheet(); return sheetDeliverySettings();
      case 'ds-recalc-close': { closeSheet(); const h = dset().home; if (!h) return sheetDeliverySettings(); toast(t('ds.measuring')); return Store.measure(h, true).then((n) => { toast(t('ds.measured', { n })); render(); }); }
      case 'dlv-export': closeSheet(); return dlvExport();
      case 'order-nav': return sheetOrder(id, true);
      case 'dlv-plan': return sheetPlan(id);
      case 'dlv-plan-set': return planSave(t_.dataset.ord, id === 'today' ? SCore.dayKey(new Date()) : id === 'tomorrow' ? SCore.dayKey(new Date(Date.now() + 864e5)) : id === 'clear' ? null : id);
      case 'dlv-plan-date': { const f = $('#plan-date'); return f && f.value ? planSave(id, f.value) : toast(t('dlv.planPick')); }
      case 'dlv-way': return dlvWhatsApp(id, 'dlv.waOnWay');
      case 'dlv-thanks': return dlvWhatsApp(id, 'dlv.waThanks');
      case 'dlv-done': return markHanded(id);
      case 'km-edit': return sheetKm(id);
      case 'km-save': { const f = $('#km-in'), v = parseAmt(f ? f.value : ''), o = Store.orders().find((x) => x.id === id); if (!(v > 0) || !o) return toast(t('km.hint')); closeSheet(); return Store.patch(id, { km: Math.round(v * 10) / 10, kmSrc: 'manual', kmFrom: dset().home ? { lat: dset().home.lat, lng: dset().home.lng } : null }).then(() => { toast(t('km.saved')); if (tab === 'more' && moreView === 'deliveries') render(); else sheetOrder(id); }).catch(() => toast(t('store.pubError'))); }
      case 'km-reset': { const o = Store.orders().find((x) => x.id === id), h = dset().home; closeSheet(); if (!o || !h) return toast(t('ds.notSet')); toast(t('km.measuring')); return Store.patch(id, { kmSrc: null }).then(() => Store.measure(h, true)).then(() => { render(); sheetOrder(id); }).catch(() => toast(t('store.pubError'))); }
      case 'ds-here': { if (!navigator.geolocation) return toast(t('mp.blocked')); toast(t('ds.finding')); return navigator.geolocation.getCurrentPosition((p) => { const g = SCore.geo(p.coords.latitude, p.coords.longitude); if (g) dlvSetHome({ lat: g.lat, lng: g.lng, name: '' }); }, () => toast(t('mp.blocked')), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }); }
      case 'ds-map': { const h = dset().home; return MapPick.open({ lat: h && h.lat, lng: h && h.lng, name: h && h.name, lang: I.getLang(), T: dlvMapT(), onPick: (g) => dlvSetHome(g), onError: (m) => toast(m) }); }
      case 'ds-linkopen': dlvLink = true; return sheetDeliverySettings();
      case 'ds-linkgo': { const f = $('#ds-link'), r = SCore.parseGeoLink(f ? f.value : ''); if (r && r !== 'short') { dlvLink = false; return dlvSetHome({ lat: r.lat, lng: r.lng, name: '' }); } return toast(t(r === 'short' ? 'ds.linkShort' : 'ds.linkBad')); }
      case 'ds-recalc': { const h = dset().home; if (!h) return toast(t('ds.notSet')); toast(t('ds.measuring')); return Store.measure(h, true).then((n) => toast(t('ds.measured', { n }))); }
      case 'deliveries-open': if (!$('#sheet').hidden) closeSheet(); go({ tab: 'more', moreView: 'deliveries' }); window.scrollTo(0, 0); return render();
      case 'orders-open': { ordLimit = 20; const c = storeCfg(); if (!c.id) return sheetStore(); if (!$('#sheet').hidden) closeSheet(); go({ tab: 'more', moreView: 'orders' }); window.scrollTo(0, 0); return render(); }
      case 'ord-filter': ordFilter = id; ordLimit = 20; return render();
      case 'order-open': return sheetOrder(id);
      case 'order-confirm': { const o = Store.orders().find((x) => x.id === id); return o && confirmOrder(o); }
      case 'order-cancel': return orderCancel(id);
      case 'order-delete': { const od = Store.orders().find((x) => x.id === id); if (!od) return; return askCard(t('ord.deleteAsk', { code: od.code || SCore.orderCode(od.id) }), { danger: true, ok: t('ord.deleteOk') }).then((y) => { if (y) Store.remove(id).then(() => { toast(t('ord.deleted')); dropPages('order|' + id); closeSheet(); render(); }).catch(() => toast(t('store.pubError'))); }); }
      case 'order-decline': return declineOrder(id);
      case 'loc-yes': { closeSheet(); const o = Store.orders().find((x) => x.id === id); return o && doConfirmOrder(o); }
      case 'loc-no': { closeSheet(); return declineOrder(id); }
      case 'ord-sent-mark': { const o = Store.orders().find((x) => x.id === id), lat = o && latestInvOf(o); return lat && markInvSent(o, lat.no); }
      case 'ord-send-inv': { const o = Store.orders().find((x) => x.id === id), lat = o && latestInvOf(o); return lat && shareInvoicePdf(lat.no, false); }
      case 'ord-more': ordLimit += 20; document.querySelectorAll('.ordp').forEach((e) => { if (e.dataset.lim !== '5') e.dataset.lim = ordLimit; }); return refreshOrders();
      case 'ord-q-clear': ordQ = ''; document.querySelectorAll('.oq').forEach((e) => { e.value = ''; }); return refreshOrders();
      case 'wait-open': return waitOpen(id);
      case 'wait-batch': closeSheet(); return openBatchToReceive(id);
      case 'dv-toggle': { if (dvSel) { if (dvSel.has(id)) dvSel.delete(id); else dvSel.add(id); } return sheetDeliver(dvOrd, true); }
      case 'dv-all': { const o = Store.orders().find((x) => x.id === dvOrd); if (o) dvSel = new Set(toHand(o).filter((i) => !itemArriving(i)).map((i) => i.id)); return sheetDeliver(dvOrd, true); }
      case 'dv-go': return deliverNow(id);
      case 'order-done': { const po = Store.orders().find((x) => x.id === id); return po && toHand(po).some(itemArriving) ? sheetDeliver(id) : markHanded(id); }   // some items are still on their way: choose what goes out now
      case 'pick-client': invForm.client = id; comboOpen = false; return render();
      case 'combo-toggle': comboOpen = !comboOpen; render(); if (comboOpen) { const f = $('#client'); if (f) f.focus(); } return;
      case 'combo-new': comboOpen = false; return render();
      case 'pay-full': { const p = preview(); invForm.paying = String(Math.max(0, L.r2(p.total - p.prev))); return render(); }
      case 'make-invoice': {
        if (peopleOn && !t_.dataset.go) {
          const po = pendingOrder && Store.orders().find((x) => x.id === pendingOrder), nm = L.cleanName(invForm.client);
          if (po) return resolveOrderCustomer(po).then((k) => { if (!k) return; invForm.client = k; const b = document.createElement('button'); b.dataset.act = 'make-invoice'; b.dataset.go = '1'; document.body.appendChild(b); b.click(); b.remove(); });
          if (nm && !PE.byKey(state, nm)) return resolveWalkIn(nm).then((k) => { if (!k) return; invForm.client = k; const b = document.createElement('button'); b.dataset.act = 'make-invoice'; b.dataset.go = '1'; document.body.appendChild(b); b.click(); b.remove(); });
        }
        return run(() => { const nv = L.createInvoice(state, { itemIds: [...selected], client: invForm.client, paying: invForm.paying, allowZero: !!pendingOrder }); if (sharedBusiness()) nv.by = myName(); return nv; }, (inv) => {
        const po = pendingOrder && Store.orders().find((x) => x.id === pendingOrder); selected = new Set(); invForm = { client: '', paying: '' }; pendingOrder = null; custLock = false; go({ tab: 'sell', moreView: null });
        if (po) { Store.setStatus(po.id, 'confirmed', { invoice: inv.no }).catch(() => toast(t('store.pubError'))); waOpen(po, 'ord.waConfirm', inv); pdfPrompt = inv.no; clearTimeout(pdfPromptTimer); pdfPromptTimer = setTimeout(() => { if (document.visibilityState === 'visible') showPdfPrompt(); }, 3500); }
        setTimeout(() => sheetInvoice(inv.no), 0); return t('inv.created', { no: inv.no, amount: money(inv.balance) }); }); }
      case 'customer': return sheetCustomer(id);
      case 'pp-pick': { const f = window.__pp; if (f) f(id); return closeSheet(); }
      case 'fix-open': return sheetFix();
      case 'fix-decisions': return sheetDecisions();
      case 'fix-dups': return sheetDups();
      case 'phones-open': return sheetPhones();
      case 'phone-use': return savePhone(id, t_.dataset.v);
      case 'no-number': { const p = PE.byId(state, id); if (p) { p.noNumber = true; save(); toast(t('ph.saved')); sheetPhones(); } return; }
      case 'dec-undo': { try { PE.undo(state, id); save(); toast(t('fx.undone')); } catch (e) { toast('⚠️ ' + t('fx.cannot')); } return sheetDecisions(); }
      case 'dup-merge': { try { PE.merge(state, t_.dataset.b, id, myName()); save(); toast(t('mg.done')); } catch (e) { toast('⚠️ ' + t('fx.cannot')); } return sheetDups(); }
      case 'dup-no': { const no = (state.settings.dupNo || []).slice(); no.push([id, t_.dataset.b].sort().join('|')); state.settings.dupNo = no; const d = (state.decisions || []).find((x) => x.id === t_.dataset.d); if (d) d.reviewed = true; save(); return sheetDups(); }
      case 'zones-open': closeSheet(); return sheetZones();
      case 'offer-toggle': { const c = storeCfg(); storeSet({ showOffer: !c.showOffer }); return topKey().startsWith('coupons|') ? sheetCoupons() : sheetFreeRule(); }
      case 'free-rule': return sheetFreeRule();
      case 'fr-on': { const c = storeCfg(), r = c.freeRule; storeSet({ freeRule: Object.assign({}, r, { spend: Object.assign({}, r.spend, { on: !r.spend.on }) }) }); return sheetFreeRule(); }
      case 'fr-tier-add': { const c = storeCfg(), r = c.freeRule, last = r.tiers[r.tiers.length - 1]; storeSet({ freeRule: Object.assign({}, r, { tiers: r.tiers.concat({ n: last ? last.n + 1 : 2, km: last && last.km ? Math.round(last.km * 1.5) : 15 }) }) }); return sheetFreeRule(); }
      case 'fr-tier-del': { const c = storeCfg(), r = c.freeRule; storeSet({ freeRule: Object.assign({}, r, { tiers: r.tiers.filter((x, i) => i !== Number(id)) }) }); return sheetFreeRule(); }
      case 'fr-suggest': { const c = storeCfg(); storeSet({ freeRule: Object.assign({}, c.freeRule, { tiers: [{ n: 2, km: 15 }, { n: 3, km: 35 }, { n: 5, km: 0 }] }) }); return sheetFreeRule(); }
      case 'fr-centre': return sheetReachCentre();
      case 'fr-centre-pick': { const c = storeCfg(), z = id ? c.zones.find((q) => q.id === id) : null; storeSet({ freeRule: Object.assign({}, c.freeRule, { centre: z ? { lat: z.lat, lng: z.lng, name: z.name } : null }) }); pageStack = pageStack.filter((p) => p.key !== 'reach|'); return dropPages('reach|'); }
      case 'ds-charge': { const d = dset(), on = !d.charge, patch = { charge: on }; if (on && !d.distInit) Object.assign(patch, { perKm: 1, base: 0, freeKm: 0, round: 5, count: 'both', mode: 'up', distInit: true }); if (on && !d.home) toast(t('dc.needHome')); saveDset(patch); return sheetDeliverySettings(); }
      case 'ds-charge-pc': { const d = dset(); if (!d.home) return toast(t('dc.needHome')); saveDset({ charge: true }); toast(t('dc.pcDone')); return sheetPriceCheck(); }
      case 'ds-count': saveDset({ count: id === 'both' ? 'both' : 'one' }); return sheetDeliverySettings();
      case 'ds-mode': saveDset({ mode: id === 'near' ? 'near' : id === 'none' ? 'none' : 'up' }); return sheetDeliverySettings();
      case 'guide-open': return sheetGuide();
      case 'spots-page': return sheetSpots();
      case 'price-helper': return sheetPriceHelper();
      case 'pricecheck': return sheetPriceCheck();
      case 'ph-pick': { const h = dset().home; if (!h) return; const at = ph && ph.g ? ph.g : h; return MapPick.open({ lat: at.lat, lng: at.lng, name: at.name, lang: I.getLang(), T: dlvMapT(), onPick: (g) => phCompute(g), onError: (m) => toast(m) }); }
      case 'ph-set': { const c = storeCfg(), pid = t_.dataset.ord, price = Number(id); if (!pid || !(price > 0)) return; storeSet({ locations: c.locations.map((l) => (l.id === pid ? Object.assign({}, l, { price, band: '', rm: false, dm: false, auto: false, off: l.auto ? false : l.off }) : l)) }); toast(t('prh.set')); return sheetPriceHelper(); }
      case 'ph-add': { if (!ph || !ph.g) return; return openZone('new', false, { lat: ph.g.lat, lng: ph.g.lng, r: 3000, name: ph.g.name ? String(ph.g.name).split(',')[0] : '' }); }
      case 'pc-measure': return pcMeasure();
      case 'pc-smooth': { const rows = placeRows(), sm = SCore.smoothPrices(rows, 5), changes = sm.map((x) => ({ x, r: rows.find((q) => q.id === x.id) })).filter((q) => q.r && q.x.price !== q.r.price); if (!changes.length) return toast(t('prc.smoothNone')); return askCard(t('prc.smoothAsk', { n: changes.length, list: changes.slice(0, 8).map((q) => esc(q.r.name) + ' ' + moneyText(q.r.price) + ' → ' + moneyText(q.x.price)).join('<br>') + (changes.length > 8 ? '<br>…' : '') }), { ok: t('prc.smoothOk') }).then((y) => { if (!y) return; const c = storeCfg(), by = Object.fromEntries(changes.map((q) => [q.r.id, q.x.price])); storeSet({ locations: c.locations.map((l) => (by[l.id] ? Object.assign({}, l, { price: by[l.id], band: '', rm: false, auto: false }) : l)) }); toast(t('prc.smoothDone')); sheetPriceCheck(); }); }
      case 'coupons-page': return sheetCoupons();
      case 'fr-places': return sheetReach(Number(id) || 0);
      case 'cp-on': { const c = storeCfg(); storeSet({ couponRule: Object.assign({}, c.couponRule, { on: !c.couponRule.on }) }); return sheetCoupons(); }
      case 'cp-kind': { const c = storeCfg(), k = id === 'delivery' ? 'delivery' : id === 'pct' ? 'pct' : 'off'; if (c.couponRule.kind === k) return; storeSet({ couponRule: Object.assign({}, c.couponRule, { kind: k, value: k === 'pct' ? 10 : k === 'off' ? 40 : 0 }) }); return sheetCoupons(); }
      case 'cpn-make': { const o = Store.orders().find((x) => x.id === id); if (!o) return; const c = storeCfg(); if (c.coupons.some((x) => x.order === id)) return; const cp = SCore.makeCoupon(c, bizName(), { id, phone: o.phone, name: o.name, lang: o.lang }, Date.now()); storeSet({ coupons: c.coupons.concat(cp) }); Store.schedule && Store.schedule(); toast(t('cp.made1')); cpSendWa(o, cp); return sheetOrder(id, true); }
      case 'cpn-send': { const o = Store.orders().find((x) => x.id === id), cp = o && storeCfg().coupons.find((x) => x.order === id); if (!cp) return; return cpSendWa(o, cp); }
      case 'regions-page': return sheetRegions();
      case 'region-edit': return sheetRegion(id);
      case 'region-all': return askCard(t('rg.allAsk'), { ok: t('rg.allOk') }).then((y) => { if (!y) return; const c = storeCfg(); storeSet({ locations: c.locations.map((l) => (l.delivery && !l.risk && SCore.regionOfPlace(c, l) ? Object.assign({}, l, { band: '', rm: true, off: l.auto ? false : l.off, auto: false }) : l)) }); toast(t('rg.allDone')); sheetRegions(); });
      case 'region-suggest': { const c = storeCfg(); storeSet({ regions: c.regions.map((r) => (r.base > 0 ? r : Object.assign({}, r, { base: SCore.RG_SUGGEST[r.id] }))) }); return sheetRegions(); }
      case 'region-save': { const c = storeCfg(), base = parseAmt($('#rg-base').value), free = parseAmt($('#rg-free').value), perKm = parseAmt($('#rg-perkm').value), cap = parseAmt($('#rg-cap').value); storeSet({ regions: c.regions.map((r) => (r.id === id ? Object.assign({}, r, { base, free, perKm, cap }) : r)) }); toast(t('rg.saved')); pageStack = pageStack.filter((p) => p.key !== 'region|' + id); return dropPages('region|' + id); }
      case 'zones-page': return sheetZones();
      case 'place-hot': { const c = storeCfg(), l = c.locations.find((x) => x.id === id); if (!l) return; const zz = c.zones.find((z) => z.id === l.zone && !z.risk); return openZone('new', true, { name: l.name, lat: zz ? zz.lat : undefined, lng: zz ? zz.lng : undefined, r: 1000, place: l.id }); }
      case 'hot-edit': return openZone(id, true);
      case 'hot-remove': return askCard(t('hot.removeAsk'), { danger: true, ok: t('hot.remove') }).then((y) => { if (!y) return; storeSet({ zones: storeCfg().zones.filter((z) => z.id !== id) }); toast(t('hot.removed')); refreshHot(); });
      case 'places-page': plF = 'all'; return sheetPlaces();
      case 'places-needs': return sheetPlaces('needs');
      case 'pl-filter': plF = id; return sheetPlaces();
      case 'pl-search-open': { const bar = document.querySelector('#sheet .fullbar'); if (!bar) return; bar.classList.add('searching'); const f = $('#pl-q'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } return; }
      case 'pl-search-close': { plQ = ''; const bar = document.querySelector('#sheet .fullbar'); if (bar) bar.classList.remove('searching'); const f = $('#pl-q'); if (f) f.value = ''; plSearch(); const d = document.querySelector('#sheet .fb-s .dot'); if (d) d.remove(); return; }
      case 'risk-page': return sheetRisk();
      case 'zone-add': case 'zone-edit': return openZone(id, t_.dataset.risk === '1');
      case 'zone-starter-hot': return askCard(t('zn.hotAsk', { n: ZoneData.hot().length })).then((y) => { if (!y) return; const c = storeCfg(), have = new Set(c.zones.map((z) => z.name.toLowerCase())); const link = (z) => { const m = c.locations.filter((l) => z.name.toLowerCase().startsWith(l.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0]; return m ? Object.assign({}, z, { place: m.id }) : z; }; storeSet({ zones: c.zones.concat(ZoneData.hot().filter((z) => !have.has(z.name.toLowerCase())).map(link)) }); toast(t('zn.added')); sheetZones(); });
      case 'zone-starter': return askCard(t('zn.starterAsk', { n: ZoneData.starter().length })).then((y) => { if (!y) return; const c = storeCfg(); storeSet({ zones: c.zones.concat(ZoneData.starter()) }); toast(t('zn.added')); sheetZones(); });
      case 'fee-pin': { const o = Store.orders().find((x) => x.id === id), pp = o && pinPlace(o); if (!pp) return; const fee = SCore.priceOf(storeCfg(), pp), cur = Number(o.deliveryPrice) || 0; return askCard(t('fee.pinAsk', { z: esc(pp.name), fee: money(fee), name: esc(o.name) }), { ok: t('fee.ok') }).then((y) => { if (!y) return; Store.patch(o.id, { deliveryPrice: fee, total: Math.round((Number(o.total) - cur + fee) * 100) / 100, feeChanged: true }).then(() => { toast(t('fee.done')); setTimeout(() => sheetOrder(o.id, true), 300); }).catch(() => toast(t('store.pubError'))); }); }
      case 'fee-charge': { const o = Store.orders().find((x) => x.id === id); if (!o) return; const fee = normalFee(o); return askCard(t('fee.ask', { fee: money(fee), name: esc(o.name) }), { ok: t('fee.ok') }).then((y) => { if (!y) return; Store.patch(o.id, { deliveryPrice: fee, total: Math.round((Number(o.total) + fee) * 100) / 100, feeChanged: true }).then(() => { toast(t('fee.done')); setTimeout(() => sheetOrder(o.id, true), 300); }).catch(() => toast(t('store.pubError'))); }); }
      case 'pf-free': case 'pf-free-places': case 'pf-number': case 'pf-nick-add': case 'pf-nick-del': case 'split-open': case 'merge-open': case 'merge-go': case 'split-go': return peopleAct(t_.dataset.act, id, t_);
      case 'cust-edit': return sheetCustEdit(id);
      case 'cust-lang': { clName = id; return sheetChoice(t('cl.popTitle', { who: esc(id) }), 'cl-set', savedLang(id) || 'auto', [['auto', t('cl.optAuto')], ['en', I.LANGS.en['lang.name'] + ' · EN'], ['es', I.LANGS.es['lang.name'] + ' · ES']], t('cl.popNote', { who: esc(id) })); }
      case 'cl-set': { setClientLang(clName, id === 'auto' ? '' : id); closeSheet(); return; }
      case 'ce-lang': { ceLang = id; document.querySelectorAll('#sheet .lg-seg button').forEach((b) => b.classList.toggle('on', b.dataset.id === id)); return; }
      case 'cust-save': {
        const to = $('#ce-name').value, loc = $('#ce-loc').value;
        if (peopleOn) { const pr = PE.byKey(state, id), nm = L.cleanName(to); if (!pr || !nm) return toast(t('cust.saved')); pr.name = nm; L.setPlace(state, id, loc); setClientLang(id, ceLang); save(); pageStack = pageStack.filter((p) => p.key !== 'custedit|' + id && p.key !== 'customer|' + id); toast(t('cust.saved')); render(); return sheetCustomer(id); }
        const save2 = () => { try {
          const final = L.renameCustomer(state, id, to); L.setPlace(state, final, loc); if (clientKey(id) !== clientKey(final)) setClientLang(id, ''); setClientLang(final, ceLang); save(); tidyPhotos();
          pageStack = pageStack.filter((p) => p.key !== 'custedit|' + id && p.key !== 'customer|' + id); toast(t('cust.saved')); render(); return sheetCustomer(final);
        } catch (e) { return toast('⚠️ ' + errMsg(e)); } };
        if (L.cleanName(to).toLowerCase() !== id.toLowerCase() && L.otherCustomerNamed(state, id, to)) return askCard(t('cust.mergeAsk', { name: L.canonicalName(state, to), old: id }), { ok: t('cust.mergeOk') }).then((y) => { if (y) save2(); });
        return save2();
      }
      case 'view-inv': { let n = state.invoices.find((x) => x.no === id), g = 0; while (n && n.updatedBy && g++ < 50) { const nx = state.invoices.find((x) => x.no === n.updatedBy); if (!nx || nx === n) break; n = nx; } return sheetInvoice(n ? n.no : id); }   // always opens the latest invoice; older ones are in its history
      case 'return-inv': return sheetReturn(id, '');
      case 'return-item': return askCard(t('item.returnItemAsk', { id }), { danger: true, ok: t('item.returnItem') }).then((y) => { if (y) { closeSheet(); run(() => L.returnItem(state, id), t('item.returned')); } });
      case 'del-inv': return askCard(t('inv.cancelDesc'), { title: t('inv.cancelTitle'), danger: true, ok: t('invUI.cancel'), no: t('inv.keep') }).then((y) => { if (!y) return; try { const pu = L.purchaseOf(state, id); if (pu && pu.items.length) L.returnItems(state, id, pu.items.map((x) => x.id), new Date(), 'cancelled'); save(); tidyPhotos(); toast(t('inv.cancelled', { id })); } catch (e) { return toast('⚠️ ' + errMsg(e)); } dropPages('invoice|' + id); render(); });
      case 'print': return window.print();
      case 'share-pdf': return shareInvoicePdf(id, false);
      case 'download-pdf': return shareInvoicePdf(id, true);
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
      case 'more': if (id === 'orders') { ordLimit = 20; ordQ = ''; } go({ tab: 'more', moreView: id }); window.scrollTo(0, 0); return render();
      case 'import-xlsx': return pickFile('.xlsx,.xls', importXlsx);
      case 'import-json': return pickFile('.json,application/json', importJson);
      case 'export-json': return confirmDownload('buy-sell-backup.json', () => download('buy-sell-backup.json', JSON.stringify(state, null, 2)));
      case 'reset': return sheetReset();
      case 'reset-go': { const w = $('#reset-word'); if (!w || w.value.trim().toUpperCase() !== 'RESET') return; closeSheet(); resetToDefault(); return; }
    }
  });
  $('#back').addEventListener('click', () => { themeDraft = null; if (!placeBack()) go({ tab: 'home', moreView: null }); render(); });

  document.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f));
    if (f.id === 'f-pphone') { const v = JSON.stringify({ phone: d.phone, place: d.place }); if (!PE.valid(d.phone)) return toast(t('pp.badPhone')); const fn = window.__pp; if (fn) fn(v); return closeSheet(); }
    if (f.id === 'f-free') { const p = PE.byId(state, f.dataset.pid); if (p) { p.free = p.free || { on: true, zones: [] }; p.free.zones = [...f.querySelectorAll('input[type=checkbox]:checked')].map((x) => x.value); save(); closeSheet(); toast(t('fd.saved')); sheetCustomer(p.key); } return; }
    if (f.id === 'f-pf') { const fn = window.__pf; if (fn) fn(d.v); return closeSheet(); }
    if (f.id === 'f-chpw') { acctShow(''); return Cloud.changePassword(d.cur, d.password).then(() => { toast(t('acct.pwChanged')); f.reset(); }).catch((e) => acctShow(/wrong-password|invalid-credential/.test((e && e.code) || '') ? t('acct.err.curPw') : acctErr(e))); }
    if (f.id === 'f-addpw') { acctShow(''); return Cloud.addPassword(d.password).then(() => { toast(t('acct.pwAdded')); closeSheet(); render(); }).catch((e) => acctShow(/requires-recent-login/.test((e && e.code) || '') ? t('acct.pwRecent') : /provider-already-linked|credential-already-in-use|email-already-in-use/.test((e && e.code) || '') ? t('acct.pwHave') : acctErr(e))); }
    if (f.id === 'f-forgot') { gateErr(''); const em = d.email.trim(); rememberEmail(em); return Cloud.reset(em).then(() => { const e = $('#g-err'); if (e) { e.textContent = t('fp.sent', { email: em }); e.hidden = false; e.classList.add('ok'); } }, (e) => gateErr(acctErr(e))); }
    if (f.id === 'f-gate') { gateErr(''); homeAfterSignIn = true; const em = d.email.trim(); rememberEmail(em); return (gateMode === 'create' ? Cloud.signUp(em, d.password) : Cloud.signIn(em, d.password)).then(() => toast(t('acct.signedIn')), (e) => gateErr(acctErr(e))); }
    if (f.id === 'f-join') { gateErr(''); return Cloud.joinByCode(d.code).catch((e) => gateErr(e && e.code === 'join/invalid' ? t('join.invalid') : e && e.code === 'join/short' ? t('join.short') : t('gate.err', { m: (e && e.message) || '' }))); }
    if (f.id === 'f-setup') { const name = (d.biz || '').trim(); if (!name) return gateErr(t('gate.bizNeed')); state.settings.businessName = /^b-?ruiz$/i.test(name) ? '' : name; if (gateDraft.logo) state.settings.bizLogo = gateDraft.logo; state.settings.palette = gateDraft.palette || Theme.current(); Theme.apply(state.settings.palette); applyTheme(); state.settings.setupDone = true; save(); gateView = null; updateGate(); return render(); }
    if (f.id === 'f-acct') { acctShow(t('acct.working')); homeAfterSignIn = true; const em = d.email.trim(); rememberEmail(em); return acctDone(d.mode === 'up' ? Cloud.signUp(em, d.password) : Cloud.signIn(em, d.password)); }
    if (f.id === 'f-quick') return quickSale(d);
    if (f.id === 'f-band') { const price = parseAmt(d.price), c = storeCfg(); if (!(price > 0)) return; storeSet({ bands: c.bands.concat({ id: SCore.newId(6), name: String(d.name || '').trim(), price, on: true }) }); closeSheet(); return sheetPickup(); }
    if (f.id === 'f-riskpick') {
      const c = storeCfg(), ticked = new Set([...f.querySelectorAll('input[type=checkbox]:checked')].map((x) => x.value)), name = L.cleanName(d.name);
      let list = c.locations.map((l) => (ticked.has(l.id) ? Object.assign({}, l, { risk: true, off: true }) : l));
      if (name) { const hit = list.find((l) => l.name.toLowerCase() === name.toLowerCase()); list = hit ? list.map((l) => (l === hit ? Object.assign({}, l, { risk: true, off: true }) : l)) : list.concat({ id: SCore.newId(8), name, pickup: false, delivery: true, price: 0, risk: true, off: true, band: '', zone: '', auto: false }); }
      if (list.length === c.locations.length && !ticked.size && !name) return closeSheet();
      storeSet({ locations: list }); closeSheet(); toast(t('pk.riskSaved')); return sheetRisk();
    }
    if (f.id === 'f-risk') { const name = L.cleanName(d.name), c = storeCfg(); if (!name) return; const hit = c.locations.find((l) => l.name.toLowerCase() === name.toLowerCase()), list = hit ? c.locations.map((l) => (l === hit || l.id === hit.id ? Object.assign({}, l, { risk: true }) : l)) : c.locations.concat({ id: SCore.newId(8), name, pickup: false, delivery: true, price: 0, risk: true, off: true, band: '' }); storeSet({ locations: c.areaMode === 'safe' ? SCore.applyMode({ locations: list, bands: c.bands }, 'safe').locations : list.map((l) => (l.risk && !hit && l.name === name ? Object.assign({}, l, { off: true }) : l)) }); closeSheet(); return sheetPickup(); }
    if (f.id === 'f-spot') { const name = String(d.name || '').trim(), note = String(d.note || '').trim(), c = storeCfg(); if (!name) return; storeSet({ spots: d.sid ? c.spots.map((x) => (x.id === d.sid ? Object.assign({}, x, { name, note }) : x)) : c.spots.concat({ id: SCore.newId(6), name, note, on: true }) }); closeSheet(); return refreshPick(); }
    if (f.id === 'f-batch') { const b = run(() => L.createBatch(state, d), (x) => t('batch.created', { id: bl(x.id) })); if (b) { stockBatch = b.id; stockFilter = 'All'; const sc = storeCfg(); if (sc.id && sc.autoNew && !sc.batches.includes(b.id)) storeSet({ batches: sc.batches.concat(b.id) }); } }
    if (f.id === 'f-clear') { let failed = false; const wasOpen = clearOpen.has(d.batch); clearOpen.delete(d.batch); run(() => { try { return L.payClearing(state, d.batch, d.amount); } catch (err2) { failed = true; throw err2; } }, t('clear.recorded', { id: bl(d.batch) }), true); if (!failed) sheetBatch(d.batch); else if (wasOpen) clearOpen.add(d.batch); }
    if (f.id === 'f-receive') return askReceived(d.batch);
    if (f.id === 'f-settings') run(() => {
      Object.assign(state.settings, { businessName: /^b-?ruiz$/i.test((d.businessName || '').trim()) ? '' : (d.businessName || '').trim(), bizCity: (d.bizCity || '').trim(), bizPhone: (d.bizPhone || '').trim(), bizEmail: (d.bizEmail || '').trim(), year: +d.year || state.settings.year, markup: +d.markup || 1, defaultMargin: d.defaultMargin === '' ? 100 : +d.defaultMargin });
      ['USD', 'EUR', 'GBP'].forEach((c) => { state.settings.rates[c] = +d[c] || state.settings.rates[c]; });
    }, t('set.saved'), true);
  });

  // Business logo: shrink the chosen picture to a small square (white behind it) and keep it in the settings.
  function logoFromFile(file) {
    return new Promise((ok, no) => { const url = URL.createObjectURL(file), im = new Image(); im.onerror = () => { URL.revokeObjectURL(url); no(new Error('img')); };
      im.onload = () => { const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N);
        const k = Math.min((N * 0.92) / im.width, (N * 0.92) / im.height); g.drawImage(im, (N - im.width * k) / 2, (N - im.height * k) / 2, im.width * k, im.height * k); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.9)); };
      im.src = url; });
  }
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.rule) { const c = storeCfg(), r = c.freeRule, k = el.dataset.rule, v = parseAmt(el.value); storeSet({ freeRule: Object.assign({}, r, { spend: Object.assign({}, r.spend, k === 'amt' ? { amt: v > 0 ? v : r.spend.amt } : { km: v }) }) }); const f = storeCfg().freeRule.spend; el.value = k === 'amt' ? f.amt : (f.km || ''); return; }
    if (el.dataset && el.dataset.tier) { const c = storeCfg(), r = c.freeRule, i = Number(el.dataset.i), v = parseAmt(el.value); storeSet({ freeRule: Object.assign({}, r, { tiers: r.tiers.map((x, j) => (j === i ? (el.dataset.tier === 'n' ? { n: Math.max(1, Math.round(v) || x.n), km: x.km } : { n: x.n, km: v }) : x)) }) }); return sheetFreeRule(); }
    if (el.dataset && el.dataset.cpr) { const c = storeCfg(), k = el.dataset.cpr, v = parseAmt(el.value), r = c.couponRule; storeSet({ couponRule: Object.assign({}, r, { [k]: k === 'days' ? Math.max(1, Math.min(365, Math.round(v) || r.days)) : k === 'cap' || k === 'km' ? v : k === 'value' && r.kind === 'pct' ? Math.min(100, Math.max(1, v || r.value)) : (v > 0 ? v : r[k]) }) }); const f = storeCfg().couponRule; el.value = f[k] || ''; if (k === 'km') return sheetCoupons(); return; }
    if (el.id === 'sl-mode') { const own = $('#sl-own'), nt = $('#sl-rnote'); if (own) own.style.display = el.value === 'own' ? '' : 'none'; if (nt) { nt.style.display = el.value === 'region' || el.value === 'dist' ? '' : 'none'; nt.textContent = el.value === 'dist' ? t('dc.distNote') : t('sl.regionNote'); } return; }
    if (el.dataset && el.dataset.phonefor) { const v = el.value.trim(); if (v) savePhone(el.dataset.phonefor, v); return; }
    if (el.id === 'sp-name' || el.id === 'sp-phone') { const b = $('#sheet').querySelector('[data-act="split-go"]'); return b && splitSummary(b.dataset.id); }
    if (el.dataset && el.dataset.split !== undefined) { const pid = ($('#sheet').querySelector('[data-act="split-go"]') || {}).dataset; return pid && splitSummary(pid.id); }
    if (el.id === 'gate-logo-file') { const f = el.files && el.files[0]; if (!f) return; logoFromFile(f).then((d) => { gateDraft.logo = d; const pv = $('#gate-logo-pv'), bt = $('#gate-logo-btn'); if (pv) pv.innerHTML = `<img src="${d}" alt="">`; if (bt) bt.textContent = t('gate.logoChange'); }).catch(() => toast(t('logo.err'))); return; }
    if (el.id === 'logo-file') { const f = el.files && el.files[0]; if (!f) return; logoFromFile(f).then((d) => { state.settings.bizLogo = d; save(); Store.publish && Store.publish(true); toast(t('logo.saved')); render(); }).catch(() => toast(t('logo.err'))); return; }
    if (el.dataset.selgrp) { state.items.filter((x) => x.grp === el.dataset.selgrp && !L.isLocked(x)).forEach((x) => { el.checked ? selected.add(x.id) : selected.delete(x.id); }); render(); return; }
    if (el.hasAttribute('data-sel')) {
      const id = el.closest('.item').dataset.id;
      el.checked ? selected.add(id) : selected.delete(id);
      el.closest('.item').classList.toggle('sel', el.checked); render(); return;
    }
    if (el.dataset.qty) { const it = state.items.find((x) => x.id === el.dataset.qty); if (it) setQty(it, el.value); return; }
    if (el.dataset.f && $('#sheet').dataset.item) {
      const i = state.items.find((x) => x.id === $('#sheet').dataset.item), f = el.dataset.f; if (L.isLocked(i)) return;
      if (f === 'discount') { const pc = parsePct(el.value); el.value = pc ? pc + '%' : ''; if (discOld.id !== i.id) discOld = { id: i.id, v: i.discount }; i.discount = pc; return setSale(i, i.saleOn, pc); }   // "50" becomes "50%"
      if (f === 'price' && !onQuick() && grpOf(i).length > 1) { const nv = Math.max(0, parseFloat(String(el.value).replace(',', '.')) || 0), old = i.price; if (nv === old) return; i.price = nv; return setPrice(i, nv, old); }
      if (f === 'descS') { setSpanishName(i, el.value); save(); updateSale(i); refreshEs(i); return refreshAfterEdit(i); }
      i[f] = NUM_FIELDS.includes(f) ? Math.max(0, parseFloat(String(el.value).replace(',', '.')) || 0) : el.value;
      if (L.GROUP_FIELDS.includes(f) && (onQuick() || f !== 'price')) L.applyToGroup(state, i, [f]);
      save(); updateSale(i); if (f === 'desc') refreshEs(i); if (f === 'desc') refreshAfterEdit(i);
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.closest && el.closest('#tsearch')) { const pi = $(pageSearchSel()); if (pi) { pi.value = el.value; pi.dispatchEvent(new Event('input', { bubbles: true })); } return; }
    if (el.dataset.invfs) { invFsHsv.v = Number(el.value) / 100; drawWheel($('#invwheel'), invFsHsv.v); invFsApply(); return; }
    if (el.dataset.bandprice) { const c = storeCfg(); storeSet({ bands: c.bands.map((b) => (b.id === el.dataset.bandprice ? Object.assign({}, b, { price: parseAmt(el.value) }) : b)) }); return; }
    if (el.dataset.spotprice) { storeSet({ spotPrice: parseAmt(el.value) }); return; }
    if (el.dataset.store) { storeSet({ [el.dataset.store]: el.value }); const pn = $('#ct-pn'); if (pn) { const n = storeCfg().name || bizName(); pn.textContent = n; $('#ct-pl').textContent = (n.trim().charAt(0) || '?').toUpperCase(); } return; }
    if (el.id === 'pay-amt') { payUpdate(); return; }
    if (el.dataset.place !== undefined) { L.setPlace(state, el.dataset.place, el.value); save(); return; }
    if (el.dataset.inv) { if (invFsOn) invFsPreview(); setInvStyle({ [el.dataset.inv]: el.dataset.inv === 'color' ? el.value : Number(el.value) }); const g = $('#dsgrid'); if (g) g.innerHTML = invCards(); return; }
    if (el.id === 'client' || el.id === 'paying') { invForm[el.name] = el.value; $('#prev').innerHTML = previewBox(); renderActionBar(); if (el.id === 'client') { const l = $('#combolist'); if (l) l.innerHTML = chipRows(el.value); const bt = document.querySelector('.combo-btn span'); if (bt) bt.textContent = L.cleanName(el.value) || t('sell.customerPick'); } }
    else if ((el.hasAttribute && el.hasAttribute('data-ret')) || el.id === 'rt-fee') retRefresh();
    else if (el.classList.contains('dq')) { dlvQ = el.value; dlvDay = ''; dlvRefresh(); }
    else if (el.dataset && el.dataset.dsshow !== undefined) saveDset({ showRate: !!el.checked });
    else if (el.dataset && el.dataset.dset) { saveDset({ [el.dataset.dset]: parseAmt(el.value) }); const d = dset(), st = SCore.deliveryStats(Store.orders().filter((o) => o.status === 'done')), ex = st.avgKm || 7.4, f = SCore.rateFee(d, ex), x = $('#ds-ex'); if (x) x.textContent = f == null ? t('ds.noRate') : t('ds.example', { km: ex, fee: plain(money(f)) }); const tb = $('#ds-trybox'), ti = $('#ds-try'); if (tb && ti) tb.innerHTML = dcTry(d, ti.value); }
    else if (el.classList.contains('iq')) { invQ = el.value; const l = $('#ilog'); if (l) l.innerHTML = invoiceLogRows(invQ); }
    else if (el.id === 'pr-cap') { prCaption = el.value; }
    else if (el.id === 'reset-word') { const g = $('#reset-go'); if (g) g.disabled = el.value.trim().toUpperCase() !== 'RESET'; }
    else if (el.classList.contains('itbq')) { itBQ = el.value; itPickRefresh(); }
    else if (el.classList.contains('itq')) { itQ = el.value; itLimit = 100; itRefresh(); }
    else if (el.classList.contains('blq')) { const l = $('#blog'); if (l) l.innerHTML = batchLogRows(el.value); }
    else if (el.classList.contains('bq')) { const l = $('#bpl'); if (l) { l.innerHTML = bpRows(el.value); l.scrollTop = 0; } const nn = $('#bp-n'); if (nn) nn.textContent = el.value.trim() ? t('bp.found', { n: L.batchSearch(state.batches, el.value).length }) : t('bp.n', { n: state.batches.length }); }
    else if (el.classList.contains('oq')) { ordQ = el.value; ordLimit = 20; document.querySelectorAll('.ordp').forEach((e) => { if (e.dataset.lim !== '5') e.dataset.lim = 20; }); refreshOrders(); }
    else if (el.id === 'w-q') { wordQ = el.value; wordsRefresh(); }
    else if (el.id === 'w-try') tryName();
    else if (el.classList.contains('cq')) { cuQ = el.value; cuRefresh(); }
    else if (el.dataset.f && $('#sheet').dataset.item) {
      const i = state.items.find((x) => x.id === $('#sheet').dataset.item), f = el.dataset.f;
      if (f === 'discount') { if (discOld.id !== i.id) discOld = { id: i.id, v: i.discount }; i.discount = parsePct(el.value); if (onQuick()) L.applyToGroup(state, i, ['discount']); updateSale(i); }
      else if (f === 'descS') { /* a Spanish name is applied when the box is left (see the change handler) */ }
      else if (NUM_FIELDS.includes(f)) { i[f] = Math.max(0, parseFloat(String(el.value).replace(',', '.')) || 0); updateSale(i); } else { i[f] = el.value; }
      if (f !== 'descS') save();
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
  // Reset to default: the app becomes empty, as if no batch had ever been added. Settings (business name, theme, store, delivery location) stay.
  function sheetReset() {
    openSmall(`<h3>${t('reset.title')}</h3><p>${t('reset.text')}</p>
      <button type="button" class="btn" data-act="export-json" style="width:100%;margin-bottom:12px">💾 ${t('reset.backup')}</button>
      <label for="reset-word">${t('reset.type')}</label><input id="reset-word" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="RESET" style="margin-bottom:12px">
      <div class="btns"><button class="btn dsolid" id="reset-go" data-act="reset-go" disabled>${t('reset.go')}</button><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'card');
  }
  // Invoice numbers start again after a reset or an import, so the orders in the cloud forget the numbers they were holding.
  function unlinkOrders() { try { Store.orders().forEach((o) => { if (o.invoice) Store.patch(o.id, { invoice: '', invSentNo: '', invSentAt: 0 }).catch(() => {}); }); } catch (e) { /* the date check still protects them */ } }
  function resetToDefault() {
    const keep = state.settings, fresh = L.defaultState(); fresh.settings = keep;
    state = fresh; selected = new Set(); stockBatch = null; stockFilter = 'All'; itBatches = []; itQ = ''; itStat = 'all'; cuStat = 'all'; cuQ = ''; blF = { store: [], status: [], items: [] }; invQ = '';
    tab = 'home'; moreView = null; places = [{ tab: 'home', moreView: null }]; pageStack = [];
    try { if (window.PhotoStore) PhotoStore.keys().then((ks) => Promise.all((ks || []).map(PhotoStore.del))).catch(() => {}); } catch (e) { /* photos are tidied later */ }
    save(); unlinkOrders(); toast(t('toast.cleared')); render();
  }
  function importXlsx(file) {
    if (state.batches.length) return askCard(t('confirm.import'), { danger: true, ok: t('btn.continue') }).then((y) => { if (y) importXlsx2(file); });
    importXlsx2(file);
  }
  function importXlsx2(file) {
    toast(t('toast.reading'));
    loadSheetJS().then((X) => file.arrayBuffer().then((buf) => {
      const wb = X.read(buf, { type: 'array', cellDates: true }), sheets = {};
      ['Batch Log', 'Hidden Master Log', 'Invoice Log'].forEach((n) => { if (wb.Sheets[n]) sheets[n] = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null }); });
      if (!sheets['Hidden Master Log'] || !sheets['Batch Log']) throw coded('notWorkbook');
      const imp = L.importWorkbook(sheets); imp.settings = state.settings;   // only the data is replaced; your settings (business, theme, store, delivery) stay
      state = imp; selected = new Set(); stockBatch = null; tab = 'home'; moreView = null; places = [{ tab: 'home', moreView: null }]; save(); unlinkOrders();
      toast(t('toast.imported', { b: state.batches.length, i: state.items.length, v: state.invoices.length })); render();
    })).catch((e) => toast('⚠️ ' + errMsg(e)));
  }
  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((ok, no) => {
      const add = (src, fail) => { const s = document.createElement('script'); s.src = src; s.onload = () => ok(window.XLSX); s.onerror = fail; document.head.appendChild(s); };
      add('vendor/sheetjs/xlsx.full.min.js', () => add('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', () => no(coded('sheetjs'))));   // the copy that ships with the app first, the internet only as a fallback
    });
  }

  /* ---------- Android back button & swipe-down sheets ---------- */

  // Every layer you can back out of (non-home tab, a More sub-screen, an open sheet) is one history entry,
  // so the system Back button / gesture closes the top layer first. At Home, Back asks to press again to exit.
  let hist = 0, skipPops = 0, exitArmed = false, exitTimer, reconTimer;
  const depth = () => (places.length - 1) + ($('#tsearch') ? 1 : 0) + ($('#sheet').hidden ? 0 : Math.max(1, pageStack.length)) + PUI.layers();
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
    if ($('#tsearch')) closeTopSearch();             // the search bar over the top bar is the top layer
    else if (PUI.isOpen()) PUI.back();
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
      if (sh.classList.contains('card')) { y0 = null; canDrag = false; return; }
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

  // Item pages: drag the photo left or right and it follows your finger; let go past a short distance and the next (or last) item slides in
  (() => { let x0 = null, y0 = 0, drag = false;
    document.addEventListener('touchstart', (e) => { const b = e.target.closest && e.target.closest('[data-swipe]'); if (!b || e.touches.length !== 1 || sliding) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; drag = false; }, { passive: true });
    document.addEventListener('touchmove', (e) => { if (x0 == null) return; const dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (!drag) { if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) { drag = true; $('#sheet').style.overflowX = 'hidden'; } else return; }
      const pill = (d) => { const b = document.querySelector('#inavpill [data-dir="' + d + '"]'); return b && !b.disabled; }, edge = (dx < 0 && !pill('next')) || (dx > 0 && !pill('prev')), shown = dx * (edge ? 0.25 : 0.9), p = slideParts();
      setParts(p.mv, `translateX(${shown}px)`, '', 0); setParts(p.fd, `translateX(${shown * 0.18}px)`, String(Math.max(0.3, 1 - Math.abs(shown) / 220)), 0); if (e.cancelable) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0, was = drag; x0 = null; drag = false;
      const back = () => { const p = slideParts(); setParts(p.mv, '', '', 210); setParts(p.fd, '', '', 210); setTimeout(() => { [...p.mv, ...p.fd].forEach((x) => { x.style.transition = ''; x.style.transform = ''; x.style.opacity = ''; }); $('#sheet').style.overflowX = ''; }, 240); };
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) { if (was) back(); return; }
      const b = document.querySelector('#inavpill [data-dir="' + (dx < 0 ? 'next' : 'prev') + '"]'); if (b && !b.disabled) slideItem(b.dataset.id, dx < 0 ? 1 : -1); else if (was) back(); }, { passive: true });
  })();
  // Edit batch: swipe the photo left or right for the next or last item (typed text is already saved; it works like the side arrows)
  (() => { let x0 = null, y0 = 0;
    document.addEventListener('touchstart', (e) => { const b = e.target.closest && e.target.closest('[data-qswipe]'); if (!b || e.touches.length !== 1) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const b = document.querySelector('.qbig .qsw.' + (dx < 0 ? 'r' : 'l')); if (b) b.click(); }, { passive: true });
  })();
  // Promote: swipe the picture left or right for the next or last one
  (() => { let x0 = null, y0 = 0;
    document.addEventListener('touchstart', (e) => { const b = e.target.closest && e.target.closest('[data-prswipe]'); if (!b || e.touches.length !== 1) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const b = document.querySelector('#prprev .prar.' + (dx < 0 ? 'r' : 'l')); if (b) b.click(); }, { passive: true });
  })();
  // Delivery log calendar: swipe the month grid left or right for the next or last month
  (function () {
    let x0 = null, y0 = 0;
    document.addEventListener('touchstart', (e) => { x0 = e.touches.length === 1 && e.target.closest && e.target.closest('.calgrid') ? e.touches[0].clientX : null; y0 = e.touches[0] ? e.touches[0].clientY : 0; }, { passive: true });
    document.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { const d = new Date(dlvMonth.y, dlvMonth.m + (dx < 0 ? 1 : -1), 1); dlvMonth = { y: d.getFullYear(), m: d.getMonth() }; dlvDay = ''; render(); } }, { passive: true });
  })();

  const debounce = (fn, ms) => { let h; return () => { clearTimeout(h); h = setTimeout(fn, ms); }; };
  const photoKeep = () => ['1', '2', '7', 'sold'].includes(state.settings.photoKeep) ? state.settings.photoKeep : '2';   // how long an original screenshot stays after the photo is saved
  const tidyPhotos = debounce(() => { PUI.cleanup(); PUI.sweep(photoKeep()); }, 2500);
  wordList();
  Store.init({ state: () => state, bizName, refresh: () => { const top = pageStack[pageStack.length - 1]; if (top && top.key === 'store' && !$('#sheet').hidden) { const sc = $('#sheet').scrollTop; reopening = true; try { top.open(); } finally { reopening = false; } $('#sheet').scrollTop = sc; } },
    onOrders: () => { renderTools(); try { const h = dset().home; if (h && window.Store) Store.measure(h); } catch (e) { /* later */ } const top = pageStack[pageStack.length - 1]; if (!$('#sheet').hidden && top && top.key.startsWith('order|')) { reopening = true; try { top.open(); } finally { reopening = false; } } else if ($('#sheet').hidden && (tab === 'sell' || (tab === 'more' && (moreView === 'orders' || moreView === 'deliveries')))) render(); else if (!$('#sheet').hidden) ordDirty = true; } });
  if (window.PhotoSync) PhotoSync.init({ state: () => state });
  PUI.init({ state: () => state, save, render, toast, esc, bl, openSheet, openSmall, closeSheet, confirm: (m) => window.confirm(m), sync: () => syncHistory(), invMoney: (n) => invMoney(n), invoiceLang: () => invoiceLang(), shareLang, tagHTML });
  Cloud.init({
    getState: () => state,
    askConflict,
    onTeam: (tm) => { team = tm; try { if (tm) localStorage.setItem('buy-sell-team', JSON.stringify({ uid: cloud.uid, rank: tm.rank, perms: tm.perms })); else localStorage.removeItem('buy-sell-team'); } catch (e) { /* ignore */ } updateGate(); render(); refreshTeamSheets(); },
    onRequests: (list) => { joinReqs = list; renderTools(); refreshTeamSheets(); },
    onRequestsError: (code) => { reqErr = code || ''; refreshTeamSheets(); },
    onStatus: (i) => { const was = cloud.signedIn; cloud = i; peopleCheck(); if (i.status === 'synced' && window.PhotoSync) PhotoSync.soon(3000); if (i.signedIn && !was && homeAfterSignIn) { homeAfterSignIn = false; closeSheet(); tab = 'home'; moreView = null; places = [{ tab: 'home', moreView: null }]; pageStack = []; render(); } if (i.status === 'synced' && window.Store) { Store.schedule(); Store.listen(); } else if (!i.signedIn && window.Store) Store.stopListen(); updateGate(); const el = $('#acct-st'); if (el && was === i.signedIn) { el.textContent = acctStatus(); el.parentNode.className = i.status === 'synced' ? 'good' : /error|rules|unavailable/.test(i.status) ? 'bad' : ''; } else if (tab === 'home' || (tab === 'more' && moreView === 'settings')) render(); },
    onRemote: () => { L.migrate(state); peopleCheck(); wordList(); updateGate(); if (state.settings.palette) { Theme.apply(state.settings.palette); applyTheme(); } try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } const a = document.activeElement; if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && $('#view').contains(a)) return setTimeout(render, 2000); render(); },
  });
  setTimeout(() => { const e = Cloud.redirectError && Cloud.redirectError(); if (e) toast(acctErr(e)); }, 4000);   // a Google sign-in that came back from Google's page with an error
  setInterval(() => { if (!document.hidden) renderTools(); }, 60000);   // an invoice reminder appears 5 minutes after confirming, even if nothing else redraws the bell
  save();   // write back anything repaired while loading (e.g. names with stray spaces)
  applyStaticText();
  if (state.settings.palette) Theme.apply(state.settings.palette);
  applyTheme();
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  peopleCheck();
  ensureZonePlaces();
  render();
  setTimeout(() => PUI.sweep(photoKeep()), 3000);   // timers on screenshots and on sold items' photos run when the app opens
})();

/* Cloud account + sync (Firebase: sign-in with Google or email/password, data in Firestore). The app keeps working from the
   phone's own copy when offline or signed out; the cloud copy is kept in step through the rules in sync.js.
   Data lives in a "workspace" (workspaces/{id}) that people are members of, so one project can serve many businesses later. */
(function (root) {
  const S = root.Sync;
  const CONFIG = { apiKey: 'AIzaSyAfAEJ1Yy8DtQg0LDS_bkTFLgHx0d3ym8g', authDomain: 'b-ruiz.firebaseapp.com', projectId: 'b-ruiz', storageBucket: 'b-ruiz.firebasestorage.app', messagingSenderId: '252946775951', appId: '1:252946775951:web:735af0ffbe69d9966a15fa' };   // public by design; the Firestore rules protect the data
  const FILES = ['vendor/firebase/firebase-app-compat.js', 'vendor/firebase/firebase-auth-compat.js', 'vendor/firebase/firebase-firestore-compat.js'];
  const COLS = ['batches', 'items', 'invoices', 'meta'];
  let hooks = null, auth = null, db = null, user = null, wid = null, last = null, unsubs = [], ready = false, pushTimer = null, runId = 0;
  const st = { status: 'loading', error: '' };
  const set = (status, error) => { st.status = status; st.error = error || ''; if (hooks && hooks.onStatus) hooks.onStatus(info()); };
  const info = () => ({ status: st.status, error: st.error, email: user ? user.email || user.displayName || '' : '', signedIn: !!user });
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full: sync state is rebuilt next time */ } };
  const lastKey = () => 'buy-sell-cloud:' + wid;
  const saveLast = () => lsSet(lastKey(), last);

  function loadScripts() {
    return FILES.reduce((p, f) => p.then(() => new Promise((ok, no) => { const s = document.createElement('script'); s.src = f; s.onload = ok; s.onerror = () => no(new Error('scripts')); document.head.appendChild(s); })), Promise.resolve());
  }

  function init(h) {
    hooks = h;
    const go = () => loadScripts().then(() => {
      const fb = root.firebase; fb.initializeApp(CONFIG); auth = fb.auth(); db = fb.firestore();
      try { auth.useDeviceLanguage(); } catch (e) { /* ignore */ }
      db.enablePersistence({ synchronizeTabs: true }).catch(() => {});      // works offline from the phone's saved copy
      set('signedOut');
      auth.onAuthStateChanged((u) => { user = u; teardown(); if (!u) return set('signedOut'); start().catch((e) => set(e && e.code === 'permission-denied' ? 'rules' : (navigator.onLine === false ? 'offline' : 'error'), e && e.message)); });
    }).catch(() => set('unavailable'));
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
    window.addEventListener('online', () => { if (user && !ready) start().catch(() => {}); });
    window.addEventListener('offline', () => { if (user) set('offline'); });
  }

  function teardown() { runId++; unsubs.forEach((u) => { try { u(); } catch (e) { /* ignore */ } }); unsubs = []; ready = false; wid = null; last = null; clearTimeout(pushTimer); }

  async function resolveWorkspace() {
    const cache = 'buy-sell-cloud-ws:' + user.uid, c = lsGet(cache); if (c) return c;
    const ref = db.collection('users').doc(user.uid), snap = await ref.get();
    if (snap.exists && snap.data().workspaceId) { lsSet(cache, snap.data().workspaceId); return snap.data().workspaceId; }
    const ws = db.collection('workspaces').doc(), b = db.batch();
    b.set(ws, { name: 'B-RUIZ', ownerUid: user.uid, members: { [user.uid]: 'owner' }, createdAt: root.firebase.firestore.FieldValue.serverTimestamp() });
    b.set(ref, { workspaceId: ws.id, email: user.email || '' });
    await b.commit(); lsSet(cache, ws.id); return ws.id;
  }
  const col = (c) => db.collection('workspaces').doc(wid).collection(c);
  const toMap = (snap) => { const m = {}; snap.forEach((d) => { const j = d.data().j; if (typeof j === 'string') m[d.id] = j; }); return m; };

  async function start() {
    const my = ++runId; set('connecting');
    wid = await resolveWorkspace(); if (my !== runId) return;
    const state = hooks.getState();
    last = lsGet(lastKey());
    if (!last) {                                                    // first time this phone meets this workspace
      const has = await col('meta').doc('settings').get({ source: 'server' }).then((d) => d.exists);
      last = S.emptyLast();
      if (has) {
        if (!S.hasData(state)) S.adoptMeta(state, last);            // new phone: everything comes down
        else {
          const choice = await hooks.askConflict();
          if (choice === 'cloud') { S.clearData(state); S.adoptMeta(state, last); }
          else if (choice === 'phone') { for (const c of COLS) last[c] = toMap(await col(c).get({ source: 'server' })); }   // the cloud copy is brought in line with this phone
          else { await auth.signOut(); return; }                       // closed without choosing: change nothing
        }
      }
      if (my !== runId) return;
      saveLast();
    }
    const seen = new Set();
    COLS.forEach((c) => {
      unsubs.push(col(c).onSnapshot({ includeMetadataChanges: true }, (snap) => {
        if (my !== runId) return;
        const changed = S.reconcile(hooks.getState(), last, c, toMap(snap)); saveLast();
        if (changed) hooks.onRemote();
        if (!seen.has(c)) { seen.add(c); if (seen.size === COLS.length) { ready = true; push(); } }
        if (ready) set(snap.metadata.hasPendingWrites ? 'syncing' : snap.metadata.fromCache && navigator.onLine === false ? 'offline' : 'synced');
      }, (e) => set(e && e.code === 'permission-denied' ? 'rules' : 'error', e && e.message)));
    });
  }

  // Called by the app after every local save.
  function changed() { if (!ready) return; clearTimeout(pushTimer); pushTimer = setTimeout(push, 700); }
  async function push() {
    if (!ready || !user) return;
    const d = S.diff(hooks.getState(), last); if (!d.sets.length && !d.dels.length) return;
    const before = { sets: d.sets.map((o) => [o.col, o.id, last[o.col][o.id]]), dels: d.dels.map((o) => [o.col, o.id, last[o.col][o.id]]) };
    S.commit(last, d); saveLast(); set('syncing');
    const ops = [...d.sets.map((o) => ({ o, del: false })), ...d.dels.map((o) => ({ o, del: true }))];
    try {
      for (let i = 0; i < ops.length; i += 400) {
        const b = db.batch();
        ops.slice(i, i + 400).forEach(({ o, del }) => { const ref = col(o.col).doc(o.id); if (del) b.delete(ref); else b.set(ref, { j: o.json }); });
        await b.commit();
      }
      set('synced');
    } catch (e) {                                                   // not accepted: forget that we sent it, so it is tried again
      before.sets.forEach(([c, id, v]) => { if (v === undefined) delete last[c][id]; else last[c][id] = v; });
      before.dels.forEach(([c, id, v]) => { last[c][id] = v; });
      saveLast(); set(e && e.code === 'permission-denied' ? 'rules' : navigator.onLine === false ? 'offline' : 'error', e && e.message);
    }
  }

  const need = () => { if (!auth) throw Object.assign(new Error('unavailable'), { code: 'app/unavailable' }); return auth; };
  const api = {
    init, changed, info, push,
    signInGoogle: () => { const a = need(); return a.signInWithPopup(new root.firebase.auth.GoogleAuthProvider()); },
    signIn: (email, pw) => need().signInWithEmailAndPassword(email, pw),
    signUp: (email, pw) => need().createUserWithEmailAndPassword(email, pw),
    reset: (email) => need().sendPasswordResetEmail(email),
    signOut: () => need().signOut(),
  };
  root.Cloud = api;
})(window);

/* Cloud account + sync (Firebase: sign-in with Google or email/password, data in Firestore). The app keeps working from the
   phone's own copy when offline or signed out; the cloud copy is kept in step through the rules in sync.js.
   Data lives in a "workspace" (workspaces/{id}) that people are members of, so one project can serve many businesses later. */
(function (root) {
  const S = root.Sync, T = root.Team;
  const CONFIG = { apiKey: 'AIzaSyAfAEJ1Yy8DtQg0LDS_bkTFLgHx0d3ym8g', authDomain: 'b-ruiz.firebaseapp.com', projectId: 'b-ruiz', storageBucket: 'b-ruiz.firebasestorage.app', messagingSenderId: '252946775951', appId: '1:252946775951:web:735af0ffbe69d9966a15fa' };   // public by design; the Firestore rules protect the data
  const FILES = ['vendor/firebase/firebase-app-compat.js', 'vendor/firebase/firebase-auth-compat.js', 'vendor/firebase/firebase-firestore-compat.js', 'vendor/firebase/firebase-storage-compat.js'];
  const COLS = ['batches', 'items', 'invoices', 'meta'];
  let hooks = null, auth = null, db = null, user = null, wid = null, last = null, unsubs = [], ready = false, pushTimer = null, runId = 0, team = null, reqUnsub = null, ensuring = false;
  const st = { status: 'loading', error: '' };
  let readyRes; const sdkReady = new Promise((r) => { readyRes = r; });     // resolves once the sign-in code has loaded (or failed to)
  const set = (status, error) => { st.status = status; st.error = error || ''; if (hooks && hooks.onStatus) hooks.onStatus(info()); };
  const info = () => ({ status: st.status, error: st.error, email: user ? user.email || user.displayName || '' : '', signedIn: !!user, uid: user ? user.uid : '' });
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full: sync state is rebuilt next time */ } };
  // Rough tally of what THIS phone used today against the free daily limits (the real total is in the Firebase console).
  const today = () => new Date().toISOString().slice(0, 10);
  function tally(kind, n) { if (!n) return; let u = lsGet('buy-sell-cloud-usage'); if (!u || u.day !== today()) u = { day: today(), reads: 0, writes: 0 }; u[kind] += n; lsSet('buy-sell-cloud-usage', u); }
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
      readyRes();   // stay 'loading' until the saved sign-in is read: saying 'signedOut' now made the Sign in banner flash for people who are signed in
      let heard = false; setTimeout(() => { if (!heard && !lsGet('buy-sell-was-signed-in')) set('signedOut'); }, 6000);   // safety: never leave it loading for someone who never signed in
      auth.onAuthStateChanged((u) => { heard = true; user = u; lsSet('buy-sell-was-signed-in', !!u); teardown(); if (!u) return set('signedOut'); start().catch((e) => set(e && e.code === 'permission-denied' ? 'rules' : (navigator.onLine === false ? 'offline' : 'error'), e && e.message)); });
    }).catch(() => { set('unavailable'); readyRes(); });
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
    window.addEventListener('online', () => { if (user && !ready) start().catch(() => {}); });
    window.addEventListener('offline', () => { if (user) set('offline'); });
  }

  function teardown() { runId++; unsubs.forEach((u) => { try { u(); } catch (e) { /* ignore */ } }); unsubs = []; reqUnsub = null; team = null; ready = false; wid = null; last = null; clearTimeout(pushTimer); }

  async function resolveWorkspace() {
    const cache = 'buy-sell-cloud-ws:' + user.uid, c = lsGet(cache); if (c) return c;
    const snap = await db.collection('users').doc(user.uid).get();
    if (snap.exists && snap.data().workspaceId) { lsSet(cache, snap.data().workspaceId); return snap.data().workspaceId; }
    return null;      // no business yet: the person creates one or asks to join one
  }
  const joinKey = () => 'buy-sell-join:' + user.uid;
  const me = () => ({ name: (user && (user.displayName || (user.email || '').split('@')[0])) || '', email: (user && user.email) || '' });
  const FV = () => root.firebase.firestore.FieldValue;
  const wsRef = () => db.collection('workspaces').doc(wid);
  const coded = (code, msg) => Object.assign(new Error(msg || code), { code });

  // Waiting for the owner to answer a request to join
  function watchJoin(wsId, my) {
    const ref = db.collection('workspaces').doc(wsId).collection('joinRequests').doc(user.uid);
    unsubs.push(ref.onSnapshot((snap) => {
      if (my !== runId) return;
      const d = snap.exists ? snap.data() : null;
      if (!d) { lsSet(joinKey(), null); return set('choose'); }                 // cancelled
      if (d.status === 'approved') { adopt(wsId, ref).catch((e) => set('error', e && e.message)); return; }
      set(d.status === 'declined' ? 'declined' : 'pending');
    }, (e) => set('error', e && e.message)));
  }
  async function adopt(wsId, reqRef) {
    await db.collection('users').doc(user.uid).set({ workspaceId: wsId, email: user.email || '' });
    lsSet('buy-sell-cloud-ws:' + user.uid, wsId); lsSet(joinKey(), null);
    reqRef.delete().catch(() => { /* tidy-up only */ });
    teardown(); await start();
  }
  function awaiting(my) { const j = lsGet(joinKey()); if (j && j.ws) { watchJoin(j.ws, my); set('pending'); } else set('choose'); }

  // Create a business of your own (the person who creates it is its Owner)
  async function createBusiness(name) {
    if (!user) throw coded('auth/none');
    const ref = db.collection('users').doc(user.uid);
    for (let n = 0; n < 4; n++) {
      const code = T.genCode(), ws = db.collection('workspaces').doc(), b = db.batch();
      b.set(ws, { name: name || 'My business', ownerUid: user.uid, members: { [user.uid]: 'owner' }, names: { [user.uid]: me().name || me().email }, perms: T.defaults(), code, createdAt: FV().serverTimestamp() });
      b.set(db.collection('codes').doc(code), { ws: ws.id });
      b.set(ref, { workspaceId: ws.id, email: user.email || '' });
      try { await b.commit(); lsSet('buy-sell-cloud-ws:' + user.uid, ws.id); lsSet(joinKey(), null); teardown(); await start(); return; }
      catch (e) { if (n === 3 || !(e && e.code === 'permission-denied')) throw e; }   // a code that already exists looks like a refused write: try another one
    }
  }
  // Ask to join a business with its code; the Owner answers
  async function joinByCode(raw) {
    if (!user) throw coded('auth/none');
    const code = T.normCode(raw); if (code.length < 6) throw coded('join/short');
    const c = await db.collection('codes').doc(code).get({ source: 'server' }).catch(() => null);
    if (!c || !c.exists) throw coded('join/invalid');
    const wsId = c.data().ws, ref = db.collection('workspaces').doc(wsId).collection('joinRequests').doc(user.uid);
    await ref.delete().catch(() => { /* none yet */ });
    await ref.set({ name: me().name, email: me().email, status: 'pending', createdAt: FV().serverTimestamp() });
    lsSet(joinKey(), { ws: wsId, code }); teardown(); const my = runId; watchJoin(wsId, my); set('pending');
  }
  async function cancelJoin() {
    const j = lsGet(joinKey()); lsSet(joinKey(), null);
    if (j && j.ws) await db.collection('workspaces').doc(j.ws).collection('joinRequests').doc(user.uid).delete().catch(() => {});
    teardown(); set('choose');
  }
  function removedFromBusiness(my) {
    if (my !== runId) return;
    lsSet('buy-sell-cloud-ws:' + user.uid, null);
    db.collection('users').doc(user.uid).set({ email: user.email || '' }).catch(() => {});
    teardown(); if (hooks.onTeam) hooks.onTeam(null); set('removed');
  }
  // The business's team document: who is in it, their ranks, what each rank may do, the business code
  function watchTeam(my) {
    unsubs.push(wsRef().onSnapshot((snap) => {
      if (my !== runId || !snap.exists) return;
      const d = snap.data(), rank = (d.members || {})[user.uid];
      if (!rank) return removedFromBusiness(my);
      team = { wid, name: d.name || '', rank, members: d.members || {}, names: d.names || {}, perms: d.perms || null, code: d.code || '', ownerUid: d.ownerUid || '' };
      if (hooks.onTeam) hooks.onTeam(team);
      if (rank === 'owner') { ensureOwnerDoc(d); watchRequests(my); } else stopRequests();
    }, () => { /* the data listeners report permission problems */ }));
  }
  function ensureOwnerDoc(d) {
    if (ensuring) return; const upd = {};
    if (!d.names || !d.names[user.uid]) upd['names.' + user.uid] = me().name || me().email;
    if (!d.perms) upd.perms = T.defaults();
    ensuring = true;
    (d.code ? Promise.resolve() : newCode()).then(() => (Object.keys(upd).length ? wsRef().update(upd) : null)).catch(() => {}).then(() => { ensuring = false; });
  }
  function watchRequests(my) {
    if (reqUnsub) return;
    const un = wsRef().collection('joinRequests').where('status', '==', 'pending').onSnapshot((snap) => {
      if (my !== runId) return; const list = []; snap.forEach((d) => list.push(Object.assign({ uid: d.id }, d.data())));
      if (hooks.onRequestsError) hooks.onRequestsError(null);
      if (hooks.onRequests) hooks.onRequests(list);
    }, (e) => { if (hooks.onRequestsError) hooks.onRequestsError((e && e.code) || 'error'); });
    reqUnsub = un; unsubs.push(() => { un(); reqUnsub = null; });
  }
  function stopRequests() { if (reqUnsub) { reqUnsub(); reqUnsub = null; if (hooks.onRequests) hooks.onRequests([]); } }
  // Owner: fetch the waiting requests from the server right now (the live list can be late), and test the pieces sharing depends on
  async function refreshRequests() {
    const snap = await wsRef().collection('joinRequests').where('status', '==', 'pending').get({ source: 'server' });
    const list = []; snap.forEach((d) => list.push(Object.assign({ uid: d.id }, d.data())));
    if (hooks.onRequestsError) hooks.onRequestsError(null); if (hooks.onRequests) hooks.onRequests(list); return list;
  }
  async function checkSharing() {
    const out = { team: 'ok', code: 'ok', requests: 'ok' }, why = (e) => (e && e.code) || 'error';
    try {
      const d = await wsRef().get({ source: 'server' });
      if (!d.exists) out.team = 'missing';
      else if (!d.data().code) out.code = 'nocode';
      else { try { const k = await db.collection('codes').doc(d.data().code).get({ source: 'server' }); out.code = k.exists && k.data().ws === wid ? 'ok' : 'missing'; } catch (e) { out.code = why(e); } }
    } catch (e) { out.team = why(e); }
    try { await wsRef().collection('joinRequests').where('status', '==', 'pending').get({ source: 'server' }); } catch (e) { out.requests = why(e); }
    return out;
  }
  // Owner actions
  const approve = (uid, rank, name) => { const b = db.batch(); b.update(wsRef(), { ['members.' + uid]: rank, ['names.' + uid]: name || '' }); b.update(wsRef().collection('joinRequests').doc(uid), { status: 'approved', rank }); return b.commit(); };
  const decline = (uid) => wsRef().collection('joinRequests').doc(uid).update({ status: 'declined' });
  const setRank = (uid, rank) => wsRef().update({ ['members.' + uid]: rank });
  const removeMember = (uid) => wsRef().update({ ['members.' + uid]: FV().delete(), ['names.' + uid]: FV().delete() });
  const setPerms = (perms) => wsRef().update({ perms });
  async function newCode() {
    const old = team && team.code;
    for (let n = 0; n < 4; n++) {
      const code = T.genCode(), b = db.batch();
      b.set(db.collection('codes').doc(code), { ws: wid }); b.update(wsRef(), { code }); if (old) b.delete(db.collection('codes').doc(old));
      try { await b.commit(); return code; } catch (e) { if (n === 3 || !(e && e.code === 'permission-denied')) throw e; }
    }
  }
  const transfer = (toUid) => wsRef().update({ ['members.' + toUid]: 'owner', ['members.' + user.uid]: 'manager', ownerUid: toUid });
  const col = (c) => db.collection('workspaces').doc(wid).collection(c);
  const toMap = (snap) => { const m = {}; snap.forEach((d) => { const j = d.data().j; if (typeof j === 'string') m[d.id] = j; }); return m; };

  async function start() {
    const my = ++runId; set('connecting');
    wid = await resolveWorkspace(); if (my !== runId) return;
    if (!wid) return awaiting(my);
    watchTeam(my);
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
        tally('reads', snap.docChanges ? snap.docChanges().length : 0);
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
    S.commit(last, d); saveLast(); set('syncing'); tally('writes', d.sets.length + d.dels.length);
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

  // Bytes the business records take in the cloud (the text of every document), and today's tally.
  const usage = () => { const u = lsGet('buy-sell-cloud-usage'), t0 = u && u.day === today() ? u : { reads: 0, writes: 0 }; let bytes = 0, docs = 0; if (last) COLS.forEach((c) => Object.keys(last[c] || {}).forEach((id) => { bytes += last[c][id].length + id.length + 40; docs++; })); return { bytes, docs, reads: t0.reads, writes: t0.writes, known: !!last }; };
  // Tests the published rules: this workspace must be readable, and a workspace that is not ours must be refused.
  async function checkRules() {
    if (!db || !wid) throw new Error('not ready');
    let mine = false, others = false;
    try { await col('meta').doc('settings').get({ source: 'server' }); mine = true; } catch (e) { mine = false; }
    try { await db.collection('workspaces').doc('rules-check-not-mine').collection('meta').doc('settings').get({ source: 'server' }); others = false; } catch (e) { others = !!(e && e.code === 'permission-denied'); }
    return mine && others ? 'ok' : !mine ? 'noAccess' : 'tooOpen';
  }
  // Sign-in calls wait (up to 10 s) for the sign-in code to finish loading, so a very early tap still works.
  const need = () => Promise.race([sdkReady, new Promise((r) => setTimeout(r, 10000))]).then(() => { if (!auth) throw Object.assign(new Error('unavailable'), { code: 'app/unavailable' }); return auth; });
  const api = {
    init, changed, info, push, usage, checkRules, createBusiness, joinByCode, cancelJoin, refreshRequests, checkSharing, team: () => team, approve, decline, setRank, removeMember, setPerms, newCode, transfer,
    // handles the online store uses (the same signed-in Firestore connection)
    db: () => db, storage: () => (root.firebase && root.firebase.storage ? root.firebase.storage() : null), uid: () => (user ? user.uid : null), workspace: () => wid, stamp: () => root.firebase.firestore.FieldValue.serverTimestamp(), ready: () => !!(db && user && wid),
    signInGoogle: () => need().then((a) => a.signInWithPopup(new root.firebase.auth.GoogleAuthProvider())),
    signIn: (email, pw) => need().then((a) => a.signInWithEmailAndPassword(email, pw)),
    signUp: (email, pw) => need().then((a) => a.createUserWithEmailAndPassword(email, pw)),
    reset: (email) => need().then((a) => a.sendPasswordResetEmail(email)),
    signOut: () => need().then((a) => a.signOut()),
  };
  root.Cloud = api;
})(window);

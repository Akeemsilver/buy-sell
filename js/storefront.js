/* Online store, the owner's side: publishes the catalogue (name, price, sale price and a small picture of each item in the chosen batches)
   to Firestore where the public page store.html reads it, and listens for the orders customers send. Costs and profit never leave the app.
   Pictures are small JPEGs stored inside the catalogue documents, so no paid storage is needed. */
(function (root) {
  const SC = root.StoreCore, PS = root.PhotoStore;
  let A = null, orders = [], unsub = null, listenFor = '', timer = 0, running = false, runStart = 0;
  // Nothing may hang the publish: a picture upload or the final write that never answers is given up after a while (the small free picture is used instead).
  const TUNE = { pic: 20000, commit: 40000, stale: 90000 };
  const withTimeout = (p, ms) => { let t; return Promise.race([p, new Promise((_, no) => { t = setTimeout(() => no(Object.assign(new Error('timeout'), { code: 'timeout' })), ms); })]).finally(() => clearTimeout(t)); };
  const info = { at: 0, count: 0, error: '', busy: false, sharp: false };
  const pics = new Map();
  const cfg = () => SC.norm(A.state().settings.store);
  // Items inside an order nobody has answered yet: they are held back from the store until the order is accepted (then they are sold) or declined.
  const reserved = () => orders.filter((o) => o.status === 'new').flatMap((o) => (o.items || []).map((i) => i.id)).filter(Boolean);
  const link = (c) => { c = c || cfg(); const id = c.slug || c.id; return id ? new URL('store.html?s=' + id, location.href).href : ''; };
  // Claims a short link name for this store (names/{name} points at the store). Resolves '' when done, or a reason: short, chars, reserved, taken, offline.
  async function claim(name) {
    const c = cfg(), e = SC.slugError(name); if (e) return e; if (!c.id || !root.Cloud || !Cloud.ready()) return 'offline';
    try {
      const ref = Cloud.db().collection('names').doc(name), cur = await ref.get();
      if (cur.exists && cur.data().sid !== c.id) return 'taken';
      if (!cur.exists) await ref.set({ sid: c.id });
      if (c.slug && c.slug !== name) await Cloud.db().collection('names').doc(c.slug).delete().catch(() => {});
      return '';
    } catch (x) { return x && x.code === 'permission-denied' ? 'rules' : 'offline'; }
  }
  const ts = (o) => (o.createdAt && o.createdAt.toMillis ? o.createdAt.toMillis() : 0);

  async function smallPicture(id) {
    if (pics.has(id)) return pics.get(id);
    const rec = await PS.get(id).catch(() => null), blob = rec && (rec.full || rec.thumb); if (!blob) return '';
    const bmp = await createImageBitmap(blob), k = Math.min(1, 640 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.8); pics.set(id, url); return url;
  }

  // Sharp pictures (cloud storage): the checked 900 px photo, about 60 to 80 KB, kept while the item is for sale and deleted by the same rule as the saved
  // photo (a week after the sale). Needs Cloud Storage to be switched on (go-live step); until then, or on any error, the small free picture is used.
  const PICS = (id) => 'buy-sell-store-pics:' + id, DAY = 86400000;
  const readMap = (id) => { try { return JSON.parse(localStorage.getItem(PICS(id))) || {}; } catch (e) { return {}; } };
  const writeMap = (id, m) => { try { localStorage.setItem(PICS(id), JSON.stringify(m)); } catch (e) { /* uploaded again next time */ } };
  async function sharpBlob(photoId) {
    const rec = await PS.get(photoId).catch(() => null), blob = rec && rec.full; if (!blob) return null;
    if (blob.size <= 380 * 1024 && blob.type === 'image/jpeg') return blob;
    const bmp = await createImageBitmap(blob), k = Math.min(1, 900 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.8));
  }
  // Returns the picture address for one item, uploading it when it is new or changed; '' when sharp pictures are not available.
  async function sharpUrl(p, sid, map, storage) {
    const have = map[p.id]; const blob0 = have && have.pid === p.photo ? have : null; if (blob0 && blob0.url) return blob0.url;
    const blob = await sharpBlob(p.photo); if (!blob) return '';
    const ref = storage.ref('stores/' + sid + '/' + p.id + '.jpg'); await ref.put(blob, { contentType: 'image/jpeg' });
    const url = await ref.getDownloadURL(); map[p.id] = { url, pid: p.photo, at: Date.now() }; return url;
  }
  async function cleanPictures(sid, storage) {
    const map = readMap(sid), gone = SC.stalePics(A.state(), Object.keys(map), Date.now()); if (!gone.length) return;
    for (const id of gone) { try { await storage.ref('stores/' + sid + '/' + id + '.jpg').delete(); } catch (e) { if (!e || e.code !== 'storage/object-not-found') continue; } delete map[id]; }
    writeMap(sid, map);
  }

  // Writes the store and its catalogue when something public changed (compared with what was last written from this phone).
  async function publish(force) {
    const c = cfg(); if (!c.id || !root.Cloud || !Cloud.ready()) return false;
    if (running && Date.now() - runStart < TUNE.stale) return false;   // one at a time (a run stuck for over a minute is given up)
    running = true; runStart = Date.now(); info.busy = true; info.error = '';
    try {
      const list = SC.shown(A.state(), c, reserved()), head = { open: c.open, name: c.name || A.bizName(), whatsapp: c.whatsapp, showLeft: c.showLeft, showPrices: c.showPrices !== false, logo: A.state().settings.bizLogo || '', color: root.Theme ? Theme.brand() : '#741b47', locations: c.locations };
      const storage = root.Cloud && Cloud.storage ? Cloud.storage() : null; try { if (storage) { storage.setMaxUploadRetryTime(8000); storage.setMaxOperationRetryTime(8000); } } catch (e) { /* older SDK */ }
      const retry = localStorage.getItem('buy-sell-store-mode') === 'small' ? Math.floor(Date.now() / DAY) : 0;   // while only small pictures work, try the sharp ones again once a day
      const sig = SC.hash({ head, list, retry, pv: 3 }), key = 'buy-sell-store-sig:' + c.id;
      if (!force && localStorage.getItem(key) === sig) { info.at = info.at || Date.now(); info.count = list.length; if (storage) cleanPictures(c.id, storage).catch(() => {}); return false; }
      // the pictures already published: a phone that does not hold a photo itself must never blank the picture another phone published
      const old = {}; try { const cs = await withTimeout(Cloud.db().collection('stores').doc(c.id).collection('catalog').get(), TUNE.pic); cs.forEach((d) => (d.data().items || []).forEach((it) => { if (it && it.img) old[it.id] = it.img; })); } catch (e) { /* no earlier copy to fall back on */ }
      const map = readMap(c.id); let sharpOk = !!storage, sharpN = 0, picErr = 0; const items = [];
      for (const p of list) {
        let img = '';
        if (p.photo && sharpOk) { try { img = await withTimeout(sharpUrl(p, c.id, map, storage), TUNE.pic); if (img) sharpN++; } catch (e) { picErr++; if (picErr >= 2 || (e && /unauthorized|unauthenticated|no-default-bucket|project-not-found|quota|timeout/.test(e.code || ''))) sharpOk = false; } }
        if (p.photo && !img) img = await withTimeout(smallPicture(p.photo), TUNE.pic).catch(() => '');
        if (p.photo && !img && root.PhotoSync) img = await withTimeout(PhotoSync.url(p.photo, 'full'), TUNE.pic).catch(() => '') || '';   // not on this phone: the business's cloud copy of the picture
        if (p.photo && !img && old[p.id]) img = old[p.id];
        items.push(Object.assign({ id: p.id, name: p.name, nameEs: p.nameEs, sizes: p.sizes, price: p.price, sale: p.sale, pct: p.pct, transit: p.transit, img }, p.details ? { details: p.details } : {}, p.detailsEs ? { detailsEs: p.detailsEs } : {}));
      }
      writeMap(c.id, map); info.sharp = sharpN > 0; try { localStorage.setItem('buy-sell-store-mode', sharpN > 0 || !list.some((p) => p.photo) ? 'sharp' : 'small'); } catch (e) { /* ignore */ }
      const db = Cloud.db(), sref = db.collection('stores').doc(c.id), chunks = SC.chunk(items), b = db.batch();
      const ex = await sref.get().catch(() => null), owner = (ex && ex.exists && ex.data().ownerUid) || Cloud.uid();   // whoever created the store stays its owner, even when another member of the business publishes
      b.set(sref, Object.assign({ workspace: Cloud.workspace(), ownerUid: owner, chunks: chunks.length, count: items.length, updatedAt: Cloud.stamp() }, head), { merge: true });   // merge: keeps the 'reserved' list the Firebase function keeps
      chunks.forEach((part, i) => b.set(sref.collection('catalog').doc('c' + i), { i, items: part }));
      await withTimeout(b.commit(), TUNE.commit);
      try { localStorage.setItem(key, sig); } catch (e) { /* published again next time */ }
      info.at = Date.now(); info.count = items.length; listen(); if (storage) cleanPictures(c.id, storage).catch(() => {}); return true;
    } catch (e) { info.error = (e && e.code) || 'error'; return false; } finally { running = false; info.busy = false; A.refresh(); }
  }
  const schedule = () => { clearTimeout(timer); if (A && cfg().id && root.Cloud && Cloud.ready()) timer = setTimeout(() => publish(false), 4000); };

  function stopListen() { if (unsub) { try { unsub(); } catch (e) { /* ignore */ } } unsub = null; listenFor = ''; }
  function listen() {
    const c = cfg(); if (!c.id || !root.Cloud || !Cloud.ready()) return stopListen();
    if (unsub && listenFor === c.id) return; stopListen(); listenFor = c.id;
    unsub = Cloud.db().collection('stores').doc(c.id).collection('orders').onSnapshot((snap) => {
      orders = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort((a, b) => ts(b) - ts(a)); A.onOrders(); schedule();
    }, (e) => { info.error = (e && e.code) || 'error'; stopListen(); });
  }

  /* ---------- distance of each delivery: the driving route by road from the seller's store pin to the customer's pin ---------- */
  // OpenStreetMap's free routing service (no account, no live traffic). Kilometres to one decimal, or null.
  const road = (a, b) => fetch('https://router.project-osrm.org/route/v1/driving/' + a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat + '?overview=false').then((r) => r.json()).then((j) => { const m = j && j.routes && j.routes[0] && j.routes[0].distance; return m > 0 ? Math.round(m / 100) / 10 : null; }).catch(() => null);
  let measuring = false; const tried = new Set();
  // Works out and saves the distance on every delivery order that has a pin and none yet (or one measured from another store pin).
  // A road distance is kept for good; when the service cannot be reached the straight-line distance is saved, marked approximate, and tried again next time.
  async function measure(home, again) {
    home = home && SC.geo(home.lat, home.lng); if (measuring || !home || !cfg().id) return 0;
    const from = home.lat + ',' + home.lng; measuring = true; let n = 0;
    try {
      for (const o of orders.slice()) {
        const pin = o.option === 'delivery' ? SC.geo(o.lat, o.lng) : null; if (!pin || o.status === 'declined') continue;
        if (o.kmSrc === 'manual') continue;   // a distance the seller typed is never measured again
        const good = Number.isFinite(Number(o.km)) && o.kmFrom === from && o.kmSrc === 'road'; if (good) continue;
        if (o.kmSrc === 'line' && o.kmFrom === from && !again && tried.has(o.id)) continue;
        tried.add(o.id);
        let km = await road(home, pin), src = 'road'; if (km == null) { km = SC.lineKm(home, pin); src = 'line'; }
        try { await Cloud.db().collection('stores').doc(cfg().id).collection('orders').doc(o.id).update({ km, kmSrc: src, kmFrom: from }); Object.assign(o, { km, kmSrc: src, kmFrom: from }); n++; } catch (e) { /* the owner can try again */ }
        await new Promise((ok) => setTimeout(ok, 1100));   // the free service asks for about one request a second
      }
    } finally { measuring = false; }
    if (n && A.onOrders) A.onOrders();
    return n;
  }
  // any other change to one order (a planned delivery day, a distance typed by hand)
  const patch = (id, extra) => Cloud.db().collection('stores').doc(cfg().id).collection('orders').doc(id).update(extra);
  // the moment of each answer is saved too (confirmedAt, doneAt, declinedAt), for the order's timeline
  // delete one finished order (owners only, by the store rules); invoices and stock are never touched
  const remove = (id) => Cloud.db().collection('stores').doc(cfg().id).collection('orders').doc(id).delete();
  const setStatus = (id, status, extra) => Cloud.db().collection('stores').doc(cfg().id).collection('orders').doc(id).update(Object.assign({ status }, status === 'new' ? {} : { [status + 'At']: Cloud.stamp() }, extra || {}));

  root.Store = { init: (api) => { A = api; }, cfg, link, claim, publish, schedule, listen, stopListen, setStatus, remove, measure, patch, info: () => info, tune: (o) => Object.assign(TUNE, o), orders: () => orders, reserved, newCount: () => orders.filter((o) => o.status === 'new').length,
    ageMs: (o) => (ts(o) ? Date.now() - ts(o) : 0), when: (o) => (ts(o) ? new Date(ts(o)) : null) };
})(window);

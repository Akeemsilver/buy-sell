/* Online store, the owner's side: publishes the catalogue (name, price, sale price and a small picture of each item in the chosen batches)
   to Firestore where the public page store.html reads it, and listens for the orders customers send. Costs and profit never leave the app.
   Pictures are small JPEGs stored inside the catalogue documents, so no paid storage is needed. */
(function (root) {
  const SC = root.StoreCore, PS = root.PhotoStore;
  let A = null, orders = [], unsub = null, listenFor = '', timer = 0, running = false;
  const info = { at: 0, count: 0, error: '', busy: false, sharp: false };
  const pics = new Map();
  const cfg = () => SC.norm(A.state().settings.store);
  const link = (c) => { const id = (c || cfg()).id; return id ? new URL('store.html?s=' + id, location.href).href : ''; };
  const ts = (o) => (o.createdAt && o.createdAt.toMillis ? o.createdAt.toMillis() : 0);

  async function smallPicture(id) {
    if (pics.has(id)) return pics.get(id);
    const rec = await PS.get(id).catch(() => null), blob = rec && (rec.full || rec.thumb); if (!blob) return '';
    const bmp = await createImageBitmap(blob), k = Math.min(1, 360 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.72); pics.set(id, url); return url;
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
    const c = cfg(); if (!c.id || !root.Cloud || !Cloud.ready() || running) return false;
    running = true; info.busy = true; info.error = '';
    try {
      const list = SC.shown(A.state(), c), head = { open: c.open, name: c.name || A.bizName(), whatsapp: c.whatsapp, color: root.Theme ? Theme.brand() : '#741b47', locations: c.locations };
      const storage = root.Cloud && Cloud.storage ? Cloud.storage() : null, retry = localStorage.getItem('buy-sell-store-mode') === 'small' ? Math.floor(Date.now() / DAY) : 0;   // while only small pictures work, try the sharp ones again once a day
      const sig = SC.hash({ head, list, retry }), key = 'buy-sell-store-sig:' + c.id;
      if (!force && localStorage.getItem(key) === sig) { info.at = info.at || Date.now(); info.count = list.length; if (storage) cleanPictures(c.id, storage).catch(() => {}); return false; }
      const map = readMap(c.id); let sharpOk = !!storage, sharpN = 0, picErr = 0; const items = [];
      for (const p of list) {
        let img = '';
        if (p.photo && sharpOk) { try { img = await sharpUrl(p, c.id, map, storage); if (img) sharpN++; } catch (e) { picErr++; if (picErr >= 2 || (e && /unauthorized|unauthenticated|no-default-bucket|project-not-found|quota/.test(e.code || ''))) sharpOk = false; } }
        if (p.photo && !img) img = await smallPicture(p.photo);
        items.push({ id: p.id, name: p.name, nameEs: p.nameEs, price: p.price, sale: p.sale, pct: p.pct, transit: p.transit, img });
      }
      writeMap(c.id, map); info.sharp = sharpN > 0; try { localStorage.setItem('buy-sell-store-mode', sharpN > 0 || !list.some((p) => p.photo) ? 'sharp' : 'small'); } catch (e) { /* ignore */ }
      const db = Cloud.db(), sref = db.collection('stores').doc(c.id), chunks = SC.chunk(items), b = db.batch();
      b.set(sref, Object.assign({ workspace: Cloud.workspace(), ownerUid: Cloud.uid(), chunks: chunks.length, count: items.length, updatedAt: Cloud.stamp() }, head));
      chunks.forEach((part, i) => b.set(sref.collection('catalog').doc('c' + i), { i, items: part }));
      await b.commit();
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
      orders = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort((a, b) => ts(b) - ts(a)); A.onOrders();
    }, (e) => { info.error = (e && e.code) || 'error'; stopListen(); });
  }
  const setStatus = (id, status) => Cloud.db().collection('stores').doc(cfg().id).collection('orders').doc(id).update({ status });

  root.Store = { init: (api) => { A = api; }, cfg, link, publish, schedule, listen, stopListen, setStatus, info: () => info, orders: () => orders, newCount: () => orders.filter((o) => o.status === 'new').length,
    ageMs: (o) => (ts(o) ? Date.now() - ts(o) : 0), when: (o) => (ts(o) ? new Date(ts(o)) : null) };
})(window);

/* Online store, the owner's side: publishes the catalogue (name, price, sale price and a small picture of each item in the chosen batches)
   to Firestore where the public page store.html reads it, and listens for the orders customers send. Costs and profit never leave the app.
   Pictures are small JPEGs stored inside the catalogue documents, so no paid storage is needed. */
(function (root) {
  const SC = root.StoreCore, PS = root.PhotoStore;
  let A = null, orders = [], unsub = null, listenFor = '', timer = 0, running = false;
  const info = { at: 0, count: 0, error: '', busy: false };
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

  // Writes the store and its catalogue when something public changed (compared with what was last written from this phone).
  async function publish(force) {
    const c = cfg(); if (!c.id || !root.Cloud || !Cloud.ready() || running) return false;
    running = true; info.busy = true; info.error = '';
    try {
      const list = SC.shown(A.state(), c), head = { open: c.open, name: c.name || A.bizName(), whatsapp: c.whatsapp, color: root.Theme ? Theme.brand() : '#741b47', locations: c.locations };
      const sig = SC.hash({ head, list }), key = 'buy-sell-store-sig:' + c.id;
      if (!force && localStorage.getItem(key) === sig) { info.at = info.at || Date.now(); info.count = list.length; return false; }
      const items = []; for (const p of list) items.push({ id: p.id, name: p.name, price: p.price, sale: p.sale, pct: p.pct, transit: p.transit, img: p.photo ? await smallPicture(p.photo) : '' });
      const db = Cloud.db(), sref = db.collection('stores').doc(c.id), chunks = SC.chunk(items), b = db.batch();
      b.set(sref, Object.assign({ workspace: Cloud.workspace(), ownerUid: Cloud.uid(), chunks: chunks.length, count: items.length, updatedAt: Cloud.stamp() }, head));
      chunks.forEach((part, i) => b.set(sref.collection('catalog').doc('c' + i), { i, items: part }));
      await b.commit();
      try { localStorage.setItem(key, sig); } catch (e) { /* published again next time */ }
      info.at = Date.now(); info.count = items.length; listen(); return true;
    } catch (e) { info.error = (e && e.code) || 'error'; return false; } finally { running = false; info.busy = false; A.refresh(); }
  }
  const schedule = () => { clearTimeout(timer); if (cfg().id && root.Cloud && Cloud.ready()) timer = setTimeout(() => publish(false), 4000); };

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

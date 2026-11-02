/* Photos live on this phone (IndexedDB) for now: one record per photo = {id, thumb, full, orig}. Blobs only; the app's data
   (localStorage) just remembers each item's photo id and whether it was checked. */
(function (root) {
  const DB = 'buy-sell-photos', STORE = 'photos';
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((ok, no) => {
    if (typeof indexedDB === 'undefined') return no(new Error('noStorage'));
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(STORE, { keyPath: 'id' });
    rq.onsuccess = () => ok(rq.result); rq.onerror = () => { dbp = null; no(rq.error); };
  }));
  const tx = (mode, fn) => open().then((db) => new Promise((ok, no) => {
    const t = db.transaction(STORE, mode), r = fn(t.objectStore(STORE));
    t.oncomplete = () => ok(r && r.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error);
  }));
  const newId = () => 'ph_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const api = {
    newId,
    put: (rec) => tx('readwrite', (s) => s.put(rec)),
    get: (id) => tx('readonly', (s) => s.get(id)),
    del: (id) => tx('readwrite', (s) => s.delete(id)),
    keys: () => tx('readonly', (s) => s.getAllKeys()),
    // Remove photos no item points to any more (deleted items, batches, replaced photos).
    clean: (usedIds) => api.keys().then((ks) => Promise.all((ks || []).filter((k) => !usedIds.has(k)).map(api.del))),
  };
  root.PhotoStore = api;
})(typeof window !== 'undefined' ? window : globalThis);

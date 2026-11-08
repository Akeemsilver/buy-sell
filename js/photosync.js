/* Cloud photos: every phone in the business sees every photo.
   Each photo is uploaded once, in the two sizes the app already makes (the 200 px thumbnail and the 900 px picture), to the business's
   own folder in Firebase Storage (workspaces/{business}/photos/). A phone that does not hold a photo shows it straight from the cloud
   (an ordinary picture link, so nothing has to be downloaded and saved first). Nothing is ever deleted from the cloud here.
   The sale-time rule still applies on each phone (the big picture is dropped a week after the sale); the cloud copy stays. */
(function (root) {
  const PS = root.PhotoStore, MAX = 395 * 1024, PER_RUN = 12;
  let app = null, running = false, timer = null;
  const urlCache = new Map();                                    // "id:kind" -> address (string) or { no: time } when the cloud has no such file yet
  const ready = () => !!(root.Cloud && Cloud.ready && Cloud.ready() && Cloud.storage && Cloud.storage() && Cloud.workspace());
  const suffix = (k) => (k === 'thumb' ? '_t' : '_f');
  const ref = (id, k) => Cloud.storage().ref('workspaces/' + Cloud.workspace() + '/photos/' + id + suffix(k) + '.jpg');
  const upKey = () => 'buy-sell-photo-up:' + (Cloud.workspace() || '');
  const readDone = () => { try { return new Set(JSON.parse(localStorage.getItem(upKey())) || []); } catch (e) { return new Set(); } };
  const writeDone = (s) => { try { localStorage.setItem(upKey(), JSON.stringify([...s])); } catch (e) { /* uploaded again next time */ } };
  const stopper = /unauthorized|unauthenticated|no-default-bucket|project-not-found|quota|retry-limit|canceled/;

  // The address of one photo in the cloud, or null (not signed in yet, or not uploaded yet).
  async function url(id, kind) {
    if (!id || !ready()) return null;
    const k = id + ':' + kind, c = urlCache.get(k);
    if (typeof c === 'string') return c;
    if (c && c.no && Date.now() - c.no < 40000) return null;
    try { const u = await ref(id, kind).getDownloadURL(); urlCache.set(k, u); return u; }
    catch (e) { if (e && e.code === 'storage/object-not-found') urlCache.set(k, { no: Date.now() }); return null; }
  }

  // Upload what this phone holds and the cloud does not have yet (thumbnails first), a few at a time.
  async function run() {
    if (running || !app || !ready()) return;
    running = true;
    try {
      const done = readDone(), items = app.state().items.filter((i) => i.photo && i.photo.id);
      let budget = PER_RUN, sent = 0;
      outer: for (const kind of ['thumb', 'full']) {
        for (const it of items) {
          if (budget <= 0) break outer;
          if (kind === 'full' && it.photo.noFull) continue;
          const key = it.photo.id + ':' + kind; if (done.has(key)) continue;
          const rec = await PS.get(it.photo.id).catch(() => null), blob = rec && rec[kind]; if (!blob) continue;
          if (blob.size > MAX) { done.add(key); continue; }       // too big for the storage rules: this one stays on the phone
          try { await ref(it.photo.id, kind).put(blob, { contentType: 'image/jpeg' }); done.add(key); urlCache.delete(key); budget--; sent++; }
          catch (e) { if (e && stopper.test(e.code || '')) break outer; }
        }
      }
      if (sent) writeDone(done);
      // photos this phone does not hold: ask the screen to try them again from the cloud
      if (root.PhotoUI && PhotoUI.retry) PhotoUI.retry();
      if (budget <= 0) soon(8000);
    } finally { running = false; }
  }
  function soon(ms) { clearTimeout(timer); timer = setTimeout(() => run().catch(() => {}), ms == null ? 1500 : ms); }

  root.PhotoSync = {
    init: (api) => { app = api; setInterval(() => { if (!document.hidden) run().catch(() => {}); }, 45000); },
    run: () => run().catch(() => {}), soon, url, ready,
  };
})(window);

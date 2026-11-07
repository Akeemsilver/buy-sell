/* Photo screens: adding photos to a batch, the "check photo" editor (crop, then hide marks), thumbnails, sharing.
   Photos stay on this phone (see photostore.js). The app (app.js) hands over what this file needs through PhotoUI.init(). */
(function (root) {
  const P = root.Photo, S = root.PhotoStore, L = root.Logic, I = root.I18n;
  const t = I.t, tn = I.tn;
  let A = null;                                    // the app's helpers (see init)
  const $ = (s, el) => (el || document).querySelector(s);
  const item = (id) => A.state().items.find((i) => i.id === id);
  const num = (v) => Number(v) || 0;

  /* ---------- thumbnails ---------- */

  const urls = new Map();                          // "id:kind" -> object URL
  const pending = new Map();
  function urlFor(id, kind) {
    const k = id + ':' + kind;
    if (urls.has(k)) return Promise.resolve(urls.get(k));
    if (pending.has(k)) return pending.get(k);
    const p = S.get(id).then((rec) => { const b = rec && rec[kind]; if (!b) return null; const u = URL.createObjectURL(b); urls.set(k, u); return u; }).catch(() => null).then((u) => { pending.delete(k); return u; });
    pending.set(k, p); return p;
  }
  function forget(id) { ['thumb', 'full'].forEach((kind) => { const k = id + ':' + kind; if (urls.has(k)) { URL.revokeObjectURL(urls.get(k)); urls.delete(k); } }); }
  // Fill every <img data-ph="id" data-kind="thumb|full"> that is on screen.
  function hydrate() {
    document.querySelectorAll('img[data-ph]').forEach((img) => {
      if (img.dataset.done === img.dataset.ph) return;
      img.dataset.done = img.dataset.ph;
      urlFor(img.dataset.ph, img.dataset.kind || 'thumb').then((u) => { if (u) img.src = u; else img.closest('.ph, .photo-big') && img.closest('.ph, .photo-big').classList.add('miss'); });
    });
  }
  const noTile = () => `<span class="ph none"><i>${t('photo.noPhoto')}</i></span>`;
  function thumb(it) {
    if (!it.photo) return noTile();
    return `<span class="ph"><img data-ph="${it.photo.id}" data-kind="thumb" alt="">${it.photo.checked ? '' : `<em class="warn-badge">${t('photo.check')}</em>`}</span>`;
  }

  /* ---------- item sheet: what customers see / what stays private ---------- */

  // Item page: the photo as before (tap it for the full-screen view), Share under it, then Edit / Replace / Remove side by side.
  function photoBox(it) {
    const st = L.shareStatus(it);
    const pic = it.photo ? `<div class="photo-big" data-act="photo-view" data-id="${it.id}"><div class="pin"><img data-ph="${it.photo.id}" data-kind="${it.photo.noFull ? 'thumb' : 'full'}" alt=""><div class="ptag" id="ptag" ${A.tagHTML(it) ? '' : 'hidden'}>${A.tagHTML(it)}</div></div>${st === 'notChecked' ? `<em class="warn-badge">${t('photo.check')}</em>` : ''}</div>` : `<div class="photo-big none"><i>${t('photo.noPhoto')}</i></div>`;
    return `${pic}<button class="btn primary" data-act="photo-share" data-id="${it.id}" ${st === 'noPhoto' || st === 'gone' ? 'disabled' : ''}>${t('photo.share')}</button>
      ${L.isLocked(it) ? '' : it.photo ? `<div class="photo-actions3"><button class="btn ${it.photo.noOrig && it.photo.checked ? 'faded' : ''}" data-act="photo-check" data-id="${it.id}">${st === 'ok' ? t('photo.editShort') : t('photo.checkShort')}</button>
        <button class="btn" data-act="photo-replace" data-id="${it.id}">${t('photo.replaceShort')}</button>
        <button class="btn danger" data-act="photo-remove" data-id="${it.id}">${t('photo.removeShort')}</button></div>` : `<button class="btn" style="margin-top:8px" data-act="photo-replace" data-id="${it.id}">${t('photo.addOne')}</button>`}`;
  }

  /* ---------- adding photos ---------- */

  function pickFiles(multiple, camera) {
    return new Promise((ok) => {
      const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.multiple = !!multiple; if (camera) f.setAttribute('capture', 'environment');
      f.style.display = 'none'; document.body.appendChild(f);
      let settled = false; const done = (v) => { if (settled) return; settled = true; f.remove(); ok(v); };
      f.onchange = () => done([...f.files]); f.addEventListener('cancel', () => done([]));
      f.click();
    });
  }
  // Decode, find the picture inside the screenshot, and keep the original plus a first (unchecked) crop. Returns the new photo id.
  async function createPhoto(file) {
    const c = await P.loadCanvas(file, 3000), area = P.findPhotoArea(P.pixels(c)), cr = P.crop(c, area), id = S.newId();
    const [thumbB, fullB] = await Promise.all([P.toBlob(P.thumb(cr, 200), 0.8), P.toBlob(P.scaled(cr, 900), 0.84)]);
    await S.put({ id, thumb: thumbB, full: fullB, orig: file });
    return id;
  }
  let busy = 0;                                    // photos being added: do not tidy the store meanwhile
  async function addFiles(batchId, files) {
    if (!files.length) return; busy++;
    try { await addFiles2(batchId, files); } finally { busy--; }
  }
  async function addFiles2(batchId, files) {
    const st = A.state(), b = st.batches.find((x) => x.id === batchId); if (!b) return;
    const free = st.items.filter((i) => i.batchId === batchId && !i.photo && !L.isLocked(i)).length;
    if (files.length > free) {
      const extra = files.length - free;
      if (!A.confirm(tn('photo.extraAsk', extra, { id: A.bl(batchId) }))) files = files.slice(0, free);
      else L.addItems(st, batchId, extra);
    }
    if (!files.length) return A.toast(t('photo.noRoom'));
    const ids = []; let failed = 0;
    for (let n = 0; n < files.length; n++) {
      A.toast(t('photo.adding', { done: n + 1, total: files.length }));
      try { ids.push(await createPhoto(files[n])); } catch (e) { failed++; }
    }
    const r = L.assignPhotos(st, batchId, ids);
    A.save(); A.render();
    A.toast(tn('photo.added', ids.length) + (failed ? ' · ' + tn('photo.failed', failed) : ''));
    if (ids.length) startCheck(r.assigned.map((a) => a.itemId));
  }
  // Pieces of one design share a picture: a change reaches every unsold piece, and a picture is only deleted when no item uses it any more.
  const mates = (it) => L.groupOf(A.state(), it);
  const stillUsed = (id) => A.state().items.some((x) => x.photo && x.photo.id === id);
  const dropBlob = (id) => { if (id && !stillUsed(id)) { forget(id); S.del(id).catch(() => {}); } };
  async function replaceOne(itemId) {
    const files = await pickFiles(false, false); if (!files.length) return;
    const it = item(itemId); if (!it) return; busy++;
    A.toast(t('photo.adding', { done: 1, total: 1 }));
    try {
      const id = await createPhoto(files[0]), old = it.photo && it.photo.id;
      mates(it).forEach((x) => { x.photo = { id, checked: false }; }); A.save(); dropBlob(old);
      A.closeSheet(); A.render(); startCheck([itemId]);
    } catch (e) { A.toast(t('photo.readErr')); } finally { busy--; }
  }
  function removeOne(itemId) {
    const it = item(itemId); if (!it || !it.photo || !A.confirm(t('photo.removeAsk'))) return;
    const old = it.photo.id; mates(it).forEach((x) => { if (x.photo && x.photo.id === old) x.photo = null; }); A.save(); dropBlob(old); A.closeSheet(); A.render();
  }
  function addSheet(batchId) {
    const row = (icon, title, sub, act) => `<button class="row tap" data-act="${act}" data-id="${batchId}"><span style="font-size:22px">${icon}</span><div class="grow"><b>${title}</b><small>${sub}</small></div></button>`;
    const stt = L.photoStats(A.state(), batchId);
    A.openSmall(`<h3>${t('photo.add')}</h3><p class="muted small">${t('photo.addNote', { id: A.bl(batchId), free: stt.noPhoto })}</p>
      <div class="list" style="margin-top:12px">${row('🖼️', t('photo.gallery'), t('photo.gallerySub'), 'photo-gallery')}${row('📷', t('photo.camera'), t('photo.cameraSub'), 'photo-camera')}</div>
      <div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'sheet');
  }

  /* ---------- sharing ---------- */

  const safeName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'item';
  // The picture exactly as it is shared: the checked photo with the price tag (or the sale tag) drawn on it.
  async function taggedCanvas(it, lg) {
    const rec = await S.get(it.photo.id); if (!rec || !rec.full) throw new Error('missing');
    const c = await P.loadCanvas(rec.full, 2000), pub = L.publicView(it), price = num(pub.price), sale = num(pub.salePrice);
    if (sale > 0) P.priceTag(c, A.invMoney(sale), { was: A.invMoney(price), badge: t('photo.off', { pct: pub.discount }, lg) });   // on sale: new price, old price crossed out, % OFF
    else if (price > 0) P.priceTag(c, A.invMoney(price));
    return { c, pub, price, sale };
  }
  async function share(itemId) {
    const it = item(itemId); if (!it) return;
    const st = L.shareStatus(it);
    if (st === 'noPhoto') return A.toast(t('photo.needPhoto'));
    if (st === 'notChecked') {
      A.closeSheet();
      return A.openSmall(`<h3>${t('photo.gate.title')}</h3><p>${t('photo.gate.text')}</p>
        <div class="btns"><button class="btn primary" data-act="photo-check-now" data-id="${it.id}">${t('photo.checkNow')}</button><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`, 'card');
    }
    const lg = await A.shareLang(); if (!lg) return;             // which language the caption is in (asks, unless told not to)
    A.toast(t('photo.prep'));
    try {
      const { c, pub, price, sale } = await taggedCanvas(it, lg);
      const blob = await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('encode'))), 'image/jpeg', 0.9));
      const file = new File([blob], safeName(pub.name || pub.id) + '.jpg', { type: 'image/jpeg' });
      const text = (pub.name ? pub.name + '\n' : '') + (sale > 0 ? `${A.invMoney(sale)} (${t('photo.was', null, lg)} ${A.invMoney(price)}) · ${t('photo.off', { pct: pub.discount }, lg)}` : price > 0 ? A.invMoney(price) : t('photo.available', null, lg));
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: pub.name || pub.id, text }).catch((e) => { if (e && e.name !== 'AbortError') throw e; });
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      A.toast(t('photo.noShare'));
    } catch (e) { A.toast(e && e.message === 'missing' ? t('photo.missing') : '⚠️ ' + t('photo.shareFail')); }
  }

  /* ---------- long-press menu ---------- */

  function menu(itemId) {
    const it = item(itemId); if (!it) return;
    const st = L.shareStatus(it), row = (icon, title, act, off) => `<button class="row tap" data-act="${act}" data-id="${it.id}" ${off ? 'disabled' : ''}><span style="font-size:22px">${icon}</span><div class="grow"><b>${title}</b></div></button>`;
    A.openSheet(`<h3>${A.esc(it.desc) || t('item.untitled')}</h3><div class="muted small">${it.id}</div>
      <div class="list" style="margin-top:12px">${row('📤', t('photo.share'), 'photo-share', st === 'noPhoto')}${row('✂️', st === 'ok' ? t('photo.edit') : t('photo.checkNow'), 'photo-check-now', st === 'noPhoto')}${row('✏️', t('photo.menu.open'), 'edit-item')}</div>
      <div class="btns"><button class="btn" data-act="close">${t('btn.cancel')}</button></div>`);
  }
  // Press and hold an item card for about half a second.
  (function () {
    let timer = null, fired = false, sx = 0, sy = 0;
    const clear = () => { clearTimeout(timer); timer = null; };
    document.addEventListener('touchstart', (e) => {
      const el = e.target.closest('.item .main'); fired = false; clear(); if (!el || e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      timer = setTimeout(() => { fired = true; if (navigator.vibrate) navigator.vibrate(15); menu(el.dataset.id); }, 520);
    }, { passive: true });
    document.addEventListener('touchmove', (e) => { if (timer && (Math.abs(e.touches[0].clientX - sx) > 10 || Math.abs(e.touches[0].clientY - sy) > 10)) clear(); }, { passive: true });
    ['touchend', 'touchcancel'].forEach((n) => document.addEventListener(n, clear, { passive: true }));
    document.addEventListener('contextmenu', (e) => { const el = e.target.closest('.item .main'); if (el) { e.preventDefault(); if (!fired) menu(el.dataset.id); } });
    document.addEventListener('click', (e) => { if (fired && e.target.closest('.item .main')) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);   // the release after a long press is not a tap
  })();

  /* ---------- full-screen photo viewer: pinch or double-tap to zoom, drag to move ---------- */
  let viewerOn = false;
  function openViewer(src) {
    const v = document.getElementById('viewer'), img = v.querySelector('img'); if (!v) return;
    let sc = 1, tx = 0, ty = 0; const pts = new Map(); let d0 = 0, s0 = 1, last = 0;
    const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${sc})`; };
    const clampPan = () => { const r = img.getBoundingClientRect(), W = innerWidth, H = innerHeight, bw = (r.width), bh = (r.height); const mx = Math.max(0, (bw - W) / 2), my = Math.max(0, (bh - H) / 2); tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty)); };
    const zoomTo = (n) => { sc = Math.max(1, Math.min(6, n)); if (sc === 1) { tx = 0; ty = 0; } apply(); clampPan(); apply(); };
    img.onload = () => { sc = 1; tx = ty = 0; apply(); };
    img.src = src; v.hidden = false; viewerOn = true; document.body.style.overflow = 'hidden'; A.sync();
    const st = v.querySelector('.vstage');
    st.onpointerdown = (e) => { st.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a.x - b.x, a.y - b.y); s0 = sc; }
      else { const now = Date.now(); if (now - last < 300) zoomTo(sc > 1.2 ? 1 : 2.5); last = now; } };
    st.onpointermove = (e) => { const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 2) { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const [a, b] = [...pts.values()]; zoomTo(s0 * Math.hypot(a.x - b.x, a.y - b.y) / (d0 || 1)); }
      else if (sc > 1) { tx += e.clientX - p.x; ty += e.clientY - p.y; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); clampPan(); apply(); } };
    st.onpointerup = st.onpointercancel = (e) => { pts.delete(e.pointerId); if (pts.size === 1) { const r = [...pts.values()][0]; /* keep panning with the remaining finger */ } };
    st.onwheel = (e) => { e.preventDefault(); zoomTo(sc * (e.deltaY < 0 ? 1.15 : 0.87)); };
  }
  function closeViewer() { const v = document.getElementById('viewer'); if (!viewerOn) return; viewerOn = false; v.hidden = true; v.querySelector('img').removeAttribute('src'); if (!ed) document.body.style.overflow = ''; A.sync(); }

  /* ---------- the check-photo editor ---------- */

  const RATIOS = [['free', 0], ['square', 1], ['r45', 0.8], ['r34', 0.75]];
  let ed = null;                                   // editor state, null when closed
  const edEl = () => $('#editor');

  function startCheck(ids) {
    const list = ids.filter((id) => { const it = item(id); return it && it.photo; }); if (!list.length) return;
    ed = { queue: list, idx: 0, total: list.length };
    A.closeSheet(); document.body.style.overflow = 'hidden'; edEl().hidden = false; A.sync();
    loadCurrent();
  }
  const isOpen = () => !!ed || viewerOn;
  const layers = () => (ed ? 1 : 0) + (viewerOn ? 1 : 0);
  function closeEditor() {
    if (!ed) return;
    ed = null; edEl().hidden = true; edEl().innerHTML = ''; document.body.style.overflow = ''; A.sync(); A.render();
  }
  function back() { if (viewerOn) return closeViewer(); if (!ed) return; if (ed.step === 'marks') return showCrop(); closeEditor(); }

  async function loadCurrent() {
    const id = ed.queue[ed.idx], it = item(id);
    if (!it || !it.photo) return next();
    edEl().innerHTML = `<div class="ed-head"><b>${t('ed.title', { i: ed.idx + 1, n: ed.total })}</b></div><div class="ed-wait">${t('ed.loading')}</div>`;
    try {
      const rec = await S.get(it.photo.id); if (!rec) throw new Error('missing');
      if (!rec.orig) { A.toast(t('photo.editExpired')); return next(); }
      ed.itemId = id; ed.photoId = it.photo.id;
      ed.src = await P.loadCanvas(rec.orig, 3000); const sv = it.photo.checked && rec.edit;
      if (sv) {                                    // already checked once: open it as it was left, at the hide-marks step
        for (let i = 0; i < (sv.rot || 0); i++) ed.src = P.rotate90(ed.src);
        Object.assign(ed, { rot: sv.rot || 0, frame: sv.frame, ratio: sv.ratio || 0, mode: sv.mode || 'blur', tool: 'move', rotated: true, restored: true, sel: null,
          marks: (sv.marks || []).map((m) => Object.assign({}, m)) });
        return showMarks();
      }
      ed.rot = 0; ed.restored = false; ed.sel = null;
      ed.oldPhoto = !!it.photo.checked && !rec.edit;       // saved before edits were remembered: nothing to bring back
      ed.ratio = 0; ed.frame = P.findPhotoArea(P.pixels(ed.src)); ed.marks = null; ed.mode = 'blur'; ed.tool = 'move'; ed.rotated = false; 
      showCrop();
    } catch (e) { A.toast(t('photo.missing')); next(); }
  }
  function next() {
    if (!ed) return;
    if (ed.idx + 1 < ed.total) { ed.idx++; return loadCurrent(); }
    const n = ed.total; closeEditor(); A.toast(n > 1 ? t('ed.allChecked') : t('ed.saved'));
  }
  const head = () => `<div class="ed-head"><button class="ed-x" data-act="ed-close" aria-label="${t('btn.close')}">✕</button><b>${ed.total > 1 ? t('ed.title', { i: ed.idx + 1, n: ed.total }) : t('ed.single')}</b></div>`;

  /* -- step 1: crop -- */
  function showCrop() {
    ed.step = 'crop';
    edEl().innerHTML = `${head()}<div class="ed-stage" id="ed-stage"><canvas id="ed-cv"></canvas></div>
      <div class="ed-panel">${ed.oldPhoto ? `<div class="note">${t('ed.oldNote')}</div>` : ''}<p class="muted small">${t('ed.cropHint')}</p>
        <div class="chips ed-chips">${RATIOS.map(([k, r]) => `<button class="chip ${ed.ratio === r ? 'on' : ''}" data-act="ed-ratio" data-id="${r}">${t('ed.' + k)}</button>`).join('')}
          <button class="chip" data-act="ed-rotate">⟳ ${t('ed.rotate')}</button><button class="chip" data-act="ed-reset">${t('ed.reset')}</button></div>
        <button class="btn primary" data-act="ed-next">${t('ed.next')}</button></div>`;
    layout(); drawCrop(); bindCrop();
  }
  let view = null;                                 // {k, w, h, dpr}: how the picture is drawn in the stage
  function layout() {
    const stage = $('#ed-stage'), cv = $('#ed-cv'), img = ed.step === 'crop' ? ed.src : ed.work;
    const aw = stage.clientWidth - (ed.step === 'crop' ? 44 : 0), ah = stage.clientHeight - 16 - (ed.step === 'crop' ? 28 : 0), k = ed.step === 'marks' ? Math.min(1, aw / img.width) : Math.min(aw / img.width, ah / img.height), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k)), pad = ed.step === 'crop' ? 14 : 0;
    cv.style.width = (w + 2 * pad) + 'px'; cv.style.height = (h + 2 * pad) + 'px'; cv.width = Math.round((w + 2 * pad) * dpr); cv.height = Math.round((h + 2 * pad) * dpr); view = { k, w, h, dpr, pad };
  }
  function drawCrop() {
    const cv = $('#ed-cv'); if (!cv || ed.step !== 'crop') return;
    const x = cv.getContext('2d'), { k, dpr } = view, f = ed.frame, s = k * dpr;
    const iw = view.w * dpr, ih = view.h * dpr;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.translate(view.pad * dpr, view.pad * dpr); x.imageSmoothingQuality = 'high'; x.drawImage(ed.src, 0, 0, iw, ih);
    x.fillStyle = 'rgba(0,0,0,.55)';
    x.fillRect(0, 0, iw, f.y * s); x.fillRect(0, (f.y + f.h) * s, iw, ih - (f.y + f.h) * s);
    x.fillRect(0, f.y * s, f.x * s, f.h * s); x.fillRect((f.x + f.w) * s, f.y * s, iw - (f.x + f.w) * s, f.h * s);
    x.strokeStyle = '#fff'; x.lineWidth = 2 * dpr; x.strokeRect(f.x * s, f.y * s, f.w * s, f.h * s);
    x.lineWidth = 1 * dpr; x.strokeStyle = 'rgba(255,255,255,.45)';
    for (let i = 1; i < 3; i++) { x.beginPath(); x.moveTo((f.x + f.w * i / 3) * s, f.y * s); x.lineTo((f.x + f.w * i / 3) * s, (f.y + f.h) * s); x.moveTo(f.x * s, (f.y + f.h * i / 3) * s); x.lineTo((f.x + f.w) * s, (f.y + f.h * i / 3) * s); x.stroke(); }
    [[f.x, f.y], [f.x + f.w, f.y], [f.x, f.y + f.h], [f.x + f.w, f.y + f.h]].forEach(([cx, cy]) => { x.beginPath(); x.arc(cx * s, cy * s, 11 * dpr, 0, 7); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 3 * dpr; x.strokeStyle = '#741b47'; x.stroke(); });
  }
  function bindCrop() {
    const cv = $('#ed-cv'); let drag = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - view.pad) / view.k, y: (e.clientY - r.top - view.pad) / view.k }; };
    cv.onpointerdown = (e) => {
      const p = pos(e), f = ed.frame, hit = 30 / view.k, corners = [[f.x, f.y], [f.x + f.w, f.y], [f.x, f.y + f.h], [f.x + f.w, f.y + f.h]];
      let ci = -1, best = hit; corners.forEach(([cx, cy], i) => { const d = Math.hypot(p.x - cx, p.y - cy); if (d < best) { best = d; ci = i; } });
      if (ci >= 0) { const o = corners[3 - ci]; drag = { type: 'corner', ax: o[0], ay: o[1] }; }
      else if (p.x >= f.x && p.x <= f.x + f.w && p.y >= f.y && p.y <= f.y + f.h) drag = { type: 'move', dx: p.x - f.x, dy: p.y - f.y };
      if (drag) { cv.setPointerCapture(e.pointerId); e.preventDefault(); }
    };
    cv.onpointermove = (e) => {
      if (!drag) return; const p = pos(e), W = ed.src.width, H = ed.src.height, min = 40;
      if (drag.type === 'move') ed.frame = P.clampFrame({ x: p.x - drag.dx, y: p.y - drag.dy, w: ed.frame.w, h: ed.frame.h }, W, H);
      else {
        const sx = p.x >= drag.ax ? 1 : -1, sy = p.y >= drag.ay ? 1 : -1, maxW = sx > 0 ? W - drag.ax : drag.ax, maxH = sy > 0 ? H - drag.ay : drag.ay;
        let w = Math.min(Math.max(Math.abs(p.x - drag.ax), min), maxW), h = Math.min(Math.max(Math.abs(p.y - drag.ay), min), maxH);
        if (ed.ratio) { if (w / h > ed.ratio) w = h * ed.ratio; else h = w / ed.ratio; if (w > maxW) { w = maxW; h = w / ed.ratio; } if (h > maxH) { h = maxH; w = h * ed.ratio; } }
        ed.frame = { x: sx > 0 ? drag.ax : drag.ax - w, y: sy > 0 ? drag.ay : drag.ay - h, w, h };
      }
      drawCrop();
    };
    cv.onpointerup = cv.onpointercancel = () => { drag = null; };
  }
  function setRatio(r) {
    ed.ratio = r; const f = ed.frame, g = P.frameFor(f.w, f.h, r);
    ed.frame = r ? { x: f.x + g.x, y: f.y + g.y, w: g.w, h: g.h } : f; showCrop();
  }
  function rotate() {
    const f = ed.frame, H = ed.src.height;
    ed.rotated = true; ed.rot = ((ed.rot || 0) + 1) % 4; ed.src = P.rotate90(ed.src); ed.frame = P.clampFrame({ x: H - (f.y + f.h), y: f.x, w: f.h, h: f.w }, ed.src.width, ed.src.height); ed.ratio = 0; showCrop();
  }
  function resetCrop() { ed.frame = P.findPhotoArea(P.pixels(ed.src)); ed.ratio = 0; showCrop(); }

  /* -- step 2: hide marks -- */
  const MAX_MARKS = 4;                             // a photo can hide up to 4 areas: keeps the screen easy to use
  let logoImg = null, prevRaf = 0;
  function loadLogo() { return logoImg ? Promise.resolve(logoImg) : new Promise((ok) => { const im = new Image(); im.onload = () => { logoImg = im; ok(im); }; im.onerror = () => ok(null); im.src = 'icons/icon-512.png'; }); }

  function showMarks() {
    ed.step = 'marks'; if (!ed.tool) ed.tool = 'move';
    const cr = P.crop(ed.src, ed.frame); ed.work = P.scaled(cr, 1800);
    if (!ed.marks) ed.marks = [];
    edEl().innerHTML = `${head()}<div class="ed-stage marks" id="ed-stage"><canvas id="ed-cv"></canvas></div>
      <div class="ed-panel compact"><div id="ed-info" class="small"></div><div class="ed-tray" id="ed-marks"></div>
        <div class="ed-tools"><button class="chip ${ed.tool === 'move' ? 'on' : ''}" data-act="ed-tool" data-id="move">✋ ${t('ed.move')}</button><button class="chip ${ed.tool === 'draw' ? 'on' : ''}" data-act="ed-tool" data-id="draw">▭ ${t('ed.drawBox')}</button>
          <div class="seg" role="radiogroup" aria-label="${t('ed.mode')}" id="ed-mode">${['blur', 'cover', 'logo'].map((m) => `<button class="${ed.mode === m ? 'on' : ''}" role="radio" aria-checked="${ed.mode === m}" data-act="ed-mode" data-id="${m}">${t('ed.' + m)}</button>`).join('')}</div></div>
        <p class="muted small" id="ed-note"></p>
        <div class="ed-btns"><button class="btn" data-act="ed-back">${t('ed.back')}</button><button class="btn primary" id="ed-save" data-act="ed-save">${ed.idx + 1 < ed.total ? t('ed.saveNext') : t('ed.save')}</button></div></div>`;
    layout(); bindMarks(); preview(); listMarks();
  }

  // The How-to-hide buttons show (and change) the way the selected box is hidden; with none selected they set it for the next box.
  function syncMode() {
    const m = ed.sel != null ? ed.marks[ed.sel] : null, cur = m ? m.mode : ed.mode;
    document.querySelectorAll('#ed-mode button').forEach((b) => { const on = b.dataset.id === cur; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  }
  function listMarks() {
    const el = $('#ed-marks'); if (!el) return;
    let man = 0;
    el.innerHTML = ed.marks.map((m, n) => `<span class="ed-chip ${m.ticked ? 'on' : ''} ${ed.sel === n ? 'sel' : ''}"><button data-act="ed-toggle" data-id="${n}" aria-pressed="${m.ticked}">${m.ticked ? '✓ ' : ''}${m.mode === 'logo' ? t('ed.logoBox') : t('ed.mine', { n: ++man })}</button><button class="x" data-act="ed-del" data-id="${n}" aria-label="${t('aria.remove')}">✕</button></span>`).join('') || '';
    const k = ed.marks.filter((m) => m.ticked).length;
    const inf = $('#ed-info'); if (inf) inf.textContent = ed.marks.length ? '' : t('ed.draw');
    $('#ed-note').textContent = (k ? tn('ed.hiding', k) : t('ed.nothing')) + ' · ' + (ed.tool === 'draw' ? t('ed.hintDraw') : t('ed.hintMove'));
  }
  function render() {
    const c = P.canvas(ed.work.width, ed.work.height), x = c.getContext('2d'); x.drawImage(ed.work, 0, 0);
    const on = ed.marks.filter((m) => m.ticked), by = (mode) => on.filter((m) => (m.mode || 'blur') === mode).map((m) => m.box);
    if (on.length) {
      const d = x.getImageData(0, 0, c.width, c.height);
      P.applyMarks(d, by('blur'), 'blur'); P.applyMarks(d, by('cover').concat(by('logo')), 'cover');     // logo boxes are covered first, the logo goes on top
      x.putImageData(d, 0, 0); if (by('logo').length && logoImg) P.drawLogo(c, by('logo'), logoImg);
    }
    return c;
  }
  function preview() {
    if (!logoImg && ed.marks.some((m) => m.mode === 'logo')) { loadLogo().then(() => ed && ed.step === 'marks' && preview()); }
    cancelAnimationFrame(prevRaf);
    prevRaf = requestAnimationFrame(() => {
      if (!ed || ed.step !== 'marks') return; const cv = $('#ed-cv'); if (!cv) return;
      const out = render(), x = cv.getContext('2d'), s = view.k * view.dpr;
      x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingQuality = 'high'; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(out, 0, 0, cv.width, cv.height);
      ed.marks.forEach((m) => {                    // outlines: solid = will be hidden, dashed = left as is
        const b = m.box; x.lineWidth = 2 * view.dpr; x.strokeStyle = m.ticked ? '#ffd166' : 'rgba(255,255,255,.8)'; x.setLineDash(m.ticked ? [] : [6 * view.dpr, 5 * view.dpr]);
        x.strokeRect(b.x * s, b.y * s, b.w * s, b.h * s);
      });
      x.setLineDash([]);
      if (ed.draw) { x.strokeStyle = '#fff'; x.setLineDash([6 * view.dpr, 4 * view.dpr]); x.strokeRect(ed.draw.x * s, ed.draw.y * s, ed.draw.w * s, ed.draw.h * s); x.setLineDash([]); }
    });
  }
  // Move mode: the finger scrolls the picture (so a tall picture can be seen to the bottom) and a tap switches a box on/off.
  // Draw mode: the finger draws a new box.
  function bindMarks() {
    const cv = $('#ed-cv'); let st = null;
    cv.style.touchAction = ed.tool === 'draw' ? 'none' : 'pan-y';
    const pos = (e) => { const r = cv.getBoundingClientRect(), k = view.w / ed.work.width; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; };
    view.k = view.w / ed.work.width;               // boxes are in the working picture's pixels
    cv.onpointerdown = (e) => { st = { p: pos(e), moved: false, cx: e.clientX, cy: e.clientY }; if (ed.tool === 'draw') { cv.setPointerCapture(e.pointerId); e.preventDefault(); } };
    cv.onpointermove = (e) => {
      if (!st) return; if (Math.hypot(e.clientX - st.cx, e.clientY - st.cy) > 8) st.moved = true;
      if (ed.tool === 'draw' && st.moved) { const p = pos(e); ed.draw = { x: Math.min(st.p.x, p.x), y: Math.min(st.p.y, p.y), w: Math.abs(p.x - st.p.x), h: Math.abs(p.y - st.p.y) }; preview(); }
    };
    cv.onpointerup = (e) => {
      if (!st) return; const p = pos(e);
      if (ed.tool === 'draw') {
        if (st.moved && ed.draw && ed.draw.w * view.k > 12 && ed.draw.h * view.k > 12) { if (ed.marks.length >= MAX_MARKS) A.toast(t('ed.max')); else { ed.marks.push({ id: 'm' + Date.now(), ticked: true, box: ed.draw, auto: false, mode: ed.mode }); ed.sel = ed.marks.length - 1; listMarks(); syncMode(); } }
      } else if (!st.moved) { const hit = ed.marks.find((m) => p.x >= m.box.x && p.x <= m.box.x + m.box.w && p.y >= m.box.y && p.y <= m.box.y + m.box.h); if (hit) { hit.ticked = true; ed.sel = ed.marks.indexOf(hit); listMarks(); syncMode(); } else openViewer(render().toDataURL('image/jpeg', 0.92)); }
      ed.draw = null; st = null; preview();
    };
    cv.onpointercancel = () => { st = null; ed.draw = null; preview(); };
  }

  async function save() {
    const btn = $('#ed-save'); if (btn) { btn.disabled = true; btn.textContent = t('ed.saving'); }
    try {
      const out = render(), rec = await S.get(ed.photoId); if (!rec) throw new Error('missing');
      const [thumbB, fullB] = await Promise.all([P.toBlob(P.thumb(out, 200), 0.8), P.toBlob(P.scaled(out, 900), 0.84)]);
      rec.thumb = thumbB; rec.full = fullB;
      rec.edit = { rot: ed.rot || 0, frame: ed.frame, ratio: ed.ratio || 0, mode: ed.mode, marks: ed.marks.map((m) => ({ text: m.text, ticked: m.ticked, box: m.box, auto: m.auto, mode: m.mode })) };   // so Check or edit photo reopens exactly this
      await S.put(rec);
      const it = item(ed.itemId); if (it && it.photo && it.photo.id === ed.photoId) { mates(it).concat(it).forEach((x) => { if (x.photo && x.photo.id === ed.photoId) { x.photo.checked = true; x.photo.savedAt = Date.now(); } }); }
      forget(ed.photoId); A.save(); next();
    } catch (e) { A.toast('⚠️ ' + t('photo.saveFail')); if (btn) { btn.disabled = false; btn.textContent = t('ed.save'); } }
  }

  /* ---------- storage plan: timers on originals and on the saved photo of sold items ---------- */

  const photoOf = (st, ids) => ids.map((id) => st.items.find((i) => i.id === id)).filter((i) => i && i.photo);
  // Applies L.photoSweepPlan: stamps new timers, drops originals and (a week after the sale) the saved photo, keeps thumbnails.
  async function sweep(keep) {
    const st = A.state(), now = Date.now(), plan = L.photoSweepPlan(st, now, keep); let changed = false;
    photoOf(st, plan.stamp).forEach((i) => { i.photo.savedAt = now; changed = true; });
    for (const i of photoOf(st, plan.dropOrig)) { i.photo.noOrig = true; changed = true; try { await S.trim(i.photo.id, ['orig', 'edit']); } catch (e) { /* retried next time */ } }
    for (const i of photoOf(st, plan.dropFull)) { i.photo.noFull = true; changed = true; try { await S.trim(i.photo.id, ['full']); forget(i.photo.id); } catch (e) { /* retried next time */ } }
    if (changed) { A.save(); A.render(); }
    return changed;
  }
  // "Free up space": drop every original screenshot now. Returns how many and how many bytes.
  async function freeOriginals() {
    const st = A.state(); let n = 0, bytes = 0;
    for (const i of st.items) { if (!i.photo) continue; try { const f = await S.trim(i.photo.id, ['orig', 'edit']); if (f) { n++; bytes += f; } } catch (e) { /* skip */ } i.photo.noOrig = true; }
    A.save(); A.render(); return { n, bytes };
  }

  // The owner's choice (Storage used): remove the thumbnails of items sold over a year ago. The record of the sale stays.
  async function removeOldThumbs() {
    const st = A.state(), list = L.oldThumbItems(st, Date.now()); let n = 0, bytes = 0;
    for (const i of list) { try { const rec = await S.get(i.photo.id); if (rec && rec.thumb) bytes += rec.thumb.size || 0; if (!st.items.some((x) => x !== i && x.photo && x.photo.id === i.photo.id && !list.includes(x))) await S.del(i.photo.id); } catch (e) { continue; } forget(i.photo.id); i.photo = null; n++; }
    A.save(); A.render(); return { n, bytes };
  }

  /* ---------- events from the app ---------- */

  function act(a, id, el) {
    if (['photo-check', 'photo-check-now', 'photo-replace', 'photo-remove'].includes(a) && item(id) && L.isLocked(item(id))) return A.toast(t(L.isSold(item(id)) ? 'item.lockedToast' : 'item.orderedToast'));   // sold items are locked
    if ((a === 'photo-check' || a === 'photo-check-now') && item(id) && item(id).photo && item(id).photo.noOrig && item(id).photo.checked) return A.toast(t('photo.editExpired'));   // the original screenshot is gone
    if (a === 'photo-view' && item(id) && item(id).photo && item(id).photo.noFull) return A.toast(t('photo.gone'));
    switch (a) {
      case 'photo-add': return addSheet(id);
      case 'photo-gallery': A.closeSheet(); return pickFiles(true, false).then((f) => addFiles(id, f));
      case 'photo-camera': A.closeSheet(); return pickFiles(false, true).then((f) => addFiles(id, f));
      case 'photo-share': return share(id);
      case 'photo-check': case 'photo-check-now': return startCheck([id]);
      case 'photo-check-all': return startCheck(A.state().items.filter((i) => i.batchId === id && i.photo && !i.photo.checked && !L.isLocked(i)).sort((x, y) => x.id.localeCompare(y.id)).map((i) => i.id));
      case 'photo-replace': return replaceOne(id);
      case 'photo-remove': return removeOne(id);
      case 'photo-view': { const it = item(id); if (!it || !it.photo) return; return taggedCanvas(it, A.invoiceLang()).then((r) => openViewer(r.c.toDataURL('image/jpeg', 0.92))).catch(() => A.toast(t('photo.missing'))); }   // the same picture that gets shared, tag included
      case 'viewer-close': return closeViewer();
      case 'ed-close': return closeEditor();
      case 'ed-ratio': return setRatio(parseFloat(id));
      case 'ed-rotate': return rotate();
      case 'ed-reset': return resetCrop();
      case 'ed-next': return showMarks();
      case 'ed-back': return showCrop();
      case 'ed-mode': ed.mode = id; if (ed.sel != null && ed.marks[ed.sel]) ed.marks[ed.sel].mode = id; listMarks(); syncMode(); if (id === 'logo' && !logoImg) loadLogo(); return preview();
      case 'ed-del': ed.marks.splice(+id, 1); ed.sel = null; listMarks(); syncMode(); return preview();
      case 'ed-toggle': ed.marks[+id].ticked = true; ed.sel = +id; listMarks(); syncMode(); return preview();   // selects (and switches on a guess); the X removes a box
      case 'ed-tool': ed.tool = id; document.querySelectorAll('.ed-tools > .chip').forEach((b) => b.classList.toggle('on', b.dataset.id === id)); $('#ed-cv').style.touchAction = id === 'draw' ? 'none' : 'pan-y'; return listMarks();
      case 'ed-save': return save();
    }
  }
  window.addEventListener('resize', () => { if (!ed || !view) return; if (ed.step === 'crop') { layout(); drawCrop(); } else if (ed.step === 'marks') { layout(); view.k = view.w / ed.work.width; preview(); } });

  root.PhotoUI = {
    init: (api) => { A = api; },
    hydrate, thumb, noTile, photoBox, act, isOpen, layers, back, closeEditor, share, openViewer, sweep, freeOriginals, removeOldThumbs,
    // forget photos that no item points to any more (deleted items, batches, replaced photos)
    cleanup: () => { if (busy || ed) return Promise.resolve(); const used = new Set(A.state().items.filter((i) => i.photo).map((i) => i.photo.id)); return S.clean(used).catch(() => {}); },
  };
})(window);

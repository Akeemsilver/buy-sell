/* A full-screen map where a pin is chosen (OpenStreetMap pictures, the Leaflet library loaded only when it is first opened, a street search box and
   a "my location" button). Used by the seller's app to set the store pin; the public store page has its own copy of the same idea.
   MapPick.open({ lat, lng, name, lang, T, onPick(pin), onError(text) }) where T holds the words (mapHint, mapSearch, spotHere, close, mapOk, mapNear,
   mapCancel, spotBlocked, mapNone, mapNoLib). */
(function (root) {
  const SC = root.StoreCore;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let leaf = null, cur = null;
  const loadLeaflet = () => leaf || (leaf = new Promise((ok, no) => {
    if (root.L && root.L.map) return ok();
    const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'vendor/leaflet/leaflet.css'; document.head.appendChild(c);
    const j = document.createElement('script'); j.src = 'vendor/leaflet/leaflet.js'; j.onload = () => ok(); j.onerror = () => { leaf = null; no(new Error('map')); }; document.head.appendChild(j);
  }));
  // a short place name for a pin ("Rivulet Road, Cunupia") from OpenStreetMap's free address look-up; the pin works without it
  const nameOf = (lat, lng, lang) => fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=' + (lang || 'en') + '&lat=' + lat + '&lon=' + lng).then((r) => r.json()).then((j) => { const a = (j && j.address) || {}, road = a.road || a.pedestrian || a.neighbourhood || '', town = a.suburb || a.village || a.town || a.city || ''; return [road, town].filter(Boolean).join(', ').slice(0, 100) || String((j && j.display_name) || '').split(',').slice(0, 2).join(',').trim().slice(0, 100); }).catch(() => '');
  const PIN = '<svg viewBox="0 0 24 34" width="38" height="52"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20 12 34 12 34s12-14 12-22.3C24 5.2 18.6 0 12 0z" fill="#d6264a"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>';
  function close() { if (cur) { clearTimeout(cur.timer); clearTimeout(cur.st); try { cur.map.remove(); } catch (e) { /* ignore */ } cur = null; } const w = document.getElementById('mp'); if (w) w.remove(); document.body.style.overflow = ''; }
  async function open(o) {
    const T = o.T || {}, lang = o.lang || 'en'; close();
    try { await loadLeaflet(); } catch (e) { if (o.onError) o.onError(T.mapNoLib || 'The map could not load.'); return; }
    const w = document.createElement('div'); w.className = 'mp'; w.id = 'mp';
    w.innerHTML = `<div id="mpm"></div><div class="mp-pin">${PIN}</div><div class="mp-dot"></div><div class="mp-hint">${esc(T.mapHint)}</div>
      <div class="mp-sbar"><span aria-hidden="true">🔍</span><input id="mp-q" placeholder="${esc(T.mapSearch)}" autocomplete="off" enterkeyhint="search" aria-label="${esc(T.mapSearch)}"><button type="button" data-a="mp-x" aria-label="${esc(T.close)}">✕</button></div><div class="mp-res" id="mp-res" hidden></div>
      <button type="button" class="mp-cur" data-a="mp-cur" aria-label="${esc(T.spotHere)}">◎</button>
      <div class="mp-bot"><small id="mp-name">&nbsp;</small><button type="button" class="big-btn" data-a="mp-ok">${esc(T.mapOk)}</button><button type="button" class="mp-cancel" data-a="mp-cancel">${esc(T.mapCancel)}</button></div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden';
    const g = o.lat != null && SC.geo(o.lat, o.lng), L = root.L, map = L.map('mpm', { zoomControl: false, attributionControl: true }).setView(g ? [g.lat, g.lng] : [10.6918, -61.2225], g ? 17 : 10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    cur = { map, name: g ? (o.name || '') : '', timer: 0, st: 0, hits: [] };
    const label = () => { const c = map.getCenter(); clearTimeout(cur.timer); cur.timer = setTimeout(() => nameOf(c.lat, c.lng, lang).then((n) => { if (cur) { cur.name = n; const el = document.getElementById('mp-name'); if (el) el.innerHTML = n ? esc((T.mapNear || ((x) => x))(n)) : '&nbsp;'; } }), 700); };
    map.on('moveend', label); label(); setTimeout(() => map.invalidateSize(), 50);
    const search = (q) => { const box = document.getElementById('mp-res'); if (!box) return; q = String(q || '').trim(); if (q.length < 3) { box.hidden = true; return; }
      fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=tt&accept-language=' + lang + '&q=' + encodeURIComponent(q)).then((r) => r.json()).then((list) => {
        const qq = document.getElementById('mp-q'); if (!qq || qq.value.trim() !== q) return; cur && (cur.hits = list || []);
        box.innerHTML = (list || []).length ? list.map((h, i) => { const p = String(h.display_name || '').split(','); return `<div data-a="mp-pick" data-i="${i}">${esc(p[0])}<small>${esc(p.slice(1, 3).join(',').trim())}</small></div>`; }).join('') : `<div class="none">${esc(T.mapNone)}</div>`; box.hidden = false;
      }).catch(() => { box.hidden = true; }); };
    const q = w.querySelector('#mp-q'); q.addEventListener('input', () => { clearTimeout(cur && cur.st); if (cur) cur.st = setTimeout(() => search(q.value), 450); }); q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); search(q.value); q.blur(); } });
    w.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b || !cur) return; const a = b.dataset.a;
      if (a === 'mp-cancel') close();
      else if (a === 'mp-x') { q.value = ''; const r = document.getElementById('mp-res'); if (r) r.hidden = true; }
      else if (a === 'mp-pick') { const h = cur.hits[Number(b.dataset.i)]; if (h) { map.setView([Number(h.lat), Number(h.lon)], 17); const r = document.getElementById('mp-res'); if (r) r.hidden = true; q.blur(); } }
      else if (a === 'mp-cur') { if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition((p) => { if (cur) cur.map.setView([p.coords.latitude, p.coords.longitude], 17); }, () => { const el = document.getElementById('mp-name'); if (el) el.textContent = T.spotBlocked || ''; }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }); }
      else if (a === 'mp-ok') { const c = map.getCenter(), pin = SC.geo(c.lat, c.lng), n = cur.name; close(); if (pin && o.onPick) o.onPick({ lat: pin.lat, lng: pin.lng, name: n || '' }); }
    });
  }
  const api = { open, close, nameOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MapPick = api;
})(typeof window !== 'undefined' ? window : globalThis);

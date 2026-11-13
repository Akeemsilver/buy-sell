/* Delivery zones on the map: the seller moves the map so the pin sits on the middle of a place, sets how far the zone reaches (a circle), or taps the
   corners of a shape. ZoneMap.open({ zones, zone, T, onSave(zone), onDelete(id) }) — T holds the words. The pin on a customer's order is checked against these zones. */
(function (root) {
  const SC = root.StoreCore;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let leaf = null, cur = null;
  const loadLeaflet = () => leaf || (leaf = new Promise((ok, no) => {
    if (root.L && root.L.map) return ok();
    const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'vendor/leaflet/leaflet.css'; document.head.appendChild(c);
    const j = document.createElement('script'); j.src = 'vendor/leaflet/leaflet.js'; j.onload = () => ok(); j.onerror = () => { leaf = null; no(new Error('map')); }; document.head.appendChild(j);
  }));
  const PIN = '<svg viewBox="0 0 24 34" width="34" height="46"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20 12 34 12 34s12-14 12-22.3C24 5.2 18.6 0 12 0z" fill="#d6264a"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>';
  function close() { if (cur) { try { cur.map.remove(); } catch (e) { /* ignore */ } cur = null; } const w = document.getElementById('zm'); if (w) w.remove(); document.body.style.overflow = ''; }
  async function open(o) {
    const T = o.T || {}; close();
    try { await loadLeaflet(); } catch (e) { if (o.onError) o.onError(T.mapNoLib || 'The map could not load.'); return; }
    const z0 = o.zone || null, pre = o.preset || null, L = root.L;
    const w = document.createElement('div'); w.className = 'mp zmw'; w.id = 'zm';
    w.innerHTML = `<div id="mpm"></div><div class="mp-pin" id="zm-pin">${PIN}</div><div class="mp-dot"></div><div class="mp-hint" id="zm-hint"></div>
      <button type="button" class="mp-cur" data-a="zm-cur" aria-label="${esc(T.here)}">◎</button>
      <div class="mp-bot zm-bot"><div class="zm-seg"><button type="button" data-a="zm-mode" data-m="circle">${esc(T.circle)}</button><button type="button" data-a="zm-mode" data-m="shape">${esc(T.shape)}</button></div>
        <input id="zm-name" class="zm-name" value="${esc(z0 ? z0.name : (pre && pre.name) || '')}" placeholder="${esc(T.name)}" autocomplete="off" enterkeyhint="done" aria-label="${esc(T.name)}">
        <label class="zm-risk"><input type="checkbox" id="zm-risk" ${z0 && z0.risk ? 'checked' : ((o.risk || pre) && !z0 ? 'checked' : '')}><span>⚠️ ${esc(T.risk)}</span></label>
        <div id="zm-rad" class="zm-rad"><label for="zm-r">${esc(T.radius)} <b id="zm-rv"></b></label><input id="zm-r" type="range" min="0.1" max="20" step="0.1"></div>
        <div id="zm-corners" class="zm-corners" hidden><button type="button" class="btn alt" data-a="zm-add">${esc(T.addCorner)}</button><button type="button" class="btn alt" data-a="zm-undo">${esc(T.undo)}</button><small id="zm-cn"></small></div>
        <button type="button" class="big-btn" data-a="zm-ok">${esc(T.save)}</button>
        <div class="zm-row">${z0 ? `<button type="button" class="mp-cancel zm-del" data-a="zm-del">${esc(T.del)}</button>` : ''}<button type="button" class="mp-cancel" data-a="zm-cancel">${esc(T.cancel)}</button></div></div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden';
    const start = z0 ? [z0.lat, z0.lng] : pre && pre.lat != null ? [pre.lat, pre.lng] : [10.5, -61.3], map = L.map('mpm', { zoomControl: false, attributionControl: true }).setView(start, z0 ? 12 : pre && pre.lat != null ? 14 : 9);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    const others = (o.zones || []).filter((z) => !z0 || z.id !== z0.id);
    others.forEach((z) => { const col = z.risk ? '#c0392b' : '#741b47', st = { color: col, weight: z.risk ? 2 : 1.5, dashArray: z.risk ? null : '5 5', fillOpacity: z.risk ? 0.18 : 0.05 }, sh = z.poly ? L.polygon(z.poly, st) : L.circle([z.lat, z.lng], Object.assign({ radius: z.r }, st)); sh.bindTooltip(esc(z.name), { permanent: map.getZoom() > 9, direction: 'center', className: 'zm-tip' }).addTo(map); });
    cur = { map, mode: z0 && z0.poly ? 'shape' : 'circle', poly: z0 && z0.poly ? z0.poly.map((q) => q.slice()) : [], r: z0 && !z0.poly ? z0.r / 1000 : pre && pre.r ? pre.r / 1000 : (o.risk ? 1 : 4), layer: null };
    const q = (id) => document.getElementById(id);
    // the map fills what is above the bottom panel, and the pin sits in the middle of that part (so the pin is exactly the map's centre)
    const fit = () => { const h = w.querySelector('.zm-bot').offsetHeight; document.getElementById('mpm').style.bottom = h + 'px'; const mid = 'calc((100% - ' + h + 'px) / 2)'; q('zm-pin').style.top = mid; w.querySelector('.mp-dot').style.top = mid; q('zm-hint').style.top = 'calc((100% - ' + h + 'px) / 2 - 80px)'; map.invalidateSize(); };
    const draw = () => {
      if (cur.layer) { map.removeLayer(cur.layer); cur.layer = null; }
      const c = map.getCenter();
      if (cur.mode === 'circle') cur.layer = L.circle(c, { radius: cur.r * 1000, color: '#d6264a', weight: 2.5, fillOpacity: 0.12 }).addTo(map);
      else if (cur.poly.length) cur.layer = (cur.poly.length > 2 ? L.polygon(cur.poly, { color: '#d6264a', weight: 2.5, fillOpacity: 0.14 }) : L.polyline(cur.poly, { color: '#d6264a', weight: 2.5 })).addTo(map);
      q('zm-rv').textContent = cur.r + ' km'; q('zm-r').value = cur.r; q('zm-cn').textContent = cur.poly.length ? T.corners.replace('{n}', cur.poly.length) : '';
    };
    const mode = (m) => { cur.mode = m; w.querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === m)); q('zm-rad').hidden = m !== 'circle'; q('zm-corners').hidden = m !== 'shape'; q('zm-hint').textContent = m === 'circle' ? T.hint : T.hintShape; fit(); draw(); };
    map.on('move', () => { if (cur && cur.mode === 'circle') draw(); }); q('zm-r').addEventListener('input', (e) => { cur.r = Number(e.target.value); draw(); });
    mode(cur.mode); if (cur.poly.length) { try { map.fitBounds(L.polygon(cur.poly).getBounds(), { padding: [40, 200] }); } catch (e) { /* keep view */ } }
    w.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b || !cur) return; const a = b.dataset.a;
      if (a === 'zm-cancel') close();
      else if (a === 'zm-mode') mode(b.dataset.m);
      else if (a === 'zm-add') { const c = map.getCenter(); cur.poly.push([Math.round(c.lat * 1e5) / 1e5, Math.round(c.lng * 1e5) / 1e5]); draw(); }
      else if (a === 'zm-undo') { cur.poly.pop(); draw(); }
      else if (a === 'zm-cur') { if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { if (cur) map.setView([p.coords.latitude, p.coords.longitude], 13); }, () => {}, { enableHighAccuracy: true, timeout: 8000 }); }
      else if (a === 'zm-del') { const id = z0 && z0.id; close(); if (id && o.onDelete) o.onDelete(id); }
      else if (a === 'zm-ok') {
        const name = q('zm-name').value.trim(); if (!name) { q('zm-name').focus(); return; }
        const id = z0 ? z0.id : undefined; let z;
        const risk = !!q('zm-risk').checked;
        if (cur.mode === 'circle') { const c = map.getCenter(); z = { id, name, risk, lat: Math.round(c.lat * 1e5) / 1e5, lng: Math.round(c.lng * 1e5) / 1e5, r: Math.round(cur.r * 1000) }; }
        else { if (cur.poly.length < 3) { q('zm-hint').textContent = T.need; return; } z = { id, name, risk, poly: cur.poly.slice() }; }
        close(); if (o.onSave) o.onSave(SC.normZones([z])[0] || z);
      }
    });
  }
  const api = { open, close };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ZoneMap = api;
})(typeof window !== 'undefined' ? window : globalThis);

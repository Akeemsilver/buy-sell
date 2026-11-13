/* Online store: the pure rules (which items are shown, locations and delivery, order totals and checks).
   Shared by the app (js/storefront.js) and the public page (store.html), and tested in Node. Nothing here ever touches costs or profit:
   an item is published as name, price, sale price, picture only. */
(function (root) {
  const L = root.Logic || (typeof require !== 'undefined' ? require('./logic.js') : null);
  const W = () => root.Words || (typeof require !== 'undefined' ? require('./words.js') : null);
  const num = (v) => Number(v) || 0, r2 = (n) => Math.round(n * 100) / 100;
  const PER_DOC = 6;   // items per catalogue document (each carries a picture of up to about 130 KB as text; a document may be up to 1 MB)

  const newId = (n) => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(n || 20)) : null; for (let i = 0; i < (n || 20); i++) s += a[(c ? c[i] : Math.floor(Math.random() * 256)) % a.length]; return s; };

  // The owner's store settings (kept in the workspace settings, so they sync between phones).
  const norm = (c) => {
    c = c || {};
    return { id: String(c.id || ''), open: c.open !== false, name: String(c.name || ''), whatsapp: String(c.whatsapp || ''), inTransit: !!c.inTransit, showLeft: !!c.showLeft, showPrices: c.showPrices !== false, autoNew: c.autoNew !== false,
      batches: Array.isArray(c.batches) ? c.batches.slice() : [],
      locations: (Array.isArray(c.locations) ? c.locations : []).map((l) => ({ id: String(l.id || newId(8)), name: String(l.name || '').trim(), pickup: !!l.pickup, delivery: !!l.delivery, price: Math.max(0, r2(num(l.price))) })).filter((l) => l.name && (l.pickup || l.delivery)) };
  };

  // Items the store shows: only the chosen batches, only items for sale (Available, or In Transit when that is switched on), and only
  // items that have a name and a price. Costs and profit are never part of this.
  // Sizes in a sensible order: XS S M L XL XXL, then numbers, then anything else; "One size" and no size last.
  const SIZES = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '2xl', '3xl', '4xl', '5xl'];
  const sizeRank = (z) => { const k = String(z || '').trim().toLowerCase(); if (!k) return [9, 0, '']; if (k === 'one size' || k === 'talla única') return [8, 0, k]; const i = SIZES.indexOf(k); if (i >= 0) return [0, i, '']; const n = parseFloat(k); return isNaN(n) ? [2, 0, k] : [1, n, k]; };
  const cmpSize = (a, b) => { const x = sizeRank(a), y = sizeRank(b); return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]); };
  const sameName = (n) => String(n || '').toLowerCase().replace(/\s+/g, ' ').trim();
  // Items the store shows: only the chosen batches, only items for sale (Available, or In Transit when that is switched on), and only
  // items that have a name and a price. Items with the same name, price and sale price are ONE card; what differs is the size, so the card
  // lists the sizes that are still available and which items they are. Costs and profit are never part of this.
  const shown = (s, cfgIn, reserved) => {
    const cfg = norm(cfgIn), ok = new Set(cfg.batches), groups = new Map(), held = new Set(reserved || []);   // held = items in an order that has not been answered yet
    (s.items || []).slice().sort((a, b) => a.id.localeCompare(b.id)).forEach((it) => {
      if (!ok.has(it.batchId) || held.has(it.id)) return;
      const transit = it.status === 'In Transit';
      if (it.status !== 'Available' && !(transit && cfg.inTransit)) return;
      const name = String(it.desc || '').trim(), sale = L.salePrice(it), price = num(it.price);
      if (!name || (price <= 0 && sale <= 0)) return;
      const key = [sameName(name), r2(price), r2(sale), transit ? 1 : 0].join('|'), photo = it.photo && it.photo.id ? it.photo.id : '', size = String(it.size || '').trim();
      let g = groups.get(key);
      if (!g) { g = { id: it.id, details: '', detailsEs: '', name, nameEs: W() ? W().publishable(it, (s.settings && s.settings.words) || []) : '', price: r2(price), sale: r2(sale), pct: sale > 0 ? Math.round(num(it.discount)) : 0, transit, photo: '', by: new Map() }; groups.set(key, g); }
      if (!g.photo && photo) g.photo = photo;
      if (!g.details && String(it.details || '').trim()) g.details = String(it.details).trim().slice(0, 600);
      if (!g.detailsEs && String(it.detailsEs || '').trim()) g.detailsEs = String(it.detailsEs).trim().slice(0, 600);
      if (!g.by.has(size)) g.by.set(size, []);
      g.by.get(size).push(it.id);
    });
    return [...groups.values()].map((g) => ({ id: g.id, name: g.name, nameEs: g.nameEs, price: g.price, sale: g.sale, pct: g.pct, transit: g.transit, photo: g.photo, details: g.details, detailsEs: g.detailsEs,
      sizes: [...g.by.keys()].sort(cmpSize).map((z) => ({ s: z, ids: g.by.get(z) })) })).sort((a, b) => a.id.localeCompare(b.id));
  };
  // Store pictures kept in cloud storage: which item pictures can be deleted now. Same rule as the saved photo: the item is gone, or it was
  // sold and the hold time (L.PHOTO_HOLD_DAYS) has passed since the sale. Pictures of unsold items stay.
  const stalePics = (s, ids, now) => ids.filter((id) => { const it = (s.items || []).find((x) => x.id === id); if (!it) return true; if (!L.isSold(it)) return false; const at = L.soldAt(s, it); return at != null && now >= at + L.PHOTO_HOLD_DAYS * 86400000; });
  const payPrice = (p) => (p.sale > 0 ? p.sale : p.price);

  const chunk = (list, n) => { const out = []; for (let i = 0; i < list.length; i += n || PER_DOC) out.push(list.slice(i, i + (n || PER_DOC))); return out; };
  const hash = (v) => { const s = JSON.stringify(v); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + s.length; };

  // What one order costs: the items, plus the delivery price when the customer chose delivery to a location that offers it.
  const options = (loc) => (loc ? [loc.pickup ? { key: 'pickup', price: 0 } : null, loc.delivery ? { key: 'delivery', price: loc.price } : null].filter(Boolean) : []);
  const totals = (items, loc, option) => { const o = options(loc).find((x) => x.key === option), sub = r2(items.reduce((t, i) => t + payPrice(i), 0)), del = o ? o.price : 0; return { sub, delivery: del, total: r2(sub + del), valid: !!o && items.length > 0 }; };

  const digits = (s) => String(s || '').replace(/\D/g, '');
  const validName = (s) => { const n = String(s || '').trim(); return n.length >= 2 && n.length <= 60; };
  const validPhone = (s) => { const d = digits(s); return d.length >= 7 && d.length <= 15 && String(s).length <= 25; };
  // 'name' | 'phone' | 'items' | 'location' | '' (fine): the same checks the published rules make.
  const checkOrder = (o) => (!validName(o.name) ? 'name' : !validPhone(o.phone) ? 'phone' : !o.items || !o.items.length || o.items.length > 30 ? 'items' : !o.location || !['pickup', 'delivery'].includes(o.option) ? 'location' : '');

  const orderCode = (id) => 'ORD-' + String(id || '').slice(0, 5).toUpperCase();
  // wa.me link: a 7-digit local number is taken as a Trinidad and Tobago number (+1 868).
  // The WhatsApp message a customer sends from "Message seller": which item (and size, how many) and a question about the price.
  const askMessage = (es, store, item, size, qty) => { const who = String(store || '').trim(), n = Number(qty) > 1 ? Number(qty) : 0, sz = String(size || '').trim();
    return es ? `¡Hola${who ? ' ' + who : ''}! Me interesa ${n ? n + ' de ' : 'la '}${item}${sz ? ' (talla ' + sz + ')' : ''}. ¿Cuál es el precio?` : `Hi${who ? ' ' + who : ''}! I'm interested in ${n ? n + ' of the ' : 'the '}${item}${sz ? ' (size ' + sz + ')' : ''}. What is the price?`; };
  const waLink = (phone, text) => { let d = digits(phone); if (d.length === 7) d = '1868' + d; else if (d.length === 10 && d.startsWith('868')) d = '1' + d; return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : ''); };


  /* ---------- delivery spot (a pin the customer picks on the map) ---------- */
  const validGeo = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  const geo = (lat, lng) => { lat = Number(lat); lng = Number(lng); return validGeo(lat, lng) ? { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 } : null; };   // 5 decimals is about a metre
  const mapLinks = (lat, lng) => ({ google: 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng, view: 'https://www.google.com/maps?q=' + lat + ',' + lng, waze: 'https://waze.com/ul?ll=' + lat + ',' + lng + '&navigate=yes' });
  // A pasted link or "10.65, -61.50": the pin it holds, or 'short' (a shortened link the page cannot open), or null.
  const parseGeoLink = (text) => {
    let t = String(text || '').trim(); if (!t) return null;
    try { t = decodeURIComponent(t); } catch (e) { /* keep as typed */ }
    const pt = (a, b) => geo(a, b), plain = t.match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (plain) return pt(plain[1], plain[2]);
    const pats = [/@(-?\d+\.\d+),(-?\d+\.\d+)/, /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /[?&](?:q|ll|query|destination|center|daddr|saddr)=\s*(-?\d+\.\d+)\s*[, +]\s*(-?\d+\.\d+)/];
    for (const re of pats) { const m = t.match(re); if (m) { const g = pt(m[1], m[2]); if (g) return g; } }
    return /(maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com\/ul\/)/i.test(t) ? 'short' : null;
  };
  // The map pictures (OpenStreetMap tiles) that fill a w x h box centred on the pin, each with its position inside the box. No map library needed.
  const tileView = (lat, lng, z, w, h) => {
    const n = Math.pow(2, z), rad = lat * Math.PI / 180, px = (lng + 180) / 360 * n * 256, py = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n * 256, x0 = px - w / 2, y0 = py - h / 2, tiles = [];
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + h) / 256); ty++) for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + w) / 256); tx++) {
      if (ty < 0 || ty >= n) continue; const wx = ((tx % n) + n) % n;
      tiles.push({ url: 'https://tile.openstreetmap.org/' + z + '/' + wx + '/' + ty + '.png', left: Math.round(tx * 256 - x0), top: Math.round(ty * 256 - y0) });
    }
    return { w, h, tiles };
  };
  // The map picture as HTML (a box of OpenStreetMap tiles with a pin in the middle): used on the order form and on the seller's order page.
  const tileHtml = (lat, lng, z, w, h, css) => { const v = tileView(lat, lng, z, w, h);
    return '<div class="tv" style="position:relative;overflow:hidden;background:#e9e5dc;' + (css || '') + '"><div style="position:absolute;left:50%;top:50%;width:' + w + 'px;height:' + h + 'px;margin:' + (-h / 2) + 'px 0 0 ' + (-w / 2) + 'px">'
      + v.tiles.map((t) => '<img alt="" loading="lazy" src="' + t.url + '" style="position:absolute;left:' + t.left + 'px;top:' + t.top + 'px;width:256px;height:256px;max-width:none">').join('')
      + '</div><svg viewBox="0 0 24 34" width="26" height="36" style="position:absolute;left:50%;top:50%;margin:-35px 0 0 -13px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20 12 34 12 34s12-14 12-22.3C24 5.2 18.6 0 12 0z" fill="#d6264a"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg></div>'; };
  // One Google Maps route through several pinned stops (the last is the destination, the others are stops on the way; it starts from where the phone is). Maps takes about 10 stops.
  const routeLink = (pts) => { const g = (pts || []).map((x) => geo(x.lat, x.lng)).filter(Boolean).slice(0, 10); if (!g.length) return '';
    const q = (x) => x.lat + ',' + x.lng, last = g[g.length - 1], way = g.slice(0, -1).map(q).join('|');
    return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + q(last) + (way ? '&waypoints=' + encodeURIComponent(way) : ''); };

  /* ---------- delivery log: distances, rates, days ---------- */
  const rad = (d) => d * Math.PI / 180;
  // straight-line kilometres between two pins (the fallback when the road service cannot be reached)
  const lineKm = (a, b) => { const R = 6371, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng), x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 10) / 10; };
  // the seller's own delivery rate for a distance: base fee + price per km beyond the free distance, rounded up to the nearest step (null until a rate is set)
  const rateFee = (rate, km) => { rate = rate || {}; const base = num(rate.base), per = num(rate.perKm), free = num(rate.freeKm), step = num(rate.round); if (!(base > 0 || per > 0) || !Number.isFinite(Number(km))) return null;
    let fee = base + Math.max(0, Number(km) - free) * per; if (step > 0) fee = Math.ceil(fee / step - 1e-9) * step; return r2(fee); };
  // what the finished deliveries say: how far, what was charged, and the same by distance band (only orders that have a distance)
  // the cost of one delivery trip: there and back, at the seller's cost per kilometre (fuel and wear)
  const tripCost = (km, costKm) => (Number.isFinite(Number(km)) && num(costKm) > 0 ? r2(2 * Number(km) * num(costKm)) : null);
  const deliveryStats = (orders, costKm) => { const d = (orders || []).filter((o) => o && o.option === 'delivery' && Number.isFinite(Number(o.km)) && o.km > 0);
    const n = d.length, sum = (f) => d.reduce((t, o) => t + f(o), 0), km = sum((o) => Number(o.km)), fee = sum((o) => num(o.deliveryPrice)), cost = sum((o) => tripCost(o.km, costKm) || 0);
    const bands = [[0, 5, '0–5 km'], [5, 10, '5–10 km'], [10, 15, '10–15 km'], [15, 1e9, '15+ km']].map(([a, b, label]) => { const g = d.filter((o) => o.km >= a && o.km < b); return { label, from: a, to: b, n: g.length, avgFee: g.length ? r2(g.reduce((t, o) => t + num(o.deliveryPrice), 0) / g.length) : 0, avgCost: g.length && num(costKm) > 0 ? r2(g.reduce((t, o) => t + (tripCost(o.km, costKm) || 0), 0) / g.length) : 0 }; });
    return { n, avgKm: n ? Math.round(km / n * 10) / 10 : 0, avgFee: n ? r2(fee / n) : 0, perKm: km > 0 ? r2(fee / km) : 0, totalKm: Math.round(km * 10) / 10, totalFee: r2(fee), totalCost: r2(cost), profit: r2(fee - cost), avgCost: n && cost > 0 ? r2(cost / n) : 0, lossN: num(costKm) > 0 ? d.filter((o) => num(o.deliveryPrice) < (tripCost(o.km, costKm) || 0)).length : 0, bands }; };
  // stops in the order to drive them: always the nearest one next, starting from the store pin (straight-line distances; stops without a pin go last, in their own order)
  const nearestFirst = (home, items) => { const pin = (x) => geo(x.lat, x.lng), todo = (items || []).filter((x) => pin(x)), rest = (items || []).filter((x) => !pin(x)), out = []; let at = home && geo(home.lat, home.lng);
    while (todo.length) { let bi = 0; if (at) { let bd = Infinity; todo.forEach((x, i) => { const d = lineKm(at, pin(x)); if (d < bd) { bd = d; bi = i; } }); } const nx = todo.splice(bi, 1)[0]; out.push(nx); at = pin(nx); }
    return out.concat(rest); };
  const dayKey = (d) => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  // a month as 6 weeks of 7 days (Sunday first) for the calendar: each cell has its date, key, and whether it is in the month
  const monthGrid = (y, m) => { const first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay()), cells = []; for (let i = 0; i < 42; i++) { const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i); cells.push({ day: d.getDate(), key: dayKey(d), inMonth: d.getMonth() === m }); } return cells; };
  // search for the delivery log: name, phone, area, place name, order number, kilometres, the date written the usual ways, status
  const deliveryMatch = (o, q, when, names) => { const raw = String(q || '').trim().toLowerCase(); if (!raw) return true; names = names || {};
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dt = when ? new Date(when) : null, dtext = dt ? [dt.getDate() + ' ' + months[dt.getMonth()], months[dt.getMonth()] + ' ' + dt.getDate(), days[dt.getDay()], dt.getDate() + '/' + (dt.getMonth() + 1), dayKey(dt), String(dt.getFullYear())].join(' ') : '';
    const hay = [o.name, o.phone, o.location, o.spot, o.code, Number.isFinite(Number(o.km)) ? Number(o.km).toFixed(1) + ' km' : '', o.status, dtext].join(' ').toLowerCase();
    if (/^(\d{1,2}\s*[a-z]{3,}|[a-z]{3,}\s*\d{1,2})$/.test(raw) && months.some((m) => raw.includes(m))) return dtext.toLowerCase().includes(raw.replace(/\s+/g, ' ').trim());   // "6 nov" or "nov 6" is a date: it has to be that day
    const hayNum = hay.replace(/[^a-z0-9]/g, ''); return raw.split(/\s+/).every((w) => hay.includes(w) || hayNum.includes(w.replace(/[^a-z0-9]/g, ''))); };

  const api = { askMessage, tripCost, nearestFirst, lineKm, rateFee, deliveryStats, dayKey, monthGrid, deliveryMatch, routeLink, tileHtml, validGeo, geo, mapLinks, parseGeoLink, tileView, PER_DOC, newId, norm, shown, sizeRank, cmpSize, sameName, stalePics, payPrice, chunk, hash, options, totals, digits, validName, validPhone, checkOrder, orderCode, waLink };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StoreCore = api;
})(typeof window !== 'undefined' ? window : globalThis);

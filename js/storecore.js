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
  // Delivery zones the seller draws on the map: a circle (centre + radius in metres) or a shape (corner points). The pin decides which zone an order is in.
  const normZones = (list) => (Array.isArray(list) ? list : []).map((z) => {
    const id = String(z.id || newId(6)), name = String(z.name || '').trim().slice(0, 50), risk = !!z.risk, place = String(z.place || '');
    if (Array.isArray(z.poly) && z.poly.length >= 3) { const poly = z.poly.map((q) => [Number(q[0]), Number(q[1])]).filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1])); if (poly.length >= 3) return { id, name, risk, place, poly, lat: poly.reduce((n, q) => n + q[0], 0) / poly.length, lng: poly.reduce((n, q) => n + q[1], 0) / poly.length }; }
    const lat = Number(z.lat), lng = Number(z.lng), r = Math.max(100, Math.min(60000, Math.round(Number(z.r) || 0)));
    return Number.isFinite(lat) && Number.isFinite(lng) && r ? { id, name, risk, place, lat, lng, r } : null;
  }).filter((z) => z && z.name);
  const metres = (a, b, c, d) => { const R = 6371000, rad = Math.PI / 180, dl = (c - a) * rad, dn = (d - b) * rad, x = Math.sin(dl / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const segDist = (lat, lng, a, b) => { const k = Math.cos(lat * Math.PI / 180), px = (lng - a[1]) * k, py = lat - a[0], dx = (b[1] - a[1]) * k, dy = b[0] - a[0], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, (px * dx + py * dy) / l2)) : 0; return Math.hypot(px - t * dx, py - t * dy) * 111320; };
  const inPoly = (lat, lng, poly) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[0] > lat) !== (b[0] > lat) && lng < (b[1] - a[1]) * (lat - a[0]) / (b[0] - a[0]) + a[1]) ins = !ins; } return ins; };
  // Is the pin in this zone? A small margin (default 200 m) keeps a pin that just touches the edge, because phone GPS is never exact.
  const zoneHit = (z, lat, lng, margin) => { const m = margin == null ? 200 : margin; if (!z || !Number.isFinite(lat) || !Number.isFinite(lng)) return false; if (z.poly) return inPoly(lat, lng, z.poly) || z.poly.some((a, i) => segDist(lat, lng, a, z.poly[(i + 1) % z.poly.length]) <= m); return metres(lat, lng, z.lat, z.lng) <= z.r + m; };
  const zonesAt = (zones, lat, lng, margin) => (Array.isArray(zones) ? zones : []).filter((z) => zoneHit(z, Number(lat), Number(lng), margin));
  const hotAt = (zones, lat, lng) => zonesAt((Array.isArray(zones) ? zones : []).filter((z) => z.risk), lat, lng, 0);   // high-risk spots hold exactly, no GPS margin: a flag, not a free-delivery decision
  // For a pin outside every zone: the closest zone and how far its edge is (metres), so a gap between circles still tells you where the order is.
  const nearestZone = (zones, lat, lng) => { let best = null; (Array.isArray(zones) ? zones : []).forEach((z) => { const d = z.poly ? Math.min(...z.poly.map((a, i) => segDist(lat, lng, a, z.poly[(i + 1) % z.poly.length]))) : Math.max(0, metres(lat, lng, z.lat, z.lng) - z.r); if (!best || d < best.m) best = { zone: z, m: Math.round(d) }; }); return best; };
  const areaZones = (zones) => (Array.isArray(zones) ? zones : []).filter((z) => !z.risk);
  // Regions: Trinidad is split into five areas that never overlap and leave no gap (the borders are straight lines; the pin decides). Each region can carry a base fee
  // that grows with the distance from its hub: base + (km beyond "free" km) x per-km, the extra capped, rounded to the nearest 5.
  const RG = { x1: -61.54, x2: -61.43, x3: -61.25, y1: 10.58, y2: 10.37 };
  const REGIONS = [{ id: 'N', hub: [10.6549, -61.5019] }, { id: 'W', hub: [10.679, -61.56] }, { id: 'E', hub: [10.6528, -61.3833] }, { id: 'C', hub: [10.5167, -61.4112] }, { id: 'S', hub: [10.28, -61.467] }];
  const regionAt = (lat, lng) => { lat = Number(lat); lng = Number(lng); if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''; if (lat < RG.y2) return 'S'; if (lat < RG.y1) return lng < RG.x3 ? 'C' : 'E'; return lng < RG.x1 ? 'W' : lng < RG.x2 ? 'N' : 'E'; };
  const RG_DEF = { N: [4, 2, 40], W: [4, 2, 40], E: [4, 2, 40], C: [5, 2, 40], S: [5, 3, 40] }, RG_SUGGEST = { N: 40, W: 50, E: 50, C: 50, S: 60 };
  const r5 = (n) => Math.round(n / 5) * 5;
  const normRegions = (list) => REGIONS.map((r) => { const o = (Array.isArray(list) ? list : []).find((x) => x && x.id === r.id) || {}, d = RG_DEF[r.id]; return { id: r.id, hub: r.hub, base: Math.max(0, r2(num(o.base))), free: o.free == null ? d[0] : Math.max(0, num(o.free)), perKm: o.perKm == null ? d[1] : Math.max(0, num(o.perKm)), cap: o.cap == null ? d[2] : Math.max(0, num(o.cap)) }; });
  // The fee for a pin in a region: null when that region has no base fee yet.
  const regionFee = (regions, lat, lng) => { const id = regionAt(lat, lng), r = normRegions(regions).find((x) => x.id === id); if (!r || !(r.base > 0)) return null; const km = metres(Number(lat), Number(lng), r.hub[0], r.hub[1]) / 1000, extra = Math.min(r.cap, Math.max(0, km - r.free) * r.perKm); return { region: id, fee: Math.max(0, r5(r.base + extra)), km: Math.round(km * 10) / 10 }; };
  const norm = (c) => {
    c = c || {};
    return { id: String(c.id || ''), slug: String(c.slug || ''), open: c.open !== false, name: String(c.name || ''), whatsapp: String(c.whatsapp || ''), inTransit: !!c.inTransit, showLeft: !!c.showLeft, showPrices: c.showPrices !== false, autoNew: c.autoNew !== false,
      batches: Array.isArray(c.batches) ? c.batches.slice() : [],
      locations: (Array.isArray(c.locations) ? c.locations : []).map((l) => ({ id: String(l.id || newId(8)), name: String(l.name || '').trim(), pickup: !!l.pickup, delivery: !!l.delivery, price: Math.max(0, r2(num(l.price))), risk: !!l.risk, off: !!l.off, band: String(l.band || ''), zone: String(l.zone || ''), auto: !!l.auto, rm: !!l.rm, rg: REGIONS.some((r) => r.id === l.rg) ? l.rg : '' })).filter((l) => l.name && (l.pickup || l.delivery)),
      bands: (Array.isArray(c.bands) ? c.bands : []).map((b) => ({ id: String(b.id || newId(6)), name: String(b.name || '').trim(), price: Math.max(0, r2(num(b.price))), on: b.on !== false })),
      areaMode: ['safe', 'all', 'custom'].includes(c.areaMode) ? c.areaMode : 'custom',   // the quick selection: no high-risk areas / all places / custom
      spots: (Array.isArray(c.spots) ? c.spots : []).map((x) => ({ id: String(x.id || newId(6)), name: String(x.name || '').trim().slice(0, 50), note: String(x.note || '').trim().slice(0, 80), on: x.on !== false })).filter((x) => x.name),
      spotPrice: Math.max(0, r2(num(c.spotPrice))),
      regions: normRegions(c.regions), zones: normZones(c.zones), hotSeeded: !!c.hotSeeded };
  };
  // Delivery places. A place may belong to a price range (band): then the range sets its price. A place can be switched off, or sit in the high-risk list.
  const bandOf = (cfg, l) => (l.band ? cfg.bands.find((b) => b.id === l.band) || null : null);
  // A place's region: the one chosen on the place, else the region of its zone's centre. A place on "Region price" (or with no price of its own) charges its region's base fee.
  const regionOfPlace = (cfg, l) => { if (l.rg) return l.rg; const z = l.zone && (cfg.zones || []).find((q) => q.id === l.zone); return z ? regionAt(z.lat, z.lng) : ''; };
  const usesRegion = (cfg, l) => { if (l.band) return false; if (!(l.rm || !(Number(l.price) > 0))) return false; const r = normRegions(cfg.regions).find((x) => x.id === regionOfPlace(cfg, l)); return !!(r && r.base > 0); };
  const priceOf = (cfg, l) => { const b = bandOf(cfg, l); if (b) return b.price; if (usesRegion(cfg, l)) return normRegions(cfg.regions).find((x) => x.id === regionOfPlace(cfg, l)).base; return l.price; };
  // With a pin the pin's own region (and how far into it) sets the fee, for places on region price.
  const feeAt = (cfg, l, lat, lng) => { if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat != null && lng != null && (l.rm || usesRegion(cfg, l)) && !l.band) { const f = regionFee(cfg.regions, lat, lng); if (f) return f.fee; } return priceOf(cfg, l); };
  // What the customer's store page gets: the places that are switched on (and whose range is on), each with its real price.
  const publicLocs = (cfgIn) => { const cfg = norm(cfgIn); return cfg.locations.filter((l) => { const b = bandOf(cfg, l); return !l.off && !(b && b.on === false); }).map((l) => ({ id: l.id, name: l.name, pickup: l.pickup, delivery: l.delivery, price: priceOf(cfg, l), zone: l.zone || '', rg: regionOfPlace(cfg, l), rm: !l.band && (!!l.rm || usesRegion(cfg, l)) })); };
  const publicRegions = (cfgIn) => normRegions(norm(cfgIn).regions).filter((r) => r.base > 0).map((r) => ({ id: r.id, hub: r.hub, base: r.base, free: r.free, perKm: r.perKm, cap: r.cap }));
  const publicSpots = (cfgIn) => norm(cfgIn).spots.filter((x) => x.on).map((x) => ({ id: x.id, name: x.name, note: x.note }));
  // The quick selection: "safe" switches every high-risk place off and the rest on, "all" switches everything on, "custom" changes nothing.
  const applyMode = (cfgIn, mode) => { const cfg = norm(cfgIn); if (!['safe', 'all', 'custom'].includes(mode)) mode = 'custom'; return { areaMode: mode, locations: cfg.locations.map((l) => (mode === 'safe' ? Object.assign({}, l, { off: !!l.risk }) : mode === 'all' ? Object.assign({}, l, { off: false }) : l)) }; };
  // Starter pack: the central areas of Trinidad in price ranges, and the areas the news and police reports keep naming as high-risk (kept off by default; the owner edits the list).
  const TT_BANDS = [{ id: 'r40', name: 'Closest', price: 40, on: true }, { id: 'r50', name: 'Central', price: 50, on: true }, { id: 'r60', name: 'Further', price: 60, on: true }, { id: 'r80', name: 'Far', price: 80, on: true }, { id: 'r100', name: 'Very far', price: 100, on: false }];
  const TT_PLACES = [['r40', 'Chaguanas', 0], ['r40', 'Cunupia', 0], ['r40', 'Longdenville', 0], ['r40', 'Waterloo (Carapichaima)', 0],
    ['r50', 'Couva', 0], ['r50', 'Freeport', 0], ['r50', 'Claxton Bay', 0], ['r50', 'Curepe', 0], ['r50', 'Tunapuna', 0],
    ['r60', 'Debe', 0], ['r60', 'San Fernando', 0], ['r60', 'Princes Town', 0], ['r60', 'Arima', 0], ['r60', 'Port of Spain (central)', 0],
    ['r80', 'Penal', 0], ['r100', 'Point Fortin', 0],
    ['r60', 'Laventille', 1], ['r60', 'Morvant', 1], ['r60', 'Beetham', 1], ['r60', 'Cocorite', 1], ['r60', 'Sea Lots', 1], ['r60', 'East Dry River (Port of Spain)', 1], ['r60', 'Carenage', 1], ['r60', 'Gonzales', 1],
    ['r50', 'Tunapuna North (Fairley St, Maingot Rd)', 1], ['r60', 'Diego Martin: La Puerta', 1], ['r60', 'Diego Martin: River Estate', 1]];
  // Every delivery zone is also a place in the customer's "Where are you?" list (kept in step with the zones). A zone that matches the starter pack takes its price range
  // and high-risk mark; any other zone starts switched off with no price ("auto"), so nothing is delivered free by accident until a price is set.
  const nameKey = (v) => String(v || '').toLowerCase().replace(/[.\u2019']/g, '').replace(/\s+/g, ' ').trim();
  const syncZonePlaces = (cfgIn) => {
    const cfg = norm(cfgIn), bands = cfg.bands.slice(); let changed = false, locs = cfg.locations.map((l) => Object.assign({}, l));
    const riskIds = new Set(cfg.zones.filter((z) => z.risk).map((z) => z.id)), ids = new Set(cfg.zones.filter((z) => !z.risk).map((z) => z.id)), n0 = locs.length; locs = locs.filter((l) => !l.zone || ids.has(l.zone)); if (locs.length !== n0) changed = true;   // a high-risk spot is a flag on a pin, never a place of its own
    cfg.zones.filter((z) => !z.risk).forEach((z) => {
      let l = locs.find((x) => x.zone === z.id);
      if (!l) { l = locs.find((x) => !x.zone && nameKey(x.name) === nameKey(z.name)); if (l) { l.zone = z.id; changed = true; } }
      if (l) { if (l.name !== z.name) { l.name = z.name; changed = true; } return; }
      const hit = TT_PLACES.find((q) => nameKey(q[1]) === nameKey(z.name));
      if (hit && !bands.some((b) => b.id === hit[0])) { const bd = TT_BANDS.find((b) => b.id === hit[0]); if (bd) bands.push(Object.assign({}, bd)); }
      locs.push({ id: newId(8), name: z.name, pickup: false, delivery: true, price: 0, risk: !!(hit && hit[2]), off: hit ? !!hit[2] : true, band: hit ? hit[0] : '', zone: z.id, auto: !hit }); changed = true;
    });
    return { locations: locs, bands, changed };
  };
  const needsPrice = (cfg, l) => !l.risk && !!l.auto && !l.band && !(Number(l.price) > 0) && l.delivery && !usesRegion(cfg, l);
  // Adds the starter pack to the owner's settings: bands are added when missing, places already in the list keep their pickup choice but take the range and risk mark.
  const seedTT = (cfgIn) => {
    const cfg = norm(cfgIn), bands = cfg.bands.slice(), have = new Map(cfg.locations.map((l) => [l.name.toLowerCase(), l]));
    TT_BANDS.forEach((b) => { if (!bands.some((x) => x.id === b.id)) bands.push(Object.assign({}, b)); });
    const locations = cfg.locations.map((l) => { const hit = TT_PLACES.find((q) => q[1].toLowerCase() === l.name.toLowerCase()); return hit ? Object.assign({}, l, { band: hit[0], risk: !!hit[2] }) : l; });
    TT_PLACES.forEach(([band, name, risk]) => { if (!have.has(name.toLowerCase())) locations.push({ id: newId(8), name, pickup: false, delivery: true, price: 0, risk: !!risk, off: false, band }); });
    return { bands, locations };
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
  const options = (loc, spots, fee) => (loc ? [loc.pickup ? { key: 'pickup', price: 0 } : null, loc.delivery ? { key: 'delivery', price: loc.price } : null, spots && spots.length ? { key: 'spot', price: Math.max(0, Number(fee) || 0) } : null].filter(Boolean) : []);
  const totals = (items, loc, option, spots, fee) => { const o = options(loc, spots, fee).find((x) => x.key === option), sub = r2(items.reduce((t, i) => t + payPrice(i), 0)), del = o ? o.price : 0; return { sub, delivery: del, total: r2(sub + del), valid: !!o && items.length > 0 }; };

  const digits = (s) => String(s || '').replace(/\D/g, '');
  const validName = (s) => { const n = String(s || '').trim(); return n.length >= 2 && n.length <= 60; };
  const validPhone = (s) => { const d = digits(s); return d.length >= 7 && d.length <= 15 && String(s).length <= 25 && !/^(\d)\1+$/.test(d.replace(/^(1868|868)(?=\d{7}$)/, '')); };
  // 'name' | 'phone' | 'items' | 'location' | '' (fine): the same checks the published rules make.
  const checkOrder = (o) => (!validName(o.name) ? 'name' : !validPhone(o.phone) ? 'phone' : !o.items || !o.items.length || o.items.length > 30 ? 'items' : !o.location || !['pickup', 'delivery'].includes(o.option) ? 'location' : '');

  const orderCode = (id) => 'ORD-' + String(id || '').slice(0, 5).toUpperCase();
  // wa.me link: a 7-digit local number is taken as a Trinidad and Tobago number (+1 868).
  // The WhatsApp message a customer sends from "Message seller": which item (and size, how many) and a question about the price.
  // The short name in the store link (store.html?s=bruiz): 3-30 lowercase letters, digits and hyphens.
  const SLUG_BAD = ['store', 'shop', 'admin', 'www', 'api', 'index', 'app', 'null', 'undefined', 'login', 'test'];
  const slugify = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/, '');
  const slugError = (s) => { s = String(s || ''); if (s.length < 3) return 'short'; if (s.length > 30 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) return 'chars'; if (SLUG_BAD.includes(s)) return 'reserved'; return ''; };
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

  /* ---- free delivery for regulars: a published list of scrambled "number | place" keys (nobody can read a number from it) ---- */
  const phoneKey = (v) => { const d = digits(v); if (!d) return ''; if (d.length === 7) return 'tt' + d; if (d.length === 10 && d.startsWith('868')) return 'tt' + d.slice(3); if (d.length === 11 && d.startsWith('1868')) return 'tt' + d.slice(4); return 'x' + d; };
  const placeKey = (v) => String(v == null ? '' : v).toLowerCase().replace(/\s+/g, ' ').trim();
  const slowHash = (str) => { const s = 'shopivo-free|' + str; let h1 = 0xdeadbeef | 0, h2 = 0x41c6ce57 | 0; for (let r = 0; r < 30000; r++) for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); h1 ^= h2 >>> 13; h2 ^= h1 >>> 11; } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36); };
  const freeKey = (phone, place) => { const k = phoneKey(phone), pl = placeKey(place); return k && pl ? slowHash(k + '|' + pl) : ''; };
  const freeMemo = {};
  const freeKeyM = (phone, place) => { const id = phoneKey(phone) + '|' + placeKey(place); return freeMemo[id] || (freeMemo[id] = freeKey(phone, place)); };
  // profiles with free delivery switched on -> the list that goes in the store document
  const freeList = (people) => { const out = new Set(); (people || []).forEach((p) => { if (p && p.free && p.free.on && p.phone) (p.free.zones || []).forEach((zid) => { const k = freeKeyM(p.phone, zid); if (k) out.add(k); }); }); return [...out].sort(); };
  const isFree = (list, phone, place) => { if (!list || !list.length) return false; const k = freeKeyM(phone, place); return !!k && list.includes(k); };

  const api = { RG, REGIONS, RG_SUGGEST, regionAt, regionFee, normRegions, regionOfPlace, usesRegion, feeAt, publicRegions, nearestZone, hotAt, areaZones, syncZonePlaces, needsPrice, normZones, zoneHit, zonesAt, metres, phoneKey, placeKey, freeKey, freeList, isFree, bandOf, priceOf, publicLocs, publicSpots, applyMode, seedTT, TT_BANDS, TT_PLACES, slugify, slugError, askMessage, tripCost, nearestFirst, lineKm, rateFee, deliveryStats, dayKey, monthGrid, deliveryMatch, routeLink, tileHtml, validGeo, geo, mapLinks, parseGeoLink, tileView, PER_DOC, newId, norm, shown, sizeRank, cmpSize, sameName, stalePics, payPrice, chunk, hash, options, totals, digits, validName, validPhone, checkOrder, orderCode, waLink };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StoreCore = api;
})(typeof window !== 'undefined' ? window : globalThis);

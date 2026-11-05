/* Online store: the pure rules (which items are shown, locations and delivery, order totals and checks).
   Shared by the app (js/storefront.js) and the public page (store.html), and tested in Node. Nothing here ever touches costs or profit:
   an item is published as name, price, sale price, picture only. */
(function (root) {
  const L = root.Logic || (typeof require !== 'undefined' ? require('./logic.js') : null);
  const num = (v) => Number(v) || 0, r2 = (n) => Math.round(n * 100) / 100;
  const PER_DOC = 20;   // items per catalogue document (each carries a small picture; a document may be up to 1 MB)

  const newId = (n) => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(n || 20)) : null; for (let i = 0; i < (n || 20); i++) s += a[(c ? c[i] : Math.floor(Math.random() * 256)) % a.length]; return s; };

  // The owner's store settings (kept in the workspace settings, so they sync between phones).
  const norm = (c) => {
    c = c || {};
    return { id: String(c.id || ''), open: c.open !== false, name: String(c.name || ''), whatsapp: String(c.whatsapp || ''), inTransit: !!c.inTransit,
      batches: Array.isArray(c.batches) ? c.batches.slice() : [],
      locations: (Array.isArray(c.locations) ? c.locations : []).map((l) => ({ id: String(l.id || newId(8)), name: String(l.name || '').trim(), pickup: !!l.pickup, delivery: !!l.delivery, price: Math.max(0, r2(num(l.price))) })).filter((l) => l.name && (l.pickup || l.delivery)) };
  };

  // Items the store shows: only the chosen batches, only items for sale (Available, or In Transit when that is switched on), and only
  // items that have a name and a price. Costs and profit are never part of this.
  const shown = (s, cfgIn) => {
    const cfg = norm(cfgIn), ok = new Set(cfg.batches), out = [];
    (s.items || []).forEach((it) => {
      if (!ok.has(it.batchId)) return;
      const transit = it.status === 'In Transit';
      if (it.status !== 'Available' && !(transit && cfg.inTransit)) return;
      const name = String(it.desc || '').trim(), sale = L.salePrice(it), price = num(it.price);
      if (!name || (price <= 0 && sale <= 0)) return;
      out.push({ id: it.id, name, price: r2(price), sale: r2(sale), pct: sale > 0 ? Math.round(num(it.discount)) : 0, transit, photo: it.photo && it.photo.id ? it.photo.id : '' });
    });
    return out.sort((a, b) => a.id.localeCompare(b.id));
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
  const waLink = (phone, text) => { let d = digits(phone); if (d.length === 7) d = '1868' + d; else if (d.length === 10 && d.startsWith('868')) d = '1' + d; return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : ''); };

  const api = { PER_DOC, newId, norm, shown, stalePics, payPrice, chunk, hash, options, totals, digits, validName, validPhone, checkOrder, orderCode, waLink };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.StoreCore = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Business card: the settings shape, colour schemes, and the drawing of the front and back on a canvas (3.5 x 2 inch card = 525 x 300 units,
   plus an optional 0.125 inch bleed on every side). QR code from the vendored generator. Pure drawing code, so Node tests can drive it. */
(function (root) {
  const CW = 525, CH = 300, BLEED = 18.75;
  const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || ''));
  const mix = (hex, to, k) => { const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16)); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const SCHEMES = { wine: { dark: '#6d1230', light: '#f0a0b8' }, rosegold: { dark: '#7a2f5a', light: '#e8b49a' }, navy: { dark: '#1c3d7a', light: '#8fc2f5' }, charcoal: { dark: '#2b2b2b', light: '#c9a24a' } };

  const defaults = () => ({
    v: 1, scheme: 'wine', dark: SCHEMES.wine.dark, light: SCHEMES.wine.light, sides: 'both', bleed: true,
    show: { name: true, sub: true, phone: true, whatsapp: true, email: true, web: false, city: true, tagline: true, qr: true },
    text: { sub: 'ONLINE STORE', tagline: 'STYLE · QUALITY · TRUST', phone: '', whatsapp: '', email: '', city: '' },
    qr: { mode: 'store', text: '' },
  });
  const s = (v, d, n) => (typeof v === 'string' ? v.slice(0, n || 60) : d);
  function norm(c) {
    const d = defaults(); c = c || {}; const sh = c.show || {}, tx = c.text || {}, q = c.qr || {};
    const out = { v: 1, scheme: SCHEMES[c.scheme] || c.scheme === 'custom' || c.scheme === 'invoice' ? c.scheme : 'wine', dark: isHex(c.dark) ? c.dark : d.dark, light: isHex(c.light) ? c.light : d.light, sides: ['both', 'front', 'frontblank'].includes(c.sides) ? c.sides : 'both', bleed: c.bleed !== undefined ? !!c.bleed : d.bleed, show: {}, text: {}, qr: { mode: ['store', 'whatsapp', 'link'].includes(q.mode) ? q.mode : 'store', text: s(q.text, '', 200) } };
    Object.keys(d.show).forEach((k) => { out.show[k] = sh[k] !== undefined ? !!sh[k] : d.show[k]; });
    Object.keys(d.text).forEach((k) => { out.text[k] = s(tx[k], d.text[k], k === 'tagline' ? 60 : 80); });
    return out;
  }
  const applyScheme = (cfg, id, headCol) => {
    cfg = norm(cfg);
    if (SCHEMES[id]) { cfg.scheme = id; cfg.dark = SCHEMES[id].dark; cfg.light = SCHEMES[id].light; }
    else if (id === 'invoice' && isHex(headCol)) { cfg.scheme = 'invoice'; cfg.dark = mix(headCol, '#000000', 0.55); cfg.light = mix(headCol, '#ffffff', 0.35); }
    return cfg;
  };

  // The text the QR code carries.
  const qrTarget = (cfg, data) => (cfg.qr.mode === 'whatsapp' ? (data.whatsappLink || data.storeLink || '') : cfg.qr.mode === 'link' ? (cfg.qr.text || data.storeLink || '') : (data.storeLink || ''));
  function qrMatrix(text) {
    const Q = root.qrcode; if (!Q || !text) return null;
    const q = Q(0, 'Q'); q.addData(text); q.make(); const n = q.getModuleCount(); return { n, dark: (r, c) => q.isDark(r, c) };
  }

  const ICONS = {
    phone: ['M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z'],
    mail: ['M4.5 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M3 7l9 6 9-6'],
    pin: ['M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z', 'M12 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z'],
    globe: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2c3 3 4.5 6.5 4.5 10S15 19 12 22c-3-3-4.5-6.5-4.5-10S9 5 12 2z'],
    whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z',
  };
  const has = (v) => typeof v === 'string' && v.trim();
  const ready = (im) => !!(im && im.complete !== false && (im.naturalWidth || im.width));
  const iw = (im) => im.naturalWidth || im.width, ih = (im) => im.naturalHeight || im.height;
  const rr = (x, a, b, w, h, r) => { x.beginPath(); if (x.roundRect) x.roundRect(a, b, w, h, r); else x.rect(a, b, w, h); x.closePath(); };
  const FONT = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
  const txt = (x, str, a, b, size, weight, color, o) => { x.save(); x.font = `${weight} ${size}px ${FONT}`; x.fillStyle = color; x.textBaseline = 'alphabetic'; x.textAlign = (o && o.align) || 'left'; if (o && o.spacing) { try { x.letterSpacing = o.spacing + 'px'; } catch (e) { /* older browsers */ } } x.fillText(str, a, b); x.restore(); };
  function icon(x, kind, cx, cy, size, color) {
    x.save(); x.translate(cx - size / 2, cy - size / 2); x.scale(size / 24, size / 24);
    if (kind === 'whatsapp') { x.fillStyle = color; x.fill(new Path2D(ICONS.whatsapp)); }
    else { x.strokeStyle = color; x.lineWidth = 2.2; x.lineCap = 'round'; x.lineJoin = 'round'; ICONS[kind].forEach((d) => x.stroke(new Path2D(d))); }
    x.restore();
  }
  function lineRows(cfg, data) {
    const L = [], t = cfg.text;
    if (cfg.show.phone && has(t.phone || data.phone)) L.push(['phone', t.phone || data.phone]);
    if (cfg.show.whatsapp && (has(t.whatsapp) || has(data.phone))) L.push(['whatsapp', has(t.whatsapp) ? t.whatsapp : (data.whatsappLabel || 'WhatsApp')]);
    if (cfg.show.web && has(data.storeLink) && /store\.html/.test(data.storeLink)) L.push(['globe', data.storeLink.replace(/^https?:\/\//, '')]);
    if (cfg.show.email && has(t.email || data.email)) L.push(['mail', t.email || data.email]);
    if (cfg.show.city && has(t.city || data.city)) L.push(['pin', t.city || data.city]);
    return L;
  }

  // x: a context for a canvas of (CW + 2b) x (CH + 2b) units, already scaled. side: 'front' | 'back' | 'blank'.
  function draw(x, side, cfgIn, data, imgs, opt) {
    const cfg = norm(cfgIn), b = opt && opt.bleed ? BLEED : 0, W = CW + b * 2, H = CH + b * 2; data = data || {}; imgs = imgs || {};
    if (side === 'blank') { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); return; }
    x.save(); x.translate(b, b);
    if (side === 'front') {
      x.fillStyle = '#fbfafa'; x.fillRect(-b, -b, W, H);
      const L = ready(imgs.mark) ? imgs.mark : ready(imgs.logo) ? imgs.logo : null, T = ready(imgs.title) ? imgs.title : null, big = L === imgs.mark; let cy = 128;
      if (L && T) { const lh = big ? 112 : 128, lw = lh * iw(L) / ih(L), th = 98, tw = th * iw(T) / ih(T), gap = 20, tot = lw + gap + tw, k = Math.min(1, 440 / tot); const x0 = (CW - tot * k) / 2; x.drawImage(L, x0, cy - lh * k / 2, lw * k, lh * k); x.drawImage(T, x0 + (lw + gap) * k, cy - th * k / 2, tw * k, th * k); }
      else if (L || T) { const im = L || T, mh = L ? 140 : 110, mw = mh * iw(im) / ih(im), k = Math.min(1, 400 / mw); x.drawImage(im, (CW - mw * k) / 2, cy - mh * k / 2, mw * k, mh * k); }
      else if (cfg.show.name) txt(x, data.name || '', CW / 2, cy + 12, 44, 800, cfg.dark, { align: 'center' });
      if (cfg.show.tagline && has(cfg.text.tagline)) txt(x, cfg.text.tagline, CW / 2, CH - 36, 13, 600, '#333333', { align: 'center', spacing: 5 });
      const g = x.createLinearGradient(-b, 0, CW + b, 0); g.addColorStop(0, cfg.dark); g.addColorStop(1, cfg.light); x.fillStyle = g; x.fillRect(-b, CH - 10, W, 10 + b);
    } else {
      const g = x.createLinearGradient(-b, -b, CW + b, CH + b); g.addColorStop(0, cfg.dark); g.addColorStop(0.55, cfg.dark); g.addColorStop(1, mix(cfg.dark, '#ffffff', 0.12)); x.fillStyle = g; x.fillRect(-b, -b, W, H);
      const L = ready(imgs.logo) ? imgs.logo : null;
      x.save(); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(71, 67, 37, 0, Math.PI * 2); x.fill(); x.restore();
      if (L) { const m = 74 * 0.62, k = Math.min(m / iw(L), m / ih(L)); x.drawImage(L, 71 - iw(L) * k / 2, 67 - ih(L) * k / 2, iw(L) * k, ih(L) * k); }
      if (cfg.show.name) txt(x, data.name || '', 126, cfg.show.sub && has(cfg.text.sub) ? 62 : 74, 26, 800, '#ffffff', { spacing: 1 });
      if (cfg.show.name && cfg.show.sub && has(cfg.text.sub)) txt(x, cfg.text.sub, 126, 82, 11, 600, cfg.light, { spacing: 4 });
      lineRows(cfg, data).forEach(([k, str], i) => { const cy = 134 + i * 39; x.save(); x.fillStyle = cfg.light; x.beginPath(); x.arc(47.5, cy, 13.5, 0, Math.PI * 2); x.fill(); x.restore(); icon(x, k, 47.5, cy, 14.5, cfg.dark); txt(x, str, 70, cy + 5.5, k === 'globe' ? 12.5 : 15, 500, '#ffffff'); });
      if (cfg.show.tagline && has(cfg.text.tagline)) txt(x, cfg.text.tagline, 34, CH - 18, 10.5, 600, cfg.light, { spacing: 4 });
      const target = cfg.show.qr ? qrTarget(cfg, data) : '', M = target ? qrMatrix(target) : null;
      if (M) {
        const tile = 150, tx = CW - 30 - tile, ty = 62, pad = 8, qs = tile - pad * 2; x.save(); x.fillStyle = '#ffffff'; rr(x, tx, ty, tile, 176, 12); x.fill(); x.restore();
        const q = 4, mod = qs / (M.n + q * 2); x.fillStyle = cfg.dark;   // the standard 4-module quiet zone
        for (let r = 0; r < M.n; r++) for (let c = 0; c < M.n; c++) if (M.dark(r, c)) x.fillRect(tx + pad + (c + q) * mod, ty + pad + (r + q) * mod, mod + 0.35, mod + 0.35);
        txt(x, data.qrLabel || 'SCAN TO SHOP', tx + tile / 2, ty + pad + qs + 17, 10.5, 700, cfg.dark, { align: 'center', spacing: 1.5 });
      }
    }
    x.restore();
  }
  const sidesOf = (cfg) => (cfg.sides === 'front' ? ['front'] : cfg.sides === 'frontblank' ? ['front', 'blank'] : ['front', 'back']);
  const size = (cfg) => { const b = cfg.bleed ? BLEED : 0; return { w: CW + b * 2, h: CH + b * 2, inW: cfg.bleed ? 3.75 : 3.5, inH: cfg.bleed ? 2.25 : 2 }; };

  const api = { CW, CH, BLEED, SCHEMES, defaults, norm, applyScheme, qrTarget, qrMatrix, lineRows, draw, sidesOf, size, mix };
  root.CardMaker = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

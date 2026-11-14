/* The invoice header builder's brain: the settings shape, ready layouts and presets, the banner (gradient, solid colour or picture, optional faint pattern),
   and the drawing of the whole top picture of an invoice (800 x 190 units) on a canvas. Pure functions + a canvas context, so Node tests can drive it. */
(function (root) {
  const W = 800, H = 190;
  const SLOTS = ['logo', 'title', 'extra1', 'extra2'], SHAPES = ['circle', 'rounded', 'square', 'none'];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, Number.isFinite(+n) ? +n : a));
  const isHex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v || ''));
  const mix = (hex, to, k) => { const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16)); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b; };

  const piece = (o) => Object.assign({ on: false, x: 38, y: 36, size: 100, shape: 'circle', pad: 16, shadow: true, ring: false, ringColor: '#6d1230', bubble: '#ffffff' }, o || {});
  const text = (o) => Object.assign({ on: true, x: 176, y: 72, size: 28, color: '#111111', weight: 700, text: '', align: 'left' }, o || {});

  const defaults = () => ({
    v: 1, layout: 'A', accent: '',
    bg: {
      type: 'gradient', solid: '#c79db5',
      grad: { mode: 'radial', angle: 100, cx: 0.28, cy: 0.3, r: 0.85, blend: 'smooth', stops: [{ c: '#f0e4ea', p: 0 }, { c: '#e0c6d5', p: 0.45 }, { c: '#c79db5', p: 1 }] },
      image: { src: '', tint: false, alpha: 0.55 },
      pattern: { on: false, opacity: 0.08, size: 64 },
    },
    slots: { logo: '', title: '', extra1: '', extra2: '' },
    items: {
      logo: piece({ on: true, x: 38, y: 36, size: 118, shape: 'circle' }),
      title: piece({ on: false, x: 152, y: 38, size: 58, shape: 'none', shadow: false }),
      extra1: piece({ on: false, x: 640, y: 28, size: 70, shape: 'circle' }),
      extra2: piece({ on: false, x: 560, y: 28, size: 70, shape: 'circle' }),
      name: text({ x: 176, y: 72, size: 28 }),
      lines: { on: true, x: 176, y: 104, size: 16, gap: 22, color: '#111111', mode: 'stack', city: true, phone: true, email: true },
      invoice: text({ x: 760, y: 108, size: 52, color: '#ffffff', weight: 900, align: 'right' }),
      tagline: text({ on: false, x: 176, y: 172, size: 11, color: '#111111', weight: 600, text: 'STYLE · QUALITY · TRUST' }),
    },
  });

  // Ready layouts: where the pieces go. They only move and show/hide pieces, never touch the pictures or the banner.
  const LAYOUTS = ['A', 'C', 'D', 'E'];
  const layoutPatch = (id) => {
    const P = {
      A: { logo: { on: true, x: 38, y: 36, size: 118, shape: 'circle' }, title: { on: false }, name: { on: true, x: 176, y: 72, size: 28, align: 'left' }, lines: { on: true, x: 176, y: 104, size: 16, gap: 22, mode: 'stack' }, invoice: { on: true, x: 760, y: 108, size: 52, align: 'right' }, tagline: { on: false, x: 176, y: 172 } },
      C: { logo: { on: true, x: 664, y: 40, size: 108, shape: 'circle' }, title: { on: false }, name: { on: true, x: 40, y: 72, size: 28, align: 'left' }, lines: { on: true, x: 40, y: 104, size: 16, gap: 22, mode: 'stack' }, invoice: { on: true, x: 636, y: 108, size: 52, align: 'right' }, tagline: { on: false, x: 40, y: 172 } },
      D: { logo: { on: true, x: 38, y: 49, size: 92, shape: 'circle' }, title: { on: true, x: 152, y: 38, size: 58, shape: 'none' }, name: { on: false }, lines: { on: true, x: 156, y: 122, size: 14.5, gap: 21, mode: 'two' }, invoice: { on: true, x: 760, y: 108, size: 46, align: 'right' }, tagline: { on: false, x: 156, y: 172 } },
      E: { logo: { on: false }, title: { on: true, x: 40, y: 34, size: 78, shape: 'none' }, name: { on: false }, lines: { on: true, x: 42, y: 142, size: 15, gap: 20, mode: 'two' }, invoice: { on: true, x: 760, y: 108, size: 52, align: 'right' }, tagline: { on: false, x: 42, y: 176 } },
    };
    return P[id] || null;
  };

  // Ready banners (they only change the background and the text colours).
  const PRESETS = {
    blush: { name: 'blush', bg: { type: 'gradient', grad: { mode: 'radial', cx: 0.28, cy: 0.3, r: 0.85, angle: 100, blend: 'smooth', stops: [{ c: '#f0e4ea', p: 0 }, { c: '#e0c6d5', p: 0.45 }, { c: '#c79db5', p: 1 }] } }, ink: '#111111', title: '#ffffff', accent: '#c79db5' },
    rosegold: { name: 'rosegold', bg: { type: 'gradient', grad: { mode: 'linear', angle: 12, cx: 0.5, cy: 0.5, r: 0.8, blend: 'smooth', stops: [{ c: '#f7ebe8', p: 0 }, { c: '#e9c4b6', p: 0.5 }, { c: '#b87c98', p: 1 }] } }, ink: '#1c1018', title: '#ffffff', accent: '#c28ba6' },
    wine: { name: 'wine', bg: { type: 'gradient', grad: { mode: 'linear', angle: 14, cx: 0.5, cy: 0.5, r: 0.8, blend: 'smooth', stops: [{ c: '#4a0d24', p: 0 }, { c: '#6d1230', p: 0.55 }, { c: '#8f2a52', p: 1 }] } }, ink: '#ffffff', title: '#f7bfd0', accent: '#8f2a52' },
    plain: { name: 'plain', bg: { type: 'solid', solid: '#f3e3ea' }, ink: '#111111', title: '#6d1230', accent: '#d9b4c4' },
  };

  const num = (v, a, b, d) => (v === undefined || v === null || v === '' || !Number.isFinite(+v) ? d : clamp(v, a, b));
  const str = (v, d) => (typeof v === 'string' ? v : d);
  const normPiece = (p, d) => { p = p || {}; return { on: !!(p.on !== undefined ? p.on : d.on), x: num(p.x, -200, 1000, d.x), y: num(p.y, -100, 300, d.y), size: num(p.size, 10, 400, d.size), shape: SHAPES.includes(p.shape) ? p.shape : d.shape, pad: num(p.pad, 0, 30, d.pad), shadow: p.shadow !== undefined ? !!p.shadow : d.shadow, ring: p.ring !== undefined ? !!p.ring : d.ring, ringColor: isHex(p.ringColor) ? p.ringColor : d.ringColor, bubble: isHex(p.bubble) ? p.bubble : d.bubble }; };
  const normText = (p, d) => { p = p || {}; return { on: !!(p.on !== undefined ? p.on : d.on), x: num(p.x, -200, 1000, d.x), y: num(p.y, -100, 300, d.y), size: num(p.size, 6, 120, d.size), color: isHex(p.color) ? p.color : d.color, weight: [400, 600, 700, 900].includes(+p.weight) ? +p.weight : d.weight, text: str(p.text, d.text).slice(0, 60), align: ['left', 'center', 'right'].includes(p.align) ? p.align : d.align }; };
  function norm(c) {
    const d = defaults(); c = c || {};
    const g = (c.bg && c.bg.grad) || {}, dg = d.bg.grad;
    let stops = Array.isArray(g.stops) ? g.stops.filter((s) => s && isHex(s.c)).slice(0, 4).map((s) => ({ c: s.c, p: num(s.p, 0, 1, 0) })) : [];
    if (stops.length < 2) stops = dg.stops.map((s) => Object.assign({}, s));
    const im = (c.bg && c.bg.image) || {}, pt = (c.bg && c.bg.pattern) || {};
    const out = {
      v: 1, layout: LAYOUTS.includes(c.layout) || c.layout === 'custom' ? c.layout : 'A', accent: isHex(c.accent) ? c.accent : '',
      bg: {
        type: ['gradient', 'solid', 'image'].includes(c.bg && c.bg.type) ? c.bg.type : 'gradient', solid: isHex(c.bg && c.bg.solid) ? c.bg.solid : d.bg.solid,
        grad: { mode: g.mode === 'linear' ? 'linear' : 'radial', angle: num(g.angle, 0, 360, dg.angle), cx: num(g.cx, 0, 1, dg.cx), cy: num(g.cy, 0, 1, dg.cy), r: num(g.r, 0.1, 2, dg.r), blend: ['smooth', 'soft', 'sharp'].includes(g.blend) ? g.blend : 'smooth', stops },
        image: { src: str(im.src, ''), tint: !!im.tint, alpha: num(im.alpha, 0, 1, d.bg.image.alpha) },
        pattern: { on: !!pt.on, opacity: num(pt.opacity, 0.02, 0.4, d.bg.pattern.opacity), size: num(pt.size, 30, 140, d.bg.pattern.size) },
      },
      slots: {}, items: {},
    };
    SLOTS.forEach((s) => { out.slots[s] = str(c.slots && c.slots[s], ''); out.items[s] = normPiece(c.items && c.items[s], d.items[s]); });
    out.items.name = normText(c.items && c.items.name, d.items.name);
    out.items.invoice = normText(c.items && c.items.invoice, d.items.invoice);
    out.items.tagline = normText(c.items && c.items.tagline, d.items.tagline);
    const l = (c.items && c.items.lines) || {}, dl = d.items.lines;
    out.items.lines = { on: !!(l.on !== undefined ? l.on : dl.on), x: num(l.x, -200, 1000, dl.x), y: num(l.y, -100, 300, dl.y), size: num(l.size, 6, 60, dl.size), gap: num(l.gap, 8, 60, dl.gap), color: isHex(l.color) ? l.color : dl.color, mode: l.mode === 'two' ? 'two' : 'stack', city: l.city !== undefined ? !!l.city : true, phone: l.phone !== undefined ? !!l.phone : true, email: l.email !== undefined ? !!l.email : true };
    return out;
  }

  const applyLayout = (cfg, id) => {
    const p = layoutPatch(id); if (!p) return cfg; cfg = norm(cfg); cfg.layout = id;
    Object.keys(p).forEach((k) => Object.assign(cfg.items[k], p[k]));
    return norm(cfg);
  };
  const applyPreset = (cfg, id) => {
    const p = PRESETS[id]; if (!p) return cfg; cfg = norm(cfg);
    cfg.bg.type = p.bg.type; if (p.bg.grad) cfg.bg.grad = Object.assign({}, cfg.bg.grad, p.bg.grad); if (p.bg.solid) cfg.bg.solid = p.bg.solid;
    cfg.items.name.color = p.ink; cfg.items.lines.color = p.ink; cfg.items.tagline.color = p.ink; cfg.items.invoice.color = p.title; cfg.accent = p.accent;
    return norm(cfg);
  };

  // The colour the invoice table and bars use with this header.
  function colours(cfg) {
    cfg = norm(cfg);
    const base = cfg.accent || (cfg.bg.type === 'solid' ? cfg.bg.solid : cfg.bg.grad.stops[cfg.bg.grad.stops.length - 1].c);
    const dark = lum(base) < 110;
    return { id: 'custom', custom: true, themed: false, head: base, tint: mix(base, '#ffffff', 0.86), band: mix(base, '#ffffff', 0.78), ink: dark ? '#fff' : '#111' };
  }

  // Colour stops for the chosen blend: smooth = as set, soft = eased, sharp = hard edges.
  function stopsFor(g) {
    const s = g.stops.slice().sort((a, b) => a.p - b.p); const out = [];
    if (g.blend === 'sharp') { s.forEach((st, i) => { const a = i === 0 ? 0 : (s[i - 1].p + st.p) / 2, b = i === s.length - 1 ? 1 : (st.p + s[i + 1].p) / 2; out.push([a, st.c], [b, st.c]); }); return out; }
    if (g.blend === 'soft') { out.push([s[0].p, s[0].c]); for (let i = 0; i < s.length - 1; i++) { for (let k = 1; k <= 6; k++) { const t = k / 6, e = t * t * (3 - 2 * t); out.push([s[i].p + (s[i + 1].p - s[i].p) * t, mix(s[i].c, s[i + 1].c, e)]); } } return out; }
    return s.map((st) => [st.p, st.c]);
  }
  function paintGrad(x, g, w, h) {
    let gr;
    if (g.mode === 'linear') { const r = g.angle * Math.PI / 180, dx = Math.cos(r), dy = Math.sin(r), half = (Math.abs(dx) * w + Math.abs(dy) * h) / 2; gr = x.createLinearGradient(w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half); }
    else { const rad = g.r * Math.max(w, h); gr = x.createRadialGradient(g.cx * w, g.cy * h, 2, g.cx * w, g.cy * h, rad); }
    stopsFor(g).forEach(([p, c]) => gr.addColorStop(clamp(p, 0, 1), c));
    x.fillStyle = gr; x.fillRect(0, 0, w, h);
  }
  const ready = (im) => !!(im && im.complete !== false && (im.naturalWidth || im.width));
  const cover = (x, im, w, h) => { const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, k = Math.max(w / iw, h / ih); x.drawImage(im, (w - iw * k) / 2, (h - ih * k) / 2, iw * k, ih * k); };

  function drawBg(x, cfg, imgs, w, h) {
    const b = cfg.bg;
    if (b.type === 'solid') { x.fillStyle = b.solid; x.fillRect(0, 0, w, h); }
    else if (b.type === 'image' && ready(imgs.bg)) { cover(x, imgs.bg, w, h); if (b.image.tint) { x.save(); x.globalAlpha = b.image.alpha; paintGrad(x, b.grad, w, h); x.restore(); } }
    else paintGrad(x, b.grad, w, h);
    if (b.pattern.on && ready(imgs.logo)) {
      const s = b.pattern.size, im = imgs.logo, asp = (im.naturalWidth || im.width) / Math.max(1, im.naturalHeight || im.height), pw = s * Math.min(asp, 1.4), ph = pw / asp;
      x.save();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
        const px = w - 14 - pw - c * pw * 1.22 - (r % 2 ? pw * 0.6 : 0), py = 8 + r * ph * 1.12;
        const fade = clamp((px / w - 0.3) / 0.7, 0, 1); if (px < -pw || fade <= 0) continue;
        x.globalAlpha = b.pattern.opacity * fade; x.drawImage(im, px, py, pw, ph);
      }
      x.restore();
    }
  }

  function boxOf(it, im) {
    const asp = ready(im) ? (im.naturalWidth || im.width) / Math.max(1, im.naturalHeight || im.height) : 1;
    if (it.shape === 'none') return { w: it.size * asp, h: it.size, asp };
    if ((it.shape === 'rounded' || it.shape === 'square') && asp >= 1.6) return { w: Math.min(it.size * asp, 320), h: it.size, asp };
    return { w: it.size, h: it.size, asp };
  }
  const rr = (x, px, py, w, h, r) => { x.beginPath(); if (x.roundRect) x.roundRect(px, py, w, h, r); else x.rect(px, py, w, h); x.closePath(); };
  function drawPiece(x, it, im) {
    if (!it.on || !ready(im)) return;
    const b = boxOf(it, im), iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
    const shapeFill = it.shape !== 'none';
    if (shapeFill) {
      const r = it.shape === 'circle' ? Math.min(b.w, b.h) / 2 : it.shape === 'rounded' ? Math.min(b.w, b.h) * 0.22 : 6;
      x.save(); if (it.shadow) { x.shadowColor = 'rgba(0,0,0,.28)'; x.shadowBlur = 8; x.shadowOffsetY = 2; }
      x.fillStyle = it.bubble; rr(x, it.x, it.y, b.w, b.h, r); x.fill(); x.restore();
      if (it.ring) { x.save(); x.lineWidth = 3; x.strokeStyle = it.ringColor; rr(x, it.x + 1.5, it.y + 1.5, b.w - 3, b.h - 3, Math.max(0, r - 1.5)); x.stroke(); x.restore(); }
      const pad = (it.pad / 100) * Math.min(b.w, b.h), k = Math.min((b.w - pad * 2) / iw, (b.h - pad * 2) / ih);
      x.drawImage(im, it.x + (b.w - iw * k) / 2, it.y + (b.h - ih * k) / 2, iw * k, ih * k);
    } else {
      x.save(); if (it.shadow) { x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 6; x.shadowOffsetY = 1; }
      x.drawImage(im, it.x, it.y, b.w, b.h); x.restore();
    }
  }

  const FONT = '"Lato", "Helvetica Neue", Helvetica, Arial, sans-serif';
  function drawText(x, it, str_, extra) {
    if (!it.on || !str_) return;
    x.save(); x.textBaseline = 'alphabetic'; x.textAlign = it.align || 'left'; x.fillStyle = it.color; x.font = `${it.weight || 400} ${it.size}px ${FONT}`;
    if (extra && extra.spacing) { try { x.letterSpacing = extra.spacing + 'px'; } catch (e) { /* older browsers */ } }
    if (extra && extra.shadow) { x.shadowColor = 'rgba(0,0,0,.2)'; x.shadowBlur = 3; x.shadowOffsetY = 1; }
    x.fillText(str_, it.x, it.y); x.restore();
  }

  // info: { name, lines: {city, phone, email}, title }   imgs: { logo, title, extra1, extra2, bg } (Image-like)
  function draw(x, cfg, info, imgs) {
    cfg = norm(cfg); imgs = imgs || {}; info = info || {};
    drawBg(x, cfg, imgs, W, H);
    ['extra2', 'extra1', 'logo', 'title'].forEach((s) => drawPiece(x, cfg.items[s], imgs[s]));
    const n = cfg.items.name; drawText(x, n, (n.text || info.name || '').toString());
    const l = cfg.items.lines, L = info.lines || {};
    if (l.on) {
      const v = { city: L.city, phone: L.phone, email: L.email }, on = ['city', 'phone', 'email'].filter((k) => l[k] && v[k]);
      const rows = l.mode === 'two' ? (on.length > 2 ? [v[on[0]] + ' · ' + v[on[1]], v[on[2]]] : on.length === 2 ? [v[on[0]] + ' · ' + v[on[1]]] : on.map((k) => v[k])) : on.map((k) => v[k]);
      rows.forEach((r, i) => drawText(x, { on: true, x: l.x, y: l.y + i * l.gap, size: l.size, color: l.color, weight: 400, align: 'left' }, r));
    }
    drawText(x, cfg.items.invoice, (cfg.items.invoice.text || info.title || 'INVOICE'), { shadow: false });
    drawText(x, cfg.items.tagline, cfg.items.tagline.text, { spacing: Math.max(1, cfg.items.tagline.size * 0.3) });
  }

  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setPath = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] || {}), o); t[last] = v; return o; };

  const api = { W, H, SLOTS, SHAPES, LAYOUTS, PRESETS, defaults, norm, layoutPatch, applyLayout, applyPreset, colours, stopsFor, draw, boxOf, getPath, setPath, mix, lum, isHex };
  root.InvHeader = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

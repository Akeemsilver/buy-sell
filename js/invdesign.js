/* Invoice designs: the colours of the table and the picture at the top (drawn in code, so the business name, details and colours are always the owner's own).
   Used for the invoice on screen (the top is a picture made here) and for the shared PNG. UMD: also loaded by Node tests. */
(function (root) {
  const HEAD_H = 190;   // height of the top picture when the page is 800 wide

  const mix = (hex, to, k) => {   // mix a #rrggbb colour towards another one (k 0..1)
    const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };

  // Designs: the flower picture (Classic) and plain pages whose top is a soft gradient in the app's theme colour. Only the top differs.
  const DESIGNS = [
    { id: 'classic', image: true, head: '#cea8bd', tint: null, band: '#e6d2db', ink: '#000' },
    { id: 'fade', themed: true }, { id: 'deep', themed: true }, { id: 'dusk', themed: true }, { id: 'sunrise', themed: true }, { id: 'glow', themed: true },
    { id: 'custom', custom: true },
  ];
  const headH = () => HEAD_H;
  const find = (id) => DESIGNS.find((d) => d.id === id) || DESIGNS[0];

  const hslOf = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
    let h = 0, s = 0;
    if (dd) { s = dd / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60; if (h < 0) h += 360; }
    return { h, s, l };
  };
  const hexOf = (h, s, l) => {
    h = ((h % 360) + 360) % 360; const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  };
  // HSV is what a colour wheel shows: angle = hue, distance from the middle = how strong, plus a brightness slider.
  const hsvOf = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), dd = mx - Math.min(r, g, b); let h = 0; if (dd) { h = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; h *= 60; if (h < 0) h += 360; } return { h, s: mx ? dd / mx : 0, v: mx }; };
  const hsvHex = (h, s, v) => { h = ((h % 360) + 360) % 360; const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return '#' + [r, g, b].map((q) => Math.round((q + m) * 255).toString(16).padStart(2, '0')).join(''); };
  const shift = (hex, dh, dl) => { const c = hslOf(hex); return hexOf(c.h + dh, c.s, Math.max(0.12, Math.min(0.9, c.l + (dl || 0)))); };

  // The real colours of a design: the table, bar and footer follow the app colour.
  // opts (the owner's changes, all optional): color = own colour instead of the theme's, light = -20..20 darker/lighter, blend = how far the second colour is (degrees of hue)
  const BLEND = { dusk: 45, sunrise: -40 };
  function colours(id, brand, opts) {
    const d = find(id); opts = opts || {};
    if (!d.themed || !(opts.color || brand)) return d;
    const base = shift(opts.color || brand, 0, (Number(opts.light) || 0) / 100);
    return { id: d.id, themed: true, head: base, tint: mix(base, '#ffffff', 0.86), band: mix(base, '#ffffff', 0.78), ink: id === 'fade' ? '#222' : '#fff', blend: opts.blend != null && opts.blend !== '' ? Number(opts.blend) : BLEND[id] || 0 };
  }

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

  // The gradient behind the top of the page. W x H (800 x 190 units); the context is already scaled.
  function art(x, id, W, H, c) {
    const B = c.head, lg = (stops, ang) => { const r = (ang || 0) * Math.PI / 180, g = x.createLinearGradient(W / 2 - Math.cos(r) * W / 2, H / 2 - Math.sin(r) * H / 2 - (ang ? 0 : 0), W / 2 + Math.cos(r) * W / 2, H / 2 + Math.sin(r) * H / 2); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    if (id === 'fade') x.fillStyle = lg([[0, '#ffffff'], [0.42, mix(B, '#ffffff', 0.8)], [1, B]], 8);
    else if (id === 'deep') x.fillStyle = lg([[0, shift(B, 0, -0.14)], [1, shift(B, 0, 0.1)]], 12);
    else if (id === 'dusk') x.fillStyle = lg([[0, B], [1, shift(B, c.blend, 0.04)]], 10);
    else if (id === 'sunrise') x.fillStyle = lg([[0, shift(B, c.blend, 0.02)], [1, B]], 10);
    else { const g = x.createRadialGradient(W * 0.3, H * 0.4, 10, W * 0.3, H * 0.4, W * 0.75); g.addColorStop(0, shift(B, 0, 0.16)); g.addColorStop(1, shift(B, 0, -0.08)); x.fillStyle = g; }
    x.fillRect(0, 0, W, H);
  }

  /* Draws the top picture onto a canvas context that is already scaled to W x HEAD_H units.
     info: { name, lines: [..], title, logo: Image|null } */
  function drawHeader(x, id, W, info, brand, opts) {
    const c = colours(id, brand, opts), H = HEAD_H;
    art(x, id, W, H, c);
    x.textBaseline = 'alphabetic';
    const F = (w, s) => { x.font = `${w} ${s}px "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif`; };
    let tx = 40;
    if (info.logo) {
      // the logo sits in a white box: square for ordinary logos, wider for a wide one (so it is not squeezed small)
      const l = info.logo, asp = l.width / Math.max(1, l.height), bw = asp >= 1.6 ? Math.min(236, Math.round(94 * asp) + 16) : 110;
      x.fillStyle = '#fff'; x.fillRect(36, (H - 110) / 2, bw, 110);
      const k = Math.min((bw - 16) / l.width, 94 / l.height); x.drawImage(l, 36 + (bw - l.width * k) / 2, (H - 110) / 2 + (110 - l.height * k) / 2, l.width * k, l.height * k);
      tx = 36 + bw + 26;
    }
    const lines = info.lines || [], total = 26 + lines.length * 22, y0 = (H - total) / 2 + 20;
    x.textAlign = 'left'; x.fillStyle = c.ink; F('700', 24); x.fillText(info.name, tx, y0); F('400', 16); lines.forEach((l, i) => x.fillText(l, tx, y0 + 28 + i * 22));
    x.save(); if (id === 'fade') { x.shadowColor = 'rgba(0,0,0,.28)'; x.shadowBlur = 4; x.shadowOffsetY = 1; }
    F('900', 48); x.fillStyle = '#fff'; x.textAlign = 'right'; x.fillText(info.title, W - 36, H / 2 + 17); x.restore();
  }

  const api = { DESIGNS, HEAD_H, BLEND, find, colours, mix, drawHeader, hsvOf, hsvHex };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.InvDesign = api;
})(typeof self !== 'undefined' ? self : this);

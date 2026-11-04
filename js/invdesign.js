/* Invoice designs: the colours of the table and the picture at the top (drawn in code, so the business name, details and colours are always the owner's own).
   Used for the invoice on screen (the top is a picture made here) and for the shared PNG. UMD: also loaded by Node tests. */
(function (root) {
  const HEAD_H = 190;   // height of the top picture when the page is 800 wide

  const mix = (hex, to, k) => {   // mix a #rrggbb colour towards another one (k 0..1)
    const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), b = [1, 3, 5].map((i) => parseInt(to.slice(i, i + 2), 16));
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };

  // ink: colour of the text on the top picture. themed: follows the app colour instead of a fixed one.
  const DESIGNS = [
    { id: 'classic', image: true, head: '#cea8bd', tint: null, band: '#e6d2db', ink: '#000' },
    { id: 'wave', themed: true, layout: 'wave', grid: true, head: '#7cbf4e', tint: '#d5e8c8', band: '#7cbf4e', ink: '#7cbf4e' },
    { id: 'marble', head: '#000000', tint: '#e8e8e8', band: '#000000', ink: '#000' },
    { id: 'halftone', head: '#4a76cf', tint: '#dbe3f4', band: '#4a76cf', ink: '#fff' },
    { id: 'rust', head: '#9b5a57', tint: '#f0e3e1', band: '#9b5a57', ink: '#fff' },
    { id: 'ember', head: '#000000', tint: '#ececec', band: '#000000', ink: '#fff' },
    { id: 'hex', head: '#000000', tint: '#ececec', band: '#000000', ink: '#fff' },
    { id: 'swoosh', grid: true, notch: true, headH: 232, head: '#000000', tint: '#e6e6e6', band: '#000000', ink: '#fff' },
    { id: 'chevron', head: '#1f3a7a', tint: '#e6e9f4', band: '#1f3a7a', ink: '#000' },
    { id: 'navy', head: '#232d57', tint: '#eceef5', band: '#232d57', ink: '#fff' },
    { id: 'indigo', head: '#1d1650', tint: '#e8e7f6', band: '#5b5bd6', ink: '#fff' },
  ];
  const headH = (id) => { const d = DESIGNS.find((x) => x.id === id); return (d && d.headH) || HEAD_H; };
  const find = (id) => DESIGNS.find((d) => d.id === id) || DESIGNS[0];

  // The real colours of a design: the themed one takes the app colour.
  function colours(id, brand) {
    const d = find(id);
    if (!d.themed || !brand) return d;
    return Object.assign({}, d, { head: brand, tint: mix(brand, '#ffffff', 0.84), band: brand, ink: brand });
  }

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }

  // The artwork behind the top of the page. W x H (800 x 190 units); the context is already scaled.
  function art(x, id, W, H, c) {
    const R = rng(7);
    x.save(); x.beginPath(); x.rect(0, 0, W, H); x.clip();
    if (id === 'marble') {
      const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#d8f0ee'); g.addColorStop(0.5, '#a9dcd8'); g.addColorStop(1, '#e9f6f4'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) {
        const cx = R() * W, cy = R() * H, r = 60 + R() * 140, k = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        const col = ['#4aa6a8', '#2c5fa8', '#e8c27a', '#ffffff', '#7fd0cc'][i % 5]; k.addColorStop(0, col + '88'); k.addColorStop(1, col + '00'); x.fillStyle = k; x.fillRect(0, 0, W, H);
      }
      x.strokeStyle = 'rgba(255,255,255,.65)'; x.lineWidth = 3;
      for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-10, R() * H); x.bezierCurveTo(W * 0.3, R() * H, W * 0.6, R() * H, W + 10, R() * H); x.stroke(); }
    } else if (id === 'halftone') {
      x.fillStyle = c.head; x.fillRect(0, 0, W, H);
      for (let gx = 0; gx < W; gx += 12) for (let gy = 0; gy < H; gy += 12) {
        const t = (gx / W) * 0.55 + (gy / H) * 0.45; x.fillStyle = '#1e3f8e'; x.globalAlpha = 0.9; x.beginPath(); x.arc(gx + ((gy / 12) % 2 ? 6 : 0), gy, 0.6 + t * 4, 0, 7); x.fill();
      }
      x.globalAlpha = 1;
    } else if (id === 'rust') {
      x.fillStyle = c.head; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 2600; i++) { x.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(60,10,10,.1)'; x.fillRect(R() * W, R() * H, 6 + R() * 22, 1); }
      for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(R() * W, R() * H, 1, 3 + R() * 10); }
    } else if (id === 'ember') {
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.strokeStyle = '#a3201c'; x.globalAlpha = 0.85; x.lineWidth = 1.4;
      for (let i = 0; i < 70; i++) { x.beginPath(); x.moveTo(W - i * 4, 0); x.lineTo(W - 160 - i * 4 + 40, H); x.stroke(); x.beginPath(); x.moveTo(i * 3, H); x.lineTo(i * 3 + 90, 0); x.stroke(); }
      x.globalAlpha = 1;
      const fade = x.createLinearGradient(0, 0, W, 0); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.28, '#000'); fade.addColorStop(0.62, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = fade; x.fillRect(0, 0, W, H);
    } else if (id === 'hex') {
      x.fillStyle = '#050505'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 1.2; const s = 13;
      for (let row = -1; row < H / (s * 1.5) + 1; row++) for (let col = -1; col < W / (s * 1.74) + 1; col++) {
        const cx = col * s * 1.74 + (row % 2 ? s * 0.87 : 0), cy = row * s * 1.5; x.beginPath();
        for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; x.lineTo(cx + s * Math.cos(a), cy + s * Math.sin(a)); } x.closePath(); x.stroke();
      }
    } else if (id === 'swoosh') {   // black top whose lower edge is a wave, with grey and white swooshes; the page is white below it
      const lo = (k) => H * k;
      x.fillStyle = '#000'; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W, lo(0.74)); x.bezierCurveTo(W * 0.78, lo(0.8), W * 0.62, lo(0.97), W * 0.38, lo(0.93)); x.bezierCurveTo(W * 0.18, lo(0.9), W * 0.08, lo(0.8), 0, lo(0.74)); x.closePath(); x.fill();
      const swoosh = (col, a, y0, y1, y2, y3) => { x.fillStyle = col; x.globalAlpha = a; x.beginPath(); x.moveTo(0, y0); x.bezierCurveTo(W * 0.18, y1, W * 0.4, y2, W * 0.62, y2 - 4); x.bezierCurveTo(W * 0.8, y2 - 10, W * 0.92, y3, W, y3 - 14); x.lineTo(W, y3 + 14); x.bezierCurveTo(W * 0.9, y3 + 30, W * 0.7, y2 + 40, W * 0.45, y2 + 30); x.bezierCurveTo(W * 0.2, y1 + 40, W * 0.08, y0 + 40, 0, y0 + 36); x.closePath(); x.fill(); x.globalAlpha = 1; };
      swoosh('#6f6f6f', 0.95, lo(0.62), lo(0.8), lo(0.96), lo(0.78));
      swoosh('#d9d9d9', 0.95, lo(0.7), lo(0.86), lo(0.96), lo(0.84));
      swoosh('#101010', 1, lo(0.74), lo(0.8), lo(0.9), lo(0.8));
      x.fillStyle = '#7a7a7a'; x.beginPath(); x.moveTo(W * 0.6, 0); x.bezierCurveTo(W * 0.78, 22, W * 0.9, 28, W, 36); x.lineTo(W, 0); x.closePath(); x.fill();
      x.fillStyle = '#cfcfcf'; x.beginPath(); x.moveTo(W * 0.68, 0); x.bezierCurveTo(W * 0.8, 16, W * 0.92, 20, W, 28); x.lineTo(W, 22); x.bezierCurveTo(W * 0.92, 14, W * 0.82, 10, W * 0.74, 0); x.closePath(); x.fill();
    } else if (id === 'chevron') {
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#e8ecfa'; x.beginPath(); x.moveTo(W - 120, 0); x.lineTo(W, 0); x.lineTo(W, H - 60); x.lineTo(W - 60, 14); x.closePath(); x.fill();
      x.fillStyle = c.head; x.beginPath(); x.moveTo(W - 96, 0); x.lineTo(W - 62, 0); x.lineTo(W - 20, 46); x.lineTo(W - 44, 46); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(W, 60); x.lineTo(W, 110); x.lineTo(W - 40, 62); x.lineTo(W - 20, 60); x.closePath(); x.fill();
    } else if (id === 'navy') {
      x.fillStyle = c.head; x.fillRect(0, 0, W, H);
      x.fillStyle = '#b4b8d2'; x.beginPath(); x.moveTo(0, 0); x.lineTo(W * 0.52, 0); x.lineTo(W * 0.46, 22); x.lineTo(0, 22); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(W * 0.44, 0); x.lineTo(W * 0.52, 0); x.lineTo(W * 0.6, H); x.lineTo(W * 0.52, H); x.closePath(); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.moveTo(W * 0.53, 0); x.lineTo(W * 0.55, 0); x.lineTo(W * 0.63, H); x.lineTo(W * 0.61, H); x.closePath(); x.fill();
    } else if (id === 'indigo') {
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
      x.fillStyle = c.band; x.beginPath(); x.moveTo(W * 0.62, 0); x.lineTo(W, 0); x.lineTo(W, H); x.lineTo(W * 0.74, H); x.closePath(); x.fill();
      x.fillStyle = c.head; x.beginPath(); x.moveTo(0, 14); x.lineTo(W * 0.62, 14); x.lineTo(W * 0.72, H - 12); x.lineTo(0, H - 12); x.closePath(); x.fill();
      x.fillStyle = c.band; x.beginPath(); x.moveTo(0, H - 12); x.lineTo(W * 0.5, H - 12); x.lineTo(W * 0.48, H); x.lineTo(0, H); x.closePath(); x.fill();
    }
    x.restore();
  }

  // The wave design: soft waves down the left side of the whole page (W x H units).
  function pageArt(x, id, W, H, brand) {
    if (id !== 'wave') return;
    const c = colours(id, brand), sx = W / 800, sy = H / 1131;
    x.save(); x.scale(sx, sy);
    const shape = (col, a, d) => { x.fillStyle = col; x.globalAlpha = a; x.beginPath(); d(); x.closePath(); x.fill(); };
    shape(c.head, 0.2, () => { x.moveTo(0, 0); x.lineTo(150, 0); x.bezierCurveTo(60, 230, 180, 470, 112, 720); x.bezierCurveTo(70, 900, 190, 1040, 330, 1131); x.lineTo(0, 1131); });
    shape('#f7e6b0', 0.5, () => { x.moveTo(70, 0); x.lineTo(150, 0); x.bezierCurveTo(70, 230, 190, 470, 140, 730); x.bezierCurveTo(110, 900, 200, 1040, 300, 1131); x.lineTo(150, 1131); x.bezierCurveTo(60, 980, 20, 840, 56, 640); x.bezierCurveTo(90, 440, 20, 200, 70, 0); });
    shape('#dcf0fb', 0.6, () => { x.moveTo(120, 0); x.lineTo(150, 0); x.bezierCurveTo(100, 230, 170, 480, 140, 700); x.bezierCurveTo(125, 860, 150, 1000, 150, 1131); x.lineTo(110, 1131); x.bezierCurveTo(100, 960, 100, 860, 110, 700); x.bezierCurveTo(130, 460, 70, 230, 120, 0); });
    x.restore(); x.globalAlpha = 1;
  }

  /* Draws the top picture onto a canvas context that is already scaled to W x HEAD_H units.
     info: { name, lines: [..], title, logo: Image|null } */
  function drawHeader(x, id, W, info, brand) {
    const c = colours(id, brand), H = headH(id);
    if (c.layout === 'wave') return;   // the wave design has no picture at the top: its whole page is the picture (see pageArt)
    art(x, id, W, H, c);
    x.textBaseline = 'alphabetic';
    const F = (w, s) => { x.font = `${w} ${s}px "Lato", "Helvetica Neue", Helvetica, Arial, sans-serif`; };
    const HB = id === 'swoosh' ? H * 0.62 : H;
    let tx = 40;
    if (info.logo) {
      x.fillStyle = '#fff'; x.fillRect(36, (HB - 110) / 2, 110, 110);
      const l = info.logo, k = Math.min(94 / l.width, 94 / l.height); x.drawImage(l, 36 + (110 - l.width * k) / 2, (HB - 110) / 2 + (110 - l.height * k) / 2, l.width * k, l.height * k);
      tx = 172;
    }
    const lines = info.lines || [], total = 26 + lines.length * 22, y0 = (HB - total) / 2 + 20;
    {
      x.textAlign = 'left'; x.fillStyle = c.ink === '#fff' ? '#fff' : '#111'; F('700', 24); x.fillText(info.name, tx, y0); F('400', 16); lines.forEach((l, i) => x.fillText(l, tx, y0 + 28 + i * 22));
      F('900', 48); x.fillStyle = c.ink === '#fff' ? '#fff' : '#000'; x.textAlign = 'right'; x.fillText(info.title, id === 'chevron' ? W - 130 : W - 36, HB / 2 + 17);
    }
  }

  const api = { DESIGNS, HEAD_H, headH, find, colours, mix, drawHeader, pageArt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.InvDesign = api;
})(typeof self !== 'undefined' ? self : this);

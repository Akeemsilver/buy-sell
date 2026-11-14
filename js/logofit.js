/* Logo fitting: look at an uploaded logo, find its shape (round, rounded square, square, wide), trim the empty edges and make the plain background see-through.
   analyze() works on raw pixels so it is tested without a screen; fit() does the drawing in the browser. */
(function (root) {
  const LF = {};
  const TOL = 36;                       // how far (red + green + blue) a pixel may be from the background colour and still count as background
  const close = (d, i, c) => Math.abs(d[i] - c[0]) + Math.abs(d[i + 1] - c[1]) + Math.abs(d[i + 2] - c[2]);

  // data: RGBA pixels, w x h. Returns {shape, box, mode, ratio, aspect, bg, bgColor}
  //   shape: 'circle' | 'rounded' | 'square' | 'wide'
  //   box:   the logo's own area {x, y, w, h}
  //   mode:  'transparent' (the picture already has see-through edges) | 'colour' (one plain colour round it) | 'none' (picture fills the frame)
  //   bg:    Uint8Array, 1 where the pixel is plain background reachable from the edge
  LF.analyze = (d, w, h) => {
    const at = (x, y) => (y * w + x) * 4, corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => at(x, y));
    const seeThru = corners.filter((i) => d[i + 3] < 40).length;
    let mode = 'none', bgColor = [255, 255, 255];
    if (seeThru >= 3) mode = 'transparent';
    else {
      const solid = corners.filter((i) => d[i + 3] >= 40), m = [0, 1, 2].map((k) => solid.reduce((s, i) => s + d[i + k], 0) / (solid.length || 1));
      if (solid.length === 4 && solid.every((i) => close(d, i, m) <= TOL)) { mode = 'colour'; bgColor = m; }
    }
    const bg = new Uint8Array(w * h);
    if (mode !== 'none') {
      const isBg = (x, y) => { const i = at(x, y); return mode === 'transparent' ? d[i + 3] < 40 : (d[i + 3] < 40 || close(d, i, bgColor) <= TOL); };
      const stack = [];
      const push = (x, y) => { const k = y * w + x; if (!bg[k] && isBg(x, y)) { bg[k] = 1; stack.push(k); } };
      for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
      for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
      while (stack.length) { const k = stack.pop(), x = k % w, y = (k / w) | 0; if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1); }
    }
    let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!bg[y * w + x]) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (!n) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; n = w * h; }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, ratio = n / (bw * bh), aspect = bw / bh;
    let shape = 'square';
    if (aspect >= 1.6) shape = 'wide';
    else if (mode !== 'none') shape = ratio < 0.86 ? 'circle' : ratio < 0.975 ? 'rounded' : 'square';
    return { shape, box: { x: x0, y: y0, w: bw, h: bh }, mode, ratio, aspect, bg, bgColor };
  };

  // The finished picture's pixels: the background becomes see-through, with a soft edge so a round logo has no white rim.
  LF.cutout = (d, w, h, res) => {
    const b = res.box, out = new Uint8ClampedArray(b.w * b.h * 4);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const s = ((y + b.y) * w + (x + b.x)) * 4, o = (y * b.w + x) * 4, k = (y + b.y) * w + (x + b.x);
      out[o] = d[s]; out[o + 1] = d[s + 1]; out[o + 2] = d[s + 2]; out[o + 3] = d[s + 3];
      if (res.mode === 'none') continue;
      if (res.bg[k]) { out[o + 3] = 0; continue; }
      const edge = (x + b.x > 0 && res.bg[k - 1]) || (x + b.x < w - 1 && res.bg[k + 1]) || (y + b.y > 0 && res.bg[k - w]) || (y + b.y < h - 1 && res.bg[k + w]);
      if (edge && res.mode === 'colour') { const dd = close(d, s, res.bgColor); out[o + 3] = Math.round(Math.max(0, Math.min(1, (dd - 12) / 90)) * d[s + 3]); }
    }
    return out;
  };

  LF.SHAPES = ['circle', 'rounded', 'square', 'wide'];
  LF.effective = (settings) => { const s = settings || {}, p = s.bizLogoPick; return p && p !== 'auto' && LF.SHAPES.includes(p) ? p : (LF.SHAPES.includes(s.bizLogoShape) ? s.bizLogoShape : 'square'); };

  // Browser part: a File or a picture address -> {src, shape}
  const load = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('img')); im.src = src; });
  const grab = async (srcOrFile) => {
    const isFile = typeof srcOrFile !== 'string', url = isFile ? URL.createObjectURL(srcOrFile) : srcOrFile;
    try {
      const im = await load(url), k = Math.min(1, 512 / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h);
      return { w, h, d: g.getImageData(0, 0, w, h).data };
    } finally { if (isFile) URL.revokeObjectURL(url); }
  };
  // Upload: trim, see-through background, small PNG. Returns {src, shape}.
  LF.fit = async (file) => {
    const { w, h, d } = await grab(file), res = LF.analyze(d, w, h), px = LF.cutout(d, w, h, res), b = res.box;
    const full = document.createElement('canvas'); full.width = b.w; full.height = b.h; full.getContext('2d').putImageData(new ImageData(px, b.w, b.h), 0, 0);
    let long = res.shape === 'wide' ? 360 : 256, src = '';
    for (let tries = 0; tries < 3; tries++) {
      const k = Math.min(1, long / Math.max(b.w, b.h)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(b.w * k)); c.height = Math.max(1, Math.round(b.h * k));
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(full, 0, 0, c.width, c.height); src = c.toDataURL('image/png');
      if (src.length < 180000) break; long = Math.round(long * 0.7);
    }
    return { src, shape: res.shape };
  };
  // A logo that is already saved: only find its shape (the picture itself is left alone).
  LF.shapeOf = async (src) => { const { w, h, d } = await grab(src); return LF.analyze(d, w, h).shape; };

  root.LogoFit = LF;
  if (typeof module !== 'undefined' && module.exports) module.exports = LF;
})(typeof window !== 'undefined' ? window : globalThis);

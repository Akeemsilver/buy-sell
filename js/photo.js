/* Photo pixel engine: finds the picture inside a screenshot and hides marks (blur / smart cover / logo). Works on plain {width,height,data} RGBA pixels, so it runs in the phone
   and in Node tests alike. The few canvas-only helpers at the bottom are skipped when there is no document. */
(function (root) {
  const P = {};
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ---------- grey pictures and filters (Float32Array, one value per pixel) ---------- */

  // One box-blur pass along rows (axis 0) or columns (axis 1), edges repeat.
  function boxPass(src, w, h, r, axis) {
    const out = new Float32Array(src.length), len = axis === 0 ? w : h, lines = axis === 0 ? h : w;
    const at = (l, i) => (axis === 0 ? l * w + i : i * w + l), win = 2 * r + 1;
    for (let l = 0; l < lines; l++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[at(l, clamp(k, 0, len - 1))];
      for (let i = 0; i < len; i++) {
        out[at(l, i)] = sum / win;
        sum += src[at(l, clamp(i + r + 1, 0, len - 1))] - src[at(l, clamp(i - r, 0, len - 1))];
      }
    }
    return out;
  }
  // Three box passes in both directions are very close to a Gaussian blur.
  P.blurGray = (g, w, h, r) => { let a = g; if (r < 1) return Float32Array.from(g); for (let k = 0; k < 3; k++) { a = boxPass(a, w, h, r, 0); a = boxPass(a, w, h, r, 1); } return a; };


  /* ---------- where the picture is inside a screenshot ---------- */

  // A row of a screenshot's app (status bar, title, buttons) is mostly one flat colour; a row of a photo is not.
  // The photo is the longest run of non-flat rows. Returns {x, y, w, h} in pixels of the given image.
  P.findPhotoArea = (img) => {
    const W = img.width, H = img.height, d = img.data, step = Math.max(1, Math.floor(W / 360));
    const flat = new Uint8Array(H);
    for (let y = 0; y < H; y++) {
      const counts = new Map(); let n = 0, top = 0;
      for (let x = 0; x < W; x += step) {
        const j = (y * W + x) * 4, key = ((d[j] / 12) | 0) * 400 + ((d[j + 1] / 12) | 0) * 20 + ((d[j + 2] / 12) | 0), c = (counts.get(key) || 0) + 1;
        counts.set(key, c); if (c > top) top = c; n++;
      }
      flat[y] = top / n >= 0.62 ? 1 : 0;
    }
    const half = 12, sm = new Float32Array(H);
    for (let y = 0; y < H; y++) { let s = 0, c = 0; for (let k = Math.max(0, y - half); k <= Math.min(H - 1, y + half); k++) { s += 1 - flat[k]; c++; } sm[y] = s / c; }
    let bestA = -1, bestB = -1, a = -1;
    for (let y = 0; y <= H; y++) {
      const on = y < H && sm[y] >= 0.5;
      if (on && a < 0) a = y;
      if (!on && a >= 0) { if (y - a > bestB - bestA) { bestA = a; bestB = y; } a = -1; }
    }
    if (bestA < 0 || bestB - bestA < H * 0.15) return { x: 0, y: 0, w: W, h: H };
    while (bestA < bestB - 1 && flat[bestA]) bestA++;          // trim to the first and last row that really is picture
    while (bestB - 1 > bestA && flat[bestB - 1]) bestB--;
    return { x: 0, y: bestA, w: W, h: bestB - bestA };
  };

  /* ---------- hiding marks ---------- */

  const featherOf = (b) => Math.max(3, Math.min(16, 0.2 * Math.min(b.w, b.h)));
  const radiusOf = (b) => Math.max(14, 0.4 * Math.min(b.w, b.h));
  // alpha 0..1 for a pixel at (x, y): 1 inside the box, fading out over the feather width at its edge
  const alphaAt = (b, f, x, y) => clamp((Math.min(x - b.x, b.x + b.w - 1 - x, y - b.y, b.y + b.h - 1 - y) + f / 2) / f, 0, 1);

  function region(img, b, pad) {
    const x0 = clamp(Math.floor(b.x - pad), 0, img.width), y0 = clamp(Math.floor(b.y - pad), 0, img.height);
    const x1 = clamp(Math.ceil(b.x + b.w + pad), 0, img.width), y1 = clamp(Math.ceil(b.y + b.h + pad), 0, img.height);
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  }
  // Blur: the area inside the box is replaced by a heavy blur of itself (and its surroundings), with a soft edge.
  P.blurBox = (img, box) => {
    const f = featherOf(box), r = radiusOf(box), R = region(img, box, r + f), W = img.width, d = img.data;
    if (R.w < 2 || R.h < 2) return;
    const br = Math.max(2, Math.round(r / 2.2));
    for (let c = 0; c < 3; c++) {
      const ch = new Float32Array(R.w * R.h);
      for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) ch[y * R.w + x] = d[((R.y0 + y) * W + R.x0 + x) * 4 + c];
      const bl = P.blurGray(ch, R.w, R.h, br);
      for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) {
        const a = alphaAt(box, f, R.x0 + x, R.y0 + y); if (a <= 0) continue;
        const j = ((R.y0 + y) * W + R.x0 + x) * 4 + c; d[j] = d[j] * (1 - a) + bl[y * R.w + x] * a;
      }
    }
  };
  // Smart cover: paints over the box with the colours around it (smoothly faded between the four sides), so the mark simply disappears.
  P.coverBox = (img, box) => {
    const W = img.width, H = img.height, d = img.data, f = featherOf(box), R = region(img, box, f);
    const x0 = Math.round(box.x), y0 = Math.round(box.y), x1 = Math.round(box.x + box.w), y1 = Math.round(box.y + box.h), t = 6;
    const strip = (ax, ay, bx, by) => {
      const s = [0, 0, 0]; let n = 0;
      for (let y = clamp(ay, 0, H - 1); y <= clamp(by, 0, H - 1); y++) for (let x = clamp(ax, 0, W - 1); x <= clamp(bx, 0, W - 1); x++) { const j = (y * W + x) * 4; s[0] += d[j]; s[1] += d[j + 1]; s[2] += d[j + 2]; n++; }
      return s.map((v) => v / (n || 1));
    };
    const L = strip(x0 - t, y0, x0 - 1, y1 - 1), Rr = strip(x1, y0, x1 + t - 1, y1 - 1), T = strip(x0, y0 - t, x1 - 1, y0 - 1), B = strip(x0, y1, x1 - 1, y1 + t - 1);
    let seed = (x0 * 7919 + y0 * 104729) >>> 0; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let y = R.y0; y < R.y1; y++) for (let x = R.x0; x < R.x1; x++) {
      const a = alphaAt(box, f, x, y); if (a <= 0) continue;
      const u = clamp((x - x0) / Math.max(1, x1 - x0 - 1), 0, 1), v = clamp((y - y0) / Math.max(1, y1 - y0 - 1), 0, 1), j = (y * W + x) * 4, n = (rnd() - 0.5) * 5;
      for (let c = 0; c < 3; c++) {
        const col = ((L[c] * (1 - u) + Rr[c] * u) + (T[c] * (1 - v) + B[c] * v)) / 2 + n;
        d[j + c] = d[j + c] * (1 - a) + clamp(col, 0, 255) * a;
      }
    }
  };
  // Apply every mark: marks = [{x, y, w, h}], mode = 'blur' | 'cover' | 'logo' (logo = cover here; the logo itself is drawn on top by the app).
  P.applyMarks = (img, marks, mode) => marks.forEach((b) => (mode === 'blur' ? P.blurBox(img, b) : P.coverBox(img, b)));

  /* ---------- sizes ---------- */

  // Fit a w x h picture inside max x max (never enlarging). Returns whole pixels.
  P.fit = (w, h, max) => { const k = Math.min(1, max / Math.max(w, h)); return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }; };
  // Largest centred box of the given ratio (w/h) inside a w x h picture; ratio 0 = free (whole picture).
  P.frameFor = (w, h, ratio) => {
    if (!ratio) return { x: 0, y: 0, w, h };
    let fw = w, fh = w / ratio; if (fh > h) { fh = h; fw = h * ratio; }
    return { x: Math.round((w - fw) / 2), y: Math.round((h - fh) / 2), w: Math.round(fw), h: Math.round(fh) };
  };
  // Keep a frame inside the picture and at least `min` pixels in each direction.
  P.clampFrame = (f, w, h, min) => {
    const m = min || 40, fw = clamp(f.w, Math.min(m, w), w), fh = clamp(f.h, Math.min(m, h), h);
    return { x: clamp(f.x, 0, w - fw), y: clamp(f.y, 0, h - fh), w: fw, h: fh };
  };

  /* ---------- browser-only helpers (canvas) ---------- */

  const hasDoc = typeof document !== 'undefined';
  P.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  P.toBlob = (canvas, quality) => new Promise((ok, fail) => {
    // WebP is smaller; Safari cannot write it and quietly gives a PNG, so fall back to JPEG then.
    canvas.toBlob((b) => {
      if (b && b.type === 'image/webp') return ok(b);
      canvas.toBlob((j) => (j ? ok(j) : fail(new Error('encode'))), 'image/jpeg', quality);
    }, 'image/webp', quality);
  });
  // Load a File/Blob into a canvas, honouring the phone's rotation flag. Very large pictures are scaled down to `max`.
  P.loadCanvas = async (blob, max) => {
    let bmp;
    try { bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' }); }
    catch (e) {
      bmp = await new Promise((ok, no) => { const im = new Image(), u = URL.createObjectURL(blob); im.onload = () => { URL.revokeObjectURL(u); ok(im); }; im.onerror = () => no(new Error('decode')); im.src = u; });
    }
    const w = bmp.width || bmp.naturalWidth, h = bmp.height || bmp.naturalHeight, s = P.fit(w, h, max || 3000), c = P.canvas(s.w, s.h);
    c.getContext('2d').drawImage(bmp, 0, 0, s.w, s.h); if (bmp.close) bmp.close();
    return c;
  };
  P.crop = (src, f) => { const c = P.canvas(Math.round(f.w), Math.round(f.h)); c.getContext('2d').drawImage(src, f.x, f.y, f.w, f.h, 0, 0, c.width, c.height); return c; };
  P.rotate90 = (src) => { const c = P.canvas(src.height, src.width), x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(src, 0, 0); return c; };
  // Smooth downscale: halve step by step while the picture is more than twice the target, then the last step (sharper than one big jump).
  P.scaled = (src, max) => {
    const s = P.fit(src.width, src.height, max); let cur = src;
    while (cur.width > s.w * 2 && cur.height > s.h * 2) { const c = P.canvas(Math.ceil(cur.width / 2), Math.ceil(cur.height / 2)), x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, c.width, c.height); cur = c; }
    const c = P.canvas(s.w, s.h), x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, s.w, s.h); return c;
  };
  // Square thumbnail (centre crop) of `size` pixels.
  P.thumb = (src, size) => {
    const s = Math.min(src.width, src.height), c = P.canvas(size, size), x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(src, (src.width - s) / 2, (src.height - s) / 2, s, s, 0, 0, size, size); return c;
  };
  P.pixels = (canvas) => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  // Draw the price as a white tag at the bottom-left of a picture.
  P.priceTag = (canvas, text) => {
    const x = canvas.getContext('2d'), size = Math.max(16, Math.round(canvas.width * 0.06)), pad = size * 0.5, m = Math.round(canvas.width * 0.04);
    x.font = `800 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; x.textBaseline = 'middle';
    const w = x.measureText(text).width + pad * 2, h = size + pad, X = m, Y = canvas.height - m - h, r = h / 2;
    x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = size * 0.4; x.shadowOffsetY = 2;
    x.fillStyle = '#fff'; x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); x.fill(); x.restore();
    x.fillStyle = root.Theme ? root.Theme.brand() : '#741b47'; x.textAlign = 'left'; x.fillText(text, X + pad, Y + h / 2 + 1);
  };
  // Draw the shop logo, centred, inside each box (used by the "own logo" way of hiding marks, after the box was covered).
  P.drawLogo = (canvas, marks, logo) => {
    const x = canvas.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    marks.forEach((b) => {
      const d = Math.min(b.w, b.h) * 0.94, cx = b.x + b.w / 2, cy = b.y + b.h / 2;           // the round logo sits in the middle of the box, as a badge
      x.save(); x.beginPath(); x.arc(cx, cy, d / 2, 0, Math.PI * 2); x.closePath(); x.clip();
      x.fillStyle = '#fff'; x.fillRect(cx - d / 2, cy - d / 2, d, d); x.drawImage(logo, cx - d / 2, cy - d / 2, d, d); x.restore();
    });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = P; else root.Photo = P;
})(typeof window !== 'undefined' ? window : globalThis);

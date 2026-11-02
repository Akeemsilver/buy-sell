/* Mark finder: reads the corners of a picture for watermarks / page counters / app text, entirely on the phone (Tesseract in
   vendor/tesseract, downloaded once on first use and then kept for offline use). A word is only suggested when several different
   readings agree on it, and only near the picture's edges, so text that belongs to the product is left alone. It is a helper:
   the owner always sees, ticks, unticks and adds boxes before anything is hidden. */
(function (root) {
  const P = root.Photo;
  const BASE = 'vendor/tesseract/';
  const ZONES = { tl: [0, 0, 0.45, 0.20], tr: [0.55, 0, 1, 0.24], bl: [0, 0.76, 0.45, 1], br: [0.55, 0.74, 1, 1] };
  const WORD = /^(?:[A-Za-z][A-Za-z\-.]{2,}|\d{1,2}[/:.]\d{1,2}|\d{2,4})$/, COUNTER = /^\d{1,2}\/\d{1,2}$/;
  const SCALES = [3, 4], PSMS = ['11', '12'];
  let worker = null, loading = null, cancelled = false;

  const abs = (p) => new URL(p, document.baseURI).href;
  function script(src) {
    return new Promise((ok, no) => { if (root.Tesseract) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('reader')); document.head.appendChild(s); });
  }
  function getWorker() {
    if (worker) return Promise.resolve(worker);
    return loading || (loading = script(BASE + 'tesseract.min.js').then(() => root.Tesseract.createWorker('eng', 1, {
      workerPath: abs(BASE + 'worker.min.js'), corePath: abs(BASE), langPath: abs(BASE + 'lang'), gzip: false, cacheMethod: 'none', logger: () => {}, errorHandler: () => {},
    })).then((w) => { worker = w; return w; }).catch((e) => { loading = null; throw e; }));
  }

  const overlap = (a, b) => {
    const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)), iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
    return (ix * iy) / (Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0)) + 1e-9);
  };
  const inMargin = (b, W, H) => { const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; return (cx <= W * 0.35 || cx >= W * 0.65) && (cy <= H * 0.16 || cy >= H * 0.80); };

  // Pure part (tested without a browser): readings = [{text, conf, box:{x0,y0,x1,y1}, key}] -> clusters that enough readings agree on.
  function agree(readings, W, H, minVotes, minConf, counterConf) {
    const ws = readings.filter((w) => w.conf >= minConf && WORD.test(w.text) && (w.box.x1 - w.box.x0) >= 20 && (w.box.y1 - w.box.y0) >= 12 && (w.box.y1 - w.box.y0) <= H * 0.12 && (w.box.x1 - w.box.x0) <= W * 0.5 && inMargin(w.box, W, H));
    const cl = [];
    ws.sort((a, b) => b.conf - a.conf).forEach((w) => {
      const c = cl.find((k) => overlap(k.box, w.box) > 0.5);
      if (c) { c.votes.add(w.key); c.conf = Math.max(c.conf, w.conf); c.box = { x0: Math.min(c.box.x0, w.box.x0), y0: Math.min(c.box.y0, w.box.y0), x1: Math.max(c.box.x1, w.box.x1), y1: Math.max(c.box.y1, w.box.y1) }; }
      else cl.push({ text: w.text, conf: w.conf, box: Object.assign({}, w.box), votes: new Set([w.key]) });
    });
    // a page counter such as 1/7 is so recognisable that one confident reading is enough
    return cl.filter((c) => c.votes.size >= minVotes || (COUNTER.test(c.text) && c.conf >= counterConf));
  }

  // After the quick scale, is there a word in this zone that some readings suggest but too few agree on? Only then read again at the finer scale.
  const uncertain = (readings, z, W, H) => agree(readings.filter((r) => r.zone === z), W, H, 1, 50, 60).some((c) => c.votes.size < 3 && !COUNTER.test(c.text));
  const variants = (G) => {
    const a = P.autocontrast(G, 2);
    return { auto: a, otsu: P.otsu(G), inv: P.invert(a), sharp: P.unsharp(G, 3, 180) };
  };

  // canvas = the cropped picture. Resolves to [{text, ticked, box:{x,y,w,h}}] in that canvas's pixels.
  async function suggest(canvas, onProgress) {
    cancelled = false;
    const k0 = Math.min(1, 1200 / canvas.width), work = k0 < 1 ? P.scaled(canvas, Math.round(Math.max(canvas.width, canvas.height) * k0)) : canvas;
    const W = work.width, H = work.height, w = await getWorker();
    const jobs = []; Object.entries(ZONES).forEach(([z, f]) => SCALES.forEach((s) => jobs.push([z, f, s])));
    const readings = []; let done = 0; const total = jobs.length * 4 * PSMS.length;
    const quiet = {};                                           // zones where a quick first look found nothing word-like: skip the slow readings
    for (const [z, f, s] of jobs) {
      if (cancelled) throw new Error('cancelled');
      if (quiet[z] || (s === SCALES[1] && !uncertain(readings, z, W, H))) { done += 4 * PSMS.length; if (onProgress) onProgress(done / total); continue; }
      const zx = Math.round(f[0] * W), zy = Math.round(f[1] * H), zw = Math.round((f[2] - f[0]) * W), zh = Math.round((f[3] - f[1]) * H);
      const big = P.canvas(zw * s, zh * s), bx = big.getContext('2d'); bx.imageSmoothingQuality = 'high'; bx.drawImage(work, zx, zy, zw, zh, 0, 0, zw * s, zh * s);
      const vs = variants(P.gray(P.pixels(big)));
      let seen = 0;
      for (const [pre, G] of Object.entries(vs)) {
        const vc = P.canvas(G.w, G.h); vc.getContext('2d').putImageData(new ImageData(P.grayToImage(G).data, G.w, G.h), 0, 0);
        for (const psm of PSMS) {
          if (cancelled) throw new Error('cancelled');
          await w.setParameters({ tessedit_pageseg_mode: psm });
          const r = await w.recognize(vc);
          (r.data.words || []).forEach((wd) => {
            const box = { x0: zx + wd.bbox.x0 / s, y0: zy + wd.bbox.y0 / s, x1: zx + wd.bbox.x1 / s, y1: zy + wd.bbox.y1 / s };
            readings.push({ text: wd.text, conf: wd.confidence, key: s + '|' + pre + '|' + psm, box, zone: z });
            if (wd.confidence >= 30 && WORD.test(wd.text)) seen++;
          });
          if (onProgress) onProgress(++done / total);
        }
        if (pre === 'auto' && s === SCALES[0] && !seen) { quiet[z] = true; done += (3 * PSMS.length); break; }   // after the first variant, both readings empty
      }
    }
    api.last = { readings, W, H };               // kept for testing/diagnostics
    let found = agree(readings, W, H, 3, 50, 60), ticked = true;
    if (!found.length) { found = agree(readings, W, H, 1, 60, 60); ticked = false; }   // nothing certain: show the best guesses, unticked
    const G = P.gray(P.pixels(work));
    return found.map((c) => {
      const small = COUNTER.test(c.text), b = P.autofit(G, { x: c.box.x0, y: c.box.y0, w: c.box.x1 - c.box.x0, h: c.box.y1 - c.box.y0 }, { small });
      return { text: c.text, ticked, votes: c.votes.size, conf: Math.round(c.conf), box: { x: b.x / k0, y: b.y / k0, w: b.w / k0, h: b.h / k0 } };
    });
  }
  const api = { suggest, agree, last: null, cancel: () => { cancelled = true; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Reader = api;
})(typeof window !== 'undefined' ? window : globalThis);

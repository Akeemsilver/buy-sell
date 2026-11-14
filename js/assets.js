/* Taking pictures in: direct files or a .zip of them. The zip is opened on the phone (nothing is uploaded), only pictures are kept,
   and the file names decide which slot each one goes to (logo, title image, extras). Pure name logic + a small browser part. */
(function (root) {
  const IMG = /\.(png|jpe?g|webp|gif|svg)$/i, ZIP = /\.zip$/i;
  const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
  const base = (p) => String(p || '').split(/[\\/]/).pop();
  const isImageName = (n) => IMG.test(base(n));
  const isZipName = (n) => ZIP.test(base(n));
  const junk = (p) => /(^|[\\/])__MACOSX([\\/]|$)/.test(p) || base(p).startsWith('.') || /(^|[\\/])\.DS_Store$/.test(p);

  // Which slot a file name suggests: logo, title, extra1, or skip (print files, QR codes, combined pictures).
  function slotOf(name) {
    const n = base(name).toLowerCase();
    if (/business-?card|\bcard-(front|back)|front-and-back|store-?qr|(^|[-_ ])qr([-_. ]|$)/.test(n)) return 'skip';
    if (/logo-and-title|logo-title|combined/.test(n)) return 'skip';
    if (/title|wordmark|word-mark|lockup/.test(n)) return 'title';
    if (/white-circle|bubble|circle|badge|stamp/.test(n)) return 'hold';   // listed, but skipped unless you choose a slot
    if (/logo|mark|monogram|(^|[-_ ])br([-_. ]|$)/.test(n)) return 'logo';
    return 'extra1';
  }
  // The "set" a file belongs to (the same name without the part words), so two colour schemes in one zip can be told apart.
  function groupKey(name) {
    let n = base(name).replace(IMG, '').toLowerCase();
    n = n.replace(/(^|[-_])(logo-and-title|logo-in-white-circle|logo-br|title-card|store-qr)(?![a-z])/g, '$1').replace(/(^|[-_])(logo|title|qr)(?![a-z])/g, '$1').replace(/(^|[-_])(transparent|white|trim|bleed)(?![a-z])/g, '$1').replace(/[-_]{2,}/g, '-').replace(/[-_ ]+$/g, '');
    return n || 'files';
  }
  const prettyKey = (k) => k.replace(/^bruiz-?/, '').replace(/^\d+-?/, '').replace(/[-_]+/g, ' ').trim() || k;

  // entries: [{name}] -> { groups: [{ key, label, items: [{ name, slot }] }] }. White copies are dropped when a transparent copy exists.
  function plan(entries) {
    const names = entries.map((e) => base(e.name));
    const items = entries.filter((e) => { const n = base(e.name).toLowerCase(); if (!/(^|[-_])white([-_.]|$)/.test(n)) return true; const alt = n.replace(/white/, 'transparent'); return !names.some((m) => m.toLowerCase() === alt); });
    const stem = (n) => base(n).replace(IMG, '').toLowerCase().replace(/[-_]transparent$/, ''), hasPng = new Set(items.filter((e) => /\.(png|webp)$/i.test(e.name)).map((e) => stem(e.name)));
    for (let i = items.length - 1; i >= 0; i--) if (/\.svg$/i.test(items[i].name) && hasPng.has(stem(items[i].name))) items.splice(i, 1);   // a picture offered as PNG and SVG: keep the PNG
    const map = new Map(), useful = items.filter((e) => slotOf(e.name) !== 'skip'), list0 = useful.length ? useful : items;   // print files, QR codes and combined pictures are left out unless nothing else is there
    list0.forEach((e) => { const k = groupKey(e.name); if (!map.has(k)) map.set(k, []); map.get(k).push({ name: base(e.name), entry: e, slot: slotOf(e.name) === 'skip' ? 'hold' : slotOf(e.name) }); });
    const groups = [...map.entries()].map(([key, list]) => ({ key, label: prettyKey(key), items: list }));
    groups.forEach((g) => { // at most one logo and one title by default; the rest become extras in order
      const seen = {}; let ex = 0;
      g.items.forEach((it) => { if (it.slot === 'logo' || it.slot === 'title') { if (seen[it.slot]) it.slot = 'hold'; else seen[it.slot] = 1; } else if (it.slot === 'extra1') { it.slot = ex < 2 ? 'extra' + (++ex) : 'hold'; } });
    });
    return { groups };
  }

  // Browser: a list of File objects (pictures and/or zips) -> [{ name, file }] of pictures only.
  async function expand(files, opt) {
    opt = opt || {}; const max = opt.max || 40, maxBytes = opt.maxBytes || 25e6, out = [];
    for (const f of Array.from(files || [])) {
      if (out.length >= max) break;
      if (isZipName(f.name) || /zip/.test(f.type || '')) {
        const fz = root.fflate; if (!fz) throw new Error('nozip');
        const data = fz.unzipSync(new Uint8Array(await f.arrayBuffer()), { filter: (fi) => isImageName(fi.name) && !junk(fi.name) && fi.originalSize <= maxBytes });
        Object.keys(data).sort().forEach((p) => { if (out.length >= max) return; const ext = base(p).split('.').pop().toLowerCase(); out.push({ name: base(p), file: new File([data[p]], base(p), { type: MIME[ext] || 'image/png' }) }); });
      } else if (isImageName(f.name) || /^image\//.test(f.type || '')) out.push({ name: f.name, file: f });
    }
    return out;
  }

  const api = { slotOf, groupKey, plan, expand, isImageName, isZipName, base, junk };
  root.Assets = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

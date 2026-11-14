const assert = require('assert'); const IH = require('../js/invheader.js'); const A = require('../js/assets.js');
// defaults are valid and stable through norm
let c = IH.defaults(); assert.deepStrictEqual(IH.norm(c), IH.norm(IH.norm(c))); assert.strictEqual(IH.norm(null).layout, 'A');
// bad input is repaired, not trusted
let bad = IH.norm({ layout: 'zzz', bg: { type: 'what', grad: { stops: [{ c: 'red', p: 3 }, { c: '#112233', p: -1 }] } }, items: { logo: { size: 99999, shape: 'star', x: 'a' } } });
assert.strictEqual(bad.layout, 'A'); assert.strictEqual(bad.bg.type, 'gradient'); assert.ok(bad.bg.grad.stops.length >= 2 && bad.bg.grad.stops.every((s) => IH.isHex(s.c) && s.p >= 0 && s.p <= 1)); assert.strictEqual(bad.items.logo.size, 400); assert.strictEqual(bad.items.logo.shape, 'circle');
// layouts move pieces and keep everything else
let w = IH.defaults(); w.slots.logo = 'data:x'; w.bg.type = 'solid'; w.bg.solid = '#123456'; let d = IH.applyLayout(w, 'D');
assert.strictEqual(d.layout, 'D'); assert.ok(d.items.title.on && !d.items.name.on && d.items.lines.mode === 'two'); assert.strictEqual(d.slots.logo, 'data:x'); assert.strictEqual(d.bg.solid, '#123456');
assert.ok(IH.LAYOUTS.every((id) => IH.applyLayout(IH.defaults(), id).layout === id));
// presets set banner and colours only
let p = IH.applyPreset(d, 'wine'); assert.strictEqual(p.bg.type, 'gradient'); assert.strictEqual(p.items.name.color, '#ffffff'); assert.ok(p.items.title.on); assert.strictEqual(p.slots.logo, 'data:x');
// table colours follow the banner
const cl = IH.colours(IH.applyPreset(IH.defaults(), 'rosegold')); assert.ok(/^#[0-9a-f]{6}$/.test(cl.head) && cl.custom && cl.tint && cl.band); assert.strictEqual(IH.colours(Object.assign(IH.defaults(), { accent: '#112233' })).head, '#112233'); assert.strictEqual(IH.colours(Object.assign(IH.defaults(), { accent: '#112233' })).ink, '#fff');
// gradient stops: smooth as set, soft gets more, sharp doubles with hard edges
const g = IH.defaults().bg.grad; assert.strictEqual(IH.stopsFor(Object.assign({}, g, { blend: 'smooth' })).length, 3); assert.ok(IH.stopsFor(Object.assign({}, g, { blend: 'soft' })).length > 6);
const sh = IH.stopsFor(Object.assign({}, g, { blend: 'sharp' })); assert.strictEqual(sh.length, 6); assert.strictEqual(sh[1][0], sh[2][0]); assert.notStrictEqual(sh[1][1], sh[2][1]);
// paths
const o = {}; IH.setPath(o, 'items.logo.size', 50); assert.strictEqual(IH.getPath(o, 'items.logo.size'), 50);
// drawing: a recording canvas context; a tiny fake picture
const calls = []; const x = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push(k); if (k === 'createLinearGradient' || k === 'createRadialGradient') return { addColorStop() {} }; }), set: (t, k, v) => { t[k] = v; return true; } });
const img = { complete: true, naturalWidth: 200, naturalHeight: 100 };
IH.draw(x, IH.applyLayout(IH.defaults(), 'D'), { name: 'B.RUIZ', lines: { city: 'Chaguanas', phone: '1868', email: 'a@b.c' }, title: 'INVOICE' }, { logo: img, title: img });
assert.ok(calls.includes('createRadialGradient') && calls.includes('drawImage') && calls.includes('fillText'));
const n0 = calls.length; calls.length = 0; IH.draw(x, Object.assign(IH.defaults(), { bg: { type: 'solid', solid: '#ffffff' } }), {}, {}); assert.ok(!calls.includes('createRadialGradient')); assert.ok(calls.includes('fillRect'));
// two lines mode joins the first two details
const texts = []; const x2 = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { if (k === 'fillText') texts.push(a[0]); if (/Gradient/.test(k)) return { addColorStop() {} }; }), set: (t, k, v) => { t[k] = v; return true; } });
IH.draw(x2, IH.applyLayout(IH.defaults(), 'D'), { name: 'N', lines: { city: 'Chaguanas', phone: '186', email: 'a@b.c' } }, {}); assert.ok(texts.includes('Chaguanas · 186') && texts.includes('a@b.c'));
// assets: names -> slots, groups, white copies dropped
assert.strictEqual(A.slotOf('bruiz-02-Wine-Blush-logo-BR-transparent.png'), 'logo'); assert.strictEqual(A.slotOf('bruiz-02-Wine-Blush-title-card-transparent.png'), 'title'); assert.strictEqual(A.slotOf('bruiz-02-Wine-Blush-store-QR.png'), 'skip'); assert.strictEqual(A.slotOf('bruiz-02-business-card-front-1050x600.png'), 'skip'); assert.strictEqual(A.slotOf('bruiz-02-Wine-Blush-logo-in-white-circle.png'), 'hold'); assert.strictEqual(A.slotOf('photo123.jpg'), 'extra1');
const names = ['bruiz-02-Wine-Blush-logo-BR-transparent.png', 'bruiz-02-Wine-Blush-logo-BR-white.png', 'bruiz-02-Wine-Blush-title-card-transparent.png', 'bruiz-10-RoseGold-Plum-logo-BR-transparent.png', 'bruiz-10-RoseGold-Plum-title-card-transparent.png'].map((n) => ({ name: n }));
names.push({ name: 'bruiz-02-Wine-Blush-store-QR.png' }, { name: 'bruiz-02-Wine-Blush-business-card-front-1050x600-300dpi.png' }, { name: 'bruiz-02-Wine-Blush-logo-in-white-circle-transparent.png' });
const pl = A.plan(names); assert.strictEqual(pl.groups.length, 2); assert.strictEqual(pl.groups[0].items.length, 3); assert.ok(!pl.groups.some((gr) => gr.items.some((i) => /QR|business-card/.test(i.name)))); assert.deepStrictEqual(pl.groups.map((gr) => gr.label), ['wine blush', 'rosegold plum']); assert.ok(pl.groups.every((gr) => gr.items.some((i) => i.slot === 'logo') && gr.items.some((i) => i.slot === 'title'))); assert.ok(!pl.groups[0].items.some((i) => /-white\.png$/.test(i.name)));
assert.ok(A.isImageName('a/b/Logo.PNG') && !A.isImageName('notes.txt') && A.isZipName('x.ZIP') && A.junk('__MACOSX/a.png') && A.junk('.hidden.png'));
// a real zip round trip with the vendored zip reader
const fz = require('../vendor/fflate/fflate.js'); global.fflate = fz; global.File = global.File || class { constructor(parts, name, o) { this.parts = parts; this.name = name; this.type = (o || {}).type; } };
const zipped = fz.zipSync({ 'set/a-logo.png': new Uint8Array([1, 2, 3]), 'set/readme.txt': new Uint8Array([9]), '__MACOSX/set/._a-logo.png': new Uint8Array([5]) });
const fakeZip = { name: 'brand.zip', type: 'application/zip', arrayBuffer: async () => zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) };
A.expand([fakeZip, { name: 'x.png', type: 'image/png' }, { name: 'y.txt', type: 'text/plain' }]).then((r) => { assert.deepStrictEqual(r.map((e) => e.name), ['a-logo.png', 'x.png']); console.log('invheader tests passed'); });

const assert = require('assert'); global.qrcode = require('../vendor/qrcode/qrcode.js'); global.Path2D = class { constructor(d) { this.d = d; } };
const C = require('../js/cardmaker.js'); const P = require('../js/pdf.js');
let c = C.defaults(); assert.deepStrictEqual(C.norm(c), C.norm(C.norm(c))); assert.strictEqual(C.norm({ sides: 'x', scheme: 'nope', dark: 'red' }).sides, 'both'); assert.strictEqual(C.norm({ dark: 'red' }).dark, '#6d1230');
assert.deepStrictEqual(C.sidesOf({ sides: 'front' }), ['front']); assert.deepStrictEqual(C.sidesOf({ sides: 'frontblank' }), ['front', 'blank']); assert.deepStrictEqual(C.sidesOf({ sides: 'both' }), ['front', 'back']);
assert.deepStrictEqual(C.size({ bleed: false }), { w: 525, h: 300, inW: 3.5, inH: 2 }); assert.strictEqual(C.size({ bleed: true }).inW, 3.75);
const rg = C.applyScheme(C.defaults(), 'rosegold'); assert.strictEqual(rg.dark, '#7a2f5a'); const iv = C.applyScheme(C.defaults(), 'invoice', '#c79db5'); assert.strictEqual(iv.scheme, 'invoice'); assert.ok(/^#[0-9a-f]{6}$/.test(iv.dark) && iv.dark !== '#c79db5');
// lines follow the switches and the business details
const data = { name: 'B-RUIZ', phone: '18683658857', email: 'a@b.c', city: 'Chaguanas', storeLink: 'https://shopivo.github.io/store.html?s=b-ruiz', whatsappLink: 'https://wa.me/18683658857' };
assert.deepStrictEqual(C.lineRows(C.defaults(), data).map((r) => r[0]), ['phone', 'whatsapp', 'mail', 'pin']);
let off = C.defaults(); off.show.email = false; off.show.city = false; assert.deepStrictEqual(C.lineRows(off, data).map((r) => r[0]), ['phone', 'whatsapp']); assert.deepStrictEqual(C.lineRows(C.defaults(), {}).map((r) => r[0]), []);
let own = C.defaults(); own.text.phone = '555 1234'; assert.strictEqual(C.lineRows(own, data)[0][1], '555 1234');
// what the QR carries
assert.strictEqual(C.qrTarget(C.defaults(), data), data.storeLink); let q = C.defaults(); q.qr.mode = 'whatsapp'; assert.strictEqual(C.qrTarget(q, data), data.whatsappLink); q.qr.mode = 'link'; q.qr.text = 'https://x.y/z'; assert.strictEqual(C.qrTarget(q, data), 'https://x.y/z'); q.qr.text = ''; assert.strictEqual(C.qrTarget(q, data), data.storeLink);
const M = C.qrMatrix(data.storeLink); assert.ok(M.n >= 25 && M.n <= 41); let dark = 0; for (let r = 0; r < M.n; r++) for (let k = 0; k < M.n; k++) if (M.dark(r, k)) dark++; assert.ok(dark > M.n * M.n * 0.25 && dark < M.n * M.n * 0.75); assert.strictEqual(C.qrMatrix(''), null);
// drawing with a recording context
const mk = () => { const calls = [], texts = []; const x = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push(k); if (k === 'fillText') texts.push(a[0]); if (/Gradient/.test(k)) return { addColorStop() {} }; }), set: (t, k, v) => { t[k] = v; return true; } }); return { x, calls, texts }; };
const img = { complete: true, naturalWidth: 300, naturalHeight: 100 };
let f = mk(); C.draw(f.x, 'front', C.defaults(), data, { logo: img, title: img }, { bleed: true }); assert.ok(f.calls.filter((k) => k === 'drawImage').length === 2 && f.texts.includes('STYLE · QUALITY · TRUST'));
let b = mk(); C.draw(b.x, 'back', C.defaults(), data, { logo: img }, {}); assert.ok(b.texts.includes('B-RUIZ') && b.texts.includes('Chaguanas') && b.texts.includes('SCAN TO SHOP') && b.calls.filter((k) => k === 'fillRect').length > 150, 'QR modules are drawn');
let nq = C.defaults(); nq.show.qr = false; let b2 = mk(); C.draw(b2.x, 'back', nq, data, {}, {}); assert.ok(!b2.texts.includes('SCAN TO SHOP'));
let bl = mk(); C.draw(bl.x, 'blank', C.defaults(), data, {}, {}); assert.deepStrictEqual(bl.calls.filter((k) => k === 'fillRect').length, 1);
// the multi-page print PDF
const j = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); const pdf = Buffer.from(P.pagesToPdf([{ jpeg: j, w: 1050, h: 600 }, { blank: true }, { jpeg: j, w: 1050, h: 600 }], { w: 252, h: 144 })).toString('latin1');
assert.ok(pdf.startsWith('%PDF-1.4') && /\/Count 3/.test(pdf) && (pdf.match(/\/Type \/Page /g) || []).length === 3 && /MediaBox \[0 0 252 144\]/.test(pdf) && pdf.trim().endsWith('%%EOF'));
// every object offset in the xref points at "n 0 obj"
const xr = pdf.indexOf('xref'), offs = pdf.slice(xr).split('\n').slice(3).filter((l) => /^\d{10} 00000 n/.test(l)).map((l) => parseInt(l, 10)); offs.forEach((o, i) => assert.ok(pdf.slice(o).startsWith(`${i + 1} 0 obj`), 'xref offset ' + (i + 1)));
console.log('cardmaker tests passed');

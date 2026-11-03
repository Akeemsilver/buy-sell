/* Tests for the photo engine on synthetic pictures (no browser needed). */
const assert = require('assert');
const P = require('../js/photo.js');

const mk = (w, h, fn) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), j = (y * w + x) * 4; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255; } return { width: w, height: h, data: d }; };
const noise = (x, y) => { let a = (x * 73856093) ^ (y * 19349663); a = Math.imul(a ^ (a >>> 13), 1274126177); return ((a ^ (a >>> 16)) >>> 0) / 4294967296; };

// 1. screenshot: white bars above and below, busy picture in the middle
{
  const img = mk(300, 600, (x, y) => (y < 80 || y >= 520 ? [255, 255, 255] : [40 + noise(x, y) * 200, 30 + noise(y, x) * 180, 60 + noise(x + y, y) * 150].map(Math.round)));
  const a = P.findPhotoArea(img);
  assert(Math.abs(a.y - 80) <= 3 && Math.abs(a.y + a.h - 520) <= 3 && a.w === 300, 'photo area ' + JSON.stringify(a));
  const whole = P.findPhotoArea(mk(200, 300, (x, y) => [noise(x, y) * 255, noise(y, x) * 255, noise(x, x + y) * 255]));
  assert.deepStrictEqual(whole, { x: 0, y: 0, w: 200, h: 300 }, 'a plain photo is kept whole');
  const flat = P.findPhotoArea(mk(100, 100, () => [255, 255, 255]));
  assert.deepStrictEqual(flat, { x: 0, y: 0, w: 100, h: 100 }, 'nothing to find keeps everything');
}
// 2. frames
{
  assert.deepStrictEqual(P.frameFor(400, 300, 1), { x: 50, y: 0, w: 300, h: 300 });
  assert.deepStrictEqual(P.frameFor(300, 400, 4 / 5), { x: 0, y: 13, w: 300, h: 375 });
  assert.deepStrictEqual(P.frameFor(300, 400, 0), { x: 0, y: 0, w: 300, h: 400 });
  assert.deepStrictEqual(P.clampFrame({ x: -20, y: 390, w: 500, h: 50 }, 300, 400), { x: 0, y: 350, w: 300, h: 50 });
  assert.deepStrictEqual(P.fit(2000, 1000, 640), { w: 640, h: 320 });
  assert.deepStrictEqual(P.fit(100, 50, 640), { w: 100, h: 50 }, 'never enlarges');
}
// 3. hiding: blur and cover change the box, leave far-away pixels alone, and no mark detail survives
{
  const base = (x, y) => [200, 120, 150].map((v, i) => v + (x > 60 && x < 100 && y > 40 && y < 60 && (x + y) % 6 < 3 ? (i ? -90 : -150) : 0));   // a striped "watermark"
  for (const mode of ['blur', 'cover']) {
    const img = mk(160, 120, base), ref = mk(160, 120, base);
    P.applyMarks(img, [{ x: 50, y: 32, w: 60, h: 36 }], mode);
    const at = (im, x, y) => im.data[(y * im.width + x) * 4];
    assert.strictEqual(at(img, 5, 5), at(ref, 5, 5), mode + ': far pixels untouched');
    let varIn = 0, varRef = 0; for (let y = 38; y < 62; y++) for (let x = 56; x < 104; x++) { varIn += Math.abs(at(img, x, y) - at(img, x + 1, y)); varRef += Math.abs(at(ref, x, y) - at(ref, x + 1, y)); }
    assert(varIn < varRef * 0.15, `${mode}: the stripes are gone (${varIn} vs ${varRef})`);
  }
}
console.log('photo engine tests passed');


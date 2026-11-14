const assert = require('assert'); const LF = require('../js/logofit.js');
const make = (w, h, bg, draw) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = bg[0]; d[i * 4 + 1] = bg[1]; d[i * 4 + 2] = bg[2]; d[i * 4 + 3] = bg[3] === undefined ? 255 : bg[3]; } for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = draw(x, y); if (c) { const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } } return d; };
const WHITE = [255, 255, 255, 255], PINK = [200, 60, 120], DARK = [30, 30, 30];
// a round logo on white with a pale margin round it
let d = make(200, 200, WHITE, (x, y) => ((x - 100) ** 2 + (y - 100) ** 2 <= 80 ** 2 ? PINK : null)); let r = LF.analyze(d, 200, 200);
assert.strictEqual(r.shape, 'circle'); assert.strictEqual(r.mode, 'colour'); assert.ok(Math.abs(r.box.w - 161) <= 2 && Math.abs(r.box.h - 161) <= 2);
// white text inside the circle stays (it is not reachable from the edge)
d = make(200, 200, WHITE, (x, y) => ((x - 100) ** 2 + (y - 100) ** 2 <= 80 ** 2 ? (x > 90 && x < 110 && y > 90 && y < 110 ? [255, 255, 255] : PINK) : null)); r = LF.analyze(d, 200, 200); assert.strictEqual(r.shape, 'circle'); assert.strictEqual(r.bg[100 * 200 + 100], 0);
const px = LF.cutout(d, 200, 200, r); assert.strictEqual(px[(5 * r.box.w + 5) * 4 + 3], 0); assert.strictEqual(px[((r.box.h >> 1) * r.box.w + (r.box.w >> 1)) * 4 + 3], 255);
// a rounded square on white
const rr = (x, y, s, rad) => { const cx = Math.min(Math.max(x, rad), s - rad), cy = Math.min(Math.max(y, rad), s - rad); return (x - cx) ** 2 + (y - cy) ** 2 <= rad ** 2; };
d = make(200, 200, WHITE, (x, y) => (x >= 20 && x < 180 && y >= 20 && y < 180 && rr(x - 20, y - 20, 160, 36) ? DARK : null)); r = LF.analyze(d, 200, 200); assert.strictEqual(r.shape, 'rounded');
// a plain square, and a picture that fills the whole frame
d = make(200, 200, WHITE, (x, y) => (x >= 30 && x < 170 && y >= 30 && y < 170 ? DARK : null)); r = LF.analyze(d, 200, 200); assert.strictEqual(r.shape, 'square');
d = make(200, 200, [10, 10, 10], (x, y) => (x % 40 < 20 ? [200, 80, 40] : null)); r = LF.analyze(d, 200, 200); assert.strictEqual(r.mode, 'none'); assert.strictEqual(r.shape, 'square');
// a wide word mark
d = make(400, 120, WHITE, (x, y) => (x >= 20 && x < 380 && y >= 30 && y < 90 ? DARK : null)); r = LF.analyze(d, 400, 120); assert.strictEqual(r.shape, 'wide');
// a picture that already has see-through corners
d = make(200, 200, [0, 0, 0, 0], (x, y) => ((x - 100) ** 2 + (y - 100) ** 2 <= 90 ** 2 ? PINK : null)); r = LF.analyze(d, 200, 200); assert.strictEqual(r.mode, 'transparent'); assert.strictEqual(r.shape, 'circle');
// slightly noisy white (as a photo of a logo would be)
d = make(200, 200, WHITE, (x, y) => ((x - 100) ** 2 + (y - 100) ** 2 <= 80 ** 2 ? PINK : [250 + ((x * 7 + y * 3) % 6), 252, 253])); r = LF.analyze(d, 200, 200); assert.strictEqual(r.shape, 'circle');
// the owner's pick beats the detected shape; with no pick the detected one is used; nothing known means square
assert.strictEqual(LF.effective({ bizLogoShape: 'circle' }), 'circle'); assert.strictEqual(LF.effective({ bizLogoShape: 'circle', bizLogoPick: 'rounded' }), 'rounded'); assert.strictEqual(LF.effective({ bizLogoShape: 'circle', bizLogoPick: 'auto' }), 'circle'); assert.strictEqual(LF.effective({}), 'square');
console.log('logofit tests passed');

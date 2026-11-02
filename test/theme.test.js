const assert = require('assert');
const T = require('../js/theme.js');
assert.strictEqual(T.PALETTES.length, 12);
assert.strictEqual(new Set(T.PALETTES.map((p) => p.id)).size, 12, 'unique ids');
T.PALETTES.forEach((p) => {
  assert(T.contrastWhite(p.brand) >= 4.5, `${p.id}: white text on ${p.brand} is hard to read (${T.contrastWhite(p.brand).toFixed(2)})`);
  const v = T.vars(p.id);
  ['brand', 'bar', 'brand2', 'tint', 'bg', 'line', 'ink', 'mute'].forEach((k) => assert(v.light[k], `${p.id} light ${k}`));
  ['brand', 'bar', 'brand2', 'tint', 'bg', 'card', 'line', 'ink', 'mute'].forEach((k) => assert(v.dark[k], `${p.id} dark ${k}`));
  const c = T.css(p.id); assert(c.includes(':root:root[data-theme=dark]') && c.includes('prefers-color-scheme:dark') && c.includes(p.brand));
});
assert.strictEqual(T.find('nope').id, 'magenta', 'unknown scheme falls back to the original');
assert.strictEqual(T.vars('magenta').light.brand, '#741b47', 'the original color is unchanged');
console.log('theme tests passed');

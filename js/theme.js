/* Color schemes. Each scheme is ONE dark color (used for the top bar, buttons, highlights); the lighter shades, the soft
   backgrounds and the dark-mode version are worked out from it. The chosen scheme is stored with the business settings
   (state.settings.palette, so it follows the account) and remembered on the phone so the app starts in it without a flash. */
(function (root) {
  const PALETTES = [
    { id: 'magenta', brand: '#741b47' }, { id: 'rose', brand: '#ad1f57' }, { id: 'wine', brand: '#7a1f33' }, { id: 'red', brand: '#b3261e' }, { id: 'coral', brand: '#c4452d' },
    { id: 'orange', brand: '#c2570c' }, { id: 'amber', brand: '#a35f00' }, { id: 'gold', brand: '#8a6a00' }, { id: 'olive', brand: '#5b6b1a' }, { id: 'lime', brand: '#4d7c0f' },
    { id: 'green', brand: '#1c7243' }, { id: 'forest', brand: '#14532d' }, { id: 'teal', brand: '#0f6b6b' }, { id: 'cyan', brand: '#0b7285' }, { id: 'sky', brand: '#0a6a9e' },
    { id: 'blue', brand: '#1d5fb4' }, { id: 'navy', brand: '#1f3a73' }, { id: 'indigo', brand: '#3f3fa8' }, { id: 'purple', brand: '#6a2c91' }, { id: 'charcoal', brand: '#3f3d48' },
  ];
  const DEFAULT = 'magenta';
  const hsl = (h, s, l) => `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`;
  function toHsl(hex) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return { h, s: s * 100, l: l * 100 };
  }
  const find = (id) => PALETTES.find((p) => p.id === id) || PALETTES[0];
  // Contrast of white text on the dark color (WCAG), used by the tests so no scheme can have unreadable buttons.
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); };
  const contrastWhite = (hex) => 1.05 / (lum(hex) + 0.05);

  // The color variables for one scheme: light mode, and dark mode.
  function vars(id) {
    const p = find(id), c = toHsl(p.brand), h = c.h, s = Math.min(c.s, 70), mute = c.s < 25;   // charcoal stays quiet
    const sat = (v) => (mute ? Math.min(v, 14) : v);
    const light = { brand: p.brand, bar: p.brand, brand2: hsl(h, sat(Math.max(35, s * 0.62)), 62), tint: hsl(h, sat(48), 94), bg: hsl(h, sat(30), 98.6), line: hsl(h, sat(12), 84), ink: hsl(h, sat(22), 15), mute: hsl(h, sat(10), 44) };
    const dark = { brand: hsl(h, sat(58), 58), bar: hsl(h, sat(55), 17), brand2: hsl(h, sat(40), 40), tint: hsl(h, sat(28), 16), bg: hsl(h, sat(22), 7.5), card: hsl(h, sat(16), 12.5), line: hsl(h, sat(16), 22), ink: hsl(h, sat(25), 94), mute: hsl(h, sat(12), 68) };
    return { light, dark };
  }
  const decl = (o) => Object.keys(o).map((k) => `--${k}:${o[k]}`).join(';');
  function css(id) {
    const v = vars(id);
    // :root:root outranks the plain :root rules of style.css, whichever file loads first
    return `:root:root{${decl(v.light)}}@media (prefers-color-scheme:dark){:root:root:not([data-theme=light]){${decl(v.dark)}}}:root:root[data-theme=dark]{${decl(v.dark)}}`;
  }
  const lsGet = () => { try { return JSON.parse(localStorage.getItem('buy-sell-pref:palette')); } catch (e) { return null; } };
  let current = DEFAULT;
  function apply(id) {
    id = find(id).id; current = id;
    if (typeof document === 'undefined') return id;
    let el = document.getElementById('palette'); if (!el) { el = document.createElement('style'); el.id = 'palette'; document.head.appendChild(el); }
    el.textContent = css(id);
    try { localStorage.setItem('buy-sell-pref:palette', JSON.stringify(id)); } catch (e) { /* remembered next time */ }
    return id;
  }
  // The variables of one scheme as an inline style, so a preview can wear a scheme without changing the app.
  const inline = (id, dark) => { const v = vars(id)[dark ? 'dark' : 'light']; return Object.keys(v).map((k) => `--${k}:${v[k]}`).join(';') + ';--card:' + (dark ? v.card : '#fff'); };
  const api = { PALETTES, inline, DEFAULT, vars, css, apply, find, contrastWhite, current: () => current, saved: () => lsGet() || DEFAULT,
    brand: () => find(current).brand, barColor: (dark) => { const v = vars(current); return dark ? v.dark.bar : v.light.bar; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else { root.Theme = api; if (typeof document !== 'undefined') api.apply(api.saved()); }
})(typeof window !== 'undefined' ? window : globalThis);

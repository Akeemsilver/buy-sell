/* A guard against styles being lost by accident (the iPhone install guide once lost all of its styling that way). */
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const need = [
  '.appbar', '.round', '.tabbar', '.actionbar', '.sheet', '.sheet .grab', '.scrim', '.stat', '.row', '.chip', '.item', '.pill', '.btn', '.sumbox', '.seg', '.seg.two',
  '.install', '.step', '.note', '.mock', '.safari', '.rows', '.dlg', '.dlg .hdr', '.mock.home', '.ico',
  '.inv', '.inv-banner', '.inv-t', '.inv-tot', '.inv-terms', '.inv-foot', '.stamp', '.table', '.mbars', '.hide-amounts .amt', '.sheet.kb', 'body.kb .tabbar',
];
const missing = need.filter((s) => !css.includes(s + '{') && !css.includes(s + ',') && !css.includes(s + ' {') && !new RegExp('(^|[},\\s])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[{,]').test(css));
if (missing.length) { console.error('Styles missing from css/style.css: ' + missing.join(', ')); process.exit(1); }
if (!/@media print/.test(css) || !/@page/.test(css)) { console.error('print rules missing'); process.exit(1); }
console.log(`css ok: ${need.length} key style rules present`);

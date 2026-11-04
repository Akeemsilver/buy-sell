const assert = require('assert');
const { jpegToPdf } = require('../js/pdf.js');
const jpeg = Uint8Array.from([0xff, 0xd8, 1, 2, 3, 4, 5, 0xff, 0xd9]);
const pdf = jpegToPdf(jpeg, 1600, 2262), txt = Buffer.from(pdf).toString('latin1');
assert.ok(txt.startsWith('%PDF-1.4') && txt.trim().endsWith('%%EOF'));
assert.ok(/MediaBox \[0 0 595\.28 841\.\d+\]/.test(txt), 'A4 shaped page for an A4 shaped picture: ' + (txt.match(/MediaBox[^\]]*\]/) || [])[0]);
// every xref offset points at the start of its object
const xr = txt.indexOf('xref\n'), start = Number(txt.match(/startxref\n(\d+)/)[1]); assert.strictEqual(start, xr);
const offs = [...txt.slice(xr).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
assert.strictEqual(offs.length, 5); offs.forEach((o, i) => assert.ok(txt.slice(o).startsWith(`${i + 1} 0 obj`), 'object ' + (i + 1) + ' at ' + o));
assert.ok(Buffer.from(pdf).includes(Buffer.from(jpeg)), 'the jpeg bytes are embedded unchanged');
assert.ok(/\/Length 9 /.test(txt));
console.log('pdf tests passed');

/* A tiny PDF writer: one page that is a picture (JPEG) of the invoice, so it can be shared as a real PDF file straight from the phone.
   UMD: also loaded by Node tests. */
(function (root) {
  const enc = (s) => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
  const num = (n) => (Math.round(n * 100) / 100).toString();

  // jpeg: Uint8Array of a baseline JPEG, w x h pixels. The page is 210 mm wide and as tall as the picture (A4 when the picture is A4-shaped).
  // page (optional): { w, h } in points, e.g. US Letter 612 x 792, when the picture is already laid out for that page.
  function jpegToPdf(jpeg, w, h, page) {
    const PW = page ? page.w : 595.28, PH = page ? page.h : PW * h / w, parts = [], offs = [];
    let len = 0;
    const put = (x) => { const b = typeof x === 'string' ? enc(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body, stream) => { offs[n] = len; put(`${n} 0 obj\n${body}\n`); if (stream) { put('stream\n'); put(stream); put('\nendstream\n'); } put('endobj\n'); };
    put('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(PW)} ${num(PH)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    obj(4, `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`, jpeg);
    const content = `q ${num(PW)} 0 0 ${num(PH)} 0 0 cm /Im0 Do Q`;
    obj(5, `<< /Length ${content.length} >>`, enc(content));
    const xref = len;
    put('xref\n0 6\n0000000000 65535 f \n'); for (let n = 1; n <= 5; n++) put(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
    put(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(len); let p = 0; parts.forEach((b) => { out.set(b, p); p += b.length; });
    return out;
  }

  // Several pages at once: list = [{ jpeg, w, h }] (a picture page) or [{ blank: true }]; page = { w, h } in points. Used for the print-ready business card.
  function pagesToPdf(list, page) {
    const PW = page.w, PH = page.h, parts = [], offs = []; let len = 0;
    const put = (x) => { const b = typeof x === 'string' ? enc(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body, stream) => { offs[n] = len; put(`${n} 0 obj\n${body}\n`); if (stream) { put('stream\n'); put(stream); put('\nendstream\n'); } put('endobj\n'); };
    const N = list.length, firstPage = 3, ids = []; let next = firstPage + N;   // page objects 3..3+N-1, then image + content objects
    put('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${list.map((_, i) => `${firstPage + i} 0 R`).join(' ')}] /Count ${N} >>`);
    list.forEach((pg, i) => {
      const imgId = pg.blank ? 0 : next++, conId = next++; ids.push([imgId, conId]);
      obj(firstPage + i, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(PW)} ${num(PH)}] /Resources << ${pg.blank ? '' : `/XObject << /Im0 ${imgId} 0 R >>`} >> /Contents ${conId} 0 R >>`);
    });
    list.forEach((pg, i) => {
      const [imgId, conId] = ids[i];
      if (!pg.blank) obj(imgId, `<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>`, pg.jpeg);
      const content = pg.blank ? 'q Q' : `q ${num(PW)} 0 0 ${num(PH)} 0 0 cm /Im0 Do Q`;
      obj(conId, `<< /Length ${content.length} >>`, enc(content));
    });
    const total = next, xref = len;
    put(`xref\n0 ${total}\n0000000000 65535 f \n`); for (let n = 1; n < total; n++) put(String(offs[n]).padStart(10, '0') + ' 00000 n \n');
    put(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(len); let q = 0; parts.forEach((b) => { out.set(b, q); q += b.length; });
    return out;
  }
  const api = { jpegToPdf, pagesToPdf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Pdf = api;
})(typeof self !== 'undefined' ? self : this);

/* Word library: the owner's English ↔ Spanish word list. It builds the Spanish name of an item from its English description so the
   online store can show it to Spanish-speaking visitors. Pure rules, tested in Node. Nothing here touches costs or profit. */
(function (root) {
  const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[“”"'’]/g, '').replace(/\s+/g, ' ').trim();
  const clean = (tok) => tok.replace(/^[^\p{L}\p{N}&]+|[^\p{L}\p{N}&]+$/gu, '');
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // The starter list (c = group on the library page). The owner can edit or delete any of it.
  const S = (c, pairs) => pairs.map(([en, es]) => ({ en, es, c }));
  const STARTER = [].concat(
    S('clothes', [['top', 'blusa'], ['pants', 'pantalones'], ['dress', 'vestido'], ['skirt', 'falda'], ['shorts', 'shorts'], ['jumpsuit', 'enterizo'], ['jacket', 'chaqueta'], ['set', 'conjunto'],
      ['shirt', 'camisa'], ['blouse', 'blusa'], ['t-shirt', 'camiseta'], ['sweater', 'suéter'], ['hoodie', 'sudadera'], ['jeans', 'jeans'], ['leggings', 'leggings'], ['coat', 'abrigo'],
      ['bodysuit', 'body'], ['romper', 'mono'], ['swimsuit', 'traje de baño'], ['bikini', 'bikini'], ['sandals', 'sandalias'], ['shoes', 'zapatos'], ['sneakers', 'tenis'], ['boots', 'botas'],
      ['heels', 'tacones'], ['bag', 'cartera'], ['hat', 'sombrero'], ['belt', 'cinturón'], ['scarf', 'bufanda'], ['ring', 'anillo'], ['necklace', 'collar'], ['earrings', 'aretes'], ['bracelet', 'pulsera'], ['watch', 'reloj']]),
    S('colours', [['black', 'negro'], ['white', 'blanco'], ['blue', 'azul'], ['red', 'rojo'], ['pink', 'rosado'], ['green', 'verde'], ['yellow', 'amarillo'], ['orange', 'anaranjado'], ['purple', 'morado'],
      ['brown', 'marrón'], ['grey', 'gris'], ['gray', 'gris'], ['beige', 'beige'], ['navy', 'azul marino'], ['gold', 'dorado'], ['silver', 'plateado'], ['cream', 'crema']]),
    S('sizes', [['small', 'pequeño'], ['medium', 'mediano'], ['large', 'grande'], ['extra large', 'extra grande'], ['xs', 'XS'], ['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL'], ['xxl', 'XXL'], ['plus size', 'talla grande']]),
    S('more', [['and', 'y'], ['&', 'y'], ['with', 'con'], ['for', 'para'], ['long', 'largo'], ['short', 'corto'], ['sleeve', 'manga'], ['lace', 'encaje'], ['linen', 'lino'], ['cotton', 'algodón'], ['floral', 'floral'], ['women', 'mujer'], ['kids', 'niños']])
  );

  const index = (words) => { const m = new Map(); let max = 1; (words || []).forEach((w) => { const k = norm(w.en); if (!k || !String(w.es || '').trim()) return; m.set(k, String(w.es).trim()); max = Math.max(max, k.split(' ').length); }); return { m, max }; };

  // Word by word, longest phrase first. Unknown words stay as typed and are listed in `missing`. Numbers and codes pass through.
  const translate = (desc, words) => {
    const toks = String(desc || '').trim().split(/\s+/).filter(Boolean), { m, max } = index(words), out = [], missing = [];
    for (let i = 0; i < toks.length;) {
      let hit = false;
      for (let n = Math.min(max, toks.length - i); n >= 1 && !hit; n--) {
        const phrase = norm(toks.slice(i, i + n).map(clean).join(' '));
        if (phrase && m.has(phrase)) {   // keep the punctuation that was around the phrase
          const lead = (toks[i].match(/^[^\p{L}\p{N}&]+/u) || [''])[0], tail = (toks[i + n - 1].match(/[^\p{L}\p{N}&]+$/u) || [''])[0];
          out.push(lead + m.get(phrase) + tail); i += n; hit = true;
        }
      }
      if (hit) continue;
      const raw = toks[i], c = norm(clean(raw));
      if (c && /\p{L}/u.test(c) && !/\d/.test(c) && !missing.includes(c)) missing.push(c);
      out.push(raw); i++;
    }
    return { es: cap(out.join(' ')), missing };
  };

  // The Spanish name of an item and where it stands: 'none' (no description), 'ok', or 'check' (a word is missing from the library).
  // A name the owner confirmed counts only while the description is still the one it was confirmed for.
  const spanish = (it, words) => {
    const d = String(it.desc || '').trim();
    if (!d) return { es: '', state: 'none', missing: [] };
    if (it.esSet && String(it.nameEs || '').trim() && it.esFor === it.desc) return { es: String(it.nameEs).trim(), state: 'ok', missing: [] };
    const t = translate(d, words);
    return { es: t.es, state: t.missing.length ? 'check' : 'ok', missing: t.missing };
  };
  // What the store may show in Spanish: only names that are in order; otherwise the English name stays.
  const publishable = (it, words) => { const s = spanish(it, words); return s.state === 'ok' ? s.es : ''; };

  // Adds or replaces words (by English). Returns the new list; the owner's own words are kept at the end with no group.
  const put = (words, en, es, c) => {
    const k = norm(en), v = String(es || '').trim(); if (!k || !v) return words;
    const i = words.findIndex((w) => norm(w.en) === k), rec = { en: String(en).trim().toLowerCase(), es: v, c: c !== undefined ? c : (i >= 0 ? words[i].c : '') };
    return i >= 0 ? words.map((w, j) => (j === i ? rec : w)) : words.concat(rec);
  };
  const drop = (words, en) => words.filter((w) => norm(w.en) !== norm(en));
  // The starter list, once, without overwriting anything the owner already has.
  const seed = (words) => STARTER.reduce((acc, w) => (acc.some((x) => norm(x.en) === norm(w.en)) ? acc : acc.concat(w)), (words || []).slice());

  const api = { norm, STARTER, translate, spanish, publishable, put, drop, seed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Words = api;
})(typeof window !== 'undefined' ? window : globalThis);

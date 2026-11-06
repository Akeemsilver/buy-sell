/* Word library: the owner's English ↔ Spanish word list. It builds the Spanish name of an item from its English description so the
   online store can show it to Spanish-speaking visitors. It knows a little Spanish grammar: the thing comes first and what describes it
   follows ("blue dress" → "vestido azul"), colours agree with the thing ("red dresses" → "vestidos rojos"), materials become "de lino",
   and phrases like "long sleeve" become "de manga larga". Pure rules, tested in Node. Nothing here touches costs or profit. */
(function (root) {
  const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[“”"'’]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const clean = (tok) => tok.replace(/^[^\p{L}\p{N}&]+|[^\p{L}\p{N}&]+$/gu, '');
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  // ---- the starter list ----------------------------------------------------------------------------------------------------------
  // t: n thing (g = m/f, pl = always plural), a describing word (inv 'all' = never changes), m material ("de lino"), p phrase that goes
  // after the thing ("de manga larga"), c connector ("y"), l literal (sizes, codes), x plain (stays where it is typed).
  const N = (c, rows) => rows.map(([en, es, g, pl, pe]) => Object.assign({ en, es, c, t: 'n', g }, pl ? { pl: true } : {}, pe ? { pe } : {}));
  const A = (c, rows) => rows.map(([en, es, inv]) => (inv ? { en, es, c, t: 'a', inv } : { en, es, c, t: 'a' }));
  const T = (t) => (c, rows) => rows.map(([en, es]) => ({ en, es, c, t }));
  const M = T('m'), P = T('p'), C = T('c'), L = T('l'), X = T('x');
  const STARTER = [].concat(
    N('clothes', [['top', 'blusa', 'f'], ['blouse', 'blusa', 'f'], ['shirt', 'camisa', 'f'], ['t-shirt', 'camiseta', 'f'], ['tee', 'camiseta', 'f'], ['tank top', 'camiseta sin mangas', 'f'], ['crop top', 'crop top', 'm', 0, 'crop tops'],
      ['bodysuit', 'body', 'm', 0, 'bodys'], ['sweater', 'suéter', 'm'], ['sweatshirt', 'sudadera', 'f'], ['hoodie', 'sudadera con capucha', 'f'], ['cardigan', 'cárdigan', 'm', 0, 'cárdigans'], ['jacket', 'chaqueta', 'f'], ['blazer', 'blazer', 'm', 0, 'blazers'],
      ['coat', 'abrigo', 'm'], ['vest', 'chaleco', 'm'], ['dress', 'vestido', 'm'], ['gown', 'vestido', 'm'], ['maxi dress', 'vestido largo', 'm'], ['mini dress', 'vestido corto', 'm'], ['midi dress', 'vestido midi', 'm'],
      ['wrap dress', 'vestido cruzado', 'm'], ['bodycon dress', 'vestido ajustado', 'm'], ['skirt', 'falda', 'f'], ['pants', 'pantalones', 'm', 1], ['trousers', 'pantalones', 'm', 1], ['jeans', 'jeans', 'm', 1],
      ['leggings', 'leggings', 'f', 1], ['shorts', 'shorts', 'm', 1], ['joggers', 'pantalones deportivos', 'm', 1], ['jumpsuit', 'enterizo', 'm'], ['romper', 'mono', 'm'], ['overalls', 'overol', 'm'],
      ['set', 'conjunto', 'm'], ['tracksuit', 'conjunto deportivo', 'm'], ['pajamas', 'pijama', 'm'], ['robe', 'bata', 'f'], ['swimsuit', 'traje de baño', 'm'], ['bikini', 'bikini', 'm'], ['lingerie', 'lencería', 'f'],
      ['bra', 'sostén', 'm'], ['underwear', 'ropa interior', 'f'], ['socks', 'calcetines', 'm', 1], ['tights', 'medias', 'f', 1], ['scarf', 'bufanda', 'f'], ['hat', 'sombrero', 'm'], ['cap', 'gorra', 'f'], ['belt', 'cinturón', 'm'], ['gloves', 'guantes', 'm', 1]]),
    N('shoes', [['shoes', 'zapatos', 'm', 1], ['sandals', 'sandalias', 'f', 1], ['sneakers', 'tenis', 'm', 1], ['boots', 'botas', 'f', 1], ['heels', 'tacones', 'm', 1], ['flats', 'zapatos planos', 'm', 1], ['slippers', 'pantuflas', 'f', 1],
      ['slides', 'chancletas', 'f', 1], ['bag', 'cartera', 'f'], ['handbag', 'cartera', 'f'], ['purse', 'cartera', 'f'], ['backpack', 'mochila', 'f'], ['wallet', 'billetera', 'f'], ['clutch', 'clutch', 'm', 0, 'clutches'], ['tote bag', 'bolso tote', 'm'],
      ['sunglasses', 'lentes de sol', 'm', 1], ['watch', 'reloj', 'm'], ['ring', 'anillo', 'm'], ['necklace', 'collar', 'm'], ['earrings', 'aretes', 'm', 1], ['bracelet', 'pulsera', 'f'], ['anklet', 'tobillera', 'f'], ['perfume', 'perfume', 'm']]),
    A('colours', [['black', 'negro'], ['white', 'blanco'], ['red', 'rojo'], ['blue', 'azul'], ['green', 'verde'], ['yellow', 'amarillo'], ['orange', 'anaranjado'], ['purple', 'morado'], ['pink', 'rosado'], ['brown', 'marrón'],
      ['grey', 'gris'], ['gray', 'gris'], ['beige', 'beige'], ['gold', 'dorado'], ['silver', 'plateado'], ['sky blue', 'celeste'], ['baby blue', 'celeste'], ['cream', 'crema', 'all'], ['ivory', 'marfil', 'all'],
      ['navy', 'azul marino', 'all'], ['navy blue', 'azul marino', 'all'], ['light blue', 'azul claro', 'all'], ['dark blue', 'azul oscuro', 'all'], ['royal blue', 'azul rey', 'all'], ['light pink', 'rosado claro', 'all'],
      ['hot pink', 'fucsia', 'all'], ['fuchsia', 'fucsia', 'all'], ['magenta', 'magenta', 'all'], ['light green', 'verde claro', 'all'], ['dark green', 'verde oscuro', 'all'], ['olive', 'verde oliva', 'all'], ['olive green', 'verde oliva', 'all'], ['army green', 'verde militar', 'all'], ['forest green', 'verde bosque', 'all'], ['emerald', 'esmeralda', 'all'], ['lime', 'lima', 'all'], ['sage', 'verde salvia', 'all'], ['mint', 'menta', 'all'],
      ['teal', 'verde azulado', 'all'], ['turquoise', 'turquesa', 'all'], ['aqua', 'aqua', 'all'], ['lavender', 'lavanda', 'all'], ['lilac', 'lila', 'all'], ['coral', 'coral', 'all'], ['peach', 'durazno', 'all'], ['salmon', 'salmón', 'all'],
      ['burgundy', 'vinotinto', 'all'], ['maroon', 'vinotinto', 'all'], ['wine', 'vino', 'all'], ['mustard', 'mostaza', 'all'], ['khaki', 'caqui', 'all'], ['tan', 'beige', 'all'], ['nude', 'nude', 'all'], ['champagne', 'champán', 'all'],
      ['rose gold', 'oro rosado', 'all'], ['copper', 'cobre', 'all'], ['bronze', 'bronce', 'all'], ['charcoal', 'gris oscuro', 'all'], ['off white', 'blanco hueso', 'all'], ['rust', 'óxido', 'all'], ['neon', 'neón', 'all'],
      ['multicolor', 'multicolor'], ['colorful', 'colorido'], ['transparent', 'transparente'], ['clear', 'transparente']]),
    A('styles', [['floral', 'floral'], ['striped', 'rayado'], ['printed', 'estampado'], ['solid', 'liso'], ['plain', 'liso'], ['embroidered', 'bordado'], ['pleated', 'plisado'], ['ribbed', 'acanalado'], ['halter', 'halter', 'all'],
      ['slim fit', 'ajustado'], ['fitted', 'ajustado'], ['oversized', 'oversize', 'all'], ['loose', 'holgado'], ['stretch', 'elástico'], ['cropped', 'corto'], ['maxi', 'largo'], ['midi', 'midi', 'all'], ['mini', 'mini', 'all'],
      ['long', 'largo'], ['short', 'corto'], ['casual', 'casual'], ['elegant', 'elegante'], ['formal', 'formal'], ['sexy', 'sexy', 'all'], ['cute', 'bonito'], ['sporty', 'deportivo'], ['vintage', 'vintage', 'all'], ['boho', 'boho', 'all'],
      ['tropical', 'tropical'], ['new', 'nuevo'], ['unisex', 'unisex', 'all'], ['small', 'pequeño'], ['medium', 'mediano'], ['large', 'grande'], ['extra large', 'extra grande']]),
    P('styles', [['long sleeve', 'de manga larga'], ['short sleeve', 'de manga corta'], ['sleeveless', 'sin mangas'], ['off shoulder', 'con hombros descubiertos'], ['one shoulder', 'de un hombro'], ['strapless', 'sin tirantes'],
      ['v neck', 'de cuello en V'], ['high waist', 'de tiro alto'], ['low waist', 'de tiro bajo'], ['wide leg', 'de pierna ancha'], ['straight leg', 'de pierna recta'], ['polka dot', 'de lunares'], ['plaid', 'de cuadros'],
      ['checkered', 'de cuadros'], ['ruffle', 'con volantes'], ['ruffled', 'con volantes'], ['sequin', 'con lentejuelas'], ['sequined', 'con lentejuelas'], ['backless', 'con espalda descubierta'], ['lace up', 'con cordones'],
      ['button', 'con botones'], ['pockets', 'con bolsillos'], ['pocket', 'con bolsillo'], ['hooded', 'con capucha'], ['zip', 'con cierre'], ['plus size', 'talla grande'], ['one size', 'talla única'], ['free size', 'talla única'],
      ['for women', 'para mujer'], ['for men', 'para hombre'], ['for kids', 'para niños'], ['for girls', 'para niña'], ['for boys', 'para niño'], ['for baby', 'para bebé'], ['women', 'de mujer'], ['womens', 'de mujer'], ['mens', 'de hombre'], ['men', 'de hombre'], ['kids', 'para niños'], ['girls', 'para niña'], ['boys', 'para niño'], ['baby', 'para bebé']]),
    M('materials', [['cotton', 'algodón'], ['linen', 'lino'], ['silk', 'seda'], ['satin', 'satén'], ['velvet', 'terciopelo'], ['denim', 'jean'], ['leather', 'cuero'], ['faux leather', 'cuero sintético'], ['suede', 'gamuza'],
      ['wool', 'lana'], ['knit', 'punto'], ['crochet', 'crochet'], ['lace', 'encaje'], ['chiffon', 'gasa'], ['tulle', 'tul'], ['mesh', 'malla'], ['fleece', 'polar'], ['corduroy', 'pana'], ['nylon', 'nailon'],
      ['polyester', 'poliéster'], ['spandex', 'licra'], ['straw', 'paja'], ['canvas', 'lona'], ['metal', 'metal'], ['plastic', 'plástico'], ['wood', 'madera'], ['cotton blend', 'mezcla de algodón']]),
    C('more', [['and', 'y'], ['&', 'y'], ['with', 'con'], ['for', 'para'], ['in', 'en'], ['or', 'o'], ['of', 'de'], ['without', 'sin']]),
    L('more', [['xs', 'XS'], ['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL'], ['xxl', 'XXL'], ['3xl', '3XL']]),
    X('more', [['size', 'talla']])
  );

  // ---- the Spanish grammar bits --------------------------------------------------------------------------------------------------
  const NUM = { two: 'dos', three: 'tres', four: 'cuatro', five: 'cinco', six: 'seis' };
  const NOACC = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
  const pluralWord = (w) => { if (!w) return w; if (/[áéíóú]n$/.test(w)) return w.slice(0, -2) + NOACC[w.charAt(w.length - 2)] + 'nes'; if (/z$/.test(w)) return w.slice(0, -1) + 'ces'; if (/[aeiouáéíóú]$/.test(w)) return w + 's'; return w + 'es'; };
  const pluralPhrase = (p) => { const a = String(p).split(' '); a[0] = pluralWord(a[0]); return a.join(' '); };
  const agree = (adj, g, pl) => {
    if (adj.inv === 'all') return adj.es;
    const a = String(adj.es).split(' '); let h = a[0];
    if (g === 'f' && /o$/.test(h)) h = h.slice(0, -1) + 'a';
    if (pl) h = pluralWord(h);
    a[0] = h; return a.join(' ');
  };

  // ---- reading the list --------------------------------------------------------------------------------------------------------
  const cache = new WeakMap();
  const index = (words) => {
    const arr = words || []; if (cache.has(arr)) return cache.get(arr);
    const m = new Map(); let max = 1;
    arr.forEach((w) => { const k = norm(w.en); if (!k || !String(w.es || '').trim()) return; m.set(k, w); max = Math.max(max, k.split(' ').length); });
    const r = { m, max }; cache.set(arr, r); return r;
  };
  const kindOf = (w) => w.t || 'x';

  // English words → pieces: matched words (longest phrase first), plural things, literals, unknown words.
  const pieces = (desc, words) => {
    const toks = String(desc || '').replace(/(\p{L})\s?\/\s?(\p{L})/gu, '$1 and $2').trim().split(/\s+/).filter(Boolean), { m, max } = index(words), out = [], missing = [];
    const tailOf = (tk) => (tk.match(/[^\p{L}\p{N}&]+$/u) || [''])[0];
    for (let i = 0; i < toks.length;) {
      const c0 = norm(clean(toks[i])), c1 = i + 1 < toks.length ? norm(clean(toks[i + 1])) : '';
      // "2 piece", "two piece", "2pc"
      let mm = c0.match(/^(\d+|two|three|four|five|six)\s?(pcs?|pieces?)$/);
      if (mm) { const n = NUM[mm[1]] || mm[1]; out.push({ k: 'p', w: { es: 'de ' + n + ' piezas' }, tail: tailOf(toks[i]) }); i++; continue; }
      mm = c0.match(/^(\d+|two|three|four|five|six)$/);
      if (mm && /^(pcs?|pieces?)$/.test(c1)) { out.push({ k: 'p', w: { es: 'de ' + (NUM[mm[1]] || mm[1]) + ' piezas' }, tail: tailOf(toks[i + 1]) }); i += 2; continue; }
      let hit = false;
      for (let n = Math.min(max, toks.length - i); n >= 1 && !hit; n--) {
        const words2 = toks.slice(i, i + n).map(clean), phrase = norm(words2.join(' ')), w = phrase && m.get(phrase), tl = tailOf(toks[i + n - 1]);
        if (w) { out.push({ k: kindOf(w), w, tail: tl }); i += n; hit = true; continue; }
        const last = norm(words2[n - 1]);   // a plural thing ("dresses", "crop tops"): look for the single one
        if (last.length > 2 && /s$/.test(last)) for (const sg of [last.slice(0, -1), last.slice(0, -2), last.slice(0, -3) + 'y']) {
          const w2 = m.get(norm(words2.slice(0, n - 1).concat(sg).join(' ')));
          if (w2 && w2.t === 'n' && !w2.pl) { out.push({ k: 'n', w: w2, plural: true, tail: tl }); i += n; hit = true; break; }
        }
      }
      if (hit) continue;
      const raw = toks[i], c = c0;
      if (!c || !/\p{L}/u.test(c) || /\d/.test(c)) { out.push({ k: 'l', raw: clean(raw) || raw, tail: tailOf(raw) }); i++; continue; }
      if (!missing.includes(c)) missing.push(c);
      out.push({ k: 'u', raw: clean(raw), tail: tailOf(raw) }); i++;
    }
    return { out, missing };
  };

  // The thing first, then "de <material>", phrases like "de manga larga", then what describes it (agreeing), then anything unknown.
  const renderNP = (noun, mods) => {
    const g = noun ? noun.w.g || 'm' : 'm', pl = noun ? !!(noun.w.pl || noun.plural) : false;
    const head = noun ? (noun.plural && !noun.w.pl ? (noun.w.pe || pluralPhrase(noun.w.es)) : noun.w.es) : '';
    const groups = { m: [], p: [], a: [], ac: [], r: [] }; let join = null;
    mods.forEach((x) => {
      if (x.k === 'conn') { join = x.es; return; }
      const g2 = x.k === 'a' ? (x.w.c === 'colours' ? 'ac' : 'a') : x.k === 'm' || x.k === 'p' ? x.k : 'r';   // colours come last ("falda mini roja")
      const text = x.k === 'a' ? agree(x.w, g, pl) : x.k === 'm' || x.k === 'p' ? x.w.es : x.raw;
      groups[g2].push({ text, join }); join = null;
    });
    const seq = (list, first) => list.map((e, i) => (i === 0 ? (first || '') + e.text : e.join === ',' ? ', ' + e.text : (e.join ? ' ' + e.join + ' ' : ' ') + e.text)).join('');
    const matStr = groups.m.length ? seq(groups.m, head ? 'de ' : '') : '';
    return [head, matStr, seq(groups.p), seq(groups.a), seq(groups.ac), seq(groups.r)].filter(Boolean).join(' ');
  };

  const translate = (desc, words) => {
    const { out, missing } = pieces(desc, words), parts = []; let mods = [], noun = null, tail = '';
    const flush = () => { if (!noun && !mods.length) return; parts.push(renderNP(noun, mods) + tail); mods = []; noun = null; tail = ''; };
    const isMod = (k) => k === 'a' || k === 'm';
    out.forEach((it, j) => {
      if (it.k === 'n') {
        if (noun) mods.push({ k: 'm', x: 1, es: noun.w.es, w: { es: noun.w.es } });   // "pants set": the first thing describes the second ("conjunto de pantalones")
        noun = it; tail = it.tail;
      } else if (it.k === 'a' || it.k === 'm' || it.k === 'p' || it.k === 'u' || it.k === 'l') {
        mods.push(it.k === 'u' || it.k === 'l' ? { k: 'u', raw: it.raw !== undefined ? it.raw : it.w.es } : it); tail = it.tail;
        const nx = out[j + 1]; if (isMod(it.k) && /,/.test(it.tail || '') && nx && nx.k === it.k) { mods.push({ k: 'conn', es: ',' }); tail = ''; }
      } else if (it.k === 'c') {
        const prev = out[j - 1], next = out[j + 1];
        if (prev && next && isMod(prev.k) && prev.k === next.k && (it.w.es === 'y' || it.w.es === 'o')) mods.push({ k: 'conn', es: it.w.es });
        else { flush(); parts.push(it.w.es + it.tail); }
      } else { flush(); parts.push(it.w.es + it.tail); }
    });
    flush();
    return { es: cap(parts.join(' ').replace(/\s+([,;.])/g, '$1')), missing };
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

  // ---- editing the list -----------------------------------------------------------------------------------------------------------
  // The kinds of word the owner can choose (code → fields).
  const TYPES = { nm: { t: 'n', g: 'm' }, nf: { t: 'n', g: 'f' }, npm: { t: 'n', g: 'm', pl: true }, npf: { t: 'n', g: 'f', pl: true }, a: { t: 'a' }, ai: { t: 'a', inv: 'all' }, m: { t: 'm' }, p: { t: 'p' }, c: { t: 'c' }, x: { t: 'x' } };
  const typeOf = (w) => { const t = w.t || 'x'; if (t === 'n') return (w.pl ? 'np' : 'n') + (w.g === 'f' ? 'f' : 'm'); if (t === 'a') return w.inv === 'all' ? 'ai' : 'a'; return TYPES[t] ? t : 'x'; };
  const put = (words, en, es, c, type) => {
    const k = norm(en), v = String(es || '').trim(); if (!k || !v) return words;
    const i = words.findIndex((w) => norm(w.en) === k), old = i >= 0 ? words[i] : null;
    const rec = Object.assign({ en: String(en).trim().toLowerCase(), es: v, c: c !== undefined ? c : (old ? old.c : '') }, type && TYPES[type] ? TYPES[type] : (old && old.t ? { t: old.t, g: old.g, pl: old.pl, inv: old.inv } : { t: 'a' }));
    Object.keys(rec).forEach((key) => { if (rec[key] === undefined) delete rec[key]; });
    return i >= 0 ? words.map((w, j) => (j === i ? rec : w)) : words.concat(rec);
  };
  const drop = (words, en) => words.filter((w) => norm(w.en) !== norm(en));
  // The starter list: adds what is missing, and teaches older entries how they behave (thing / describing word …) without changing the
  // owner's Spanish or the groups they put words in.
  const seed = (words) => {
    const out = (words || []).map((w) => Object.assign({}, w));
    STARTER.forEach((s) => {
      const i = out.findIndex((x) => norm(x.en) === norm(s.en));
      if (i < 0) { out.push(Object.assign({}, s)); return; }
      const w = out[i];
      if (!w.t) { ['t', 'g', 'pl', 'inv', 'pe'].forEach((k) => { if (s[k] !== undefined) w[k] = s[k]; }); }
      if (w.c && w.c !== s.c && ['clothes', 'colours', 'sizes', 'more'].includes(w.c)) w.c = s.c;
    });
    return out;
  };

  const api = { norm, STARTER, TYPES, typeOf, translate, spanish, publishable, put, drop, seed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Words = api;
})(typeof window !== 'undefined' ? window : globalThis);

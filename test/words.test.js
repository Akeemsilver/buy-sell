const assert = require('assert');
const W = require('../js/words.js');
const words = W.seed([]);
assert.ok(words.length >= 600, 'the starter list is big: ' + words.length);
assert.ok(words.filter((w) => w.c === 'colours').length >= 60, 'standard colour names are all there');

// The "training": English descriptions and what the store should say in Spanish.
const CASES = [
  // one thing and a colour: the colour follows and agrees
  ['Blue dress', 'Vestido azul'], ['Red dress', 'Vestido rojo'], ['Black top', 'Blusa negra'], ['White skirt', 'Falda blanca'], ['Green pants', 'Pantalones verdes'], ['Blue jeans', 'Jeans azules'],
  ['Yellow blouse', 'Blusa amarilla'], ['Pink shirt', 'Camisa rosada'], ['Purple dress', 'Vestido morado'], ['Orange top', 'Blusa anaranjada'], ['Brown boots', 'Botas marrones'], ['Gray sweater', 'Suéter gris'],
  ['Grey sweaters', 'Suéteres grises'], ['Gold sandals', 'Sandalias doradas'], ['Silver earrings', 'Aretes plateados'], ['Beige hoodie', 'Sudadera con capucha beige'], ['Cream skirt', 'Falda crema'],
  // plurals
  ['Black dresses', 'Vestidos negros'], ['Red tops', 'Blusas rojas'], ['White shirts', 'Camisas blancas'], ['Black crop tops', 'Crop tops negros'], ['Tank tops', 'Camisetas sin mangas'], ['Brown cardigans', 'Cárdigans marrones'],
  // colours that never change
  ['Navy blue dress', 'Vestido azul marino'], ['Navy dresses', 'Vestidos azul marino'], ['Light blue shirt', 'Camisa azul claro'], ['Mustard top', 'Blusa mostaza'], ['Mustard dresses', 'Vestidos mostaza'],
  ['Burgundy set', 'Conjunto vinotinto'], ['Hot pink dress', 'Vestido fucsia'], ['Teal top', 'Blusa verde azulado'], ['Lilac skirts', 'Faldas lila'], ['Olive green pants', 'Pantalones verde oliva'], ['Sky blue top', 'Blusa celeste'], ['Sky blue tops', 'Blusas celestes'],
  // materials become "de ..."
  ['Blue linen set', 'Conjunto de lino azul'], ['Red velvet dress', 'Vestido de terciopelo rojo'], ['Cotton shirt', 'Camisa de algodón'], ['White cotton t-shirt', 'Camiseta de algodón blanca'], ['Denim jacket', 'Chaqueta de jean'],
  ['Black leather bag', 'Cartera de cuero negra'], ['Straw hat', 'Sombrero de paja'], ['Burgundy velvet dresses', 'Vestidos de terciopelo vinotinto'],
  // styles and phrases that go after the thing
  ['Black lace long sleeve top', 'Blusa de encaje de manga larga negra'], ['Sleeveless dress', 'Vestido sin mangas'], ['Off shoulder top', 'Blusa con hombros descubiertos'], ['High waist jeans', 'Jeans de tiro alto'],
  ['Wide leg pants', 'Pantalones de pierna ancha'], ['Yellow floral dress', 'Vestido floral amarillo'], ['Floral maxi dress', 'Vestido largo floral'], ['Red mini skirt', 'Falda mini roja'], ['Maxi skirt', 'Falda larga'],
  ['Black bodycon dress', 'Vestido ajustado negro'], ['Black and white striped dress', 'Vestido rayado negro y blanco'], ['Black and white sneakers', 'Tenis negros y blancos'], ['Plus size dress', 'Vestido talla grande'],
  // sets and counts
  ['Two piece set', 'Conjunto de dos piezas'], ['2 piece set', 'Conjunto de 2 piezas'], ['Black 2pc set', 'Conjunto de 2 piezas negro'], ['Two-piece swimsuit', 'Traje de baño de dos piezas'], ['Pants set', 'Conjunto de pantalones'], ['Bikini set', 'Conjunto de bikini'],
  // more than one thing
  ['Top and pants', 'Blusa y pantalones'], ['Red top and pants', 'Blusa roja y pantalones'], ['Pink top and black pants', 'Blusa rosada y pantalones negros'], ['TOP & PANTS', 'Blusa y pantalones'],
  // who it is for, with and sizes
  ['Women\'s swimsuit', 'Traje de baño de mujer'], ['Kids dress', 'Vestido para niños'], ['Dress for women', 'Vestido para mujer'], ['Blue dress with lace', 'Vestido azul con encaje'],
  ['Blue top size M', 'Blusa azul talla M'], ['Top, size M', 'Blusa, talla M'], ['Blue linen set, size M', 'Conjunto de lino azul, talla M'], ['Black dress XL', 'Vestido negro XL'], ['Sneakers', 'Tenis'], ['Summer elegant blue and white striped deep V-neck top', 'Blusa de verano de cuello en V profundo elegante rayada azul y blanca'], ['Blue and white stripe deep V-neck top', 'Blusa de cuello en V profundo rayada azul y blanca'], ['Lantern sleeve blouse', 'Blusa de manga farol'], ['Women autumn lantern sleeve shirt', 'Camisa de mujer de otoño de manga farol'], ['Floral print blouse', 'Blusa con estampado floral'], ['Elegant blue and white striped top', 'Blusa elegante rayada azul y blanca'], ['Black maxi dresses', 'Vestidos largos negros'], ['Cocktail dress', 'Vestido de coctel'], ['Crossbody bag', 'Bolso cruzado'], ['Gold hoops', 'Aros dorados'], ['Pair of shoes', 'Par de zapatos'], ['Pack of 3 socks', 'Paquete de 3 calcetines'], ['Red puff sleeve top', 'Blusa de manga abullonada roja'], ['Wide leg cargo pants', 'Pantalones cargo de pierna ancha'], ['Satin bonnet', 'Gorro de satén'], ['Twelve black tops', 'Doce blusas negras'], ['Black wedding dress', 'Vestido de novia negro'], ['Maternity dress', 'Vestido de maternidad'], ['Cotton tracksuit', 'Conjunto deportivo de algodón'], ['Ripped skinny jeans', 'Jeans rasgados skinny'], ['Black tracksuits', 'Conjuntos deportivos negros'], ['Two long track pants', 'Dos pantalones deportivos largos'], ['2 long track pants', '2 pantalones deportivos largos'], ['Long track pants', 'Pantalones deportivos largos'], ['3 red dresses', '3 vestidos rojos'], ['One red dress', 'Un vestido rojo'], ['One blue top', 'Una blusa azul'], ['Two black tops', 'Dos blusas negras'], ['Size 10', 'Talla 10'], ['Dress size 10', 'Vestido talla 10'], ['Black dress 2023', 'Vestido negro 2023'], ['Red and blue jacket', 'Chaqueta roja y azul'], ['Red and blue jackets', 'Chaquetas rojas y azules'], ['Red, white and blue dress', 'Vestido rojo, blanco y azul'], ['Red/blue jacket', 'Chaqueta roja y azul'], ['Black & white top', 'Blusa negra y blanca'], ['Red or blue shirt', 'Camisa roja o azul'], ['Cotton, linen and silk shirt', 'Camisa de algodón, lino y seda'], ['Red top and blue pants', 'Blusa roja y pantalones azules'], ['Blue short pants', 'Pantalones cortos azules'], ['Short pants', 'Pantalones cortos'], ['Red top', 'Blusa roja'], ['Long sleeve shirt', 'Camisa de manga larga'], ['Long sleeve jacket', 'Chaqueta de manga larga'], ['Short sleeve shirt', 'Camisa de manga corta'], ['Floral dress, blue', 'Vestido floral azul']
];
CASES.forEach(([en, es]) => { const got = W.translate(en, words); assert.deepStrictEqual([en, got.es, got.missing], [en, es, []], en + ' → ' + got.es + ' (expected ' + es + ', missing ' + got.missing + ')'); });

// unknown words stay as typed, after the thing, and are listed
let t = W.translate('Zara dress', words); assert.strictEqual(t.es, 'Vestido Zara'); assert.deepStrictEqual(t.missing, ['zara']);
t = W.translate('Red Zara dress', words); assert.strictEqual(t.es, 'Vestido rojo Zara'); assert.deepStrictEqual(t.missing, ['zara']);
// codes and numbers are not "missing"
t = W.translate('Black dress 2023', words); assert.deepStrictEqual(t.missing, []);

// phrases of the owner win, and the owner's own words follow the same rules
const w2 = W.put(words, 'blue dress', 'vestido azul turquí', '', 'x');
assert.strictEqual(W.translate('Blue dress', w2).es, 'Vestido azul turquí', 'a whole phrase from the owner wins');
const w3 = W.put(words, 'tutu', 'tutú', '', 'nm'); assert.strictEqual(W.translate('Pink tutu', w3).es, 'Tutú rosado');
const w4 = W.put(words, 'sparkly', 'brillante', '', 'a'); assert.strictEqual(W.translate('Sparkly dresses', w4).es, 'Vestidos brillantes');
const w5 = W.put(words, 'organza', 'organza', '', 'm'); assert.strictEqual(W.translate('Blue organza dress', w5).es, 'Vestido de organza azul');
const w6 = W.put(words, 'gift card', 'tarjeta de regalo', '', 'nf'); assert.strictEqual(W.translate('Gift cards', w6).es, 'Tarjetas de regalo');

// status, confirmed names, publishing
assert.strictEqual(W.spanish({ desc: 'Top and pants' }, words).state, 'ok'); assert.strictEqual(W.publishable({ desc: 'Top and pants' }, words), 'Blusa y pantalones');
assert.strictEqual(W.spanish({ desc: 'Red Zara dress' }, words).state, 'check'); assert.strictEqual(W.publishable({ desc: 'Red Zara dress' }, words), '', 'not published while a word is missing');
assert.strictEqual(W.spanish({ desc: '' }, words).state, 'none');
const own = { desc: 'Red Zara dress', nameEs: 'Vestido rojo Zara', esSet: true, esFor: 'Red Zara dress' };
assert.strictEqual(W.spanish(own, words).state, 'ok'); assert.strictEqual(W.publishable(own, words), 'Vestido rojo Zara', 'a confirmed name is published');
own.desc = 'Red Zara gown'; assert.strictEqual(W.spanish(own, words).state, 'check', 'a confirmed name goes stale when the description changes');
assert.strictEqual(W.spanish({ desc: 'Red Zara dress' }, W.put(words, 'zara', 'Zara', '', 'x')).state, 'ok', 'adding the missing word fixes it');

// editing the list
assert.strictEqual(W.drop(W.put(words, 'zzword', 'zzpalabra', '', 'nm'), 'ZZWord').length, words.length, 'delete a word');
assert.strictEqual(W.seed(words).length, words.length, 'seeding twice adds nothing');
assert.strictEqual(W.seed([{ en: 'top', es: 'polera', c: 'clothes' }]).find((x) => x.en === 'top').es, 'polera', 'the owner\'s own Spanish is never overwritten');
const old = W.seed([{ en: 'dress', es: 'vestido', c: 'clothes' }, { en: 'blue', es: 'azul', c: 'colours' }]).filter((x) => ['dress', 'blue'].includes(x.en));
assert.ok(old.every((x) => x.t), 'older entries learn how they behave (thing / describing word)');
assert.strictEqual(W.typeOf({ t: 'n', g: 'f', pl: true }), 'npf'); assert.strictEqual(W.typeOf({ t: 'a', inv: 'all' }), 'ai'); assert.strictEqual(W.typeOf({}), 'x');
const older = W.seed(words.filter((w) => !['cocktail dress', 'crossbody bag'].includes(w.en)).map((w) => { const c = Object.assign({}, w); delete c.pe; return c; }));
assert.ok(older.some((w) => w.en === 'cocktail dress') && older.find((w) => w.en === 'maxi dress').pe === 'vestidos largos', 'an older library gets the new words and plurals');
console.log('words tests passed: ' + CASES.length + ' example names');

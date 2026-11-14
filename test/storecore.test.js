const assert = require('assert');
const L = require('../js/logic.js'), SC = require('../js/storecore.js');
const s = L.defaultState();
L.createBatch(s, { store: 'X', count: 4, currency: 'USD', totalCost: 80, margin: 100 });
L.createBatch(s, { store: 'Y', count: 2, currency: 'USD', totalCost: 40, margin: 100 });
s.items.forEach((x, n) => { x.desc = n === 3 ? '' : 'Item ' + n; x.cost = 20; x.price = 250; x.status = 'Available'; });
s.items[1].saleOn = true; s.items[1].discount = 20; s.items[2].status = 'Paid'; s.items[4].status = 'In Transit'; s.items[5].price = 0;
const b1 = s.batches[0].id, b2 = s.batches[1].id;
let list = SC.shown(s, { batches: [b1] });
assert.deepStrictEqual(list.map((x) => x.id), [s.items[0].id, s.items[1].id], 'only Available items with a name, from the chosen batch (sold, unnamed ones are left out)');
assert.strictEqual(list[1].sale, 200); assert.strictEqual(list[1].pct, 20); assert.strictEqual(SC.payPrice(list[1]), 200);
assert.deepStrictEqual(Object.keys(list[0]).sort(), ['details', 'detailsEs', 'id', 'name', 'nameEs', 'pct', 'photo', 'price', 'sale', 'sizes', 'transit'], 'only public fields: never cost, landed cost or profit');
assert.ok(!JSON.stringify(list).includes('cost'));
{ const s2 = JSON.parse(JSON.stringify(s)); s2.settings.words = require('../js/words.js').seed([]); s2.items[0].desc = 'Top and pants'; assert.strictEqual(SC.shown(s2, { batches: [b1] })[0].nameEs, 'Blusa y pantalones', 'the Spanish name is published when it is in order'); s2.items[0].desc = 'Red Zara dress'; assert.strictEqual(SC.shown(s2, { batches: [b1] })[0].nameEs, '', 'and left out while a word is missing'); }
assert.strictEqual(SC.shown(s, { batches: [b1, b2] }).length, 2, 'in-transit items stay hidden unless switched on (the other batch has no priced available item)');
list = SC.shown(s, { batches: [b1, b2], inTransit: true }); assert.ok(list.some((x) => x.id === s.items[4].id && x.transit), 'in-transit items appear, marked');
assert.strictEqual(SC.shown(s, { batches: [] }).length, 0, 'no batch chosen = nothing shown');
// store pictures in cloud storage: deleted only when the item is gone, or sold and the hold time has passed
{ const st = L.defaultState(); L.createBatch(st, { store: 'X', count: 3, currency: 'USD', totalCost: 30, margin: 100 });
  const [a, b2_, c] = st.items; a.status = 'Available'; b2_.status = 'Paid'; b2_.invoice = 'INV1'; c.status = 'Paid'; c.invoice = 'INV2';
  const now = Date.now(); st.invoices.push({ no: 'INV1', date: new Date(now - 3 * 86400000).toISOString() }, { no: 'INV2', date: new Date(now - 9 * 86400000).toISOString() });
  assert.deepStrictEqual(SC.stalePics(st, [a.id, b2_.id, c.id, 'ghost'], now).sort(), [c.id, 'ghost'].sort(), 'available and recently sold pictures stay; old sales and removed items go'); }
// identical items are one card, with the sizes that are still available
{ const g = L.defaultState(); L.createBatch(g, { store: 'X', count: 7, currency: 'USD', totalCost: 70, margin: 100 });
  const sz = ['S', 'M', 'M', 'L', '', 'M', ''];
  g.items.forEach((x, n) => { x.desc = n < 4 ? 'Blue dress' : n === 4 ? 'blue  DRESS' : 'Red top'; x.price = n < 5 ? 198 : 120; x.size = sz[n]; x.status = 'Available'; });
  g.items[5].desc = 'Red top'; g.items[6].desc = 'Red top'; g.items[6].price = 120; g.items[4].price = 250;
  const bb = g.batches[0].id, cards = SC.shown(g, { batches: [bb] });
  assert.strictEqual(cards.length, 3, 'blue dress 198 (4 items), blue dress 250 (a different price), red top 120');
  const blue = cards.find((c) => c.price === 198); assert.deepStrictEqual(blue.sizes.map((x) => x.s + ':' + x.ids.length), ['S:1', 'M:2', 'L:1'], 'sizes in order with the items behind each');
  const red = cards.find((c) => c.name === 'Red top'); assert.deepStrictEqual(red.sizes.map((x) => x.s + ':' + x.ids.length), ['M:1', ':1'], 'an item with no size is listed last');
  g.items[1].status = 'Paid'; g.items[2].status = 'Paid';
  assert.deepStrictEqual(SC.shown(g, { batches: [bb] }).find((c) => c.price === 198).sizes.map((x) => x.s), ['S', 'L'], 'when both mediums are sold the store shows only S and L');
  g.items[0].status = 'Paid'; g.items[3].status = 'Paid'; assert.ok(!SC.shown(g, { batches: [bb] }).some((c) => c.price === 198), 'when all are sold the card is gone');
  assert.deepStrictEqual(['XL', '38', 'S', 'One size', 'M', '10', 'XXL', ''].sort(SC.cmpSize), ['S', 'M', 'XL', 'XXL', '10', '38', 'One size', ''], 'size order'); }
// chunks and hash
assert.deepStrictEqual(SC.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]); assert.strictEqual(SC.hash({ a: 1 }), SC.hash({ a: 1 })); assert.notStrictEqual(SC.hash({ a: 1 }), SC.hash({ a: 2 }));
// locations and totals
const cfg = SC.norm({ locations: [{ name: ' Chaguanas ', pickup: true, delivery: true, price: 25 }, { name: 'Couva', delivery: true, price: 30 }, { name: 'Nowhere' }, { name: '', pickup: true }] });
assert.deepStrictEqual(cfg.locations.map((l) => l.name), ['Chaguanas', 'Couva'], 'a location needs a name and at least one option');
const items = SC.shown(s, { batches: [b1] });
assert.deepStrictEqual(SC.totals(items, cfg.locations[0], 'delivery'), { sub: 450, delivery: 25, total: 475, valid: true });
assert.deepStrictEqual(SC.totals(items, cfg.locations[0], 'pickup'), { sub: 450, delivery: 0, total: 450, valid: true });
assert.strictEqual(SC.totals(items, cfg.locations[1], 'pickup').valid, false, 'pickup is not offered at Couva');
assert.strictEqual(SC.totals([], cfg.locations[0], 'pickup').valid, false);
// order checks
const ok = { name: 'Ari', phone: '868 555 0142', items: [{}], location: 'Chaguanas', option: 'delivery' };
assert.strictEqual(SC.checkOrder(ok), '');
assert.strictEqual(SC.checkOrder({ ...ok, name: ' ' }), 'name'); assert.strictEqual(SC.checkOrder({ ...ok, phone: '123' }), 'phone'); assert.strictEqual(SC.checkOrder({ ...ok, items: [] }), 'items'); assert.strictEqual(SC.checkOrder({ ...ok, option: 'x' }), 'location');
assert.strictEqual(SC.orderCode('ab3dk9xyz'), 'ORD-AB3DK'); assert.strictEqual(SC.newId(20).length, 20);
assert.strictEqual(SC.waLink('555 0142', 'Hi there'), 'https://wa.me/18685550142?text=Hi%20there'); assert.strictEqual(SC.waLink('868-555-0142'), 'https://wa.me/18685550142'); assert.strictEqual(SC.waLink('+44 20 7946 0958'), 'https://wa.me/442079460958');
console.log('store core tests passed');
// details (optional text shown on the item page): taken from the first piece that has some, trimmed and capped
{
  const s2 = L.defaultState(); L.createBatch(s2, { store: 'SHEIN', count: 3, currency: 'USD', totalCost: 30, margin: 100 });
  s2.items.forEach((x) => { Object.assign(x, { desc: 'Top', price: 50, status: 'Available' }); }); s2.items[1].details = '  Soft cotton  '; s2.items[1].detailsEs = 'Algodón suave'; s2.items[2].details = 'x'.repeat(900);
  const c = SC.shown(s2, { batches: [s2.batches[0].id] }); assert.strictEqual(c.length, 1); assert.strictEqual(c[0].details, 'Soft cotton'); assert.strictEqual(c[0].detailsEs, 'Algodón suave');
  assert.ok(!('cost' in c[0]), 'still no cost');
}
{
  const all = SC.shown(s, { batches: [b1] }).flatMap((g) => (g.sizes ? g.sizes.flatMap((z) => z.ids || []) : [g.id]));
  const held = all[0], kept = SC.shown(s, { batches: [b1] }, [held]);
  const ids = kept.flatMap((g) => (g.sizes ? g.sizes.flatMap((z) => z.ids || []) : [g.id]));
  assert.ok(!ids.includes(held), 'an item held by an unanswered order is not published');
  assert.strictEqual(ids.length, all.length - 1, 'only that item is held back');
}
console.log('details tests passed');

{ // delivery spot: pins, links, pasted links, map tiles
  const SC = require('../js/storecore.js');
  assert.deepStrictEqual(SC.geo(10.654912345, -61.501987654), { lat: 10.65491, lng: -61.50199 }); assert.strictEqual(SC.geo(0, 0), null); assert.strictEqual(SC.geo(95, 10), null); assert.strictEqual(SC.geo('x', 1), null);
  const ln = SC.mapLinks(10.6549, -61.5019); assert.strictEqual(ln.google, 'https://www.google.com/maps/dir/?api=1&destination=10.6549,-61.5019'); assert.strictEqual(ln.waze, 'https://waze.com/ul?ll=10.6549,-61.5019&navigate=yes');
  const g = { lat: 10.6549, lng: -61.5019 };
  assert.deepStrictEqual(SC.parseGeoLink('10.6549, -61.5019'), g); assert.deepStrictEqual(SC.parseGeoLink('10.6549 -61.5019'), g);
  assert.deepStrictEqual(SC.parseGeoLink('https://www.google.com/maps/place/Chaguanas/@10.6549,-61.5019,15z/data=!3m1'), g);
  assert.deepStrictEqual(SC.parseGeoLink('https://www.google.com/maps?q=10.6549,-61.5019'), g); assert.deepStrictEqual(SC.parseGeoLink('https://maps.google.com/?q=10.6549%2C-61.5019'), g);
  assert.deepStrictEqual(SC.parseGeoLink('https://www.google.com/maps/place/x/data=!4m2!3d10.6549!4d-61.5019'), g); assert.deepStrictEqual(SC.parseGeoLink('https://waze.com/ul?ll=10.6549,-61.5019&navigate=yes'), g);
  assert.strictEqual(SC.parseGeoLink('https://maps.app.goo.gl/AbCdEf123'), 'short', 'a shortened link cannot be opened by the page'); assert.strictEqual(SC.parseGeoLink('hello'), null); assert.strictEqual(SC.parseGeoLink(''), null);
  const tv = SC.tileView(10.6549, -61.5019, 16, 300, 200); assert.ok(tv.tiles.length >= 4 && tv.tiles.length <= 6); assert.ok(tv.tiles.every((t) => /^https:\/\/tile\.openstreetmap\.org\/16\/\d+\/\d+\.png$/.test(t.url)));
  assert.ok(tv.tiles.some((t) => t.left <= 150 && t.left + 256 >= 150 && t.top <= 100 && t.top + 256 >= 100), 'a tile covers the middle of the box, where the pin sits');
}
{ // one route through the pinned deliveries
  const SC = require('../js/storecore.js');
  assert.strictEqual(SC.routeLink([]), ''); assert.strictEqual(SC.routeLink([{ lat: 'x', lng: 1 }]), '');
  assert.strictEqual(SC.routeLink([{ lat: 10.6, lng: -61.4 }]), 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=10.6,-61.4');
  const r = SC.routeLink([{ lat: 10.6, lng: -61.4 }, { lat: 10.7, lng: -61.3 }, { lat: 10.8, lng: -61.2 }]); assert.ok(r.endsWith('destination=10.8,-61.2&waypoints=10.6%2C-61.4%7C10.7%2C-61.3'), r);
  const many = Array.from({ length: 14 }, (_, i) => ({ lat: 10 + i / 100, lng: -61 })); assert.strictEqual(decodeURIComponent(SC.routeLink(many).split('waypoints=')[1]).split('|').length, 9, 'ten stops at most: nine on the way plus the destination');
}
{ // delivery log: distances, rates, calendar, search
  const SC = require('../js/storecore.js');
  const d = SC.lineKm({ lat: 10.5, lng: -61.4 }, { lat: 10.6, lng: -61.4 }); assert.ok(d > 11 && d < 11.3, 'a tenth of a degree north is about 11 km: ' + d);
  assert.strictEqual(SC.rateFee({}, 7.4), null, 'no rate set yet'); assert.strictEqual(SC.rateFee({ base: 10, perKm: 3.5, freeKm: 2, round: 5 }, 7.4), 30); assert.strictEqual(SC.rateFee({ base: 10, perKm: 3.5, freeKm: 2, round: 0 }, 7.4), 28.9);
  assert.strictEqual(SC.rateFee({ base: 10, perKm: 3.5, freeKm: 2, round: 5 }, 1), 10, 'inside the free distance only the base fee'); assert.strictEqual(SC.rateFee({ perKm: 4 }, 5), 20);
  const orders = [{ option: 'delivery', km: 3, deliveryPrice: 40 }, { option: 'delivery', km: 7, deliveryPrice: 40 }, { option: 'delivery', km: 8, deliveryPrice: 40 }, { option: 'delivery', km: 16, deliveryPrice: 60 }, { option: 'delivery', deliveryPrice: 40 }, { option: 'pickup', km: 5 }];
  const st = SC.deliveryStats(orders); assert.strictEqual(st.n, 4, 'only deliveries with a distance count'); assert.strictEqual(st.avgKm, 8.5); assert.strictEqual(st.avgFee, 45); assert.strictEqual(st.totalKm, 34); assert.strictEqual(st.bands[0].n, 1); assert.strictEqual(st.bands[1].n, 2); assert.strictEqual(st.bands[3].avgFee, 60); assert.strictEqual(st.perKm, 5.29);
  const g = SC.monthGrid(2026, 10); assert.strictEqual(g.length, 42); assert.strictEqual(g.find((c) => c.inMonth).key, '2026-11-01'); assert.strictEqual(g.filter((c) => c.inMonth).length, 30); assert.strictEqual(g[0].key, '2026-11-01', 'November 2026 starts on a Sunday');
  const o = { name: 'Akeem', phone: '868 367 9175', location: 'Couva', spot: 'Rivulet Road', code: 'ORD-3WC6C', km: 7.4, status: 'done' }, when = new Date(2026, 10, 6, 9, 40);
  ['akeem', 'couva', 'rivulet', '3wc6c', 'ord-3wc6c', '7.4', '6 nov', 'nov 6', 'fri', '2026-11-06', '367', 'akeem couva'].forEach((q) => assert.ok(SC.deliveryMatch(o, q, when), 'finds ' + q));
  ['zzz', '7 nov', 'sam'].forEach((q) => assert.ok(!SC.deliveryMatch(o, q, when), 'does not find ' + q)); assert.ok(SC.deliveryMatch(o, '', when));
}
{ // trip cost, profit, nearest-first stops
  const SC = require('../js/storecore.js');
  assert.strictEqual(SC.tripCost(7.4, 1.5), 22.2, 'there and back: 2 x 7.4 x 1.5'); assert.strictEqual(SC.tripCost(7.4, 0), null); assert.strictEqual(SC.tripCost('x', 2), null);
  const orders = [{ option: 'delivery', km: 3, deliveryPrice: 40 }, { option: 'delivery', km: 16, deliveryPrice: 40 }];
  const st = SC.deliveryStats(orders, 1.5); assert.strictEqual(st.totalCost, 57, 'costs 9 + 48'); assert.strictEqual(st.profit, 23); assert.strictEqual(st.lossN, 1, 'the 16 km trip costs 48 and charged 40'); assert.strictEqual(st.avgCost, 28.5);
  assert.strictEqual(SC.deliveryStats(orders, 0).lossN, 0); assert.strictEqual(SC.deliveryStats(orders, 0).totalCost, 0);
  const home = { lat: 10.65, lng: -61.5 }, far = { id: 'far', lat: 10.9, lng: -61.1 }, near = { id: 'near', lat: 10.66, lng: -61.49 }, mid = { id: 'mid', lat: 10.7, lng: -61.4 }, nopin = { id: 'none' };
  assert.deepStrictEqual(SC.nearestFirst(home, [far, nopin, mid, near]).map((x) => x.id), ['near', 'mid', 'far', 'none'], 'nearest first, stops without a pin last');
  assert.deepStrictEqual(SC.nearestFirst(null, [far, near]).map((x) => x.id), ['far', 'near'], 'no store pin: the order given'); assert.deepStrictEqual(SC.nearestFirst(home, []), []);
}

// Message seller: the WhatsApp text for an item (name, size, how many) in English and Spanish
{
  const SCm = require('../js/storecore.js');
  assert.strictEqual(SCm.askMessage(false, 'B-RUIZ', 'Red t-shirt', 'M', 1), "Hi B-RUIZ! I'm interested in the Red t-shirt (size M). What is the price?");
  assert.strictEqual(SCm.askMessage(true, 'B-RUIZ', 'Red t-shirt', 'M', 1), '¡Hola B-RUIZ! Me interesa la Red t-shirt (talla M). ¿Cuál es el precio?');
  assert.strictEqual(SCm.askMessage(false, '', 'Hat', '', 3), "Hi! I'm interested in 3 of the Hat. What is the price?");
  assert.strictEqual(SCm.norm({}).showPrices, true, 'prices are shown unless the seller turns them off');
  assert.strictEqual(SCm.norm({ showPrices: false }).showPrices, false);
  console.log('message seller tests passed');
}

// short store link names
(() => {
  const SC = require('../js/storecore.js'); const assert = require('assert');
  assert.strictEqual(SC.slugify('B-RUIZ'), 'b-ruiz'); assert.strictEqual(SC.slugify('  Café Niña!! '), 'cafe-nina');
  assert.strictEqual(SC.slugError('bruiz'), ''); assert.strictEqual(SC.slugError('ab'), 'short'); assert.strictEqual(SC.slugError('Bad Name'), 'chars');
  assert.strictEqual(SC.slugError('admin'), 'reserved'); assert.strictEqual(SC.slugError('a--b'), 'chars');
  assert.strictEqual(SC.norm({ slug: 'bruiz' }).slug, 'bruiz'); assert.strictEqual(SC.norm({}).slug, '');
  console.log('slug tests passed');
})();

// delivery ranges, quick selection, starter pack and pickup spots
(() => {
  const SC = require('../js/storecore.js'); const assert = require('assert');
  let c = SC.norm({ locations: [{ id: 'a', name: 'Chaguanas', pickup: true, delivery: true, price: 40 }] });
  assert.strictEqual(c.areaMode, 'custom'); assert.deepStrictEqual(c.bands, []); assert.deepStrictEqual(c.spots, []);   // old settings load unchanged
  const seeded = SC.seedTT(c); c = SC.norm(Object.assign({}, c, seeded, { areaMode: 'safe' }));
  assert.ok(c.locations.length > 20); assert.strictEqual(c.locations.filter((l) => l.name === 'Chaguanas').length, 1);   // no duplicate of a place you already had
  assert.strictEqual(c.locations.find((l) => l.name === 'Chaguanas').pickup, true);   // its pickup choice is kept
  const safe = SC.applyMode(c, 'safe'); c = SC.norm(Object.assign({}, c, safe));
  const pub = SC.publicLocs(c), names = pub.map((l) => l.name);
  assert.ok(names.includes('Chaguanas') && names.includes('San Fernando') && names.includes('Penal'));
  assert.ok(!names.includes('Laventille') && !names.includes('Morvant') && !names.includes('Diego Martin: La Puerta'));   // high-risk left out
  assert.ok(!names.includes('Point Fortin'));   // its range (very far) is switched off
  assert.strictEqual(pub.find((l) => l.name === 'Penal').price, 80); assert.strictEqual(pub.find((l) => l.name === 'Chaguanas').price, 40);
  const all = SC.publicLocs(SC.norm(Object.assign({}, c, SC.applyMode(c, 'all')))).map((l) => l.name);
  assert.ok(all.includes('Laventille') && !all.includes('Point Fortin'));   // "all" turns places on; a range that is off still hides its places
  // a range price change moves every place in it
  const band = c.bands.map((b) => (b.id === 'r50' ? Object.assign({}, b, { price: 55 }) : b)); assert.strictEqual(SC.publicLocs(Object.assign({}, c, { bands: band })).find((l) => l.name === 'Couva').price, 55);
  // pickup spots
  const sp = SC.norm({ spotPrice: 20, spots: [{ name: 'KFC, Chaguanas', note: 'by the highway' }, { name: ' ' }, { name: 'Price Plaza', on: false }] });
  assert.strictEqual(sp.spots.length, 2); assert.deepStrictEqual(SC.publicSpots(sp).map((x) => x.name), ['KFC, Chaguanas']);
  const loc = { pickup: true, delivery: true, price: 40 }, spots = SC.publicSpots(sp);
  assert.deepStrictEqual(SC.options(loc, spots, 20).map((o) => o.key), ['pickup', 'delivery', 'spot']); assert.deepStrictEqual(SC.options(loc, [], 20).map((o) => o.key), ['pickup', 'delivery']);
  const items = [{ price: 100, sale: 0 }]; const tt = SC.totals(items, loc, 'spot', spots, 20); assert.strictEqual(tt.total, 120); assert.ok(tt.valid);
  // free delivery for regulars: same person in any phone format, same zone; nothing else matches
  const fl = SC.freeList([{ phone: '868 555 1234', free: { on: true, zones: ['z1'] } }, { phone: '555 0000', free: { on: false, zones: ['z1'] } }]);
  assert.strictEqual(fl.length, 1); assert.ok(!JSON.stringify(fl).includes('5551234'));
  assert.ok(SC.isFree(fl, '1-868-555-1234', 'z1')); assert.ok(SC.isFree(fl, '5551234', 'z1'));
  assert.ok(!SC.isFree(fl, '555 1235', 'z1')); assert.ok(!SC.isFree(fl, '555 1234', 'z2')); assert.ok(!SC.isFree(fl, '', 'z1'));
  assert.ok(!SC.validPhone('1111111') && !SC.validPhone('868 888 8888') && SC.validPhone('555 1234'));
  // delivery zones: a circle and a shape; the pin decides; a 200 m margin forgives GPS
  const zs = SC.normZones([{ id: 'a', name: 'Chaguanas', lat: 10.5167, lng: -61.4112, r: 5000 }, { id: 'b', name: 'Block', poly: [[10.2, -61.5], [10.2, -61.4], [10.3, -61.4], [10.3, -61.5]] }, { id: 'c', name: '', lat: 1, lng: 1, r: 100 }, { id: 'd', name: 'Bad', lat: 'x', lng: 1, r: 100 }]);
  assert.strictEqual(zs.length, 2);
  assert.deepStrictEqual(SC.zonesAt(zs, 10.52, -61.41).map((z) => z.id), ['a']); assert.deepStrictEqual(SC.zonesAt(zs, 10.25, -61.45).map((z) => z.id), ['b']);
  assert.deepStrictEqual(SC.zonesAt(zs, 10.31, -61.45), []); assert.deepStrictEqual(SC.zonesAt(zs, 10.3015, -61.45).map((z) => z.id), ['b']); assert.deepStrictEqual(SC.zonesAt(zs, 10.3015, -61.45, 0), []);
  assert.deepStrictEqual(SC.zonesAt(zs, undefined, undefined), []);
  assert.strictEqual(SC.norm({ zones: zs }).zones.length, 2);
  // zones become places: starter matches take their range and risk mark, others start off with no price; renames follow; deleting a zone removes its place
  const zc = { zones: [{ id: 'z1', name: 'Couva', lat: 10.42, lng: -61.45, r: 4000 }, { id: 'z2', name: 'Laventille', lat: 10.66, lng: -61.485, r: 2000 }, { id: 'z3', name: 'Valencia', lat: 10.63, lng: -61.2, r: 4000 }], locations: [{ id: 'old', name: 'couva', pickup: true, delivery: true, price: 55 }] };
  let sy = SC.syncZonePlaces(zc); assert.ok(sy.changed);
  const byName = (n) => sy.locations.find((l) => l.name === n);
  assert.strictEqual(byName('Couva').id, 'old'); assert.strictEqual(byName('Couva').zone, 'z1'); assert.strictEqual(byName('Couva').price, 55);
  assert.ok(byName('Laventille').risk && byName('Laventille').off && byName('Laventille').band === 'r60');
  assert.ok(byName('Valencia').off && byName('Valencia').auto && SC.needsPrice({}, byName('Valencia')));
  assert.ok(sy.bands.some((b) => b.id === 'r60'));
  assert.ok(!SC.syncZonePlaces(Object.assign({}, zc, { locations: sy.locations, bands: sy.bands })).changed);
  const ren = SC.syncZonePlaces({ zones: [{ id: 'z1', name: 'Couva Town', lat: 10.42, lng: -61.45, r: 4000 }], locations: sy.locations, bands: sy.bands });
  assert.ok(ren.locations.some((l) => l.zone === 'z1' && l.name === 'Couva Town')); assert.ok(!ren.locations.some((l) => l.name === 'Valencia'));
  assert.ok(SC.publicLocs(Object.assign({}, zc, { locations: sy.locations, bands: sy.bands })).every((l) => l.name !== 'Valencia' && l.name !== 'Laventille'));
  // high-risk spots: a flag inside a bigger zone; they are not published as areas, not free-delivery zones, and are listed with the high-risk places (off)
  const hz = SC.normZones([{ id: 'a', name: 'Port of Spain', lat: 10.6549, lng: -61.5019, r: 3500 }, { id: 'h', name: 'Laventille (East Port of Spain)', risk: true, lat: 10.659, lng: -61.489, r: 1200 }]);
  assert.deepStrictEqual(SC.hotAt(hz, 10.659, -61.489).map((z) => z.id), ['h']); assert.deepStrictEqual(SC.hotAt(hz, 10.6549, -61.5019), []); assert.deepStrictEqual(SC.areaZones(hz).map((z) => z.id), ['a']);
  assert.deepStrictEqual(SC.zonesAt(SC.areaZones(hz), 10.659, -61.489).map((z) => z.id), ['a']);
  const hs = SC.syncZonePlaces({ zones: hz, locations: [] });
  assert.ok(!hs.locations.some((l) => l.zone === 'h')); assert.ok(hs.locations.some((l) => l.zone === 'a'));   // a spot never becomes a place of its own
  assert.ok(SC.normZones([{ id: 'x', name: 'Spot', risk: true, place: 'p1', lat: 10.6, lng: -61.4, r: 800 }])[0].place === 'p1');
  // the starter spots sit inside the starter zones (a spot never floats outside every zone), and all starter points are in Trinidad and Tobago
  const ZD = require('../js/zonedata.js'), baseZ = SC.normZones(ZD.starter()), hotZ = SC.normZones(ZD.hot());
  assert.ok(baseZ.length >= 60); assert.strictEqual(new Set(baseZ.map((z) => z.name)).size, baseZ.length);
  baseZ.concat(hotZ).forEach((z) => { assert.ok(z.lat > 9.9 && z.lat < 11.4 && z.lng > -62 && z.lng < -60.4, 'inside T&T: ' + z.name); });
  hotZ.forEach((h) => assert.ok(SC.zonesAt(baseZ, h.lat, h.lng, 0).length > 0, 'spot inside a zone: ' + h.name));
  hotZ.forEach((h) => { for (let a = 0; a < 360; a += 45) { const dl = (h.r / 111320) * Math.cos(a * Math.PI / 180), dn = (h.r / (111320 * Math.cos(h.lat * Math.PI / 180))) * Math.sin(a * Math.PI / 180); assert.ok(SC.zonesAt(baseZ, h.lat + dl, h.lng + dn, 0).length > 0, 'spot edge covered: ' + h.name); } });
  const nzr = SC.nearestZone(baseZ, 10.455, -61.30); assert.ok(nzr && nzr.zone && nzr.m > 0); assert.strictEqual(SC.nearestZone(baseZ, 10.5167, -61.4112).m, 0);
  console.log('delivery area tests passed');
})();

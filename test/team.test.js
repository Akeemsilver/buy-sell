const assert = require('assert');
const T = require('../js/team.js');

// ranks, bottom up
assert.deepStrictEqual(T.RANKS, ['seller', 'supervisor', 'manager', 'owner']);
assert.ok(T.rankIndex('manager') > T.rankIndex('supervisor') && T.rankIndex('owner') > T.rankIndex('manager'));

// default permissions follow the table the owner agreed
const D = T.fill(null);
const want = {
  seller: { sell: true, orders: true, stock: false, refunds: false, storeSettings: false, costs: false },
  supervisor: { sell: true, orders: true, stock: true, refunds: true, storeSettings: false, costs: false },
  manager: { sell: true, orders: true, stock: true, refunds: true, storeSettings: true, costs: true },
};
assert.deepStrictEqual(D, want, 'default table');

// the owner can do everything, and only the owner manages the team and transfers ownership
T.CAPS.forEach((c) => assert.strictEqual(T.can(null, 'owner', c), true));
assert.strictEqual(T.can(null, 'owner', 'team'), true); assert.strictEqual(T.can(null, 'owner', 'transfer'), true);
['seller', 'supervisor', 'manager'].forEach((r) => { assert.strictEqual(T.can({ [r]: { team: true } }, r, 'team'), false, r + ' never manages the team'); assert.strictEqual(T.can(null, r, 'transfer'), false); });
assert.strictEqual(T.can(null, 'stranger', 'sell'), false, 'an unknown rank can do nothing');
assert.strictEqual(T.can(null, undefined, 'sell'), false);

// the owner edits what a rank can do; what is not saved falls back to the default
const p = { seller: { stock: true }, manager: { costs: false } };
assert.strictEqual(T.can(p, 'seller', 'stock'), true, 'switched on for sellers');
assert.strictEqual(T.can(p, 'seller', 'sell'), true, 'untouched capabilities keep the default');
assert.strictEqual(T.can(p, 'manager', 'costs'), false, 'switched off for managers');
assert.strictEqual(T.can(p, 'supervisor', 'refunds'), true);

// the business code
const code = T.genCode(() => 0.5); assert.strictEqual(code.length, 6); assert.ok(/^[A-HJ-KM-NP-Z]{6}$/.test(code), 'letters only, no I or O');
assert.notStrictEqual(T.genCode(), T.genCode(), 'two codes differ');
for (let i = 0; i < 200; i++) assert.ok(/^[A-HJ-KM-NP-Z]{6}$/.test(T.genCode()));
assert.strictEqual(T.normCode(' ab-c d12e '), 'ABCD12E', 'typed codes are tidied up: capitals, no spaces or dashes');
assert.ok(T.validCode('abcdef') && T.validCode('ABC1234') && !T.validCode('abc') && !T.validCode('ABCDEFGH'), 'six or seven characters');

// people list: best rank first
const members = { u1: 'owner', u2: 'seller', u3: 'manager', u4: 'seller' };
const names = { u1: 'Akeem', u2: 'Zoe', u3: 'Ana', u4: 'Beth' };
assert.deepStrictEqual(T.people(members, names).map((x) => x.uid), ['u1', 'u3', 'u4', 'u2'], 'owner, manager, then sellers by name');

// transferring ownership
assert.deepStrictEqual(T.transferChanges(members, 'u1', 'u3'), { to: 'owner', from: 'manager' }, 'the new owner is the owner, the old owner becomes a manager');
assert.strictEqual(T.transferChanges(members, 'u1', 'u1'), null, 'not to yourself');
assert.strictEqual(T.transferChanges(members, 'u1', 'ghost'), null, 'not to someone who is not a member');
assert.strictEqual(T.transferChanges(members, 'u3', 'u2'), null, 'only the owner can transfer');
console.log('team tests passed');

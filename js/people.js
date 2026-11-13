/* Customers as people: every customer has one main name and one main number, nicknames, and the numbers they used before.
   The rest of the app still keys items and invoices by a customer's "key" (the name, or "Name · 1290" when two people share a name),
   so a profile's key never changes when its name does. Everything here is plain functions on the state, so it is tested in Node.
   Every decision (a nickname added, a number moved, two customers merged or split) is written to s.decisions with enough to undo it. */
(function (root) {
  const P = {};
  const V = 1;   // the shape of s.people; a newer shape than this code knows means "update the app"
  const now = () => new Date().toISOString();
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const low = (v) => clean(v).toLowerCase();
  const rid = (n) => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < (n || 8); i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  P.V = V;

  /* ---------- phone numbers ---------- */
  const digits = (v) => String(v || '').replace(/\D/g, '');
  // A local Trinidad number (7 digits, 868 + 7, or 1 868 + 7) is compared by its last 7 digits; any other number only matches itself.
  const pkey = (v) => { const d = digits(v); if (!d) return ''; if (d.length === 7) return 'tt' + d; if (d.length === 10 && d.startsWith('868')) return 'tt' + d.slice(3); if (d.length === 11 && d.startsWith('1868')) return 'tt' + d.slice(4); return 'x' + d; };
  P.digits = digits; P.key = pkey;
  P.same = (a, b) => { const x = pkey(a), y = pkey(b); return !!x && x === y; };
  P.fmt = (v) => { const k = pkey(v); if (!k) return ''; return k.startsWith('tt') ? '868 ' + k.slice(2, 5) + ' ' + k.slice(5) : '+' + k.slice(1); };
  P.last4 = (v) => { const d = digits(v); return d.length >= 4 ? d.slice(-4) : ''; };
  // At least 7 digits (up to 15), and not one digit repeated (0000000).
  P.valid = (v) => { const d = digits(v), k = pkey(v), core = k.startsWith('tt') ? k.slice(2) : d; return d.length >= 7 && d.length <= 15 && String(v).length <= 25 && !/^(\d)\1+$/.test(core); };

  /* ---------- profiles ---------- */
  const blank = (key, name, phone) => ({ id: rid(8), key, name, phone: phone ? P.fmt(phone) : '', nicks: [], prev: [], noNumber: false, shared: false, free: { on: false, places: [] }, made: now() });
  const allKeys = (s) => new Set([...(s.customers || []), ...(s.items || []).map((i) => i.customer), ...(s.invoices || []).map((v) => v.client)].map(clean).filter(Boolean));
  P.list = (s) => s.people || [];   // reading never creates the list: only ensure() switches profiles on
  P.byId = (s, id) => P.list(s).find((p) => p.id === id) || null;
  P.byKey = (s, key) => { const k = clean(key); return P.list(s).find((p) => p.key === k) || P.list(s).find((p) => low(p.key) === low(k)) || null; };
  // A key nobody uses yet: the name when free, otherwise "Name · 1290" (last digits of the number), then a count.
  P.uniqueKey = (s, name, phone) => {
    const used = new Set([...allKeys(s), ...P.list(s).map((p) => p.key)].map(low)), base = clean(name) || 'Customer';
    if (!used.has(low(base))) return base;
    const l4 = P.last4(phone), first = l4 ? base + ' · ' + l4 : '';
    if (first && !used.has(low(first))) return first;
    for (let n = 2; n < 500; n++) { const k = base + ' · ' + (l4 ? l4 + '-' : '') + n; if (!used.has(low(k))) return k; }
    return base + ' · ' + rid(4);
  };
  // Makes sure every customer name in use has a profile. Idempotent; returns true if anything was added.
  P.ensure = (s) => {
    let changed = false; if (!Array.isArray(s.people)) { s.people = []; changed = true; } if (!Array.isArray(s.decisions)) { s.decisions = []; changed = true; }
    const have = new Set(s.people.map((p) => p.key));
    allKeys(s).forEach((k) => { if (!have.has(k)) { s.people.push(blank(k, k, '')); changed = true; } });
    if (s.peopleV !== V) { s.peopleV = V; changed = true; }
    return changed;
  };
  P.name = (s, key) => { const p = P.byKey(s, key); return p ? p.name : clean(key); };
  // The name to show; "John · 1290" (or the place) when another customer has the same name.
  P.label = (s, key, place) => {
    const p = P.byKey(s, key); if (!p) return clean(key);
    const twin = P.list(s).some((q) => q !== p && low(q.name) === low(p.name));
    if (!twin) return p.name;
    const extra = P.last4(p.phone) || (place ? clean(place) : '');
    return extra ? p.name + ' · ' + extra : p.name;
  };
  P.color = (p) => { const cols = ['#a03a72', '#2f6f9a', '#b86a1f', '#2e7d5b', '#7a4aa8', '#b0453a', '#2c7c82', '#8a6d1f']; let h = 0; const s = p.id || p.key; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return cols[h % cols.length]; };
  P.withNumber = (s) => P.list(s).filter((p) => p.phone).length;
  P.missingNumber = (s) => P.list(s).filter((p) => !p.phone && !p.noNumber);

  /* ---------- who is this order from? ---------- */
  const nameMatch = (p, name) => { const n = low(name); return !!n && (low(p.name) === n || p.nicks.some((x) => low(x) === n)); };
  P.nameMatch = nameMatch;
  P.mainOwners = (s, phone) => P.list(s).filter((p) => p.phone && P.same(p.phone, phone));
  P.prevOwners = (s, phone) => P.list(s).filter((p) => p.prev.some((e) => P.same(e.phone, phone)));
  // The answer for an order's name and phone. kind:
  //   match     the number is someone's main number and the name is theirs (or a nickname)   -> nothing to ask
  //   newName   the number is someone's main number but the name is new                       -> "same person?"
  //   oldNumber the number is in someone's previous numbers                                    -> "this number was used before"
  //   newNumber the name (or a nickname) belongs to someone with a different main number       -> "same person, new number?"
  //   fill      the name belongs to exactly one customer who has no number yet                 -> save the number on them
  //   new       nobody knows this name or number
  P.classify = (s, o) => {
    const name = clean(o.name), phone = o.phone;
    const mains = P.mainOwners(s, phone);
    if (mains.length) { const hit = mains.find((p) => nameMatch(p, name)); return hit ? { kind: 'match', profile: hit } : { kind: 'newName', candidates: mains }; }
    const olds = P.prevOwners(s, phone);
    if (olds.length) return { kind: 'oldNumber', candidates: olds };
    const byName = P.list(s).filter((p) => nameMatch(p, name));
    if (byName.length) {
      const bare = byName.filter((p) => !p.phone && !p.noNumber);
      if (byName.length === 1 && bare.length === 1) return { kind: 'fill', profile: bare[0] };
      return { kind: 'newNumber', candidates: byName };
    }
    return { kind: 'new' };
  };

  /* ---------- decisions and their undo ---------- */
  // A snapshot of what a change touches, taken before it happens.
  const snapOf = (s, ids) => ({ people: ids.map((id) => P.byId(s, id)).filter(Boolean).map(clone), created: [], moves: { items: {}, invoices: {} }, places: {}, langs: {} });
  const start = (s, ids) => snapOf(s, ids);
  const log = (s, kind, text, snap, extra) => {
    const d = Object.assign({ id: rid(8), at: now(), kind, text, snap, undone: false }, extra || {}); (s.decisions = s.decisions || []).unshift(d); if (s.decisions.length > 300) s.decisions.length = 300; return d;
  };
  const addPrev = (p, phone, note, until) => { if (!phone) return; p.prev = p.prev.filter((e) => !P.same(e.phone, phone)); p.prev.unshift({ phone: P.fmt(phone), until: until || now(), note: note || '' }); };
  const dropPrev = (p, phone) => { p.prev = p.prev.filter((e) => !P.same(e.phone, phone)); };
  const addNick = (p, name) => { const n = clean(name); if (n && low(n) !== low(p.name) && !p.nicks.some((x) => low(x) === low(n))) p.nicks.push(n); };
  const newProfile = (s, name, phone, snap) => { const p = blank(P.uniqueKey(s, name, phone), clean(name), phone); (s.people = s.people || []).push(p); if (snap) snap.created.push(p.id); return p; };
  const keyIn = (s, key) => { if (key && !(s.customers || []).includes(key)) (s.customers = s.customers || []).push(key); };

  // order from `name` on the main number of `p`: it is the same person (name becomes a nickname) ...
  P.opSame = (s, pid, o, by) => { const p = P.byId(s, pid), snap = start(s, [pid]); addNick(p, o.name); if (!p.phone && o.phone) p.phone = P.fmt(o.phone); return log(s, 'nick', '"' + clean(o.name) + '" added to ' + p.name + ' as a nickname', snap, { by, order: o.order, pids: [pid] }); };
  // ... or a different person: a new profile takes the number; the old one keeps it only in its previous numbers and needs a new one.
  P.opDifferent = (s, pid, o, by) => {
    const old = P.byId(s, pid), snap = start(s, [pid]); const had = old.phone; addPrev(old, had, 'taken by ' + clean(o.name)); old.phone = '';
    const np = newProfile(s, o.name, o.phone, snap); keyIn(s, np.key);
    return { profile: np, decision: log(s, 'taken', clean(o.name) + ' took ' + P.fmt(o.phone) + ' (it was ' + old.name + "'s)", snap, { by, order: o.order, pids: [pid, np.id] }) };
  };
  // the name is known but the number is new: the same person gets a new main number (the old one is kept) ...
  P.opNewNumberSame = (s, pid, o, by) => {
    const p = P.byId(s, pid), snap = start(s, [pid]); if (p.phone && !P.same(p.phone, o.phone)) addPrev(p, p.phone, 'replaced'); dropPrev(p, o.phone); p.phone = P.fmt(o.phone); addNick(p, o.name);
    return log(s, 'number', p.name + ' has a new main number: ' + P.fmt(o.phone), snap, { by, order: o.order, pids: [pid] });
  };
  // ... or a different customer with the same name.
  P.opNewCustomer = (s, o, by, why) => { const snap = start(s, []); const np = newProfile(s, o.name, o.phone, snap); keyIn(s, np.key); return { profile: np, decision: log(s, 'new', clean(o.name) + ' (' + P.fmt(o.phone) + ') kept as a different customer', snap, { by, order: o.order, pids: [np.id], why: why || '' }) }; };
  // an old number is used again by the same person: keep the main number (and note the name) or make the old one main again.
  P.opOldKeep = (s, pid, o, by) => { const p = P.byId(s, pid), snap = start(s, [pid]); addNick(p, o.name); return log(s, 'old', 'Old number ' + P.fmt(o.phone) + ' used by ' + p.name + '; main number kept', snap, { by, order: o.order, pids: [pid] }); };
  P.opOldMain = (s, pid, o, by) => { const p = P.byId(s, pid), snap = start(s, [pid]); if (p.phone) addPrev(p, p.phone, 'replaced'); dropPrev(p, o.phone); p.phone = P.fmt(o.phone); addNick(p, o.name); return log(s, 'number', p.name + ' went back to ' + P.fmt(o.phone), snap, { by, order: o.order, pids: [pid] }); };
  // an old number now belongs to a new customer: it leaves the old person's list.
  P.opOldNew = (s, pid, o, by) => { const p = P.byId(s, pid), snap = start(s, [pid]); const gone = (p.prev.find((e) => P.same(e.phone, o.phone)) || {}).phone; dropPrev(p, o.phone); const np = newProfile(s, o.name, o.phone, snap); keyIn(s, np.key); return { profile: np, decision: log(s, 'taken', clean(o.name) + ' took ' + P.fmt(gone || o.phone) + ' (an old number of ' + p.name + ')', snap, { by, order: o.order, pids: [pid, np.id] }) }; };
  // two people really share this number: a second profile on the same number, told apart by name.
  P.opShared = (s, pid, o, by) => { const p = P.byId(s, pid), snap = start(s, [pid]); p.shared = true; const np = newProfile(s, o.name, o.phone, snap); np.shared = true; keyIn(s, np.key); return { profile: np, decision: log(s, 'shared', clean(o.name) + ' shares ' + P.fmt(o.phone) + ' with ' + p.name, snap, { by, order: o.order, pids: [pid, np.id] }) }; };
  // not sure yet: the order goes ahead as a separate customer, flagged to check.
  P.opLater = (s, o, by, withIds) => { const snap = start(s, withIds || []); const np = newProfile(s, o.name, '', snap); if (o.phone && !P.mainOwners(s, o.phone).length) np.phone = P.fmt(o.phone); keyIn(s, np.key); return { profile: np, decision: log(s, 'later', clean(o.name) + ' kept apart for now (check Possible duplicates)', snap, { by, order: o.order, pids: [np.id].concat(withIds || []), pending: true }) }; };
  // a customer is new: a profile with the typed name and number.
  P.opFresh = (s, o, by) => { const snap = start(s, []); const np = newProfile(s, o.name, o.phone, snap); keyIn(s, np.key); return { profile: np, decision: log(s, 'created', clean(o.name) + ' added with ' + P.fmt(o.phone), snap, { by, order: o.order, pids: [np.id] }) }; };
  P.opFill = (s, pid, o, by) => { const p = P.byId(s, pid), snap = start(s, [pid]); p.phone = P.fmt(o.phone); return log(s, 'number', p.name + ' got a number: ' + p.phone, snap, { by, order: o.order, pids: [pid] }); };

  // A number typed by hand for a customer (the Add phone numbers list). {ok} or {conflict: [profiles that already have it]}.
  P.setNumber = (s, pid, phone, by) => {
    const p = P.byId(s, pid); if (!p) return { error: 'missing' }; if (!P.valid(phone)) return { error: 'invalid' };
    const others = P.mainOwners(s, phone).filter((q) => q.id !== pid); if (others.length) return { conflict: others };
    if (p.phone && P.same(p.phone, phone)) return { ok: true };   // already the main number: nothing to record
    const snap = start(s, [pid]); if (p.phone && !P.same(p.phone, phone)) addPrev(p, p.phone, 'replaced'); dropPrev(p, phone); p.phone = P.fmt(phone); p.noNumber = false;
    return { ok: true, decision: log(s, 'number', p.name + ' main number: ' + p.phone, snap, { by, pids: [pid] }) };
  };

  /* ---------- merge and split (they re-key invoices and items) ---------- */
  const mapKeys = (s, snap, from, to, only) => {
    s.items.forEach((i) => { if (i.customer === from && (!only || (i.invoice && only.has(i.invoice)))) { snap.moves.items[i.id] = from; i.customer = to; } });
    s.invoices.forEach((v) => { if (v.client === from && (!only || only.has(v.no))) { snap.moves.invoices[v.no] = from; v.client = to; } });
  };
  // numbers that must add up the same before and after a merge or split
  P.totals = (s) => { const r2 = (n) => Math.round(n * 100) / 100, sum = (a) => a.reduce((t, n) => t + (Number(n) || 0), 0); return { items: s.items.length, invoices: s.invoices.length, owing: r2(sum(s.items.map((i) => i.owing))), billed: r2(sum(s.invoices.map((v) => v.total))), balance: r2(sum(s.invoices.map((v) => v.balance))) }; };
  const sameTotals = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const moveSettings = (s, snap, from, to) => {
    const pl = Object.assign({}, s.settings.places || {}); if (pl[from] != null) { snap.places[from] = pl[from]; snap.places[to] = pl[to] == null ? null : pl[to]; if (!pl[to]) pl[to] = pl[from]; delete pl[from]; s.settings.places = pl; }
    const cl = Object.assign({}, s.settings.clientLang || {}), fk = low(from), tk = low(to); if (cl[fk] != null) { snap.langs[fk] = cl[fk]; snap.langs[tk] = cl[tk] == null ? null : cl[tk]; if (!cl[tk]) cl[tk] = cl[fk]; delete cl[fk]; s.settings.clientLang = cl; }
  };
  // `from` is folded into `into`: their invoices and items, name (as a nickname), nicknames and numbers all go to `into`.
  P.merge = (s, fromId, intoId, by) => {
    const f = P.byId(s, fromId), t = P.byId(s, intoId); if (!f || !t || f === t) throw new Error('merge');
    const before = P.totals(s), snap = start(s, [fromId, intoId]);
    mapKeys(s, snap, f.key, t.key); moveSettings(s, snap, f.key, t.key);
    addNick(t, f.name); f.nicks.forEach((n) => addNick(t, n)); f.prev.forEach((e) => { if (!t.prev.some((x) => P.same(x.phone, e.phone)) && !P.same(t.phone, e.phone)) t.prev.push(e); });
    if (f.phone && !P.same(f.phone, t.phone)) { if (!t.phone) t.phone = f.phone; else addPrev(t, f.phone, 'merged from ' + f.name); }
    if (f.free && f.free.on && !(t.free && t.free.on)) t.free = clone(f.free);
    s.people = s.people.filter((p) => p.id !== f.id); s.customers = (s.customers || []).filter((n) => n !== f.key); keyIn(s, t.key);
    if (!sameTotals(before, P.totals(s))) { P.restore(s, snap); throw new Error('totals'); }
    return log(s, 'merge', f.name + ' merged into ' + t.name, snap, { by, pids: [intoId], removed: [fromId] });
  };
  // The ticked invoices (and their items) go to a new customer.
  P.split = (s, pid, o, by) => {
    const p = P.byId(s, pid); if (!p) throw new Error('missing'); const nos = new Set(o.nos || []); if (!nos.size) throw new Error('none');
    if (!P.valid(o.phone) && o.phone) throw new Error('phone');
    const before = P.totals(s), snap = start(s, [pid]); const np = newProfile(s, o.name, o.phone, snap);
    mapKeys(s, snap, p.key, np.key, nos); keyIn(s, np.key);
    if (!sameTotals(before, P.totals(s))) { P.restore(s, snap); throw new Error('totals'); }
    return { profile: np, decision: log(s, 'split', p.name + ' split: ' + nos.size + ' invoice' + (nos.size === 1 ? '' : 's') + ' moved to ' + np.name, snap, { by, pids: [pid, np.id] }) };
  };
  P.restore = (s, snap) => {
    (snap.created || []).forEach((id) => { const p = P.byId(s, id); if (p) { s.people = s.people.filter((q) => q.id !== id); s.customers = (s.customers || []).filter((n) => n !== p.key); } });
    snap.people.forEach((c) => { const i = s.people.findIndex((q) => q.id === c.id); if (i >= 0) s.people[i] = clone(c); else s.people.push(clone(c)); });
    Object.keys(snap.moves.items).forEach((id) => { const it = s.items.find((x) => x.id === id); if (it) it.customer = snap.moves.items[id]; });
    Object.keys(snap.moves.invoices).forEach((no) => { const v = s.invoices.find((x) => x.no === no); if (v) v.client = snap.moves.invoices[no]; });
    const pl = Object.assign({}, s.settings.places || {}); Object.keys(snap.places).forEach((k) => { if (snap.places[k] == null) delete pl[k]; else pl[k] = snap.places[k]; }); if (Object.keys(snap.places).length) s.settings.places = pl;
    const cl = Object.assign({}, s.settings.clientLang || {}); Object.keys(snap.langs).forEach((k) => { if (snap.langs[k] == null) delete cl[k]; else cl[k] = snap.langs[k]; }); if (Object.keys(snap.langs).length) s.settings.clientLang = cl;
    s.people.forEach((p) => keyIn(s, p.key));
  };
  // "Change this": puts back what the decision changed. Later decisions that touched the same customers must be undone first.
  P.canUndo = (s, id) => { const d = (s.decisions || []).find((x) => x.id === id); if (!d || d.undone) return false; const mine = new Set([].concat(d.pids || [], d.removed || [])); return !(s.decisions || []).some((x) => !x.undone && x.at > d.at && [].concat(x.pids || [], x.removed || []).some((i) => mine.has(i))); };
  P.undo = (s, id) => { const d = (s.decisions || []).find((x) => x.id === id); if (!d || d.undone) throw new Error('gone'); if (!P.canUndo(s, id)) throw new Error('later'); const before = P.totals(s); P.restore(s, d.snap); d.undone = true; if (!sameTotals(before, P.totals(s))) { /* restoring only re-keys: totals are unchanged */ } return d; };

  /* ---------- possible duplicates ---------- */
  const lev1 = (a, b) => { a = low(a); b = low(b); if (a === b) return true; if (Math.abs(a.length - b.length) > 1) return false; let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1); return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i); };
  P.duplicates = (s, place) => {
    const out = [], L = P.list(s); const seen = new Set();
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j], k = a.id + '|' + b.id; if (seen.has(k)) continue;
      if (a.phone && b.phone && P.same(a.phone, b.phone) && !(a.shared && b.shared)) { out.push({ a, b, why: 'number' }); seen.add(k); continue; }
      if (!a.phone && !b.phone && low(a.name) !== low(b.name) && lev1(a.name, b.name) && place && clean(place(a.key)) && low(place(a.key)) === low(place(b.key))) { out.push({ a, b, why: 'name' }); seen.add(k); }
    }
    (s.decisions || []).filter((d) => d.pending && !d.undone && !d.reviewed).forEach((d) => { const ids = d.pids || []; if (ids.length >= 2) { const a = P.byId(s, ids[0]), b = P.byId(s, ids[1]); if (a && b && !out.some((o) => (o.a === a && o.b === b) || (o.a === b && o.b === a))) out.push({ a, b, why: 'later', decision: d.id }); } });
    return out;
  };

  /* ---------- numbers suggested from the store's past orders ---------- */
  P.suggest = (s, orders) => { const m = {}; (orders || []).forEach((o) => { const k = low(o.name); if (k && o.phone && P.valid(o.phone) && !m[k]) m[k] = o.phone; }); return (p) => { const hit = m[low(p.name)] || p.nicks.map((n) => m[low(n)]).find(Boolean); return hit ? P.fmt(hit) : ''; }; };

  if (typeof module !== 'undefined' && module.exports) module.exports = P; else root.People = P;
})(typeof window !== 'undefined' ? window : globalThis);

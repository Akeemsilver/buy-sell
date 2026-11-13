/* Cloud sync rules, kept free of Firebase so they can be tested: the app's data is cut into small documents
   (one per batch, item, invoice, plus "settings" and "customers"). `last` remembers what the cloud is known to hold, so
   - what changed on this phone since then is sent up (diff), and
   - what changed in the cloud since then is brought down (reconcile), unless this phone has an unsent edit of the same
     document (then this phone wins and its version is sent).  Photos are not part of this yet (see photostore.js). */
(function (root) {
  const S = {};
  const COLS = ['batches', 'items', 'invoices', 'meta'];
  const KEY = { batches: (b) => b.id, items: (i) => i.id, invoices: (v) => v.no };
  const orderNum = (v) => parseInt(String(v).replace(/\D/g, ''), 10) || 0;
  const SORT = { batches: (a, b) => a.num - b.num, items: (a, b) => String(a.id).localeCompare(String(b.id)), invoices: (a, b) => orderNum(a.no) - orderNum(b.no) };

  // Every document of the state as {collection: {id: json}}.
  S.docs = (s) => {
    const out = { batches: {}, items: {}, invoices: {}, meta: {} };
    ['batches', 'items', 'invoices'].forEach((c) => (s[c] || []).forEach((o) => { out[c][KEY[c](o)] = JSON.stringify(o); }));
    out.meta.settings = JSON.stringify(s.settings || {});
    out.meta.customers = JSON.stringify({ list: s.customers || [] });
    if (s.people) out.meta.people = JSON.stringify({ v: s.peopleV || 1, people: s.people, decisions: s.decisions || [] });   // customers as people (numbers, nicknames, decisions)
    return out;
  };
  S.emptyLast = () => ({ batches: {}, items: {}, invoices: {}, meta: {} });
  S.hasData = (s) => !!((s.batches || []).length || (s.items || []).length || (s.invoices || []).length);

  // Write one document (json string, or null to delete) into the state.
  S.apply = (s, col, id, json) => {
    if (col === 'meta') {
      if (json == null) return;
      const o = JSON.parse(json);
      if (id === 'settings') s.settings = Object.assign({}, s.settings, o); else if (id === 'customers') s.customers = o.list || []; else if (id === 'people') { s.people = o.people || []; s.decisions = o.decisions || []; s.peopleV = o.v || 1; }
      return;
    }
    const arr = s[col], i = arr.findIndex((o) => KEY[col](o) === id);
    if (json == null) { if (i >= 0) arr.splice(i, 1); return; }
    const o = JSON.parse(json);
    if (i >= 0) arr[i] = o; else arr.push(o);
    arr.sort(SORT[col]);
  };

  // What to send: documents that differ from what the cloud is known to hold, and documents that no longer exist here.
  S.diff = (s, last) => {
    const now = S.docs(s), sets = [], dels = [];
    COLS.forEach((c) => {
      Object.keys(now[c]).forEach((id) => { if (now[c][id] !== last[c][id]) sets.push({ col: c, id, json: now[c][id] }); });
      if (c !== 'meta') Object.keys(last[c]).forEach((id) => { if (!(id in now[c])) dels.push({ col: c, id }); });
    });
    return { sets, dels };
  };
  // Remember that these operations were handed to the cloud.
  S.commit = (last, d) => { d.sets.forEach((o) => { last[o.col][o.id] = o.json; }); d.dels.forEach((o) => { delete last[o.col][o.id]; }); };

  // The cloud's full list for one collection arrived: {id: json}. Returns true if the state changed.
  S.reconcile = (s, last, col, remote) => {
    const local = S.docs(s)[col]; let changed = false;
    Object.keys(remote).forEach((id) => {
      const rj = remote[id];
      if (rj === last[col][id]) return;                              // nothing new from the cloud
      if (local[id] === last[col][id] || local[id] === undefined && last[col][id] === undefined) { S.apply(s, col, id, rj); last[col][id] = rj; changed = true; }   // no unsent edit here: take the cloud's version
      else if (local[id] === rj) last[col][id] = rj;                 // same thing on both sides
      /* else: this phone has an unsent edit of it: keep ours, it is sent next */
    });
    Object.keys(last[col]).forEach((id) => {
      if (id in remote) return;
      if (local[id] === last[col][id]) { S.apply(s, col, id, null); delete last[col][id]; changed = true; }   // deleted in the cloud, untouched here
      else if (local[id] === undefined) delete last[col][id];                                                   // deleted on both sides
      /* else: edited here after it was deleted there: it will be sent again */
    });
    return changed;
  };
  // Empty the data (keeps settings): used when the cloud's copy replaces this phone's.
  // Treat this phone's current settings/customers as already known to the cloud (so the cloud's versions replace them).
  S.adoptMeta = (s, last) => { last.meta = S.docs(s).meta; };
  S.clearData = (s) => { s.batches = []; s.items = []; s.invoices = []; s.customers = []; return s; };

  if (typeof module !== 'undefined' && module.exports) module.exports = S; else root.Sync = S;
})(typeof window !== 'undefined' ? window : globalThis);

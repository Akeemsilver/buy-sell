/* Who can do what in a shared business: four ranks (Seller < Supervisor < Manager < Owner), the things each rank may do, and the
   business code people use to ask to join. Kept free of the page and of Firebase so it can be tested. */
(function (root) {
  const T = {};
  T.RANKS = ['seller', 'supervisor', 'manager', 'owner'];
  // What the Owner can switch on or off for the other ranks (the Owner always has everything, and only the Owner manages the team and transfers ownership).
  T.CAPS = ['sell', 'orders', 'stock', 'refunds', 'storeSettings', 'costs'];
  const set = (...caps) => caps.reduce((o, c) => { o[c] = true; return o; }, {});
  T.defaults = () => ({
    seller: set('sell', 'orders'),
    supervisor: set('sell', 'orders', 'stock', 'refunds'),
    manager: set('sell', 'orders', 'stock', 'refunds', 'storeSettings', 'costs'),
  });
  T.isRank = (r) => T.RANKS.includes(r);
  T.rankIndex = (r) => T.RANKS.indexOf(r);
  // perms: what the Owner saved (may be missing or partly missing: the default fills the gaps)
  T.can = (perms, rank, cap) => {
    if (rank === 'owner') return true;
    if (cap === 'team' || cap === 'transfer') return false;
    if (!T.isRank(rank)) return false;
    const mine = perms && perms[rank];
    if (mine && typeof mine[cap] === 'boolean') return mine[cap];
    return !!T.defaults()[rank][cap];
  };
  // A full permissions object (every editable rank and capability filled in)
  T.fill = (perms) => { const out = {}; ['seller', 'supervisor', 'manager'].forEach((r) => { out[r] = {}; T.CAPS.forEach((c) => { out[r][c] = T.can(perms, r, c); }); }); return out; };
  // The business code: six letters, none that look alike (no I or O), easy to read out loud
  const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  T.genCode = (rnd) => { const r = rnd || Math.random; let s = ''; for (let i = 0; i < 6; i++) s += LETTERS[Math.floor(r() * LETTERS.length)]; return s; };
  T.normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  T.validCode = (s) => /^[A-Z0-9]{6,7}$/.test(T.normCode(s)) && T.normCode(s).length === String(T.normCode(s)).length;
  // The people of a workspace, best rank first: [{uid, rank, name}]
  T.people = (members, names) => Object.keys(members || {}).map((uid) => ({ uid, rank: members[uid], name: (names && names[uid]) || '' })).sort((a, b) => T.rankIndex(b.rank) - T.rankIndex(a.rank) || String(a.name).localeCompare(String(b.name)));
  // Moving the business to someone: only a member who is not the Owner already; the old Owner becomes a Manager
  T.transferChanges = (members, fromUid, toUid) => {
    if (!members || members[fromUid] !== 'owner') return null;
    if (!toUid || toUid === fromUid || !T.isRank(members[toUid])) return null;
    return { to: 'owner', from: 'manager' };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = T; else root.Team = T;
})(typeof window !== 'undefined' ? window : globalThis);

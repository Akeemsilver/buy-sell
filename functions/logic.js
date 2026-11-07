/* The rules behind the "hide ordered items" function, kept apart from Firebase so they can be tested in Node. */
// The item numbers inside an order.
const idsOf = (order) => ((order && order.items) || []).map((i) => i && i.id).filter((x) => typeof x === 'string' && x);
// A new order holds its items back from the store; once it is answered (accepted, declined, cancelled, handed over) they are let go:
// sold items stay off the store because the owner's app leaves them out, declined or cancelled ones come back.
const release = (before, after) => (before && after && before.status === 'new' && after.status !== 'new' ? idsOf(after) : []);
module.exports = { idsOf, release };

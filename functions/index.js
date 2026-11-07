/* Hides items from the store the moment someone orders them, even when the owner's app is closed.
   stores/{store}.reserved holds the item numbers of orders that have not been answered yet; the store page leaves them out.
   The owner's app does the same while it is open, so the two always agree. */
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { idsOf, release } = require('./logic');
admin.initializeApp();
const store = (sid) => admin.firestore().doc('stores/' + sid);

exports.holdOrderedItems = onDocumentCreated('stores/{sid}/orders/{oid}', async (event) => {
  const order = event.data && event.data.data(), ids = idsOf(order);
  if (!order || order.status !== 'new' || !ids.length) return;
  await store(event.params.sid).update({ reserved: admin.firestore.FieldValue.arrayUnion(...ids) });
});

exports.releaseAnsweredItems = onDocumentUpdated('stores/{sid}/orders/{oid}', async (event) => {
  const ids = release(event.data.before.data(), event.data.after.data());
  if (!ids.length) return;
  await store(event.params.sid).update({ reserved: admin.firestore.FieldValue.arrayRemove(...ids) });
});

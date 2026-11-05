/* The public online store page. Reads the catalogue the owner published (name, price, sale price, small picture) and sends orders.
   No sign-in. Nothing private is ever here: costs and profit are not published. */
(function () {
  const CONFIG = { apiKey: 'AIzaSyAfAEJ1Yy8DtQg0LDS_bkTFLgHx0d3ym8g', authDomain: 'b-ruiz.firebaseapp.com', projectId: 'b-ruiz', storageBucket: 'b-ruiz.firebasestorage.app', messagingSenderId: '252946775951', appId: '1:252946775951:web:735af0ffbe69d9966a15fa' };
  const SC = window.StoreCore, $app = document.getElementById('app');
  const ES = /^es/i.test(navigator.language || '');
  const T = ES ? { arriving: 'Llega pronto', all: 'Todo', avail: 'Disponible', soon: 'Llega pronto', onSale: 'En oferta', items: (n) => n + (n === 1 ? ' artículo' : ' artículos'), order: 'Pedir →', yourOrder: 'Tu pedido', where: '¿Dónde estás?', choose: 'Elige un lugar', pickup: 'Recoger', delivery: 'Entrega a tu puerta', free: 'Gratis', details: 'Tus datos', name: 'Nombre', phone: 'Teléfono (WhatsApp)', sub: 'Artículos', deliv: 'Entrega', total: 'Total', place: 'Hacer pedido', sending: 'Enviando…', payNote: 'Pagas cuando el vendedor confirme tu pedido.', sent: '¡Pedido enviado!', ordNo: 'Tu número de pedido es', willMsg: 'te escribirá al', toConfirm: 'para confirmar.', wa: 'Escríbenos por WhatsApp', keep: 'Seguir comprando', closed: 'La tienda está cerrada', closedText: 'Vuelve más tarde.', nf: 'Tienda no encontrada', nfText: 'Revisa el enlace.', empty: 'No hay artículos por ahora.', e_name: 'Escribe tu nombre.', e_phone: 'Escribe un teléfono válido.', e_loc: 'Elige dónde estás y cómo recibirlo.', e_fail: 'No se pudo enviar. Inténtalo otra vez o escribe al vendedor.', typeArea: 'Tu zona', gone: 'Ya no está disponible', pickedN: (n) => n + ' seleccionados' }
    : { arriving: 'Arriving soon', all: 'All', avail: 'Available', soon: 'Arriving soon', onSale: 'On sale', items: (n) => n + (n === 1 ? ' item' : ' items'), order: 'Order →', yourOrder: 'Your order', where: 'Where are you?', choose: 'Choose a location', pickup: 'Pick up', delivery: 'Delivery to your door', free: 'Free', details: 'Your details', name: 'Name', phone: 'Phone (WhatsApp)', sub: 'Items', deliv: 'Delivery', total: 'Total', place: 'Place order', sending: 'Sending…', payNote: 'You pay when the seller confirms your order.', sent: 'Order sent!', ordNo: 'Your order number is', willMsg: 'will message you on', toConfirm: 'to confirm.', wa: 'Message us on WhatsApp', keep: 'Keep shopping', closed: 'The store is closed', closedText: 'Please come back later.', nf: 'Store not found', nfText: 'Please check the link.', empty: 'Nothing for sale right now.', e_name: 'Please enter your name.', e_phone: 'Please enter a valid phone number.', e_loc: 'Choose where you are and how you want it.', e_fail: 'Could not send. Please try again or message the seller.', typeArea: 'Your area', gone: 'No longer available', pickedN: (n) => n + ' selected' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => 'TT$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sid = new URLSearchParams(location.search).get('s') || '';
  let db = null, store = null, items = [], cart = new Set(), filter = 'all', view = 'shop', form = { loc: '', option: '', area: '', name: '', phone: '' }, err = '', sending = false, done = null;
  try { const me = JSON.parse(localStorage.getItem('buy-sell-store-me')); if (me) { form.name = me.name || ''; form.phone = me.phone || ''; } } catch (e) { /* none */ }

  const msg = (b, t) => { $app.innerHTML = `<div class="msg"><b>${esc(b)}</b>${esc(t || '')}</div>`; };
  const header = (back) => `<div class="sh">${back ? `<button class="back" data-a="back" aria-label="Back">‹</button>` : `<span class="lg">${esc((store.name || '?').trim().charAt(0).toUpperCase())}</span>`}<h1>${esc(back ? T.yourOrder : store.name || '')}</h1></div>`;
  const chosen = () => items.filter((i) => cart.has(i.id));
  const loc = () => (store.locations || []).find((l) => l.id === form.loc);

  function shop() {
    const list = items.filter((i) => filter === 'all' || (filter === 'avail' && !i.transit) || (filter === 'soon' && i.transit) || (filter === 'sale' && i.sale > 0));
    const sum = SC.totals(chosen(), null, '').sub, hasSoon = items.some((i) => i.transit), hasSale = items.some((i) => i.sale > 0);
    const chips = [['all', T.all], ['avail', T.avail], hasSoon ? ['soon', T.soon] : null, hasSale ? ['sale', T.onSale] : null].filter(Boolean);
    $app.innerHTML = `${header(false)}<div class="chips">${chips.map(([k, l]) => `<button class="${filter === k ? 'on' : ''}" data-a="filter" data-k="${k}">${l}</button>`).join('')}</div>
      ${list.length ? `<div class="grid">${list.map((i) => `<button class="gi ${cart.has(i.id) ? 'on' : ''}" data-a="pick" data-k="${esc(i.id)}"><div class="im">${i.img ? `<img src="${i.img}" alt="">` : '·'}${i.sale > 0 ? `<span class="sale">−${i.pct}%</span>` : ''}${i.transit ? `<span class="tag">${T.arriving}</span>` : ''}<span class="pick">${cart.has(i.id) ? '✓' : ''}</span></div><div class="tx"><b>${esc(i.name)}</b><div class="pr">${money(SC.payPrice(i))}${i.sale > 0 ? `<s>${money(i.price)}</s>` : ''}</div></div></button>`).join('')}</div>` : `<div class="msg">${T.empty}</div>`}
      ${cart.size ? `<button class="cartbar" data-a="order"><div>${T.items(cart.size)}<small>${money(sum)}</small></div><span class="go">${T.order}</span></button>` : ''}`;
  }
  function order() {
    const its = chosen(), l = loc(), locs = store.locations || [], opts = SC.options(l), t = SC.totals(its, l, form.option);
    const free = !locs.length;   // no locations set up: the customer types their area and the seller arranges delivery
    $app.innerHTML = `${header(true)}<div class="pg"><div class="bx">${its.map((i) => `<div class="ln">${i.img ? `<img src="${i.img}" alt="">` : '<span class="ph"></span>'}<div class="t"><b>${esc(i.name)}</b><small>${i.transit ? T.arriving : T.avail}</small></div><span class="p">${money(SC.payPrice(i))}</span><button class="rm" data-a="rm" data-k="${esc(i.id)}" aria-label="Remove">✕</button></div>`).join('')}</div>
      <h2>${T.where}</h2>
      ${free ? `<div class="fld"><input id="f-area" value="${esc(form.area)}" placeholder="${T.typeArea}" autocomplete="off"></div>` : `<div class="fld"><select id="f-loc"><option value="">${T.choose}</option>${locs.map((x) => `<option value="${esc(x.id)}" ${x.id === form.loc ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>${opts.map((o) => `<button class="opt ${form.option === o.key ? 'on' : ''}" data-a="opt" data-k="${o.key}"><i></i><span>${o.key === 'pickup' ? T.pickup : T.delivery}</span><b>${o.price > 0 ? money(o.price) : T.free}</b></button>`).join('')}`}
      <h2>${T.details}</h2><div class="fld"><label>${T.name}</label><input id="f-name" value="${esc(form.name)}" autocomplete="name"></div><div class="fld"><label>${T.phone}</label><input id="f-phone" type="tel" inputmode="tel" value="${esc(form.phone)}" autocomplete="tel"></div>
      <div class="tot"><span>${T.sub}</span><span>${money(free ? SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub : t.sub)}</span></div>${free ? '' : `<div class="tot"><span>${T.deliv}</span><span>${money(t.delivery)}</span></div>`}<div class="tot big"><span>${T.total}</span><span>${money(free ? SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub : t.total)}</span></div>
      ${err ? `<div class="err">${esc(err)}</div>` : ''}<button class="big-btn" data-a="send" ${sending ? 'disabled' : ''}>${sending ? T.sending : T.place}</button><p class="note">${T.payNote}</p></div>`;
  }
  function finished() {
    const wa = SC.digits(store.whatsapp) ? SC.waLink(store.whatsapp, (ES ? 'Hola, acabo de hacer el pedido ' : 'Hi, I just placed order ') + done.code + ' (' + done.name + ').') : '';
    $app.innerHTML = `${header(false)}<div class="pg" style="text-align:center"><div class="ok">✓</div><h2 style="text-transform:none;letter-spacing:0;font-size:22px;color:var(--ink);margin:0 0 6px">${T.sent}</h2><p style="color:var(--mute);margin:0 0 14px">${T.ordNo} <b style="color:var(--ink)">${esc(done.code)}</b>. ${esc(store.name)} ${T.willMsg} <b style="color:var(--ink)">${esc(done.phone)}</b> ${T.toConfirm}</p>
      <div class="bx" style="text-align:left"><div class="ln"><div class="t"><b>${T.items(done.n)}</b><small>${esc(done.where)}</small></div><span class="p">${money(done.total)}</span></div></div>${wa ? `<a class="wa" href="${wa}" target="_blank" rel="noopener">${T.wa}</a>` : ''}<button class="big-btn ghost" data-a="again">${T.keep}</button></div>`;
  }
  const draw = () => (view === 'shop' ? shop() : view === 'order' ? order() : finished());

  async function send() {
    if (sending) return; const its = chosen(), l = loc(), free = !(store.locations || []).length;
    form.name = document.getElementById('f-name').value; form.phone = document.getElementById('f-phone').value; if (free) form.area = document.getElementById('f-area').value;
    const t = free ? { sub: SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub, delivery: 0, total: SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub } : SC.totals(its, l, form.option);
    const o = { name: form.name.trim(), phone: form.phone.trim(), items: its, location: free ? form.area.trim() : (l ? l.name : ''), option: free ? 'delivery' : form.option };
    const bad = SC.checkOrder(o); err = bad === 'name' ? T.e_name : bad === 'phone' ? T.e_phone : bad ? T.e_loc : (!free && !t.valid ? T.e_loc : '');
    if (err) return order();
    sending = true; order();
    try {
      const id = SC.newId(14), code = SC.orderCode(id);
      await db.collection('stores').doc(sid).collection('orders').doc(id).set({ code, items: its.map((i) => ({ id: i.id, name: i.name, price: SC.payPrice(i) })), location: o.location, option: o.option, deliveryPrice: t.delivery, name: o.name, phone: o.phone, total: t.total, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      try { localStorage.setItem('buy-sell-store-me', JSON.stringify({ name: o.name, phone: o.phone })); } catch (e) { /* ignore */ }
      done = { code, name: o.name, phone: o.phone, n: its.length, total: t.total, where: (o.option === 'pickup' ? T.pickup : T.delivery) + ' · ' + o.location }; cart = new Set(); view = 'done'; err = '';
    } catch (e) { err = T.e_fail; }
    sending = false; draw(); window.scrollTo(0, 0);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, k = b.dataset.k;
    if (a === 'filter') { filter = k; shop(); }
    else if (a === 'pick') { cart.has(k) ? cart.delete(k) : cart.add(k); const y = window.scrollY; shop(); window.scrollTo(0, y); }
    else if (a === 'order') { view = 'order'; err = ''; order(); window.scrollTo(0, 0); }
    else if (a === 'back') { view = 'shop'; shop(); }
    else if (a === 'rm') { cart.delete(k); if (!cart.size) { view = 'shop'; shop(); } else order(); }
    else if (a === 'opt') { form.option = k; keep(); order(); }
    else if (a === 'send') send();
    else if (a === 'again') { view = 'shop'; shop(); window.scrollTo(0, 0); }
  });
  const keep = () => { const n = document.getElementById('f-name'), p = document.getElementById('f-phone'), ar = document.getElementById('f-area'); if (n) form.name = n.value; if (p) form.phone = p.value; if (ar) form.area = ar.value; };
  document.addEventListener('change', (e) => { if (e.target.id === 'f-loc') { keep(); form.loc = e.target.value; const l = loc(), o = SC.options(l); form.option = o.length ? o[o.length - 1].key : ''; order(); } });

  async function boot() {
    if (!sid) return msg(T.nf, T.nfText);
    try {
      firebase.initializeApp(CONFIG); db = firebase.firestore();
      const snap = await db.collection('stores').doc(sid).get(); if (!snap.exists) return msg(T.nf, T.nfText);
      store = snap.data(); document.title = store.name || 'Store';
      if (store.color) { document.documentElement.style.setProperty('--brand', store.color); document.documentElement.style.setProperty('--tint', 'color-mix(in srgb,' + store.color + ' 10%,#fff)'); }
      if (store.open === false) return msg(T.closed, T.closedText);
      const docs = await Promise.all(Array.from({ length: store.chunks || 0 }, (_, i) => db.collection('stores').doc(sid).collection('catalog').doc('c' + i).get()));
      items = docs.filter((d) => d.exists).flatMap((d) => d.data().items || []).sort((a, b) => String(a.id).localeCompare(String(b.id)));
      shop();
    } catch (e) { msg(T.nf, T.nfText); }
  }
  boot();
})();

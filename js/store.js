/* The public online store page. Reads the catalogue the owner published (name, price, sale price, small picture) and sends orders.
   No sign-in. Nothing private is ever here: costs and profit are not published. */
(function () {
  const CONFIG = { apiKey: 'AIzaSyAfAEJ1Yy8DtQg0LDS_bkTFLgHx0d3ym8g', authDomain: 'b-ruiz.firebaseapp.com', projectId: 'b-ruiz', storageBucket: 'b-ruiz.firebasestorage.app', messagingSenderId: '252946775951', appId: '1:252946775951:web:735af0ffbe69d9966a15fa' };
  const SC = window.StoreCore, $app = document.getElementById('app');
  // The phone's first language decides: any Spanish (es, es-419, es-MX…) opens in Spanish, everything else in English.
  const ES = /^es\b/i.test(((navigator.languages && navigator.languages[0]) || navigator.language || 'en').replace('_', '-'));
  document.documentElement.lang = ES ? 'es' : 'en';
  const T = ES ? { qty: 'Cantidad', size: 'Talla', addOrder: 'Agregar al pedido', arriving: 'Llega pronto', all: 'Todo', avail: 'Disponible', soon: 'Llega pronto', onSale: 'En oferta', items: (n) => n + (n === 1 ? ' artículo' : ' artículos'), order: 'Pedir →', yourOrder: 'Tu pedido', where: '¿Dónde estás?', choose: 'Elige un lugar', pickup: 'Recoger', delivery: 'Entrega a tu puerta', free: 'Gratis', details: 'Tus datos', name: 'Nombre', phone: 'Teléfono (WhatsApp)', sub: 'Artículos', deliv: 'Entrega', total: 'Total', place: 'Hacer pedido', sending: 'Enviando…', payNote: 'Pagas cuando el vendedor confirme tu pedido.', sent: '¡Pedido enviado!', ordNo: 'Tu número de pedido es', willMsg: 'te escribirá al', toConfirm: 'para confirmar.', wa: 'Escríbenos por WhatsApp', keep: 'Seguir comprando', closed: 'La tienda está cerrada', closedText: 'Vuelve más tarde.', nf: 'Tienda no encontrada', nfText: 'Revisa el enlace.', empty: 'No hay artículos por ahora.', e_name: 'Escribe tu nombre.', e_phone: 'Escribe un teléfono válido.', e_loc: 'Elige dónde estás y cómo recibirlo.', e_fail: 'No se pudo enviar. Inténtalo otra vez o escribe al vendedor.', typeArea: 'Tu zona', gone: 'Ya no está disponible', pickedN: (n) => n + ' seleccionados' }
    : { qty: 'Quantity', size: 'Size', addOrder: 'Add to order', arriving: 'Arriving soon', all: 'All', avail: 'Available', soon: 'Arriving soon', onSale: 'On sale', items: (n) => n + (n === 1 ? ' item' : ' items'), order: 'Order →', yourOrder: 'Your order', where: 'Where are you?', choose: 'Choose a location', pickup: 'Pick up', delivery: 'Delivery to your door', free: 'Free', details: 'Your details', name: 'Name', phone: 'Phone (WhatsApp)', sub: 'Items', deliv: 'Delivery', total: 'Total', place: 'Place order', sending: 'Sending…', payNote: 'You pay when the seller confirms your order.', sent: 'Order sent!', ordNo: 'Your order number is', willMsg: 'will message you on', toConfirm: 'to confirm.', wa: 'Message us on WhatsApp', keep: 'Keep shopping', closed: 'The store is closed', closedText: 'Please come back later.', nf: 'Store not found', nfText: 'Please check the link.', empty: 'Nothing for sale right now.', e_name: 'Please enter your name.', e_phone: 'Please enter a valid phone number.', e_loc: 'Choose where you are and how you want it.', e_fail: 'Could not send. Please try again or message the seller.', typeArea: 'Your area', gone: 'No longer available', pickedN: (n) => n + ' selected' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nm = (i) => (ES && i.nameEs ? i.nameEs : i.name);
  const money = (n) => 'TT$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sid = new URLSearchParams(location.search).get('s') || '';
  let db = null, store = null, items = [], cart = new Map(), sheet = null, filter = 'all', view = 'shop', form = { loc: '', option: '', area: '', name: '', phone: '' }, err = '', sending = false, done = null;
  try { const me = JSON.parse(localStorage.getItem('buy-sell-store-me')); if (me) { form.name = me.name || ''; form.phone = me.phone || ''; } } catch (e) { /* none */ }

  const msg = (b, t) => { $app.innerHTML = `<div class="msg"><b>${esc(b)}</b>${esc(t || '')}</div>`; };
  const header = (back) => `<div class="sh">${back ? `<button class="back" data-a="back" aria-label="Back">‹</button>` : `<span class="lg">${esc((store.name || '?').trim().charAt(0).toUpperCase())}</span>`}<h1>${esc(back ? T.yourOrder : store.name || '')}</h1></div>`;
  // A card is one product; it lists its sizes and which items are behind each (older catalogues have one item per card).
  const sizesOf = (g) => g.sizes || [{ s: '', ids: [g.id] }];
  const sizeLabel = (z) => (ES && /^one size$/i.test(z) ? 'Talla única' : z);
  const totalIn = (g) => sizesOf(g).reduce((n, z) => n + z.ids.length, 0);
  const inCart = (g) => sizesOf(g).reduce((n, z) => n + (cart.get(g.id + '|' + z.s) || 0), 0);
  const cartCount = () => [...cart.values()].reduce((a, b) => a + b, 0);
  // Every unit the customer picked, as the real item behind it.
  const chosen = () => { const out = []; items.forEach((g) => sizesOf(g).forEach((z) => { const n = Math.min(cart.get(g.id + '|' + z.s) || 0, z.ids.length); for (let k = 0; k < n; k++) out.push({ id: z.ids[k], key: g.id + '|' + z.s, name: g.name, nameEs: g.nameEs, price: g.price, sale: g.sale, pct: g.pct, transit: g.transit, img: g.img, size: z.s }); })); return out; };
  const sheetHtml = () => {
    const g = items.find((x) => x.id === sheet.gid); if (!g) return '';
    const zs = sizesOf(g), tot = Object.values(sheet.d).reduce((a, b) => a + b, 0);
    return `<div class="scr" data-a="szx"></div><div class="shs"><div class="gr"></div><h3>${esc(nm(g))}</h3><div class="pr">${money(SC.payPrice(g))}${g.sale > 0 ? `<s>${money(g.price)}</s>` : ''}</div>
      ${zs.map((z, n) => `<div class="row"><b>${esc(z.s ? sizeLabel(z.s) : T.qty)}</b><div class="st"><button data-a="szm" data-i="${n}" aria-label="−" ${(sheet.d[z.s] || 0) ? '' : 'disabled'}>−</button><span>${sheet.d[z.s] || 0}</span><button data-a="szp" data-i="${n}" aria-label="+" ${(sheet.d[z.s] || 0) >= z.ids.length ? 'disabled' : ''}>+</button></div></div>`).join('')}
      <button class="go" data-a="szok">${T.addOrder}${tot ? ' · ' + T.items(tot) : ''}</button></div>`;
  };
  const loc = () => (store.locations || []).find((l) => l.id === form.loc);

  function shop() {
    const list = items.filter((i) => filter === 'all' || (filter === 'avail' && !i.transit) || (filter === 'soon' && i.transit) || (filter === 'sale' && i.sale > 0));
    const sum = SC.totals(chosen(), null, '').sub, nCart = cartCount(), hasSoon = items.some((i) => i.transit), hasSale = items.some((i) => i.sale > 0);
    const chips = [['all', T.all], ['avail', T.avail], hasSoon ? ['soon', T.soon] : null, hasSale ? ['sale', T.onSale] : null].filter(Boolean);
    $app.innerHTML = `${header(false)}<div class="chips">${chips.map(([k, l]) => `<button class="${filter === k ? 'on' : ''}" data-a="filter" data-k="${k}">${l}</button>`).join('')}</div>
      ${list.length ? `<div class="grid">${list.map((i) => `<button class="gi ${inCart(i) ? 'on' : ''}" data-a="pick" data-k="${esc(i.id)}"><div class="im">${i.img ? `<img src="${i.img}" alt="">` : '·'}${i.sale > 0 ? `<span class="sale">−${i.pct}%</span>` : ''}${i.transit ? `<span class="tag">${T.arriving}</span>` : ''}<span class="pick">${inCart(i) ? (inCart(i) > 1 ? inCart(i) : '✓') : ''}</span></div><div class="tx"><b>${esc(nm(i))}</b><div class="pr">${money(SC.payPrice(i))}${i.sale > 0 ? `<s>${money(i.price)}</s>` : ''}</div>${sizesOf(i).some((z) => z.s) ? `<div class="szl">${sizesOf(i).filter((z) => z.s).map((z) => `<span>${esc(sizeLabel(z.s))}</span>`).join('')}</div>` : ''}</div></button>`).join('')}</div>` : `<div class="msg">${T.empty}</div>`}
      ${nCart ? `<button class="cartbar" data-a="order"><div>${T.items(nCart)}<small>${money(sum)}</small></div><span class="go">${T.order}</span></button>` : ''}${sheet ? sheetHtml() : ''}`;
  }
  function order() {
    const its = chosen(), l = loc(), locs = store.locations || [], opts = SC.options(l), t = SC.totals(its, l, form.option);
    const free = !locs.length;   // no locations set up: the customer types their area and the seller arranges delivery
    $app.innerHTML = `${header(true)}<div class="pg"><div class="bx">${its.map((i) => `<div class="ln">${i.img ? `<img src="${i.img}" alt="">` : '<span class="ph"></span>'}<div class="t"><b>${esc(nm(i))}${i.size ? ' · ' + esc(sizeLabel(i.size)) : ''}</b><small>${i.transit ? T.arriving : T.avail}</small></div><span class="p">${money(SC.payPrice(i))}</span><button class="rm" data-a="rm" data-k="${esc(i.key)}" aria-label="Remove">✕</button></div>`).join('')}</div>
      <h2>${T.where}</h2>
      ${free ? `<div class="fld"><input id="f-area" value="${esc(form.area)}" placeholder="${T.typeArea}" autocomplete="off"></div>` : `<div class="fld"><select id="f-loc"><option value="">${T.choose}</option>${locs.map((x) => `<option value="${esc(x.id)}" ${x.id === form.loc ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>${opts.map((o) => `<button class="opt ${form.option === o.key ? 'on' : ''}" data-a="opt" data-k="${o.key}"><i></i><span>${o.key === 'pickup' ? T.pickup : T.delivery}</span><b>${o.price > 0 ? money(o.price) : T.free}</b></button>`).join('')}`}
      <h2>${T.details}</h2><div class="fld"><label>${T.name}</label><input id="f-name" value="${esc(form.name)}" autocomplete="name"></div><div class="fld"><label>${T.phone}</label><input id="f-phone" type="tel" inputmode="tel" enterkeyhint="done" value="${esc(form.phone)}" autocomplete="tel"></div>
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
      await db.collection('stores').doc(sid).collection('orders').doc(id).set({ code, items: its.map((i) => Object.assign({ id: i.id, name: i.name, price: SC.payPrice(i) }, i.size ? { size: i.size } : {})), location: o.location, option: o.option, deliveryPrice: t.delivery, name: o.name, phone: o.phone, total: t.total, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      try { localStorage.setItem('buy-sell-store-me', JSON.stringify({ name: o.name, phone: o.phone })); } catch (e) { /* ignore */ }
      done = { code, name: o.name, phone: o.phone, n: its.length, total: t.total, where: (o.option === 'pickup' ? T.pickup : T.delivery) + ' · ' + o.location }; cart = new Map(); sheet = null; view = 'done'; err = '';
    } catch (e) { err = T.e_fail; }
    sending = false; draw(); window.scrollTo(0, 0);
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.id === 'f-phone') { e.preventDefault(); e.target.blur(); } });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, k = b.dataset.k;
    if (a === 'filter') { filter = k; shop(); }
    else if (a === 'pick') {
      const g = items.find((x) => x.id === k), y = window.scrollY; if (!g) return;
      if (totalIn(g) === 1) { const key = g.id + '|' + sizesOf(g)[0].s; cart.has(key) ? cart.delete(key) : cart.set(key, 1); }
      else { sheet = { gid: g.id, d: {} }; sizesOf(g).forEach((z) => { const n = cart.get(g.id + '|' + z.s) || 0; if (n) sheet.d[z.s] = n; }); }
      shop(); window.scrollTo(0, y);
    }
    else if (a === 'szp' || a === 'szm') { const g = items.find((x) => x.id === sheet.gid), z = sizesOf(g)[Number(b.dataset.i)], n = sheet.d[z.s] || 0, y = window.scrollY; sheet.d[z.s] = Math.max(0, Math.min(z.ids.length, n + (a === 'szp' ? 1 : -1))); shop(); window.scrollTo(0, y); }
    else if (a === 'szok') { const g = items.find((x) => x.id === sheet.gid), y = window.scrollY; sizesOf(g).forEach((z) => { const n = sheet.d[z.s] || 0, key = g.id + '|' + z.s; if (n) cart.set(key, n); else cart.delete(key); }); sheet = null; shop(); window.scrollTo(0, y); }
    else if (a === 'szx') { const y = window.scrollY; sheet = null; shop(); window.scrollTo(0, y); }
    else if (a === 'order') { view = 'order'; err = ''; order(); window.scrollTo(0, 0); }
    else if (a === 'back') { view = 'shop'; shop(); }
    else if (a === 'rm') { const n = cart.get(k) || 0; if (n > 1) cart.set(k, n - 1); else cart.delete(k); if (!cartCount()) { view = 'shop'; shop(); } else order(); }
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

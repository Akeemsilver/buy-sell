/* The public online store page. Reads the catalogue the owner published (name, price, sale price, picture, sizes, details) and sends orders.
   No sign-in. Nothing private is ever here: costs and profit are not published.
   Pages: the shop (grid, search, sort, saved), one item (size, details, add to cart), the cart (drawer on a computer), the order form. */
(function () {
  const CONFIG = { apiKey: 'AIzaSyAfAEJ1Yy8DtQg0LDS_bkTFLgHx0d3ym8g', authDomain: 'b-ruiz.firebaseapp.com', projectId: 'b-ruiz', storageBucket: 'b-ruiz.firebasestorage.app', messagingSenderId: '252946775951', appId: '1:252946775951:web:735af0ffbe69d9966a15fa' };
  const SC = window.StoreCore, $app = document.getElementById('app');
  // The phone's first language decides: any Spanish (es, es-419, es-MX…) opens in Spanish, everything else in English.
  const ES = /^es\b/i.test(((navigator.languages && navigator.languages[0]) || navigator.language || 'en').replace('_', '-'));
  document.documentElement.lang = ES ? 'es' : 'en';
  const T = ES ? { last: 'Última pieza', only: (n) => 'Quedan ' + n, qty: 'Cantidad', size: 'Talla', arriving: 'Llega pronto', all: 'Todo', avail: 'Disponible', soon: 'Llega pronto', onSale: 'En oferta', items: (n) => n + (n === 1 ? ' artículo' : ' artículos'), yourOrder: 'Tu pedido', where: '¿Dónde estás?', choose: 'Elige un lugar', pickup: 'Recoger', delivery: 'Entrega a tu puerta', free: 'Gratis', details: 'Tus datos', name: 'Nombre', phone: 'Teléfono (WhatsApp)', sub: 'Artículos', deliv: 'Entrega', total: 'Total', place: 'Hacer pedido', sending: 'Enviando…', payNote: 'Pagas cuando el vendedor confirme tu pedido.', sent: '¡Pedido enviado!', ordNo: 'Tu número de pedido es', willMsg: 'te escribirá al', toConfirm: 'para confirmar.', wa: 'Escríbenos por WhatsApp', keep: 'Seguir comprando', closed: 'La tienda está cerrada', closedText: 'Vuelve más tarde.', nf: 'Tienda no encontrada', nfText: 'Revisa el enlace.', empty: 'No hay artículos por ahora.', e_name: 'Escribe tu nombre.', e_phone: 'Escribe un teléfono válido.', e_loc: 'Elige dónde estás y cómo recibirlo.', e_fail: 'No se pudo enviar. Inténtalo otra vez o escribe al vendedor.', typeArea: 'Tu zona', gone: 'Ya no está disponible',
      search: 'Buscar en la tienda', saved: 'Guardados', sort: 'Ordenar', sortDef: 'Destacados', sortLow: 'Precio: menor a mayor', sortHigh: 'Precio: mayor a menor', addCart: 'Agregar al carrito', added: 'Agregado al carrito', pickSize: 'Elige una talla', detailsH: 'Detalles', pickDel: 'Recoger y entrega', waConfirm: 'Pedido confirmado por WhatsApp', payOn: 'Pagas al recoger o al recibir', cart: 'Carrito', checkout: 'Hacer pedido', none: 'Nada coincide con tu búsqueda', noSaved: 'Aún no guardaste nada. Toca el corazón en un artículo.', heroWa: 'Elige tu talla y haz tu pedido. Confirmamos por WhatsApp.', hero: 'Elige tu talla y haz tu pedido.', home: 'Inicio', back: 'Atrás', close: 'Cerrar', deliveryFrom: (p) => 'Entrega desde ' + p, pickupFree: 'Recoger en', viewCart: 'Ver carrito', more: 'Seguir mirando', sizes: 'Tallas', remember: 'Guardado solo en este teléfono', forget: 'Olvidar mis datos', cancelMsg: 'Cambiar o cancelar este pedido', copyNo: 'Copiar número de pedido', copied: 'Número de pedido copiado', moreAria: 'Más', cancelNote: 'Puedes cancelar el pedido hasta que lo confirmemos. Guarda tu número de pedido.', e_taken: 'Algunos artículos acaban de ser pedidos por otra persona y se quitaron de tu pedido.', waCancel: (c) => 'Hola, quiero cambiar o cancelar mi pedido ' + c + '.' }
    : { last: 'Last one', only: (n) => 'Only ' + n + ' left', qty: 'Quantity', size: 'Size', arriving: 'Arriving soon', all: 'All', avail: 'Available', soon: 'Arriving soon', onSale: 'On sale', items: (n) => n + (n === 1 ? ' item' : ' items'), yourOrder: 'Your order', where: 'Where are you?', choose: 'Choose a location', pickup: 'Pick up', delivery: 'Delivery to your door', free: 'Free', details: 'Your details', name: 'Name', phone: 'Phone (WhatsApp)', sub: 'Items', deliv: 'Delivery', total: 'Total', place: 'Place order', sending: 'Sending…', payNote: 'You pay when the seller confirms your order.', sent: 'Order sent!', ordNo: 'Your order number is', willMsg: 'will message you on', toConfirm: 'to confirm.', wa: 'Message us on WhatsApp', keep: 'Keep shopping', closed: 'The store is closed', closedText: 'Please come back later.', nf: 'Store not found', nfText: 'Please check the link.', empty: 'Nothing for sale right now.', e_name: 'Please enter your name.', e_phone: 'Please enter a valid phone number.', e_loc: 'Choose where you are and how you want it.', e_fail: 'Could not send. Please try again or message the seller.', typeArea: 'Your area', gone: 'No longer available',
      search: 'Search the store', saved: 'Saved', sort: 'Sort', sortDef: 'Featured', sortLow: 'Price: low to high', sortHigh: 'Price: high to low', addCart: 'Add to cart', added: 'Added to cart', pickSize: 'Choose a size', detailsH: 'Details', pickDel: 'Pickup & delivery', waConfirm: 'Order confirmed on WhatsApp', payOn: 'Pay on pickup or delivery', cart: 'Cart', checkout: 'Checkout', none: 'Nothing matches your search', noSaved: 'Nothing saved yet. Tap the heart on an item.', heroWa: 'Pick your size and place your order. We confirm on WhatsApp.', hero: 'Pick your size and place your order.', home: 'Home', back: 'Back', close: 'Close', deliveryFrom: (p) => 'Delivery from ' + p, pickupFree: 'Pickup in', viewCart: 'View cart', more: 'Keep browsing', sizes: 'Sizes', remember: 'Saved on this phone only', forget: 'Forget my details', cancelMsg: 'Change or cancel this order', copyNo: 'Copy order number', copied: 'Order number copied', moreAria: 'More', cancelNote: 'Orders can be cancelled until we confirm them. Keep your order number.', e_taken: 'Some items were just ordered by someone else and were taken out of your order.', waCancel: (c) => 'Hi, I would like to change or cancel my order ' + c + '.' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nm = (i) => (ES && i.nameEs ? i.nameEs : i.name);
  const det = (i) => String((ES && i.detailsEs) || i.details || '').trim();
  const money = (n) => 'TT$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sid = new URLSearchParams(location.search).get('s') || '';
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  let db = null, store = null, items = [], cart = new Map(), filter = 'all', view = 'shop', cur = null, pick = { s: '', q: 1, tried: false }, qs = '', sortBy = 'def', onlySaved = false, drawer = false, searchOpen = false, shopY = 0, toastT = null;
  let form = { loc: '', option: '', area: '', name: '', phone: '' }, err = '', sending = false, done = null;
  try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
  const SAVEKEY = 'buy-sell-store-saved:' + sid;
  let saved = new Set(); try { saved = new Set(JSON.parse(localStorage.getItem(SAVEKEY)) || []); } catch (e) { /* none */ }
  let remembered = false;   // name and phone typed on a past order stay in THIS phone's browser only (never shared), so the next order is quicker
  try { const me = JSON.parse(localStorage.getItem('buy-sell-store-me')); if (me) { form.name = me.name || ''; form.phone = me.phone || ''; remembered = !!(form.name || form.phone); } } catch (e) { /* none */ }

  const ICON = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.4-9 9-9 9z"/></svg>',
    cart: '<svg viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.5 12h11l2-8H6"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>', x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };
  const msg = (b, t) => { $app.innerHTML = `<div class="msg"><b>${esc(b)}</b>${esc(t || '')}</div>`; };
  // A card is one product; it lists its sizes and which items are behind each (older catalogues have one item per card).
  const sizesOf = (g) => g.sizes || [{ s: '', ids: [g.id] }];
  const sizeLabel = (z) => (ES && /^one size$/i.test(z) ? 'Talla única' : z);
  const totalIn = (g) => sizesOf(g).reduce((n, z) => n + z.ids.length, 0);
  const inCart = (g) => sizesOf(g).reduce((n, z) => n + (cart.get(g.id + '|' + z.s) || 0), 0);
  const cartCount = () => [...cart.values()].reduce((a, b) => a + b, 0);
  const effPrice = (g) => SC.payPrice(g);
  // Every unit the customer picked, as the real item behind it.
  const chosen = () => { const out = []; items.forEach((g) => sizesOf(g).forEach((z) => { const n = Math.min(cart.get(g.id + '|' + z.s) || 0, z.ids.length); for (let k = 0; k < n; k++) out.push({ id: z.ids[k], key: g.id + '|' + z.s, name: g.name, nameEs: g.nameEs, price: g.price, sale: g.sale, pct: g.pct, transit: g.transit, img: g.img, size: z.s }); })); return out; };
  const loc = () => (store.locations || []).find((l) => l.id === form.loc);
  // Items inside an order that has not been answered yet are held back: a size with none left is dropped, and a card with no size left too.
  const hideTaken = (list, taken) => list.map((g) => Object.assign({}, g, { sizes: sizesOf(g).map((z) => ({ s: z.s, ids: z.ids.filter((x) => !taken.has(x)) })).filter((z) => z.ids.length) })).filter((g) => g.sizes.length);
  const toast = (t) => { let el = document.getElementById('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); } el.textContent = '✓ ' + t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 1800); };
  const persistSaved = () => { try { localStorage.setItem(SAVEKEY, JSON.stringify([...saved])); } catch (e) { /* ignore */ } };

  /* ---------- shared pieces ---------- */
  const annText = () => {
    const locs = store.locations || [], pk = locs.some((l) => l.pickup), dl = locs.filter((l) => l.delivery);
    const parts = []; if (pk) parts.push('<b>' + T.pickup + '</b>'); if (dl.length) parts.push(T.deliveryFrom(money(Math.min(...dl.map((l) => Number(l.price) || 0)))));
    if (store.whatsapp && SC.digits(store.whatsapp)) parts.push(ES ? 'Confirmamos por WhatsApp' : 'We confirm on WhatsApp');
    return parts.join(' · ');
  };
  // The order-sent page: a three-dots menu in the top bar holds Change or cancel (a WhatsApp message to the store) and Copy order number.
  const orderMenu = () => `<div class="mnu" id="mnu" hidden>${SC.digits(store.whatsapp) ? `<a data-a="menuclose" href="${SC.waLink(store.whatsapp, T.waCancel(done.code))}" target="_blank" rel="noopener">${T.cancelMsg}</a>` : ''}<button type="button" data-a="copyno">${T.copyNo}</button></div>`;
  const closeMenu = () => { const m = document.getElementById('mnu'); if (m) m.hidden = true; };
  const header = (opts) => {
    opts = opts || {}; const n = cartCount();
    return `${annText() && !opts.slim ? `<div class="ann">${annText()}</div>` : ''}<div class="hd"><div class="in">
      ${opts.back ? `<button class="ic" data-a="${opts.back}" aria-label="${T.back}">${ICON.back}</button>` : ''}
      <button class="brand" data-a="home" aria-label="${T.home}"><span class="lg">${esc((store.name || '?').trim().charAt(0).toUpperCase())}</span><span class="nm">${esc(store.name || '')}</span></button>
      <div class="srch" id="srch">${ICON.search}<input id="q" value="${esc(qs)}" placeholder="${T.search}" autocomplete="off" enterkeyhint="search"></div>
      <button class="ic sbtn" data-a="srch" aria-label="${T.search}">${ICON.search}</button>
      <button class="ic ${onlySaved ? 'on' : ''}" data-a="saved" aria-label="${T.saved}">${ICON.heart}${saved.size ? `<b class="d"></b>` : ''}</button>
      <button class="ic" data-a="cart" aria-label="${T.cart}">${ICON.cart}${n ? `<b>${n}</b>` : ''}</button>${opts.menu ? `<button class="ic" data-a="menu" aria-label="${T.moreAria}">${ICON.dots}</button>` : ''}</div>
      ${searchOpen && view === 'shop' ? `<div class="msrch">${ICON.search}<input id="q2" value="${esc(qs)}" placeholder="${T.search}" autocomplete="off" enterkeyhint="search"></div>` : ''}${opts.menu ? orderMenu() : ''}</div>`;
  };
  const listNow = () => {
    const f = qs.trim().toLowerCase();
    let list = items.filter((i) => (filter === 'all' || (filter === 'avail' && !i.transit) || (filter === 'soon' && i.transit) || (filter === 'sale' && i.sale > 0)) && (!onlySaved || saved.has(i.id)) && (!f || (nm(i) + ' ' + i.name).toLowerCase().includes(f)));
    if (sortBy === 'low') list = list.slice().sort((a, b) => effPrice(a) - effPrice(b)); else if (sortBy === 'high') list = list.slice().sort((a, b) => effPrice(b) - effPrice(a));
    return list;
  };
  const card = (g) => {
    const left = store.showLeft && totalIn(g) <= 3 ? (totalIn(g) === 1 ? T.last : T.only(totalIn(g))) : '';
    const szs = sizesOf(g).map((z) => z.s).filter(Boolean).map(sizeLabel).join(' ');
    return `<button class="gi ${inCart(g) ? 'on' : ''}" data-a="open" data-k="${esc(g.id)}"><div class="im">${g.img ? `<img src="${g.img}" alt="" loading="lazy">` : '<span class="np">·</span>'}${g.sale > 0 ? `<span class="off">−${g.pct}%</span>` : ''}${g.transit ? `<span class="tag">${T.arriving}</span>` : left ? `<span class="tag">${left}</span>` : ''}<span class="hrt ${saved.has(g.id) ? 'on' : ''}" data-a="fav" data-k="${esc(g.id)}" role="button" aria-label="${T.saved}">${ICON.heart}</span></div>
      <div class="tx"><div class="t">${esc(nm(g))}</div><div class="p"><b class="${g.sale > 0 ? 's' : ''}">${money(effPrice(g))}</b>${g.sale > 0 ? `<s>${money(g.price)}</s>` : ''}</div>${szs ? `<div class="sz">${esc(szs)}</div>` : ''}</div></button>`;
  };
  const gridInner = () => { const l = listNow(); return l.length ? l.map(card).join('') : `<div class="none">${items.length ? (onlySaved && !saved.size ? T.noSaved : T.none) : T.empty}</div>`; };

  /* ---------- the shop ---------- */
  function shop() {
    const sum = SC.totals(chosen(), null, '').sub, nCart = cartCount(), hasSoon = items.some((i) => i.transit), hasSale = items.some((i) => i.sale > 0);
    const chips = [['all', T.all], ['avail', T.avail], hasSoon ? ['soon', T.soon] : null, hasSale ? ['sale', T.onSale] : null].filter(Boolean);
    const showHero = filter === 'all' && !qs && !onlySaved;
    $app.innerHTML = `${header()}<main class="wrap">
      ${showHero ? `<div class="hero"><h2>${esc(store.name || '')}</h2><p>${store.whatsapp && SC.digits(store.whatsapp) ? T.heroWa : T.hero}</p></div>` : ''}
      <div class="bar"><div class="chips">${chips.map(([k, l]) => `<button class="${filter === k ? 'on' : ''} ${k === 'sale' ? 'sl' : ''}" data-a="filter" data-k="${k}">${k === 'sale' ? '🔥 ' : ''}${l}</button>`).join('')}</div>
      <label class="sort"><span>${T.sort}</span><select id="sort"><option value="def" ${sortBy === 'def' ? 'selected' : ''}>${T.sortDef}</option><option value="low" ${sortBy === 'low' ? 'selected' : ''}>${T.sortLow}</option><option value="high" ${sortBy === 'high' ? 'selected' : ''}>${T.sortHigh}</option></select></label></div>
      <div class="sec"><h3>${onlySaved ? T.saved : T.all}</h3><span id="cnt">${T.items(listNow().length)}</span></div>
      <div class="grid" id="grid">${gridInner()}</div></main>
      <footer class="foot"><b>${esc(store.name || '')}</b></footer>
      ${nCart && !wide() ? `<button class="cartbar" data-a="order"><div>${T.items(nCart)}<small>${money(sum)}</small></div><span class="go">${T.checkout} →</span></button>` : ''}${drawer ? drawerHtml() : ''}<div class="toast" id="toast" hidden></div>`;
  }
  const refreshGrid = () => { const g = document.getElementById('grid'); if (g) { g.innerHTML = gridInner(); const c = document.getElementById('cnt'); if (c) c.textContent = T.items(listNow().length); } };

  /* ---------- one item ---------- */
  function itemView() {
    const g = items.find((x) => x.id === cur); if (!g) { view = 'shop'; return shop(); }
    const zs = sizesOf(g), real = zs.filter((z) => z.s), z = zs.find((x) => x.s === pick.s), max = z ? z.ids.length : 0, d = det(g);
    const locs = store.locations || [], pk = locs.filter((l) => l.pickup), dl = locs.filter((l) => l.delivery), wa = store.whatsapp && SC.digits(store.whatsapp);
    const left = store.showLeft && z && z.ids.length <= 3 ? (z.ids.length === 1 ? T.last : T.only(z.ids.length)) : '';
    const info = `<div class="pb"><div class="row"><span class="now ${g.sale > 0 ? 's' : ''}">${money(effPrice(g))}</span>${g.sale > 0 ? `<span class="was">${money(g.price)}</span><span class="pct">−${g.pct}%</span>` : ''}</div>
      <h1 class="ttl">${esc(nm(g))}</h1><div class="meta">${g.transit ? `<span class="tg">${T.arriving}</span>` : ''}${left ? `<span class="tg">${left}</span>` : ''}</div></div>
      ${real.length ? `<div class="blk ${pick.tried && !pick.s ? 'err' : ''}" id="szb"><h4>${T.size}${pick.tried && !pick.s ? `<span class="et">${T.pickSize}</span>` : ''}</h4><div class="sizes">${real.map((x) => `<button class="${pick.s === x.s ? 'on' : ''}" data-a="psz" data-s="${esc(x.s)}">${esc(sizeLabel(x.s))}</button>`).join('')}</div>
        ${max > 1 ? `<div class="qrow"><span>${T.qty}</span><div class="qty"><button data-a="pq" data-d="-1" aria-label="−" ${pick.q <= 1 ? 'disabled' : ''}>−</button><span>${pick.q}</span><button data-a="pq" data-d="1" aria-label="+" ${pick.q >= max ? 'disabled' : ''}>+</button></div></div>` : ''}</div>`
      : (max > 1 ? `<div class="blk"><div class="qrow"><span>${T.qty}</span><div class="qty"><button data-a="pq" data-d="-1" aria-label="−" ${pick.q <= 1 ? 'disabled' : ''}>−</button><span>${pick.q}</span><button data-a="pq" data-d="1" aria-label="+" ${pick.q >= max ? 'disabled' : ''}>+</button></div></div></div>` : '')}
      ${d ? `<div class="blk"><h4>${T.detailsH}</h4><ul class="dl">${d.split(/\n+/).filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${pk.length || dl.length || wa ? `<div class="blk"><h4>${T.pickDel}</h4>
        ${pk.length ? `<div class="sh"><i>📍</i><div>${T.pickupFree} ${esc(pk.map((l) => l.name).join(', '))}<span>${T.free}</span></div></div>` : ''}
        ${dl.length ? `<div class="sh"><i>🚚</i><div>${T.delivery}<span>${T.deliveryFrom(money(Math.min(...dl.map((l) => Number(l.price) || 0))))}</span></div></div>` : ''}
        ${wa ? `<div class="sh"><i>💬</i><div>${T.waConfirm}<span>${T.payOn}</span></div></div>` : ''}</div>` : ''}`;
    const addBtn = `<button class="btn" data-a="add">${T.addCart}<small>· ${money(effPrice(g))}</small></button>`;
    $app.innerHTML = `${header({ back: 'back', slim: !wide() })}<div class="it"><div class="crumb"><a data-a="home">${T.home}</a> › <b>${esc(nm(g))}</b></div>
      <div class="dsk"><div class="gal">${g.img ? `<img src="${g.img}" alt="">` : '<span class="np">·</span>'}</div><div class="info">${info}<div class="acts">${addBtn}<button class="hb ${saved.has(g.id) ? 'on' : ''}" data-a="fav" data-k="${esc(g.id)}" aria-label="${T.saved}">${ICON.heart}</button></div></div></div></div>
      <div class="buy"><button class="hb ${saved.has(g.id) ? 'on' : ''}" data-a="fav" data-k="${esc(g.id)}" aria-label="${T.saved}">${ICON.heart}</button>${addBtn}</div>${drawer ? drawerHtml() : ''}<div class="toast" id="toast" hidden></div>`;
  }

  /* ---------- cart ---------- */
  // One line per product and size, with a quantity stepper (the customer can take up to what is available).
  function lines() {
    const m = new Map(); chosen().forEach((u) => { const l = m.get(u.key) || Object.assign({ n: 0 }, u); l.n++; m.set(u.key, l); });
    return [...m.values()];
  }
  const lineHtml = (l) => { const g = items.find((x) => x.id === l.key.split('|')[0]), z = g && sizesOf(g).find((x) => x.s === l.size), max = z ? z.ids.length : l.n;
    return `<div class="ln">${l.img ? `<img src="${l.img}" alt="">` : '<span class="ph"></span>'}<div class="i"><div class="t">${esc(nm(l))}</div>${l.size ? `<span class="sz">${T.size} ${esc(sizeLabel(l.size))}</span>` : ''}${l.transit ? `<small class="mut">${T.arriving}</small>` : ''}
      <div class="pr"><b>${money(SC.payPrice(l))}</b><div class="qty"><button class="rm" data-a="rm" data-k="${esc(l.key)}" aria-label="−">${l.n === 1 ? '×' : '−'}</button><span>${l.n}</span><button data-a="inc" data-k="${esc(l.key)}" aria-label="+" ${l.n >= max ? 'disabled' : ''}>+</button></div></div></div></div>`; };
  const drawerHtml = () => { const ls = lines(), sub = SC.totals(chosen(), null, '').sub;
    return `<div class="veil" data-a="dx"></div><aside class="drawer"><div class="dh"><b>${T.cart} (${cartCount()})</b><button class="ic" data-a="dx" aria-label="${T.close}">${ICON.x}</button></div>
      <div class="body">${ls.length ? ls.map(lineHtml).join('') : `<div class="none">${T.empty}</div>`}</div>${ls.length ? `<div class="ft"><div class="tot"><span>${T.sub}</span><b>${money(sub)}</b></div><button class="big-btn" data-a="order">${T.checkout}</button></div>` : ''}</aside>`; };
  function order() {
    const its = chosen(), l = loc(), locs = store.locations || [], opts = SC.options(l), t = SC.totals(its, l, form.option);
    const free = !locs.length;   // no locations set up: the customer types their area and the seller arranges delivery
    $app.innerHTML = `${header({ back: 'back', slim: true })}<div class="pg"><h2 class="ph2">${T.yourOrder}</h2><div class="bx">${lines().map(lineHtml).join('')}</div>
      <h2>${T.where}</h2>
      ${free ? `<div class="fld"><input id="f-area" value="${esc(form.area)}" placeholder="${T.typeArea}" autocomplete="off"></div>` : `<div class="fld"><select id="f-loc"><option value="">${T.choose}</option>${locs.map((x) => `<option value="${esc(x.id)}" ${x.id === form.loc ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      ${l ? opts.map((o) => `<button class="opt ${form.option === o.key ? 'on' : ''}" data-a="opt" data-k="${o.key}"><i></i><span>${o.key === 'pickup' ? T.pickup : T.delivery}</span><b>${o.price ? money(o.price) : T.free}</b></button>`).join('') : ''}`}
      <h2>${T.details}</h2><div class="fld"><label>${T.name}</label><input id="f-name" value="${esc(form.name)}" autocomplete="name"></div><div class="fld"><label>${T.phone}</label><input id="f-phone" type="tel" inputmode="tel" enterkeyhint="done" value="${esc(form.phone)}" autocomplete="tel"></div>${remembered ? `<div class="rem"><span>🔒 ${T.remember}</span><a data-a="forget">${T.forget}</a></div>` : ''}
      <div class="tot"><span>${T.sub}</span><span>${money(free ? SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub : t.sub)}</span></div>${free ? '' : `<div class="tot"><span>${T.deliv}</span><span>${money(t.delivery)}</span></div>`}<div class="tot big"><span>${T.total}</span><span>${money(free ? SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub : t.total)}</span></div>
      ${err ? `<div class="err">${esc(err)}</div>` : ''}<button class="big-btn" data-a="send" ${sending ? 'disabled' : ''}>${sending ? T.sending : T.place}</button><p class="note">${T.payNote}</p></div>`;
  }
  function finished() {
    const wa = SC.digits(store.whatsapp) ? SC.waLink(store.whatsapp, (ES ? 'Hola, acabo de hacer el pedido ' : 'Hi, I just placed order ') + done.code + ' (' + done.name + ').') : '';
    $app.innerHTML = `${header({ slim: true, menu: true })}<div class="pg" style="text-align:center"><div class="ok">✓</div><h2 class="ph2" style="font-size:22px;margin:0 0 6px">${T.sent}</h2><p style="color:var(--mute);margin:0 0 14px">${T.ordNo} <b style="color:var(--ink)">${esc(done.code)}</b>. ${esc(store.name || '')} ${T.willMsg} <b style="color:var(--ink)">${esc(done.phone)}</b> ${T.toConfirm}</p>
      <div class="bx" style="text-align:left"><div class="ln"><div class="i"><div class="t">${T.items(done.n)}</div><small class="mut">${esc(done.where)}</small></div><b>${money(done.total)}</b></div></div>${wa ? `<a class="wa" href="${wa}" target="_blank" rel="noopener">${T.wa}</a>` : ''}<button class="big-btn ghost" data-a="again">${T.keep}</button><p class="note" style="margin-top:14px">${T.cancelNote}</p></div>`;
  }
  const draw = () => (view === 'shop' ? shop() : view === 'item' ? itemView() : view === 'order' ? order() : finished());
  const go = (v, push) => { view = v; if (push) { try { history.pushState({ v }, ''); } catch (e) { /* ignore */ } } draw(); window.scrollTo(0, v === 'shop' ? shopY : 0); };

  async function send() {
    if (sending) return; const its = chosen(), l = loc(), free = !(store.locations || []).length;
    form.name = document.getElementById('f-name').value; form.phone = document.getElementById('f-phone').value; if (free) form.area = document.getElementById('f-area').value;
    const t = free ? { sub: SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub, delivery: 0, total: SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub } : SC.totals(its, l, form.option);
    const o = { name: form.name.trim(), phone: form.phone.trim(), items: its, location: free ? form.area.trim() : (l ? l.name : ''), option: free ? 'delivery' : form.option };
    const bad = SC.checkOrder(o); err = bad === 'name' ? T.e_name : bad === 'phone' ? T.e_phone : bad ? T.e_loc : (!free && !t.valid ? T.e_loc : '');
    if (err) return order();
    sending = true; order();
    try {
      const fresh = await db.collection('stores').doc(sid).get(), taken = new Set(((fresh.data() || {}).reserved) || []), gone = its.filter((i) => taken.has(i.id));
      if (gone.length) {   // someone ordered it a moment ago: take it out of this order and say so
        gone.forEach((u) => { const n = cart.get(u.key) || 0; if (n > 1) cart.set(u.key, n - 1); else cart.delete(u.key); });
        items = hideTaken(items, taken); err = T.e_taken; sending = false; if (!cartCount()) { go('shop'); toast(T.e_taken); } else order(); return;
      }
      const id = SC.newId(14), code = SC.orderCode(id), doc = db.collection('stores').doc(sid).collection('orders').doc(id);
      const body = { code, items: its.map((i) => Object.assign({ id: i.id, name: i.name, price: SC.payPrice(i) }, i.size ? { size: i.size } : {})), location: o.location, option: o.option, deliveryPrice: t.delivery, name: o.name, phone: o.phone, total: t.total, status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp() };
      try { await doc.set(Object.assign({ lang: ES ? 'es' : 'en' }, body)); } catch (e) { if (e && e.code === 'permission-denied') await doc.set(body); else throw e; }   // older rules do not know the language field: send without it
      try { localStorage.setItem('buy-sell-store-me', JSON.stringify({ name: o.name, phone: o.phone })); } catch (e) { /* ignore */ }
      done = { code, name: o.name, phone: o.phone, n: its.length, total: t.total, where: (o.option === 'pickup' ? T.pickup : T.delivery) + ' · ' + o.location }; cart = new Map(); view = 'done'; err = '';
    } catch (e) { err = T.e_fail; }
    sending = false; draw(); window.scrollTo(0, 0);
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && (e.target.id === 'f-phone' || e.target.id === 'q' || e.target.id === 'q2')) { e.preventDefault(); e.target.blur(); } });
  document.addEventListener('input', (e) => { if (e.target.id === 'q' || e.target.id === 'q2') { qs = e.target.value; refreshGrid(); } });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#mnu, [data-a=menu]')) closeMenu();   // a tap anywhere else closes the menu
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, k = b.dataset.k;
    if (a === 'menu') { const m = document.getElementById('mnu'); if (m) m.hidden = !m.hidden; return; }
    if (a === 'menuclose') { closeMenu(); return; }
    if (a === 'copyno') { closeMenu(); try { navigator.clipboard.writeText(done.code); } catch (er) { /* ignore */ } toast(T.copied); return; }
    if (a === 'fav') { e.preventDefault(); if (saved.has(k)) saved.delete(k); else saved.add(k); persistSaved(); const y = window.scrollY; draw(); window.scrollTo(0, y); return; }
    if (a === 'filter') { filter = k; shop(); }
    else if (a === 'open') {
      const g = items.find((x) => x.id === k); if (!g) return; shopY = window.scrollY; cur = k; drawer = false;
      const real = sizesOf(g).filter((z) => z.s); pick = { s: real.length === 1 ? real[0].s : '', q: 1, tried: false }; go('item', true);
    }
    else if (a === 'psz') { pick.s = b.dataset.s; pick.q = 1; pick.tried = false; const y = window.scrollY; itemView(); window.scrollTo(0, y); }
    else if (a === 'pq') { const g = items.find((x) => x.id === cur), z = sizesOf(g).find((x) => x.s === pick.s), max = z ? z.ids.length : 1; pick.q = Math.max(1, Math.min(max, pick.q + Number(b.dataset.d))); const y = window.scrollY; itemView(); window.scrollTo(0, y); }
    else if (a === 'add') {
      const g = items.find((x) => x.id === cur), real = sizesOf(g).filter((z) => z.s);
      if (real.length && !pick.s) { pick.tried = true; itemView(); const r = document.getElementById('szb'); if (r) r.scrollIntoView({ block: 'center' }); return; }
      const z = sizesOf(g).find((x) => x.s === pick.s) || sizesOf(g)[0], key = g.id + '|' + z.s;
      cart.set(key, Math.min(z.ids.length, (cart.get(key) || 0) + pick.q)); pick.q = 1; const y = window.scrollY; itemView(); window.scrollTo(0, y); toast(T.added);
    }
    else if (a === 'srch') { searchOpen = !searchOpen; draw(); const q2 = document.getElementById('q2'); if (q2) q2.focus(); else { const q1 = document.getElementById('q'); if (q1) q1.focus(); } }
    else if (a === 'saved') { onlySaved = !onlySaved; if (view !== 'shop') { view = 'shop'; } draw(); window.scrollTo(0, 0); }
    else if (a === 'home') { view = 'shop'; drawer = false; cur = null; draw(); window.scrollTo(0, shopY); }
    else if (a === 'cart') { if (wide()) { drawer = true; draw(); } else if (cartCount()) { go('order', true); err = ''; order(); } else { toast(T.empty); } }
    else if (a === 'dx') { drawer = false; draw(); }
    else if (a === 'order') { drawer = false; err = ''; go('order', true); }
    else if (a === 'back') { history.length > 1 && view !== 'shop' ? history.back() : go('shop'); }
    else if (a === 'rm') { const n = cart.get(k) || 0, y = window.scrollY; if (n > 1) cart.set(k, n - 1); else cart.delete(k); if (!cartCount() && view === 'order') { go('shop'); } else { draw(); window.scrollTo(0, y); } }
    else if (a === 'inc') { const g = items.find((x) => x.id === k.split('|')[0]), z = g && sizesOf(g).find((x) => x.s === k.split('|')[1]), y = window.scrollY; if (z) cart.set(k, Math.min(z.ids.length, (cart.get(k) || 0) + 1)); draw(); window.scrollTo(0, y); }
    else if (a === 'opt') { form.option = k; keep(); order(); }
    else if (a === 'send') send();
    else if (a === 'forget') { try { localStorage.removeItem('buy-sell-store-me'); } catch (e) { /* ignore */ } form.name = ''; form.phone = ''; remembered = false; keep(); form.name = ''; form.phone = ''; order(); }
    else if (a === 'again') { go('shop'); }
  });
  const keep = () => { const n = document.getElementById('f-name'), p = document.getElementById('f-phone'), ar = document.getElementById('f-area'); if (n) form.name = n.value; if (p) form.phone = p.value; if (ar) form.area = ar.value; };
  document.addEventListener('change', (e) => {
    if (e.target.id === 'f-loc') { keep(); form.loc = e.target.value; const l = loc(), o = SC.options(l); form.option = o.length ? o[o.length - 1].key : ''; order(); }
    else if (e.target.id === 'sort') { sortBy = e.target.value; refreshGrid(); }
  });
  // The phone's Back button: item or cart goes back to the shop (where you were), the shop leaves the page.
  window.addEventListener('popstate', () => { if (view !== 'shop') { view = 'shop'; drawer = false; draw(); window.scrollTo(0, shopY); } });

  async function boot() {
    if (!sid) return msg(T.nf, T.nfText);
    try {
      firebase.initializeApp(CONFIG); db = firebase.firestore();
      const snap = await db.collection('stores').doc(sid).get(); if (!snap.exists) return msg(T.nf, T.nfText);
      store = snap.data(); document.title = store.name || 'Store';
      if (store.color) { document.documentElement.style.setProperty('--brand', store.color); document.documentElement.style.setProperty('--tint', 'color-mix(in srgb,' + store.color + ' 10%,#fff)'); }
      if (store.open === false) return msg(T.closed, T.closedText);
      const docs = await Promise.all(Array.from({ length: store.chunks || 0 }, (_, i) => db.collection('stores').doc(sid).collection('catalog').doc('c' + i).get()));
      items = hideTaken(docs.filter((d) => d.exists).flatMap((d) => d.data().items || []).sort((a, b) => String(a.id).localeCompare(String(b.id))), new Set(store.reserved || []));
      shop();
    } catch (e) { msg(T.nf, T.nfText); }
  }
  boot();
})();

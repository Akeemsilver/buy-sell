/* The public online store page. Reads the catalogue the owner published (name, price, sale price, picture, sizes, details) and sends orders.
   No sign-in. Nothing private is ever here: costs and profit are not published.
   Pages: the shop (grid, search, sort, saved), one item (size, details, add to cart), the cart (drawer on a computer), the order form. */
(function () {
  const CONFIG = { apiKey: 'AIzaSyAfAEJ1Yy8DtQg0LDS_bkTFLgHx0d3ym8g', authDomain: 'b-ruiz.firebaseapp.com', projectId: 'b-ruiz', storageBucket: 'b-ruiz.firebasestorage.app', messagingSenderId: '252946775951', appId: '1:252946775951:web:735af0ffbe69d9966a15fa' };
  const SC = window.StoreCore, $app = document.getElementById('app');
  // The phone's first language decides: any Spanish (es, es-419, es-MX…) opens in Spanish, everything else in English.
  const ES = /^es\b/i.test(((navigator.languages && navigator.languages[0]) || navigator.language || 'en').replace('_', '-'));
  document.documentElement.lang = ES ? 'es' : 'en';
  const T = ES ? { noteLabel: 'Notas de entrega (opcional)', notePh: 'Ejemplo: Color del portón, número de casa, un punto de referencia', spotH: 'Marca el lugar de entrega (opcional)', spotHere: '📍 Usar mi ubicación', spotMap: '🗺️ Elegir en el mapa', spotNote: 'Un pin nos ayuda a encontrarte. Aun así puedes escribir tu dirección.', spotAdded: 'Lugar de entrega añadido', spotChange: 'Cambiar', spotRemove: 'Quitar', spotBlocked: 'La ubicación está desactivada para este sitio. Elige el lugar en el mapa, o permite la ubicación en los ajustes del teléfono.', spotWait: 'Buscándote…', spotLink: 'Pegar un enlace de Google Maps', spotLinkGo: 'Usar enlace', spotLinkPh: 'Pega el enlace aquí', spotShort: 'Es un enlace acortado. Ábrelo, copia la dirección larga del navegador, o usa Elegir en el mapa.', spotBad: 'No se encontró un lugar en ese enlace.', mapSearch: 'Busca una calle o zona', mapHint: 'Mueve el mapa para colocar el pin', mapOk: 'Confirmar este lugar', mapNear: (x) => 'Cerca de ' + x, mapCancel: 'Cancelar', mapNone: 'No se encontró nada', mapNoLib: 'No se pudo cargar el mapa. Revisa tu conexión.', spotSent: '📍 Tu lugar de entrega se envió con el pedido.', last: 'Última pieza', only: (n) => 'Quedan ' + n, qty: 'Cantidad', size: 'Talla', arriving: 'Llega pronto', all: 'Todo', avail: 'Disponible', soon: 'Llega pronto', onSale: 'En oferta', items: (n) => n + (n === 1 ? ' artículo' : ' artículos'), yourOrder: 'Tu pedido', where: '¿Dónde estás?', choose: 'Elige un lugar', pickup: 'Recoger', delivery: 'Entrega a tu puerta', free: 'Gratis', details: 'Tus datos', name: 'Nombre', phone: 'Teléfono (WhatsApp)', sub: 'Artículos', deliv: 'Entrega', total: 'Total', place: 'Hacer pedido', sending: 'Enviando…', payNote: 'Pagas cuando el vendedor confirme tu pedido.', sent: '¡Pedido enviado!', ordNo: 'Tu número de pedido es', willMsg: 'te escribirá al', toConfirm: 'para confirmar.', wa: 'Escríbenos por WhatsApp', keep: 'Seguir comprando', closed: 'La tienda está cerrada', closedText: 'Vuelve más tarde.', nf: 'Tienda no encontrada', nfText: 'Revisa el enlace.', empty: 'No hay artículos por ahora.', e_name: 'Escribe tu nombre.', e_phone: 'Escribe tu número de teléfono para hacer el pedido.', freeFor: '🎁 ¡Entrega gratis para ti!', outNote: 'Este lugar está fuera de nuestras zonas habituales. Confirmaremos la entrega contigo por WhatsApp.', freePin: 'Agrega tu pin en el mapa para obtener entrega gratis.', freeOut: 'Tu pin está fuera de tu zona de entrega gratis.', returning: '¿Cliente de antes? Usa el mismo nombre que la vez anterior.', e_loc: 'Elige dónde estás y cómo recibirlo.', e_fail: 'No se pudo enviar. Inténtalo otra vez o escribe al vendedor.', typeArea: 'Tu zona', gone: 'Ya no está disponible',
      askPrice: 'Escríbenos para el precio', saleWord: 'OFERTA', spotPick: 'Recoger en un punto', spotChoose: 'Elige un punto:', e_spot: 'Elige un punto de recogida.', msgSeller: 'Escribir al vendedor', heroLook: 'Mira nuestros artículos. Escríbenos por WhatsApp para pedir.',
      search: 'Buscar en la tienda', saved: 'Guardados', sort: 'Ordenar', sortDef: 'Destacados', sortLow: 'Precio: menor a mayor', sortHigh: 'Precio: mayor a menor', addCart: 'Agregar al carrito', added: 'Agregado al carrito', pickSize: 'Elige una talla', detailsH: 'Detalles', pickDel: 'Recoger y entrega', waConfirm: 'Pedido confirmado por WhatsApp', payOn: 'Pagas al recoger o al recibir', cart: 'Carrito', checkout: 'Hacer pedido', none: 'Nada coincide con tu búsqueda', noSaved: 'Aún no guardaste nada. Toca el corazón en un artículo.', heroWa: 'Elige tu talla y haz tu pedido. Confirmamos por WhatsApp.', hero: 'Elige tu talla y haz tu pedido.', home: 'Inicio', back: 'Atrás', close: 'Cerrar', deliveryFrom: (p) => 'Entrega desde ' + p, pickupFree: 'Recoger en', viewCart: 'Ver carrito', more: 'Seguir mirando', sizes: 'Tallas', remember: 'Guardado solo en este teléfono', forget: 'Olvidar mis datos', cancelMsg: 'Cambiar o cancelar este pedido', copyNo: 'Copiar número de pedido', copied: 'Número de pedido copiado', moreAria: 'Más', cancelNote: 'Puedes cancelar el pedido hasta que lo confirmemos. Guarda tu número de pedido.', e_taken: 'Algunos artículos acaban de ser pedidos por otra persona y se quitaron de tu pedido.', waCancel: (c) => 'Hola, quiero cambiar o cancelar mi pedido ' + c + '.' }
    : { noteLabel: 'Delivery notes (optional)', notePh: 'Example: Gate colour, house number, a landmark', spotH: 'Pin the delivery spot (optional)', spotHere: '📍 Use my current location', spotMap: '🗺️ Choose on map', spotNote: 'A pin helps us find you. You can still type your address.', spotAdded: 'Delivery spot added', spotChange: 'Change', spotRemove: 'Remove', spotBlocked: 'Location is switched off for this site. Choose the spot on the map instead, or allow location in your phone settings.', spotWait: 'Finding you…', spotLink: 'Paste a Google Maps link', spotLinkGo: 'Use link', spotLinkPh: 'Paste the link here', spotShort: 'That is a shortened link. Open it, copy the long address from the browser, or use Choose on map.', spotBad: 'Could not find a place in that link.', mapSearch: 'Search a street or area', mapHint: 'Drag the map to move the pin', mapOk: 'Confirm this spot', mapNear: (x) => 'Near ' + x, mapCancel: 'Cancel', mapNone: 'No places found', mapNoLib: 'The map could not load. Check your connection.', spotSent: '📍 Your delivery spot was sent with the order.', last: 'Last one', only: (n) => 'Only ' + n + ' left', qty: 'Quantity', size: 'Size', arriving: 'Arriving soon', all: 'All', avail: 'Available', soon: 'Arriving soon', onSale: 'On sale', items: (n) => n + (n === 1 ? ' item' : ' items'), yourOrder: 'Your order', where: 'Where are you?', choose: 'Choose a location', pickup: 'Pick up', delivery: 'Delivery to your door', free: 'Free', details: 'Your details', name: 'Name', phone: 'Phone (WhatsApp)', sub: 'Items', deliv: 'Delivery', total: 'Total', place: 'Place order', sending: 'Sending…', payNote: 'You pay when the seller confirms your order.', sent: 'Order sent!', ordNo: 'Your order number is', willMsg: 'will message you on', toConfirm: 'to confirm.', wa: 'Message us on WhatsApp', keep: 'Keep shopping', closed: 'The store is closed', closedText: 'Please come back later.', nf: 'Store not found', nfText: 'Please check the link.', empty: 'Nothing for sale right now.', e_name: 'Please enter your name.', e_phone: 'Please type your phone number to place the order.', freeFor: '🎁 Free delivery for you!', outNote: 'This spot is outside our usual areas. We will confirm delivery with you on WhatsApp.', freePin: 'Add your pin on the map to get free delivery.', freeOut: 'Your pin is outside your free delivery area.', returning: 'Returning customer? Please use the same name as before.', e_loc: 'Choose where you are and how you want it.', e_fail: 'Could not send. Please try again or message the seller.', typeArea: 'Your area', gone: 'No longer available',
      askPrice: 'Message us for the price', saleWord: 'SALE', spotPick: 'Pick up at a spot', spotChoose: 'Choose a spot:', e_spot: 'Choose a pickup spot.', msgSeller: 'Message seller', heroLook: 'Browse our items. Message us on WhatsApp to order.',
      search: 'Search the store', saved: 'Saved', sort: 'Sort', sortDef: 'Featured', sortLow: 'Price: low to high', sortHigh: 'Price: high to low', addCart: 'Add to cart', added: 'Added to cart', pickSize: 'Choose a size', detailsH: 'Details', pickDel: 'Pickup & delivery', waConfirm: 'Order confirmed on WhatsApp', payOn: 'Pay on pickup or delivery', cart: 'Cart', checkout: 'Checkout', none: 'Nothing matches your search', noSaved: 'Nothing saved yet. Tap the heart on an item.', heroWa: 'Pick your size and place your order. We confirm on WhatsApp.', hero: 'Pick your size and place your order.', home: 'Home', back: 'Back', close: 'Close', deliveryFrom: (p) => 'Delivery from ' + p, pickupFree: 'Pickup in', viewCart: 'View cart', more: 'Keep browsing', sizes: 'Sizes', remember: 'Saved on this phone only', forget: 'Forget my details', cancelMsg: 'Change or cancel this order', copyNo: 'Copy order number', copied: 'Order number copied', moreAria: 'More', cancelNote: 'Orders can be cancelled until we confirm them. Keep your order number.', e_taken: 'Some items were just ordered by someone else and were taken out of your order.', waCancel: (c) => 'Hi, I would like to change or cancel my order ' + c + '.' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nm = (i) => (ES && i.nameEs ? i.nameEs : i.name);
  const det = (i) => String((ES && i.detailsEs) || i.details || '').trim();
  const money = (n) => 'TT$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let sid = new URLSearchParams(location.search).get('s') || '';   // a store code, or the short name that points at one
  const wide = () => window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  let db = null, store = null, items = [], cart = new Map(), filter = 'all', view = 'shop', cur = null, pick = { s: '', q: 1, tried: false }, qs = '', sortBy = 'def', onlySaved = false, drawer = false, searchOpen = false, shopY = 0, toastT = null;
  let form = { loc: '', option: '', area: '', name: '', phone: '', geo: null, note: '', pspot: '' }, geoErr = '', linkOpen = false, locating = false, err = '', sending = false, done = null;
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
      <button class="brand" data-a="home" aria-label="${T.home}"><span class="lg">${store.logo ? `<img src="${esc(store.logo)}" alt="">` : esc((store.name || '?').trim().charAt(0).toUpperCase())}</span><span class="nm">${esc(store.name || '')}</span></button>
      <div class="srch" id="srch">${ICON.search}<input id="q" value="${esc(qs)}" placeholder="${T.search}" autocomplete="off" enterkeyhint="search"></div>
      <button class="ic sbtn" data-a="srch" aria-label="${T.search}">${ICON.search}</button>
      <button class="ic ${onlySaved ? 'on' : ''}" data-a="saved" aria-label="${T.saved}">${ICON.heart}${saved.size ? `<b class="d"></b>` : ''}</button>
      ${priced() ? `<button class="ic" data-a="cart" aria-label="${T.cart}">${ICON.cart}${n ? `<b>${n}</b>` : ''}</button>` : ''}${opts.menu ? `<button class="ic" data-a="menu" aria-label="${T.moreAria}">${ICON.dots}</button>` : ''}</div>
      ${searchOpen && view === 'shop' ? `<div class="msrch">${ICON.search}<input id="q2" value="${esc(qs)}" placeholder="${T.search}" autocomplete="off" enterkeyhint="search"></div>` : ''}${opts.menu ? orderMenu() : ''}</div>`;
  };
  const listNow = () => {
    const f = qs.trim().toLowerCase();
    let list = items.filter((i) => (filter === 'all' || (filter === 'avail' && !i.transit) || (filter === 'soon' && i.transit) || (filter === 'sale' && i.sale > 0)) && (!onlySaved || saved.has(i.id)) && (!f || (nm(i) + ' ' + i.name).toLowerCase().includes(f)));
    if (sortBy === 'low') list = list.slice().sort((a, b) => effPrice(a) - effPrice(b)); else if (sortBy === 'high') list = list.slice().sort((a, b) => effPrice(b) - effPrice(a));
    return list;
  };
  const WA_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
  // With prices off the store is a place to look: no prices, no cart, and Message seller (WhatsApp) instead of Add to cart. It needs the seller's WhatsApp number.
  const priced = () => store.showPrices !== false || !(store.whatsapp && SC.digits(store.whatsapp));
  const card = (g) => {
    const left = store.showLeft && totalIn(g) <= 3 ? (totalIn(g) === 1 ? T.last : T.only(totalIn(g))) : '';
    const szs = sizesOf(g).map((z) => z.s).filter(Boolean).map(sizeLabel).join(' ');
    return `<button class="gi ${inCart(g) ? 'on' : ''}" data-a="open" data-k="${esc(g.id)}"><div class="im">${g.img ? `<img src="${g.img}" alt="" loading="lazy">` : '<span class="np">·</span>'}${g.sale > 0 ? `<span class="off">${priced() ? '−' + g.pct + '%' : T.saleWord}</span>` : ''}${g.transit ? `<span class="tag">${T.arriving}</span>` : left ? `<span class="tag">${left}</span>` : ''}<span class="hrt ${saved.has(g.id) ? 'on' : ''}" data-a="fav" data-k="${esc(g.id)}" role="button" aria-label="${T.saved}">${ICON.heart}</span></div>
      <div class="tx"><div class="t">${esc(nm(g))}</div>${priced() ? `<div class="p"><b class="${g.sale > 0 ? 's' : ''}">${money(effPrice(g))}</b>${g.sale > 0 ? `<s>${money(g.price)}</s>` : ''}</div>` : ''}${szs ? `<div class="sz">${esc(szs)}</div>` : ''}</div></button>`;
  };
  const gridInner = () => { const l = listNow(); return l.length ? l.map(card).join('') : `<div class="none">${items.length ? (onlySaved && !saved.size ? T.noSaved : T.none) : T.empty}</div>`; };

  /* ---------- the shop ---------- */
  function shop() {
    const sum = SC.totals(chosen(), null, '').sub, nCart = cartCount(), hasSoon = items.some((i) => i.transit), hasSale = items.some((i) => i.sale > 0);
    const chips = [['all', T.all], ['avail', T.avail], hasSoon ? ['soon', T.soon] : null, hasSale ? ['sale', T.onSale] : null].filter(Boolean);
    const showHero = filter === 'all' && !qs && !onlySaved;
    $app.innerHTML = `${header()}<main class="wrap">
      ${showHero ? `<div class="hero"><h2>${esc(store.name || '')}</h2><p>${!priced() ? T.heroLook : store.whatsapp && SC.digits(store.whatsapp) ? T.heroWa : T.hero}</p></div>` : ''}
      <div class="bar"><div class="chips">${chips.map(([k, l]) => `<button class="${filter === k ? 'on' : ''} ${k === 'sale' ? 'sl' : ''}" data-a="filter" data-k="${k}">${k === 'sale' ? '🔥 ' : ''}${l}</button>`).join('')}</div>
      <label class="sort"><span>${T.sort}</span><select id="sort"><option value="def" ${sortBy === 'def' ? 'selected' : ''}>${T.sortDef}</option>${priced() ? `<option value="low" ${sortBy === 'low' ? 'selected' : ''}>${T.sortLow}</option><option value="high" ${sortBy === 'high' ? 'selected' : ''}>${T.sortHigh}</option>` : ''}</select></label></div>
      <div class="sec"><h3>${onlySaved ? T.saved : T.all}</h3><span id="cnt">${T.items(listNow().length)}</span></div>
      <div class="grid" id="grid">${gridInner()}</div></main>
      <footer class="foot"><b>${esc(store.name || '')}</b></footer>
      ${priced() && nCart && !wide() ? `<button class="cartbar" data-a="order"><div>${T.items(nCart)}<small>${money(sum)}</small></div><span class="go">${T.checkout} →</span></button>` : ''}${drawer ? drawerHtml() : ''}<div class="toast" id="toast" hidden></div>`;
  }
  const refreshGrid = () => { const g = document.getElementById('grid'); if (g) { g.innerHTML = gridInner(); const c = document.getElementById('cnt'); if (c) c.textContent = T.items(listNow().length); } };

  /* ---------- one item ---------- */
  function itemView() {
    const g = items.find((x) => x.id === cur); if (!g) { view = 'shop'; return shop(); }
    const zs = sizesOf(g), real = zs.filter((z) => z.s), z = zs.find((x) => x.s === pick.s), max = z ? z.ids.length : 0, d = det(g);
    const locs = store.locations || [], pk = locs.filter((l) => l.pickup), dl = locs.filter((l) => l.delivery), wa = store.whatsapp && SC.digits(store.whatsapp);
    const left = store.showLeft && z && z.ids.length <= 3 ? (z.ids.length === 1 ? T.last : T.only(z.ids.length)) : '';
    const info = `<div class="pb"><div class="row">${priced() ? `<span class="now ${g.sale > 0 ? 's' : ''}">${money(effPrice(g))}</span>${g.sale > 0 ? `<span class="was">${money(g.price)}</span><span class="pct">−${g.pct}%</span>` : ''}` : `<span class="now ask">${T.askPrice}</span>${g.sale > 0 ? `<span class="pct">${T.saleWord}</span>` : ''}`}</div>
      <h1 class="ttl">${esc(nm(g))}</h1><div class="meta">${g.transit ? `<span class="tg">${T.arriving}</span>` : ''}${left ? `<span class="tg">${left}</span>` : ''}</div></div>
      ${real.length ? `<div class="blk ${pick.tried && !pick.s ? 'err' : ''}" id="szb"><h4>${T.size}${pick.tried && !pick.s ? `<span class="et">${T.pickSize}</span>` : ''}</h4><div class="sizes">${real.map((x) => `<button class="${pick.s === x.s ? 'on' : ''}" data-a="psz" data-s="${esc(x.s)}">${esc(sizeLabel(x.s))}</button>`).join('')}</div>
        ${max > 1 ? `<div class="qrow"><span>${T.qty}</span><div class="qty"><button data-a="pq" data-d="-1" aria-label="−" ${pick.q <= 1 ? 'disabled' : ''}>−</button><span>${pick.q}</span><button data-a="pq" data-d="1" aria-label="+" ${pick.q >= max ? 'disabled' : ''}>+</button></div></div>` : ''}</div>`
      : (max > 1 ? `<div class="blk"><div class="qrow"><span>${T.qty}</span><div class="qty"><button data-a="pq" data-d="-1" aria-label="−" ${pick.q <= 1 ? 'disabled' : ''}>−</button><span>${pick.q}</span><button data-a="pq" data-d="1" aria-label="+" ${pick.q >= max ? 'disabled' : ''}>+</button></div></div></div>` : '')}
      ${d ? `<div class="blk"><h4>${T.detailsH}</h4><ul class="dl">${d.split(/\n+/).filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${pk.length || dl.length || wa ? `<div class="blk"><h4>${T.pickDel}</h4>
        ${pk.length ? `<div class="sh"><i>📍</i><div>${T.pickupFree} ${esc(pk.map((l) => l.name).join(', '))}<span>${T.free}</span></div></div>` : ''}
        ${dl.length ? `<div class="sh"><i>🚚</i><div>${T.delivery}<span>${T.deliveryFrom(money(Math.min(...dl.map((l) => Number(l.price) || 0))))}</span></div></div>` : ''}
        ${wa ? `<div class="sh"><i>💬</i><div>${T.waConfirm}<span>${T.payOn}</span></div></div>` : ''}</div>` : ''}`;
    const askLink = SC.waLink(store.whatsapp, SC.askMessage(ES, store.name, nm(g), pick.s ? sizeLabel(pick.s) : '', pick.q));
    const addBtn = priced() ? `<button class="btn" data-a="add">${T.addCart}<small>· ${money(effPrice(g))}</small></button>` : `<a class="btn wa" data-a="ask" href="${askLink}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg> ${T.msgSeller}</a>`;
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
  // Regular customers: delivery is free when their number and the chosen place are on the seller's published list.
  const validPh = () => SC.digits(form.phone).length >= 7;
  const regularZones = () => (store.free && store.free.length && validPh() ? (store.zones || []).filter((z) => SC.isFree(store.free, form.phone, z.id)) : []);   // the zones this number has free delivery in
  const freeNow = () => { const l = loc(); if (!l || form.option !== 'delivery' || !form.geo) return false; const rz = regularZones(); if (!rz.length) return false; const here = SC.zonesAt(store.zones, form.geo.lat, form.geo.lng).map((z) => z.id); return rz.some((z) => here.includes(z.id)); };
  const freeHint = () => (regularZones().length && form.option === 'delivery' && !freeNow() ? (form.geo ? T.freeOut : T.freePin) : '');
  const paintFree = () => { const fr = freeNow(), l = loc(); if (!l) return; const t = SC.totals(chosen(), l, form.option, store.spots, store.spotPrice), d = document.getElementById('t-deliv'), tt = document.getElementById('t-total'), n = document.getElementById('freeok'), h = document.getElementById('freehint'), op = document.querySelector('.opt.on .optp'); if (d) d.textContent = fr ? T.free : money(t.delivery); if (tt) tt.textContent = money(fr ? t.sub : t.total); if (n) n.hidden = !fr; if (h) { const x = freeHint(); h.hidden = !x; h.textContent = x; } if (op && form.option === 'delivery') op.textContent = fr ? T.free : (t.delivery ? money(t.delivery) : T.free); };
  const drawerHtml = () => { const ls = lines(), sub = SC.totals(chosen(), null, '').sub;
    return `<div class="veil" data-a="dx"></div><aside class="drawer"><div class="dh"><b>${T.cart} (${cartCount()})</b><button class="ic" data-a="dx" aria-label="${T.close}">${ICON.x}</button></div>
      <div class="body">${ls.length ? ls.map(lineHtml).join('') : `<div class="none">${T.empty}</div>`}</div>${ls.length ? `<div class="ft"><div class="tot"><span>${T.sub}</span><b>${money(sub)}</b></div><button class="big-btn" data-a="order">${T.checkout}</button></div>` : ''}</aside>`; };
  function order() {
    const its = chosen(), l = loc(), locs = store.locations || [], opts = SC.options(l, store.spots, store.spotPrice), t0 = SC.totals(its, l, form.option, store.spots, store.spotPrice), fr = freeNow(), t = fr ? Object.assign({}, t0, { delivery: 0, total: t0.sub }) : t0;
    const free = !locs.length;   // no locations set up: the customer types their area and the seller arranges delivery
    $app.innerHTML = `${header({ back: 'back', slim: true })}<div class="pg"><h2 class="ph2">${T.yourOrder}</h2><div class="bx">${lines().map(lineHtml).join('')}</div>
      <h2>${T.where}</h2>
      ${free ? `<div class="fld"><input id="f-area" value="${esc(form.area)}" placeholder="${T.typeArea}" autocomplete="off"></div>` : `<div class="fld"><select id="f-loc"><option value="">${T.choose}</option>${locs.map((x) => `<option value="${esc(x.id)}" ${x.id === form.loc ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      ${l ? opts.map((o) => `<button class="opt ${form.option === o.key ? 'on' : ''}" data-a="opt" data-k="${o.key}"><i></i><span>${o.key === 'pickup' ? T.pickup : o.key === 'spot' ? T.spotPick : T.delivery}</span><b class="optp">${o.price && !(fr && o.key === 'delivery') ? money(o.price) : T.free}</b></button>`).join('') : ''}<p class="freeok" id="freeok" ${fr ? '' : 'hidden'}>${T.freeFor}</p><p class="freehint" id="freehint" ${freeHint() ? '' : 'hidden'}>${freeHint()}</p>${form.geo && form.option === 'delivery' && !free && (store.zones || []).length && !SC.zonesAt(store.zones, form.geo.lat, form.geo.lng).length ? `<p class="freehint">${T.outNote}</p>` : ''}${l && form.option === 'spot' ? `<div class="pspots"><small>${T.spotChoose}</small>${(store.spots || []).map((x) => `<button class="opt ${form.pspot === x.id ? 'on' : ''}" data-a="pspot" data-k="${esc(x.id)}"><i></i><span>${esc(x.name)}${x.note ? `<small class="pn">${esc(x.note)}</small>` : ''}</span></button>`).join('')}</div>` : ''}`}
      ${free || form.option === 'delivery' ? spotSection() : ''}
      <h2>${T.details}</h2><div class="fld"><label>${T.name}</label><input id="f-name" value="${esc(form.name)}" autocomplete="name"><small class="fnote">${T.returning}</small></div><div class="fld"><label>${T.phone}</label><input id="f-phone" type="tel" inputmode="tel" enterkeyhint="done" value="${esc(form.phone)}" autocomplete="tel"></div>${remembered ? `<div class="rem"><span>🔒 ${T.remember}</span><a data-a="forget">${T.forget}</a></div>` : ''}
      <div class="tot"><span>${T.sub}</span><span>${money(free ? SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub : t.sub)}</span></div>${free ? '' : `<div class="tot"><span>${T.deliv}</span><span id="t-deliv">${fr ? T.free : money(t.delivery)}</span></div>`}<div class="tot big"><span>${T.total}</span><span id="t-total">${money(free ? SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub : t.total)}</span></div>
      ${err ? `<div class="err">${esc(err)}</div>` : ''}<button class="big-btn" data-a="send" ${sending ? 'disabled' : ''}>${sending ? T.sending : T.place}</button><p class="note">${T.payNote}</p></div>`;
  }
  /* ---------- delivery spot: a pin from the phone's location, the map picker, or a pasted link ---------- */
  const spotSection = () => `<h2>${T.spotH}</h2>${form.geo
    ? `<div class="spot">${SC.tileHtml(form.geo.lat, form.geo.lng, 16, 120, 80, 'width:84px;height:64px;border-radius:10px;flex:none')}<div class="sp-t"><b>📍 ${T.spotAdded}</b><small>${form.geo.name ? esc(T.mapNear(form.geo.name)) : ''}</small></div><div class="sp-a"><a data-a="geo-map">${T.spotChange}</a><a data-a="geo-clear">${T.spotRemove}</a></div></div>`
    : `<div class="mapbtns"><button type="button" data-a="geo-here" ${locating ? 'disabled' : ''}>${locating ? T.spotWait : T.spotHere}</button><button type="button" data-a="geo-map">${T.spotMap}</button></div>
      <div class="mapnote">${T.spotNote}</div>${linkOpen ? `<div class="linkrow"><input id="f-link" placeholder="${T.spotLinkPh}" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" data-a="geo-linkgo">${T.spotLinkGo}</button></div>` : `<a class="mapnote lnk" data-a="geo-linkopen">${T.spotLink}</a>`}`}${geoErr ? `<div class="warn">${esc(geoErr)}</div>` : ''}<div class="fld" style="margin-top:10px"><label>${T.noteLabel}</label><input id="f-note" maxlength="200" value="${esc(form.note)}" placeholder="${T.notePh}" autocomplete="off"></div>`;
  const lang2 = ES ? 'es' : 'en';
  // a short place name for a pin ("Rivulet Road, Cunupia") from OpenStreetMap's free address look-up; the pin works without it
  const nameOf = (lat, lng) => fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=' + lang2 + '&lat=' + lat + '&lon=' + lng).then((r) => r.json()).then((j) => { const a = (j && j.address) || {}, road = a.road || a.pedestrian || a.neighbourhood || '', town = a.suburb || a.village || a.town || a.city || ''; return [road, town].filter(Boolean).join(', ').slice(0, 100) || String((j && j.display_name) || '').split(',').slice(0, 2).join(',').trim().slice(0, 100); }).catch(() => '');
  const setSpot = (g) => { form.geo = { lat: g.lat, lng: g.lng, name: '' }; geoErr = ''; keep(); order(); nameOf(g.lat, g.lng).then((n) => { if (form.geo && form.geo.lat === g.lat && form.geo.lng === g.lng) { form.geo.name = n; if (view === 'order' && !document.getElementById('mp')) { keep(); order(); } } }); };
  function here() {
    if (!navigator.geolocation) { geoErr = T.spotBlocked; return order(); }
    locating = true; geoErr = ''; keep(); order();
    navigator.geolocation.getCurrentPosition((p) => { locating = false; const g = SC.geo(p.coords.latitude, p.coords.longitude); if (g) setSpot(g); else { geoErr = T.spotBlocked; order(); } }, () => { locating = false; geoErr = T.spotBlocked; keep(); order(); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  let leaf = null;
  const loadLeaflet = () => leaf || (leaf = new Promise((ok, no) => {
    if (window.L && window.L.map) return ok();
    const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'vendor/leaflet/leaflet.css'; document.head.appendChild(c);
    const j = document.createElement('script'); j.src = 'vendor/leaflet/leaflet.js'; j.onload = () => ok(); j.onerror = () => { leaf = null; no(new Error('map')); }; document.head.appendChild(j);
  }));
  let mp = null;   // the open map picker: { map, name, timer }
  const PIN = '<svg viewBox="0 0 24 34" width="38" height="52"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20 12 34 12 34s12-14 12-22.3C24 5.2 18.6 0 12 0z" fill="#d6264a"/><circle cx="12" cy="11.5" r="4.5" fill="#fff"/></svg>';
  async function openMap() {
    keep(); geoErr = '';
    try { await loadLeaflet(); } catch (e) { geoErr = T.mapNoLib; return order(); }
    const w = document.createElement('div'); w.className = 'mp'; w.id = 'mp';
    w.innerHTML = `<div id="mpm"></div><div class="mp-pin">${PIN}</div><div class="mp-dot"></div><div class="mp-hint">${T.mapHint}</div>
      <div class="mp-sbar"><span aria-hidden="true">🔍</span><input id="mp-q" placeholder="${T.mapSearch}" autocomplete="off" enterkeyhint="search" aria-label="${T.mapSearch}"><button type="button" data-a="mp-x" aria-label="${T.close}">✕</button></div><div class="mp-res" id="mp-res" hidden></div>
      <button type="button" class="mp-cur" data-a="mp-cur" aria-label="${T.spotHere}">◎</button>
      <div class="mp-bot"><small id="mp-name">&nbsp;</small><button type="button" class="big-btn" data-a="mp-ok">${T.mapOk}</button><button type="button" class="mp-cancel" data-a="mp-cancel">${T.mapCancel}</button></div>`;
    document.body.appendChild(w); document.body.style.overflow = 'hidden';
    const g = form.geo, map = L.map('mpm', { zoomControl: false, attributionControl: true }).setView(g ? [g.lat, g.lng] : [10.6918, -61.2225], g ? 17 : 10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    mp = { map, name: g ? g.name : '', timer: 0 };
    const label = () => { const c = map.getCenter(); clearTimeout(mp.timer); mp.timer = setTimeout(() => nameOf(c.lat, c.lng).then((n) => { if (mp) { mp.name = n; const el = document.getElementById('mp-name'); if (el) el.innerHTML = n ? esc(T.mapNear(n)) : '&nbsp;'; } }), 700); };
    map.on('moveend', label); label();
    setTimeout(() => map.invalidateSize(), 50);
  }
  function closeMap() { if (mp) { clearTimeout(mp.timer); try { mp.map.remove(); } catch (e) { /* ignore */ } mp = null; } const w = document.getElementById('mp'); if (w) w.remove(); document.body.style.overflow = ''; }
  function mapSearch(q) {
    const box = document.getElementById('mp-res'); if (!box) return; q = String(q || '').trim(); if (q.length < 3) { box.hidden = true; return; }
    fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=tt&accept-language=' + lang2 + '&q=' + encodeURIComponent(q)).then((r) => r.json()).then((list) => {
      if (document.getElementById('mp-q') && document.getElementById('mp-q').value.trim() !== q) return;
      mp && (mp.hits = list || []); box.innerHTML = (list || []).length ? list.map((h, i) => { const p = String(h.display_name || '').split(','); return `<div data-a="mp-pick" data-i="${i}">${esc(p[0])}<small>${esc(p.slice(1, 3).join(',').trim())}</small></div>`; }).join('') : `<div class="none">${T.mapNone}</div>`; box.hidden = false;
    }).catch(() => { box.hidden = true; });
  }
  function finished() {
    const wa = SC.digits(store.whatsapp) ? SC.waLink(store.whatsapp, (ES ? 'Hola, acabo de hacer el pedido ' : 'Hi, I just placed order ') + done.code + ' (' + done.name + ').') : '';
    $app.innerHTML = `${header({ slim: true, menu: true })}<div class="pg" style="text-align:center"><div class="ok">✓</div><h2 class="ph2" style="font-size:22px;margin:0 0 6px">${T.sent}</h2><p style="color:var(--mute);margin:0 0 14px">${T.ordNo} <b style="color:var(--ink)">${esc(done.code)}</b>. ${esc(store.name || '')} ${T.willMsg} <b style="color:var(--ink)">${esc(done.phone)}</b> ${T.toConfirm}</p>
      <div class="bx" style="text-align:left"><div class="ln"><div class="i"><div class="t">${T.items(done.n)}</div><small class="mut">${esc(done.where)}</small>${done.pin ? `<small class="mut">${T.spotSent}</small>` : ''}</div><b>${money(done.total)}</b></div></div>${wa ? `<a class="wa" href="${wa}" target="_blank" rel="noopener">${T.wa}</a>` : ''}<button class="big-btn ghost" data-a="again">${T.keep}</button><p class="note" style="margin-top:14px">${T.cancelNote}</p></div>`;
  }
  const draw = () => (view === 'shop' ? shop() : view === 'item' ? itemView() : view === 'order' ? order() : finished());
  const go = (v, push) => { view = v; if (push) { try { history.pushState({ v }, ''); } catch (e) { /* ignore */ } } draw(); window.scrollTo(0, v === 'shop' ? shopY : 0); };

  async function send() {
    if (sending) return; const its = chosen(), l = loc(), free = !(store.locations || []).length;
    form.name = document.getElementById('f-name').value; form.phone = document.getElementById('f-phone').value; if (free) form.area = document.getElementById('f-area').value;
    const t = free ? { sub: SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub, delivery: 0, total: SC.totals(its, { pickup: true, delivery: false, price: 0 }, 'pickup').sub } : SC.totals(its, l, form.option, store.spots, store.spotPrice);
    if (!free && freeNow()) { t.delivery = 0; t.total = t.sub; }   // free delivery for this regular customer
    const ps = form.option === 'spot' ? (store.spots || []).find((x) => x.id === form.pspot) : null;   // a pickup spot is sent as a pickup at that spot, with the spot fee
    const o = { name: form.name.trim(), phone: form.phone.trim(), items: its, location: free ? form.area.trim() : (form.option === 'spot' ? (ps ? ('Spot: ' + ps.name).slice(0, 60) : '') : (l ? l.name : '')), option: free ? 'delivery' : (form.option === 'spot' ? 'pickup' : form.option) };
    const bad = SC.checkOrder(o); err = bad === 'name' ? T.e_name : bad === 'phone' ? T.e_phone : bad ? (form.option === 'spot' ? T.e_spot : T.e_loc) : (!free && !t.valid ? T.e_loc : '');
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
      const pin = o.option === 'delivery' && form.geo ? { lat: form.geo.lat, lng: form.geo.lng, spot: String(form.geo.name || '').slice(0, 120) } : null, lg = { lang: ES ? 'es' : 'en' };
      const nt = o.option === 'delivery' ? String(form.note || '').trim().slice(0, 200) : (ps && ps.note ? ps.note.slice(0, 200) : ''), note = nt ? { note: nt } : null;
      // older rules do not know the delivery notes, then the pin, then the language: send without them rather than fail (the order always goes)
      const tries = []; if (note) tries.push(Object.assign({}, lg, pin || {}, note, body)); if (pin) tries.push(Object.assign({}, lg, pin, body)); tries.push(Object.assign({}, lg, body)); tries.push(body);
      let sent = -1, last = null;
      for (let n = 0; n < tries.length && sent < 0; n++) { try { await doc.set(tries[n]); sent = n; } catch (e) { last = e; if (!(e && e.code === 'permission-denied')) throw e; } }
      if (sent < 0) throw last;
      try { localStorage.setItem('buy-sell-store-me', JSON.stringify({ name: o.name, phone: o.phone })); } catch (e) { /* ignore */ }
      done = { code, name: o.name, phone: o.phone, n: its.length, total: t.total, pin: !!pin && 'lat' in tries[sent], where: (ps ? T.spotPick : o.option === 'pickup' ? T.pickup : T.delivery) + ' · ' + (ps ? ps.name : o.location) }; form.geo = null; form.note = ''; geoErr = ''; linkOpen = false; cart = new Map(); view = 'done'; err = '';
    } catch (e) { err = T.e_fail; }
    sending = false; draw(); window.scrollTo(0, 0);
  }

  if (window.SelectPicker) SelectPicker.install(() => ({ cancel: ES ? 'Cancelar' : 'Cancel', done: ES ? 'Listo' : 'Done', search: ES ? 'Buscar' : 'Search', choose: T.choose || (ES ? 'Elegir' : 'Choose'), none: ES ? 'Sin resultados' : 'No match' }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && (e.target.id === 'f-phone' || e.target.id === 'q' || e.target.id === 'q2')) { e.preventDefault(); e.target.blur(); } });
  let freeT; document.addEventListener('input', (e) => { if (e.target.id === 'f-phone') { clearTimeout(freeT); freeT = setTimeout(() => { keep(); paintFree(); }, 300); } });
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
    else if (a === 'opt') { form.option = k; if (k === 'spot' && !form.pspot) { const sp = (store.spots || [])[0]; if ((store.spots || []).length === 1 && sp) form.pspot = sp.id; } keep(); order(); }
    else if (a === 'pspot') { form.pspot = k; keep(); order(); }
    else if (a === 'send') send();
    else if (a === 'geo-here') here();
    else if (a === 'geo-map') openMap();
    else if (a === 'geo-clear') { form.geo = null; geoErr = ''; keep(); order(); }
    else if (a === 'geo-linkopen') { linkOpen = true; keep(); order(); const f = document.getElementById('f-link'); if (f) f.focus(); }
    else if (a === 'geo-linkgo') { const f = document.getElementById('f-link'), r = SC.parseGeoLink(f ? f.value : ''); if (r && r !== 'short') { linkOpen = false; setSpot(r); } else { geoErr = r === 'short' ? T.spotShort : T.spotBad; keep(); order(); const f2 = document.getElementById('f-link'); if (f2 && f) f2.value = f.value; } }
    else if (a === 'mp-cancel') closeMap();
    else if (a === 'mp-x') { const q = document.getElementById('mp-q'), r = document.getElementById('mp-res'); if (q) q.value = ''; if (r) r.hidden = true; }
    else if (a === 'mp-pick') { const h = mp && mp.hits && mp.hits[Number(b.dataset.i)]; if (h) { mp.map.setView([Number(h.lat), Number(h.lon)], 17); const r = document.getElementById('mp-res'); if (r) r.hidden = true; const q = document.getElementById('mp-q'); if (q) q.blur(); } }
    else if (a === 'mp-cur') { if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition((p) => { if (mp) mp.map.setView([p.coords.latitude, p.coords.longitude], 17); }, () => { const el = document.getElementById('mp-name'); if (el) el.textContent = T.spotBlocked; }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }); }
    else if (a === 'mp-ok') { if (!mp) return; const c = mp.map.getCenter(), g = SC.geo(c.lat, c.lng), n = mp.name; closeMap(); if (g) { form.geo = { lat: g.lat, lng: g.lng, name: n || '' }; geoErr = ''; keep(); order(); if (!n) nameOf(g.lat, g.lng).then((x) => { if (form.geo && form.geo.lat === g.lat && form.geo.lng === g.lng) { form.geo.name = x; if (view === 'order') { keep(); order(); } } }); } }
    else if (a === 'forget') { try { localStorage.removeItem('buy-sell-store-me'); } catch (e) { /* ignore */ } form.name = ''; form.phone = ''; remembered = false; keep(); form.name = ''; form.phone = ''; order(); }
    else if (a === 'again') { go('shop'); }
  });
  const keep = () => { const n = document.getElementById('f-name'), p = document.getElementById('f-phone'), ar = document.getElementById('f-area'); if (n) form.name = n.value; if (p) form.phone = p.value; if (ar) form.area = ar.value; const nt = document.getElementById('f-note'); if (nt) form.note = nt.value; };
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'mp-q') { clearTimeout(mapSearch.t); mapSearch.t = setTimeout(() => mapSearch(e.target.value), 450); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.id === 'mp-q') { e.preventDefault(); mapSearch(e.target.value); e.target.blur(); } });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'f-loc') { keep(); form.loc = e.target.value; const l = loc(), o = SC.options(l, store.spots, store.spotPrice); form.option = o.some((x) => x.key === 'delivery') ? 'delivery' : (o.length ? o[0].key : ''); order(); }
    else if (e.target.id === 'sort') { sortBy = e.target.value; refreshGrid(); }
  });
  // The phone's Back button: item or cart goes back to the shop (where you were), the shop leaves the page.
  window.addEventListener('popstate', () => { if (view !== 'shop') { view = 'shop'; drawer = false; draw(); window.scrollTo(0, shopY); } });

  async function boot() {
    if (!sid) return msg(T.nf, T.nfText);
    try {
      firebase.initializeApp(CONFIG); db = firebase.firestore();
      try { const nm = await db.collection('names').doc(sid).get(); if (nm.exists && nm.data().sid) sid = nm.data().sid; } catch (e) { /* not a short name: use it as a store code */ }
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

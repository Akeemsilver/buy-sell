/**
 * Languages: English (en) and Spanish (es).
 *
 * RULE FOR EVERYTHING NEW: every text the user can see goes through t('key') (or tn('key', n) for singular/plural) and the key
 * must exist in BOTH dictionaries below. `npm test` fails if a key is missing in either language, if the {placeholders}
 * differ, or if the app uses a key that does not exist - and the deploy only runs after the tests pass.
 *
 * - Values may contain simple HTML (<b>...</b>); never put user-typed text in a dictionary, pass it as a {variable}
 *   (and escape it first) instead.
 * - Plurals: define key.one and key.other (the number is passed as {n}).
 * - Stored data keeps its English status names (In Transit, Paid ...) - only the display text is translated (status.*).
 * - Lists that become table headings (csv.*) are written as "A|B|C" and must have the same number of parts in both languages.
 */
(function (root) {
  const EN = {
    'lang.name': 'English',
    /* navigation + top bar */
    'nav.home': 'Home', 'nav.stock': 'Stock', 'nav.sell': 'Sell', 'nav.people': 'People', 'nav.more': 'More',
    'title.invoices': 'Invoices', 'title.items': 'Item log', 'title.summary': 'Summary', 'title.settings': 'Settings',
    'aria.back': 'Back', 'aria.main': 'Main', 'aria.logo': 'B-RUIZ Tienda Online',
    'tool.show': 'Show amounts', 'tool.hide': 'Hide amounts', 'tool.download': 'Download or export', 'tool.filter': 'Filter', 'tool.settings': 'Settings',
    /* statuses (display only) */
    'status.InTransit': 'In Transit', 'status.Available': 'Available', 'status.Owing': 'Owing', 'status.Paid': 'Paid', 'status.Closed': 'Closed', 'status.Received': 'Received',
    'invstatus.Paid': 'Paid', 'invstatus.Owing': 'Owing', 'invstatus.Updated': 'Updated',
    'cust.Owing': 'Owing', 'cust.UpToDate': 'Up to date',
    'filter.all': 'All',
    /* buttons / common */
    'btn.cancel': 'Cancel', 'btn.close': 'Close', 'btn.done': 'Done', 'btn.gotIt': 'Got it', 'btn.newBatch': '+ New batch', 'btn.importXlsx': 'Import my .xlsx workbook',
    'aria.dismiss': 'Dismiss', 'aria.remove': 'Remove', 'aria.selectItem': 'Select for invoice',
    /* install banner + guides */
    'install.title': 'Install the B-RUIZ app', 'install.sub.prompt': 'Works offline, opens like a normal app', 'install.sub.add': 'Add it to your home screen',
    'install.btn': 'Install', 'install.how': 'How', 'install.done': 'App installed 🎉',
    'ig.android.title': 'Install the app', 'ig.android.note': 'Your browser installs it from its menu:',
    'ig.android.chrome': '<b>Chrome / Edge (Android):</b> tap <b>⋮</b> → <b>Install app</b> (or <b>Add to Home screen</b>)',
    'ig.android.samsung': '<b>Samsung Internet:</b> tap <b>☰</b> → <b>Add page to</b> → <b>Home screen</b>',
    'ig.android.desktop': '<b>Desktop Chrome / Edge:</b> click the install icon in the address bar',
    'ig.ios.title': 'Add to your iPhone home screen', 'ig.ios.intro': 'Takes about 10 seconds. Once added, the app opens full screen with its own icon.',
    'ig.ios.warnInApp': '⚠️ This looks like an in-app browser (Instagram, Facebook, WhatsApp…). It can\'t install apps. Tap <b>Copy link</b> below, open <b>Safari</b>, and paste it in the address bar.',
    'ig.ios.warnOther': 'You\'re not in Safari. Chrome on iPhone works too: tap the <b>Share</b> icon next to the address bar. If you can\'t find it, open this page in <b>Safari</b> instead.',
    'ig.s1.t': 'Tap the Share button', 'ig.s1.d': 'The square with an arrow, at the bottom of Safari (on iPad it is at the top).',
    'ig.s2.t': 'Scroll down and tap “Add to Home Screen”', 'ig.s2.d': 'It is in the list under the apps row. You may need to swipe up.',
    'ig.s3.t': 'Tap “Add” at the top right', 'ig.s3.d': 'You can keep the name <b>B-RUIZ</b>.',
    'ig.s4.t': 'Open it from your home screen',
    'ig.s4.d': 'Find the B-RUIZ icon and tap it. Your data is stored on this phone — if you already entered data in Safari, use <b>Download → Full backup</b> first and <b>Restore backup</b> after opening the new app.',
    'ig.share': 'Share', 'ig.copy': 'Copy', 'ig.bookmarks': 'Add to Bookmarks', 'ig.favourites': 'Add to Favourites', 'ig.addHome': 'Add to Home Screen', 'ig.find': 'Find on Page',
    'ig.dlg.cancel': 'Cancel', 'ig.dlg.title': 'Add to Home Screen', 'ig.dlg.add': 'Add', 'ig.copyLink': 'Copy link',
    /* home */
    'home.welcome': 'Welcome 👋', 'home.welcomeText': 'Start by ordering a batch, or import your existing spreadsheet from More → Data.',
    'home.filtered': 'Filtered: {label}', 'home.filteredHint': 'Period limits sales, expenses, profit · tap to change',
    'home.profit': 'Profit on items sold', 'home.sales': 'Sales (paid)', 'home.owing': 'Owing to you', 'home.expenses': 'Expenses', 'home.avail': 'Available · in transit',
    'home.quick': 'Quick actions', 'home.payClearing': 'Pay clearing', 'home.receive': 'Receive batch', 'home.priceItems': 'Price items',
    'home.batches': 'Batches', 'home.soldOf': '{sold}/{count} sold', 'home.profitWord': 'profit', 'home.whoOwes': 'Who owes you', 'home.recent': 'Recent invoices',
    'home.itemsOwing.one': '{n} item owing', 'home.itemsOwing.other': '{n} items owing',
    /* stock */
    'stock.none': 'No stock yet', 'stock.noneText': 'Create a batch from Home first.',
    'stock.allClosed': 'All batches are closed', 'stock.allClosedText': 'Closed batches stay in Home and the logs. Create a new batch to keep selling.',
    'stock.addBatch': '+ Batch', 'stock.invested': '{status} · {amount} invested', 'stock.clearingLine': 'Clearing {amount} ({pct}%) · {left} left',
    'stock.noMatch': 'No items match this filter.', 'item.untitled': 'Untitled item',
    'bar.sell.one': 'Sell {n} item →', 'bar.sell.other': 'Sell {n} items →', 'bar.create': 'Create invoice · {amount}',
    /* sell */
    'sell.empty': 'Nothing to sell yet', 'sell.emptyText': 'Tick the circle on items in Stock, then come back here to invoice them.', 'sell.choose': 'Choose items',
    'sell.items': 'Items ({n})', 'sell.noDesc': 'No description', 'sell.noPrice': 'no price', 'sell.edit': 'Edit', 'sell.onInv': ' · on {no}',
    'sell.customer': 'Customer', 'sell.customerPh': 'Existing or new name', 'sell.paying': 'Amount paying now (TTD)', 'sell.payFull': 'Pay in full',
    'prev.total': 'Total (incl. delivery {amount})', 'prev.prev': 'Previously paid', 'prev.prevRef': 'Previously paid ({ref})', 'prev.payingNow': 'Paying now',
    'prev.owingAfter': 'Owing after', 'prev.tip': 'Tip', 'prev.profit': 'Profit', 'prev.loss': 'Loss', 'prev.ready': 'Ready to create the invoice.',
    'inv.created': 'Created {no} · balance {amount}', 'inv.deleted': '{id} deleted.',
    /* errors (logic codes) */
    'err.count': 'Enter a valid number of items.', 'err.batch': 'Batch not found.', 'err.hasInvoiced': 'This batch has invoiced items. Close it instead.',
    'err.payment': 'Enter a payment amount greater than 0.', 'err.noItems': 'Select at least one item.', 'err.noClient': 'Enter or choose a customer.',
    'err.noDesc': 'Every selected item needs a description.', 'err.noPrice': 'Every selected item needs a “Sold for” price.', 'err.noPaying': 'Enter the amount paying.',
    'err.notBackup': 'Not a backup file.', 'err.notWorkbook': 'This is not the tracker workbook (needs Batch Log and Hidden Master Log).',
    'err.sheetjs': 'Could not load the spreadsheet reader (needs internet).', 'err.save': 'Could not save to browser storage.',
    /* people */
    'people.none': 'No customers yet', 'people.noneText': 'Customers appear when you create your first invoice.', 'people.search': 'Search customers', 'people.noMatch': 'No match.',
    'people.sub.one': '{n} item · {amount} sales', 'people.sub.other': '{n} items · {amount} sales',
    /* more */
    'more.invoices': 'Invoices', 'more.invoicesSub': '{n} total', 'more.items': 'Item log', 'more.itemsSub': '{n} items',
    'more.summary': 'Summary', 'more.summarySub': 'Monthly sales, expenses, profit', 'more.settings': 'Settings', 'more.settingsSub': 'Language, theme, exchange rates',
    'more.install': 'Install app', 'more.installIOS': 'Add to your iPhone home screen', 'more.installOther': 'Add to your home screen',
    'more.data': 'Data', 'more.import': 'Import .xlsx workbook', 'more.importSub': 'Replaces data on this device', 'more.backup': 'Backup', 'more.backupSub': 'Save everything as a file',
    'more.restore': 'Restore backup', 'more.restoreSub': 'Load a backup file', 'more.erase': 'Erase all data', 'more.eraseSub': 'Cannot be undone — back up first',
    'more.local': 'Data is stored on this device only.', 'more.version': 'Version {v}',
    'invoices.none': 'No invoices yet.', 'items.all': 'All items',
    'summary.sales': '{y} sales', 'summary.profit': '{y} profit', 'summary.expenses': '{y} expenses', 'summary.owingNow': 'Owing now', 'summary.byMonth': 'By month',
    'summary.legend': 'Pink = sales, grey = expenses (counted in the month a batch was ordered).', 'summary.total': 'Total',
    'summary.rowExpense': 'Expense', 'summary.rowSales': 'Sales', 'summary.rowProfit': 'Profit',
    /* settings */
    'set.language': 'Language', 'set.appearance': 'Appearance', 'set.light': '☀️ Light', 'set.dark': '🌙 Dark', 'set.auto': '📱 Auto', 'set.theme': 'Theme',
    'set.autoNote': 'Auto follows your phone\'s light or dark setting.', 'set.business': 'Business', 'set.year': 'Year', 'set.margin': 'Default margin %',
    'set.markup': 'Rate markup (×)', 'set.rate': '{c} → TTD (market rate)',
    'set.rateNote': 'Effective rate = market × markup. Type in today\'s rate; new batches use it, existing batches keep theirs.', 'set.save': 'Save settings', 'set.saved': 'Settings saved.',
    /* batch sheets */
    'batch.prefix': 'BATCH', 'batch.new': 'New batch', 'batch.newNote': 'Same as ordering on the sheet: set the store, item count and total cost.', 'batch.store': 'Store', 'batch.count': 'No. of items',
    'batch.currency': 'Currency', 'batch.totalCost': 'Total cost', 'batch.marginPct': 'Margin %', 'batch.rateHint': 'Rate {rate} → {amount} before clearing.', 'batch.create': 'Create batch',
    'batch.created': '{id} created — fill in item details in Stock.',
    'batch.ordered': 'Ordered', 'batch.cost': 'Cost', 'batch.clearingPaid': 'Clearing paid', 'batch.invested': 'Invested', 'batch.sales': 'Sales', 'batch.profit': 'Profit',
    'batch.transitLast': 'Purchase → last clearing payment', 'batch.sincePurchase': 'Time since purchase', 'batch.lastClearing': 'Last clearing payment',
    'dur': '{m} mo · {w} wk · {d} d',
    'batch.payClearing': 'Pay clearing (TTD)', 'batch.recordPayment': 'Record payment', 'batch.viewItems': 'View items →', 'batch.markReceived': 'Mark received → items Available',
    'batch.close': 'Close batch', 'batch.delete': 'Delete (created by mistake)',
    'batch.closeNote': 'Closing keeps the batch in your logs and history. Unsold items become Closed; sold and owing items are kept.',
    'clear.title': 'Pay clearing', 'clear.batch': 'Batch', 'clear.amount': 'Amount (TTD)', 'clear.noBatch': 'Create a batch first.', 'clear.recorded': 'Clearing payment recorded for {id}.',
    'recv.title': 'Receive batch', 'recv.note': 'Marks the batch received and turns its In Transit items into Available.', 'recv.mark': 'Mark received', 'recv.none': 'No batches in transit.',
    'recv.done': '{id} received — {n} item(s) now Available.', 'batch.closed': '{id} closed.', 'batch.deleted': '{id} deleted.',
    'confirm.close': 'Close {id}? Unsold items become Closed. Sold and owing items stay in your logs.',
    'confirm.delBatch': 'Permanently delete {id} and all its items? This cannot be undone.', 'confirm.delInv': 'Delete {id}? Its items go back to their previous state.',
    'confirm.reset1': 'Erase ALL data on this device? Make a backup first.', 'confirm.reset2': 'Really erase everything?', 'confirm.import': 'Importing replaces the data on this device. Continue?',
    /* item sheet */
    'item.desc': 'Description', 'item.descPh': 'e.g. Blue dress', 'item.cost': 'Cost ({cur})', 'item.sold': 'Sold for (TTD)', 'item.delivery': 'Delivery (TTD)', 'item.status': 'Status',
    'item.invoice': ' · invoice {no}', 'item.addInv': 'Add to invoice', 'item.removeInv': 'Remove from invoice', 'item.added': 'Added to invoice.',
    'calc.costTTD': 'Cost (TTD)', 'calc.clearing': 'Clearing share', 'calc.landed': 'Landed cost', 'calc.rec': 'Recommended price', 'calc.profit': 'Profit', 'calc.profitRec': 'Profit (at recommended)',
    /* invoice screen + document */
    'invUI.share': 'Share invoice image', 'invUI.save': 'Save as image', 'invUI.print': 'Print / Save as PDF', 'invUI.delete': 'Delete invoice', 'invUI.status': 'Status:',
    'invUI.profit': 'profit', 'invUI.loss': 'loss', 'invUI.tip': 'tip', 'invUI.lang': 'Invoice language',
    'doc.billTo': 'BILL TO', 'doc.invoiceNo': 'INVOICE #', 'doc.date': 'DATE', 'doc.due': 'DUE DATE', 'doc.desc': 'Description', 'doc.qty': 'QTY', 'doc.price': 'Price', 'doc.amount': 'Amount',
    'doc.subtotal': 'Subtotal', 'doc.delivery': 'Delivery', 'doc.total': 'Total', 'doc.paid': 'Paid', 'doc.prevPaid': 'Previously Paid', 'doc.balance': 'BALANCE DUE',
    'doc.terms': 'Terms Or Notes', 'doc.thanks': 'Thanks for your business.', 'doc.stamp': 'PAID IN FULL', 'doc.bannerAlt': 'B.RUIZ invoice header', 'doc.stampAlt': 'Paid in full',
    'doc.preparing': 'Preparing image…', 'doc.saved': 'Invoice image saved', 'doc.noShare': 'Sharing isn\'t available here, so the image was saved',
    'doc.shareText': 'Invoice {no} — balance due {amount}', 'doc.loadErr': 'Could not load the invoice header.', 'doc.imgErr': 'Could not create the image.',
    /* customer, filter, download */
    'cust.owingLabel': 'Owing', 'cust.totalSales': 'Total sales', 'cust.itemsBought': 'Items bought', 'cust.itemsBoughtVal': '{n} ({o} owing)', 'cust.profit': 'Profit made',
    'cust.lastItem': 'Last item', 'cust.invoices': 'Invoices', 'cust.none': 'None yet.',
    'flt.title': 'Filter', 'flt.note': 'Period limits sales, expenses and profit (by invoice and order date). Batch limits everything. Owing and stock counts are always as of today.',
    'flt.period': 'Period', 'flt.batch': 'Batch', 'flt.allTime': 'All time', 'flt.thisMonth': 'This month', 'flt.lastMonth': 'Last month', 'flt.thisYear': 'This year',
    'flt.allBatches': 'All batches', 'flt.clear': 'Clear filter',
    'dl.title': 'Download', 'dl.note': 'Spreadsheets open in Excel or Google Sheets.', 'dl.full': 'Full backup', 'dl.fullSub': 'Everything, to restore later (.json)',
    'dl.invoices': 'Invoices', 'dl.items': 'Items', 'dl.customers': 'Customers', 'dl.rows': '{n} rows (.csv)',
    'csv.invoices': 'Invoice #|Bill to|Items|Status|Total|Amount paid|Previously paid|Balance due|Delivery|Date|Due date|Quantity|Profit|Loss|Tip',
    'csv.items': 'Item ID|Batch|Store|Status|Description|Customer|Cost (store currency)|Cost (TTD)|Clearing|Landed cost|Sold for|Profit|Amount paid|Owing|Invoice #',
    'csv.customers': 'Customer|Status|Total owing|Total sales|Items bought|Items owing|Profit made|Last item|Last purchase',
    /* toasts + updater */
    'toast.pressBack': 'Press back again to exit', 'toast.linkCopied': 'Link copied — paste it in Safari', 'toast.copyManual': 'Copy the address from your browser bar',
    'toast.restored': 'Backup restored.', 'toast.reading': 'Reading workbook…', 'toast.imported': 'Imported {b} batches, {i} items, {v} invoices.', 'toast.cleared': 'All data cleared.',
    'upd.updating': 'Updating to the latest version…',
  };

  const ES = {
    'lang.name': 'Español',
    'nav.home': 'Inicio', 'nav.stock': 'Inventario', 'nav.sell': 'Vender', 'nav.people': 'Clientes', 'nav.more': 'Más',
    'title.invoices': 'Facturas', 'title.items': 'Registro de artículos', 'title.summary': 'Resumen', 'title.settings': 'Ajustes',
    'aria.back': 'Atrás', 'aria.main': 'Principal', 'aria.logo': 'B-RUIZ Tienda Online',
    'tool.show': 'Mostrar montos', 'tool.hide': 'Ocultar montos', 'tool.download': 'Descargar o exportar', 'tool.filter': 'Filtrar', 'tool.settings': 'Ajustes',
    'status.InTransit': 'En tránsito', 'status.Available': 'Disponible', 'status.Owing': 'Debe', 'status.Paid': 'Pagado', 'status.Closed': 'Cerrado', 'status.Received': 'Recibido',
    'invstatus.Paid': 'Pagada', 'invstatus.Owing': 'Pendiente', 'invstatus.Updated': 'Actualizada',
    'cust.Owing': 'Debe', 'cust.UpToDate': 'Al día',
    'filter.all': 'Todos',
    'btn.cancel': 'Cancelar', 'btn.close': 'Cerrar', 'btn.done': 'Listo', 'btn.gotIt': 'Entendido', 'btn.newBatch': '+ Nuevo lote', 'btn.importXlsx': 'Importar mi libro .xlsx',
    'aria.dismiss': 'Descartar', 'aria.remove': 'Quitar', 'aria.selectItem': 'Seleccionar para facturar',
    'install.title': 'Instala la app B-RUIZ', 'install.sub.prompt': 'Funciona sin internet y se abre como una app normal', 'install.sub.add': 'Agrégala a tu pantalla de inicio',
    'install.btn': 'Instalar', 'install.how': 'Cómo', 'install.done': 'App instalada 🎉',
    'ig.android.title': 'Instala la app', 'ig.android.note': 'Tu navegador la instala desde su menú:',
    'ig.android.chrome': '<b>Chrome / Edge (Android):</b> toca <b>⋮</b> → <b>Instalar app</b> (o <b>Agregar a la pantalla principal</b>)',
    'ig.android.samsung': '<b>Samsung Internet:</b> toca <b>☰</b> → <b>Agregar página a</b> → <b>Pantalla de inicio</b>',
    'ig.android.desktop': '<b>Chrome / Edge en computadora:</b> haz clic en el ícono de instalar en la barra de direcciones',
    'ig.ios.title': 'Agrégala a la pantalla de inicio de tu iPhone', 'ig.ios.intro': 'Toma unos 10 segundos. Una vez agregada, la app se abre a pantalla completa con su propio ícono.',
    'ig.ios.warnInApp': '⚠️ Parece que estás en un navegador dentro de otra app (Instagram, Facebook, WhatsApp…). No puede instalar apps. Toca <b>Copiar enlace</b> abajo, abre <b>Safari</b> y pégalo en la barra de direcciones.',
    'ig.ios.warnOther': 'No estás en Safari. Chrome en iPhone también funciona: toca el ícono de <b>Compartir</b> junto a la barra de direcciones. Si no lo encuentras, abre esta página en <b>Safari</b>.',
    'ig.s1.t': 'Toca el botón Compartir', 'ig.s1.d': 'El cuadrado con una flecha, en la parte inferior de Safari (en iPad está arriba).',
    'ig.s2.t': 'Desliza y toca «Agregar a pantalla de inicio»', 'ig.s2.d': 'Está en la lista, debajo de la fila de apps. Quizás tengas que deslizar hacia arriba.',
    'ig.s3.t': 'Toca «Agregar» arriba a la derecha', 'ig.s3.d': 'Puedes dejar el nombre <b>B-RUIZ</b>.',
    'ig.s4.t': 'Ábrela desde tu pantalla de inicio',
    'ig.s4.d': 'Busca el ícono de B-RUIZ y tócalo. Tus datos se guardan en este teléfono — si ya ingresaste datos en Safari, usa primero <b>Descargar → Copia completa</b> y luego <b>Restaurar copia</b> en la app nueva.',
    'ig.share': 'Compartir', 'ig.copy': 'Copiar', 'ig.bookmarks': 'Añadir a marcadores', 'ig.favourites': 'Añadir a favoritos', 'ig.addHome': 'Agregar a pantalla de inicio', 'ig.find': 'Buscar en la página',
    'ig.dlg.cancel': 'Cancelar', 'ig.dlg.title': 'Agregar a inicio', 'ig.dlg.add': 'Agregar', 'ig.copyLink': 'Copiar enlace',
    'home.welcome': 'Bienvenido 👋', 'home.welcomeText': 'Empieza creando un lote, o importa tu hoja de cálculo desde Más → Datos.',
    'home.filtered': 'Filtrado: {label}', 'home.filteredHint': 'El período limita ventas, gastos y ganancia · toca para cambiar',
    'home.profit': 'Ganancia de artículos vendidos', 'home.sales': 'Ventas (pagadas)', 'home.owing': 'Te deben', 'home.expenses': 'Gastos', 'home.avail': 'Disponibles · en tránsito',
    'home.quick': 'Acciones rápidas', 'home.payClearing': 'Pagar despacho', 'home.receive': 'Recibir lote', 'home.priceItems': 'Poner precios',
    'home.batches': 'Lotes', 'home.soldOf': '{sold}/{count} vendidos', 'home.profitWord': 'ganancia', 'home.whoOwes': 'Quién te debe', 'home.recent': 'Facturas recientes',
    'home.itemsOwing.one': '{n} artículo pendiente', 'home.itemsOwing.other': '{n} artículos pendientes',
    'stock.none': 'Aún no hay inventario', 'stock.noneText': 'Primero crea un lote desde Inicio.',
    'stock.allClosed': 'Todos los lotes están cerrados', 'stock.allClosedText': 'Los lotes cerrados siguen en Inicio y en los registros. Crea un lote nuevo para seguir vendiendo.',
    'stock.addBatch': '+ Lote', 'stock.invested': '{status} · {amount} invertido', 'stock.clearingLine': 'Despacho {amount} ({pct}%) · quedan {left}',
    'stock.noMatch': 'Ningún artículo coincide con este filtro.', 'item.untitled': 'Artículo sin nombre',
    'bar.sell.one': 'Vender {n} artículo →', 'bar.sell.other': 'Vender {n} artículos →', 'bar.create': 'Crear factura · {amount}',
    'sell.empty': 'Aún no hay nada que vender', 'sell.emptyText': 'Marca el círculo de los artículos en Inventario y vuelve aquí para facturarlos.', 'sell.choose': 'Elegir artículos',
    'sell.items': 'Artículos ({n})', 'sell.noDesc': 'Sin descripción', 'sell.noPrice': 'sin precio', 'sell.edit': 'Editar', 'sell.onInv': ' · en {no}',
    'sell.customer': 'Cliente', 'sell.customerPh': 'Nombre existente o nuevo', 'sell.paying': 'Monto que paga ahora (TTD)', 'sell.payFull': 'Pagar todo',
    'prev.total': 'Total (con entrega {amount})', 'prev.prev': 'Pagado anteriormente', 'prev.prevRef': 'Pagado anteriormente ({ref})', 'prev.payingNow': 'Paga ahora',
    'prev.owingAfter': 'Queda debiendo', 'prev.tip': 'Propina', 'prev.profit': 'Ganancia', 'prev.loss': 'Pérdida', 'prev.ready': 'Lista para crear la factura.',
    'inv.created': 'Creada {no} · saldo {amount}', 'inv.deleted': '{id} eliminada.',
    'err.count': 'Ingresa un número válido de artículos.', 'err.batch': 'Lote no encontrado.', 'err.hasInvoiced': 'Este lote tiene artículos facturados. Ciérralo en su lugar.',
    'err.payment': 'Ingresa un monto de pago mayor que 0.', 'err.noItems': 'Selecciona al menos un artículo.', 'err.noClient': 'Ingresa o elige un cliente.',
    'err.noDesc': 'Cada artículo seleccionado necesita una descripción.', 'err.noPrice': 'Cada artículo seleccionado necesita un precio de venta.', 'err.noPaying': 'Ingresa el monto que paga.',
    'err.notBackup': 'No es un archivo de copia de seguridad.', 'err.notWorkbook': 'Este no es el libro del control (necesita Batch Log y Hidden Master Log).',
    'err.sheetjs': 'No se pudo cargar el lector de hojas de cálculo (requiere internet).', 'err.save': 'No se pudo guardar en el navegador.',
    'people.none': 'Aún no hay clientes', 'people.noneText': 'Los clientes aparecen al crear tu primera factura.', 'people.search': 'Buscar clientes', 'people.noMatch': 'Sin resultados.',
    'people.sub.one': '{n} artículo · {amount} en ventas', 'people.sub.other': '{n} artículos · {amount} en ventas',
    'more.invoices': 'Facturas', 'more.invoicesSub': '{n} en total', 'more.items': 'Registro de artículos', 'more.itemsSub': '{n} artículos',
    'more.summary': 'Resumen', 'more.summarySub': 'Ventas, gastos y ganancia por mes', 'more.settings': 'Ajustes', 'more.settingsSub': 'Idioma, tema, tasas de cambio',
    'more.install': 'Instalar app', 'more.installIOS': 'Agrégala a la pantalla de inicio de tu iPhone', 'more.installOther': 'Agrégala a tu pantalla de inicio',
    'more.data': 'Datos', 'more.import': 'Importar libro .xlsx', 'more.importSub': 'Reemplaza los datos de este dispositivo', 'more.backup': 'Copia de seguridad', 'more.backupSub': 'Guarda todo en un archivo',
    'more.restore': 'Restaurar copia', 'more.restoreSub': 'Carga un archivo de copia', 'more.erase': 'Borrar todos los datos', 'more.eraseSub': 'No se puede deshacer — haz una copia primero',
    'more.local': 'Los datos se guardan solo en este dispositivo.', 'more.version': 'Versión {v}',
    'invoices.none': 'Aún no hay facturas.', 'items.all': 'Todos los artículos',
    'summary.sales': 'Ventas {y}', 'summary.profit': 'Ganancia {y}', 'summary.expenses': 'Gastos {y}', 'summary.owingNow': 'Deuda actual', 'summary.byMonth': 'Por mes',
    'summary.legend': 'Rosa = ventas, gris = gastos (se cuentan en el mes en que se pidió el lote).', 'summary.total': 'Total',
    'summary.rowExpense': 'Gastos', 'summary.rowSales': 'Ventas', 'summary.rowProfit': 'Ganancia',
    'set.language': 'Idioma', 'set.appearance': 'Apariencia', 'set.light': '☀️ Claro', 'set.dark': '🌙 Oscuro', 'set.auto': '📱 Auto', 'set.theme': 'Tema',
    'set.autoNote': 'Auto sigue el modo claro u oscuro de tu teléfono.', 'set.business': 'Negocio', 'set.year': 'Año', 'set.margin': 'Margen predeterminado %',
    'set.markup': 'Recargo sobre la tasa (×)', 'set.rate': '{c} → TTD (tasa de mercado)',
    'set.rateNote': 'Tasa efectiva = mercado × recargo. Escribe la tasa de hoy; los lotes nuevos la usan y los existentes conservan la suya.', 'set.save': 'Guardar ajustes', 'set.saved': 'Ajustes guardados.',
    'batch.prefix': 'LOTE', 'batch.new': 'Nuevo lote', 'batch.newNote': 'Igual que pedir en la hoja: indica la tienda, la cantidad de artículos y el costo total.', 'batch.store': 'Tienda', 'batch.count': 'N.º de artículos',
    'batch.currency': 'Moneda', 'batch.totalCost': 'Costo total', 'batch.marginPct': 'Margen %', 'batch.rateHint': 'Tasa {rate} → {amount} antes del despacho.', 'batch.create': 'Crear lote',
    'batch.created': '{id} creado — completa los datos de los artículos en Inventario.',
    'batch.ordered': 'Pedido', 'batch.cost': 'Costo', 'batch.clearingPaid': 'Despacho pagado', 'batch.invested': 'Invertido', 'batch.sales': 'Ventas', 'batch.profit': 'Ganancia',
    'batch.transitLast': 'Compra → último pago de despacho', 'batch.sincePurchase': 'Tiempo desde la compra', 'batch.lastClearing': 'Último pago de despacho',
    'dur': '{m} m · {w} sem · {d} d',
    'batch.payClearing': 'Pagar despacho (TTD)', 'batch.recordPayment': 'Registrar pago', 'batch.viewItems': 'Ver artículos →', 'batch.markReceived': 'Marcar como recibido → artículos Disponibles',
    'batch.close': 'Cerrar lote', 'batch.delete': 'Eliminar (creado por error)',
    'batch.closeNote': 'Cerrar conserva el lote en tus registros e historial. Los artículos sin vender pasan a Cerrado; los vendidos y pendientes se mantienen.',
    'clear.title': 'Pagar despacho', 'clear.batch': 'Lote', 'clear.amount': 'Monto (TTD)', 'clear.noBatch': 'Primero crea un lote.', 'clear.recorded': 'Pago de despacho registrado para {id}.',
    'recv.title': 'Recibir lote', 'recv.note': 'Marca el lote como recibido y cambia sus artículos En tránsito a Disponible.', 'recv.mark': 'Marcar recibido', 'recv.none': 'No hay lotes en tránsito.',
    'recv.done': '{id} recibido — {n} artículo(s) ahora Disponible(s).', 'batch.closed': '{id} cerrado.', 'batch.deleted': '{id} eliminado.',
    'confirm.close': '¿Cerrar {id}? Los artículos sin vender pasan a Cerrado. Los vendidos y pendientes se quedan en tus registros.',
    'confirm.delBatch': '¿Eliminar {id} y todos sus artículos para siempre? No se puede deshacer.', 'confirm.delInv': '¿Eliminar {id}? Sus artículos vuelven a su estado anterior.',
    'confirm.reset1': '¿Borrar TODOS los datos de este dispositivo? Haz una copia de seguridad primero.', 'confirm.reset2': '¿Seguro que quieres borrar todo?', 'confirm.import': 'Importar reemplaza los datos de este dispositivo. ¿Continuar?',
    'item.desc': 'Descripción', 'item.descPh': 'p. ej. Vestido azul', 'item.cost': 'Costo ({cur})', 'item.sold': 'Vendido en (TTD)', 'item.delivery': 'Entrega (TTD)', 'item.status': 'Estado',
    'item.invoice': ' · factura {no}', 'item.addInv': 'Agregar a la factura', 'item.removeInv': 'Quitar de la factura', 'item.added': 'Agregado a la factura.',
    'calc.costTTD': 'Costo (TTD)', 'calc.clearing': 'Parte del despacho', 'calc.landed': 'Costo final', 'calc.rec': 'Precio recomendado', 'calc.profit': 'Ganancia', 'calc.profitRec': 'Ganancia (al precio recomendado)',
    'invUI.share': 'Compartir imagen de la factura', 'invUI.save': 'Guardar como imagen', 'invUI.print': 'Imprimir / Guardar como PDF', 'invUI.delete': 'Eliminar factura', 'invUI.status': 'Estado:',
    'invUI.profit': 'ganancia', 'invUI.loss': 'pérdida', 'invUI.tip': 'propina', 'invUI.lang': 'Idioma de la factura',
    'doc.billTo': 'FACTURAR A', 'doc.invoiceNo': 'FACTURA N.º', 'doc.date': 'FECHA', 'doc.due': 'VENCE', 'doc.desc': 'Descripción', 'doc.qty': 'CANT.', 'doc.price': 'Precio', 'doc.amount': 'Importe',
    'doc.subtotal': 'Subtotal', 'doc.delivery': 'Entrega', 'doc.total': 'Total', 'doc.paid': 'Pagado', 'doc.prevPaid': 'Pagado anteriormente', 'doc.balance': 'SALDO PENDIENTE',
    'doc.terms': 'Términos o notas', 'doc.thanks': 'Gracias por su compra.', 'doc.stamp': 'PAGADO EN TOTAL', 'doc.bannerAlt': 'Encabezado de factura de B.RUIZ', 'doc.stampAlt': 'Pagado en total',
    'doc.preparing': 'Preparando imagen…', 'doc.saved': 'Imagen de la factura guardada', 'doc.noShare': 'Aquí no se puede compartir, así que se guardó la imagen',
    'doc.shareText': 'Factura {no} — saldo pendiente {amount}', 'doc.loadErr': 'No se pudo cargar el encabezado de la factura.', 'doc.imgErr': 'No se pudo crear la imagen.',
    'cust.owingLabel': 'Debe', 'cust.totalSales': 'Ventas totales', 'cust.itemsBought': 'Artículos comprados', 'cust.itemsBoughtVal': '{n} ({o} pendientes)', 'cust.profit': 'Ganancia generada',
    'cust.lastItem': 'Último artículo', 'cust.invoices': 'Facturas', 'cust.none': 'Ninguna todavía.',
    'flt.title': 'Filtrar', 'flt.note': 'El período limita ventas, gastos y ganancia (según la fecha de factura y de pedido). El lote limita todo. Lo que te deben y las existencias siempre son de hoy.',
    'flt.period': 'Período', 'flt.batch': 'Lote', 'flt.allTime': 'Todo el tiempo', 'flt.thisMonth': 'Este mes', 'flt.lastMonth': 'Mes pasado', 'flt.thisYear': 'Este año',
    'flt.allBatches': 'Todos los lotes', 'flt.clear': 'Quitar filtro',
    'dl.title': 'Descargar', 'dl.note': 'Las hojas de cálculo se abren en Excel o Google Sheets.', 'dl.full': 'Copia de seguridad completa', 'dl.fullSub': 'Todo, para restaurar después (.json)',
    'dl.invoices': 'Facturas', 'dl.items': 'Artículos', 'dl.customers': 'Clientes', 'dl.rows': '{n} filas (.csv)',
    'csv.invoices': 'Factura N.º|Cliente|Artículos|Estado|Total|Monto pagado|Pagado anteriormente|Saldo pendiente|Entrega|Fecha|Fecha de vencimiento|Cantidad|Ganancia|Pérdida|Propina',
    'csv.items': 'ID del artículo|Lote|Tienda|Estado|Descripción|Cliente|Costo (moneda de la tienda)|Costo (TTD)|Despacho|Costo final|Vendido en|Ganancia|Monto pagado|Debe|Factura N.º',
    'csv.customers': 'Cliente|Estado|Total que debe|Ventas totales|Artículos comprados|Artículos pendientes|Ganancia generada|Último artículo|Última compra',
    'toast.pressBack': 'Presiona atrás otra vez para salir', 'toast.linkCopied': 'Enlace copiado — pégalo en Safari', 'toast.copyManual': 'Copia la dirección de la barra del navegador',
    'toast.restored': 'Copia restaurada.', 'toast.reading': 'Leyendo libro…', 'toast.imported': 'Se importaron {b} lotes, {i} artículos y {v} facturas.', 'toast.cleared': 'Todos los datos borrados.',
    'upd.updating': 'Actualizando a la última versión…',
  };

  const LANGS = { en: EN, es: ES };
  const KEY = 'buy-sell-pref:lang';
  let lang = 'en';

  // First run: follow the phone's language (Spanish if any preferred language is Spanish). After the user picks one, theirs wins.
  function detect() {
    try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved === 'en' || saved === 'es') return saved; } catch (e) { /* none saved */ }
    const prefs = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
    return prefs.some((l) => /^es\b/i.test(l || '')) ? 'es' : 'en';
  }
  function setLang(l, remember) {
    lang = LANGS[l] ? l : 'en';
    if (remember) { try { localStorage.setItem(KEY, JSON.stringify(lang)); } catch (e) { /* ignore */ } }
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
    return lang;
  }
  // t(key, vars, forceLang): a missing key falls back to English, then to the key itself so a gap is visible rather than blank.
  function t(key, vars, forceLang) {
    const dict = LANGS[forceLang || lang] || EN;
    const s = key in dict ? dict[key] : key in EN ? EN[key] : key;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
  }
  const tn = (key, n, vars, forceLang) => t(key + (n === 1 ? '.one' : '.other'), Object.assign({ n }, vars || {}), forceLang);
  // "dd Mon yyyy" style date in the chosen language; month names come from the browser's own Spanish/English data.
  const locale = (l) => ((l || lang) === 'es' ? 'es' : 'en-GB');
  const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthShort = (i, l) => {
    if ((l || lang) !== 'es') return EN_MONTHS[i]; const m = new Date(2000, i, 1).toLocaleDateString(locale(l), { month: 'short' }).replace('.', ''); return m.charAt(0).toUpperCase() + m.slice(1); };

  const api = { t, tn, setLang, getLang: () => lang, detect, locale, monthShort, LANGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.I18n = api;
})(typeof window !== 'undefined' ? window : globalThis);

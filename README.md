# Buy & Sell Tracker

A mobile-first web app (installable on your phone's home screen, works offline) for importing goods in batches (e.g. SHEIN orders), tracking clearing costs, pricing
items, selling to customers and producing invoices. It replaces the Google Sheets + Apps Script
workbook: same workflow, no spreadsheet needed.

No build step and no server. Open `index.html`, or host the folder on GitHub Pages
(Settings → Pages → deploy from branch, root). Data is stored in your browser's localStorage.

## Using it on a phone

Bottom tab bar: **Home** (profit, owing, quick actions, batches), **Stock** (item cards with filters; tick the circle to add to an invoice),
**Sell** (customer, amount paying, live profit/owing preview, create invoice), **People** (customers and what they owe), **More** (invoices, item log, summary, settings, backup/import).
A contextual action bar sits above the tabs. Editing happens in slide-up sheets.

Android Back button / gesture works like a native app: it closes an open pop-up first, then steps back out of a sub-screen
(e.g. More → Summary), then goes from any other tab to Home; on Home it asks you to press Back again to exit.
Pop-ups (sheets) are dismissed by pulling their header (the handle bar or the title) down; the content only scrolls; whatever you typed into an item is saved as you type, so dismissing never loses it.

When the app isn't installed yet, Home shows an **Install** banner at the top (Android/Chrome opens the system install prompt; on iPhone it shows the Add to Home Screen steps). It disappears once installed and can be dismissed for a week. **More → Install app** always opens the guide: on iPhone an illustrated Add to Home Screen walkthrough (with a warning and *Copy link* when opened inside Instagram/Facebook/WhatsApp, which can't install apps).

When the on-screen keyboard opens, every screen and pop-up adapts: ordinary pages (Sell, People search, Settings) get room to scroll past the keyboard and bring the tapped field into view; a pop-up grows to fill the space from the top of the screen down to the keyboard, scrolls, keeps the tapped field in view and the bottom tab bar steps aside until the keyboard closes.

**Updates wait for you.** Every deploy stamps a new version into the service worker (the commit id). The app looks for it when it opens, when you switch back to it, when the phone comes back online and every 10 minutes. When a new version is ready, a bar appears at the bottom of the screen with an **Update** button, even while the app is open; nothing reloads until you press it. The version is shown at the bottom of **More**. The deploy workflow also runs `npm test` first, so a failing test blocks the deploy.

To install: open the site in Chrome (Android) → ⋮ → *Add to Home screen*, or Safari (iPhone) → Share → *Add to Home Screen*.

## Languages (English / Español)

The app is fully bilingual. **More → Settings → Language** switches the whole app at once and remembers the choice; on first run it
follows the phone's language (Spanish if the phone is set to Spanish, otherwise English). Invoices have their own **English | Español**
switch (shown above the invoice), because a customer may read a different language from the one the app is set to. The Spanish invoice uses
a Spanish banner (`icons/invoice-banner-es.jpg`, "FACTURA"). Batch ids show as `LOTE-001` in Spanish but stay `BATCH-001` in your data.

**Invoice design** (Settings → Invoice design): eleven looks for the invoices you share and print — the flower picture (Classic) and ten drawn in code (`js/invdesign.js`): Wave (follows the theme colour), Marble, Halftone, Rust, Ember, Honeycomb, Swoosh, Chevron, Navy, Indigo. The business name, town, phone and email (Settings → Business details) are printed in the picture at the top. Invoices are an A4 page shape.

**Photo storage:** the original screenshot is kept for a set time after you save a photo (Settings → Keep screenshots: 1, 2, 7 days or until sold; default 2) so you can edit again, and is dropped at once when the item is sold. A sold item's saved photo stays 7 days (the return window), then only the small thumbnail remains, shown in the stock list and on the invoice (one stored copy). Settings → Storage used has a Free up space button for existing originals. The invoice screen has Share invoice / Download (always a US Letter PDF), Delete, Close.

**Rule for everything we add from now on:** every visible text goes through `t('key')` (or `tn('key', n)` for singular/plural) and the key
is written in both languages in `js/i18n.js`. `npm test` checks that both dictionaries have the same keys and `{placeholders}`, that
every key the code uses exists, that every logic error has a translation and that key styles are still present; the deploy workflow runs
the tests first, so a missing translation blocks the deploy. To add a language, add a dictionary to `LANGS` in `js/i18n.js` (the test tells
you what is missing) and a button for it appears in Settings.

## Settings

One page: an account card, then sections of rows (App: Language, Appearance, Theme, Language for customers; Business details; Data: Backup & restore, Import workbook, Storage used; About: App version, Check the rules, Erase all data). Small choices open a short pop-up; Theme, Business details, Backup & restore and Storage used open their own page. **App version** shows `APP_VERSION` (js/app.js, goes up by 0.01 per release, like the rules 1.00, 1.01 … 1.99, 2.00) and the rules version it needs; tapping it checks for an update. **Check the rules** reads your own workspace (must work) and another workspace (must be refused). **Storage used** shows versions, cloud data against the free ~1 GB, space on the phone, counts and an estimate of today's cloud reads/writes (this phone only). `test/version.test.js` fails if the rules version in the app differs from `firestore.rules`.

## Photos (step 1: on the phone)

- In **Stock**, "Add photos" (gallery, several at once, or camera) fills the next items of the batch that have no photo, in item order. Extra photos offer to add more items.
- Every photo must be **checked** (cropped and saved) before it can be shared. Unchecked photos show "⚠ Check", the "Need check" filter lists them, and sharing one opens "Check this photo first".
- The check screen has two steps: crop (the phone's screenshot around the picture is cut away automatically; drag the frame, pick Free/Square/4:5/3:4, rotate, reset), then hide marks: you draw up to 4 boxes over anything customers should not see and choose, for each box, blur, smart cover or your logo; the preview is exactly what is saved. Tapping a box selects it, the ✕ removes it. Tap the picture for a full-screen zoomable view. Check or edit photo reopens the saved edit.
- **Shown to customers** (picture, name, selling price) is separate from **Private — never shared** (cost, conversion, clearing share, landed cost, recommended price, profit). Sharing sends the picture with the price drawn as a tag and "name + price" (or "Available") as the caption, in the invoice language. No cost is ever included.
- Photos are stored in the phone's IndexedDB (a ~200 px thumbnail, a ~640 px picture and the original). **They are not in JSON backups yet** and are not synced to other phones; cloud storage comes in a later step.
- Code: `js/photo.js` (pixels: find the picture, hide marks), `js/photostore.js` (IndexedDB), `js/photoui.js` (screens). Tests: `test/photo.test.js`.

## Cloud account (step 2)

- Sign in with Google or email/password (Settings > Account, or the banner on Home). Firebase project `b-ruiz`; the web config in `js/cloud.js` is public by design, the data is protected by `firestore.rules`.
- **One-time setup in the Firebase console:** Authentication > Sign-in method (Google + Email/Password), Authorized domains (`akeemsilver.github.io`), Firestore database, then paste `firestore.rules` into Firestore > Rules and Publish. Until the rules are published, the app shows "the cloud database is not set up to accept data yet".
- Data lives in a **workspace** (`workspaces/{id}`, members map `{uid: role}`), so one project can later serve many businesses. Each batch, item and invoice is its own document, plus `meta/settings` and `meta/customers`.
- The phone keeps its own copy and works offline. `js/sync.js` (tested in `test/sync.test.js`) sends what changed here and brings down what changed in the cloud; if the same record was edited on both sides, the unsent phone edit wins.
- First sign-in: empty cloud = this phone's data is uploaded (nothing is deleted from the phone); empty phone = the cloud data comes down; both have data = you choose which copy to keep (closing the question changes nothing and signs you out).
- Photos are still phone-only (step 3 moves them to cloud storage). Firebase's browser files are vendored in `vendor/firebase` so the app does not depend on a CDN.

## Workflow (same as the sheet)

| Sheet action | In the app |
|---|---|
| DASHBOARD → A7 Order | **Home → New batch** (store, items, total cost, currency, margin) |
| A16 Pay clearing | **Home → Pay clearing** |
| E18 Make available | **Home → Receive batch** (In Transit → Available) |
| Inventory Log, fill in items | **Stock** tab: tap an item to edit description, cost, sold for, status, delivery |
| O2 Sell & Create Invoice | tick items in **Stock** → **Sell** tab → customer + amount paying → **Create invoice** |
| Invoice tab / PDF export | **More → Invoices → open one**: laid out like the sheet's invoice (B.RUIZ banner, mauve table, balance bar). *Share invoice image* sends a PNG (WhatsApp etc.), *Save as image* downloads it, *Print / Save as PDF* prints one regular A4 page with a narrow receipt at the top centre. Fully paid invoices get a **PAID IN FULL** stamp (with the payment date), drawn the same on screen, in the image and in the PDF |
| Customer / Item / Batch / Summary logs | **People** tab, **More → Item log / Summary**; batch stats on Home and in Stock |
| Delete batch / Master reset | Delete in a batch's sheet, **More → Erase all data** (both ask for confirmation) |

### Rules carried over from the script

- Effective exchange rate = market rate × 1.025 (editable markup); each batch keeps the rate it was created with.
- Clearing is spread over items in proportion to their cost; landed cost = cost (TTD) + clearing share.
- Recommended price = landed × (1 + margin%).
- Invoice delivery = the largest delivery fee among the selected items.
- Re-invoicing items already on an invoice carries over what was previously paid and marks the old invoice *Updated*.
- Overpayment becomes a **tip** and is deducted from profit; if profit goes negative it is recorded as a **loss** and profit is 0.
- A batch's status comes from its items: *In Transit* while any item is, otherwise *Received*. **Close batch** keeps the history (unsold items become *Closed*, sold and owing items stay). Permanent delete is only offered for a batch with nothing sold.
- Each invoice's cash (paid + previously paid) is spread over its items in order, capped at each sold price. That gives every item a Paid / Owing amount, which feeds the Customers and Item views exactly like the sheet's Item Log and Customer Log.
- Names are always cleaned: trailing/extra spaces are removed from customer names, item descriptions and stores, and customers that differ only by capitalisation ("renimar" / "Renimar ") are merged. This runs when you create an invoice, import, close a pop-up and when the app loads.
- Customer *Profit made* adds up invoice profit only (losses are ignored), as in the sheet.
- Invoice is *Paid* when paid + previously paid ≥ total, otherwise *Owing*; due date is 7 days after the invoice date.

## Data

- **Import .xlsx** reads `Batch Log`, `Hidden Master Log` and `Invoice Log` from the existing workbook (needs internet once, to load the spreadsheet reader from cdnjs).
- **Backup / Restore** export and import everything as JSON. Back up regularly: clearing browser data erases the app's data.
- Live exchange rates (GOOGLEFINANCE in the sheet) are typed in under More → Settings.

## Original script

`apps-script/Code.gs` is the original Google Apps Script, kept for reference. The app's rules in `js/logic.js` were checked against it, and
the tests compare the Customer Log computed by the app with the one in the workbook.

## Develop

```
npm test                 # business-logic tests (Node, no dependencies)
npm start                # serve on http://localhost:8080
```

`js/logic.js` holds all rules (pure functions, unit-tested); `js/app.js` is the UI.
Set `WORKBOOK_JSON=/path/to/dump.json` when running the tests to also check the importer against a real workbook dump.

**Back button:** Back (the phone's button, the swipe, and the ‹ arrows in the app) always returns to the place you came from and never loops. The main tabs and the More/Settings screens form one trail (`places` in `js/app.js`); full-screen pages opened one from another (customer → invoice → item → payment) form a second trail (`pageStack`). Going to a screen that is already on its trail cuts the trail back to it, so Back never bounces between two screens. Every new full-screen page must call `enterPage(kind, key, reopen)` when it opens; every in-app back arrow uses `data-act="close"`. At Home, the first Back shows "Press back again to exit".

## Before the app goes live (do these when the owner says "I'm ready for the app to go live")
1. **Firebase plan:** upgrade the `b-ruiz` project to Blaze (card on file). Then set a budget alert of about US$1 in the Google Cloud console (alerts email; they do not stop charges).
2. **Cloud Storage:** Firebase console → Build → Storage → Get started, pick a US location.
3. **Storage rules:** paste `storage.rules` ("B Ruiz Storage rules 1.01") into Storage → Rules and publish. Approve the permission it asks for to read the workspace list. 1.01 also lets the store keep its sharp pictures (stores/{id}/) — the store uses them automatically once Storage is on, and deletes each one a week after the item sells (same rule as the saved photo).
4. **Build cloud photos** (not built yet): upload only the 900 px photo and the 200 px thumbnail, delete the full photo in the cloud 7 days after the sale, keep thumbnails, optional Wi-Fi-only switch (off by default).
5. **Workspace sharing** (not built yet): invite code (7 days), Owner/Seller roles, per-person "can see costs and profit", who made each sale, duplicate invoice-number protection, Firestore rules 1.01.
6. Re-check the free limits on the Firebase pricing page before relying on them.

## Not built yet (the owner wants to come back to these later)
- **Workspace sharing:** the owner and a second person each sign in with their own account in one shared business. Invite code valid 7 days; roles Owner and Seller; the owner chooses per person whether they can see costs and profit; record who made each sale; protect against duplicate invoice numbers; new Firestore rules 1.01 (the owner publishes them).
- **Branding settings:** make the invoice banner, colours, logo and currency settings, so the app is not specific to B-RUIZ.
- **Parked ideas:** payment reminders for people who owe, warnings for items with missing costs, an expenses section.
- **Cloud photos:** needs the Firebase steps in "Before the app goes live" above.
- **Online store (built; needs Firestore rules 1.01 published and a real end-to-end test before sharing the link):** a public store page (`store.html`, same GitHub Pages site) showing only public fields (name, price, sale price, photo; never costs) of the batches the owner publishes, with an optional "arriving soon" for in-transit items. Customers pick items, choose a location (the owner's list of locations, each with pickup/delivery and a delivery price), enter name and phone, and send an order. Orders arrive in an Orders screen in the app; Confirm opens Sell with the items and customer ready. Needs: a public catalogue document and a create-only orders collection in Firestore (rules 1.01+), small photos (either small pictures stored in Firestore, free, or Cloud Storage, sharper but needs Blaze), and optional App Check against spam. Orders are requests: the owner confirms, so two people can ask for the same item.

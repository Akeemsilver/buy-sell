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
Pop-ups (sheets) can be dragged down to dismiss; whatever you typed into an item is saved as you type, so dismissing never loses it.

When the app isn't installed yet, Home shows an **Install** banner at the top (Android/Chrome opens the system install prompt; on iPhone it shows the Add to Home Screen steps). It disappears once installed and can be dismissed for a week. **More → Install app** always opens the guide: on iPhone an illustrated Add to Home Screen walkthrough (with a warning and *Copy link* when opened inside Instagram/Facebook/WhatsApp, which can't install apps).

To install: open the site in Chrome (Android) → ⋮ → *Add to Home screen*, or Safari (iPhone) → Share → *Add to Home Screen*.

## Workflow (same as the sheet)

| Sheet action | In the app |
|---|---|
| DASHBOARD → A7 Order | **Home → New batch** (store, items, total cost, currency, margin) |
| A16 Pay clearing | **Home → Pay clearing** |
| E18 Make available | **Home → Receive batch** (In Transit → Available) |
| Inventory Log, fill in items | **Stock** tab: tap an item to edit description, cost, sold for, status, delivery |
| O2 Sell & Create Invoice | tick items in **Stock** → **Sell** tab → customer + amount paying → **Create invoice** |
| Invoice tab / PDF export | **More → Invoices → open one**: laid out like the sheet's invoice (B.RUIZ banner, mauve table, balance bar). *Share invoice image* sends a PNG (WhatsApp etc.), *Save as image* downloads it, *Print / Save as PDF* uses the print dialog |
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

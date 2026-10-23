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

To install: open the site in Chrome (Android) → ⋮ → *Add to Home screen*, or Safari (iPhone) → Share → *Add to Home Screen*.

## Workflow (same as the sheet)

| Sheet action | In the app |
|---|---|
| DASHBOARD → A7 Order | **Home → New batch** (store, items, total cost, currency, margin) |
| A16 Pay clearing | **Home → Pay clearing** |
| E18 Make available | **Home → Receive batch** (In Transit → Available) |
| Inventory Log, fill in items | **Stock** tab: tap an item to edit description, cost, sold for, status, delivery |
| O2 Sell & Create Invoice | tick items in **Stock** → **Sell** tab → customer + amount paying → **Create invoice** |
| Invoice tab / PDF export | **More → Invoices → open one → Print / Save as PDF** |
| Customer / Item / Batch / Summary logs | **People** tab, **More → Item log / Summary**; batch stats on Home and in Stock |
| Delete batch / Master reset | Delete in a batch's sheet, **More → Erase all data** (both ask for confirmation) |

### Rules carried over from the script

- Effective exchange rate = market rate × 1.025 (editable markup); each batch keeps the rate it was created with.
- Clearing is spread over items in proportion to their cost; landed cost = cost (TTD) + clearing share.
- Recommended price = landed × (1 + margin%).
- Invoice delivery = the largest delivery fee among the selected items.
- Re-invoicing items already on an invoice carries over what was previously paid and marks the old invoice *Updated*.
- Overpayment becomes a **tip** and is deducted from profit; if profit goes negative it is recorded as a **loss** and profit is 0.
- Invoice is *Paid* when paid + previously paid ≥ total, otherwise *Owing*; due date is 7 days after the invoice date.

## Data

- **Import .xlsx** reads `Batch Log`, `Hidden Master Log` and `Invoice Log` from the existing workbook (needs internet once, to load the spreadsheet reader from cdnjs).
- **Backup / Restore** export and import everything as JSON. Back up regularly: clearing browser data erases the app's data.
- Live exchange rates (GOOGLEFINANCE in the sheet) are typed in under More → Settings.

## Develop

```
npm test                 # business-logic tests (Node, no dependencies)
npm start                # serve on http://localhost:8080
```

`js/logic.js` holds all rules (pure functions, unit-tested); `js/app.js` is the UI.
Set `WORKBOOK_JSON=/path/to/dump.json` when running the tests to also check the importer against a real workbook dump.

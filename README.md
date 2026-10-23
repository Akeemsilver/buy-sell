# Buy & Sell Tracker

A browser app for importing goods in batches (e.g. SHEIN orders), tracking clearing costs, pricing
items, selling to customers and producing invoices. It replaces the Google Sheets + Apps Script
workbook: same workflow, no spreadsheet needed.

No build step and no server. Open `index.html`, or host the folder on GitHub Pages
(Settings → Pages → deploy from branch, root). Data is stored in your browser's localStorage.

## Workflow (same as the sheet)

| Sheet action | In the app |
|---|---|
| DASHBOARD → A7 Order | **Dashboard → Create batch** (store, items, total cost, currency, margin) |
| A16 Pay clearing | **Dashboard → Record payment** |
| E18 Make available | **Dashboard → Make available** (In Transit → Available) |
| Inventory Log, fill in items | **Inventory** tab: edit description, cost, sold for, status, delivery |
| O2 Sell & Create Invoice | tick *Add to invoice* → customer + amount paying → **Sell & create invoice** |
| Invoice tab / PDF export | **Invoices → View / PDF** (print dialog → Save as PDF) |
| Customer / Item / Batch / Summary logs | **Customers**, **Items**, **Summary** tabs; batch stats on each Inventory batch |
| Delete batch / Master reset | **Delete** on a batch, **Reset** in the header (both ask for confirmation) |

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
- Live exchange rates (GOOGLEFINANCE in the sheet) are typed in on the Dashboard settings.

## Develop

```
npm test                 # business-logic tests (Node, no dependencies)
npm start                # serve on http://localhost:8080
```

`js/logic.js` holds all rules (pure functions, unit-tested); `js/app.js` is the UI.
Set `WORKBOOK_JSON=/path/to/dump.json` when running the tests to also check the importer against a real workbook dump.

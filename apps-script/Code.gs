/**
 * =========================================================
 * MAIN TRIGGER: ONEDIT CONTROLLER
 * =========================================================
 */
function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var sheetName = sheet.getName();
  var cell = range.getA1Notation();

  // 1. DASHBOARD TRIGGER (A7)
  if (sheetName === "DASHBOARD" && cell === "A7" && range.getValue() === true) {
    runDashboardLogic(e);
  }
  
  // 2. INVOICE TRIGGER (O2)
  else if (sheetName === "Inventory Log" && cell === "O2" && range.getValue() === true) {
    generateInvoiceFromO2(e);
  }
  
    // 3. DASHBOARD PAYMENT TRIGGER (A16)
  else if (sheetName === "DASHBOARD" && cell === "A16" && range.getValue() === true) {
    processClearancePayment(e);
  }
  
    // 4. MAKE AVAILABLE TRIGGER (E18)
  else if (sheetName === "DASHBOARD" && cell === "E18" && range.getValue() === true) {
    handleMakeAvailableTrigger();
  }
  
    // 5. SETTINGS CLEANUP TRIGGER (A39)
  else if (sheetName === "DASHBOARD" && cell === "A39" && range.getValue() === true) {
    runRowCleanup(e);
  }
  
    // 6. PDF EXPORT TRIGGER (A50)
  else if (sheetName === "DASHBOARD" && cell === "A50" && range.getValue() === true) {
    generateInvoicesPDF(e);
  }
  // 7. DELETE INVOICES TRIGGER (A55)
else if (sheetName === "DASHBOARD" && cell === "A55" && range.getValue() === true) {
  deleteInvoices(e);
  }
  // 8. MASTER RESET TRIGGER (A72)
else if (sheetName === "DASHBOARD" && cell === "A72" && range.getValue() === true) {
  masterReset(e);
  }
    // 9. DUAL CHECKBOX BATCH DELETION TRIGGER (Column O, Row 7+)
  else if (sheetName === "Inventory Log" && range.getColumn() === 15 && range.getRow() >= 7 && range.getValue() === true) {
    handleDualCheckboxDeletion(sheet, range.getRow(), e);
  }
    // 10. DASHBOARD REFRESH TRIGGER (E1)
  else if (sheetName === "DASHBOARD" && cell === "E1" && range.getValue() === true) {
    handleDashboardRefresh();
  }
}


/**
 * =========================================================
 * LOGIC: DASHBOARD ORDER ITEMS (A7)
 * =========================================================
 */
function runDashboardLogic(e) {
  var range = e.range;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashboard = ss.getSheetByName("DASHBOARD");
  var inventory = ss.getSheetByName("Inventory Log");
  var hiddenLog = ss.getSheetByName("Hidden Master Log");
  
  if (dashboard) {
    dashboard.getRange("C2").setValue("🚀 Initializing new batch creation...");
  }

  if (!inventory) { inventory = ss.insertSheet("Inventory Log"); }
  if (!hiddenLog) {
    hiddenLog = ss.insertSheet("Hidden Master Log");
    setupHiddenHeaders(hiddenLog);
    hiddenLog.hideSheet(); 
  }
  
  var store = dashboard.getRange("B5").getValue();
  var numItems = parseInt(dashboard.getRange("C5").getValue());
  var datePurchased = new Date();
  var currencyHeader = dashboard.getRange("B9").getValue();
  var currencyPurchase = dashboard.getRange("D9").getValue();
  var purchaseCurrency = dashboard.getRange("D4").getValue();
  var exchangeRate = parseFloat(dashboard.getRange("E5").getValue());
  var totalCostUSD = parseFloat(dashboard.getRange("D5").getValue());
  var dashboardClearingTTD = parseFloat(dashboard.getRange("C18").getValue()); 
  var targetMarginValue = parseFloat(dashboard.getRange("F5").getValue());
  
  if (isNaN(numItems) || numItems <= 0) {
    if (dashboard) {
      dashboard.getRange("C2").setValue("⚠️ Error: Invalid number of items entered.");
    }
    SpreadsheetApp.getUi().alert("Please enter a valid number of items first!");
    range.setValue(false);
    return;
  }
  if (isNaN(dashboardClearingTTD)) { dashboardClearingTTD = 0; }
  if (isNaN(targetMarginValue)) { targetMarginValue = 0; }
  
  var lastRowBeforeInsert = inventory.getLastRow();
  if (lastRowBeforeInsert < 3) { setupInventoryHeaders(inventory); lastRowBeforeInsert = 3; }
  
  SpreadsheetApp.flush(); 
  var currentBatchCount = parseInt(inventory.getRange("E2").getValue()) || 0;
  var nextBatchNum = currentBatchCount + 1;
  var batchId = "BATCH-" + String(nextBatchNum).padStart(3, '0');
  var batchNumOnly = String(nextBatchNum).padStart(3, '0');
  
  if (dashboard) {
    dashboard.getRange("C2").setValue("📦 Generating " + batchId + " (" + numItems + " items)...");
  }

  var rowsToInsert = numItems + 7;
  inventory.insertRowsAfter(4, rowsToInsert);
  
  var row7 = 7, row8 = 8, row9 = 9, row10 = 10, startRow = 11, endRow = startRow + numItems - 1; 
  
  var newBlockRange = inventory.getRange(4, 1, rowsToInsert, 17);
  newBlockRange.clearContent().setBackground("#FFFFFF").setBorder(true, true, true, true, true, true, "#FFFFFF", SpreadsheetApp.BorderStyle.SOLID);
  
  // Batch Headers (Row 7)
  inventory.getRange(row7, 1).setValue("BATCH ID:").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 2).setValue("Items Left").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 3).setValue("Exchange Rate").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 4).setValue("Total Investment (TTD)").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 5).setValue(purchaseCurrency).setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 6).setValue("Total Cost (TTD)").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 7).setValue("Clearing (TTD)").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 8).setValue("Total items").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 9).setValue("Profit Margin %").setFontWeight("bold").setHorizontalAlignment("center"); 
  inventory.getRange(row7, 10).setValue("Total Sales (TTD)").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 11).setValue("Total Profit").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 12).setValue("Date Purchased").setFontWeight("bold").setHorizontalAlignment("center");
  inventory.getRange(row7, 13).setValue("Invoice Total").setFontWeight("bold").setHorizontalAlignment("center");

  // Updated Safety Check and Close Batch labels with "Allan" font
  inventory.getRange("N7").setValue("SAFETY CHECK").setHorizontalAlignment("right").setFontFamily("Allan");
  inventory.getRange("O7").insertCheckboxes();
  inventory.getRange("N8").setValue("CLOSE BATCH").setHorizontalAlignment("right").setFontFamily("Allan");
  inventory.getRange("O8").insertCheckboxes();

  inventory.getRange(row7, 1, 1, 17).setBorder(true, null, null, null, null, null, "#B7B7B7", SpreadsheetApp.BorderStyle.SOLID);

  inventory.getRange(row8, 1).setValue(nextBatchNum).setHorizontalAlignment("center");
  inventory.getRange(row8, 2).setFormula("=COUNTIF(L" + startRow + ":L" + endRow + ", \"Available\")").setHorizontalAlignment("center");
  inventory.getRange(row8, 3).setValue(exchangeRate).setNumberFormat("0.00").setHorizontalAlignment("center");
  inventory.getRange(row8, 4).setFormula('=F8 + G8').setNumberFormat("[$TT$] #,##0.00;[$TT$] (#,##0.00);[$TT$] 0.00").setHorizontalAlignment("center");
  inventory.getRange(row8, 5).setValue(totalCostUSD).setNumberFormat("#,##0.00;(#,##0.00);$0.00").setHorizontalAlignment("center");
  inventory.getRange(row8, 6).setFormula('=C8 * E8').setNumberFormat("[$TT$] #,##0.00;[$TT$] (#,##0.00);[$TT$] 0.00").setHorizontalAlignment("center");
  inventory.getRange(row8, 7).setFormula('=IFERROR(VLOOKUP(INDIRECT("A" & ROW() + 3), INDIRECT("\'Batch Log\'!$A$3:$H"), 8, FALSE), 0)').setNumberFormat("[$TT$] #,##0.00;[$TT$] (#,##0.00);[$TT$] 0.00").setHorizontalAlignment("center");
  inventory.getRange(row8, 8).setValue(numItems).setHorizontalAlignment("center");
  inventory.getRange(row8, 9).clearFormat().setNumberFormat("0").setValue(targetMarginValue).setHorizontalAlignment("center");
  inventory.getRange(row8, 10).setFormula('=SUMIF(\'Hidden Master Log\'!$A:$A, "BATCH-"&TEXT(A8, "000"), \'Hidden Master Log\'!$L:$L)').setNumberFormat("[$TT$] #,##0.00");
  inventory.getRange(row8, 11).setFormula('=SUMIF(\'Hidden Master Log\'!$A:$A, "BATCH-"&TEXT(A8, "000"), \'Hidden Master Log\'!$M:$M)').setNumberFormat("[$TT$] #,##0.00");
  inventory.getRange(row8, 12).setValue(datePurchased).setNumberFormat("dd-mmm-yyyy").setHorizontalAlignment("center");
  inventory.getRange(row8, 1, 1, 17).setBorder(null, null, true, null, null, null, "#B7B7B7", SpreadsheetApp.BorderStyle.SOLID);
  inventory.getRange(row8, 13).setFormula('=SUMIFS(\'Hidden Master Log\'!$L:$L, \'Hidden Master Log\'!$A:$A, "BATCH-"&TEXT(A8, "000"), \'Hidden Master Log\'!$R:$R, TRUE) + SUMIFS(\'Hidden Master Log\'!$Q:$Q, \'Hidden Master Log\'!$A:$A, "BATCH-"&TEXT(A8, "000"), \'Hidden Master Log\'!$R:$R, TRUE)').setNumberFormat("[$TT$] #,##0.00");

  inventory.getRange(row9, 1, 1, 17).clearContent().setBackground("#FFFFFF").setBorder(true, true, true, true, true, true, "#FFFFFF", SpreadsheetApp.BorderStyle.SOLID);
  
  var subHeaders = ["Batch ID", "Item ID", "Store", "Item Name/Desc", currencyHeader, "Cost (TTD)", "Clearing", "Landed Cost", "Recommended Selling Price", "Sold For", "Profit", "Status", "Existing Customer", "New Customer", "Delivery (TTD)", "Add to Invoice", "Invoice #"];
  var subHeaderRange = inventory.getRange(row10, 1, 1, 17);
  subHeaderRange.setValues([subHeaders]).setBackground("#C27BA0").setFontColor("#FFFFFF").setFontWeight("bold").setFontFamily("Arial").setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  
  var headerRow3 = inventory.getRange(3, 1, 1, 17);
  subHeaderRange.copyTo(headerRow3);
  headerRow3.setBackground("#741B47"); 
  
  var data = [], formulas = [];
  for (var i = 0; i < numItems; i++) {
    var currentRow = startRow + i;
    var itemId = batchNumOnly + "-" + String(i + 1).padStart(3, '0');
    data.push([batchId, itemId, store, "", 0]);
    formulas.push([
      "=IF(E" + currentRow + " > 0, E" + currentRow + " * $C$" + row8 + ", \"\")",                                             
      "=IF(AND(E" + currentRow + ">0, $G$" + row8 + ">0), ($G$" + row8 + "/$F$" + row8 + ")*F" + currentRow + ", \"\")", 
      "=IF(AND(E" + currentRow + " > 0, $F$" + row8 + " > 0), F" + currentRow + " + G" + currentRow + ", \"\")",               
      "=IF(OR(ISBLANK(E" + currentRow + "), E" + currentRow + "=0), \"\", H" + currentRow + " * (1 + $I$" + row8 + " / 100))",     
      "",                                                                                                               
      "=IF(OR(ISBLANK(E" + currentRow + "), E" + currentRow + "=0), \"\", IF(J" + currentRow + " > 0, J" + currentRow + " - H" + currentRow + ", IF(I" + currentRow + " > 0, I" + currentRow + " - H" + currentRow + ", \"\")))" 
    ]);
  }

  inventory.getRange(startRow, 1, numItems, 5).setValues(data);
  inventory.getRange(startRow, 6, numItems, 6).setFormulas(formulas);
  inventory.getRange(startRow, 16, numItems, 1).insertCheckboxes();
  
  var batchLog = ss.getSheetByName("Batch Log");
  if (batchLog) {
    var lastBatchRow = batchLog.getLastRow();
    if (lastBatchRow >= 3) {
      var validationRange = batchLog.getRange("Y3:Y");
      var customerRule = SpreadsheetApp.newDataValidation()
        .requireValueInRange(validationRange, true)
        .setAllowInvalid(false)
        .build();

      inventory.getRange(startRow, 13, numItems, 1).setDataValidation(customerRule);
    }
  }

  var ttCurrencyFormat = "[$TT$] #,##0.00"; 
  var cleanCurrencyFormat = "[$TT$] #,##0.00;[$TT$] (#,##0.00);[$TT$] 0.00";
  inventory.getRange(startRow, 5, numItems, 1).setNumberFormat("#,##0.00"); 
  inventory.getRange(startRow, 6, numItems, 3).setNumberFormat(cleanCurrencyFormat); 
  inventory.getRange(startRow, 9, numItems, 3).setNumberFormat(cleanCurrencyFormat); 
  inventory.getRange(startRow, 15, numItems, 1).setNumberFormat(ttCurrencyFormat); 
  
  var statusRule = SpreadsheetApp.newDataValidation().requireValueInList(['In Transit', 'Available', 'Paid', 'Owing'], true).setAllowInvalid(false).build();
  inventory.getRange(startRow, 12, numItems, 1).setDataValidation(statusRule).setValue("In Transit");
  
  for (var r = 0; r < numItems; r++) {
    var rowNum = startRow + r;
    inventory.getRange(rowNum, 1, 1, 17).setBackground((rowNum % 2 === 0) ? "#FFFFFF" : "#FAEDF0");
  }
  inventory.getRange(endRow, 1, 1, 17).setBorder(null, null, true, null, null, null, "#B7B7B7", SpreadsheetApp.BorderStyle.SOLID);
  
  if (dashboard) {
    dashboard.getRange("C2").setValue("🔒 Syncing data with Hidden Master Log...");
  }

  var hiddenLastRow = hiddenLog.getLastRow();
  var hiddenStartRow = hiddenLastRow + 1;
  var hiddenData = [], hiddenFormulas = [];
  for (var j = 0; j < numItems; j++) {
    var vRow = startRow + j;
    var itemId = batchNumOnly + "-" + String(j + 1).padStart(3, '0');
    hiddenData.push([batchId, itemId, datePurchased, store]); 
    hiddenFormulas.push([
      "='Inventory Log'!D" + vRow, "='Inventory Log'!E" + vRow, "='Inventory Log'!C" + row8, 
      "=IF(F" + (hiddenStartRow+j) + " > 0, F" + (hiddenStartRow+j) + " * G" + (hiddenStartRow+j) + ", \"\")", 
      "='Inventory Log'!G" + vRow, "='Inventory Log'!H" + vRow, "='Inventory Log'!I" + vRow, 
      "='Inventory Log'!J" + vRow, "='Inventory Log'!K" + vRow, "='Inventory Log'!L" + vRow, 
      "='Inventory Log'!M" + vRow, "='Inventory Log'!N" + vRow, "='Inventory Log'!O" + vRow, "='Inventory Log'!P" + vRow
    ]);
  }
  hiddenLog.getRange(hiddenStartRow, 1, numItems, 4).setValues(hiddenData); 
  hiddenLog.getRange(hiddenStartRow, 5, numItems, 14).setFormulas(hiddenFormulas);
  
  hiddenLog.getRange(hiddenStartRow, 2, numItems, 18).setHorizontalAlignment("center");
  hiddenLog.getRange(hiddenStartRow, 8, numItems, 1).setNumberFormat('[$TT$] #,##0.00');
  hiddenLog.getRange(hiddenStartRow, 17, numItems, 1).setNumberFormat(ttCurrencyFormat);
  hiddenLog.getRange(hiddenStartRow, 3, numItems, 1).setNumberFormat("dd/m/yyyy");
  hiddenLog.getRange(hiddenStartRow, 20, 1, 1).setValue(totalCostUSD).setNumberFormat("$#,##0.00");
  hiddenLog.getRange(hiddenStartRow, 23, 1, 1).setValue(currencyPurchase);
  
  if (nextBatchNum % 2 === 0) {
    hiddenLog.getRange(hiddenStartRow, 1, numItems, 23).setBackground("#cccccc");
  }
  
  if (dashboard) {
    dashboard.getRange("C2").setValue("📝 Updating Batch and Item logs...");
  }

  formatInventoryColumns(inventory);
  updateBatchLog();
  updateItemLog();
  
  range.setValue(false);
  SpreadsheetApp.flush();

  if (dashboard) {
    dashboard.getRange("C2").setValue("✨ " + batchId + " generated successfully!");
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("Batch generated successfully!", "Success");
}


/**
 * =========================================================
 * LOGIC: INVOICE GENERATOR (O2) - COMPLETE INTEGRATED LOGIC
 * =========================================================
 */
function generateInvoiceFromO2(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName("Inventory Log");
  const batchLog = ss.getSheetByName("Batch Log");
  const hiddenLog = ss.getSheetByName("Hidden Master Log");
  const templateSheet = ss.getSheetByName("Invoice Template");
  const invoiceLog = ss.getSheetByName("Invoice Log"); 
  
  // Set starting status in cell O1
  sourceSheet.getRange("O1").setValue("⏳ Processing...");
  SpreadsheetApp.flush();

  // Get N2 value for payment logic
  let n2Range = sourceSheet.getRange("N2");
  let n2Value = parseFloat(n2Range.getValue()) || 0;
  
  // Get K2 value for Profit
  let k2Value = parseFloat(sourceSheet.getRange("K2").getValue()) || 0;
  
  // Get L2 value for Previously Paid
  let l2Range = sourceSheet.getRange("L2"); 
  let basePreviousPaid = parseFloat(l2Range.getValue()) || 0;
  
  // 1. Identify selected items, Client Name, and Delivery fee
  const lastRow = sourceSheet.getLastRow();
  const data = sourceSheet.getRange(1, 1, lastRow, 17).getValues();
  let clientName = "";
  let nameFromN = ""; 
  let deliveryFee = 0;
  let selectedItems = []; 
  let itemGroups = {};
  let totalSoldFor = 0; 
  let invoiceReference = "";
  
  // First pass: Calculate totals for logic
  for (let r = 0; r < data.length; r++) {
    if (data[r][15] === true) { // Col P
      if (data[r][14] !== "" && data[r][14] > deliveryFee) deliveryFee = data[r][14];
      totalSoldFor += (parseFloat(data[r][9]) || 0);
      
      let refVal = String(data[r][16]).trim();
      if (!invoiceReference && refVal !== "") {
        invoiceReference = refVal;
      }
    }
  }

  // If this is an updated/linked invoice chain, fetch the true cumulative previously paid from the invoice log match
  let previousPaidValue = basePreviousPaid;
  if (invoiceReference !== "") {
    const logData = invoiceLog.getDataRange().getValues();
    for (let j = 0; j < logData.length; j++) {
      if (String(logData[j][0]).trim() === invoiceReference) {
        let prevRowPaid = parseFloat(logData[j][5]) || 0; // Col F: Amount Paid
        let prevRowPrevPaid = parseFloat(logData[j][6]) || 0; // Col G: Previously Paid
        previousPaidValue = prevRowPrevPaid + prevRowPaid;
        break;
      }
    }
  }
  
  let totalTransactionValue = totalSoldFor + deliveryFee;
  
  // Calculate Balance Due and Handle Tip logic if overpaid
  let rawBalance = totalTransactionValue - (n2Value + previousPaidValue);
  let tipAmount = 0;
  let finalBalanceDue = rawBalance;

  if (rawBalance < 0) {
    tipAmount = Math.abs(rawBalance);
    finalBalanceDue = 0;
  }

  // Profit, Loss, and Tip Separation Logic
  let tempProfit = k2Value - tipAmount;
  let adjustedProfit = 0;
  let lossAmount = 0;

  if (tempProfit < 0) {
    adjustedProfit = 0;       // N will not be less than 0
    lossAmount = tempProfit;  // Negative value gets written to O (Loss)
  } else {
    adjustedProfit = tempProfit;
    lossAmount = "";          // Blank out Loss if it's a positive profit
  }

  let status = ( (n2Value + previousPaidValue) >= totalTransactionValue ) ? "Paid" : "Owing";

  let invoiceDate = new Date();
  let dueDate = new Date();
  dueDate.setDate(invoiceDate.getDate() + 7);
  
  // Second pass: Process items and set status
  for (let r = 0; r < data.length; r++) {
    if (data[r][15] === true) { // Col P
      selectedItems.push(data[r][1]); 
      
      // Capture Client Names
      let mVal = String(data[r][12]).trim();
      let nVal = String(data[r][13]).trim();
      if (!clientName) {
        if (mVal !== "" && mVal !== "-") clientName = mVal;
        else if (nVal !== "" && nVal !== "-") clientName = nVal;
      }
      if (nVal !== "" && nVal !== "-") nameFromN = nVal;
      
      // Grouping
      let desc = data[r][3]; // Col D
      let price = data[r][9]; // Col J
      let key = desc + "|" + price;
      
      if (!itemGroups[key]) {
        itemGroups[key] = { desc: desc, price: price, qty: 1 };
      } else {
        itemGroups[key].qty += 1;
      }
    }
  }
  
  if (selectedItems.length === 0 || clientName === "") {
    SpreadsheetApp.getUi().alert("No items selected or no valid Client Name found.");
    sourceSheet.getRange("O1").setValue("Sell & Create Invoice");
    e.range.setValue(false);
    return;
  }
  
  // 2. Add Name from Column N to Batch Log Z3:Z if not exists
  if (nameFromN !== "") {
    let lastRowBatch = Math.max(batchLog.getLastRow(), 3);
    let zRange = batchLog.getRange(3, 26, lastRowBatch - 2, 1);
    let zValues = zRange.getValues().flat();

    if (!zValues.some(val => val.toString().trim() === nameFromN.toString().trim())) {
      let firstEmptyIndex = zValues.findIndex(val => val.toString().trim() === "");
      let targetRow = (firstEmptyIndex === -1) ? lastRowBatch + 1 : 3 + firstEmptyIndex;
      batchLog.getRange(targetRow, 26).setValue(nameFromN);
     }
   }

  // 3. Generate Invoice #
  const aValues = invoiceLog.getRange("A3:A" + (invoiceLog.getLastRow() || 3)).getValues();
  let lastNum = 0;
  let nextRow = 3; 
  aValues.forEach((row, index) => {
    if (row[0] && String(row[0]).startsWith("INV")) {
      let num = parseInt(String(row[0]).replace("INV", ""));
      if (num > lastNum) lastNum = num;
      nextRow = index + 4;
    }
  });
  let newInvoiceNum = "INV" + String(lastNum + 1).padStart(5, '0');
  
  // Populate Invoice Log 
  invoiceLog.getRange(nextRow, 1).setValue(newInvoiceNum); // A: Invoice #
  invoiceLog.getRange(nextRow, 2).setValue(clientName); // B: Bill To (Name)
  invoiceLog.getRange(nextRow, 3).setValue(Object.keys(itemGroups).map(k => itemGroups[k].desc).join(", ")); // C: Item Description
  invoiceLog.getRange(nextRow, 4).setFormula('=IF(A' + nextRow + '="","", IF(M' + nextRow + '<>"", "Updated", IF(H' + nextRow + '>0, "Owing", IF(H' + nextRow + '<=0, "Paid", ""))))');
  invoiceLog.getRange(nextRow, 5).setValue(totalTransactionValue); // E: Invoice Total
  invoiceLog.getRange(nextRow, 6).setValue(n2Value); // F: Amount Paid (Current)
  invoiceLog.getRange(nextRow, 7).setValue(previousPaidValue); // G: Previously Paid
  invoiceLog.getRange(nextRow, 8).setValue(finalBalanceDue); // H: Balance Due
  invoiceLog.getRange(nextRow, 9).setValue(deliveryFee); // I: Delivery
  invoiceLog.getRange(nextRow, 10).setValue(invoiceDate).setNumberFormat("dd/mm/yyyy"); // J: Date Sold
  invoiceLog.getRange(nextRow, 11).setValue(dueDate).setNumberFormat("dd/mm/yyyy"); // K: Due Date
  invoiceLog.getRange(nextRow, 12).setValue(selectedItems.length); // L: Total Quantity
  invoiceLog.getRange(nextRow, 14).setValue(adjustedProfit > 0 ? adjustedProfit : ""); // N: Profit (>= 0)
  invoiceLog.getRange(nextRow, 15).setValue(lossAmount < 0 ? lossAmount : "");        // O: Loss (If negative)
  invoiceLog.getRange(nextRow, 16).setValue(tipAmount > 0 ? tipAmount : "");          // P: Tip (If any)
  
  // 4. Update Invoice Log: Link New Invoice # to Old Reference (Column M)
  const logDataUpdate = invoiceLog.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][15] === true) { 
      let oldInvoiceNum = String(data[i][16]).trim(); // Get reference from Col Q
      if (oldInvoiceNum !== "" && oldInvoiceNum !== "-") {
        for (let j = 0; j < logDataUpdate.length; j++) {
          if (String(logDataUpdate[j][0]).trim() === oldInvoiceNum) {
            invoiceLog.getRange(j + 1, 13).setValue(newInvoiceNum);
            break; 
          }
        }
      }
    }
  }

  // 5. Create Invoice Tab & Populate Data
  let newInvoiceTab = templateSheet.copyTo(ss);
  newInvoiceTab.setName(clientName + " " + newInvoiceNum);
  newInvoiceTab.showSheet();
  newInvoiceTab.getRange("A10").setValue(clientName);
  newInvoiceTab.getRange("D9").setValue(newInvoiceNum);
  newInvoiceTab.getRange("D10").setValue(invoiceDate).setNumberFormat("dd/mm/yyyy");
  newInvoiceTab.getRange("D11").setValue(dueDate).setNumberFormat("dd/mm/yyyy");
  newInvoiceTab.getRange("D17").setValue(deliveryFee);
  newInvoiceTab.getRange("D19").setValue(n2Value);        // Paid (Today)
  newInvoiceTab.getRange("D20").setValue(previousPaidValue); // Previously Paid

  let keys = Object.keys(itemGroups);
  if (keys.length > 1) {
    newInvoiceTab.insertRowsAfter(14, keys.length - 1);
  }
  
  for (let i = 0; i < keys.length; i++) {
    let item = itemGroups[keys[i]];
    let row = 14 + i;
    newInvoiceTab.getRange(row, 1).setValue(item.desc); 
    newInvoiceTab.getRange(row, 2).setValue(item.qty);  
    newInvoiceTab.getRange(row, 3).setValue(item.price);
    newInvoiceTab.getRange(row, 4).setFormula("=B" + row + "*C" + row); 
  }
  
  // 6. Update Hidden Master Log
  const hiddenData = hiddenLog.getDataRange().getValues();
  for (let i = 0; i < hiddenData.length; i++) {
    if (selectedItems.includes(hiddenData[i][1])) {
      let targetRow = i + 1;
      hiddenLog.getRange(targetRow, 19).setValue(newInvoiceNum);
      
      if (status === "Paid") {
        hiddenLog.getRange(targetRow, 14).setValue("Paid");
        hiddenLog.getRange(targetRow, 18).setValue("");
        let rowRange = hiddenLog.getRange(targetRow, 1, 1, hiddenLog.getLastColumn());
        rowRange.setValues(rowRange.getValues());
      }
    }
  }

  // 7. Update Inventory Log
  if (status === "Paid") {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i][15] === true) {
        sourceSheet.deleteRow(i + 1);
      }
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      if (data[i][15] === true) {
        sourceSheet.getRange(i + 1, 12).setValue(status);
        sourceSheet.getRange(i + 1, 17).setValue(newInvoiceNum);
      }
    }
  }

  sourceSheet.getRange("O2").setValue(false);
  n2Range.setValue(0);
  
  if (lastRow >= 11) {
    let range = sourceSheet.getRange(11, 16, lastRow - 10, 2); 
    let values = range.getValues();
    let updatedValues = values.map(row => {
      return (row[1] !== "" && row[1] !== null) ? [false] : [row[0]];
    });
    sourceSheet.getRange(11, 16, updatedValues.length, 1).setValues(updatedValues);
  }
  
  updateBatchLog();
  updateItemLog();
  updateCustomerLog()
  
  let dashboardSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DASHBOARD");
  if (dashboardSheet) {
    let c51 = dashboardSheet.getRange("C51");
    let c61 = dashboardSheet.getRange("C61");
    c51.clearContent();
    c61.clearContent();
    SpreadsheetApp.flush(); 
    c51.setFormula("=GET_INV_TABS()");
    c61.setFormula("=LET(total, GET_INV_COUNT(), extra, MAX(0, total - 10), IF(extra=0, \"\", extra & IF(extra=1, \" ADDITIONAL INVOICE\", \" ADDITIONAL INVOICES\")))");
  }

  // Reset O1 to default button text at the very end
  sourceSheet.getRange("O1").setValue("Sell & Create Invoice");

  SpreadsheetApp.getActiveSpreadsheet().toast("Invoice " + newInvoiceNum + " created for: " + clientName, "Success");
}


/**
 * =========================================================
 * LOGIC: DASHBOARD CLEARANCE PAYMENT (A16)
 * =========================================================
 */
function processClearancePayment(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName("DASHBOARD");
  const hiddenLog = ss.getSheetByName("Hidden Master Log");

  if (dashboard) {
    dashboard.getRange("C2").setValue("💳 Processing clearance payment...");
  }

  // 1. Get Batch ID from B15 and Payment Value from C16
  let batchId = String(dashboard.getRange("B15").getValue()).trim();
  let paymentAmount = parseFloat(dashboard.getRange("C16").getValue()) || 0;

  if (batchId === "" || batchId === "-") {
    if (dashboard) {
      dashboard.getRange("C2").setValue("⚠️ Error: No valid Batch ID selected in B15.");
    }
    SpreadsheetApp.getUi().alert("Please select a valid Batch ID in B15 first!");
    e.range.setValue(false);
    return;
  }

  if (dashboard) {
    dashboard.getRange("C2").setValue("🔍 Searching for " + batchId + " in Hidden Master Log...");
  }

  // 2. Find matching Batch ID in Hidden Master Log Column A (first row match) and update Column U & V
  let hiddenLastRow = Math.max(hiddenLog.getLastRow(), 2);
  let hiddenData = hiddenLog.getRange(2, 1, hiddenLastRow - 1, 22).getValues(); // Columns A to V (22 columns)
  let found = false;

  let currentDate = new Date();

  for (let i = 0; i < hiddenData.length; i++) {
    let rowBatchId = String(hiddenData[i][0]).trim(); // Column A
    if (rowBatchId === batchId) {
      let targetRow = i + 2;
      let currentValue = parseFloat(hiddenLog.getRange(targetRow, 21).getValue()) || 0; // Column U is 21
      
      // Add existing value in U with C16 and overwrite
      let newVal = currentValue + paymentAmount;
      hiddenLog.getRange(targetRow, 21).setValue(newVal);

      // Place current date in Column V (index 22) and set format
      hiddenLog.getRange(targetRow, 22).setValue(currentDate).setNumberFormat("dd-mmm-yyyy");

      found = true;
      break; // Stops at the first matching row found
    }
  }

  if (!found) {
    if (dashboard) {
      dashboard.getRange("C2").setValue("⚠️ Error: Batch ID " + batchId + " not found.");
    }
    SpreadsheetApp.getUi().alert("Batch ID " + batchId + " was not found in the Hidden Master Log.");
    e.range.setValue(false);
    return;
  }

  if (dashboard) {
    dashboard.getRange("C2").setValue("📝 Updating dashboard and syncing logs...");
  }

  // 3. Make C16 zero and uncheck A16
  dashboard.getRange("C16").setValue(0);
  dashboard.getRange("A16").setValue(false);

  updateBatchLog();
  updateItemLog();

  SpreadsheetApp.flush();
  
  if (dashboard) {
    dashboard.getRange("C2").setValue("✨ Clearance payment successfully added to " + batchId + "!");
  }
  ss.toast("Clearance payment successfully added to " + batchId, "Success");
}


/**
 * =========================================================
 * LOGIC: DASHBOARD MAKE AVAILABLE (E18)
 * =========================================================
 */
function handleMakeAvailableTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashboard = ss.getSheetByName("DASHBOARD");
  
  if (dashboard) {
    dashboard.getRange("C2").setValue("📦 Processing batch availability update...");
  }

  var targetBatchId = dashboard.getRange("B15").getValue();

  if (!targetBatchId || targetBatchId === "-" || targetBatchId === "") {
    if (dashboard) {
      dashboard.getRange("C2").setValue("⚠️ Error: No valid Batch ID selected in B15.");
    }
    SpreadsheetApp.getUi().alert("Please select a valid Batch ID in B15 first!");
    dashboard.getRange("E18").setValue(false);
    return;
  }
  
  var inventoryLog = ss.getSheetByName("Inventory Log");
  var lastRow = inventoryLog.getLastRow();
  
  if (dashboard) {
    dashboard.getRange("C2").setValue("🔍 Scanning Inventory Log for Batch " + targetBatchId + "...");
  }

  if (lastRow >= 3) {
    // Only fetch Column A (index 1) and Column L (index 12) to check and update status
    var batchIdRange = inventoryLog.getRange(3, 1, lastRow - 2, 1);
    var statusRange = inventoryLog.getRange(3, 12, lastRow - 2, 1);
    
    var batchIds = batchIdRange.getValues();
    var statuses = statusRange.getValues();
    var updated = false;
    
    for (var i = 0; i < batchIds.length; i++) {
      if (batchIds[i][0] === targetBatchId && statuses[i][0] === "In Transit") {
        statuses[i][0] = "Available";
        updated = true;
      }
    }
    
    // Write back ONLY Column L status values, leaving all formulas in columns like G, D, J, etc. completely safe!
    if (updated) {
      statusRange.setValues(statuses);
    }
  }
  
  if (dashboard) {
    dashboard.getRange("C2").setValue("📝 Syncing Batch Log and Item Log...");
  }

  updateBatchLog();
  updateItemLog();
  
  dashboard.getRange("E18").setValue(false);
  SpreadsheetApp.flush();

  if (dashboard) {
    dashboard.getRange("C2").setValue("✨ Batch " + targetBatchId + " successfully marked as Available!");
  }
  ss.toast("Batch " + targetBatchId + " is now Available", "Success");
}


/**
 * =========================================================
 * LOGIC: SETTINGS ROW CLEANUP (A39)
 * =========================================================
 */
function runRowCleanup(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName("DASHBOARD");
  const targetTabs = ["Invoice Log", "Batch Log", "Item Log", "Customer Log"];
  
  if (dashboardSheet) {
    dashboardSheet.getRange("C2").setValue("🧹 Starting row cleanup and maintenance...");
  }
  
  targetTabs.forEach((tabName, index) => {
    if (dashboardSheet) {
      dashboardSheet.getRange("C2").setValue("🧹 Cleaning unused rows (" + (index + 1) + " of " + targetTabs.length + "): " + tabName + "...");
    }
    
    const targetSheet = ss.getSheetByName(tabName);
    if (!targetSheet) return;
    
    const lastRow = targetSheet.getLastRow();
    const maxRows = targetSheet.getMaxRows();
    
    // Find the last active row containing data in column A
    let activeRowsCount = 0;
    if (lastRow > 0) {
      const values = targetSheet.getRange(1, 1, lastRow, 1).getValues();
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i][0] !== "") {
          activeRowsCount = i + 1;
          break;
        }
      }
    }
    
    // Calculate how many rows to keep (minimum 1000, or active rows + 5)
    const rowsToKeep = Math.max(1000, activeRowsCount + 5);
    
    // Delete excess rows if the sheet currently has more than what we want to keep
    if (maxRows > rowsToKeep) {
      const rowsToDelete = maxRows - rowsToKeep;
      targetSheet.deleteRows(rowsToKeep + 1, rowsToDelete);
    }
  });
  
  // Uncheck the box in A39
  e.range.setValue(false);
  
  if (dashboardSheet) {
    dashboardSheet.getRange("C2").setValue("✨ Unused rows cleaned up successfully across all logs!");
  }
  ss.toast("Unused rows cleaned up successfully!", "Success");
}



/**
 * =========================================================
 * LOGIC: GENERATE INVOICE PDF(S) (A50)
 * =========================================================
 */
function generateInvoicesPDF(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("DASHBOARD");
  
  // Verify action is triggered and A50 is checked
  if (!sheet || sheet.getRange("A50").getValue() !== true) {
    return;
  }
  
  var range = sheet.getRange("B48:C60");
  var values = range.getValues();
  
  // Count total selected PDFs first
  var selectedRows = [];
  for (var i = 0; i < values.length; i++) {
    var isChecked = values[i][0]; // Column B (Checkbox)
    var tabName = String(values[i][1]).trim(); // Column C (Tab Name)
    
    if (isChecked === true && tabName !== "" && tabName !== "SELECT ALL") {
      selectedRows.push({
        row: 48 + i,
        tabName: tabName
      });
    }
  }
  
  if (selectedRows.length === 0) {
    sheet.getRange("C2").setValue("⚠️ No invoice tabs selected.");
    sheet.getRange("A50").setValue(false);
    return;
  }
  
  var pdfCount = 0;
  
  // Loop through selected rows and update status in C2
  for (var k = 0; k < selectedRows.length; k++) {
    var currentRow = selectedRows[k].row;
    var tabName = selectedRows[k].tabName;
    
    sheet.getRange("C2").setValue("⏳ Generating PDF " + (k + 1) + " of " + selectedRows.length + " (" + tabName + ")...");
    
    var targetSheet = ss.getSheetByName(tabName);
    if (targetSheet) {
      // Create the PDF file and get its shareable URL
      var pdfFile = exportSheetAsPDF_(ss, targetSheet);
      var pdfUrl = pdfFile.getUrl();
      
      // Place the link into Column E of the same row
      sheet.getRange("E" + currentRow).setValue(pdfUrl);
      
      pdfCount++;
      // Uncheck the individual row checkbox after processing
      sheet.getRange("B" + currentRow).setValue(false);
    }
  }
  
  // Reset the main trigger checkbox and set final success message in C2
  sheet.getRange("A50").setValue(false);
  sheet.getRange("C2").setValue("✨ Successfully saved " + pdfCount + " invoice PDF(s) with links!");
}

function exportSheetAsPDF_(ss, sheet) {
  var sheetId = sheet.getSheetId();
  var url = ss.getUrl().replace(/edit$/, '') + 'export?';
  
  var exportOptions = {
    exportFormat: 'pdf',
    format: 'pdf',
    size: 'letter',
    portrait: 'true',
    fitw: 'true',
    gridlines: 'false',
    printtitle: 'false',
    sheetnames: 'false',
    fzr: 'false',
    gid: sheetId
  };
  
  var urlParts = [];
  for (var key in exportOptions) {
    urlParts.push(key + '=' + exportOptions[key]);
  }
  var exportUrl = url + urlParts.join('&');
  
  var response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      'Authorization': 'Bearer ' +  ScriptApp.getOAuthToken(),
      'MuteHttpExceptions': true
    }
  });
  
  var blob = response.getBlob().setName(sheet.getName() + '.pdf');
  
  // Saves to Google Drive and returns the file object so we can grab its URL
  return DriveApp.createFile(blob);
}


/**
 * =========================================================
 * LOGIC: DELETE INVOICE TAB(S) & LINKS (A55)
 * =========================================================
 */
function deleteInvoices(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("DASHBOARD");
  
  // Verify action is triggered and A55 is checked
  if (!sheet || sheet.getRange("A55").getValue() !== true) {
    return;
  }
  
  var range = sheet.getRange("B48:C63");
  var values = range.getValues();
  
  var selectedRows = [];
  var isSelectAll = false;
  var deleteUnwantedCopies = false;
  
  for (var i = 0; i < values.length; i++) {
    var isChecked = values[i][0]; // Column B (Checkbox)
    var tabName = String(values[i][1]).trim(); // Column C (Tab Name / Label)
    var currentRow = 48 + i;
    
    if (isChecked === true && tabName !== "" && tabName !== "Manual Invoice 👆") {
      if (tabName.toUpperCase().indexOf("SELECT ALL") !== -1) {
        isSelectAll = true;
      } else if (currentRow === 62 && tabName.toUpperCase().indexOf("UNWANTED COPIES") !== -1) {
        deleteUnwantedCopies = true;
        sheet.getRange("B62").setValue(false);
      } else if (tabName.indexOf("ADDITIONAL INVOICES") === -1 && tabName.indexOf("UNWANTED COPIES") === -1) {
        selectedRows.push({
          row: currentRow,
          tabName: tabName
        });
      }
    }
  }
  
  // If "SELECT ALL" is checked, gather all invoice names from Column Q of the "Invoice Log" sheet
  if (isSelectAll) {
    selectedRows = [];
    var logSheet = ss.getSheetByName("Invoice Log");
    if (logSheet) {
      var lastRow = logSheet.getLastRow();
      if (lastRow >= 3) {
        var logValues = logSheet.getRange("Q3:Q" + lastRow).getValues();
        for (var j = 0; j < logValues.length; j++) {
          var logTabName = String(logValues[j][0]).trim();
          if (logTabName !== "") {
            selectedRows.push({
              row: null,
              tabName: logTabName
            });
          }
        }
      }
    }
  }
  
  var deleteCount = 0;
  
  // If B62 (Unwanted Copies) was checked, find and delete any existing template copy tabs
  if (deleteUnwantedCopies) {
    sheet.getRange("C2").setValue("🗑️ Scanning and deleting unwanted template copies...");
    
    var baseCopyTarget = ss.getSheetByName("Copy of Invoice Template");
    if (baseCopyTarget) {
      ss.deleteSheet(baseCopyTarget);
      deleteCount++;
    }
    
    for (var n = 1; n <= 10; n++) {
      var numberedCopyName = "Copy of Invoice Template " + n;
      var numberedTarget = ss.getSheetByName(numberedCopyName);
      if (numberedTarget) {
        ss.deleteSheet(numberedTarget);
        deleteCount++;
      }
    }
  }
  
  // Loop through selected rows, delete the sheet tabs, and clear Column E links & checkboxes if mapped
  for (var k = 0; k < selectedRows.length; k++) {
    var currentRow = selectedRows[k].row;
    var tabName = selectedRows[k].tabName;
    
    sheet.getRange("C2").setValue("🗑️ Deleting tab " + (k + 1) + " of " + selectedRows.length + " (" + tabName + ")...");
    
    var targetSheet = ss.getSheetByName(tabName);
    if (targetSheet) {
      ss.deleteSheet(targetSheet);
      deleteCount++;
    }
    
    // Clear the PDF link in Column E only if it's tied to a dashboard row
    if (currentRow !== null) {
      sheet.getRange("E" + currentRow).clearContent();
      sheet.getRange("B" + currentRow).setValue(false);
      
      if (currentRow === 50) {
        sheet.getRange("C50").clearContent();
      }
    }
  }
  
  if (isSelectAll) {
    sheet.getRange("E50:E60").clearContent();
  }
  
  if (deleteCount === 0) {
    sheet.getRange("C2").setValue("⚠️ No invoice tabs or unwanted copies selected/found for deletion.");
    sheet.getRange("A55").setValue(false);
    return;
  }
  
  // Reset A55 master checkbox, uncheck "SELECT ALL" (B48) if it was used, and set success message in C2
  sheet.getRange("A55").setValue(false);
  sheet.getRange("B48").setValue(false);
  sheet.getRange("C2").setValue("✨ Successfully deleted " + deleteCount + " item(s) (tabs/copies) and cleared links!");

  // Force refresh C51 and C61 formulas to prevent #NAME? errors
  let c51 = sheet.getRange("C51");
  let c61 = sheet.getRange("C61");
  
  c51.clearContent();
  c61.clearContent();
  SpreadsheetApp.flush();
  Utilities.sleep(300);
  
  c51.setFormula("=GET_INV_TABS()");
  c61.setFormula('=LET(total, GET_INV_COUNT(), extra, MAX(0, total - 10), IF(extra=0, "", extra & IF(extra=1, " ADDITIONAL INVOICE", " ADDITIONAL INVOICES")))');
}


/**
 * =========================================================
 * LOGIC: MASTER RESET SCRIPT (A72)
 * =========================================================
 */
function masterReset(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashboard = ss.getSheetByName("DASHBOARD");
  
  // Verify action is triggered and A72 is checked
  if (!dashboard || dashboard.getRange("A72").getValue() !== true) {
    return;
  }
  
  // Safety checks: Verify B72 and B73 are both checked
  var safety1 = dashboard.getRange("B72").getValue();
  var safety2 = dashboard.getRange("B73").getValue();
  
  if (safety1 !== true || safety2 !== true) {
    SpreadsheetApp.getUi().alert("⚠️ Master Reset aborted! You must check both safety boxes (B72 and B73) before running the reset.");
    dashboard.getRange("A72").setValue(false);
    dashboard.getRange("C2").setValue("⚠️ Master Reset cancelled: Safety checkboxes not checked.");
    return;
  }
  
  dashboard.getRange("C2").setValue("⚠️ Starting Master Reset sequence...");
  
  // 1. Delete Hidden Master Log
  var hiddenMasterLog = ss.getSheetByName("Hidden Master Log");
  if (hiddenMasterLog) {
    dashboard.getRange("C2").setValue("🗑️ Deleting Hidden Master Log...");
    ss.deleteSheet(hiddenMasterLog);
  }
  
  // 2. Delete Inventory Log
  var inventoryLog = ss.getSheetByName("Inventory Log");
  if (inventoryLog) {
    dashboard.getRange("C2").setValue("🗑️ Deleting Inventory Log...");
    ss.deleteSheet(inventoryLog);
  }
  
  // 3. Delete all tabs with "INV" in the name (must be exact caps)
  dashboard.getRange("C2").setValue("🗑️ Scanning for tabs with uppercase 'INV'...");
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sheetName = sheets[i].getName();
    // Ensure it contains "INV" strictly in caps and is not the DASHBOARD
    if (sheetName.indexOf("INV") !== -1 && sheetName !== "DASHBOARD") {
      dashboard.getRange("C2").setValue("🗑️ Deleting tab: " + sheetName + "...");
      ss.deleteSheet(sheets[i]);
    }
  }
  
  // 4. Clear data in Invoice Log A3:P
  var invoiceLog = ss.getSheetByName("Invoice Log");
  if (invoiceLog) {
    dashboard.getRange("C2").setValue("🧹 Clearing Invoice Log (A3:P)...");
    var invLastRow = invoiceLog.getLastRow();
    if (invLastRow >= 3) {
      invoiceLog.getRange("A3:P" + invLastRow).clearContent();
    }
  }
  
  // 5. Clear data Batch Log A3:Q
  var batchLog = ss.getSheetByName("Batch Log");
  if (batchLog) {
    dashboard.getRange("C2").setValue("🧹 Clearing Batch Log (A3:Q)...");
    var batchLastRow = batchLog.getLastRow();
    if (batchLastRow >= 3) {
      batchLog.getRange("A3:Q" + batchLastRow).clearContent();
    }
  }
  
  // 6. Clear data Item Log A5:P
  var itemLog = ss.getSheetByName("Item Log");
  if (itemLog) {
    dashboard.getRange("C2").setValue("🧹 Clearing Item Log (A5:P)...");
    var itemLastRow = itemLog.getLastRow();
    if (itemLastRow >= 5) {
      itemLog.getRange("A5:P" + itemLastRow).clearContent();
    }
  }
  
  // 7. Clear data Customer Log A3:J
  var customerLog = ss.getSheetByName("Customer Log");
  if (customerLog) {
    dashboard.getRange("C2").setValue("🧹 Clearing Customer Log (A3:J)...");
    var custLastRow = customerLog.getLastRow();
    if (custLastRow >= 3) {
      customerLog.getRange("A3:J" + custLastRow).clearContent();
    } else {
      customerLog.getRange("A3:J").clearContent();
    }
  }
  
  // 8. Delete all tab names starting with "Copy"
  dashboard.getRange("C2").setValue("🗑️ Scanning for tabs starting with 'Copy'...");
  var allSheets = ss.getSheets();
  for (var j = 0; j < allSheets.length; j++) {
    var currentName = allSheets[j].getName();
    if (currentName.indexOf("Copy") === 0) {
      dashboard.getRange("C2").setValue("🗑️ Deleting copy tab: " + currentName + "...");
      ss.deleteSheet(allSheets[j]);
    }
  }
  
  // 9. Clear Dashboard fields B15 and E50:E62
  dashboard.getRange("C2").setValue("🧹 Clearing Dashboard tracking fields...");
  dashboard.getRange("B15").clearContent();
  dashboard.getRange("E50:E62").clearContent();

  // 10. Force refresh C51 and C61 formulas to prevent #NAME? errors
  dashboard.getRange("C2").setValue("🔄 Refreshing dashboard summary formulas...");
  let c51 = dashboard.getRange("C51");
  let c61 = dashboard.getRange("C61");
  
  c51.clearContent();
  c61.clearContent();
  SpreadsheetApp.flush();
  Utilities.sleep(300);
  
  c51.setFormula("=GET_INV_TABS()");
  c61.setFormula('=LET(total, GET_INV_COUNT(), extra, MAX(0, total - 10), IF(extra=0, "", extra & IF(extra=1, " ADDITIONAL INVOICE", " ADDITIONAL INVOICES")))');
  
  SpreadsheetApp.flush();
  
  // Uncheck A72, B72, and B73, and show final completion message
  dashboard.getRange("A72").setValue(false);
  dashboard.getRange("B72").setValue(false);
  dashboard.getRange("B73").setValue(false);
  dashboard.getRange("C2").setValue("✨ Master Reset completed successfully. Workbook returned to default state.");
  ss.toast("Master Reset completed successfully!", "Success");
}


/**
 * =========================================================
 * LOGIC: DUAL CHECKBOX BATCH DELETION (COLUMN O, ROW 7+)
 * =========================================================
 */
function handleDualCheckboxDeletion(sheet, editedRow, e) {
  // Prevent duplicate trigger executions from running concurrently
  let lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return; // Exit if another deletion process is already running
  }

  try {
    // Set starting status in cell O1
    sheet.getRange("O1").setValue("⏳Processing...");
    SpreadsheetApp.flush();

    // 1. Check if the adjacent checkbox (directly above or below) in Column O is also TRUE
    let valAbove = editedRow > 7 ? sheet.getRange(editedRow - 1, 15).getValue() : false;
    let valBelow = sheet.getRange(editedRow + 1, 15).getValue();
    
    let neighborRow = -1;
    if (valAbove === true || valAbove === "TRUE") {
      neighborRow = editedRow - 1;
    } else if (valBelow === true || valBelow === "TRUE") {
      neighborRow = editedRow + 1;
    }
    
    // If two stacked checkboxes are not ticked together, exit safely
    if (neighborRow === -1) {
      sheet.getRange("O1").setValue("Sell & Create Invoice");
      return;
    }
    
    // Find the safety check row (the top one of the pair)
    let safetyRow = Math.min(editedRow, neighborRow);
    
    // Check current state of both cells to ensure a previous trigger hasn't cleared them already
    let mainVal = sheet.getRange(editedRow, 15).getValue();
    let neighborVal = sheet.getRange(neighborRow, 15).getValue();
    if ((mainVal !== true && mainVal !== "TRUE") || (neighborVal !== true && neighborVal !== "TRUE")) {
      sheet.getRange("O1").setValue("Sell & Create Invoice");
      return;
    }

    // IMMEDIATELY clear both trigger checkboxes and flush state to prevent queued triggers from re-firing
    sheet.getRange(editedRow, 15).clearContent();
    sheet.getRange(neighborRow, 15).clearContent();
    SpreadsheetApp.flush();
    
    // 2. Identify Batch ID from the row directly below the safety check (e.g., safetyRow + 1)
    let rawBatchVal = "";
    let fallbackRow = safetyRow + 1;
    let lastRow = sheet.getLastRow();
    
    if (fallbackRow <= lastRow) {
      rawBatchVal = String(sheet.getRange(fallbackRow, 1).getValue()).trim();
    }
    
    // Optional secondary check 4 rows down if 1 row down is somehow empty
    if (!rawBatchVal || rawBatchVal === "") {
      let targetSearchRow = safetyRow + 4;
      if (targetSearchRow <= lastRow) {
        rawBatchVal = String(sheet.getRange(targetSearchRow, 1).getValue()).trim();
      }
    }
    
    let batchId = "";
    let isBlankBatch = false;
    
    if (rawBatchVal !== "" && !isNaN(rawBatchVal)) {
      // If it's a numeric ID like 4, pad it and turn it into BATCH-004
      let paddedNum = rawBatchVal;
      while (paddedNum.length < 3) {
        paddedNum = "0" + paddedNum;
      }
      batchId = "BATCH-" + paddedNum;
    } else if (rawBatchVal.startsWith("BATCH-")) {
      batchId = rawBatchVal;
    } else {
      isBlankBatch = true;
    }
    
    let deletedItemIds = [];
    let lastMatchRow = -1;
    let ss = sheet.getParent();
    
    if (!isBlankBatch && batchId) {
      // 3. Gather rows for this specific batch ID (if any exist)
      let data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
      let firstMatchRow = -1;
      
      for (let i = 0; i < data.length; i++) {
        let currentBatchId = String(data[i][0]).trim(); // Column A
        if (currentBatchId === batchId) {
          if (firstMatchRow === -1) {
            firstMatchRow = i + 1;
          }
          lastMatchRow = i + 1;
          
          let itemId = String(data[i][1]).trim();
          if (itemId && itemId !== "" && itemId !== "Item ID") {
            deletedItemIds.push(itemId);
          }
        }
      }
      
      // 4. Update Batch Log status to "Closed" (unless Paid/Owing) - Runs whether item rows exist or not!
      let batchLogSheet = ss.getSheetByName("Batch Log");
      if (batchLogSheet) {
        let blLastRow = batchLogSheet.getLastRow();
        if (blLastRow >= 3) {
          let blData = batchLogSheet.getRange(3, 1, blLastRow - 2, 4).getValues();
          for (let j = 0; j < blData.length; j++) {
            let logBatchId = String(blData[j][0]).trim();
            let currentStatus = String(blData[j][3]).trim();
            if (logBatchId === batchId && currentStatus !== "Paid" && currentStatus !== "Owing") {
              batchLogSheet.getRange(j + 3, 4).setValue("Closed");
            }
          }
        }
      }
      
      // 5. Update Hidden Master Log status to "Closed" and freeze
      let hiddenLog = ss.getSheetByName("Hidden Master Log");
      if (hiddenLog) {
        let hiddenValues = hiddenLog.getDataRange().getValues();
        for (let h = 1; h < hiddenValues.length; h++) {
          let hBatchId = String(hiddenValues[h][0]).trim();
          let currentHiddenStatus = String(hiddenValues[h][13]).trim();
          if (hBatchId === batchId && currentHiddenStatus !== "Paid" && currentHiddenStatus !== "Owing") {
            hiddenLog.getRange(h + 1, 14).setValue("Closed");
          }
        }
        
        let freshValues = hiddenLog.getDataRange().getValues();
        for (let h = 1; h < freshValues.length; h++) {
          if (String(freshValues[h][0]).trim() === batchId) {
            hiddenLog.getRange(h + 1, 1, 1, freshValues[h].length).setValues([freshValues[h]]);
          }
        }
      }
      
      // 6. Update Item Log tab status to "Closed" (if items were found)
      let itemLogSheet = ss.getSheetByName("Item Log");
      if (itemLogSheet && deletedItemIds.length > 0) {
        let ilLastRow = itemLogSheet.getLastRow();
        if (ilLastRow >= 4) {
          let ilData = itemLogSheet.getRange(4, 1, ilLastRow - 3, 3).getValues();
          for (let k = 0; k < ilData.length; k++) {
            let ilItemId = String(ilData[k][0]).trim();
            let currentItemStatus = String(ilData[k][2]).trim();
            if (deletedItemIds.includes(ilItemId) && currentItemStatus !== "Paid" && currentItemStatus !== "Owing") {
              itemLogSheet.getRange(k + 4, 3).setValue("Closed");
            }
          }
        }
      }
    }
    
    // 7. Calculate exact deletion range safely
    let startDeletionRow = safetyRow;
    let finalEndRow;
    
    if (isBlankBatch || lastMatchRow === -1) {
      // Exactly 7 rows total (safetyRow to safetyRow + 6)
      finalEndRow = safetyRow + 6;
    } else {
      finalEndRow = Math.min(lastRow, lastMatchRow + 3);
    }
    
    let totalRowsToDelete = (finalEndRow - startDeletionRow) + 1;
    
    if (totalRowsToDelete > 0) {
      sheet.deleteRows(startDeletionRow, totalRowsToDelete);
      let toastMsg = !isBlankBatch && batchId ? "Batch " + batchId + " closed and removed." : "Empty block removed safely.";
      SpreadsheetApp.getActiveSpreadsheet().toast(toastMsg, "Cleaned");
    }

    // Reset O1 to default button text when completed
    sheet.getRange("O1").setValue("Sell & Create Invoice");

  } finally {
    lock.releaseLock();
  }
}

/**
 * =========================================================
 * LOGIC: REFRESH DASHBOARD E1
 * =========================================================
 */
function handleDashboardRefresh() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashboardSheet = ss.getActiveSheet();
  var inventorySheet = ss.getSheetByName("Inventory Log");
  
  var checkboxCell = dashboardSheet.getRange("E1");
  var statusCell = dashboardSheet.getRange("C2");
  
  // Only run if E1 is checked (TRUE)
  if (checkboxCell.getValue() === true) {
    
    // 1. Batch Log Update
    statusCell.setValue("📦 Updating Batch Log...");
    SpreadsheetApp.flush();
    updateBatchLog();
    
    // 2. Item Log Update
    statusCell.setValue("🏷️ Updating Item Log...");
    SpreadsheetApp.flush();
    updateItemLog();
    
    // 3. Customer Log Update
    statusCell.setValue("👥 Updating Customer Log...");
    SpreadsheetApp.flush();
    updateCustomerLog();
    
    // 4. Inventory Log Adjustments (O2 uncheck & O1 value set)
    if (inventorySheet) {
      statusCell.setValue("📝 Updating Inventory Log...");
      SpreadsheetApp.flush();
      
      inventorySheet.getRange("O2").setValue(false);
      inventorySheet.getRange("O1").setValue("Sell & Create Invoice");
    }
    
    let dashboardSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DASHBOARD");
  if (dashboardSheet) {
    let c51 = dashboardSheet.getRange("C51");
    let c61 = dashboardSheet.getRange("C61");
    c51.clearContent();
    c61.clearContent();
    SpreadsheetApp.flush(); 
    c51.setFormula("=GET_INV_TABS()");
    c61.setFormula("=LET(total, GET_INV_COUNT(), extra, MAX(0, total - 10), IF(extra=0, \"\", extra & IF(extra=1, \" ADDITIONAL INVOICE\", \" ADDITIONAL INVOICES\")))");
  }
    
    // Final Success State
    statusCell.setValue("✨ All logs and inventory updated successfully!");
    
    // Uncheck E1 after execution completes
    checkboxCell.setValue(false);
  }
}


/**
 * =========================================================
 * FUNCTION: FORMAT INVENTORY COLUMNS
 * =========================================================
 */
function formatInventoryColumns(sheet) {
  sheet.setColumnWidth(1, 85);
  sheet.setColumnWidth(2, 75);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 95);
  sheet.setColumnWidth(8, 80);
  sheet.setColumnWidth(9, 105);
  sheet.setColumnWidth(10, 115);
  sheet.setColumnWidth(11, 100);
  sheet.setColumnWidth(12, 100);
  sheet.setColumnWidth(13, 125);
  sheet.setColumnWidth(14, 110);
  sheet.setColumnWidth(15, 65);
  sheet.setColumnWidth(16, 60);
  sheet.setColumnWidth(17, 75);
  sheet.getRange("A3:Q").setHorizontalAlignment("center");
}


/**
 * =========================================================
 * FUNCTION: SETUP INVENTORY HEADERS
 * =========================================================
 */
function setupInventoryHeaders(sheet) {
  sheet.setRowHeight(2, 60);

  sheet.getRange("B2").setValue("INVENTORY LOG").setFontFamily("Allan").setFontSize(18).setFontWeight("bold").setHorizontalAlignment("left").setVerticalAlignment("middle");
  sheet.getRange("D2").setValue("TOTAL BATCH COUNT :").setFontWeight("bold").setHorizontalAlignment("right").setVerticalAlignment("bottom");
  sheet.getRange("E2").setFormula("=IFERROR(ROWS(UNIQUE(FILTER('Hidden Master Log'!A2:A, 'Hidden Master Log'!A2:A <> \"\"))), 0)").setFontWeight("bold").setHorizontalAlignment("left").setVerticalAlignment("bottom");
  
  sheet.getRange("K1").setValue("PROFIT").setFontFamily("Allan").setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(false);
sheet.getRange("K2").setFormula("=IF(L2=0, N2 - SUMIF(P:P, TRUE, H:H), IF(L2 >= SUMIF(P:P, TRUE, H:H), N2, (N2 + L2) - SUMIF(P:P, TRUE, H:H)))")
 .setNumberFormat("[$TT$] #,##0.00")
 .setHorizontalAlignment("center")
 .setVerticalAlignment("middle")
 .setFontSize(12)
 .setFontColor("#38761d");


  // 1. Grab existing sheet rules and build the K2 profit rule
  var rules = sheet.getConditionalFormatRules();
  var profitRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0)
    .setFontColor("#990000")
    .setBackground("#ead1dc")
    .setRanges([sheet.getRange("K2")])
    .build();
  rules.push(profitRule);

  sheet.getRange("O1").setValue("Sell & Create Invoice").setFontWeight("bold").setHorizontalAlignment("left").setVerticalAlignment("middle").setWrap(false).setBackground("#ead1dc");
  sheet.getRange("O2").insertCheckboxes().setFontSize(24).setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#ead1dc");
  // Protect cell O2 to show a warning popup when editing
  var protectionO2 = sheet.getRange("O2").protect().setDescription("Sell Checkbox Warning");
  protectionO2.setWarningOnly(true);
  
  sheet.getRange("N1").setValue("AMOUNT PAYING").setFontFamily("Allan").setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(false);
  sheet.getRange("N2").setValue(0).setNumberFormat("[$TT$] #,##0.00").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(12);
  
  sheet.getRange("M1").setValue("OWING").setFontFamily("Allan88").setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(false);
  sheet.getRange("M2").setFormula("=IFERROR(SUMIFS('Invoice Log'!$H:$H, 'Invoice Log'!$A:$A, INDEX(INDIRECT(\"Q11:Q\"), MATCH(TRUE, INDIRECT(\"P11:P\"), 0))), 0)")
    .setNumberFormat("[$TT$] #,##0.00")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontSize(12)
    .setFontColor("#990000");
    
  sheet.getRange("P2").setFormula('=IF(COUNTIF(INDIRECT("P11:P"), TRUE)=0, "", IF(SUMPRODUCT((INDIRECT("P11:P")=TRUE)*(INDIRECT("D11:D")="")), "Insert item description", IF(SUMPRODUCT((INDIRECT("P11:P")=TRUE)*(INDIRECT("M11:M")="")*(INDIRECT("N11:N")="")), "Insert Customer Name", IF(INDIRECT("N2")=0, "Insert Amount Paid", "Ready to Sell"))))')
    .setHorizontalAlignment("left")
    .setVerticalAlignment("middle")
    .setFontSize(14)
    .setFontFamily("Allan")
    .setFontColor("#b45f06");
    
  let range = sheet.getRange("P2");
  
  // 2. Build the P2 rule and push it to the same 'rules' array
  let ruleReady = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains("Ready")
    .setFontColor("#38761d")
    .setRanges([range])
    .build();
  rules.push(ruleReady);

  // 3. Apply everything together once at the end so nothing gets overwritten
  sheet.setConditionalFormatRules(rules);

  sheet.getRange("L1").setValue("PREVIOUSLY PAID").setFontFamily("Allan").setFontSize(12).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(false);
  sheet.getRange("L2").setFormula("=IFERROR(SUMIFS('Invoice Log'!$F:$F, 'Invoice Log'!$A:$A, INDEX(INDIRECT(\"Q11:Q\"), MATCH(TRUE, INDIRECT(\"P11:P\"), 0))), 0)")
    .setNumberFormat("[$TT$] #,##0.00")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontSize(12)
    .setFontColor("#38761d");

  sheet.getRange("A1:Q2")
    .setBackground("#ead1dc")
    .setBorder(true, true, true, true, true, true, "#ead1dc", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange("A3:Q3").setBackground("#FFFFFF");
  sheet.getRange("A4:Q6").setBackground("#FFFFFF");
  sheet.setFrozenRows(3);
}


/**
 * =========================================================
 * FUNCTION: SETUP HIDDEN HEADERS
 * =========================================================
 */
function setupHiddenHeaders(sheet) {
  var headers = ["Batch ID", "Item ID", "Date Purchased", "Store", "Item Name/Desc", "Cost($/£/€)", "Exchange Rate", "Cost (TTD)", "Clearing (TTD)", "Landed Cost", "Recommended Selling Price", "Sold For", "Profit", "Status", "Existing Customer", "New Customer", "Delivery (TTD)", "Add to Invoice", "Invoice #", "Total Cost From Store", "Clearing Total", "Date Cleared", "Currency"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setBackground("#4A4A4A").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.getRange("1:1").setHorizontalAlignment("left");
  sheet.setFrozenRows(1);
}


/**
 * =========================================================
 * FUNCTION: UPDATE BATCH LOG
 * =========================================================
 */
function updateBatchLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var batchLog = ss.getSheetByName("Batch Log");
  var hiddenLog = ss.getSheetByName("Hidden Master Log");
  
  if (!batchLog || !hiddenLog) return;
  
  var hiddenData = hiddenLog.getDataRange().getValues();
  if (hiddenData.length <= 1) return;
  
  // 1. Read existing Batch Log data to preserve "Closed" batches
  var existingBatchMap = {};
  var blLastRow = batchLog.getLastRow();
  if (blLastRow >= 3) {
    var existingData = batchLog.getRange(3, 1, blLastRow - 2, 17).getValues();
    for (var e = 0; e < existingData.length; e++) {
      var exRow = existingData[e];
      var exBatchId = String(exRow[0]).trim();
      var exStatus = String(exRow[3]).trim();
      if (exBatchId) {
        existingBatchMap[exBatchId] = {
          status: exStatus,
          fullRow: exRow
        };
      }
    }
  }
  
  // First pass: Scan the entire log to find and map valid currencies to their Batch IDs
  var batchCurrencyMap = {};
  for (var i = 1; i < hiddenData.length; i++) {
    var bId = String(hiddenData[i][0]).trim();
    if (!bId) continue;
    
    // Check column W (index 22) or scan the row for currency strings
    var rawCurr = hiddenData[i][22] || "";
    var currCode = String(rawCurr).trim().toUpperCase();
    
    if (currCode === "EUR" || currCode === "GBP" || currCode === "USD" || currCode === "TTD") {
      batchCurrencyMap[bId] = currCode;
    }
  }
  
  var batchMap = {};
  
  for (var i = 1; i < hiddenData.length; i++) {
    var row = hiddenData[i];
    var batchId = String(row[0]).trim(); // Col A: Batch ID
    if (!batchId) continue;
    
    // If this batch is already marked as "Closed" in the sheet, ignore it entirely
    if (existingBatchMap[batchId] && existingBatchMap[batchId].status === "Closed") {
      continue;
    }
    
    if (!batchMap[batchId]) {
      // Use the mapped currency for this batch, or default to USD if not found
      var resolvedCurr = batchCurrencyMap[batchId] || "USD";
      
      batchMap[batchId] = {
        batchId: batchId,
        store: row[3],          // Col D: Store
        datePurchased: row[2],  // Col C: Date Purchased
        currency: resolvedCurr, // Resolved Currency Code
        totalCostStore: row[19],// Col T: Total Cost From Store
        exchangeRate: row[6],   // Col G: Exchange Rate
        clearingTTD: row[20],   // Col U: Clearing Total
        items: [],
        soldCount: 0,
        totalSales: 0,
        totalProfit: 0,
        dateCleared: row[21]    // Col V: Date Cleared
      };
    }
    
    batchMap[batchId].items.push(row);
    
    var soldFor = parseFloat(row[11]) || 0; 
    var profit = parseFloat(row[12]) || 0;  
    var invoiceNum = row[18]; 
    
    if (invoiceNum) {
      batchMap[batchId].soldCount++;
    }
    if (soldFor > 0) {
      batchMap[batchId].totalSales += soldFor;
      batchMap[batchId].totalProfit += profit;
    }
  }
  
  // Compile output values combining existing closed batches and newly calculated active ones
  var outputValues = [];
  
  // First, re-add all currently closed batches to preserve their exact state
  var allKnownBatchIds = Object.keys(existingBatchMap);
  for (var k = 0; k < allKnownBatchIds.length; k++) {
    var bIdKey = allKnownBatchIds[k];
    if (existingBatchMap[bIdKey].status === "Closed") {
      outputValues.push(existingBatchMap[bIdKey].fullRow);
    }
  }
  
  // Next, add processed active batches from hidden log
  var uniqueBatches = Object.keys(batchMap);
  for (var b = 0; b < uniqueBatches.length; b++) {
    var data = batchMap[uniqueBatches[b]];
    
    var hasInTransit = data.items.some(item => item[13] === "In Transit");
    var statusText = hasInTransit ? "In Transit" : "Received";
    
    // Explicit currency symbol mapping
    var currSymbol = "$   ";
    var currCode = String(data.currency).toUpperCase();
    if (currCode === "EUR") currSymbol = "€   ";
    else if (currCode === "GBP") currSymbol = "£   ";
    else if (currCode === "TTD") currSymbol = "TT$   ";
    else if (currCode === "USD") currSymbol = "US$   ";
    
    var formattedCostVal = Number(data.totalCostStore || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    var purchaseCostFormatted = currSymbol + formattedCostVal;
    
    var totalCostTTD = (parseFloat(data.totalCostStore) || 0) * (parseFloat(data.exchangeRate) || 0);
    var clearingTTD = parseFloat(data.clearingTTD) || 0;
    var totalInvestment = totalCostTTD + clearingTTD;
    
    var totalItemsCount = data.items.length;
    var itemsSoldStr = data.soldCount + "/" + totalItemsCount + " Items";
    var itemsLeftCount = totalItemsCount - data.soldCount;
    
    var timeInTransit = "";
    if (data.datePurchased && data.dateCleared) {
      var d1 = new Date(data.datePurchased);
      var d2 = new Date(data.dateCleared);
      var diffTime = Math.abs(d2 - d1);
      var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      var months = Math.floor(diffDays / 30.4375);
      var weeks = Math.floor((diffDays % 30.4375) / 7);
      var days = Math.floor((diffDays % 30.4375) % 7);
      timeInTransit = months + " mos, " + weeks + " wks, " + days + " days";
    }
    
    var profitMargin = totalInvestment > 0 ? (data.totalProfit / totalInvestment) : 0;
    
    var rowRow = [
      data.batchId,                               
      data.store,                                 
      data.datePurchased ? new Date(data.datePurchased) : "", 
      statusText,                                 
      purchaseCostFormatted,                      
      data.exchangeRate,                          
      totalCostTTD,                               
      clearingTTD,                                
      totalInvestment,                            
      data.totalSales,                            
      data.totalProfit,                           
      totalItemsCount,                            
      itemsSoldStr,                               
      itemsLeftCount,                             
      data.dateCleared ? new Date(data.dateCleared) : "", 
      timeInTransit,                              
      profitMargin                                
    ];
    
    outputValues.push(rowRow);
  }
  
  var startRow = 3;
  var numRows = outputValues.length;
  batchLog.getRange(startRow, 1, Math.max(batchLog.getLastRow() - 2, 1), 17).clearContent();
  
  if (numRows > 0) {
    batchLog.getRange(startRow, 1, numRows, 17).setValues(outputValues);
    
    batchLog.getRange(startRow, 5, numRows, 1).setNumberFormat("@");
    batchLog.getRange(startRow, 6, numRows, 1).setNumberFormat("0.00"); 
    batchLog.getRange(startRow, 17, numRows, 1).setNumberFormat("0.00%"); 
    batchLog.getRange(startRow, 3, numRows, 1).setNumberFormat("dd-mmm-yyyy"); 
    batchLog.getRange(startRow, 15, numRows, 1).setNumberFormat("dd-mmm-yyyy"); 
  }
}


/**
 * =========================================================
 * FUNCTION: UPDATE ITEM LOG
 * =========================================================
 */
function updateItemLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var masterSheet = ss.getSheetByName("Hidden Master Log");
  var itemSheet = ss.getSheetByName("Item Log");
  var invoiceLog = ss.getSheetByName("Invoice Log");
  
  if (!masterSheet || !itemSheet) return;
  
  var lastMasterRow = masterSheet.getLastRow();
  if (lastMasterRow < 2) return;
  
  var masterData = masterSheet.getRange(2, 1, lastMasterRow - 1, 23).getValues();
  
  // Step 1: Collect total effective paid AND invoice date per Invoice # from the Invoice Log
  var invoicePaidMap = {};
  var invoiceDateMap = {};
  
  if (invoiceLog && invoiceLog.getLastRow() >= 3) {
    var invData = invoiceLog.getRange(3, 1, invoiceLog.getLastRow() - 2, 11).getValues();
    for (var j = 0; j < invData.length; j++) {
      var invNum = String(invData[j][0]).trim(); // Col A: Invoice #
      if (invNum) {
        var amtPaid = parseFloat(invData[j][5]) || 0;     // Col F: Amount Paid
        var prevPaid = parseFloat(invData[j][6]) || 0;    // Col G: Previously Paid
        var invDate = invData[j][9];                      // Col J: Date Sold
        
        if (!invoicePaidMap[invNum]) {
          invoicePaidMap[invNum] = 0;
        }
        invoicePaidMap[invNum] += (amtPaid + prevPaid);
        invoiceDateMap[invNum] = invDate;
      }
    }
  }
  
  // Step 2: Group items by Invoice # (Column S -> index 18) and track sold price from Column L (index 11)
  var invoiceItemsMap = {};
  
  for (var i = 0; i < masterData.length; i++) {
    var row = masterData[i];
    var itemID = String(row[1]).trim();
    if (!itemID) continue;
    
    var assignedInvoice = String(row[18]).trim(); // Col S index in master: 18
    var soldFor = parseFloat(row[11]) || 0;       // Col L index in master: 11 (Sold For)
    
    if (assignedInvoice) {
      if (!invoiceItemsMap[assignedInvoice]) {
        invoiceItemsMap[assignedInvoice] = [];
      }
      invoiceItemsMap[assignedInvoice].push({
        rowIndex: i,
        soldFor: soldFor
      });
    }
  }
  
  var itemFinancials = {};
  
  // Step 3: Waterfall distribution per invoice
  for (var inv in invoiceItemsMap) {
    var items = invoiceItemsMap[inv];
    var pool = invoicePaidMap[inv] !== undefined ? invoicePaidMap[inv] : 0;
    
    for (var k = 0; k < items.length; k++) {
      var item = items[k];
      var cap = item.soldFor;
      
      var allocatedPaid = 0;
      if (pool > 0 && cap > 0) {
        if (pool >= cap) {
          allocatedPaid = cap;
          pool -= cap;
        } else {
          allocatedPaid = pool;
          pool = 0;
        }
      }
      
      var owing = Math.max(0, cap - allocatedPaid);
      
      itemFinancials[item.rowIndex] = {
        paid: allocatedPaid,
        owing: owing
      };
    }
  }
  
  var batchCurrencyMap = {};
  var lastKnownCurrency = "USD";
  
  for (var i = 0; i < masterData.length; i++) {
    var bId = String(masterData[i][0]).trim();
    if (!bId) continue;
    
    var rawCurr = masterData[i][22] || ""; 
    var currCode = String(rawCurr).trim().toUpperCase();
    
    if (currCode === "EUR" || currCode === "GBP" || currCode === "USD" || currCode === "TTD") {
      lastKnownCurrency = currCode;
    }
    
    if (!batchCurrencyMap[bId]) {
      batchCurrencyMap[bId] = lastKnownCurrency;
    }
  }
  
  var startRow = 5;
  var output = [];
  
  // Step 4: Build the final output array for the Item Log
  for (var i = 0; i < masterData.length; i++) {
    var row = masterData[i];
    var itemID = String(row[1]).trim();
    var bId = String(row[0]).trim();
    
    if (!itemID) continue;
    
    var rawCostFC = row[5]; 
    var resolvedCurr = batchCurrencyMap[bId] || lastKnownCurrency;
    
    var rowData = new Array(16).fill("");
    
    rowData[0] = itemID;                               // Col A: Item ID
    rowData[1] = row[3] !== undefined ? row[3] : "";   // Col B: Store
    
    var masterInvoice = row[18];
    var hasInvoice = (masterInvoice !== 0 && masterInvoice !== "" && masterInvoice !== undefined);
    
    // **UPDATED: Dynamically determine Status for Column C**
    var statusVal = row[13] !== undefined ? row[13] : ""; // Default status (e.g. In Transit, Available)
    if (hasInvoice && itemFinancials[i]) {
      var oVal = itemFinancials[i].owing;
      statusVal = (oVal === 0) ? "Paid" : "Owing";
    }
    rowData[2] = statusVal;                            // Col C: Status
    
    var descVal = row[4]; 
    rowData[3] = (descVal === "" || descVal === undefined) ? "" : descVal; // Col D: Description
    
    rowData[4] = (row[14] !== "" && row[14] !== undefined) ? row[14] : (row[15] !== undefined ? row[15] : ""); // Col E: Customer
    
    var valL = row[11]; 
    rowData[5] = (valL === 0 || valL === "" || valL === undefined) ? "" : valL; // Col F: Sold For (TTD)
    
    rowData[12] = hasInvoice ? masterInvoice : ""; // Col M: Invoice #
    rowData[13] = hasInvoice && invoiceDateMap[masterInvoice] ? invoiceDateMap[masterInvoice] : ""; // Col N: Invoice Date
    
    var allocatedPaid = 0;
    if (itemFinancials[i]) {
      allocatedPaid = itemFinancials[i].paid > 0 ? itemFinancials[i].paid : 0;
    }
    
    var valK = parseFloat(row[9]) || 0; 
    
    if (hasInvoice && valK !== 0) {
      rowData[6] = (allocatedPaid - valK) / valK; // Col G
    } else {
      rowData[6] = "";
    }
    
    var currSymbol = "$   ";
    var currCode = String(resolvedCurr).toUpperCase();
    if (currCode === "EUR") currSymbol = "€   ";
    else if (currCode === "GBP") currSymbol = "£   ";
    else if (currCode === "TTD") currSymbol = "TT$   ";
    else if (currCode === "USD") currSymbol = "US$   ";
    
    if (rawCostFC !== "" && rawCostFC !== undefined && !isNaN(rawCostFC) && Number(rawCostFC) > 0) {
      rowData[7] = currSymbol + Number(rawCostFC).toFixed(2); // Col H
    } else {
      rowData[7] = "";
    }
    
    rowData[8]  = (row[7] === 0 || row[7] === "" || row[7] === undefined) ? "" : row[7];   // Col I
    rowData[9]  = (row[8] === 0 || row[8] === "" || row[8] === undefined) ? "" : row[8];   // Col J
    rowData[10] = (row[9] === 0 || row[9] === "" || row[9] === undefined) ? "" : row[9];   // Col K
    
    if (hasInvoice && valK > 0) {
      rowData[11] = allocatedPaid - valK; // Col L
    } else {
      rowData[11] = "";
    }
    
    if (itemFinancials[i]) {
      var pVal = itemFinancials[i].paid;
      var oVal = itemFinancials[i].owing;
      rowData[14] = pVal > 0 ? pVal : ""; // Col O: Amount Paid
      rowData[15] = oVal > 0 ? oVal : ""; // Col P: Owing
    }
    
    output.push(rowData);
  }
  
  var existingLastRow = itemSheet.getLastRow();
  if (existingLastRow >= startRow) {
    itemSheet.getRange(startRow, 1, existingLastRow - startRow + 1, 16).clearContent();
  }
  
  if (output.length > 0) {
    itemSheet.getRange(startRow, 1, output.length, output[0].length).setValues(output);
    itemSheet.getRange(startRow, 7, output.length, 1).setNumberFormat("0.00%");
    itemSheet.getRange(startRow, 14, output.length, 1).setNumberFormat("dd-mmm-yyyy").setHorizontalAlignment("center");
  }
  
  SpreadsheetApp.getActive().toast("Item Log and Status successfully updated!", "Success", 3);
}


/**
 * =========================================================
 * FUNCTION: UPDATE CUSTOMER LOG
 * =========================================================
 */
function updateCustomerLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var customerSheet = ss.getSheetByName("Customer Log");
  if (!customerSheet) return;
  
  var itemSheet = ss.getSheetByName("Item Log");
  var invoiceSheet = ss.getSheetByName("Invoice Log");
  
  if (!itemSheet || !invoiceSheet) {
    SpreadsheetApp.getUi().alert("Could not find 'Item Log' or 'Invoice Log' sheet.");
    return;
  }
  
  // 1. Process Item Log Data (Starts at row 5, so index 4)
  var itemData = itemSheet.getDataRange().getValues();
  var customerMap = {};
  
  for (var i = 4; i < itemData.length; i++) {
    var row = itemData[i];
    var itemID = row[0];
    if (!itemID || itemID.toString().trim() === "") continue;
    
    // Customer Name is pulled from Column E (index 4)
    var customerName = row[4]; 
    if (!customerName || customerName.toString().trim() === "") continue;
    
    if (!customerMap[customerName]) {
      customerMap[customerName] = {
        name: customerName,
        totalOwing: 0,
        totalSales: 0,
        itemsBought: 0,
        itemsOwing: 0,
        profitMade: 0,
        lastItem: "",
        lastDate: null
      };
    }
    
    // Total Sales - Item Log Column O (index 14): Amount Paid
    var salesVal = Number(row[14]) || 0;
    customerMap[customerName].totalSales += salesVal;
    
    // Total Owing - Item Log Column P (index 15)
    var owingVal = Number(row[15]) || 0;
    customerMap[customerName].totalOwing += owingVal;
    
    // Check if item is owing (Status in Column C, index 2)
    var itemStatusColC = row[2];
    if (itemStatusColC && itemStatusColC.toString().trim().toLowerCase() === "owing") {
      customerMap[customerName].itemsOwing += 1;
    }
    
    // Items Bought - Count total items bought
    customerMap[customerName].itemsBought += 1;
    
    // Last Purchase Date (Column N, index 13) & Last Item Purchased (Column D, index 3)
    var dateVal = row[13]; 
    if (dateVal) {
      var d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        if (!customerMap[customerName].lastDate || d > customerMap[customerName].lastDate) {
          customerMap[customerName].lastDate = d;
          customerMap[customerName].lastItem = row[3] || ""; // Column D: Description
        }
      }
    }
  }
  
  // 2. Process Invoice Log Data for Profit Made (Col N -> index 13, Customer Name -> Col B / index 1)
  var invoiceData = invoiceSheet.getDataRange().getValues();
  for (var j = 2; j < invoiceData.length; j++) {
    var invRow = invoiceData[j];
    var invCustomer = invRow[1]; // Column B (index 1): Bill To (Name) in Invoice Log
    if (!invCustomer || !customerMap[invCustomer]) continue;
    
    var profitVal = Number(invRow[13]) || 0; // Col N is index 13
    customerMap[invCustomer].profitMade += profitVal;
  }
  
  // 3. Convert Map to Array for Sorting and Writing
  var outputRows = [];
  for (var cust in customerMap) {
    var c = customerMap[cust];
    
    // Status - If Total Owing > 0 "Owing" otherwise "Up to date"
    var status = c.totalOwing > 0 ? "Owing" : "Up to date";
    
    var dateFormatted = c.lastDate ? Utilities.formatDate(c.lastDate, Session.getScriptTimeZone(), "yyyy-MM-dd") : "";
    
    outputRows.push([
      c.name,               // A. Customer Name
      status,               // B. Status
      c.totalOwing,         // C. Total Owing
      c.totalSales,         // D. Total Sales (Now sourced from Column O / index 14)
      c.itemsBought,        // E. Items Bought
      c.itemsOwing,         // F. Items Owing
      c.profitMade,         // G. Profit Made
      c.lastItem,           // H. Last Item Purchased
      dateFormatted         // I. Last Purchase Date
    ]);
  }
  
  // Sort names in Alphabetical Order (A-Z) and readjust all columns/contents
  outputRows.sort(function(a, b) {
    return a[0].toString().localeCompare(b[0].toString());
  });
  
  // 4. Clear existing rows safely from row 3 downwards before writing new data
  var lastRow = customerSheet.getLastRow();
  if (lastRow >= 3) {
    customerSheet.getRange(3, 1, lastRow - 2, 9).clearContent();
  }
  
  // Write back to Customer Log sheet starting at row 3
  if (outputRows.length > 0) {
    customerSheet.getRange(3, 1, outputRows.length, 9).setValues(outputRows);
  }
  
  SpreadsheetApp.flush();
}


/**
 * =========================================================
 * LOGIC: GET INVOICE TABS ARRAY (EXACT CAPS "INV", MAX 10)
 * =========================================================
 */
function GET_INV_TABS() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var invTabs = [];
  
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getSheetName();
    // Check if the tab name contains exact uppercase "INV"
    if (name.indexOf("INV") !== -1) {
      invTabs.push([name]); // Collect all matching invoice tabs
    }
  }
  
  // Return empty string placeholder if none found to avoid errors
  if (invTabs.length === 0) {
    return [[""]];
  }
  
  // If there are more than 10, we slice just the first 10 for the display block (C51:C60)
  // But wait, if we slice it here, C61 wouldn't know the total unless we track it.
  // Instead, let's keep the return capped at 10 for C51:C60:
  return invTabs.slice(0, 10);
}


function GET_INV_COUNT() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var count = 0;
  
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getSheetName();
    if (name.indexOf("INV") !== -1) {
      count++;
    }
  }
  return count;
}

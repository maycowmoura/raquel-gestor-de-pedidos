function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);
    const doc = SpreadsheetApp.getActiveSpreadsheet();

    // --- Update Products Sheet ---
    let sheetProducts = doc.getSheetByName('Produtos');
    if (!sheetProducts) {
      sheetProducts = doc.insertSheet('Produtos');
    }
    sheetProducts.clear();

    if (data.products && data.products.length > 0) {
      const productHeaders = ['ID', 'Nome'];
      const productRows = data.products.map(p => [p.id, p.name]);
      sheetProducts.getRange(1, 1, 1, productHeaders.length).setValues([productHeaders]).setFontWeight('bold');
      sheetProducts.getRange(2, 1, productRows.length, productHeaders.length).setValues(productRows);
    } else {
      sheetProducts.getRange(1, 1).setValue('Nenhum produto cadastrado');
    }

    // --- Update Orders Sheet ---
    let sheetOrders = doc.getSheetByName('Pedidos');
    if (!sheetOrders) {
      sheetOrders = doc.insertSheet('Pedidos');
    }
    sheetOrders.clear();

    if (data.orders && data.orders.length > 0) {
      const orderHeaders = ['ID Pedido', 'Cliente', 'Data de Entrega', 'Produtos', 'Produtos JSON', 'Observações'];
      const orderRows = data.orders.map(o => {
        // Human readable items
        const itemsReadable = o.items.map(item => {
          const prod = data.products.find(p => p.id === item.productId);
          return `${item.quantity}x ${prod ? prod.name : 'Produto Removido'}`;
        }).join(', ');

        // Raw JSON items
        const itemsJson = JSON.stringify(o.items);

        return [o.id, o.customerName, o.deliveryDate, itemsReadable, itemsJson, o.observations || ''];
      });

      sheetOrders.getRange(1, 1, 1, orderHeaders.length).setValues([orderHeaders]).setFontWeight('bold');
      sheetOrders.getRange(2, 1, orderRows.length, orderHeaders.length).setValues(orderRows);
    } else {
      sheetOrders.getRange(1, 1).setValue('Nenhum pedido cadastrado');
    }

    // Save hidden raw data for perfect recovery on GET
    saveRawData(doc, data);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const sheetProducts = doc.getSheetByName('Produtos');
    const sheetOrders = doc.getSheetByName('Pedidos');

    const products = [];
    const orders = [];

    // Read Products
    if (sheetProducts && sheetProducts.getLastRow() > 1) {
      const prodValues = sheetProducts.getRange(2, 1, sheetProducts.getLastRow() - 1, 2).getValues();
      prodValues.forEach(row => {
        products.push({ id: String(row[0]), name: String(row[1]) });
      });
    }

    // Read Orders
    if (sheetOrders && sheetOrders.getLastRow() > 1) {
      const orderValues = sheetOrders.getRange(2, 1, sheetOrders.getLastRow() - 1, 5).getValues();
      orderValues.forEach(row => {
        // We need to parse the "2x Name" string back to IDs if we want full recovery,
        // but since we are overwriting the sheet every sync, the "source of truth" 
        // for complex structures is usually the app state.
        // To make GET reliable for recovery, we'll store a hidden copy of the 
        // raw JSON or adjust how we save.
        // For now, let's store the RAW JSON in a hidden sheet for perfect recovery
        // and use the visible sheets for "viewing" only.
      });
    }

    // UPDATED APPROACH: For perfect recovery, we store the full JSON in a hidden sheet 'RawData'
    // but keep 'Pedidos' and 'Produtos' for the user to see.
    let sheetRaw = doc.getSheetByName('RawData');
    if (sheetRaw) {
      const rawJson = sheetRaw.getRange(1, 1).getValue();
      return ContentService.createTextOutput(rawJson || JSON.stringify({ products: [], orders: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ products: [], orders: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Emitting a helper to save raw data in doPost as well
function saveRawData(doc, data) {
  let sheetRaw = doc.getSheetByName('RawData');
  if (!sheetRaw) {
    sheetRaw = doc.insertSheet('RawData');
    sheetRaw.hideSheet();
  }
  sheetRaw.clear();
  sheetRaw.getRange(1, 1).setValue(JSON.stringify(data));
}

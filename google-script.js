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
      // Columns: ID (A), Name (B)
      const dataRange = sheetProducts.getRange(2, 1, sheetProducts.getLastRow() - 1, 2);
      const prodValues = dataRange.getValues();
      prodValues.forEach(row => {
        // Only add if ID exists
        if (row[0]) {
          products.push({ id: String(row[0]), name: String(row[1]) });
        }
      });
    }

    // Read Orders
    if (sheetOrders && sheetOrders.getLastRow() > 1) {
      // Columns: ID (A), Customer(B), Date(C), Text(D), JSON Items(E), Obs(F)
      // Getting 6 columns
      const dataRange = sheetOrders.getRange(2, 1, sheetOrders.getLastRow() - 1, 6);
      const orderValues = dataRange.getValues();

      orderValues.forEach(row => {
        if (row[0]) { // If ID exists
          let items = [];
          try {
            // Try to parse items from column E (index 4)
            items = row[4] ? JSON.parse(row[4]) : [];
          } catch (e) {
            // Fallback: empty if parse fails
            items = [];
          }

          orders.push({
            id: String(row[0]),
            customerName: String(row[1]),
            deliveryDate: row[2] instanceof Date ? row[2].toISOString().split('T')[0] : String(row[2]),
            items: items,
            observations: String(row[5])
          });
        }
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ products: products, orders: orders }))
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

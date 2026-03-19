// Server-side App Script logic

// Fetch dynamic products from Google Sheets
function getProductsFromSheet() {
  try {
    const ssId = '1aYjhnZPkIJRyV6RbgVWLEtVuF6jJ1iosMnXClwFylB0';
    const ss = SpreadsheetApp.openById(ssId);
    let sheet = ss.getSheetByName('Products');
    if (!sheet) sheet = ss.getSheets()[0]; // Fallback to the very first tab
    
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return []; 
    
    const productsList = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] || row[1]) {
            productsList.push({
                id: row[0] ? String(row[0]) : `SKU-${i}`,
                name: row[1] ? String(row[1]) : 'Unknown Item',
                price: parseFloat(row[2]) || 0
            });
        }
    }
    return productsList;
  } catch(e) {
    return [{ id: "ERR", name: "API Error: " + e.message, price: 0 }];
  }
}

// --- FIX PERMISSIONS HELPER ---
// Select "enforcePermissions" from the top menu, hit Run, and accept the security popup.
function enforcePermissions() {
  const me = Session.getActiveUser().getEmail();
  MailApp.sendEmail(me, "Permissions Fixed!", "Success! Your Invoice Generator web app can now officially send emails.");
  SpreadsheetApp.openById('1aYjhnZPkIJRyV6RbgVWLEtVuF6jJ1iosMnXClwFylB0');
}

function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Invoice Generator')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Generate PDF from HTML template and save to Drive
function generatePDF(invoiceData) {
  try {
    const template = HtmlService.createTemplateFromFile('invoice_template');
    template.data = invoiceData;
    
    // Fetch external logo and embed as base64 so PDF engine renders it reliably
    try {
      const logoUrl = "https://play-lh.googleusercontent.com/Rpzpy-NErW58-MW_FBNegGWYBbZw9cozZTzaN3EbGiZhtW2DRgCkubODUcgweiYi3tY";
      const logoResponse = UrlFetchApp.fetch(logoUrl);
      template.logoBase64 = "data:image/png;base64," + Utilities.base64Encode(logoResponse.getBlob().getBytes());
    } catch(e) {
      template.logoBase64 = ""; 
    }
    
    const htmlOutput = template.evaluate();
    
    const sanitizedName = invoiceData.customerDetails.name ? invoiceData.customerDetails.name.replace(/\s+/g, '_') : 'Customer';
    const pdfName = 'Invoice_' + sanitizedName + '_' + new Date().getTime() + '.pdf';
    
    const pdfBlob = htmlOutput.getAs(MimeType.PDF).setName(pdfName);
    
    // Saves file in the specific Google Drive folder provided by the user
    const folder = DriveApp.getFolderById('1dakstLpK73sMZ1-Vdd3BpHK04JhQV2E9');
    const file = folder.createFile(pdfBlob);
    
    // Connect to Google Sheets to Log Invoice
    let sheetStatus = "Skipped";
    try {
      const ssId = '1aYjhnZPkIJRyV6RbgVWLEtVuF6jJ1iosMnXClwFylB0';
      const ss = SpreadsheetApp.openById(ssId);
      // Attempt to find a sheet named 'Invoices', otherwise fallback to the first active sheet
      let sheet = ss.getSheetByName('Invoices');
      if (!sheet) sheet = ss.getActiveSheet();
      
      const rowData = [
        new Date(), // Timestamp
        invoiceData.invoiceDate,
        invoiceData.customerDetails.name,
        invoiceData.customerDetails.email,
        invoiceData.customerDetails.phone || '',
        invoiceData.location,
        invoiceData.summary.subtotal,
        invoiceData.summary.orderDiscountAmount,
        invoiceData.summary.taxAmount,
        invoiceData.summary.finalTotal,
        file.getUrl() // Direct link to PDF
      ];
      sheet.appendRow(rowData);
      sheetStatus = "Saved to Sheet successfully.";
    } catch (sheetErr) {
      sheetStatus = "Sheet Sync Error: " + sheetErr.toString();
      console.error(sheetStatus);
    }
    
    // Email Integration
    const customerEmail = invoiceData.customerDetails.email;
    let emailStatus = "Customer email missing.";
    
    if (customerEmail) {
      try {
        MailApp.sendEmail({
            to: customerEmail,
            subject: "Your Invoice from Tradelite",
            body: "Dear " + (invoiceData.customerDetails.name || 'Customer') + ",\n\nThank you for your business. Please find your official invoice safely attached to this email.\n\nBest regards,\nTradelite Team",
            attachments: [pdfBlob]
        });
        emailStatus = "Emailed successfully to " + customerEmail;
      } catch (e) {
        emailStatus = "Failed to email: " + e.toString();
      }
    }

    return {
      success: true,
      url: file.getUrl(),
      name: file.getName(),
      emailStatus: emailStatus,
      sheetStatus: sheetStatus
    };
  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}

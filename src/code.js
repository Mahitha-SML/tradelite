// Server-side App Script logic

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
    
    const htmlOutput = template.evaluate();
    
    const sanitizedName = invoiceData.customerDetails.name ? invoiceData.customerDetails.name.replace(/\s+/g, '_') : 'Customer';
    const pdfName = 'Invoice_' + sanitizedName + '_' + new Date().getTime() + '.pdf';
    
    const pdfBlob = htmlOutput.getAs(MimeType.PDF).setName(pdfName);
    
    // Saves file in the specific Google Drive folder provided by the user
    const folder = DriveApp.getFolderById('1dakstLpK73sMZ1-Vdd3BpHK04JhQV2E9');
    const file = folder.createFile(pdfBlob);
    
    return {
      success: true,
      url: file.getUrl(),
      name: file.getName()
    };
  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}

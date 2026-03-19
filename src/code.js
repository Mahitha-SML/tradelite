// Server-side App Script logic

// --- FIX PERMISSIONS HELPER ---
// Select "enforcePermissions" from the top menu, hit Run, and accept the security popup.
function enforcePermissions() {
  const me = Session.getActiveUser().getEmail();
  MailApp.sendEmail(me, "Permissions Fixed!", "Success! Your Invoice Generator web app can now officially send emails.");
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
    
    const htmlOutput = template.evaluate();
    
    const sanitizedName = invoiceData.customerDetails.name ? invoiceData.customerDetails.name.replace(/\s+/g, '_') : 'Customer';
    const pdfName = 'Invoice_' + sanitizedName + '_' + new Date().getTime() + '.pdf';
    
    const pdfBlob = htmlOutput.getAs(MimeType.PDF).setName(pdfName);
    
    // Saves file in the specific Google Drive folder provided by the user
    const folder = DriveApp.getFolderById('1dakstLpK73sMZ1-Vdd3BpHK04JhQV2E9');
    const file = folder.createFile(pdfBlob);
    
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
      emailStatus: emailStatus
    };
  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}

const PDFDocument = require('pdfkit');

/**
 * Generates an EPR Handover Certificate and returns it as a base64 string
 * so the frontend can easily download or display it.
 */
function generateEPRCertificate(lot, recycler) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData.toString('base64'));
      });

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('EPR Handover Certificate', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica').text('This document certifies the legal handover of e-waste material for recycling under the E-Waste (Management) Rules.', { align: 'center' });
      doc.moveDown(2);

      // Certificate Details
      doc.fontSize(14).font('Helvetica-Bold').text('Certificate Details:');
      doc.fontSize(12).font('Helvetica')
         .text(`Certificate ID: EPR-CERT-${Date.now()}`)
         .text(`Date & Time: ${new Date().toLocaleString()}`)
         .text(`Reference Lot ID: ${lot.lotId}`);
      doc.moveDown();

      // Recycler Info
      doc.fontSize(14).font('Helvetica-Bold').text('Authorized Recycler:');
      doc.fontSize(12).font('Helvetica')
         .text(`Name: ${recycler.name}`)
         .text(`Status: CPCB Authorized`);
      doc.moveDown();

      // Dealer Info
      doc.fontSize(14).font('Helvetica-Bold').text('Supplier (Scrap Dealer):');
      doc.fontSize(12).font('Helvetica')
         .text(`Name: ${lot.dealerName}`);
      doc.moveDown();

      // Material Info
      doc.fontSize(14).font('Helvetica-Bold').text('Material Verified:');
      doc.fontSize(12).font('Helvetica')
         .text(`Category: ${lot.category}`)
         .text(`Declared Weight: ${lot.declaredWeight} kg`)
         .text(`Verified Weight: ${lot.verifiedWeight} kg`);
      
      doc.moveDown(2);
      
      // Footer/Signature line
      doc.text('_____________________________')
      doc.text('Authorized Signatory (Recycler)')

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = generateEPRCertificate;

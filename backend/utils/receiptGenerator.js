const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Download image from URL to buffer
 * @param {string} url - Image URL
 * @returns {Promise<Buffer>} Image buffer
 */
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
};

/**
 * Generate a beautifully formatted PDF receipt using PDFKit
 * @param {Object} receiptData - Receipt data from database
 * @param {Object} schoolSettings - School branding settings
 * @returns {Promise<Buffer>} A promise that resolves to the PDF buffer
 */
const generateReceiptPdf = (receiptData, schoolSettings = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { receipt, payment, fee, student, issuedBy } = receiptData;
      
      const schoolName = schoolSettings.branding?.institutionNameEn || 'School Management System';
      const brandColor = schoolSettings.branding?.brandColor || '#0ea5e9'; // Default modern blue
      const logoUrl = schoolSettings.branding?.logo || null;
      
      const studentName = student?.user?.name || 'Student';
      const studentId = student?.studentId || 'N/A';
      const grade = student?.grade || 'N/A';
      const amount = payment?.amount || 0;
      const paymentType = fee?.description || 'Tuition Fee';
      const paymentMethod = payment?.bankName || 'Cash';
      const receiptNumber = receipt?.receiptNumber || 'N/A';
      const transactionRef = payment?.transactionReference || 'N/A';
      const paymentDate = payment?.paymentDate || payment?.verificationDate || new Date();
      const cashierName = issuedBy?.name || 'Cashier';
      
      const formatDate = (date) => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const formatTime = (date) => new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const formatAmount = (amt) => `ETB ${Number(amt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // --- Header Background ---
      doc.rect(0, 0, doc.page.width, 120).fill(brandColor);
      
      // --- Logo (if available) ---
      let logoBuffer = null;
      if (logoUrl) {
        try {
          if (logoUrl.startsWith('http')) {
            // Download from URL
            logoBuffer = await downloadImage(logoUrl);
          } else {
            // Local file path
            const logoPath = path.resolve(logoUrl);
            if (fs.existsSync(logoPath)) {
              logoBuffer = fs.readFileSync(logoPath);
            }
          }
          
          if (logoBuffer) {
            // Position logo on the left side
            doc.image(logoBuffer, 50, 30, { fit: [60, 60], align: 'left' });
          }
        } catch (logoError) {
          console.log('Error loading logo:', logoError.message);
          // Continue without logo if there's an error
        }
      }
      
      // --- Header Text ---
      doc.fillColor('#ffffff')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text(schoolName, 50, 45, { align: 'center' });
      
      doc.fontSize(10)
         .font('Helvetica')
         .text('OFFICIAL PAYMENT RECEIPT', 50, 80, { align: 'center', characterSpacing: 2 });

      // --- Receipt Details ---
      doc.fillColor('#333333');
      doc.moveDown(4);

      // Top info (Receipt No & Date)
      doc.fontSize(10).font('Helvetica-Bold').text('Receipt No:', 50, 150);
      doc.font('Helvetica').text(receiptNumber, 120, 150);

      doc.font('Helvetica-Bold').text('Date:', 380, 150);
      doc.font('Helvetica').text(`${formatDate(paymentDate)} ${formatTime(paymentDate)}`, 420, 150);

      doc.font('Helvetica-Bold').text('Transaction Ref:', 50, 170);
      doc.font('Helvetica').text(transactionRef, 140, 170);

      // Divider
      doc.moveTo(50, 200).lineTo(545, 200).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // --- Student Information Section ---
      doc.fontSize(14).font('Helvetica-Bold').fillColor(brandColor).text('Student Information', 50, 220);
      doc.fillColor('#475569');

      const startYStudent = 250;
      doc.fontSize(10).font('Helvetica-Bold').text('Name:', 50, startYStudent);
      doc.font('Helvetica').text(studentName, 150, startYStudent);

      doc.font('Helvetica-Bold').text('Student ID:', 50, startYStudent + 20);
      doc.font('Helvetica').text(studentId, 150, startYStudent + 20);

      doc.font('Helvetica-Bold').text('Grade/Class:', 50, startYStudent + 40);
      doc.font('Helvetica').text(grade, 150, startYStudent + 40);

      // Divider
      doc.moveTo(50, 320).lineTo(545, 320).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // --- Payment Details Section ---
      doc.fontSize(14).font('Helvetica-Bold').fillColor(brandColor).text('Payment Details', 50, 340);
      doc.fillColor('#475569');

      const startYPayment = 370;
      
      // Table Header
      doc.rect(50, startYPayment, 495, 25).fillColor('#f8fafc').fill();
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold');
      doc.text('DESCRIPTION', 60, startYPayment + 8);
      doc.text('METHOD', 300, startYPayment + 8);
      doc.text('AMOUNT', 480, startYPayment + 8, { width: 55, align: 'right' });

      // Table Row
      doc.fillColor('#1e293b').font('Helvetica');
      doc.text(paymentType, 60, startYPayment + 35);
      doc.text(paymentMethod, 300, startYPayment + 35);
      doc.font('Helvetica-Bold').text(formatAmount(amount), 450, startYPayment + 35, { width: 85, align: 'right' });

      // Total Box
      doc.rect(380, startYPayment + 70, 165, 35).fillColor(brandColor).fill();
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12);
      doc.text('TOTAL PAID:', 390, startYPayment + 82);
      doc.text(formatAmount(amount), 450, startYPayment + 82, { width: 85, align: 'right' });

      // --- Cashier Section ---
      doc.fillColor('#475569').fontSize(10).font('Helvetica');
      doc.text('Processed By:', 50, startYPayment + 150);
      doc.font('Helvetica-Bold').text(cashierName, 130, startYPayment + 150);
      
      // Footer
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8');
      doc.text('This is an official computer-generated receipt.', 50, 750, { align: 'center' });
      doc.text(`Generated on ${formatDate(new Date())} at ${formatTime(new Date())}`, 50, 765, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateReceiptPdf };

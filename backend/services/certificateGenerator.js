import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../backend/public/uploads/certificates');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Certificate type labels
const certificateLabels = {
  no_id: 'Certificate of No ID',
  no_pending_obligation: 'Certificate of No Pending Obligation'
};

// Purpose labels
const purposeLabels = {
  scholarship: 'Scholarship',
  employment: 'Employment',
  legal: 'Legal/Court Proceedings',
  government: 'Government Agency/Official',
  personal: 'Personal Use',
  other: 'Other'
};

/**
 * Generate a PDF certificate
 * @param {Object} requestData - Certificate request data
 * @returns {Promise<string>} - Path to generated PDF file
 */
export async function generateCertificatePDF(requestData) {
  return new Promise(async (resolve, reject) => {
    try {
      const {
        request_number,
        control_number,
        full_name,
        student_number,
        course,
        certificate_type,
        certificate_purpose,
        created_at
      } = requestData;

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      // Generate filename
      const timestamp = Date.now();
      const filename = `CERT-${request_number}-${timestamp}.pdf`;
      const filepath = path.join(uploadsDir, filename);
      const fileStream = fs.createWriteStream(filepath);

      doc.pipe(fileStream);

      // Add decorative border
      doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80).stroke('#800000');
      doc.rect(45, 45, doc.page.width - 90, doc.page.height - 90).stroke('#800000');

      // Header - PUP Logo and Title
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#800000')
        .text('POLYTECHNIC UNIVERSITY OF THE PHILIPPINES', { align: 'center' })
        .fontSize(14)
        .fillColor('#333')
        .text('Parañaque Campus', { align: 'center' });

      doc.moveDown(0.5);

      // Certificate type title
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#800000')
        .text(certificateLabels[certificate_type] || certificate_type, { align: 'center' });

      doc.moveDown(1);

      // Certificate body text
      doc.fontSize(12)
        .font('Helvetica')
        .fillColor('#333')
        .text('This is to certify that', { align: 'center' });

      doc.moveDown(0.3);

      // Student name
      doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#000')
        .text(full_name.toUpperCase(), { align: 'center' });

      doc.moveDown(0.3);

      // Student info
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#333')
        .text(`Student Number: ${student_number}`, { align: 'center' })
        .text(`Course: ${course}`, { align: 'center' });

      doc.moveDown(0.5);

      // Certificate details
      doc.fontSize(12)
        .fillColor('#333')
        .text('Is eligible to receive this certificate as requested for:', { align: 'center' });

      doc.moveDown(0.3);

      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#800000')
        .text(purposeLabels[certificate_purpose] || certificate_purpose, { align: 'center' });

      doc.moveDown(1);

      // Validity statement
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#666')
        .text('This certificate is valid for official use and authentication purposes.', { align: 'center' });

      doc.moveDown(2);

      // Signature area
      doc.fontSize(11)
        .fillColor('#333')
        .text('_________________________________', 100)
        .fontSize(10)
        .text('Authorized Official', 100)
        .text('Student Affairs Office', 100);

      doc.moveDown(2);

      // Control number and QR code section
      doc.fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#333')
        .text('VERIFICATION & AUTHENTICITY', { align: 'center' });

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(control_number);
      const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

      // Add QR code to PDF
      doc.image(qrCodeBuffer, 210, doc.y, { width: 80, height: 80 });

      doc.moveDown(5);

      // Control number display
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0c5460')
        .text(`Control Number: ${control_number}`, { align: 'center' });

      doc.fontSize(9)
        .font('Helvetica')
        .fillColor('#666')
        .text('Scan the QR code above or enter the control number to verify this certificate', { align: 'center' });

      doc.moveDown(1);

      // Footer
      doc.fontSize(8)
        .fillColor('#999')
        .text(`Document Reference: ${request_number}`, { align: 'center' })
        .text(`Issued: ${new Date(created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })
        .text('This is a digitally generated document. No signature is required.', { align: 'center' });

      // Finalize PDF
      doc.end();

      fileStream.on('finish', () => {
        console.log('✅ Certificate PDF generated:', filename);
        resolve(`/public/uploads/certificates/${filename}`);
      });

      fileStream.on('error', (error) => {
        console.error('❌ File stream error:', error);
        reject(error);
      });

    } catch (error) {
      console.error('❌ Error generating certificate PDF:', error);
      reject(error);
    }
  });
}

/**
 * Delete certificate PDF file
 * @param {string} filePath - Path to PDF file
 */
export function deleteCertificatePDF(filePath) {
  try {
    if (filePath) {
      const fullPath = path.join(__dirname, '../../backend', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('✅ Certificate PDF deleted:', filePath);
        return true;
      }
    }
  } catch (error) {
    console.error('❌ Error deleting certificate PDF:', error);
  }
  return false;
}

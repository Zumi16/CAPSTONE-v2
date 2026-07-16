import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'your-email@gmail.com',
    pass: process.env.SMTP_PASSWORD || 'your-password'
  }
});

// Email template for generated certificate
function generateCertificateEmailTemplate(studentName, requestNumber, controlNumber, certificatePurpose, certificateType) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #800000 0%, #5a0000 100%); color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .details { background: white; padding: 15px; border-left: 4px solid #800000; margin: 10px 0; }
          .label { font-weight: bold; color: #800000; }
          .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; }
          .control-number { font-size: 18px; color: #0c5460; font-weight: bold; background: #e7f3f5; padding: 10px; border-radius: 3px; }
          .button { display: inline-block; background: #800000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Your Certificate is Ready!</h1>
            <p>Digital Certificate Generation Notification</p>
          </div>

          <div class="content">
            <p>Dear <strong>${studentName}</strong>,</p>

            <p>Great news! Your digital certificate request has been successfully generated and is ready for printing.</p>

            <div class="details">
              <p><span class="label">Request Number:</span> ${requestNumber}</p>
              <p><span class="label">Control Number:</span> <span class="control-number">${controlNumber}</span></p>
              <p><span class="label">Certificate Type:</span> ${certificateType}</p>
              <p><span class="label">Purpose:</span> ${certificatePurpose}</p>
              <p><span class="label">Status:</span> Generated (Ready for Printing)</p>
            </div>

            <h3>What's Next?</h3>
            <ol>
              <li>You can now <strong>download your certificate</strong> from the student portal</li>
              <li>Visit the Student Affairs Office to pick up your printed copy</li>
              <li>Keep your Control Number safe for verification purposes</li>
            </ol>

            <h3>Verification Information</h3>
            <p>Use your Control Number (<strong>${controlNumber}</strong>) to verify and authenticate your certificate.</p>

            <p style="background: #fff3cd; padding: 10px; border-radius: 3px; margin: 15px 0;">
              ⏱️ <strong>Processing Time:</strong> Certificates typically remain valid for 6 months from the date of generation.
            </p>

            <p>If you have any questions or need assistance, please contact the Student Affairs Office.</p>

            <p>Best regards,<br>
            <strong>PUP Parañaque Campus</strong><br>
            Student Affairs and Services Office</p>
          </div>

          <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
            <p>&copy; 2026 Polytechnic University of the Philippines. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Email template for released certificate
function releasedCertificateEmailTemplate(studentName, requestNumber, controlNumber, certificatePurpose, certificateType) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #155724 0%, #0c5460 100%); color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .details { background: white; padding: 15px; border-left: 4px solid #155724; margin: 10px 0; }
          .label { font-weight: bold; color: #155724; }
          .footer { text-align: center; color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; }
          .control-number { font-size: 18px; color: #0c5460; font-weight: bold; background: #d4edda; padding: 10px; border-radius: 3px; }
          .button { display: inline-block; background: #155724; color: white; padding: 10px 20px; text-decoration: none; border-radius: 3px; margin: 10px 0; }
          .highlight { background: #d4edda; padding: 15px; border-radius: 3px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Your Certificate is Ready for Pickup!</h1>
            <p>Certificate Release Notification</p>
          </div>

          <div class="content">
            <p>Dear <strong>${studentName}</strong>,</p>

            <p>Your digital certificate has been processed and is now ready for pickup!</p>

            <div class="details">
              <p><span class="label">Request Number:</span> ${requestNumber}</p>
              <p><span class="label">Control Number:</span> <span class="control-number">${controlNumber}</span></p>
              <p><span class="label">Certificate Type:</span> ${certificateType}</p>
              <p><span class="label">Purpose:</span> ${certificatePurpose}</p>
              <p><span class="label">Status:</span> Released (Ready for Pickup)</p>
            </div>

            <div class="highlight">
              <h3>📍 How to Pick Up Your Certificate:</h3>
              <ol>
                <li>Visit the <strong>Student Affairs Office</strong></li>
                <li>Bring your <strong>Student ID</strong></li>
                <li>Present your <strong>Request Number: ${requestNumber}</strong></li>
                <li>Receive your printed certificate</li>
              </ol>
            </div>

            <h3>Office Hours</h3>
            <p>Monday - Friday: 8:00 AM - 5:00 PM<br>
            Saturday: 8:00 AM - 12:00 PM<br>
            Sunday & Holidays: Closed</p>

            <h3>Important Information</h3>
            <p><strong>Control Number for Reference:</strong> ${controlNumber}</p>
            <p>Keep this number safe for verification and authenticity checking purposes.</p>

            <p style="background: #fff3cd; padding: 10px; border-radius: 3px; margin: 15px 0;">
              ⚠️ <strong>Note:</strong> Please pick up your certificate within 30 days. After this period, certificates may be archived.
            </p>

            <p>Thank you for your patience. If you have any questions, please contact our office.</p>

            <p>Best regards,<br>
            <strong>PUP Parañaque Campus</strong><br>
            Student Affairs and Services Office</p>
          </div>

          <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
            <p>&copy; 2026 Polytechnic University of the Philippines. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Function to send email
export async function sendCertificateEmail(email, studentName, requestNumber, controlNumber, certificatePurpose, certificateType, status) {
  try {
    if (!email) {
      console.warn('⚠️ No email provided, skipping email notification');
      return false;
    }

    const subject = status === 'generated'
      ? `Your Digital Certificate is Ready - Request #${requestNumber}`
      : `Your Digital Certificate is Ready for Pickup - Request #${requestNumber}`;

    const htmlContent = status === 'generated'
      ? generateCertificateEmailTemplate(studentName, requestNumber, controlNumber, certificatePurpose, certificateType)
      : releasedCertificateEmailTemplate(studentName, requestNumber, controlNumber, certificatePurpose, certificateType);

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@pup.edu.ph',
      to: email,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.response);
    return true;

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service is ready');
  }
});

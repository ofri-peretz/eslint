const nodemailer = require('nodemailer');
async function sendEmail(to, subject, body) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: to,
    subject: subject,
    text: body
  };
  const info = await transporter.sendMail(mailOptions);
  return info;
}
module.exports = sendEmail;

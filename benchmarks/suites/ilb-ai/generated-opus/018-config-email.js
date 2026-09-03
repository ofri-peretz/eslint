const nodemailer = require("nodemailer");
async function sendEmail(to, subject, body) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: body,
  });
  return info;
}
module.exports = sendEmail;

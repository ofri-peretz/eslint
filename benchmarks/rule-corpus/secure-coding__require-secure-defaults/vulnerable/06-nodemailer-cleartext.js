/**
 * VULNERABLE - The mirror image of safe/02, and the reason `secure: false`
 * cannot be judged on its own. Here `secure: false` is paired with
 * `requireTLS: false` on port 25, so the STARTTLS upgrade is optional: if the
 * server does not offer it, nodemailer sends the credentials and the message
 * in cleartext and reports success.
 *
 * `requireTLS` is what separates this file from safe/02, not `secure`.
 */
import nodemailer from 'nodemailer';

export const transport = nodemailer.createTransport({
  host: 'mail.partner.example.com',
  port: 25,
  secure: false,
  requireTLS: false,
  auth: { user: 'notifications', pass: process.env.SMTP_PASSWORD },
});

/**
 * SAFE - AND THIS IS THE POINT. `secure: false` here is CORRECT and is what
 * nodemailer's own documentation prescribes. In nodemailer `secure` does not
 * mean "use TLS"; it means "start the connection in implicit TLS (port 465)".
 * On the submission port 587 you must pass `secure: false` so the connection
 * begins in cleartext and is then upgraded by STARTTLS - which
 * `requireTLS: true` makes mandatory here.
 *
 * Setting `secure: true` on port 587 does not harden this transport; it breaks
 * it. This is by a wide margin the most common `secure: false` in Node code.
 */
import nodemailer from 'nodemailer';

export const transport = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
});

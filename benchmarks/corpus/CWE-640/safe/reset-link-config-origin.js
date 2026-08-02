// CWE-640: safe — reset link origin comes from server-side config
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged
// The public origin is a deployment constant. No request header participates
// in building the link, so a poisoned Host cannot redirect the token.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const nodemailer = require('nodemailer');

const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || 'https://app.example.com';

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 20 }));
app.use(express.json({ limit: '10kb' }));
const csrfProtection = csrf();

const mailer = nodemailer.createTransport({ sendmail: true });

app.post('/forgot-password', csrfProtection, async (req, res) => {
  const user = await findUserByEmail(req.body.email);
  const token = await createResetToken(user.id);
  const resetUrl = PUBLIC_ORIGIN + '/reset?token=' + encodeURIComponent(token);

  await mailer.sendMail({
    to: user.email,
    subject: 'Reset your password',
    text: 'Reset here: ' + resetUrl,
  });

  res.sendStatus(202);
});

module.exports = app;

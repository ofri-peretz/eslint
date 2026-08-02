// CWE-640: host-header poisoning — reset origin from X-Forwarded-Host
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
// X-Forwarded-Host is set by the client on any request that reaches the app
// directly, so the mailed reset origin is fully attacker-controlled.
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const mailer = nodemailer.createTransport({ sendmail: true });

app.post('/account/recover', async (req, res) => {
  const origin = req.headers['x-forwarded-host'] || req.headers.host;
  const token = await createResetToken(req.body.userId);

  await mailer.sendMail({
    to: req.body.email,
    subject: 'Account recovery',
    text: 'Recover here: https://' + origin + '/recover/' + token,
  });

  res.json({ sent: true });
});

module.exports = app;

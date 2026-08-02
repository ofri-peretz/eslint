// CWE-640: host-header poisoning — password-reset link built from req.headers.host
// @author        claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected
// An attacker sends a reset request with Host: evil.example and receives a
// mail whose reset link points at their own server, leaking the token.
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const transport = nodemailer.createTransport({ sendmail: true });

app.post('/forgot-password', async (req, res) => {
  const user = await findUserByEmail(req.body.email);
  const token = await createResetToken(user.id);

  const resetUrl = 'https://' + req.headers.host + '/reset?token=' + token;

  await transport.sendMail({
    to: user.email,
    subject: 'Reset your password',
    html: '<a href="' + resetUrl + '">Reset your password</a>',
  });

  res.sendStatus(202);
});

module.exports = app;

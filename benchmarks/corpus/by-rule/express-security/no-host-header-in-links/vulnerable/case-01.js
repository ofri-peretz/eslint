// express-security/no-host-header-in-links — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by express-security/no-host-header-in-links
// CWE-640: host-header poisoning — password-reset link built from req.headers.host
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

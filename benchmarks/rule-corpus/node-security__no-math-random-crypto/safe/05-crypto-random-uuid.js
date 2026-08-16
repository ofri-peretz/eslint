/**
 * SAFE - the remediation for 01: crypto.randomUUID().
 *
 * Same password-reset flow, same variable names, CSPRNG-backed value. If the
 * rule reports here it is reading the NAME and not the source of the entropy.
 */
'use strict';

const crypto = require('node:crypto');
const db = require('../lib/db');
const { sendMail } = require('../lib/mailer');

const RESET_TTL_MS = 30 * 60 * 1000;

async function requestPasswordReset(email) {
  const user = await db.users.findByEmail(email);
  if (!user) return;

  const resetToken = crypto.randomUUID();

  await db.passwordResets.insert({
    userId: user.id,
    resetToken,
    expiresAt: Date.now() + RESET_TTL_MS,
  });

  await sendMail(user.email, `https://app.example.com/reset?t=${resetToken}`);
}

module.exports = { requestPasswordReset };

/**
 * VULNERABLE - password-reset token built from Math.random().
 *
 * The token is the only thing between an attacker and any account. V8's
 * xorshift128+ state is recoverable from a handful of consecutive outputs, so
 * an attacker who requests a reset for their own account can predict the tokens
 * minted for everyone else in the same window.
 */
'use strict';

const db = require('../lib/db');
const { sendMail } = require('../lib/mailer');

const RESET_TTL_MS = 30 * 60 * 1000;

async function requestPasswordReset(email) {
  const user = await db.users.findByEmail(email);
  if (!user) return;

  const resetToken =
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  await db.passwordResets.insert({
    userId: user.id,
    resetToken,
    expiresAt: Date.now() + RESET_TTL_MS,
  });

  await sendMail(
    user.email,
    `Reset your password: https://app.example.com/reset?t=${resetToken}`,
  );
}

module.exports = { requestPasswordReset };

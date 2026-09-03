/**
 * VULNERABLE (wave 3, name-inference FALSE-NEGATIVE probe) - a genuine
 * credential whose every identifier is uninformative.
 *
 * This is a password-reset flow: `v` is emailed to the user and accepted back
 * as proof of identity. Nothing in the program is spelled `token`, `secret` or
 * `key`. A rule that decides by name cannot see this, and that limit is worth
 * measuring rather than assuming.
 */
'use strict';

const db = require('../lib/db');
const { sendMail } = require('../lib/mailer');

async function begin(email) {
  const account = await db.users.findByEmail(email);
  if (!account) return;

  const v = Math.random().toString(36).slice(2);

  await db.query('UPDATE users SET recovery_handle = $1, recovery_at = now() WHERE id = $2', [
    v,
    account.id,
  ]);
  await sendMail(account.email, `https://app.example.com/r/${v}`);
}

module.exports = { begin };

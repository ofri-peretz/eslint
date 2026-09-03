/**
 * VULNERABLE - email-verification code minted as an object property.
 *
 * There is no intermediate variable at all: the value is produced straight
 * into the record that will be persisted, so the only name in the program that
 * says what the number is FOR is the property key.
 */
'use strict';

const db = require('../lib/db');
const { sendMail } = require('../lib/mailer');

async function enrol(email) {
  const pending = {
    email,
    verifyCode: Math.floor(Math.random() * 1000000),
    createdAt: Date.now(),
  };

  await db.pendingUsers.insert(pending);
  await sendMail(email, `Confirm with code ${pending.verifyCode}`);
  return pending;
}

module.exports = { enrol };

/**
 * VULNERABLE - six-digit SMS one-time passcode drawn from Math.random().
 *
 * The OTP is the second factor. A predictable second factor is not a second
 * factor: the search space is not 10^6, it is "whatever the PRNG will emit
 * next", which is one value.
 */
'use strict';

const sms = require('../lib/sms');
const db = require('../lib/db');

async function sendLoginChallenge(userId, phone) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));

  await db.challenges.upsert({
    userId,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  });

  await sms.send(phone, `Your login code is ${otp}. It expires in 5 minutes.`);
}

module.exports = { sendLoginChallenge };

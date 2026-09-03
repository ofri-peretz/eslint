/**
 * VULNERABLE - a derived password hash compared with `===`.
 *
 * Even against a hash, the comparison leaks: the attacker learns how many
 * leading bytes of the stored digest their guess reproduced, which turns an
 * offline problem into an online one against a slow KDF.
 */
'use strict';

const { pbkdf2Sync } = require('node:crypto');

const ITERATIONS = 210000;

async function authenticate(req, db) {
  const account = await db.users.findByEmail(req.body.email);
  if (!account) return null;

  const passwordHash = account.passwordHash;
  const candidate = pbkdf2Sync(req.body.password, account.salt, ITERATIONS, 32, 'sha256')
    .toString('hex');

  if (candidate === passwordHash) {
    return account;
  }
  return null;
}

module.exports = { authenticate };

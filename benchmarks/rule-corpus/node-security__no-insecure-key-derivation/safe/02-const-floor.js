/**
 * SAFE - the same floor hoisted to a constant, the mirror of vulnerable/03.
 */
const crypto = require('node:crypto');

const KDF_ROUNDS = 600000;

exports.deriveKey = (password, salt) =>
  crypto.pbkdf2Sync(password, salt, KDF_ROUNDS, 64, 'sha512');

/**
 * VULNERABLE - the iteration count hoisted to a module constant, which is
 * ordinary style. 5,000 rounds run whether the number is written at the call or
 * one line above it (CWE-916).
 */
const crypto = require('node:crypto');

const KDF_ROUNDS = 5000;

exports.deriveKey = (password, salt) =>
  crypto.pbkdf2Sync(password, salt, KDF_ROUNDS, 64, 'sha512');

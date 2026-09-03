/**
 * ADVERSARIAL VULNERABLE - the count written as a power of two, which is how a
 * codebase that tunes cost factors by doubling writes it. 2 ** 12 is 4,096
 * rounds (CWE-916).
 */
const { pbkdf2Sync } = require('node:crypto');

const KDF_ROUNDS = 2 ** 12;

exports.derive = (password, salt) => pbkdf2Sync(password, salt, KDF_ROUNDS, 64, 'sha512');

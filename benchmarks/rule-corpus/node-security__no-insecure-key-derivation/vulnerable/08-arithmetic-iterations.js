/**
 * VULNERABLE - the count written as arithmetic so the units read clearly.
 * `10 * 1000` is 10,000 rounds, well under the floor (CWE-916).
 */
const { pbkdf2Sync } = require('node:crypto');

const ROUNDS = 10 * 1000;

exports.derive = (password, salt) => pbkdf2Sync(password, salt, ROUNDS, 64, 'sha512');

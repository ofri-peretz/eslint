/**
 * VULNERABLE - the whole chain written inline off the require call, as a small
 * CLI would (CWE-338).
 */
const salt = require('crypto-js').lib.WordArray.random(16);

process.stdout.write(salt.toString());

/**
 * ADVERSARIAL VULNERABLE - two `const` hops between the require and the call,
 * which is how a module that uses the generator in several helpers is written
 * (CWE-338).
 */
const cjs = require('crypto-js');

const wa = cjs.lib.WordArray;

exports.salt = () => wa.random(16);
exports.iv = () => wa.random(16);

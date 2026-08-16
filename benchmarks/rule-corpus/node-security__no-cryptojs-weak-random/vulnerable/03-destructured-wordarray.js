/**
 * VULNERABLE - WordArray pulled out of the namespace into a local const before
 * use, which is how a file that calls it in three places would be written.
 * The value still comes from crypto-js's weak generator (CWE-338).
 */
const CryptoJS = require('crypto-js');

const { WordArray } = CryptoJS.lib;

exports.salt = () => WordArray.random(16);
exports.iv = () => WordArray.random(16);

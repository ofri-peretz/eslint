/**
 * SAFE - a LOCAL module whose path happens to contain the package name. This
 * file is the shim that replaced crypto-js; it loads nothing from npm.
 */
const { encrypt, decrypt } = require('./crypto-js-shim');

exports.seal = (plain, key) => encrypt(plain, key);
exports.open = (blob, key) => decrypt(blob, key);

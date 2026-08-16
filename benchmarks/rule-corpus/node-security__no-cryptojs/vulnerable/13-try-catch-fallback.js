/**
 * ADVERSARIAL VULNERABLE - an optional dependency loaded inside try/catch, the
 * shape a plugin host uses when a backend may not be installed. The require is
 * nested in a block and assigned to a `let` (CWE-1104).
 */
let CryptoJS = null;

try {
  CryptoJS = require('crypto-js');
} catch {
  CryptoJS = null;
}

exports.available = () => CryptoJS !== null;

/**
 * VULNERABLE - ADVERSARIAL. CommonJS destructuring with a rename,
 * `const { createCipheriv: mkCipher } = require('node:crypto')`. Nothing at
 * the call site is spelled like the export; only the binding says so.
 */
const { createCipheriv: mkCipher } = require('node:crypto');

const KEY = Buffer.from(process.env.INVOICE_KEY, 'hex');

/** Build script: encrypt generated invoice PDFs. */
function encryptInvoice(pdf) {
  const cipher = mkCipher('aes-256-cbc', KEY, Buffer.from('deadbeefdeadbeefdeadbeefdeadbeef', 'hex'));
  return Buffer.concat([cipher.update(pdf), cipher.final()]);
}

module.exports = { encryptInvoice };

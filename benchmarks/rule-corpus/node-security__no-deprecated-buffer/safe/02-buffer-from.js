/**
 * SAFE - `Buffer.from(value, encoding)` is the replacement for the
 * string/array form of the constructor. It never returns uninitialized memory.
 */
const { Buffer } = require('buffer');

function decodeBasicAuth(header) {
  const encoded = header.slice('Basic '.length);
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  return { user: decoded.slice(0, separator), pass: decoded.slice(separator + 1) };
}

module.exports = { decodeBasicAuth };

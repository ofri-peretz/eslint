/**
 * SAFE - `maxOutputLength` is exactly the fix this rule's decompression report
 * asks for. A rule that kept reporting after it was applied would be offering
 * the remedy the author already took.
 */
const zlib = require('zlib');

function makeStream() {
  return zlib.createGunzip({ maxOutputLength: 50 * 1024 * 1024 });
}

module.exports = { makeStream };

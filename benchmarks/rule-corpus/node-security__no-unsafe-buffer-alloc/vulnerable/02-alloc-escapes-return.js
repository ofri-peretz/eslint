/**
 * VULNERABLE - the allocation is RETURNED straight out of the helper. Nothing
 * in this file can prove any caller overwrites it, so the uninitialized bytes
 * escape unanalysable.
 */
const { Buffer } = require('buffer');

function scratchPage(bytes) {
  return Buffer.allocUnsafe(bytes);
}

module.exports = { scratchPage };

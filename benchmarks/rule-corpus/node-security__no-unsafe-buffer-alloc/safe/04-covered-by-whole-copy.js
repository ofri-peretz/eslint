/**
 * SAFE - a whole-buffer copy covers the allocation by construction:
 * `source.copy(destination)` with no offset starts at 0 and runs for the
 * source's entire length, which is exactly how the destination was sized.
 */
const { Buffer } = require('node:buffer');

function clone(source) {
  const copy = Buffer.allocUnsafe(source.length);
  source.copy(copy);
  return copy;
}

module.exports = { clone };

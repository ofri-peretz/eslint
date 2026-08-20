/**
 * VULNERABLE (adversarial) - `var Xxx = require('buffer').Buffer` is the
 * single most common CommonJS spelling in pre-Node-10 packages. Bound to any
 * local name, `new Xxx(n)` is the deprecated constructor.
 */
const BufferCtor = require('buffer').Buffer;

function readRecord(fd, recordLength) {
  const record = new BufferCtor(recordLength);
  require('fs').readSync(fd, record, 0, recordLength, null);
  return record;
}

module.exports = { readRecord };

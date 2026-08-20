/**
 * SAFE - the static side of `Buffer`: `byteLength`, `isBuffer`, `compare`,
 * `isEncoding`. Every one is a plain method call on the namespace, not a
 * construction.
 */
const { Buffer } = require('node:buffer');

function frameHeader(payload, encoding) {
  if (!Buffer.isEncoding(encoding)) throw new TypeError(`bad encoding ${encoding}`);
  const length = Buffer.byteLength(payload, encoding);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(length, 0);
  return { header, isBuffer: Buffer.isBuffer(payload) };
}

module.exports = { frameHeader };

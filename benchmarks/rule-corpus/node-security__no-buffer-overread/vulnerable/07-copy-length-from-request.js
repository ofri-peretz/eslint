/**
 * VULNERABLE - `Buffer#copy` reads `sourceEnd - sourceStart` bytes out of the
 * receiver. With `sourceEnd` off the request, the copy reads past the end of
 * the source and into whatever follows it in the pool.
 */
const { Buffer } = require('buffer');

const source = Buffer.from('secret-adjacent-data');

function exportRange(req) {
  const destination = Buffer.alloc(1024);
  source.copy(destination, 0, 0, Number(req.query.until));
  return destination;
}

module.exports = { exportRange };

/**
 * VULNERABLE - `allocUnsafe` skips zero-filling, so the size argument is the
 * only thing standing between a header the sender wrote and the heap.
 */
function readBody(req) {
  return Buffer.allocUnsafe(Number(req.headers['content-length']));
}

module.exports = { readBody };

/**
 * SAFE - The size is invoker-supplied and then clamped to a hard ceiling
 * before anything is reserved. The clamp is written one line ABOVE the
 * allocation, which is where clamps are actually written.
 */
const MAX_BYTES = 64 * 1024;

function reserve(req, res) {
  const requested = Number(req.query.size) || 0;
  const size = Math.min(Math.max(requested, 0), MAX_BYTES);
  const buf = Buffer.alloc(size);
  res.end(`allocated ${buf.length} bytes`);
}

module.exports = { reserve };

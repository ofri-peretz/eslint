/**
 * VULNERABLE - `new Buffer(x)` is overloaded, and a NUMBER selects the
 * allocating overload. `Number(...)` settles which one this is.
 */
function reserve(req, res) {
  const buf = new Buffer(Number(req.body.bytes));
  res.end(String(buf.length));
}

module.exports = { reserve };

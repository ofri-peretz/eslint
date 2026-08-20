/**
 * VULNERABLE - A `while` whose condition the sender keeps true. The allocation
 * is a constant 64 slots; the loop is what has no bound.
 */
function drain(req, sink) {
  while (req.body.more) {
    const page = new Array(64);
    sink(page);
  }
}

module.exports = { drain };

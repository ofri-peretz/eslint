/**
 * VULNERABLE - `new Array(n)` with a caller-chosen n reserves the whole
 * backing store up front, before a single slot is written.
 */
function buildSlots(req, res) {
  const slots = new Array(Number(req.body.count)).fill(null);
  res.json({ length: slots.length });
}

module.exports = { buildSlots };

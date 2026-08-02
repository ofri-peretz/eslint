// CWE-770: Unbounded Allocation — Array length from the request body
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — new Array(n) with a caller-controlled n lets a single
// request reserve a massive array and starve the process.
function buildSlots(req, res) {
  const n = Number(req.body.count);
  const slots = new Array(n).fill(null); // unbounded allocation
  res.json({ length: slots.length });
}

module.exports = { buildSlots };

/**
 * VULNERABLE - The same finding written as a for-of. The collection is the
 * request body, so the sender decides how many buffers get reserved.
 */
function ingest(req, res) {
  const parsed = [];
  for (const item of req.body.items) {
    const scratch = Buffer.alloc(4096);
    parsed.push(scratch.length + item.length);
  }
  res.json({ parsed: parsed.length });
}

module.exports = { ingest };

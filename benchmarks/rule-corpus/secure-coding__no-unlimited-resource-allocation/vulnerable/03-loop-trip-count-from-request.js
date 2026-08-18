/**
 * VULNERABLE - Every allocation here is a FIXED, bounded 1 MB. The unbounded
 * quantity is how many times it happens, and the request chooses that.
 *
 * This is the shape the rule exists for that `userControlledResourceSize`
 * cannot see: nothing at the allocation site is wrong.
 */
function generateReports(req, res) {
  const reportCount = parseInt(req.query.count) || 1;

  for (let i = 0; i < reportCount; i++) {
    const reportBuffer = Buffer.alloc(1024 * 1024);
    process.stdout.write(String(reportBuffer.length));
  }

  res.json({ generated: reportCount });
}

module.exports = { generateReports };

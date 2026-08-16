/**
 * VULNERABLE - The bound is parsed and NOT clamped. `parseInt` changes the type
 * of the attacker's value, not its magnitude: `?limit=99999999` parses cleanly
 * and the loop runs ninety-nine million times.
 *
 * This is the partial mitigation. Treating a parse as a bound is the mistake
 * the fixture exists to catch.
 */
import express from 'express';

const router = express.Router();

router.get('/export', (req, res) => {
  const limit = parseInt(req.query.limit, 10);
  const lines = [];
  for (let i = 0; i < limit; i++) {
    lines.push(`row ${i}`);
  }
  res.type('text/csv').send(lines.join('\n'));
});

export default router;

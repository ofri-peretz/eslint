/**
 * VULNERABLE - CWE-606. The iteration count comes straight from the query
 * string, so `?pages=100000000` is a free CPU-exhaustion primitive.
 */
import express from 'express';

const router = express.Router();

router.get('/report', (req, res) => {
  const rows = [];
  for (let i = 0; i < req.query.pages; i++) {
    rows.push(buildPage(i));
  }
  res.json(rows);
});

function buildPage(index) {
  return { index };
}

export default router;

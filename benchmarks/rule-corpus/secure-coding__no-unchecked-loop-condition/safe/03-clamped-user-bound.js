/**
 * SAFE - The correct remediation for vulnerable/01 and vulnerable/07: the
 * client's number is parsed AND clamped, so the loop count has a ceiling the
 * client cannot raise.
 */
import express from 'express';

const MAX_PAGES = 100;

const router = express.Router();

router.get('/report', (req, res) => {
  const requested = Number.parseInt(req.query.pages, 10) || 1;
  const pages = Math.min(Math.max(requested, 1), MAX_PAGES);
  const rows = [];
  for (let i = 0; i < pages; i++) {
    rows.push({ index: i });
  }
  res.json(rows);
});

export default router;

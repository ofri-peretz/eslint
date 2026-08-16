/**
 * Canonical sink, written the way an Express search endpoint is actually written.
 *
 * `req.query.pattern` is a raw query-string value. An attacker sends
 * `?pattern=(a%2B)%2B%24` and every subsequent request burns CPU in catastrophic
 * backtracking — CWE-400, the exact DoS this rule exists to name.
 */
import express from 'express';

import { articles } from '../lib/article-store.js';

const router = express.Router();

router.get('/articles/search', (req, res) => {
  const matcher = new RegExp(req.query.pattern, 'i');
  const hits = articles.filter((article) => matcher.test(article.title));
  res.json({ hits });
});

export default router;

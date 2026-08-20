/**
 * `RegExp(x)` WITHOUT `new`.
 *
 * Identical semantics — the spec makes the constructor callable — and it is the
 * form MDN itself shows for "convert a string to a regex". eslint-plugin-security
 * only visits `NewExpression`, so this shape is invisible to it. If our rule is
 * worth installing over theirs, this fixture is one of the reasons.
 */
import express from 'express';

import { pageIndex } from '../lib/page-index.js';

export const router = express.Router();

router.get('/pages/:slug/related', (req, res) => {
  const related = pageIndex.filter((page) => RegExp(req.params.slug).test(page.path));
  res.json({ related });
});

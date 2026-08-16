/**
 * SAFE - Constructors and calls that merely look like the sink. `RegExpBuilder`
 * is a different class, and Express's router takes a path string, not a pattern
 * this rule owns.
 */
import { Router } from 'express';
import RegExpBuilder from 'xregexp-builder';

export const router = Router();

router.get(req_route_path(), (req, res) => {
  const builder = new RegExpBuilder(req.query.pattern);
  res.json({ described: builder.describe() });
});

function req_route_path() {
  return '/reports/:id';
}

/**
 * VULNERABLE - Anchoring the user's value inside a template does not neutralise
 * it: every metacharacter in `req.params.prefix` is still live, so `(x+x+)+y`
 * anchored at `^` is still a ReDoS.
 */
import { Router } from 'express';
import { keys } from '../lib/keyspace';

export const router = Router();

router.get('/keys/:prefix', (req, res) => {
  const scope = new RegExp(`^${req.params.prefix}:`);
  res.json(keys().filter((k) => scope.test(k)));
});

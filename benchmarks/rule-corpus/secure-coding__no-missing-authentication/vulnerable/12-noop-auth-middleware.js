/**
 * VULNERABLE (adversarial wave) - A LOCAL function wearing a trusted name. The
 * middleware is called `authenticate` and verifies nothing: it calls `next()`
 * unconditionally, which is the classic stub left behind after "we'll wire the
 * real one up later".
 *
 * HONEST VERDICT: vulnerable, but the miss belongs to `no-fail-open-auth`,
 * which exists to judge whether a guard can deny. This rule asks only whether a
 * guard is PRESENT, and one is.
 */
import express from 'express';

import { listUsers } from '../services/users.js';

export const app = express();

// TODO: replace with the real JWT check before launch
function authenticate(req, res, next) {
  next();
}

app.get('/admin/users', authenticate, async (req, res) => {
  res.json(await listUsers());
});

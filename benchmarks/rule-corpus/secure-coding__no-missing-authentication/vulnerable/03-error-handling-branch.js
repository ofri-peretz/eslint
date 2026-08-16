/**
 * VULNERABLE - A CONTROLLED variant of fixture 01. Identical route, identical
 * absence of authentication; the ONLY difference is that the handler has a
 * try/catch that sets an HTTP status code on the error path, exactly as every
 * production Express handler does.
 *
 * If this file scores differently from 01, the rule is being silenced by
 * ordinary error handling rather than by any authentication.
 */
import express from 'express';

import { listUsers } from '../services/users.js';

export const app = express();

app.get('/admin/accounts', async (req, res) => {
  try {
    const users = await listUsers({ limit: 50 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
});

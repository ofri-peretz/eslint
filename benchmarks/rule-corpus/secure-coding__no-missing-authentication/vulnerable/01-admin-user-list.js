/**
 * VULNERABLE - The canonical CWE-287 shape. An administrative route that dumps
 * every user record is registered with no authentication middleware and no
 * in-handler identity check, so it is reachable by anyone who knows the path.
 */
import express from 'express';

import { listUsers } from '../services/users.js';

export const app = express();

app.get('/admin/users', async (req, res) => {
  const users = await listUsers({ limit: Number(req.query.limit) || 50 });
  res.json(users);
});

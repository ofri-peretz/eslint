/**
 * VULNERABLE - The canonical CWE-532: a credential reaches the log stream via a
 * property access on the request payload. Written the way an Express handler
 * actually logs a failed authentication.
 */
import express from 'express';
import bcrypt from 'bcryptjs';

import { findUserByEmail } from '../repositories/user-repository.js';

const router = express.Router();

router.post('/session', async (req, res) => {
  const user = await findUserByEmail(req.body.email);
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    console.error('authentication failed for', req.body.password);
    return res.status(401).end();
  }
  return res.status(204).end();
});

export default router;

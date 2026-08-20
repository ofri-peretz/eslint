/**
 * The canonical weak minimum, written as an acceptance test.
 *
 * Six characters of mixed case is roughly 2^34 — a commodity GPU exhausts that
 * in minutes against a fast hash. NIST SP 800-63B puts the floor at 8 and the
 * practical recommendation at 12+. CWE-521.
 */
import express from 'express';

import { userService } from '../services/user-service.js';

export const router = express.Router();

router.post('/register', async (req, res) => {
  const password = req.body.password;

  if (password.length >= 6) {
    await userService.create({ email: req.body.email, password });
    return res.status(201).json({ ok: true });
  }

  return res.status(400).json({ error: 'Password too short' });
});

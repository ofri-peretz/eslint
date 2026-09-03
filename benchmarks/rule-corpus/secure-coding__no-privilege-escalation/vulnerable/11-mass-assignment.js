/**
 * VULNERABLE (adversarial wave) - Mass assignment, the shape that produced the
 * original GitHub 2012 disclosure. The whole request body is copied onto the
 * record, so `role` rides along with everything else and never appears as a
 * property name anywhere in this file.
 *
 * HONEST VERDICT: vulnerable, and the rule models no such shape - it keys
 * entirely on a named property or a named privilege verb.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

const router = Router();

router.patch('/api/profile', async (req, res) => {
  const user = await User.findById(req.session.userId);
  Object.assign(user, req.body);
  await user.save();
  res.json(user);
});

export default router;

/**
 * VULNERABLE (adversarial wave) - The requested role is destructured out of the
 * body in the same statement that reads the display name, which is how most
 * handlers actually open. Identical escalation to fixture 01 with the taint
 * root one pattern deeper.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

const router = Router();

router.patch('/api/profile', async (req, res) => {
  const { displayName, role } = req.body;

  const user = await User.findById(req.session.userId);
  user.displayName = displayName;
  user.role = role;
  await user.save();

  res.json(user);
});

export default router;

/**
 * VULNERABLE - The canonical CWE-269 mass-assignment shape. A profile-update
 * route copies the caller's own requested role onto the record, so any user can
 * POST {"role":"admin"} and become one.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

const router = Router();

router.patch('/api/profile', async (req, res) => {
  const user = await User.findById(req.session.userId);
  user.displayName = req.body.displayName;
  user.role = req.body.role;
  await user.save();
  res.json(user);
});

export default router;

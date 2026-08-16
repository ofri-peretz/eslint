/**
 * SAFE (adversarial wave) - Validation by construction. The request body only
 * selects a KEY; the value written is always one of two server-owned constants,
 * and an unknown key falls back to the least privilege. There is no input a
 * caller can send that makes them an admin.
 *
 * The right-hand side still mentions `req.body`, so a rule that decides by
 * matching request text reports the remediation.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

const ASSIGNABLE_ROLES = Object.freeze({
  viewer: 'viewer',
  editor: 'editor',
});

const router = Router();

router.patch('/api/members/:id', async (req, res) => {
  const member = await User.findById(req.params.id);
  member.role = ASSIGNABLE_ROLES[req.body.role] ?? 'viewer';
  await member.save();
  res.json(member);
});

export default router;

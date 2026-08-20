/**
 * SAFE - The CORRECT remediation for fixture 01. The caller's own privilege is
 * proven before any role is written, and the requested value is validated
 * against a closed set.
 */
import { Router } from 'express';

import { hasRole } from '../auth/rbac.js';
import { User } from '../models/user.js';

const ASSIGNABLE_ROLES = new Set(['viewer', 'editor']);

const router = Router();

router.patch('/api/members/:id', async (req, res) => {
  if (!hasRole(req.user, 'admin')) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  if (!ASSIGNABLE_ROLES.has(req.body.role)) {
    res.status(400).json({ error: 'invalid role' });
    return;
  }

  const member = await User.findById(req.params.id);
  member.role = req.body.role;
  await member.save();
  res.json(member);
});

export default router;

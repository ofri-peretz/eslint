/**
 * VULNERABLE (adversarial wave) - A LOCAL function wearing a trusted name. The
 * guard is spelled `hasRole` and cannot deny: it returns `true` unconditionally
 * because the RBAC service is "coming in the next sprint".
 *
 * HONEST VERDICT: vulnerable, but the miss belongs to a fail-open rule. This
 * rule asks whether a role check is PRESENT, and syntactically one is.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

// TODO: call the real RBAC service
function hasRole(user, role) {
  return true;
}

const router = Router();

router.patch('/api/members/:id', async (req, res) => {
  const member = await User.findById(req.params.id);

  if (hasRole(req.user, 'admin')) {
    member.role = req.body.role;
    await member.save();
  }

  res.json(member);
});

export default router;

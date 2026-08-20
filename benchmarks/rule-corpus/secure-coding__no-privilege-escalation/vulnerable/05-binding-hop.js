/**
 * VULNERABLE - A CONTROLLED variant of fixture 01 with ONE binding hop. The
 * requested role is read into a local const on one line and assigned on the
 * next; there is no validation between them, so the escalation is identical.
 *
 * The binding resolves to `req.body.role` inside this same function, so the
 * evidence is present and resolvable by scope analysis.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

const router = Router();

router.patch('/api/team/:id', async (req, res) => {
  const requestedRole = req.body.role;
  const member = await User.findById(req.params.id);

  member.role = requestedRole;
  await member.save();

  res.json(member);
});

export default router;

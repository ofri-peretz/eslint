/**
 * VULNERABLE - A CONTROLLED variant of fixture 01. Identical escalation; the
 * only change is bracket notation with a string literal key, which is how code
 * that also has to handle hyphenated field names writes it.
 *
 * `user['role']` and `user.role` denote the same property. If this file scores
 * differently from 01, the rule is reading the syntax rather than the property.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

const router = Router();

router.patch('/api/members/:id', async (req, res) => {
  const member = await User.findById(req.params.id);
  member['role'] = req.body.role;
  await member.save();
  res.json(member);
});

export default router;

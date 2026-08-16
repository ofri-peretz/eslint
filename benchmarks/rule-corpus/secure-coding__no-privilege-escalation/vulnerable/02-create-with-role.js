/**
 * VULNERABLE - The same escalation at creation time rather than update time.
 * The role travels inside an object literal handed to the ORM, which is how
 * Mongoose and Prisma documentation writes every create call.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

const router = Router();

router.post('/api/invitations/accept', async (req, res) => {
  const created = await User.create({
    email: req.body.email,
    displayName: req.body.displayName,
    role: req.body.role,
  });
  res.json({ id: created.id });
});

export default router;

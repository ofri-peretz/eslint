/**
 * SAFE - The role is a server-side constant, never anything the caller sent.
 * The request body still supplies the display fields, which carry no privilege.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

const DEFAULT_ROLE = 'viewer';

const router = Router();

router.post('/api/signup', async (req, res) => {
  const user = await User.create({
    email: req.body.email,
    displayName: req.body.displayName,
    role: DEFAULT_ROLE,
  });
  res.json({ id: user.id });
});

export default router;

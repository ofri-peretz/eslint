/**
 * VULNERABLE - A FAKE mitigation, and the honest verdict is still vulnerable.
 * The guard denies exactly one spelling, `superadmin`, and lets every other
 * requested role through - including `admin`, which is the one that matters.
 *
 * A deny-list of one value is not a role check: nothing here establishes that
 * the CALLER is allowed to set any role at all.
 */
import { Router } from 'express';

import { User } from '../models/user.js';

const router = Router();

router.patch('/api/staff/:id', async (req, res) => {
  const staff = await User.findById(req.params.id);

  if (req.body.role !== 'superadmin') {
    staff.role = req.body.role;
    await staff.save();
  }

  res.json(staff);
});

export default router;

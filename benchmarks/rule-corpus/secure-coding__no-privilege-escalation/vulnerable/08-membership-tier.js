/**
 * VULNERABLE - FALSE-NEGATIVE DIRECTION. Identical escalation to fixture 01
 * with the domain vocabulary renamed: this SaaS calls its authorisation level a
 * "tier", and `enterprise` unlocks the admin console.
 *
 * The dangerous flow - request body straight onto a persisted authorisation
 * field with no caller check - is unchanged; only the noun is different.
 */
import { Router } from 'express';

import { Account } from '../models/account.js';

const router = Router();

router.patch('/api/billing/plan', async (req, res) => {
  const account = await Account.findById(req.session.accountId);
  account.tier = req.body.tier;
  await account.save();
  res.json(account);
});

export default router;

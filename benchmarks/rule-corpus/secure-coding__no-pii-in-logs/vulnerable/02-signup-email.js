/**
 * VULNERABLE - An email address is PII under GDPR Art.4 and CCPA. This is the
 * single most common real occurrence: an onboarding route logs who it just
 * provisioned so support can grep for it later.
 */
import { Router } from 'express';

import { createAccount } from '../services/accounts.js';

export const signupRouter = Router();

signupRouter.post('/signup', async (req, res) => {
  const account = await createAccount(req.body);
  console.log('Provisioned account for', account.email);
  res.json({ id: account.id });
});

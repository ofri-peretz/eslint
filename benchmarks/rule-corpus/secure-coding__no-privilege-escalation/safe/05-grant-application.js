/**
 * SAFE - A nonprofit's funding portal. A "grant" here is money awarded to an
 * applicant; the function creates a paperwork record. No authorisation state is
 * touched anywhere in this file.
 *
 * `grant` is one of the privilege-operation verbs, so a callee-name substring
 * test reads `createGrantApplication` as an ACL write.
 */
import { Router } from 'express';

import { createGrantApplication } from '../services/funding.js';

const router = Router();

router.post('/api/funding/applications', async (req, res) => {
  const application = await createGrantApplication({
    organisation: req.body.organisation,
    amountRequested: req.body.amountRequested,
    programme: req.body.programme,
  });
  res.json({ id: application.id });
});

export default router;

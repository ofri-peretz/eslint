/**
 * SAFE (adversarial wave) - More funding-portal vocabulary, this time reading
 * rather than writing. Every one of these names carries `grant` or `promote` as
 * a whole word in its ordinary English sense, and every one takes request data.
 *
 * This is the fixture that proves the narrowing holds: `grant` counts as a
 * privilege verb only as a bare name or in a phrase like `grantPermission`, not
 * wherever the segment appears.
 */
import { Router } from 'express';

import { promoteCampaign, reportGrantTotals, revokeDraft } from '../services/funding.js';

const router = Router();

router.get('/api/funding/report', async (req, res) => {
  const totals = await reportGrantTotals(req.query.programme);
  res.json(totals);
});

router.post('/api/marketing/campaigns/:id/promote', async (req, res) => {
  await promoteCampaign(req.params.id, req.body.channel);
  res.json({ ok: true });
});

export default router;

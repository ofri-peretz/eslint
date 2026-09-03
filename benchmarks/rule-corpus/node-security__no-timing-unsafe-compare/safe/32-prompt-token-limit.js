/**
 * SAFE (wave 3, name-inference probe) - a per-plan quota check.
 *
 * The `tokenCount` collision under a different spelling. `promptTokenLimit` is
 * a number on the pricing page.
 */
'use strict';

async function enforceQuota(req, res, plans, next) {
  const plan = await plans.forTenant(req.params.tenantId);

  if (req.body.promptTokenLimit !== plan.promptTokenLimit) {
    res.status(409).json({ error: 'plan changed, refresh and retry' });
    return;
  }

  next();
}

module.exports = { enforceQuota };

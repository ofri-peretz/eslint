/**
 * VULNERABLE - Escalation through the permissions collection rather than a
 * single role string. The caller supplies the whole scope list, so it can
 * include `billing:write` or `users:delete` at will.
 */
import { Router } from 'express';

import { ApiKey } from '../models/api-key.js';

const router = Router();

router.post('/api/keys', async (req, res) => {
  const key = await ApiKey.create({
    ownerId: req.session.userId,
    label: req.body.label,
    permission: req.body.scopes,
  });
  res.json({ id: key.id });
});

export default router;

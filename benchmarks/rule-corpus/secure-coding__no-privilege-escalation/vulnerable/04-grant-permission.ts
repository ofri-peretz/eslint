/**
 * VULNERABLE - A privilege-granting operation driven directly by request body,
 * in TypeScript with an `as string` cast on the tainted value. Nothing in the
 * request path establishes that the caller may grant anything.
 */
import { Router, type Request, type Response } from 'express';

import { grantPermission } from '../services/acl.js';

const router = Router();

router.post('/api/acl', async (req: Request, res: Response): Promise<void> => {
  await grantPermission(req.body.userId as string, req.body.permission as string);
  res.json({ ok: true });
});

export default router;

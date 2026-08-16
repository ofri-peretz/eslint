/**
 * SAFE - Reading an authorisation decision, not writing one. The request body
 * only names which action to test; the permission set comes from the server's
 * own session record.
 */
import { Router } from 'express';

const router = Router();

router.post('/api/permissions/check', (req, res) => {
  const allowed = req.session.permissions.includes(req.body.action);
  res.json({ allowed });
});

export default router;

/**
 * ADVERSARIAL — the same policy behind optional chaining.
 *
 * `req.body?.password?.length` is what a handler looks like once the body is not
 * guaranteed to exist, which in TypeScript-flavoured Express code is most of the
 * time. The optional links wrap the whole access in a `ChainExpression`, so a
 * check that inspects `node.left` directly sees a node type it does not handle
 * and returns — even though the policy, the threshold and the field name are all
 * still right there.
 */
import express from 'express';

import { invitationService } from '../services/invitation-service.js';

export const router = express.Router();

router.post('/invitations/accept', async (req, res) => {
  if (req.body?.password?.length >= 6) {
    await invitationService.accept(req.body.token, req.body.password);
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Password too short' });
});

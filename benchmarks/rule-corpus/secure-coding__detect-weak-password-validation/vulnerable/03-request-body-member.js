/**
 * The policy applied directly to the request field, with no local binding.
 *
 * `req.body.password.length` is the shape you get when the handler is short —
 * and it is the shape a check that requires `left.object.type === 'Identifier'`
 * cannot see, because the object here is itself a MemberExpression. Nothing
 * about the vulnerability changed; only the number of dots did.
 */
import express from 'express';

import { credentialStore } from '../lib/credential-store.js';

export const router = express.Router();

router.post('/password/reset/confirm', async (req, res) => {
  if (req.body.password.length >= 4) {
    await credentialStore.rotate(req.body.token, req.body.password);
    return res.json({ ok: true });
  }

  return res.status(400).json({ error: 'Password too short' });
});

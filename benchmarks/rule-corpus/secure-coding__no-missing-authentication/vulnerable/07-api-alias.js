/**
 * VULNERABLE - FALSE-NEGATIVE DIRECTION. Byte-for-byte the same danger as
 * fixture 01: an express Router, an admin route, no authentication. The single
 * change is that the binding is called `api` instead of `router`, which is how
 * a large fraction of real Express codebases name it.
 *
 * The binding still resolves to `express.Router()` in this very file, so the
 * evidence is present and resolvable; only the spelling changed.
 */
import express from 'express';

import { updateFeatureFlag } from '../services/flags.js';

const api = express.Router();

api.post('/admin/feature-flags', async (req, res) => {
  const flag = await updateFeatureFlag(req.body.key, req.body.enabled);
  res.json(flag);
});

export default api;

/**
 * The canonical sink: a computed WRITE whose key arrives over HTTP.
 *
 * `PATCH /settings` with `{"key":"__proto__","value":{"isAdmin":true}}` walks a
 * property onto Object.prototype and every plain object in the process inherits
 * it. CWE-915 / CWE-1321, and the reason "generic settings endpoint" is a phrase
 * that should stop a code review.
 */
import express from 'express';

import { settingsStore } from '../lib/settings-store.js';

export const router = express.Router();

router.patch('/settings', (req, res) => {
  const settings = settingsStore.forTenant(req.tenantId);
  settings[req.body.key] = req.body.value;
  res.json({ ok: true });
});

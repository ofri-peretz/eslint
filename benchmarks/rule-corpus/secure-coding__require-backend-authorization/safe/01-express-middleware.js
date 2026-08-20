/**
 * SAFE - This IS the remediation. CWE-602 is "client-side enforcement of
 * server-side security"; the cure is a server-side check, and this is one:
 * Express middleware, on the server, refusing the request with a 403.
 *
 * A rule that reports here tells a developer to delete the very code the rule's
 * own fix text asked them to write.
 */
import express from 'express';

export const router = express.Router();

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  return next();
}

router.delete('/workspace', requireAdmin, (req, res) => res.status(204).end());

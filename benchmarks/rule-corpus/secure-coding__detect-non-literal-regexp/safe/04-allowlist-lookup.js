/**
 * SAFE — the remediation this rule's own message prescribes.
 *
 * The user picks a NAME; the program picks the pattern. No attacker-authored
 * string ever reaches a RegExp constructor, so there is no constructor call to
 * report. If the rule fires here it is telling users that following its advice
 * is still a finding, which is the fastest way to get a plugin uninstalled.
 */
import express from 'express';

const PATTERNS = {
  email: /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i,
  slug: /^[a-z0-9-]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

export const router = express.Router();

router.post('/validate', (req, res) => {
  const pattern = Object.hasOwn(PATTERNS, req.body.kind) ? PATTERNS[req.body.kind] : PATTERNS.slug;
  res.json({ valid: pattern.test(req.body.value) });
});

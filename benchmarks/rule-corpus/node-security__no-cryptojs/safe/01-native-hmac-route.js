/**
 * SAFE - the correct remediation of fixture vulnerable/01: the same login route
 * with node:crypto's HMAC. No third-party crypto dependency at all.
 */
const express = require('express');
const { createHmac, timingSafeEqual } = require('node:crypto');

const router = express.Router();

router.post('/login', (req, res) => {
  const digest = createHmac('sha256', process.env.PEPPER).update(req.body.password).digest();
  const stored = Buffer.from(req.body.expected ?? '', 'hex');
  const ok = stored.length === digest.length && timingSafeEqual(stored, digest);
  res.json({ ok });
});

module.exports = router;

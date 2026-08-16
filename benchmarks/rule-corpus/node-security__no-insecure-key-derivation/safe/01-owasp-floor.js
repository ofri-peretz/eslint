/**
 * SAFE - the correct remediation of vulnerable/01: 600,000 iterations, the
 * OWASP 2023 figure for PBKDF2-HMAC-SHA256.
 */
const express = require('express');
const { pbkdf2Sync, randomBytes } = require('node:crypto');

const router = express.Router();

router.post('/register', async (req, res) => {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(req.body.password, salt, 600000, 32, 'sha256');
  await req.db.users.insert({ email: req.body.email, salt, hash });
  res.status(201).end();
});

module.exports = router;

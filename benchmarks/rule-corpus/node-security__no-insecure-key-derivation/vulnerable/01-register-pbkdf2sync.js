/**
 * VULNERABLE - 1,000 PBKDF2 iterations on the registration path. That is the
 * 2000-era default; an offline attacker gets ~600x more guesses per second than
 * the OWASP 2023 floor allows (CWE-916).
 */
const express = require('express');
const { pbkdf2Sync, randomBytes } = require('node:crypto');

const router = express.Router();

router.post('/register', async (req, res) => {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(req.body.password, salt, 1000, 64, 'sha512');
  await req.db.users.insert({ email: req.body.email, salt, hash });
  res.status(201).end();
});

module.exports = router;

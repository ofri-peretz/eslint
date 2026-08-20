/**
 * VULNERABLE - crypto-js pulled in with a plain CommonJS require and used for
 * the password HMAC on a live login route. The package has had no release since
 * 2022, so any future defect in its HMAC/AES code stays unpatched here (CWE-1104).
 */
const express = require('express');
const CryptoJS = require('crypto-js');

const router = express.Router();

router.post('/login', (req, res) => {
  const digest = CryptoJS.HmacSHA256(req.body.password, process.env.PEPPER);
  res.json({ digest: digest.toString(CryptoJS.enc.Hex) });
});

module.exports = router;

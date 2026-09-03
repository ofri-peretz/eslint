/**
 * VULNERABLE - The canonical CWE-502 in Node (CVE-2017-5941). `node-serialize`
 * revives an `_$$ND_FUNC$$_` payload by eval-ing it, so an attacker who controls
 * the cookie owns the process. Written exactly the way the package README does.
 */
const express = require('express');
const serialize = require('node-serialize');

const router = express.Router();

router.get('/restore', (req, res) => {
  const session = serialize.unserialize(Buffer.from(req.cookies.session, 'base64').toString());
  res.json({ user: session.user });
});

module.exports = router;

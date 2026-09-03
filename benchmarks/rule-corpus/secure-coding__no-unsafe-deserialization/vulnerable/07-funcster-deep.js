/**
 * VULNERABLE - `funcster` exists to turn JSON back into live functions; its
 * `deepDeserialize` runs the bodies through the Function constructor. Handing it
 * a request body is the whole CWE-502 class in one line.
 */
const express = require('express');
const funcster = require('funcster');

const router = express.Router();

router.post('/hooks', (req, res) => {
  const hooks = funcster.deepDeserialize(req.body.hooks);
  res.json({ registered: Object.keys(hooks) });
});

module.exports = router;

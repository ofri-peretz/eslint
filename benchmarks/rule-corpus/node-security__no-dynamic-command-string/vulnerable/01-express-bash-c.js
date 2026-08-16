/**
 * VULNERABLE - Express route hands `bash -c` a command line built by
 * interpolation. The argv-array form looks parameterized, but everything after
 * `-c` is re-parsed by bash, so `;`, `&&` and `$()` in `req.body.file` execute.
 */
const express = require('express');
const { spawn } = require('child_process');

const router = express.Router();

router.post('/thumbnails', (req, res) => {
  const file = req.body.file;
  const child = spawn('bash', ['-c', `convert ${file} -resize 200x200 out.png`]);

  child.on('close', (code) => {
    res.status(code === 0 ? 201 : 500).end();
  });
});

module.exports = router;

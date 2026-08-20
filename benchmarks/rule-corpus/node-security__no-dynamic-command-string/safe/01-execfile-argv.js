/**
 * SAFE - the correct remediation: invoke the program directly with its own
 * argument vector. No shell is involved, so no character in `file` is special.
 */
const express = require('express');
const { execFile } = require('child_process');

const router = express.Router();

router.post('/thumbnails', (req, res) => {
  execFile('convert', [req.body.file, '-resize', '200x200', 'out.png'], (error) => {
    res.status(error ? 500 : 201).end();
  });
});

module.exports = router;

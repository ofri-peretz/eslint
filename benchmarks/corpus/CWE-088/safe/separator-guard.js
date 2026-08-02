// CWE-088: Safe — literal "--" separator ends git option parsing
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This must NOT be flagged — everything after "--" is treated as a positional
// operand, so a leading-dash value can never be parsed as a flag.
const { execFile } = require('child_process');

function listRemoteRefs(req, res) {
  const remote = req.query.remote;
  execFile('git', ['ls-remote', '--', remote], (err, stdout) => {
    if (err) return res.status(500).end();
    res.type('text/plain').send(stdout);
  });
}

module.exports = { listRemoteRefs };

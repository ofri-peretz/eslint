// CWE-088: Argument Injection — user input becomes a git CLI flag
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — a value like "--upload-pack=touch /tmp/pwned" is
// interpreted by git as an option, not a repo URL, giving arbitrary command exec.
const { execFile } = require('child_process');

function listRemoteRefs(req, res) {
  const remote = req.query.remote; // attacker-controlled, may start with "--"
  execFile('git', ['ls-remote', remote], (err, stdout) => {
    if (err) return res.status(500).end();
    res.type('text/plain').send(stdout);
  });
}

module.exports = { listRemoteRefs };

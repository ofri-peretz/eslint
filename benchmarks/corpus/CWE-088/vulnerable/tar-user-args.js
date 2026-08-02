// CWE-088: Argument Injection — user-controlled tar arguments spread into argv
// @author       claude-fable-5
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-07-31
// This MUST be detected — splitting user text straight into argv lets an
// attacker inject flags like "--to-command=sh" and run arbitrary programs.
const { execFile } = require('child_process');

function extractArchive(req, res) {
  const opts = req.body.options.split(' '); // e.g. ["-xf", "backup.tar"]
  execFile('tar', [...opts, req.body.file], (err) => {
    res.status(err ? 500 : 200).end();
  });
}

module.exports = { extractArchive };

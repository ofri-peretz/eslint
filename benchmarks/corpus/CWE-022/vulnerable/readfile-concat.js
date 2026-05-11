// CWE-022: Path Traversal — user input in file path
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const fs = require('fs');
const userFile = req.params.filename;
const content = fs.readFileSync('/uploads/' + userFile);

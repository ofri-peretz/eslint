// CWE-022: Path Traversal — path.join with user input
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const fs = require('fs');
const path = require('path');
const userFile = req.query.file;
const content = fs.readFileSync(path.join('/uploads', userFile));

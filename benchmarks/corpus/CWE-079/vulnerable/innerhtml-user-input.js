// CWE-079: XSS — innerHTML with user input
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const userComment = req.body.comment;
document.getElementById('output').innerHTML = userComment;

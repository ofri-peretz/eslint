// CWE-079: XSS — document.write with dynamic content
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const name = location.hash.substring(1);
document.write('<h1>Welcome ' + name + '</h1>');

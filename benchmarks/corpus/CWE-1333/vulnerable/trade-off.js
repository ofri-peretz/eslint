// CWE-1333: ReDoS — cross-quantifier trade-off
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — (a*).*b enables exponential backtracking on input "aaa...x"
const validator = /^(a*).*b/;
const userInput = req.body.value;
const result = validator.exec(userInput);

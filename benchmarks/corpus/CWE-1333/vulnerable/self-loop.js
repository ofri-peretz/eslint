// CWE-1333: ReDoS — self-loop quantifier
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — (a+)+ has catastrophic backtracking on adversarial input
const userInput = req.body.value;
const validator = /^(a+)+$/;
if (validator.test(userInput)) {
  process(userInput);
}

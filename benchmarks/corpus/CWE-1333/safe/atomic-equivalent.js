// CWE-1333: ReDoS — safe equivalent of self-loop
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — single quantifier, no nested ambiguity
const validator = /^a+$/;
function check(input) {
  return validator.test(input);
}

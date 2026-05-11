// CWE-1333: ReDoS — safe, anchored character class
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — fully anchored, single-quantifier, deterministic
const isAlphaOnly = /^[a-z]+$/;
function check(input) {
  return isAlphaOnly.test(input);
}

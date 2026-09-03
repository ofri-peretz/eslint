// CWE-1333: ReDoS — safe, no quantifier in regex
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — plain string regex, deterministic
const greeting = /^hello$/;
const isHello = (s) => greeting.test(s);

// CWE-1333: ReDoS — CVE-2017-18342 class email validator
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — real-world ReDoS shape from email-validation libs
const isValidEmail = /^([a-zA-Z0-9])(([\-.]|[_]+)?([a-zA-Z0-9]+))*(@){1}[a-z0-9]+[.]{1}(([a-z]{2,3})|([a-z]{2,3}[.]{1}[a-z]{2,3}))$/;
function validate(email) {
  return isValidEmail.test(email);
}

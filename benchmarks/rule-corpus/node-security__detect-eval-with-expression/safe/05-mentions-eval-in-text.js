/**
 * SAFE - the words `eval`, `new Function` and `runInNewContext` appear only in
 * a CSP header value, a comment and an error message. Nothing is compiled. A
 * report here would prove the rule reads TEXT rather than structure.
 */
const CSP = "default-src 'self'; script-src 'self'; object-src 'none'";
const REFUSAL = 'refusing to compile: eval() and new Function() are banned in this service';

// The v1 renderer used vm.runInNewContext(template) — removed in #412.
module.exports = function securityHeaders(_req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.locals.refusal = REFUSAL;
  next();
};

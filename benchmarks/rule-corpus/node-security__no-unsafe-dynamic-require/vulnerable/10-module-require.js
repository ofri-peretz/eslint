/**
 * VULNERABLE (adversarial) - `module.require()` is the same loader reached
 * through the module object. Legacy plugin hosts use it to resolve relative to
 * themselves; the specifier is still the caller's.
 */
module.exports = function loadReporter(req, res) {
  const reporter = module.require(req.query.reporter);
  res.json(reporter.summary());
};

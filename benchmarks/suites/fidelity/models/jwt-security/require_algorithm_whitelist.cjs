const { verifyOptionModel } = require('../../jwt.cjs');

module.exports = verifyOptionModel({
  rule: 'require-algorithm-whitelist',
  options: () => ({
    x: "algorithms: ['RS256']",
    alt: "algorithms: ['RS256', 'ES256']",
    // `algorithm` (singular) is a sign option: verify ignores it, so it pins
    // nothing and must not satisfy the rule.
    other: "algorithm: 'RS256'",
  }),
});

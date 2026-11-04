const { verifyOptionModel } = require('../../jwt.cjs');

module.exports = verifyOptionModel({
  rule: 'require-issuer-validation',
  options: () => ({
    x: "issuer: 'https://auth.example.com'",
    alt: "issuer: ['https://auth.example.com', 'https://login.example.com']",
    other: "algorithms: ['RS256']",
  }),
});

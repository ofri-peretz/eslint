const { verifyOptionModel } = require('../../jwt.cjs');

module.exports = verifyOptionModel({
  rule: 'require-audience-validation',
  options: () => ({
    x: "audience: 'https://api.example.com'",
    alt: "audience: ['https://api.example.com', 'https://admin.example.com']",
    other: "issuer: 'https://auth.example.com'",
  }),
});

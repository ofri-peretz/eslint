const { tag } = require('../../lib.cjs');

// Assembled from parts so the model file itself does not trip a secret scanner.
const V = {
  StripeLive: 'sk_' + 'live_' + '4eC39HqLyjWDarjtT1zdp7dc',
  GithubPat: 'gh' + 'p_' + 'R7kq2LmX9vB4nT8wZc3HjF6dYg1KsP5QeA0u',
  AwsAkia: 'AK' + 'IA' + 'Q3EGRV7LXN2KZT5M',
  Jwt:
    'ey' +
    'JhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  DbUrl: 'postgres://' + 'appuser:' + 'Tr0ub4dor' + '@db.internal:5432/prod',
  Blob32: 'Xk9mQ2vLp7RtB4nW8sZc3HjF6dYg1KqT',
  Blob25: 'fyFGb7ywyM37TqDY8nuhAmGW5',
  WeakPwd: 'admin123',
  MixedClass: 'aaAA@123',
  I18nKey: 'incorrectPassword',
  Sentence: 'Please enter your password',
  Placeholder: 'changeme',
  Repeated: 'xxxxxxxxxxxx',
  Charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  RouteTemplate: '/access-token/{id}',
  ErrorCode: 'infra_token/invalid_token',
  CodeWithDigit: 'invalid_tok9n/x',
};

module.exports = {
  domain: 85,
  traces: 800,
  rule: 'no-hardcoded-credentials',
  key: (s) => `${tag(s.value)}|${tag(s.slot)}`,
  config: () => ({}),
  code: (s) => {
    const lit = JSON.stringify(V[tag(s.value)]);
    return {
      CredVar: `export const password = ${lit};\n`,
      NeutralVar: `export const label = ${lit};\n`,
      CredProp: `export const cfg = { apiKey: ${lit} };\n`,
      WeakKeyProp: `export const cfg = { key: ${lit} };\n`,
      ImportEqualsProp: `import post = require('./post');\nexport const send = () => {\n  const cfg = { apiKey: ${lit} };\n  return post(cfg);\n};\n`,
    }[tag(s.slot)];
  },
};

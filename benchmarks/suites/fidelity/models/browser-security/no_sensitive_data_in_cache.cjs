const { tag } = require('../../lib.cjs');

const KEYS = {
  Token: 'token',
  AuthToken: 'auth_token',
  AccessTokenCamel: 'accessToken',
  Password: 'password',
  UserPasswordCamel: 'userPassword',
  CreditCardSnake: 'credit_card',
  CreditCardCamel: 'creditCard',
  Ssn: 'ssn',
  SsnUpper: 'USER_SSN',
  Theme: 'theme',
};

module.exports = {
  domain: 400, // 10 keys x 5 methods x 2 receivers x test file x allowInTests
  traces: 5000,
  rule: 'no-sensitive-data-in-cache',
  key: (s) =>
    `${tag(s.key)}|${tag(s.method)}|${tag(s.recv)}|test=${s.testFile}|allow=${s.allowInTests}`,
  config: (s) => ({ allowInTests: s.allowInTests }),
  filename: (s) => (s.testFile ? 'src/cache.test.ts' : 'src/cache.ts'),
  code: (s) => {
    const k = `'${KEYS[tag(s.key)]}'`;
    const stmt = {
      SetCall: `cache.set(${k}, value);`,
      Put: `cache.put(${k}, value);`,
      Store: `cache.store(${k}, value);`,
      ComputedPut: `cache['put'](${k}, value);`,
      Get: `const cached = cache.get(${k});`,
    }[tag(s.method)];
    if (tag(s.recv) === 'CacheStorage') {
      return `declare const value: string;\nexport async function warm() {\n  const cache = await caches.open('v1');\n  ${stmt}\n}\n`;
    }
    return `declare const cache: any;\ndeclare const value: string;\n${stmt}\n`;
  },
  model: (s) => s.verdict,
};

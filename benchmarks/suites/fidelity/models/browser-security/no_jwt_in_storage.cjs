const { tag } = require('../../lib.cjs');

const KEYS = {
  Token: 'token',
  AccessTokenCamel: 'accessToken',
  AccessTokenSnake: 'access_token',
  IdToken: 'id_token',
  Jwt: 'jwt',
  AuthToken: 'authToken',
  Tokenizer: 'tokenizer',
  Author: 'author',
  TokenCount: 'tokenCount',
  SessionTimeout: 'sessionTimeout',
  Theme: 'theme',
  Handle: 'handle',
};

module.exports = {
  domain: 384, // 360 in Prod + 12 keys in each of 2 test contexts
  traces: 4500,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-jwt-in-storage',
  key: (s) =>
    `${tag(s.key)}|${tag(s.value)}|${tag(s.form)}|${tag(s.patterns)}|${tag(s.ctx)}`,
  config: (s) => ({
    ...(tag(s.patterns) === 'CustomHandle'
      ? { bearerPatterns: ['handle'] }
      : {}),
    ...(tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : {}),
  }),
  filename: (s) => (tag(s.ctx) === 'Prod' ? 'src/a.ts' : 'src/a.test.ts'),
  code: (s) => {
    const k = KEYS[tag(s.key)];
    const v = {
      Ident: 'jwtToken',
      JwtLit: "'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2lnbmF0dXJl'",
      PlainLit: "'dark'",
    }[tag(s.value)];
    const stmt = {
      SetItem: `localStorage.setItem('${k}', ${v});`,
      Bracket: `localStorage['${k}'] = ${v};`,
      Dot: `localStorage.${k} = ${v};`,
      SessionSetItem: `sessionStorage.setItem('${k}', ${v});`,
      OtherReceiver: `cache.setItem('${k}', ${v});`,
    }[tag(s.form)];
    return [
      'declare const jwtToken: string;',
      'declare const cache: { setItem(k: string, v: string): void };',
      stmt,
    ].join('\n');
  },
  model: (s) => s.verdict,
};

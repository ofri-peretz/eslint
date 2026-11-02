const { tag, num } = require('../../lib.cjs');

module.exports = {
  domain: 15,
  pkg: 'eslint-plugin-secure-coding',
  rule: 'no-hardcoded-session-tokens',
  key: (s) => `${tag(s.lit)}|${tag(s.ctx)}`,
  config: () => ({}),
  code: (s) => {
    const v = {
      Jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghijklmnopqrstuvwxyz0123456789',
      Bearer: 'Bearer abcdefghijklmnopqrstuvwxyz',
      AlnumLong: 'abcdefghijklmnop',
      AlnumShort: 'abc123',
      Plain: 'hello world, this is text',
    }[tag(s.lit)];
    const lit = JSON.stringify(v);
    return {
      TokenVar: `const sessionToken = ${lit};`,
      NeutralVar: `const label = ${lit};`,
      NotDecl: `call(${lit});`,
    }[tag(s.ctx)];
  },
  model: (s) => s.verdict,
  input: (s) => `${tag(s.lit)}|${tag(s.ctx)}`,
};

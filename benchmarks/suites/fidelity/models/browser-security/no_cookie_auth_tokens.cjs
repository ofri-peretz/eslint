const { tag } = require('../../lib.cjs');

const NAMES = {
  AuthToken: 'authToken',
  Jwt: 'jwt',
  Bearer: 'bearer',
  SessionId: 'sessionId',
  SessionIdSnake: 'session_id',
  Sid: 'sid',
  AccessToken: 'access_token',
  Theme: 'theme',
  Locale: 'locale',
  TokenCount: 'tokenCount',
  Author: 'author',
  Handle: 'handle',
};

let filename = 'src/app.ts';

module.exports = {
  domain: 648,
  traces: 7000,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-cookie-auth-tokens',
  get filename() {
    return filename;
  },
  key: (s) =>
    `${tag(s.name)}|${tag(s.form)}|${tag(s.recv)}|${tag(s.patterns)}|${tag(s.ctx)}`,
  config: (s) => ({
    ...(tag(s.patterns) === 'CustomHandle'
      ? { bearerPatterns: ['handle'] }
      : {}),
    ...(tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : {}),
  }),
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const n = NAMES[tag(s.name)];
    const rhs = {
      Literal: `'${n}=abc123'`,
      Concat: `'${n}=' + value`,
      Template: `\`${n}=\${value}; path=/\``,
    }[tag(s.form)];
    const lhs = {
      Doc: 'document.cookie',
      WinDoc: 'window.document.cookie',
      Other: 'jar.cookie',
    }[tag(s.recv)];
    return [
      'declare const value: string;',
      'declare const jar: { cookie: string };',
      `${lhs} = ${rhs};`,
    ].join('\n');
  },
  model: (s) => s.verdict,
};

const { tag } = require('../../lib.cjs');

const NAMES = {
  Password: 'password',
  ApiKey: 'api_key',
  ClientSecret: 'clientSecret',
  Token: 'token',
  SessionId: 'sessionId',
  Theme: 'theme',
  Pin: 'pin',
};

let filename = 'src/app.ts';

module.exports = {
  domain: 378,
  traces: 4000,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-sensitive-cookie-js',
  get filename() {
    return filename;
  },
  key: (s) =>
    `${tag(s.name)}|${tag(s.form)}|${tag(s.recv)}|${tag(s.patterns)}|${tag(s.ctx)}`,
  config: (s) => ({
    ...(tag(s.patterns) === 'CustomPin' ? { sensitivePatterns: ['pin'] } : {}),
    ...(tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : {}),
  }),
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const n = NAMES[tag(s.name)];
    const rhs = {
      Literal: `'${n}=abc123'`,
      Concat: `'${n}=' + value`,
      Template: `\`${n}=\${value}; Secure; SameSite=Strict\``,
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

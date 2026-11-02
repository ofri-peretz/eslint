const { tag } = require('../../lib.cjs');

const KEYS = {
  Password: 'password',
  UserPassword: 'userPassword',
  ApiKeySnake: 'api_key',
  ApiKeyCamel: 'apiKey',
  Token: 'token',
  ClassName: 'className',
  Theme: 'theme',
  PinCode: 'pinCode',
};

module.exports = {
  domain: 336, // 320 in Prod + 8 keys in each of 2 test contexts
  traces: 4000,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-sensitive-localstorage',
  key: (s) =>
    `${tag(s.key)}|${tag(s.patterns)}|${tag(s.form)}|${tag(s.storage)}|checkSS=${s.checkSS}|${tag(s.ctx)}`,
  filename: (s) => (tag(s.ctx) === 'Prod' ? 'src/a.ts' : 'src/a.test.ts'),
  config: (s) => ({
    checkSessionStorage: s.checkSS,
    ...(tag(s.ctx) === 'TestFlipped' ? { allowInTests: true } : {}),
    ...(tag(s.patterns) === 'CustomPin' ? { sensitivePatterns: ['pin'] } : {}),
  }),
  code: (s) => {
    const k = KEYS[tag(s.key)];
    const st = tag(s.storage) === 'Local' ? 'localStorage' : 'sessionStorage';
    const stmt = {
      SetItem: `${st}.setItem('${k}', value);`,
      Bracket: `${st}['${k}'] = value;`,
      Dot: `${st}.${k} = value;`,
      WindowSetItem: `window.${st}.setItem('${k}', value);`,
      GetItem: `const read = ${st}.getItem('${k}');`,
    }[tag(s.form)];
    return ['declare const value: string;', stmt].join('\n');
  },
  model: (s) => s.verdict,
};

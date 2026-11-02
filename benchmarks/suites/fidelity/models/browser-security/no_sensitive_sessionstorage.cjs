const { tag } = require('../../lib.cjs');

const KEYS = {
  Password: 'password',
  ApiKeyCamel: 'apiKey',
  ApiKeySnake: 'api_key',
  AccessToken: 'accessToken',
  Theme: 'theme',
  SearchQuery: 'searchQuery',
  ClassName: 'className',
  Entitlement: 'entitlementGrant',
};

let filename = 'src/app.ts';

module.exports = {
  domain: 288,
  traces: 3000,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-sensitive-sessionstorage',
  get filename() {
    return filename;
  },
  key: (s) => `${tag(s.key)}|${tag(s.form)}|extra=${s.extra}|${tag(s.ctx)}`,
  config: (s) => ({
    ...(s.extra ? { additionalPatterns: ['entitlement'] } : {}),
    ...(tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : {}),
  }),
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const k = KEYS[tag(s.key)];
    const stmt = {
      SetItem: `sessionStorage.setItem('${k}', value);`,
      Bracket: `sessionStorage['${k}'] = value;`,
      Dot: `sessionStorage.${k} = value;`,
      WindowSetItem: `window.sessionStorage.setItem('${k}', value);`,
      GetItem: `const read = sessionStorage.getItem('${k}');`,
      LocalSetItem: `localStorage.setItem('${k}', value);`,
    }[tag(s.form)];
    return ['declare const value: string;', stmt].join('\n');
  },
  model: (s) => s.verdict,
};

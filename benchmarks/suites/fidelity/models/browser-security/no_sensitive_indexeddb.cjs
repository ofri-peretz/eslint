const { tag } = require('../../lib.cjs');

const NAMES = {
  Password: 'password',
  Passwords: 'passwords',
  ApiKey: 'apiKey',
  Secrets: 'secrets',
  Preferences: 'preferences',
  CachedData: 'cachedData',
  AccessToken: 'accessToken',
  Entitlement: 'entitlementGrant',
  Pin: 'pin',
};

module.exports = {
  domain: 375, // 5 forms x 3 ctx x (8 names x 3 opts + AccessToken under ReplacePin only)
  traces: 4500,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-sensitive-indexeddb',
  filename: (s) => (tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts'),
  key: (s) => `${tag(s.form)}|${tag(s.name)}|${tag(s.opts)}|${tag(s.ctx)}`,
  config: (s) => ({
    ...(tag(s.opts) === 'AddEntitlement'
      ? { additionalPatterns: ['entitlementGrant'] }
      : {}),
    ...(tag(s.opts) === 'ReplacePin' ? { sensitiveTerms: ['pin'] } : {}),
    ...(tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : {}),
  }),
  code: (s) => {
    const n = NAMES[tag(s.name)];
    const stmt = {
      CreateStore: `db.createObjectStore('${n}');`,
      AddObj: `store.add({ ${n}: value });`,
      PutObj: `store.put({ ${n}: value });`,
      PutKeyArg: `store.put(value, '${n}');`,
      UnresolvedAdd: `jobQueue.add({ ${n}: value });`,
    }[tag(s.form)];
    return [
      'declare const db: IDBDatabase;',
      'declare const jobQueue: { add(x: unknown): void };',
      "const store = db.transaction('vault', 'readwrite').objectStore('vault');",
      'declare const value: string;',
      stmt,
    ].join('\n');
  },
  model: (s) => s.verdict,
};

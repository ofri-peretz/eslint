const { tag } = require('../../lib.cjs');

let filename = 'src/app.ts';

module.exports = {
  domain: 105,
  traces: 1100,
  pkg: 'eslint-plugin-browser-security',
  rule: 'no-dynamic-service-worker-url',
  get filename() {
    return filename;
  },
  key: (s) => `${tag(s.arg)}|${tag(s.callee)}|${tag(s.ctx)}`,
  config: (s) =>
    tag(s.ctx) === 'TestFlipped' ? { allowInTests: false } : undefined,
  code: (s) => {
    filename = tag(s.ctx) === 'Prod' ? 'src/app.ts' : 'src/app.test.ts';
    const args = {
      Lit: "'/sw.js'",
      TplStatic: '`/sw.js`',
      TplExpr: '`${basePath}/sw.js`',
      Concat: "path + '/worker.js'",
      Ident: 'userInput',
      ConstLit: 'SW_URL',
      LitWithOpts: "'/service-worker.js', { scope: '/' }",
    }[tag(s.arg)];
    const callee = {
      Nav: 'navigator.serviceWorker.register',
      WindowNav: 'window.navigator.serviceWorker.register',
      ComputedRegister: "navigator.serviceWorker['register']",
      OptionalSW: 'navigator.serviceWorker?.register',
      OtherRegister: 'router.register',
    }[tag(s.callee)];
    return [
      'declare const basePath: string;',
      'declare const path: string;',
      'declare const userInput: string;',
      'declare const router: { register(u: string, o?: unknown): void };',
      "const SW_URL = '/sw.js';",
      `${callee}(${args});`,
    ].join('\n');
  },
  model: (s) => s.verdict,
};

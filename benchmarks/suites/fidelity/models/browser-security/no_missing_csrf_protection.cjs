const { tag } = require('../../lib.cjs');

let current = null;

module.exports = {
  domain: 672, // 6 routes x 7 middleware x 4 option combos x test file x allowInTests
  traces: 9000,
  rule: 'no-missing-csrf-protection',
  key: (s) =>
    `${tag(s.route)}|${tag(s.mw)}|custom=${s.customOpt}|postOnly=${s.postOnly}|test=${s.testFile}|allow=${s.allowInTests}`,
  config: (s) => ({
    allowInTests: s.allowInTests,
    ...(s.customOpt ? { csrfMiddlewarePatterns: ['antiForgery'] } : {}),
    ...(s.postOnly ? { protectedMethods: ['post'] } : {}),
  }),
  get filename() {
    return current && current.testFile ? 'src/routes.test.ts' : 'src/routes.ts';
  },
  code: (s) => {
    current = s;
    const route = tag(s.route);
    const recv = route === 'RouterPost' ? 'router' : 'app';
    const method = {
      Post: 'post',
      Put: 'put',
      Delete: 'delete',
      Patch: 'patch',
      Get: 'get',
      RouterPost: 'post',
    }[route];
    const m = tag(s.mw);
    const arg = {
      NoMw: '',
      CsrfCall: 'csrf(), ',
      CsrfProtectionId: 'csrfProtection, ',
      CsurfCall: 'csurf({ cookie: true }), ',
      CustomMw: 'antiForgery, ',
      OtherMw: 'authenticate, ',
      GlobalCsrf: '',
    }[m];
    return [
      "import express from 'express';",
      'declare const csrf: any, csurf: any, csrfProtection: any, antiForgery: any, authenticate: any;',
      'const app = express();',
      'const router = express.Router();',
      m === 'GlobalCsrf' ? `${recv}.use(csrf());` : '',
      `${recv}.${method}('/api/users/:id', ${arg}(req: any, res: any) => {\n  res.json({ ok: true });\n});`,
      '',
    ].join('\n');
  },
  model: (s) => s.verdict,
};

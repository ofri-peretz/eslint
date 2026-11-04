const { tag } = require('../../lib.cjs');

const MW = {
  NoMw: '',
  CsrfCall: 'csrf(), ',
  CsrfProtectionId: 'csrfProtection, ',
  CsurfCall: 'csurf({ cookie: true }), ',
  CustomMw: 'antiForgery, ',
  OtherMw: 'authenticate, ',
  GlobalCsrf: '',
  MwArray: '[authenticate, csrfProtection], ',
};

module.exports = {
  rule: 'no-missing-csrf-protection',
  domain: 392, // 7 routes x 8 middleware x 7 contexts
  traces: 6000,
  key: (s) => `route=${tag(s.route)} mw=${tag(s.mw)} ctx=${tag(s.ctx)}`,
  config: (s) =>
    ({
      CustomPat: { csrfMiddlewarePatterns: ['antiForgery'] },
      PostOnly: { protectedMethods: ['post'] },
      IgnorePublic: { ignorePatterns: ['/api/public'] },
      TestFlip: { allowInTests: true },
    })[tag(s.ctx)],
  filename: (s) =>
    ['TestDefault', 'TestFlip'].includes(tag(s.ctx))
      ? 'src/routes.test.ts'
      : 'src/routes.ts',
  code: (s) => {
    const route = tag(s.route);
    const ctx = tag(s.ctx);
    const m = tag(s.mw);
    const path = ctx === 'IgnorePublic' ? '/api/public/users' : '/api/users';
    const handler = '(req: any, res: any) => {\n  res.json({ ok: true });\n}';
    const head =
      ctx === 'NoExpress'
        ? [
            "import Router from '@koa/router';",
            'const app: any = new Router();',
            'const router: any = new Router();',
          ]
        : [
            "import express from 'express';",
            'const app = express();',
            'const router = express.Router();',
          ];
    const recv = route === 'RouterPost' ? 'router' : 'app';
    const verb = {
      AppPost: 'post',
      AppPut: 'put',
      AppDelete: 'delete',
      AppPatch: 'patch',
      AppGet: 'get',
      RouterPost: 'post',
      ChainPost: 'post',
    }[route];
    const reg =
      route === 'ChainPost'
        ? `app.route('${path}').get(listUsers).${verb}(${MW[m]}${handler});`
        : `${recv}.${verb}('${path}', ${MW[m]}${handler});`;
    return [
      ...head,
      "import { csrf, csurf, csrfProtection, antiForgery, authenticate, listUsers } from './middleware';",
      m === 'GlobalCsrf' ? `${recv}.use(csrf());` : '',
      reg,
      '',
    ].join('\n');
  },
};

const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'require-csrf-protection',
  // core 4 x 4 x 4 = 64; rest 1 x 2 x 2 x 5 x 4 x 4 = 320, sharing 4 inputs with core;
  // shapes: guard-only 4 x 1, bearer 4 x 3 = 16
  domain: 64 + 320 - 4 + 16,
  traces: 2500,
  key: (s) =>
    ['cred', 'auth', 'csrf', 'method', 'spelling', 'opts', 'shape']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    ({
      PostOnly: { protectedMethods: ['post'] },
      IgnoreMatch: { ignorePatterns: ['/transfer'] },
      IgnoreOther: { ignorePatterns: ['/api/webhook'] },
    })[tag(s.opts)],
  code: (s) => {
    const cred = tag(s.cred);
    const auth = tag(s.auth);
    const csrf = tag(s.csrf);
    const sp = tag(s.spelling);
    const m = tag(s.method).toLowerCase();
    const recv = sp === 'Router' ? 'router' : 'app';
    const shape = tag(s.shape);
    const chain = [
      auth === 'RouteMw'
        ? shape === 'GuardOnly'
          ? 'requireAuth()'
          : 'requireAuth'
        : '',
      shape === 'Bearer'
        ? "passport.authenticate('jwt', { session: false })"
        : '',
      csrf === 'RouteCsrf' ? 'csrfProtection' : '',
      csrf === 'ArrayCsrf' ? '[csrfProtection]' : '',
    ].filter(Boolean);
    const reads = [
      auth === 'ReadsUser' ? 'req.user.id' : '',
      cred === 'CookieRead' ? 'req.cookies.sid' : '',
      'req.body',
    ]
      .filter(Boolean)
      .join(', ');
    const handler = `(req: any, res: any) => { transferFunds(${reads}); res.sendStatus(204); }`;
    // A guard-only registration mounts a guard and handles nothing.
    const args = [...chain, ...(shape === 'GuardOnly' ? [] : [handler])].join(
      ', ',
    );
    const route =
      sp === 'RouteChain'
        ? `app.route('/transfer').get(showForm).${m}(${args});`
        : `${recv}.${m}('/transfer', ${args});`;
    return [
      sp === 'RequireApp'
        ? "const express = require('express');"
        : "import express from 'express';",
      cred === 'Session' ? "import session from 'express-session';" : '',
      cred === 'CookieParser' || cred === 'CookieRead'
        ? "const cookieParser = require('cookie-parser');"
        : '',
      shape === 'Bearer' ? "import passport from 'passport';" : '',
      csrf !== 'NoCsrf' ? "import csrf from 'csurf';" : '',
      "import { requireAuth, transferFunds, showForm } from './lib';",
      'const app = express();',
      sp === 'Router' ? 'const router = express.Router();' : '',
      csrf !== 'NoCsrf' ? 'const csrfProtection = csrf();' : '',
      cred === 'Session' ? `${recv}.use(session({ secret: 's3cret' }));` : '',
      cred === 'CookieParser' || cred === 'CookieRead'
        ? `${recv}.use(cookieParser());`
        : '',
      auth === 'GlobalAuth' ? `${recv}.use(requireAuth);` : '',
      csrf === 'GlobalCsrf' ? `${recv}.use(csrfProtection);` : '',
      route,
      sp === 'Router' ? "app.use('/', router);" : '',
      'app.listen(3000);',
      '',
    ]
      .filter(Boolean)
      .join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });

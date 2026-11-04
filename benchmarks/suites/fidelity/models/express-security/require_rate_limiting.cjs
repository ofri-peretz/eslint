const { tag, withTestFile } = require('../../lib.cjs');

const PATH = {
  Login: '/login',
  Token: '/auth/token',
  PasswordReset: '/password/reset',
  Otp: '/otp/verify',
  InviteRedeem: '/invite/redeem',
  Articles: '/articles',
};

const RECV = {
  App: ['app', 'express()'],
  Router: ['router', 'express.Router()'],
  Api: ['api', 'express()'],
  Gateway: ['gateway', 'express()'],
  GatewayNamed: ['gateway', 'express()'],
  AppNotNamed: ['app', 'express()'],
};

/** [imports, statements before the route, route-level middleware]. */
const LIMITER = {
  NoLimiter: () => [[], [], ''],
  GlobalUse: (a) => [
    ["import rateLimit from 'express-rate-limit';"],
    [`${a}.use(rateLimit({ windowMs: 60000, max: 5 }));`],
    '',
  ],
  LimiterVar: (a) => [
    ["import rateLimit from 'express-rate-limit';"],
    [
      'const limiter = rateLimit({ windowMs: 60000, max: 100 });',
      `${a}.use(limiter);`,
    ],
    '',
  ],
  RouteLevel: () => [
    ["import rateLimit from 'express-rate-limit';"],
    ['const loginLimiter = rateLimit({ windowMs: 3600000, max: 5 });'],
    'loginLimiter, ',
  ],
  RenamedImport: (a) => [
    ["import throttle from 'express-rate-limit';"],
    [`${a}.use(throttle({ windowMs: 60000, max: 5 }));`],
    '',
  ],
  RequireImport: (a) => [
    ["const rateLimit = require('express-rate-limit');"],
    [`${a}.use(rateLimit({ windowMs: 60000, max: 5 }));`],
    '',
  ],
  InArray: (a) => [
    ["import rateLimit from 'express-rate-limit';"],
    [`${a}.use([express.json(), rateLimit({ windowMs: 60000, max: 5 })]);`],
    '',
  ],
  AltNamed: (a) => [
    ["import { bruteGuard } from './security';"],
    [`${a}.use(bruteGuard());`],
    '',
  ],
  AltUnnamed: (a) => [
    ["import { bruteGuard } from './security';"],
    [`${a}.use(bruteGuard());`],
    '',
  ],
};

const ESCAPE = {
  Stays: (a) => [`${a}.listen(3000);`],
  CjsExport: (a) => [`module.exports = ${a};`],
  Configure: (a) => [`configure(${a});`, `${a}.listen(3000);`],
};

const base = {
  rule: 'require-rate-limiting',
  // 18 path x verb; + POST /login and /articles x 12 recv/spelling, less the
  // 2 already counted; + 9 limiters x 3 escapes x 2 assume, less 1
  domain: 18 + 22 + 53,
  traces: 2500,
  key: (s) =>
    ['path', 'verb', 'recv', 'spelling', 'limiter', 'escape', 'assumeRl']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => {
    const recv = tag(s.recv);
    return {
      ...(recv === 'GatewayNamed' || recv === 'AppNotNamed'
        ? { appReceiverNames: ['gateway'] }
        : {}),
      ...(tag(s.limiter) === 'AltNamed'
        ? { alternativeMiddleware: ['bruteGuard'] }
        : {}),
      ...(s.assumeRl ? { assumeRateLimiting: true } : {}),
    };
  },
  code: (s) => {
    const [a, ctor] = RECV[tag(s.recv)];
    const [imports, pre, mw] = LIMITER[tag(s.limiter)](a);
    const verb = tag(s.verb).toLowerCase();
    const p = PATH[tag(s.path)];
    const route =
      tag(s.spelling) === 'Direct'
        ? `${a}.${verb}('${p}', ${mw}(req, res) => authenticate(req.body));`
        : `${a}.route('${p}').${verb}(${mw}(req, res) => authenticate(req.body));`;
    // A router is mounted on an app in the same file; the app is what
    // listens or leaves the file.
    const isRouter = tag(s.recv) === 'Router';
    return [
      "import express from 'express';",
      ...imports,
      "import { authenticate, configure } from './lib';",
      ...(isRouter ? ['const app = express();'] : []),
      `const ${a} = ${ctor};`,
      ...pre,
      route,
      ...(isRouter ? ["app.use('/auth', router);"] : []),
      ...ESCAPE[tag(s.escape)](isRouter ? 'app' : a),
      '',
    ].join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });

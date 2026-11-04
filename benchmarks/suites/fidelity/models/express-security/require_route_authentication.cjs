const { tag } = require('../../lib.cjs');

const PATH = {
  Users: '/users',
  AccountPassword: '/account/password',
  PaymentsTransfer: '/payments/transfer',
  InternalConfig: '/internal/config',
  Roles: '/roles/:id',
  OrdersId: '/orders/:id',
  BillingCard: '/billing/card',
  Reorder: '/reorder-items',
  BorderCrossing: '/border-crossing',
  Articles: '/articles',
  Login: '/login',
  Signup: '/signup',
  PasswordReset: '/password/reset',
  Webhook: '/webhooks/stripe/payment',
  Health: '/health',
  RecoverPassword: '/recover-password',
  UnlockAccount: '/unlock-account',
  Tenants: '/tenants',
  UsersKiosk: '/users/kiosk',
};

const ANSWER = '(req: any, res: any) => res.json(save(req.body))';
/** [statements before, middleware args, handler, statements after]. */
const GUARD = {
  NoGuard: () => [[], '', ANSWER, []],
  RequireAuth: () => [[], 'requireAuth, ', ANSWER, []],
  Authenticate: () => [[], 'authenticate, ', ANSWER, []],
  PassportJwt: () => [[], "passport.authenticate('jwt'), ", ANSWER, []],
  VerifyToken: () => [[], 'verifyToken, ', ANSWER, []],
  EnsureLoggedIn: () => [[], 'ensureLoggedIn(), ', ANSWER, []],
  AuthInArray: () => [[], '[requireAuth], ', ANSWER, []],
  BodyParserOnly: () => [[], 'jsonParser, ', ANSWER, []],
  UseBefore: (a) => [[`${a}.use(requireAuth);`], '', ANSWER, []],
  UseAfter: (a) => [[], '', ANSWER, [`${a}.use(requireAuth);`]],
  ReadsUser: () => [
    [],
    '',
    '(req: any, res: any) => res.json(save(req.user.id, req.body))',
    [],
  ],
  ReadsLocalsUser: () => [
    [],
    '',
    '(req: any, res: any) => res.json(save(res.locals.user.id, req.body))',
    [],
  ],
  NextOnly: () => [
    [],
    '',
    "(req: any, res: any, next: any) => { req.url = '/'; next(); }",
    [],
  ],
  CustomNamed: () => [[], 'withTenantContext, ', ANSWER, []],
  CustomUnnamed: () => [[], 'withTenantContext, ', ANSWER, []],
};

const RECV = {
  App: ['app', 'express()'],
  Router: ['router', 'express.Router()'],
  RouteChain: ['app', 'express()'],
  Gateway: ['gateway', 'express()'],
  GatewayNamed: ['gateway', 'express()'],
  AppNotNamed: ['app', 'express()'],
};

module.exports = {
  rule: 'require-route-authentication',
  // Surface: 19 paths (+1 opt each for Tenants, UsersKiosk) + 4 more verbs on
  // /users = 25; Guards: 15 on POST /users (NoGuard shared) = 14;
  // Receivers: 6 x 3 guards (App x {NoGuard, RequireAuth, UseAfter} shared) = 15
  domain: 25 + 14 + 15,
  traces: 1500,
  key: (s) =>
    ['path', 'pathOpt', 'verb', 'guard', 'recv']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => {
    const recv = tag(s.recv);
    return {
      ...(recv === 'GatewayNamed' || recv === 'AppNotNamed'
        ? { appReceiverNames: ['gateway'] }
        : {}),
      ...(tag(s.pathOpt) === 'CriticalTenant'
        ? { criticalPaths: ['tenant'] }
        : {}),
      ...(tag(s.pathOpt) === 'PublicKiosk' ? { publicPaths: ['kiosk'] } : {}),
      ...(tag(s.guard) === 'CustomNamed'
        ? { authMiddleware: ['withTenantContext'] }
        : {}),
    };
  },
  code: (s) => {
    const [a, ctor] = RECV[tag(s.recv)];
    const [pre, mw, handler, post] = GUARD[tag(s.guard)](a);
    const verb = tag(s.verb).toLowerCase();
    const p = PATH[tag(s.path)];
    const route =
      tag(s.recv) === 'RouteChain'
        ? `${a}.route('${p}').${verb}(${mw}${handler});`
        : `${a}.${verb}('${p}', ${mw}${handler});`;
    return [
      "import express from 'express';",
      "import passport from 'passport';",
      "import { requireAuth, authenticate, verifyToken, ensureLoggedIn, withTenantContext, jsonParser, save } from './lib';",
      `const ${a} = ${ctor};`,
      ...pre,
      route,
      ...post,
      '',
    ].join('\n');
  },
};

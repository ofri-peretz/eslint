const { tag } = require('../../lib.cjs');

const PATH = {
  Debug: '/debug',
  DebugSub: '/debug/vars',
  DebugTrailing: '/debug/',
  DunderDebug: '/__debug__',
  Admin: '/admin',
  AdminParam: '/admin/users/:id',
  AdminUpper: '/Admin',
  TestReset: '/test/reset-state',
  Health: '/health',
  ApiProfile: '/api/v1/profile',
  StatusCheck: '/status-check',
  CustomMonitor: '/internal-monitor',
};
const H = '(req, res) => res.json(process.memoryUsage())';
const REG = {
  AppGet: (p) => [`app.get('${p}', ${H});`],
  AppPost: (p) => [`app.post('${p}', ${H});`],
  RouterUse: (p) => [
    'const router = express.Router();',
    `router.use('${p}', adminController);`,
    'app.use(router);',
  ],
  AppDelete: (p) => [`app.delete('${p}', handler);`],
  AppAll: (p) => [`app.all('${p}', handler);`],
  RouteChain: (p) => [`app.route('${p}').get(listUsers).delete(removeUser);`],
  NamedRouter: (p) => [
    'const router = Router();',
    `router.get('${p}', ${H});`,
    'app.use(router);',
  ],
  SettingsRead: (p) => [`const configured = app.get('${p}');`],
  Redirect: (p) => [`app.get('/home', (req, res) => res.redirect('${p}'));`],
  ConstDecl: (p) => [`export const SENSITIVE_PATH = '${p}';`],
};

module.exports = {
  rule: 'no-exposed-debug-endpoints',
  // Paths 12 x 2 endpoint lists; Regs 10 x 2 paths; Files 3.
  domain: 24 + 20 + 3,
  traces: 1500,
  key: (s) =>
    ['focus', 'path', 'reg', 'custom', 'file']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => {
    const o = {};
    if (s.custom) o.endpoints = ['/internal-monitor'];
    if (tag(s.file) === 'IgnoredWithOpt') o.ignoreFiles = ['**/dev/**'];
    return Object.keys(o).length ? o : undefined;
  },
  filename: (s) =>
    tag(s.file) === 'PlainFile' ? 'src/app.ts' : 'src/dev/routes.ts',
  code: (s) =>
    [
      "import express, { Router } from 'express';",
      "import { adminController, handler, listUsers, removeUser } from './handlers';",
      'const app = express();',
      ...REG[tag(s.reg)](PATH[tag(s.path)]),
      'app.listen(3000);',
      '',
    ].join('\n'),
};

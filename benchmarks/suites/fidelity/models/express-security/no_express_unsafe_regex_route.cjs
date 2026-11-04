const { tag, withTestFile } = require('../../lib.cjs');

const PATTERN = {
  NestedPlus: '/^\\/files\\/(a+)+$/',
  DotStarStar: '/^\\/api\\/(.*)*$/',
  ClassPlusStar: '/^([a-zA-Z]+)*$/',
  WordStarPlus: '/^\\/u\\/(\\w*)+$/',
  AltOverlap: '/^\\/(a|aa)+$/',
  SafeClass: '/^\\/api\\/[a-z]+$/',
  SafeWord: '/^\\/api\\/\\w+$/',
  SafeGroupPlus: '/^\\/(abc)+$/',
  SafeOptionalGroup: '/^\\/v(\\d+)?$/',
  StringPath: "'/api/:resource'",
};
const REG = {
  AppGet: (p) => [`app.get(${p}, handler);`],
  RouterGet: (p) => [
    'const router = express.Router();',
    `router.get(${p}, handler);`,
    'app.use(router);',
  ],
  AppUse: (p) => [`app.use(${p}, handler);`],
  RouteChain: (p) => [`app.route(${p}).get(handler).post(handler);`],
  RouterAll: (p) => [
    'const router = express.Router();',
    `router.all(${p}, handler);`,
    'app.use(router);',
  ],
  PathArray: (p) => [`app.get(['/home', ${p}], handler);`],
  NamedRouter: (p) => [
    'const router = Router();',
    `router.post(${p}, handler);`,
    'app.use(router);',
  ],
};

const base = {
  rule: 'no-express-unsafe-regex-route',
  // 10 patterns; 2 of them crossed with 7 registrations.
  domain: 8 + 14,
  traces: 1000,
  key: (s) => `pattern=${tag(s.pattern)} reg=${tag(s.reg)}`,
  code: (s) =>
    [
      "import express, { Router } from 'express';",
      "import { handler } from './handlers';",
      'const app = express();',
      ...REG[tag(s.reg)](PATTERN[tag(s.pattern)]),
      'app.listen(3000);',
      '',
    ].join('\n'),
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });

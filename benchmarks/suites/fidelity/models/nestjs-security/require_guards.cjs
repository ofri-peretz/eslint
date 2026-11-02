const { tag, num, withTestFile } = require('../../lib.cjs');

const base = {
  domain: 195, // route: 2^4 x 3 guards x 2 x 2; not a route: 3
  traces: 4000,
  pkg: 'eslint-plugin-nestjs-security',
  rule: 'require-guards',
  key: (s) =>
    [
      'isController',
      'isRouteHandler',
      'classPublic',
      'methodPublic',
      'authDeco',
      'publicByDesign',
      'guards',
      'requiredConfigured',
      'requiredMatch',
    ]
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({
    detectGlobalGuards: false,
    requiredGuards: s.requiredConfigured ? ['RolesGuard'] : [],
  }),
  code: (s) => {
    const classDecs = [
      s.isController ? "@Controller('items')" : '',
      s.classPublic ? '@Public()' : '',
    ]
      .filter(Boolean)
      .join('\n');
    const m = [
      s.isRouteHandler ? '@Get()' : '',
      s.methodPublic ? '@Public()' : '',
      s.authDeco ? '@Auth()' : '',
      tag(s.guards) === 'Empty' ? '@UseGuards()' : '',
      tag(s.guards) === 'Named'
        ? s.requiredMatch
          ? '@UseGuards(RolesGuard)'
          : '@UseGuards(AuthGuard)'
        : '',
    ]
      .filter(Boolean)
      .join('\n  ');
    const name = s.publicByDesign ? 'login' : 'findAll';
    const imports = [
      "import { Controller, Get, UseGuards } from '@nestjs/common';",
      "import { Public, Auth } from './auth.decorators';",
      "import { AuthGuard, RolesGuard } from './guards';",
    ].join('\n');
    return `${imports}\n${classDecs}\nclass ItemsController {\n  ${m}\n  ${name}() { return 1; }\n}\n`;
  },
  model: (s) => s.verdict,
  filename: 'src/items.controller.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });

const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'require-throttler',
  domain: 289, // route: 3 sens x 6 limit x 2 authed x 2 onlySensitive x 2 assume x 2 skip; not a route: 1
  traces: 3000,
  key: (s) =>
    [
      'route',
      'sens',
      'limit',
      'authed',
      'onlySensitive',
      'assumeGlobal',
      'skipLogin',
    ]
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({
    detectGlobalThrottler: false,
    assumeGlobalThrottler: s.assumeGlobal,
    onlySensitiveRoutes: s.onlySensitive,
    skipRoutes: s.skipLogin ? ['login'] : [],
  }),
  code: (s) => {
    const limit = tag(s.limit);
    const sens = tag(s.sens);
    const path = sens === 'InPath' ? "'login'" : "'profile'";
    const name = sens === 'InMethodName' ? 'login' : 'update';
    const classDecos = [
      "@Controller('auth')",
      limit === 'ThrottleClass'
        ? '@Throttle({ default: { limit: 5, ttl: 60000 } })'
        : '',
      limit === 'GuardClass' ? '@UseGuards(ThrottlerGuard)' : '',
    ].filter(Boolean);
    const methodDecos = [
      s.route ? `@Post(${path})` : '',
      limit === 'ThrottleMethod'
        ? '@Throttle({ default: { limit: 5, ttl: 60000 } })'
        : '',
      limit === 'GuardMethod' ? '@UseGuards(ThrottlerGuard)' : '',
      limit === 'SkipThrottle' ? '@SkipThrottle()' : '',
      s.authed ? '@UseGuards(JwtAuthGuard)' : '',
    ].filter(Boolean);
    return [
      "import { Controller, Post, UseGuards } from '@nestjs/common';",
      "import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';",
      "import { JwtAuthGuard } from './jwt-auth.guard';",
      ...classDecos,
      'export class AuthController {',
      ...methodDecos.map((d) => `  ${d}`),
      `  ${name}() { return 1; }`,
      '}',
      '',
    ].join('\n');
  },
  filename: 'src/auth.controller.ts',
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });

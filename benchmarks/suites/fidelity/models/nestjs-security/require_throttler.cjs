const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'require-throttler',
  // route: 3 sens x 6 limit x 2 authed x 2 onlySensitive x 2 assume x 2 skip;
  // not a route: 1; one of those inputs read against 5 projects
  domain: 289 + 5,
  traces: 6000,
  key: (s) =>
    [
      'route',
      'sens',
      'limit',
      'authed',
      'onlySensitive',
      'assumeGlobal',
      'skipLogin',
      'project',
    ]
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({
    detectGlobalThrottler: tag(s.project) !== 'NoScan',
    assumeGlobalThrottler: s.assumeGlobal,
    onlySensitiveRoutes: s.onlySensitive,
    skipRoutes: s.skipLogin ? ['login'] : [],
  }),
  files: (s) => {
    const project = tag(s.project);
    if (project === 'NoScan') return undefined;
    const forRoot = 'ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])';
    const module = (imports, providers, extraImport = '') =>
      [
        "import { Module } from '@nestjs/common';",
        "import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';",
        "import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';",
        extraImport,
        `@Module({ imports: [${imports}], providers: [${providers}] })`,
        'export class AppModule {}',
        '',
      ].join('\n');
    const subclass = (name) =>
      [
        "import { Injectable } from '@nestjs/common';",
        "import { ThrottlerGuard } from '@nestjs/throttler';",
        '@Injectable()',
        `export class ${name} extends ThrottlerGuard {}`,
        '',
      ].join('\n');
    return {
      'package.json': '{ "name": "app" }\n',
      'src/app.module.ts': {
        Unbound: module('', ''),
        ModuleOnly: module(forRoot, ''),
        GuardBound: module(
          forRoot,
          '{ provide: APP_GUARD, useClass: ThrottlerGuard }',
        ),
        SubclassBound: module(
          forRoot,
          '{ provide: APP_GUARD, useClass: PerUserLimitGuard }',
          "import { PerUserLimitGuard } from './guards/per-user-limit.guard';",
        ),
        InterceptorBound: module(
          forRoot,
          '{ provide: APP_INTERCEPTOR, useClass: ApiRateLimitInterceptor }',
          "import { ApiRateLimitInterceptor } from './guards/api-rate-limit.interceptor';",
        ),
      }[project],
      'src/guards/per-user-limit.guard.ts': subclass('PerUserLimitGuard'),
      'src/guards/api-rate-limit.interceptor.ts': subclass(
        'ApiRateLimitInterceptor',
      ),
    };
  },
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

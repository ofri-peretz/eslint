/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression tests for global-registration discovery.
 *
 * Every fixture below is the shape that produced a false-positive storm on a
 * real repository:
 *  - ack-nestjs-boilerplate registers `APP_PIPE` (ValidationPipe) and
 *    `APP_GUARD` (ThrottlerGuard) in feature modules, not in `AppModule`.
 *  - brocoders/nestjs-boilerplate registers the pipe with
 *    `app.useGlobalPipes(...)` in `main.ts`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  clearProjectContextCache,
  findProjectRoot,
  getProjectContext,
  isThrottlerGuard,
  scanProject,
} from './project-context';

// A pass-through spy: the real walk still runs, but a test can ask whether
// one happened at all.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, readdirSync: vi.fn(actual.readdirSync) };
});

const roots: string[] = [];

function makeProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'nestjs-security-'));
  roots.push(root);
  writeFileSync(join(root, 'package.json'), '{"name":"fixture"}');
  for (const [relative, contents] of Object.entries(files)) {
    const target = join(root, relative);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, contents);
  }
  return root;
}

afterEach(() => {
  clearProjectContextCache();
  while (roots.length > 0) {
    rmSync(roots.pop() as string, { recursive: true, force: true });
  }
});

describe('scanProject — global provider registration', () => {
  it('finds APP_PIPE and APP_INTERCEPTOR registered in the same providers array', () => {
    // ack-nestjs-boilerplate: src/common/request/request.module.ts
    const root = makeProject({
      'src/common/request/request.module.ts': `
        import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
        @Module({
          providers: [
            RequestStoreService,
            { provide: APP_INTERCEPTOR, useClass: RequestTimeoutInterceptor },
            {
              provide: APP_PIPE,
              useFactory: () => new ValidationPipe({ transform: true, whitelist: true }),
            },
          ],
        })
        export class RequestModule {}
      `,
    });

    const context = scanProject(root);
    expect(context.hasGlobalValidationPipe).toBe(true);
    expect([...context.globalProviders].sort()).toEqual([
      'APP_INTERCEPTOR',
      'APP_PIPE',
    ]);
  });

  it('treats a ThrottlerGuard APP_GUARD as rate limiting, not authentication', () => {
    // ack-nestjs-boilerplate: src/common/request/request.middleware.module.ts
    const root = makeProject({
      'src/common/request/request.middleware.module.ts': `
        @Module({
          providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
          imports: [ThrottlerModule.forRootAsync({ useFactory: () => ({}) })],
        })
        export class RequestMiddlewareModule {}
      `,
    });

    const context = scanProject(root);
    expect(context.hasGlobalThrottler).toBe(true);
    expect(context.hasGlobalAuthGuard).toBe(false);
  });

  it('treats a named auth guard APP_GUARD as authentication', () => {
    const root = makeProject({
      'src/app.module.ts': `
        @Module({ providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }] })
        export class AppModule {}
      `,
    });
    const context = scanProject(root);
    expect(context.hasGlobalAuthGuard).toBe(true);
    expect(context.hasGlobalThrottler).toBe(false);
  });

  it('a ThrottlerGuard APP_GUARD alone marks the project rate limited', () => {
    // No ThrottlerModule in this file: the guard registration is the evidence.
    const root = makeProject({
      'src/security.module.ts': `
        @Module({ providers: [{ provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard }] })
        export class SecurityModule {}
      `,
    });
    const context = scanProject(root);
    expect(context.hasGlobalThrottler).toBe(true);
    expect(context.hasGlobalAuthGuard).toBe(false);
  });

  it('an APP_INTERCEPTOR or APP_FILTER is not a pipe', () => {
    const root = makeProject({
      'src/app.module.ts': `
        @Module({ providers: [
          { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
          { provide: APP_FILTER, useClass: AllExceptionsFilter },
        ] })
        export class AppModule {}
      `,
    });
    const context = scanProject(root);
    expect(context.hasGlobalValidationPipe).toBe(false);
    expect(context.hasGlobalAuthGuard).toBe(false);
    expect(context.hasGlobalThrottler).toBe(false);
  });

  it('an APP_PIPE token alone registers a global pipe', () => {
    const root = makeProject({
      'src/app.module.ts': `
        @Module({ providers: [{ provide: APP_PIPE, useClass: ValidationPipe }] })
        export class AppModule {}
      `,
    });
    expect(scanProject(root).hasGlobalValidationPipe).toBe(true);
  });

  it('assumes a factory-provided APP_GUARD authenticates', () => {
    const root = makeProject({
      'src/app.module.ts': `
        @Module({ providers: [{ provide: APP_GUARD, useFactory: () => buildGuard() }] })
        export class AppModule {}
      `,
    });
    expect(scanProject(root).hasGlobalAuthGuard).toBe(true);
  });

  it('accepts @Global() re-exported guard registration via useExisting', () => {
    const root = makeProject({
      'src/security.module.ts': `
        @Module({ providers: [{ provide: APP_GUARD, useExisting: SessionGuard }] })
        export class SecurityModule {}
      `,
    });
    expect(scanProject(root).hasGlobalAuthGuard).toBe(true);
  });

  it('finds useGlobalPipes / useGlobalGuards in the bootstrap file', () => {
    // brocoders/nestjs-boilerplate: src/main.ts
    const root = makeProject({
      'src/main.ts': `
        async function bootstrap() {
          const app = await NestFactory.create(AppModule);
          app.useGlobalPipes(new ValidationPipe({ transform: true }));
          app.useGlobalGuards(new AuthGuard());
        }
      `,
    });
    const context = scanProject(root);
    expect(context.hasGlobalValidationPipe).toBe(true);
    expect(context.hasGlobalAuthGuard).toBe(true);
  });

  it('does not take a ThrottlerModule import for rate limiting: nothing is bound', () => {
    // awesome-nest-boilerplate, aigotools, wewe-rss: the module is configured
    // and no ThrottlerGuard is registered anywhere, so no route is throttled.
    const root = makeProject({
      'src/throttler.module.ts': `
        @Module({ imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])] })
        export class ThrottlingModule {}
      `,
    });
    expect(scanProject(root).hasGlobalThrottler).toBe(false);
  });

  it.each([
    ['no arguments', 'ThrottlerModule.forRoot()'],
    ['an empty throttler list', 'ThrottlerModule.forRoot([])'],
    ['an empty list, spaced out', 'ThrottlerModule . forRoot ( [ ] )'],
    [
      'a spaced-out call',
      'ThrottlerModule . forRoot ( [ { ttl: 60000, limit: 10 } ] )',
    ],
    [
      'an options object',
      'ThrottlerModule.forRoot({ throttlers: [{ ttl: 1, limit: 1 }] })',
    ],
    ['a list held in a variable', 'ThrottlerModule.forRoot(throttlers)'],
  ])('a ThrottlerModule given %s binds nothing', (_label, call) => {
    // However it is configured, the module throttles no route by itself.
    const root = makeProject({
      'src/app.module.ts': `@Module({ imports: [${call}] }) export class AppModule {}`,
    });
    expect(scanProject(root).hasGlobalThrottler).toBe(false);
  });

  it('reports nothing for a project with no global registration', () => {
    const root = makeProject({
      'src/app.module.ts': `@Module({ controllers: [AppController] }) export class AppModule {}`,
    });
    const context = scanProject(root);
    expect(context.hasGlobalAuthGuard).toBe(false);
    expect(context.hasGlobalValidationPipe).toBe(false);
    expect(context.hasGlobalThrottler).toBe(false);
    expect(context.globalProviders.size).toBe(0);
  });
});

describe('scanProject — traversal', () => {
  it('ignores dependency and build directories', () => {
    const root = makeProject({
      'node_modules/pkg/app.module.ts': `{ provide: APP_GUARD, useClass: JwtAuthGuard }`,
      'dist/app.module.ts': `{ provide: APP_GUARD, useClass: JwtAuthGuard }`,
      '.cache/app.module.ts': `{ provide: APP_GUARD, useClass: JwtAuthGuard }`,
      'src/user.service.ts': `{ provide: APP_GUARD, useClass: JwtAuthGuard }`,
    });
    expect(scanProject(root).hasGlobalAuthGuard).toBe(false);
  });

  it('stops at the depth limit', () => {
    const root = makeProject({
      'src/deep/app.module.ts': `{ provide: APP_PIPE, useClass: ValidationPipe }`,
    });
    expect(scanProject(root, { maxDepth: 0 }).hasGlobalValidationPipe).toBe(
      false,
    );
    expect(scanProject(root, { maxDepth: 5 }).hasGlobalValidationPipe).toBe(
      true,
    );
  });

  it('stops at the entry budget', () => {
    const root = makeProject({
      'a/b/app.module.ts': `{ provide: APP_PIPE, useClass: ValidationPipe }`,
    });
    expect(scanProject(root, { maxEntries: 0 }).hasGlobalValidationPipe).toBe(
      false,
    );
    expect(scanProject(root, { maxEntries: 1 }).hasGlobalValidationPipe).toBe(
      false,
    );
  });

  it('survives an unreadable root', () => {
    expect(
      scanProject(join(tmpdir(), 'nestjs-security-does-not-exist')).root,
    ).toContain('nestjs-security-does-not-exist');
  });

  it('survives a module file it cannot read', () => {
    const root = makeProject({});
    symlinkSync(
      join(root, 'missing-target.ts'),
      join(root, 'broken.module.ts'),
    );
    expect(scanProject(root).hasGlobalAuthGuard).toBe(false);
  });
});

describe('findProjectRoot', () => {
  it('walks up to the nearest package.json', () => {
    const root = makeProject({ 'src/modules/user/user.module.ts': '' });
    expect(findProjectRoot(join(root, 'src', 'modules', 'user'))).toBe(root);
  });

  it('falls back to the starting directory when there is no package.json', () => {
    const orphan = mkdtempSync(join(tmpdir(), 'nestjs-security-orphan-'));
    roots.push(orphan);
    // tmpdir() has no package.json above it in CI or locally.
    expect(findProjectRoot(orphan)).toBe(orphan);
  });
});

describe('getProjectContext', () => {
  it('resolves the project from the linted file and caches the result', () => {
    const root = makeProject({
      'src/app.module.ts': `@Module({ providers: [{ provide: APP_PIPE, useClass: ValidationPipe }] })`,
    });

    const context = {
      filename: join(root, 'src', 'users.controller.ts'),
      cwd: root,
    };
    const first = getProjectContext(context);
    expect(first.hasGlobalValidationPipe).toBe(true);

    // Second call is served from the cache — same object identity.
    expect(getProjectContext(context)).toBe(first);

    clearProjectContextCache();
    expect(getProjectContext(context)).not.toBe(first);
  });

  it('resolves a relative filename against cwd', () => {
    const root = makeProject({
      'src/app.module.ts': `{ provide: APP_GUARD, useClass: JwtAuthGuard }`,
    });
    expect(
      getProjectContext({ filename: 'src/users.controller.ts', cwd: root })
        .hasGlobalAuthGuard,
    ).toBe(true);
  });

  it('never walks a filesystem root', () => {
    const context = getProjectContext({ filename: 'file.ts', cwd: '/' });
    expect(context.root).toBe('/');
    expect(context.hasGlobalAuthGuard).toBe(false);
    expect(context.hasGlobalValidationPipe).toBe(false);
    expect(context.hasGlobalThrottler).toBe(false);
    // A synthetic filename is not evidence that a project lacks auth.
    expect(context.hasAuthMechanism).toBe(true);
    expect(context.globalProviders.size).toBe(0);
    expect(context.authMiddlewareTargets.size).toBe(0);
  });

  it('answers for a filesystem root without reading a single directory', () => {
    vi.mocked(readdirSync).mockClear();
    getProjectContext({ filename: 'file.ts', cwd: '/' });
    expect(readdirSync).not.toHaveBeenCalled();
  });
});

/**
 * The two paths the barrel-following and custom-validator resolvers take when
 * the answer is *not* there. Both must terminate and return false — a resolver
 * that only gets tested on its success path is one that can loop or
 * over-conclude on real input.
 */

describe('scanProject — is there an authentication system at all', () => {
  it('reads an auth dependency out of the manifest', () => {
    const root = mkdtempSync(join(tmpdir(), 'nestjs-security-'));
    roots.push(root);
    writeFileSync(
      join(root, 'package.json'),
      '{"name":"app","dependencies":{"@nestjs/passport":"^10.0.0"}}',
    );
    expect(scanProject(root).hasAuthMechanism).toBe(true);
  });

  it('is false when the manifest declares nothing and no module names a guard', () => {
    // nest-framework/sample/06-mongoose and 23 of its siblings. Reporting each
    // of their routes produced 38 of 94 corpus findings and taught nothing.
    const root = makeProject({
      'src/cats/cats.module.ts': `
        @Module({ controllers: [CatsController], providers: [CatsService] })
        export class CatsModule {}
      `,
    });
    expect(scanProject(root).hasAuthMechanism).toBe(false);
  });

  it('is true for a hand-rolled guard with no dependency to declare', () => {
    // The clause that stops this from switching the rule off: a project can
    // authenticate with a CanActivate of its own and import nothing.
    const root = makeProject({
      'src/app.module.ts': `
        @Module({ providers: [{ provide: APP_GUARD, useClass: MyGuard }] })
        export class AppModule {}
      `,
    });
    expect(scanProject(root).hasAuthMechanism).toBe(true);
  });

  it('is true when the manifest cannot be read', () => {
    // "Cannot tell" must never read as "no auth here".
    const root = mkdtempSync(join(tmpdir(), 'nestjs-security-'));
    roots.push(root);
    expect(scanProject(root).hasAuthMechanism).toBe(true);
  });
});

describe('scanProject — authentication middleware', () => {
  it('collects the routes an auth middleware is applied to', () => {
    // realworld/src/article/article.module.ts — the canonical RealWorld
    // implementation authenticates entirely through middleware, so a
    // guard-only rule reported all 20 of its routes.
    const root = makeProject({
      'src/article/article.module.ts': `
        export class ArticleModule implements NestModule {
          public configure(consumer: MiddlewareConsumer) {
            consumer
              .apply(AuthMiddleware)
              .forRoutes(
                {path: 'articles/feed', method: RequestMethod.GET},
                {path: 'articles/:slug', method: RequestMethod.DELETE},
              );
          }
        }
      `,
    });
    const targets = scanProject(root).authMiddlewareTargets;
    expect(targets.has('articles')).toBe(true);
    // Only the first segment is kept: a parameterised tail cannot be lined up
    // with a @Controller prefix plus a handler path.
    expect(targets.has('articles/:slug')).toBe(false);
  });

  it('accepts a controller passed by class reference', () => {
    const root = makeProject({
      'src/user/user.module.ts': `
        export class UserModule implements NestModule {
          configure(consumer: MiddlewareConsumer) {
            consumer.apply(JwtMiddleware).forRoutes(UserController);
          }
        }
      `,
    });
    expect(scanProject(root).authMiddlewareTargets.has('UserController')).toBe(
      true,
    );
  });

  it('ignores middleware that is not authentication', () => {
    const root = makeProject({
      'src/app.module.ts': `
        export class AppModule implements NestModule {
          configure(consumer: MiddlewareConsumer) {
            consumer.apply(LoggerMiddleware).forRoutes('cats');
            consumer.apply(AuthLoggerMiddleware).forRoutes('dogs');
          }
        }
      `,
    });
    expect(scanProject(root).authMiddlewareTargets.size).toBe(0);
  });

  it('ignores an apply() with no forRoutes chained to it', () => {
    const root = makeProject({
      'src/app.module.ts': `
        export class AppModule implements NestModule {
          configure(consumer: MiddlewareConsumer) {
            consumer.apply(AuthMiddleware);
            const unrelated = compute();
            other.forRoutes('cats');
          }
        }
      `,
    });
    expect(scanProject(root).authMiddlewareTargets.size).toBe(0);
  });

  it('ignores a forRoutes whose argument list never closes', () => {
    const root = makeProject({
      'src/app.module.ts': `
        consumer.apply(AuthMiddleware).forRoutes('cats'
      `,
    });
    expect(scanProject(root).authMiddlewareTargets.size).toBe(0);
  });

  it('ignores a path that is only a route parameter', () => {
    const root = makeProject({
      'src/app.module.ts': `
        export class AppModule implements NestModule {
          configure(consumer: MiddlewareConsumer) {
            consumer.apply(AuthMiddleware).forRoutes({path: ':id', method: RequestMethod.ALL});
          }
        }
      `,
    });
    expect(scanProject(root).authMiddlewareTargets.size).toBe(0);
  });
});

describe('scanProject — the shapes forRoutes resolution must survive', () => {
  it('ignores an auth middleware in a file with no forRoutes at all', () => {
    const root = makeProject({
      'src/app.module.ts': `
        export class AppModule {
          configure(consumer) { consumer.apply(AuthMiddleware); }
        }
      `,
    });
    expect(scanProject(root).authMiddlewareTargets.size).toBe(0);
  });

  it('ignores a forRoutes that is referenced but never called', () => {
    const root = makeProject({
      'src/app.module.ts': `consumer.apply(AuthMiddleware).forRoutes`,
    });
    expect(scanProject(root).authMiddlewareTargets.size).toBe(0);
  });
});

describe('scanProject — nested calls inside forRoutes', () => {
  it('reads a forRoutes argument list containing a nested call', () => {
    // The paren counter earns its place here: stopping at the first `)` would
    // truncate the list after `routesOf(...)` and lose every later entry.
    const root = makeProject({
      'src/app.module.ts': `
        export class AppModule implements NestModule {
          configure(consumer: MiddlewareConsumer) {
            consumer
              .apply(AuthMiddleware)
              .forRoutes(routesOf(AdminController), {path: 'billing', method: RequestMethod.ALL});
          }
        }
      `,
    });
    const targets = scanProject(root).authMiddlewareTargets;
    expect(targets.has('AdminController')).toBe(true);
    expect(targets.has('billing')).toBe(true);
  });
});

describe('scanProject — which class a global provider binds', () => {
  const bind = (token: string, cls: string, imports: string): string => `
    ${imports}
    @Module({ providers: [{ provide: ${token}, useClass: ${cls} }] })
    export class AppModule {}
  `;
  const scan = (files: Record<string, string>) =>
    scanProject(makeProject(files));

  it('reads ThrottlerGuard from its @nestjs/throttler import', () => {
    const context = scan({
      'src/app.module.ts': bind(
        'APP_GUARD',
        'ThrottlerGuard',
        "import { ThrottlerGuard } from '@nestjs/throttler';",
      ),
    });
    expect(context.hasGlobalThrottler).toBe(true);
    expect(context.hasGlobalAuthGuard).toBe(false);
  });

  it('sees through an alias of ThrottlerGuard, in either direction', () => {
    expect(
      scan({
        'src/app.module.ts': bind(
          'APP_GUARD',
          'RateGuard',
          "import { ThrottlerGuard as RateGuard } from '@nestjs/throttler';",
        ),
      }).hasGlobalThrottler,
    ).toBe(true);
    // Named like the guard, imported as something else: an auth guard.
    const context = scan({
      'src/app.module.ts': bind(
        'APP_GUARD',
        'ThrottlerGuard',
        "import { ThrottlerStorage as ThrottlerGuard } from '@nestjs/throttler';",
      ),
    });
    expect(context.hasGlobalThrottler).toBe(false);
    expect(context.hasGlobalAuthGuard).toBe(true);
  });

  it('follows a relative import to a subclass whose name says nothing', () => {
    // ack-nestjs-boilerplate binds RequestThrottleByUserGuard: no "Throttler"
    // in the name, so the name pattern took it for an authentication guard.
    const context = scan({
      'src/app.module.ts': bind(
        'APP_GUARD',
        'PerUserGuard',
        "import { type Other, PerUserGuard } from './guards/per-user.guard';",
      ),
      'src/guards/per-user.guard.ts': `
        import { ThrottlerGuard } from '@nestjs/throttler';
        @Injectable()
        export class PerUserGuard extends ThrottlerGuard {}
      `,
    });
    expect(context.hasGlobalThrottler).toBe(true);
    expect(context.hasGlobalAuthGuard).toBe(false);
  });

  it('follows a subclass bound as APP_INTERCEPTOR through a barrel', () => {
    // novu: ApiRateLimitInterceptor extends ThrottlerGuard, imported from
    // './app/rate-limiting/guards' and registered as an interceptor.
    const context = scan({
      'src/app.module.ts': bind(
        'APP_INTERCEPTOR',
        'ApiRateLimitInterceptor',
        "import { ApiRateLimitInterceptor } from './rate-limiting/guards';",
      ),
      'src/rate-limiting/guards/index.ts': `
        export * from './missing';
        export * from './other.guard';
        export * from './throttler.guard';
      `,
      'src/rate-limiting/guards/other.guard.ts': `export class OtherGuard {}`,
      'src/rate-limiting/guards/throttler.guard.ts': `
        import { ThrottlerGuard } from '@nestjs/throttler';
        export class ApiRateLimitInterceptor<T> extends ThrottlerGuard implements NestInterceptor {}
      `,
    });
    expect(context.hasGlobalThrottler).toBe(true);
    // An interceptor is never the project's authentication.
    expect(context.hasGlobalAuthGuard).toBe(false);
  });

  it('follows a named re-export and a subclass of a subclass in one file', () => {
    const context = scan({
      'src/app.module.ts': bind(
        'APP_GUARD',
        'Renamed',
        "import { Renamed } from './guards';",
      ),
      'src/guards/index.ts': `export { ProxyGuard as Renamed } from './proxy.guard';`,
      'src/guards/proxy.guard.ts': `
        import { ThrottlerGuard } from '@nestjs/throttler';
        class BaseGuard extends ThrottlerGuard {}
        export class ProxyGuard extends BaseGuard {}
      `,
    });
    expect(context.hasGlobalThrottler).toBe(true);
  });

  it("resolves the rootDir spellings 'src/…' and '@/…' against the project", () => {
    // truthy and meimei-admin import their guard as 'src/common/guard/…'.
    const guard = `
      import { ThrottlerGuard } from '@nestjs/throttler';
      export class CustomGuard extends ThrottlerGuard {}
    `;
    for (const specifier of [
      'src/common/custom.guard',
      '@/common/custom.guard',
    ])
      expect(
        scan({
          'src/app.module.ts': bind(
            'APP_GUARD',
            'CustomGuard',
            `import { CustomGuard } from '${specifier}';`,
          ),
          'src/common/custom.guard.ts': guard,
        }).hasGlobalThrottler,
      ).toBe(true);
  });

  it('records an APP_FILTER and concludes nothing from it', () => {
    const context = scan({
      'src/app.module.ts': bind('APP_FILTER', 'AllExceptionsFilter', ''),
    });
    expect([...context.globalProviders]).toEqual(['APP_FILTER']);
    expect(context.hasGlobalAuthGuard).toBe(false);
    expect(context.hasGlobalThrottler).toBe(false);
    expect(context.hasGlobalValidationPipe).toBe(false);
  });

  it('does not take a class for a throttler because of its name', () => {
    // Declared here, extending nothing: whatever it is called, it cannot be one.
    const context = scan({
      'src/app.module.ts': `
        @Injectable()
        export class ThrottlerLikeGuard implements CanActivate {}
        @Module({ providers: [{ provide: APP_GUARD, useClass: ThrottlerLikeGuard }] })
        export class AppModule {}
      `,
    });
    expect(context.hasGlobalThrottler).toBe(false);
    expect(context.hasGlobalAuthGuard).toBe(true);
  });

  it('does not confuse a class with another whose name it prefixes', () => {
    const context = scan({
      'src/app.module.ts': bind(
        'APP_GUARD',
        'Auth',
        "import { Auth } from './auth.guard';",
      ),
      'src/auth.guard.ts': `
        import { ThrottlerGuard } from '@nestjs/throttler';
        export class AuthThrottle extends ThrottlerGuard {}
        export class Auth implements CanActivate {}
      `,
    });
    expect(context.hasGlobalThrottler).toBe(false);
    expect(context.hasGlobalAuthGuard).toBe(true);
  });

  it('falls back to the name only when the class is out of reach', () => {
    // An alias the scan cannot resolve, a package, and a file that is missing.
    for (const from of ['@common/guards', 'some-package', './missing'])
      for (const [cls, throttles] of [
        ['CustomThrottlerGuard', true],
        ['JwtAuthGuard', false],
      ] as const) {
        const context = scan({
          'src/app.module.ts': bind(
            'APP_GUARD',
            cls,
            `import { ${cls} } from '${from}';`,
          ),
        });
        expect(context.hasGlobalThrottler).toBe(throttles);
        expect(context.hasGlobalAuthGuard).toBe(!throttles);
      }
  });

  it('gives up on a chain longer than it is willing to read', () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 6; i++)
      files[`src/g${i}.ts`] = `export { Guard } from './g${i + 1}';`;
    files['src/g6.ts'] = `
      import { ThrottlerGuard } from '@nestjs/throttler';
      export class Guard extends ThrottlerGuard {}
    `;
    const root = makeProject(files);
    const read = (hops: number) =>
      isThrottlerGuard(
        'Guard',
        "import { Guard } from './g3';",
        join(root, 'src/app.module.ts'),
        root,
        hops,
      );
    // The module, g3, g4, g5, g6, then the parent class inside g6: six steps.
    expect(read(6)).toBe(true);
    expect(read(5)).toBe(null);
    expect(read(0)).toBe(null);
  });

  it('reads a class whose name carries a $', () => {
    expect(
      isThrottlerGuard(
        'Guard$',
        `import { ThrottlerGuard } from "@nestjs/throttler";
         class Guard$ extends ThrottlerGuard {}`,
        '/x/app.module.ts',
        '/x',
      ),
    ).toBe(true);
  });
});

describe('scanProject — an upload limit set in MulterModule', () => {
  const scan = (imports: string) =>
    scanProject(
      makeProject({
        'src/files.module.ts': `@Module({ imports: [${imports}] }) export class FilesModule {}`,
      }),
    ).hasModuleUploadLimit;

  it('finds limits.fileSize in register()', () => {
    expect(
      scan(
        "MulterModule.register({ storage: diskStorage({ destination: dir('up') }), limits: { fileSize: 5e6 } })",
      ),
    ).toBe(true);
  });

  it('finds it in an inline registerAsync factory', () => {
    // brocoders/nestjs-boilerplate: src/files/infrastructure/uploader/local
    expect(
      scan(`MulterModule.registerAsync({
        inject: [ConfigService],
        useFactory: (config) => ({ limits: { fileSize: config.get('file.maxFileSize') } }),
      })`),
    ).toBe(true);
  });

  it('finds none where the registration sets none', () => {
    // teable: MulterModule.register({ storage: multer.diskStorage({}) })
    expect(
      scan('MulterModule.register({ storage: multer.diskStorage({}) })'),
    ).toBe(false);
    // meimei-admin: a factory that returns storage and nothing else.
    expect(
      scan(
        'MulterModule.registerAsync({ useFactory: async () => ({ storage: storage(path) }) })',
      ),
    ).toBe(false);
    expect(scan('MulterModule.register()')).toBe(false);
    expect(scan('OtherModule')).toBe(false);
  });

  it('does not read a fileSize that belongs to something after the call', () => {
    expect(
      scan(
        'MulterModule.register({ dest: up(1) }), Other.register({ fileSize: 1 })',
      ),
    ).toBe(false);
  });

  it('assumes a limit when the options are built by a class it cannot read', () => {
    expect(
      scan('MulterModule.registerAsync({ useClass: MulterConfigService })'),
    ).toBe(true);
  });

  it('looks at every registration, not just the first', () => {
    expect(
      scan(
        'MulterModule.register({}), MulterModule.register({ limits: { fileSize: 1 } })',
      ),
    ).toBe(true);
  });

  it('survives a registration the file never closes', () => {
    expect(scan('MulterModule.register({ dest: "x"')).toBe(false);
  });
});

describe('scanProject — where a forRoutes argument list starts and ends', () => {
  const targetsOf = (source: string): string[] =>
    [
      ...scanProject(makeProject({ 'src/app.module.ts': source }))
        .authMiddlewareTargets,
    ].sort();

  it('reads only the argument list, not the strings around it', () => {
    expect(
      targetsOf(
        `import x from 'dogs'; consumer.apply(AuthMiddleware).forRoutes('cats'); other('birds', BirdsController);`,
      ),
    ).toEqual(['cats']);
  });

  it('an apply() that ends the file takes no routes from an earlier call', () => {
    expect(targetsOf(`x('cats'); consumer.apply(AuthMiddleware);`)).toEqual([]);
  });

  it('a forRoutes with no call after it takes no routes from earlier text', () => {
    expect(
      targetsOf(`'cats') consumer.apply(AuthMiddleware).forRoutes`),
    ).toEqual([]);
  });

  it('follows the chain through an exclude() between apply and forRoutes', () => {
    expect(
      targetsOf(
        `consumer.apply(AuthMiddleware).exclude('health').forRoutes('cats');`,
      ),
    ).toEqual(['cats']);
  });

  it("takes the nearest forRoutes, not a later statement's", () => {
    expect(
      targetsOf(
        `c.apply(AuthMiddleware).forRoutes('cats'); c.apply(Log).forRoutes('dogs');`,
      ),
    ).toEqual(['cats']);
  });

  it('accepts whitespace between forRoutes and its parenthesis', () => {
    expect(
      targetsOf(`consumer.apply(AuthMiddleware).forRoutes ('cats');`),
    ).toEqual(['cats']);
  });

  it('accepts exactly 40 characters between apply and forRoutes, not 41', () => {
    const chained = (gap: number): string =>
      `consumer.apply(AuthMiddleware)${' '.repeat(gap)}.forRoutes('cats');`;
    expect(targetsOf(chained(40))).toEqual(['cats']);
    expect(targetsOf(chained(41))).toEqual([]);
  });

  it('ignores middleware whose name says nothing about authentication', () => {
    expect(
      targetsOf(`consumer.apply(RequestIdMiddleware).forRoutes('cats');`),
    ).toEqual([]);
  });

  it('skips the empty segment a leading slash produces', () => {
    expect(
      targetsOf(`consumer.apply(AuthMiddleware).forRoutes('/cats/:id');`),
    ).toEqual(['cats']);
  });

  it('takes nothing from a path that is only a slash', () => {
    expect(targetsOf(`consumer.apply(AuthMiddleware).forRoutes('/');`)).toEqual(
      [],
    );
  });
});

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

import { afterEach, describe, expect, it } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
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
  scanProject,
} from './project-context';

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
    expect(scanProject(root).hasGlobalAuthGuard).toBe(true);
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

  it('finds ThrottlerModule.forRoot in any module file', () => {
    const root = makeProject({
      'src/throttler.module.ts': `
        @Module({ imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])] })
        export class ThrottlingModule {}
      `,
    });
    expect(scanProject(root).hasGlobalThrottler).toBe(true);
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
    expect(context.globalProviders.size).toBe(0);
  });
});

/**
 * The two paths the barrel-following and custom-validator resolvers take when
 * the answer is *not* there. Both must terminate and return false — a resolver
 * that only gets tested on its success path is one that can loop or
 * over-conclude on real input.
 */

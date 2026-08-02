/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * End-to-end regression tests for global DI registration.
 *
 * These are the false positives that made the `recommended` preset unusable on
 * real NestJS boilerplates: 93 `require-guards`, 93 `require-throttler` and 40
 * `no-missing-validation-pipe` findings on ack-nestjs-boilerplate, plus 17
 * `no-missing-validation-pipe` on brocoders/nestjs-boilerplate — every one of
 * them caused by a registration that lives in a *different file* from the
 * controller.
 *
 * The fixtures are written to a real temporary project because the rules
 * resolve the project root from `context.filename` and read the module files
 * off disk.
 */

import { afterAll, describe } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { requireGuards } from './rules/require-guards';
import { requireThrottler } from './rules/require-throttler';
import { noMissingValidationPipe } from './rules/no-missing-validation-pipe';
import { noExposedDebugEndpoints } from './rules/no-exposed-debug-endpoints';
import { clearProjectContextCache } from './utils/project-context';

/** Build a throwaway NestJS project on disk and return its root. */
function makeProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'nestjs-security-e2e-'));
  writeFileSync(join(root, 'package.json'), '{"name":"fixture"}');
  for (const [relative, contents] of Object.entries(files)) {
    const target = join(root, relative);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, contents);
  }
  return root;
}

/** ack-nestjs-boilerplate: guard + pipe + throttler all registered via DI. */
const ackLike = makeProject({
  'src/common/request/request.module.ts': `
    @Module({
      providers: [
        { provide: APP_INTERCEPTOR, useClass: RequestTimeoutInterceptor },
        { provide: APP_PIPE, useFactory: () => new ValidationPipe({ whitelist: true }) },
      ],
    })
    export class RequestModule {}
  `,
  'src/common/request/request.middleware.module.ts': `
    @Module({
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
      imports: [ThrottlerModule.forRootAsync({ useFactory: () => ({}) })],
    })
    export class RequestMiddlewareModule {}
  `,
  'src/auth/auth.module.ts': `
    @Module({ providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }] })
    export class AuthModule {}
  `,
});

/** brocoders/nestjs-boilerplate: the pipe is registered in main.ts. */
const brocodersLike = makeProject({
  'src/main.ts': `
    async function bootstrap() {
      const app = await NestFactory.create(AppModule);
      app.useGlobalPipes(new ValidationPipe({ transform: true }));
      await app.listen(3000);
    }
  `,
});

/** No global registration anywhere — the rules must still fire. */
const bareProject = makeProject({
  'src/app.module.ts': `
    @Module({ controllers: [UsersController] })
    export class AppModule {}
  `,
});

afterAll(() => {
  clearProjectContextCache();
  for (const root of [ackLike, brocodersLike, bareProject]) {
    rmSync(root, { recursive: true, force: true });
  }
});

const ruleTester = new RuleTester();

const UNGUARDED_CONTROLLER = `
  @Controller('users')
  export class UsersController {
    @Get('/list')
    findAll() {}
  }
`;

const UNVALIDATED_CONTROLLER = `
  @Controller('users')
  export class UsersController {
    @Post()
    create(@Body() dto: CreateUserDto) {}
  }
`;

describe('global DI registration is honoured across files', () => {
  ruleTester.run('require-guards + APP_GUARD', requireGuards, {
    valid: [
      {
        code: UNGUARDED_CONTROLLER,
        filename: join(ackLike, 'src/users/users.controller.ts'),
      },
      {
        // detectGlobalGuards can be turned off explicitly
        code: UNGUARDED_CONTROLLER,
        filename: join(bareProject, 'src/users/users.controller.ts'),
        options: [{ detectGlobalGuards: false, publicRoutePatterns: ['findAll'] }],
      },
    ],
    invalid: [
      {
        // A ThrottlerGuard registered as APP_GUARD is not authentication.
        code: UNGUARDED_CONTROLLER,
        filename: join(brocodersLike, 'src/users/users.controller.ts'),
        errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
      },
      {
        code: UNGUARDED_CONTROLLER,
        filename: join(bareProject, 'src/users/users.controller.ts'),
        errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
      },
      {
        code: UNGUARDED_CONTROLLER,
        filename: join(ackLike, 'src/users/users.controller.ts'),
        options: [{ detectGlobalGuards: false }],
        errors: [{ messageId: 'missingGuards', data: { name: 'findAll' } }],
      },
    ],
  });

  ruleTester.run('no-missing-validation-pipe + APP_PIPE', noMissingValidationPipe, {
    valid: [
      {
        code: UNVALIDATED_CONTROLLER,
        filename: join(ackLike, 'src/users/users.controller.ts'),
      },
      {
        code: UNVALIDATED_CONTROLLER,
        filename: join(brocodersLike, 'src/users/users.controller.ts'),
      },
    ],
    invalid: [
      {
        code: UNVALIDATED_CONTROLLER,
        filename: join(bareProject, 'src/users/users.controller.ts'),
        errors: [{ messageId: 'missingValidation' }],
      },
      {
        code: UNVALIDATED_CONTROLLER,
        filename: join(ackLike, 'src/users/users.controller.ts'),
        options: [{ detectGlobalPipes: false }],
        errors: [{ messageId: 'missingValidation' }],
      },
    ],
  });

  ruleTester.run('require-throttler + ThrottlerModule', requireThrottler, {
    valid: [
      {
        // ThrottlerModule lives in a middleware module, not in AppModule
        code: `@Module({ imports: [RequestMiddlewareModule] }) export class AppModule {}`,
        filename: join(ackLike, 'src/app/app.module.ts'),
      },
    ],
    invalid: [
      {
        code: `@Module({ imports: [UsersModule] }) export class AppModule {}`,
        filename: join(brocodersLike, 'src/app.module.ts'),
        errors: [{ messageId: 'missingThrottler', data: { name: 'AppModule' } }],
      },
    ],
  });

  ruleTester.run('no-exposed-debug-endpoints + APP_GUARD', noExposedDebugEndpoints, {
    valid: [
      {
        code: `
          @Controller('app')
          class AppController {
            @Get('debug')
            debug() {}
          }
        `,
        filename: join(ackLike, 'src/app/app.controller.ts'),
      },
    ],
    invalid: [
      {
        code: `
          @Controller('app')
          class AppController {
            @Get('debug')
            debug() {}
          }
        `,
        filename: join(bareProject, 'src/app/app.controller.ts'),
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: `
          @Controller('app')
          class AppController {
            @Get('debug')
            debug() {}
          }
        `,
        filename: join(ackLike, 'src/app/app.controller.ts'),
        options: [{ detectGlobalGuards: false }],
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});

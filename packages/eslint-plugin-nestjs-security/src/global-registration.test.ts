/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Cross-file global registrations.
 *
 * A NestJS application registers its guard, pipe and throttler once — in a
 * module or in `main.ts` — and every route inherits it. None of that is visible
 * from the file holding the route, so a rule that only reads one file reports
 * the entire application.
 *
 * Four rules consult `getProjectContext` to avoid that. This file locks the
 * wiring, because losing it is silent and expensive: it was dropped once while
 * reconciling a merge and the corpus went from 133 errors to 331 — with the
 * whole suite still green, because nothing asserted the connection existed.
 *
 * The scan itself is unit-tested in `utils/project-context.test.ts` against
 * real fixture directories. What is tested here is the *wiring*: given a
 * project that registers something app-wide, does each rule fall silent, and
 * does its `detectGlobal*` option turn that off again.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';

const context = {
  root: '/fake',
  globalProviders: new Set<string>(),
  hasGlobalAuthGuard: false,
  hasGlobalValidationPipe: false,
  hasGlobalThrottler: false,
  // The rule under test only reports where guards are the mechanism in use, so
  // this fixture has to look like a project that authenticates. Leaving it
  // false made every case here silent for the wrong reason.
  hasAuthMechanism: true,
  authMiddlewareTargets: new Set<string>(),
};

vi.mock('./utils/project-context', () => ({
  getProjectContext: () => context,
  clearProjectContextCache: () => {},
}));

const { rules } = await import('./index');
const linter = new Linter({ configType: 'flat' });

beforeEach(() => {
  context.hasGlobalAuthGuard = false;
  context.hasGlobalValidationPipe = false;
  context.hasGlobalThrottler = false;
  context.hasAuthMechanism = true;
  context.authMiddlewareTargets = new Set<string>();
});

function run(rule: string, code: string, options?: unknown): number {
  return linter
    .verify(
      code,
      {
        files: ['**/*.ts'],
        languageOptions: {
          parser: tsParser as never,
          parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        },
        plugins: { n: { rules } as never },
        rules: { [`n/${rule}`]: options ? ['error', options] : 'error' },
      } as never,
      'app.controller.ts',
    )
    .filter((m) => m.ruleId === `n/${rule}`).length;
}

interface Case {
  rule: string;
  code: string;
  /**
   * Options every assertion in this file applies to the case.
   *
   * `no-missing-validation-pipe` needs them: by default it reports only shapes
   * no pipe could validate, and a global pipe cannot validate those either, so
   * its default-mode findings are unsuppressable by design. The suppression
   * this file is testing lives in `requireExplicitPipe` mode, on a typed DTO.
   */
  baseOptions?: Record<string, unknown>;
  /** The context flag the app-wide registration sets. */
  flag: keyof typeof context;
  /** The option that turns the scan off. */
  option: string;
}

const CASES: Case[] = [
  {
    rule: 'require-guards',
    flag: 'hasGlobalAuthGuard',
    option: 'detectGlobalGuards',
    code: `
      @Controller('users')
      class UsersController {
        @Delete(':id')
        remove(@Param('id') id: string) {}
      }
    `,
  },
  {
    rule: 'no-missing-validation-pipe',
    flag: 'hasGlobalValidationPipe',
    option: 'detectGlobalPipes',
    baseOptions: { requireExplicitPipe: true },
    code: `
      @Controller('users')
      class UsersController {
        @Post()
        create(@Body() payload: CreateUserDto) {}
      }
    `,
  },
  {
    rule: 'require-throttler',
    flag: 'hasGlobalThrottler',
    option: 'detectGlobalThrottler',
    code: `
      @Controller('auth')
      class AuthController {
        @Post('login')
        login(@Body() dto: LoginDto) {}
      }
    `,
  },
];

describe('rules consult the project scan for global registrations', () => {
  // Ordered first on purpose: every "stays silent" assertion below passes
  // vacuously if the rule never fires at all, so prove it fires.
  it.each(CASES)(
    '$rule reports when nothing is registered app-wide',
    ({ rule, code, baseOptions }) => {
      expect(run(rule, code, baseOptions)).toBeGreaterThan(0);
    },
  );

  it.each(CASES)(
    '$rule stays silent once $flag is set',
    ({ rule, code, flag, baseOptions }) => {
      (context[flag] as boolean) = true;
      expect(run(rule, code, baseOptions)).toBe(0);
    },
  );

  it.each(CASES)(
    '$rule reports again with $option disabled',
    ({ rule, code, flag, option, baseOptions }) => {
      (context[flag] as boolean) = true;
      expect(
        run(rule, code, { ...baseOptions, [option]: false }),
      ).toBeGreaterThan(0);
    },
  );
});

describe('require-guards consults the rest of the project scan', () => {
  it('stays silent in a project with no authentication system at all', () => {
    // Nothing to forget a guard on. 38 of 94 corpus1 findings were NestJS's
    // own tutorial samples, none of which authenticate anything.
    context.hasAuthMechanism = false;
    expect(
      run(
        'require-guards',
        `
          @Controller('cats')
          class CatsController {
            @Get('all')
            findAll() {}
          }
        `,
      ),
    ).toBe(0);
  });

  it('stays silent for a controller an auth middleware covers, by class name', () => {
    context.authMiddlewareTargets = new Set(['CatsController']);
    expect(
      run(
        'require-guards',
        `
          @Controller('cats')
          class CatsController {
            @Get('all')
            findAll() {}
          }
        `,
      ),
    ).toBe(0);
  });

  it('stays silent when the middleware prefix matches the controller path', () => {
    context.authMiddlewareTargets = new Set(['cats']);
    expect(
      run(
        'require-guards',
        `
          @Controller('cats')
          class CatsController {
            @Get('all')
            findAll() {}
          }
        `,
      ),
    ).toBe(0);
  });

  it('falls back to the handler path when the controller carries no prefix', () => {
    // realworld/src/user/user.controller.ts — `@Controller()` with `@Get('user')`,
    // and user.module.ts applies AuthMiddleware to `{path: 'user'}`.
    context.authMiddlewareTargets = new Set(['user']);
    expect(
      run(
        'require-guards',
        `
          @Controller()
          class UserController {
            @Get('user')
            findMe(@User() user) {}
          }
        `,
      ),
    ).toBe(0);
  });

  it('still reports a controller the middleware does not cover', () => {
    context.authMiddlewareTargets = new Set(['articles']);
    expect(
      run(
        'require-guards',
        `
          @Controller('admin')
          class AdminController {
            @Delete(':id')
            remove(@Param('id') id) {}
          }
        `,
      ),
    ).toBeGreaterThan(0);
  });
});

describe('a global guard does not satisfy a specific requiredGuards list', () => {
  it('keeps reporting when the required guard cannot be shown to be the global one', () => {
    // The scan reads module text and records only that *a* guard is registered.
    // Treating that as proof of a RolesGuard requirement would clear every
    // route in the project of a requirement nothing enforces.
    context.hasGlobalAuthGuard = true;
    expect(
      run(
        'require-guards',
        `
          @Controller('admin')
          class AdminController {
            @Delete(':id')
            remove(@Param('id') id) {}
          }
        `,
        { requiredGuards: ['RolesGuard'] },
      ),
    ).toBeGreaterThan(0);
  });

  it('still goes quiet with no requiredGuards configured', () => {
    context.hasGlobalAuthGuard = true;
    expect(
      run(
        'require-guards',
        `
          @Controller('admin')
          class AdminController {
            @Delete(':id')
            remove(@Param('id') id) {}
          }
        `,
      ),
    ).toBe(0);
  });
});

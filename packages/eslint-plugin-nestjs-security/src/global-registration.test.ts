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
  hasWhitelistingValidationPipe: false,
  hasGlobalThrottler: false,
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
  context.hasWhitelistingValidationPipe = false;
  context.hasGlobalThrottler = false;
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
    rule: 'no-exposed-debug-endpoints',
    flag: 'hasGlobalAuthGuard',
    option: 'detectGlobalGuards',
    code: `
      @Controller('internal')
      class OpsController {
        @Get('debug')
        dump() {}
      }
    `,
  },
  {
    rule: 'no-missing-validation-pipe',
    flag: 'hasGlobalValidationPipe',
    option: 'detectGlobalPipes',
    code: `
      @Controller('users')
      class UsersController {
        @Post()
        create(@Body() payload) {}
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
    ({ rule, code }) => {
      expect(run(rule, code)).toBeGreaterThan(0);
    },
  );

  it.each(CASES)(
    '$rule stays silent once $flag is set',
    ({ rule, code, flag }) => {
      (context[flag] as boolean) = true;
      expect(run(rule, code)).toBe(0);
    },
  );

  it.each(CASES)(
    '$rule reports again with $option disabled',
    ({ rule, code, flag, option }) => {
      (context[flag] as boolean) = true;
      expect(run(rule, code, { [option]: false })).toBeGreaterThan(0);
    },
  );
});

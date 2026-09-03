/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock — ESLint 9 traversal crashes on realistic Lambda handlers.
 *
 * npm `eslint-plugin-lambda-security@1.2.3` crashed the real ESLint 9.39 CLI on
 * AI-generated Lambda handlers (the eslint-benchmark-suite lambda-ai-corpus):
 *
 *   - no-error-swallowing          → RangeError: Maximum call stack size exceeded
 *       (a hand-rolled AST walker recursed through the cyclic `node.parent`)
 *   - require-timeout-handling     → Error: Unknown class name: exit
 *   - no-missing-authorization-check→ Error: Unknown class name: exit
 *   - no-unbounded-batch-processing → Error: Unknown class name: exit
 *       (a grouped `:exit` selector — `'A:exit, B:exit, C:exit'` — only the
 *        trailing `:exit` is stripped by ESLint, so esquery saw a bare `:exit`)
 *
 * Source has since moved no-error-swallowing to a getText()+regex check and split
 * the grouped selectors into one key each. This test pins both: it lints a
 * realistic handler (deeply-nested try/catch + async handler with
 * AbortController/setTimeout + an event.Records batch loop + a sensitive call)
 * and asserts every affected rule reports WITHOUT throwing. Revert either fix and
 * `linter.verify` throws → this test goes red.
 *
 * The config carries a `files` glob + a `.ts` filename on purpose: without it,
 * flat config returns "No matching configuration found" and the rule never runs,
 * so `not.toThrow()` would pass vacuously. The per-rule finding-count assertions
 * below are the backstop — if the config ever stops matching, the reporting rules
 * drop to 0 findings and this suite goes red.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import plugin, { configs } from './index';

// Exercises all four crash paths in one file: a FunctionDeclaration with
// deeply-nested un-logged catch bodies (no-error-swallowing recursion bait),
// a FunctionExpression, and an async arrow handler with AbortController +
// setTimeout, an `event.Records` batch loop, and a sensitive `db.query`
// (the `ArrowFunctionExpression:exit` traversal that threw on esquery).
const REALISTIC_HANDLER = `
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

function validateChain(ip: string): boolean {
  try {
    try {
      try {
        return check(ip);
      } catch (a) {
        return false;
      }
    } catch (b) {
      return false;
    }
  } catch (c) {
    return true;
  }
}

const double = function (n: number) { return n * 2; };

export const handler = async (event: APIGatewayProxyEventV2, context: any) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    for (const record of event.Records) {
      await db.query('SELECT 1', { signal: controller.signal });
    }
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    return { statusCode: 502, body: 'fail' };
  } finally {
    clearTimeout(timer);
  }
};
`;

const linter = new Linter({ configType: 'flat' });
const languageOptions = {
  ecmaVersion: 2022 as const,
  sourceType: 'module' as const,
  parser: tsParser,
};

function lintWithRule(rule: string) {
  return linter.verify(
    REALISTIC_HANDLER,
    {
      files: ['**/*.ts'],
      languageOptions,
      plugins: { 'lambda-security': plugin },
      rules: { [`lambda-security/${rule}`]: 'error' },
    },
    { filename: 'handler.ts' },
  );
}

// Expected findings on REALISTIC_HANDLER. The >=1 entries double as the
// "config actually matched and the rule ran" backstop; require-timeout-handling
// is 0 because the AbortController + setTimeout is a valid timeout mechanism
// (locks that abort/timeout is recognised, not falsely flagged, and not crashed).
const EXPECTED: Record<string, (n: number) => boolean> = {
  'no-error-swallowing': (n) => n >= 1,
  'require-timeout-handling': (n) => n === 0,
  'no-missing-authorization-check': (n) => n >= 1,
  'no-unbounded-batch-processing': (n) => n >= 1,
};

describe('ESLint 9 traversal regression (lambda-ai-corpus handler-01 shape)', () => {
  it.each(Object.keys(EXPECTED))(
    'rule "%s" lints the nested-try/catch + abort handler without throwing',
    (rule) => {
      expect(() => lintWithRule(rule)).not.toThrow();

      const messages = lintWithRule(rule);
      // Never a fatal/parse error, and never the "No matching configuration"
      // sentinel that would make the no-throw check vacuous.
      expect(messages.some((m) => m.fatal)).toBe(false);
      expect(
        messages.some((m) => m.message.includes('No matching configuration')),
      ).toBe(false);

      const own = messages.filter(
        (m) => m.ruleId === `lambda-security/${rule}`,
      ).length;
      expect(EXPECTED[rule](own)).toBe(true);
    },
  );

  it('configs.recommended lints the handler without throwing and still reports', () => {
    const run = () =>
      linter.verify(
        REALISTIC_HANDLER,
        [
          { files: ['**/*.ts'], languageOptions },
          { files: ['**/*.ts'], ...configs.recommended },
        ],
        { filename: 'handler.ts' },
      );

    expect(run).not.toThrow();
    const messages = run();
    expect(messages.some((m) => m.fatal)).toBe(false);
    // Proves the rules actually ran rather than silently no-op'ing.
    expect(messages.some((m) => m.ruleId?.startsWith('lambda-security/'))).toBe(
      true,
    );
  });
});

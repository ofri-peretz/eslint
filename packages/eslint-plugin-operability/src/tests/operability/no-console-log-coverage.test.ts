/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage-completion tests for no-console-log.
 *
 * Layer 1 (RuleTester through the real parser): logger auto-detection
 * negative paths (namespace imports, non-logger import/require names),
 * autoDetectLogger opt-out, and ignorePaths exact/directory matching.
 *
 * Layer 2 (createWithMockContext + synthetic AST): parser-unreachable
 * branches — a schema-invalid strategy hitting the switch `default`,
 * a CallExpression with no parent statement (findParentStatement → null),
 * and a node with no `loc` (line falls back to 0).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESLint } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noConsoleLog } from '../../rules/operability/no-console-log';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-console-log — coverage completion (Layer 1: RuleTester)', () => {
  ruleTester.run('logger detection negative paths', noConsoleLog, {
    valid: [
      // ignorePaths exact-match branch: normalizedPath === normalizedPattern
      {
        code: 'console.log("ignored by exact path");',
        filename: 'src/ignored/file.ts',
        options: [{ ignorePaths: ['src/ignored/file.ts'] }],
      },
      // ignorePaths directory-prefix branch: normalizedPath startsWith pattern + '/'
      {
        code: 'console.log("ignored by directory prefix");',
        filename: 'src/ignored/deep/file.ts',
        options: [{ ignorePaths: ['src/ignored'] }],
      },
    ],
    invalid: [
      // autoDetectLogger: false — the `if (autoDetectLogger)` false path.
      // Converts using the default 'logger' name since detection is off.
      {
        code: "import pino from 'pino';\nconsole.log('x');",
        options: [{ strategy: 'convert', autoDetectLogger: false }],
        output: "import pino from 'pino';\nlogger.debug('x');",
        errors: [{ messageId: 'consoleLogFound' }],
      },
      // Namespace import specifier — neither ImportDefaultSpecifier nor
      // ImportSpecifier, so the specifier-type guard's false path runs.
      // No logger detected → converts to default 'logger'.
      {
        code: "import * as winstonNs from 'winston';\nconsole.log('x');",
        options: [{ strategy: 'convert' }],
        output: "import * as winstonNs from 'winston';\nlogger.debug('x');",
        errors: [{ messageId: 'consoleLogFound' }],
      },
      // Default import whose local name does NOT match the logger patterns —
      // loggerPatterns.test(name) false path inside the import scan.
      {
        code: "import myUtils from 'my-utils';\nconsole.log('x');",
        options: [{ strategy: 'convert' }],
        output: "import myUtils from 'my-utils';\nlogger.debug('x');",
        errors: [{ messageId: 'consoleLogFound' }],
      },
      // require() whose variable name does NOT match the logger patterns —
      // loggerPatterns.test(name) false path inside the require scan.
      {
        code: "const myUtils = require('my-utils');\nconsole.log('x');",
        options: [{ strategy: 'convert' }],
        output: "const myUtils = require('my-utils');\nlogger.debug('x');",
        errors: [{ messageId: 'consoleLogFound' }],
      },
    ],
  });
});

/** Build a synthetic console.log CallExpression node. */
interface SyntheticNodeInit {
  parent: unknown;
  loc?: { start: { line: number; column: number }; end: { line: number; column: number } };
}

function makeConsoleLogCall({ parent, loc }: SyntheticNodeInit) {
  const node: Record<string, unknown> = {
    type: 'CallExpression',
    callee: {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'console' },
      property: { type: 'Identifier', name: 'log' },
    },
    arguments: [],
    parent,
  };
  if (loc) node.loc = loc;
  return node;
}

const mockFixer = {
  remove: () => ({ range: [0, 0] as [number, number], text: 'REMOVED' }),
  replaceText: () => ({ range: [0, 0] as [number, number], text: 'REPLACED' }),
} as unknown as TSESLint.RuleFixer;

type ReportWithFix = {
  messageId: string;
  data?: Record<string, string>;
  fix?: (fixer: TSESLint.RuleFixer) => unknown;
};

describe('no-console-log — coverage completion (Layer 2: synthetic AST)', () => {
  it('returns null from the fixer for an unknown strategy (switch default)', () => {
    // The options schema forbids this value; only a raw create() call can
    // reach the switch `default` arm.
    const { listeners, reports } = createWithMockContext(noConsoleLog, {
      options: [{ strategy: 'nonsense', autoDetectLogger: false }],
    });

    const statement = { type: 'ExpressionStatement' };
    const node = makeConsoleLogCall({
      parent: statement,
      loc: { start: { line: 7, column: 0 }, end: { line: 7, column: 14 } },
    });

    (listeners.CallExpression as (n: unknown) => void)(node);

    expect(reports).toHaveLength(1);
    const report = reports[0] as unknown as ReportWithFix;
    expect(report.messageId).toBe('consoleLogFound');
    expect(report.data?.consoleMethod).toBe('console.log');
    expect(report.data?.line).toBe('7');
    // Unknown strategy → the fix generator declines to produce a fix.
    expect(report.fix?.(mockFixer)).toBeNull();
  });

  it('returns null from the fixer when no parent statement exists, and reports line 0 without loc', () => {
    const { listeners, reports } = createWithMockContext(noConsoleLog, {
      options: [{ strategy: 'remove', autoDetectLogger: false }],
    });

    // parent: null and no loc — impossible through a real parse.
    const node = makeConsoleLogCall({ parent: null });

    (listeners.CallExpression as (n: unknown) => void)(node);

    expect(reports).toHaveLength(1);
    const report = reports[0] as unknown as ReportWithFix;
    expect(report.messageId).toBe('consoleLogFound');
    // node.loc missing → line falls back to 0.
    expect(report.data?.line).toBe('0');
    // findParentStatement walks parent chain, finds nothing → fix aborts.
    expect(report.fix?.(mockFixer)).toBeNull();
  });
});

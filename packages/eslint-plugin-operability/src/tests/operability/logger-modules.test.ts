/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `console.log` inside the module that IS the logger.
 *
 * Vite's `node/logger.ts` and `module-runner/hmrLogger.ts` call `console.log`
 * because that is what a logger does: they are the one place the rest of the
 * code is told to go through. Both `no-console-log` ("use a logger") and
 * `no-debug-code-in-production` ("leftover debug output") reported them, so the
 * advice pointed back at the file it came from.
 *
 * The exemption is by the module's own name — `logger`, `logging`, `log`,
 * `fooLogger`, `foo-logger` — and nothing else. The same call anywhere else,
 * and names that merely contain the letters, still report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noConsoleLog } from '../../rules/operability/no-console-log';
import { noDebugCodeInProduction } from '../../rules/operability/no-debug-code-in-production';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const CALL = "console.log('[vite]', msg);";
const SINKS = [
  'src/node/logger.ts',
  'src/module-runner/hmrLogger.ts',
  'src/utils/log.ts',
  'src/utils/logging.ts',
  'src/utils/hmr-logger.mjs',
  'src/utils/logger.d.ts',
];
const NOT_SINKS = [
  'src/server.ts',
  'src/catalog.ts',
  'src/blog.ts',
  'src/dialog.ts',
  'src/loggerFactory.ts',
];

describe('logger modules', () => {
  ruleTester.run('no-console-log', noConsoleLog, {
    valid: SINKS.map((filename) => ({
      name: `${filename} is the logger`,
      code: CALL,
      filename,
    })),
    invalid: [
      ...NOT_SINKS.map((filename) => ({
        name: `${filename} is not a logger module`,
        code: CALL,
        filename,
        output: '',
        errors: [{ messageId: 'consoleLogFound' as const }],
      })),
      {
        name: 'the option switches the exemption off',
        code: CALL,
        filename: 'src/node/logger.ts',
        options: [{ ignoreLoggerModules: false }],
        output: '',
        errors: [{ messageId: 'consoleLogFound' as const }],
      },
    ],
  });

  ruleTester.run('no-debug-code-in-production', noDebugCodeInProduction, {
    valid: [
      ...SINKS.map((filename) => ({
        name: `${filename} is the logger`,
        code: CALL,
        filename,
      })),
      {
        name: 'a DEBUG flag inside a logger module is still the logger reading its own switch',
        code: 'if (DEBUG) { write(msg) }',
        filename: 'src/node/logger.ts',
      },
    ],
    invalid: [
      ...NOT_SINKS.map((filename) => ({
        name: `${filename} is not a logger module`,
        code: CALL,
        filename,
        errors: [{ messageId: 'violationDetected' as const }],
      })),
      {
        name: 'the option switches the exemption off',
        code: CALL,
        filename: 'src/node/logger.ts',
        options: [{ ignoreLoggerModules: false }],
        errors: [{ messageId: 'violationDetected' as const }],
      },
    ],
  });
});

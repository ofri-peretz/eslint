/**
 * Tests for default rule (import/default)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { defaultRule } from '../rules/default';
import * as path from 'node:path';

/**
 * This suite builds a real TypeScript program through `projectService`, and
 * the first case pays for it. Under the scheduled coverage run — a turbo
 * fan-out of every package's `test:coverage` with v8 instrumentation on —
 * that cost is exactly what made `eslint-plugin-nestjs-security`'s own
 * type-aware suite exceed its package's 30s `testTimeout` (#817, fixed by
 * giving RuleTester's `it` a dedicated case timeout). `import-next` is the
 * only other package using `projectService` in its tests and had not
 * received the same fix. The syntax-only suites elsewhere in this package
 * keep the 30s default; only this type-aware suite gets this budget.
 * Locked by ./type-aware-timeout.lock.test.ts.
 */
const TYPE_AWARE_CASE_TIMEOUT_MS = 120_000;

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = (text, callback) => it(text, callback, TYPE_AWARE_CASE_TIMEOUT_MS);

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      tsconfigRootDir: path.resolve(__dirname, '../../'),
      // Use projectService with valid glob (no **)
      projectService: {
        allowDefaultProject: ['src/*.ts'],
        defaultProject: 'tsconfig.json'
      },
    },
  },
});

ruleTester.run('default', defaultRule, {
  valid: [
    { 
        // Virtual file is src/valid_default.ts
        // Target file is src/files/foo.ts
        // Relative path: ./files/foo.ts
        code: `import foo from './files/foo.ts';`,
        name: 'Valid default import from file with default export',
        filename: 'src/valid_default.ts'
    },
    {
        code: `import { bar } from './files/foo.ts';`,
        name: 'Valid named import',
         filename: 'src/valid_named.ts'
    },
    {
        // A default import of a module that has no ESM default export, but
        // resolves via TS `export =` / CJS interop (esModuleInterop). Node's
        // own builtins are declared this way (@types/node: `declare module
        // 'node:process' { ... export = process; }`), so `moduleSymbol.exports`
        // carries `ExportEquals`, never `Default`. We can't exercise a real
        // `node:process` import here because this suite's RuleTester
        // `allowDefaultProject` ad-hoc program doesn't resolve @types/node
        // ambient modules, so this fixture reproduces the identical shape
        // (`export =`) locally via ./files/export-equals.ts — `tsc --noEmit`
        // accepts both with zero errors.
        //
        // Burgee provenance (all false-positived by the unfixed rule against
        // real `node:process` imports, verified with a clean `tsc --noEmit`):
        //   packages/burgee/src/commander-command.ts:15,17,18,19
        //   packages/flagstaff/src/cursor.ts:19
        //   packages/flagstaff/src/log-update.ts:21
        //   packages/flagstaff/src/ora.ts:18
        code: `import Widget from './files/export-equals.ts';`,
        name: 'Valid default import of an export= / CJS-interop module',
        filename: 'src/valid_export_equals_default.ts'
    },
  ],
  
  invalid: [
    {
        code: `import foo from './files/no-default.ts';`,
        name: 'Invalid default import from file without default export',
        filename: 'src/invalid_default.ts',
        errors: [{ messageId: 'noDefaultExport' }]
    },
  ],
});

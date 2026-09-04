/**
 * Tests for named rule (import/named)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { named } from '../rules/named';
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
      // Use projectService with explicit nested patterns
      projectService: {
        allowDefaultProject: ['src/*.ts', 'src/files/*.ts'],
        defaultProject: 'tsconfig.json'
      },
    },
  },
});

ruleTester.run('named', named, {
  valid: [
    { 
        code: `import { bar } from './files/foo.ts';`,
        name: 'Valid named import from file with named export',
        filename: 'src/valid_named.ts'
    },
    { 
        code: `import { foo } from './files/no-default.ts';`,
        name: 'Valid named import from another file',
        filename: 'src/valid_named_2.ts'
    },
  ],
  
  invalid: [
    {
        code: `import { baz } from './files/foo.ts';`,
        name: 'Invalid named import (export does not exist)',
        filename: 'src/invalid_named.ts',
        errors: [{ messageId: 'named' }]
    },
    {
        code: `import { foo } from './files/foo.ts';`,
        name: 'Invalid named import of default export name',
        filename: 'src/invalid_named_default.ts',
        errors: [{ messageId: 'named' }]
    }
  ],
});

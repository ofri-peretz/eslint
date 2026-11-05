/**
 * Tests for namespace rule (import/namespace)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { namespace } from '../rules/namespace';
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

ruleTester.run('namespace', namespace, {
  valid: [
    { 
        code: `import * as ns from './files/foo.ts'; const x = ns.bar;`,
        name: 'Valid namespace member access',
        filename: 'src/valid_namespace.ts'
    },
    { 
        code: `import * as ns from './files/foo.ts'; const x = ns.default;`,
        name: 'Valid namespace default member access',
        filename: 'src/valid_namespace_default.ts'
    },
  ],
  
  invalid: [
    {
        code: `import * as ns from './files/foo.ts'; const x = ns.baz;`,
        name: 'Invalid namespace member access',
        filename: 'src/invalid_namespace.ts',
        errors: [{ messageId: 'namespace', data: { name: 'baz' } }]
    }
  ],
});

/**
 * Fidelity (benchmarks/suites/fidelity/models/import-next/namespace.qnt):
 * every static read of a namespace member is checked; a runtime key and an
 * unresolved module are not findings.
 */
ruleTester.run('namespace — fidelity', namespace, {
  valid: [
    {
      name: 'a runtime key names nothing',
      code: `import * as ns from './files/foo.ts';\nexport const f = (k: 'bar') => ns[k];`,
      filename: 'src/valid_namespace.ts',
    },
    {
      name: 'a module that does not resolve is unknown',
      code: `import * as ns from './files/missing.ts';\nexport const v = ns.anything;`,
      filename: 'src/valid_namespace.ts',
    },
    {
      name: 'destructuring names the module exports, a rest element, a runtime key',
      code: `import * as ns from './files/foo.ts';\nexport const f = (k: 'bar') => {\n  const { bar, [k]: b2, ...rest } = ns;\n  return [bar, b2, rest];\n};`,
      filename: 'src/valid_namespace.ts',
    },
    {
      name: 'destructuring a plain object is not a namespace read',
      code: `const o = { a: 1 };\nexport const { a } = o;`,
      filename: 'src/valid_namespace.ts',
    },
  ],
  invalid: [
    {
      name: "ns['baz'] reads a name the module does not export",
      code: `import * as ns from './files/foo.ts';\nexport const v = ns['baz'];`,
      filename: 'src/invalid_namespace.ts',
      errors: [{ messageId: 'namespace', data: { name: 'baz' } }],
    },
    {
      name: 'const { baz } = ns reads a name the module does not export',
      code: `import * as ns from './files/foo.ts';\nexport const { baz } = ns;`,
      filename: 'src/invalid_namespace.ts',
      errors: [{ messageId: 'namespace', data: { name: 'baz' } }],
    },
  ],
});

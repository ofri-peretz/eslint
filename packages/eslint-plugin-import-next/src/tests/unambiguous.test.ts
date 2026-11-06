/**
 * Tests for unambiguous
 */
import { createRequire } from 'node:module';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { unambiguous } from '../rules/unambiguous';

// The vitest alias sends `@typescript-eslint/rule-tester` to the dual-engine
// tester; `require` reaches the real one, for a case only ESLint can express.
const eslintOnly = createRequire(import.meta.url)(
  '@typescript-eslint/rule-tester',
) as { RuleTester: typeof RuleTester };

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('unambiguous', unambiguous, {
  valid: [
    // Has import statement - unambiguous module
    { code: `import foo from 'foo';` },
    { code: `import { bar } from 'bar';` },
    { code: `import * as baz from 'baz';` },

    // Has export statement - unambiguous module
    { code: `export const x = 1;` },
    { code: `export default function() {}` },
    { code: `export { foo };` },

    {
      name: 'import.meta cannot appear in a script',
      code: `console.log(import.meta.url);`,
    },
    {
      name: 'a TS import-equals require makes the file a module',
      code: `import fs = require('fs'); fs.readFileSync('a');`,
    },
    {
      name: 'a .cjs file is a script by its extension',
      code: `const a = require('./a'); module.exports = a;`,
      filename: 'src/config.cjs',
    },

    // Empty file - acceptable
    {
      name: 'a file the config parses as CommonJS',
      code: `const a = require('./a');`,
      languageOptions: { sourceType: 'commonjs' },
    },
    { code: `` },

    // Use strict - intentional script
    { code: `'use strict'; const x = 1;` },

    // TypeScript `export =` cannot be a script; the reference rule lists TSExportAssignment
    // as module syntax. From burgee packages/closeout/src/signal-exit-signals.cts:21
    {
      name: 'a TypeScript export assignment makes the file a module',
      code: `const signals: string[] = [];\nexport = { signals };`,
    },
  ],

  invalid: [
    {
      name: 'new.target is not import.meta',
      code: `function F() { return new.target; }`,
      errors: [{ messageId: 'ambiguous' }],
    },
    {
      name: 'a namespace alias is not a module import',
      code: `import Alias = NS.Inner; const x = Alias;`,
      errors: [{ messageId: 'ambiguous' }],
    },
    {
      name: 'a dynamic import() is legal in a script and does not disambiguate',
      code: `const m = import('./module');`,
      errors: [{ messageId: 'ambiguous' }],
    },
    // Plain statement without module syntax
    {
      code: `const x = 1;`,
      errors: [{ messageId: 'ambiguous' }],
    },

    // Function declaration without exports
    {
      code: `function foo() { return 1; }`,
      errors: [{ messageId: 'ambiguous' }],
    },

    // Multiple statements, no module syntax
    {
      code: `
        const a = 1;
        const b = 2;
        console.log(a + b);
      `,
      errors: [{ messageId: 'ambiguous' }],
    },

    // Class without export
    {
      code: `class Foo { constructor() {} }`,
      errors: [{ messageId: 'ambiguous' }],
    },

    // CommonJS without ESM markers
    {
      code: `const foo = require('foo');`,
      errors: [{ messageId: 'ambiguous' }],
    },

    // Variable declarations
    {
      code: `let x = 1; var y = 2;`,
      errors: [{ messageId: 'ambiguous' }],
    },
  ],
});

// oxlint infers sourceType from the content, so on oxlint a configured
// "script" is indistinguishable from a file with no module syntax, and the
// rule reports both (unambiguous.oxlint.test.ts). Only ESLint carries intent.
new eslintOnly.RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
}).run('unambiguous (ESLint config)', unambiguous, {
  valid: [
    {
      name: 'a file the config parses as a script',
      code: `const a = 1;`,
      languageOptions: { sourceType: 'script' },
    },
  ],
  invalid: [],
});

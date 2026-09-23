/**
 * Tests for unambiguous
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { unambiguous } from '../rules/unambiguous';

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

    // Has dynamic import - module
    { code: `const m = import('./module');` },

    // Empty file - acceptable
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

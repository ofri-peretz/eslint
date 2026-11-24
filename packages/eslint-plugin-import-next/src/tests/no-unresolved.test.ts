/**
 * Tests for no-unresolved (Stable)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnresolved } from '../rules/no-unresolved';
import parser from '@typescript-eslint/parser';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const createSuggestion = (codeLine: string) => ({
    messageId: 'addIgnoreComment',
    output: `// eslint-disable-next-line import-next/no-unresolved\n${codeLine}`
});

ruleTester.run('no-unresolved', noUnresolved, {
  valid: [
    { name: 'a resolvable builtin', code: `import fs from 'fs';` }, // builtin
    { name: 'another builtin', code: `import path from 'path';` }, // builtin
    
    // Ignored patterns
    { 
      name: 'an import matching an ignore entry is not reported',
      code: `import foo from 'does-not-exist';`,
      options: [{ ignore: ['does-not-exist'] }] 
    },
    {
      code: `import foo from './missing';`,
      options: [{ ignore: ['./*'] }] 
    },
    
    // Allow option
    {
        code: `import something from 'anywhere';`,
        options: [{ allowUnresolved: true }]
    },

    // Visitors Valid Cases
    { code: `require('fs');` },
    { code: `export * from 'fs';` },
    { code: `export { readFileSync } from 'fs';` },
    { code: `const fs = await import('fs');` },
    { code: `import fs = require('fs');` }
  ],

  invalid: [
     // Standard Import
     {
         name: 'an import that resolves to nothing',
         code: `import 'this-module-does-not-exist-at-all';`,
         errors: [{ 
             messageId: 'moduleNotFound',
             suggestions: [createSuggestion(`import 'this-module-does-not-exist-at-all';`)]
         }]
     },
     // require()
     {
         code: `require('missing-module');`,
         errors: [{ 
             messageId: 'moduleNotFound',
             suggestions: [createSuggestion(`require('missing-module');`)]
         }]
     },
     // export types
     {
         code: `export * from 'missing-module';`,
         errors: [{ 
             messageId: 'moduleNotFound',
             suggestions: [createSuggestion(`export * from 'missing-module';`)]
         }]
     },
     {
         code: `export { foo } from 'missing-module';`,
         errors: [{ 
             messageId: 'moduleNotFound',
             suggestions: [createSuggestion(`export { foo } from 'missing-module';`)]
         }]
     },
     // dynamic import
     {
         code: `import('missing-module');`,
         errors: [{ 
             messageId: 'moduleNotFound',
             suggestions: [createSuggestion(`import('missing-module');`)]
         }]
     },
     // TS Import Equals
     {
         code: `import foo = require('missing-module');`,
         errors: [{ 
             messageId: 'moduleNotFound',
             suggestions: [createSuggestion(`import foo = require('missing-module');`)]
         }]
     }
  ],
});

// Found by the fidelity model (benchmarks/suites/fidelity/models/import-next/
// no_unresolved): a URL scheme names a module a bundler or runtime provides,
// which the file resolver cannot judge.
ruleTester.run('no-unresolved - fidelity', noUnresolved, {
  valid: [
    {
      name: 'a bundler virtual module is not a file to resolve',
      code: `import routes from 'virtual:routes';`,
    },
    {
      name: 'a runtime-provided scheme is not a file to resolve',
      code: `const t = require('bun:test');`,
    },
  ],
  invalid: [
    {
      name: 'a node: builtin is still skipped, a missing package still reported',
      code: `import x from 'nope-pkg';`,
      errors: [
        {
          messageId: 'moduleNotFound',
          suggestions: [createSuggestion(`import x from 'nope-pkg';`)],
        },
      ],
    },
  ],
});

// A `@types/*` package holds declarations only: Node cannot load it and
// TypeScript refuses the import (TS6137). eslint-plugin-import reports it.
ruleTester.run('no-unresolved - @types packages', noUnresolved, {
  valid: [
    {
      name: 'import type from a @types package is erased, and allowed',
      code: `import type { JSONSchema7Type } from '@types/json-schema';`,
      filename: __filename,
    },
    {
      name: 'export type from a @types package is erased, and allowed',
      code: `export type { JSONSchema7Type } from '@types/json-schema';`,
      filename: __filename,
    },
    {
      name: 'a scoped name that is not @types is resolved as usual',
      code: `import { RuleTester } from '@typescript-eslint/rule-tester';`,
      filename: __filename,
    },
  ],
  invalid: [
    {
      name: 'importing a @types package by name',
      code: `import { JSONSchema7Type } from '@types/json-schema';`,
      filename: __filename,
      errors: [
        {
          messageId: 'moduleNotFound',
          suggestions: [
            createSuggestion(
              `import { JSONSchema7Type } from '@types/json-schema';`,
            ),
          ],
        },
      ],
    },
  ],
});

// eslint-plugin-import skips a type-only declaration before it resolves
// anything: `src/rules/no-unresolved.js:33` (v2.32.0), `node.importKind ===
// 'type' || node.exportKind === 'type'`. The check is in the rule, not in
// `utils/moduleVisitor.js`, and it reads the DECLARATION's kind: an inline
// `import { type X }` has `importKind: 'value'` and is still resolved.
// Ported from upstream tests/src/rules/no-unresolved.js at v2.32.0, the
// `no-unresolved ignore type-only` block (lines 516-535): `import type` (519)
// and `export type ... from` (523) valid, a plain `import {}` (529) and
// `export {} from` (534) invalid. Upstream uses `@types/json-schema` as the
// unresolvable module; the rule's skip is not specific to it.
ruleTester.run('no-unresolved - type-only declarations', noUnresolved, {
  valid: [
    {
      // upstream test line 519
      name: 'import type of an unresolvable module is erased, and allowed',
      code: `import type { Foo } from 'nope-pkg';`,
    },
    {
      // upstream test line 523
      name: 'export type from an unresolvable module is erased, and allowed',
      code: `export type { Foo } from 'nope-pkg';`,
    },
    {
      // @found workadventure/workadventure 2026-11-24
      name: 'FP: import type of a package that is not installed, as in workadventure',
      code: `import type { Room } from 'nope-pkg';`,
    },
    {
      name: 'import type of a default is erased, and allowed',
      code: `import type Foo from 'nope-pkg';`,
    },
    {
      name: 'import type of a namespace is erased, and allowed',
      code: `import type * as Foo from 'nope-pkg';`,
    },
    {
      name: 'export type star is erased, and allowed',
      code: `export type * from 'nope-pkg';`,
    },
    {
      name: 'import type x = require() is erased, and allowed',
      code: `import type Foo = require('nope-pkg');`,
    },
  ],
  invalid: [
    {
      // upstream test line 529
      name: 'a value import of an unresolvable module is still reported',
      code: `import { Foo } from 'nope-pkg';`,
      errors: [{ messageId: 'moduleNotFound', suggestions: [createSuggestion(`import { Foo } from 'nope-pkg';`)] }],
    },
    {
      // upstream test line 534
      name: 'a value re-export of an unresolvable module is still reported',
      code: `export { Foo } from 'nope-pkg';`,
      errors: [{ messageId: 'moduleNotFound', suggestions: [createSuggestion(`export { Foo } from 'nope-pkg';`)] }],
    },
    {
      // Not in upstream's tests; follows from the rule reading the
      // declaration's kind (`importKind: 'value'`), line 33.
      name: 'an inline type specifier does not make the declaration type-only',
      code: `import { type Foo } from 'nope-pkg';`,
      errors: [{ messageId: 'moduleNotFound', suggestions: [createSuggestion(`import { type Foo } from 'nope-pkg';`)] }],
    },
    {
      name: 'an inline type specifier on every specifier is still resolved',
      code: `import { type Foo, type Bar } from 'nope-pkg';`,
      errors: [{ messageId: 'moduleNotFound', suggestions: [createSuggestion(`import { type Foo, type Bar } from 'nope-pkg';`)] }],
    },
    {
      name: 'an inline type specifier on a re-export is still resolved',
      code: `export { type Foo } from 'nope-pkg';`,
      errors: [{ messageId: 'moduleNotFound', suggestions: [createSuggestion(`export { type Foo } from 'nope-pkg';`)] }],
    },
    {
      name: 'a dynamic import() has no declaration kind and is still resolved',
      code: `import('nope-pkg');`,
      errors: [{ messageId: 'moduleNotFound', suggestions: [createSuggestion(`import('nope-pkg');`)] }],
    },
  ],
});

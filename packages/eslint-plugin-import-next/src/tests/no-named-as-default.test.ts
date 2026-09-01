/**
 * Tests for no-named-as-default rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noNamedAsDefault } from '../rules/no-named-as-default';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run('no-named-as-default', noNamedAsDefault, {
  valid: [
    // Regular default import
    {
      name: 'a default import with its own name',
      code: `import MyComponent from './MyComponent';`,
    },

    // Named import
    { code: `import { foo } from './module';` },

    // Namespace import
    { code: `import * as utils from './utils';` },

    // Different names are fine
    { code: `import Something, { other } from './other';` },

    // Renaming is fine
    { code: `import { foo as bar } from './module';` },

    // External modules
    { code: `import React from 'react';` },
    { code: `import lodash from 'lodash';` },

    // Export tracking visitor coverage
    { code: `export const foo = 1;` },
    { code: `export default function bar() {}` },
    { code: `const bar = 1; export { bar }; export default bar;` },
    { code: `export class Baz {} export default Baz;` },
    { code: `export default class {}` }, // default export without id
    { code: `import foo from './bar'; export default foo;` }, // default export is identifier
  ],

  invalid: [
    {
      name: 'a default import with the same name as a named export of that module',
      code: `import foo, { foo } from './module';`,
      errors: [{ messageId: 'namedAsDefault', data: { name: 'foo' } }],
    },
    {
      name: 'the same collision alongside a rename of the same export',
      code: `import foo, { foo as bar, foo } from './module';`,
      errors: [{ messageId: 'namedAsDefault', data: { name: 'foo' } }],
    },
    {
      // The rule read `ImportDefaultSpecifier` only. `{ default as foo }` is an
      // `ImportSpecifier` whose imported name is `default` — the same binding,
      // and the spelling TypeScript emits under `esModuleInterop: false` — so
      // the identical collision went unseen.
      // @found grammar review
      name: 'FN: the same collision written through an aliased default specifier',
      code: `import { default as foo, foo } from './module';`,
      errors: [{ messageId: 'namedAsDefault', data: { name: 'foo' } }],
    },
    {
      name: 'an aliased default colliding with a renamed named export',
      code: `import { default as widget, widget as w, widget } from './module';`,
      errors: [{ messageId: 'namedAsDefault', data: { name: 'widget' } }],
    },
  ],
});

/**
 * Tests for no-anonymous-default-export rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAnonymousDefaultExport } from '../rules/no-anonymous-default-export';

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

ruleTester.run('no-anonymous-default-export', noAnonymousDefaultExport, {
  valid: [
    {
      name: 'a named function expression is not anonymous',
      code: `export default (function load() {});`,
    },
    {
      name: 'a named class expression is not anonymous',
      code: `export default (class Store {});`,
    },
    {
      name: 'a member reference is not an anonymous function or class',
      code: `import { config } from './config'; export default config.handler;`,
    },
    {
      // Upstream reads the declaration's own node type: a TSSatisfiesExpression
      // has no entry in `defs` (src/rules/no-anonymous-default-export.js:12-61).
      name: 'an object behind satisfies is not an ObjectExpression node',
      code: `export default { a: 1 } satisfies Record<string, number>;`,
    },
    {
      name: 'a default-exported interface has a name',
      code: `export default interface Shape { a: string }`,
    },
    // Named default exports
    { name: 'a named function', code: `export default function foo() {}` },
    { code: `export default class MyClass {}` },
    
    // Non-default exports
    { code: `export const foo = 1;` },
    
    // Call expressions allowed (e.g. HOCs)
    { code: `export default connect(Component);` },
    
    // Allowed patterns with options
    {
      code: `export default function() {}`,
      options: [{ allowFunctionExpression: true }],
    },
    {
      code: `export default class {}`,
      options: [{ allowClassExpression: true }],
    },
    {
      code: `export default () => {};`,
      options: [{ allowArrowFunction: true }],
    },
  ],
  
  invalid: [
    // Values, read as eslint-plugin-import 2.32.0 reads them at default
    // options (tests/src/rules/no-anonymous-default-export.js, `invalid`).
    {
      name: 'an array (upstream tests line 48)',
      code: `export default [];`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    {
      name: 'a number (upstream tests line 52)',
      code: `export default 123;`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    {
      name: 'a string (upstream tests line 53)',
      code: `export default 'string';`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    {
      name: 'a template literal (upstream tests line 54)',
      code: 'export default `foo`;',
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    {
      name: 'an object (upstream tests line 55)',
      code: `export default {};`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    {
      name: 'a new expression (upstream tests line 57)',
      code: `export default new Foo();`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    {
      // @found receptron/mulmoclaude@6b4f990
      // packages/plugins/bookmarks-plugin/src/lang/en.ts:1 (and ja.ts,
      // recipe-book-plugin/src/lang/{en,ja}.ts); eslint-plugin-import 2.32.0
      // reports each: "Assign object to a variable before exporting as module
      // default". The default export is a message dictionary.
      name: 'mulmoclaude: a locale dictionary as the default export',
      code: `export default {
  title: "Bookmarks",
  countSuffix: "saved",
  remove: "Remove",
};`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    {
      // @found receptron/mulmoclaude@6b4f990
      // packages/plugins/chart-plugin/src/vue/index.ts:28 (also form-,
      // html-, markdown- and mulmoscript-plugin); eslint-plugin-import 2.32.0
      // reports each.
      name: 'mulmoclaude: a plugin object literal as the default export',
      code: `const plugin = {};
export { View, Preview };

export default { plugin };`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    // Anonymous function
    {
      name: 'a default export with no name to show in a stack trace',
      code: `export default function() {}`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    
    // Anonymous class
    {
      code: `export default class {}`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    
    // Arrow function
    {
      code: `export default () => {};`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
    {
      name: 'an anonymous arrow wrapped in a TS as-expression',
      code: `type Handler = () => number; export default (() => 1) as Handler;`,
      errors: [{ messageId: 'anonymousDefaultExport' }],
    },
  ],
});

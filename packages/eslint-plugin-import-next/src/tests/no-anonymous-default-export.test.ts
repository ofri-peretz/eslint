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
      name: 'an instance is not an anonymous function or class',
      code: `export default new Map();`,
    },
    {
      name: 'a template literal is not an anonymous function or class',
      code: 'export default `value`;',
    },
    {
      name: 'an object checked with satisfies is still an object',
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
    
    // Literals, Arrays, Objects are allowed by this rule
    { code: `export default [];` },
    { code: `export default {};` },
    { code: `export default 123;` },
    { code: `export default 'string';` },
    
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

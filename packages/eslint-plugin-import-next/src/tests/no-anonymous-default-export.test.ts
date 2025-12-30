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
    // Named default exports
    { code: `export default function foo() {}` },
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
  ],
});

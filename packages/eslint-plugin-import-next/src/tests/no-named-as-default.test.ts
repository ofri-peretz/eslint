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
    { code: `import MyComponent from './MyComponent';` },
    
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
        // Same declaration conflict (heuristic)
        code: `import foo, { foo } from './module';`,
        errors: [{ messageId: 'namedAsDefault', data: { name: 'foo' } }]
    },
    {
        // Same declaration conflict with renaming
        code: `import foo, { foo as bar, foo } from './module';`,
        errors: [{ messageId: 'namedAsDefault', data: { name: 'foo' } }]
    }
  ],
});

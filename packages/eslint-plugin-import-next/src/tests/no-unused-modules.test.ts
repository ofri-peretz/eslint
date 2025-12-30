/**
 * Tests for no-unused-modules rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnusedModules } from '../rules/no-unused-modules';

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

ruleTester.run('no-unused-modules', noUnusedModules, {
  valid: [
    // Has named exports
    { code: `export const foo = 1;` },
    
    // Has default export
    { code: `export default function() {}` },
    
    // Has export *
    { code: `export * from './other';` },
    
    // CommonJS exports
    { code: `module.exports = {};` },
    { code: `exports.foo = 1;` },
    
    // Allowed import only
    {
      code: `import './side-effects';`,
      options: [{ allowImportOnly: true }],
    },
  ],
  
  invalid: [
    // No exports, only imports
    {
      code: `import { foo } from './bar';`,
      errors: [{ messageId: 'missingExports' }],
    },
    
    // Empty file
    {
      code: `const foo = 1;`,
      errors: [{ messageId: 'missingExports' }],
    },
  ],
});

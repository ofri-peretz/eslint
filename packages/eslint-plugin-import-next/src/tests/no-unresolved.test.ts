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
    output: `// eslint-disable-next-line eslint-plugin-llm-optimized/no-unresolved\n${codeLine}`
});

ruleTester.run('no-unresolved', noUnresolved, {
  valid: [
    { code: `import fs from 'fs';` }, // builtin
    { code: `import path from 'path';` }, // builtin
    
    // Ignored patterns
    { 
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

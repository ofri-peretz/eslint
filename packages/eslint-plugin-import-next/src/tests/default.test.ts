/**
 * Tests for default rule (import/default)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { defaultRule } from '../rules/default';
import * as path from 'node:path';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      tsconfigRootDir: path.resolve(__dirname, '../../'),
      // Use projectService with valid glob (no **)
      projectService: {
        allowDefaultProject: ['src/*.ts'],
        defaultProject: 'tsconfig.json'
      },
    },
  },
});

ruleTester.run('default', defaultRule, {
  valid: [
    { 
        // Virtual file is src/valid_default.ts
        // Target file is src/files/foo.ts
        // Relative path: ./files/foo.ts
        code: `import foo from './files/foo.ts';`,
        name: 'Valid default import from file with default export',
        filename: 'src/valid_default.ts'
    },
    { 
        code: `import { bar } from './files/foo.ts';`,
        name: 'Valid named import',
         filename: 'src/valid_named.ts'
    },
  ],
  
  invalid: [
    {
        code: `import foo from './files/no-default.ts';`,
        name: 'Invalid default import from file without default export',
        filename: 'src/invalid_default.ts',
        errors: [{ messageId: 'noDefaultExport' }]
    },
    // Adding built-in module failure case as invalid if it fails
     { 
        code: `import fs from 'node:fs';`,
        name: 'Invalid built-in module default import (if types imply no default)',
         filename: 'src/invalid_builtin.ts',
         errors: [{ messageId: 'noDefaultExport' }]
    },
  ],
});

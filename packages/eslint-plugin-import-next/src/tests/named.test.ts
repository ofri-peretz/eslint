/**
 * Tests for named rule (import/named)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { named } from '../rules/named';
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
      // Use projectService with explicit nested patterns
      projectService: {
        allowDefaultProject: ['src/*.ts', 'src/files/*.ts'],
        defaultProject: 'tsconfig.json'
      },
    },
  },
});

ruleTester.run('named', named, {
  valid: [
    { 
        code: `import { bar } from './files/foo.ts';`,
        name: 'Valid named import from file with named export',
        filename: 'src/valid_named.ts'
    },
    { 
        code: `import { foo } from './files/no-default.ts';`,
        name: 'Valid named import from another file',
        filename: 'src/valid_named_2.ts'
    },
  ],
  
  invalid: [
    {
        code: `import { baz } from './files/foo.ts';`,
        name: 'Invalid named import (export does not exist)',
        filename: 'src/invalid_named.ts',
        errors: [{ messageId: 'named' }]
    },
    {
        code: `import { foo } from './files/foo.ts';`,
        name: 'Invalid named import of default export name',
        filename: 'src/invalid_named_default.ts',
        errors: [{ messageId: 'named' }]
    }
  ],
});

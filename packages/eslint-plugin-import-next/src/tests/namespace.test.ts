/**
 * Tests for namespace rule (import/namespace)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { namespace } from '../rules/namespace';
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

ruleTester.run('namespace', namespace, {
  valid: [
    { 
        code: `import * as ns from './files/foo.ts'; const x = ns.bar;`,
        name: 'Valid namespace member access',
        filename: 'src/valid_namespace.ts'
    },
    { 
        code: `import * as ns from './files/foo.ts'; const x = ns.default;`,
        name: 'Valid namespace default member access',
        filename: 'src/valid_namespace_default.ts'
    },
  ],
  
  invalid: [
    {
        code: `import * as ns from './files/foo.ts'; const x = ns.baz;`,
        name: 'Invalid namespace member access',
        filename: 'src/invalid_namespace.ts',
        errors: [{ messageId: 'namespace', data: { name: 'baz' } }]
    }
  ],
});

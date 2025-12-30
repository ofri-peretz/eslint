/**
 * Tests for no-useless-path-segments rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUselessPathSegments } from '../rules/no-useless-path-segments';

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

ruleTester.run('no-useless-path-segments', noUselessPathSegments, {
  valid: [
    // Clean relative paths
    { code: `import foo from './foo';` },
    { code: `import bar from '../bar';` },
    { code: `import baz from '../../baz';` },
    { code: `import qux from './dir/qux';` },
    
    // Non-relative paths - should not be checked
    { code: `import express from 'express';` },
    { code: `import lodash from 'lodash';` },
    { code: `import pkg from '@scope/package';` },
    
    // Absolute paths - should not be checked
    { code: `import abs from '/absolute/path';` },
    
    // Already normalized
    { code: `import foo from './a/b/c';` },
    { code: `import bar from '../a/b';` },
    
    // Current directory reference
    { code: `import current from '.';` },
  ],
  
  invalid: [
    // Redundant current directory
    {
      code: `import foo from './a/../a/foo';`,
      output: `import foo from './a/foo';`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    
    // Double dots that can be simplified
    {
      code: `import bar from './a/b/../c';`,
      output: `import bar from './a/c';`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    
    // Multiple redundant segments
    {
      code: `import baz from './a/./b';`,
      output: `import baz from './a/b';`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    
    // Complex path simplification
    {
      code: `import qux from './a/b/../c/../d';`,
      output: `import qux from './a/d';`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    
    // Starting with current directory reference
    {
      code: `import foo from '././foo';`,
      output: `import foo from './foo';`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
  ],
});

// Test noUselessIndex option
ruleTester.run('no-useless-path-segments - noUselessIndex', noUselessPathSegments, {
  valid: [
    // Without option, /index is allowed
    { code: `import foo from './foo/index';` },
    
    // With option, already simplified
    {
      code: `import foo from './foo';`,
      options: [{ noUselessIndex: true }],
    },
  ],
  
  invalid: [
    // With noUselessIndex, should remove /index
    {
      code: `import foo from './foo/index';`,
      output: `import foo from './foo';`,
      options: [{ noUselessIndex: true }],
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    
    // Current directory index
    {
      code: `import current from './index';`,
      output: `import current from '.';`,
      options: [{ noUselessIndex: true }],
      errors: [{ messageId: 'uselessPathSegments' }],
    },
  ],
});

// Test commonjs option
ruleTester.run('no-useless-path-segments - commonjs', noUselessPathSegments, {
  valid: [
    // CommonJS with clean path
    { code: `const foo = require('./foo');` },
    
    // CommonJS disabled
    {
      code: `const bar = require('./a/../a/bar');`,
      options: [{ commonjs: false }],
    },
  ],
  
  invalid: [
    // CommonJS enabled by default
    {
      code: `const foo = require('./a/../a/foo');`,
      output: `const foo = require('./a/foo');`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    
    // Explicit commonjs: true
    {
      code: `const bar = require('./a/./b');`,
      output: `const bar = require('./a/b');`,
      options: [{ commonjs: true }],
      errors: [{ messageId: 'uselessPathSegments' }],
    },
  ],
});

// Test dynamic imports
ruleTester.run('no-useless-path-segments - dynamic import', noUselessPathSegments, {
  valid: [
    { code: `const foo = await import('./foo');` },
  ],
  
  invalid: [
    {
      code: `const foo = await import('./a/../a/foo');`,
      output: `const foo = await import('./a/foo');`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    {
      code: `const bar = await import('./a/./b');`,
      output: `const bar = await import('./a/b');`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
  ],
});

// Test parent directory paths
ruleTester.run('no-useless-path-segments - parent paths', noUselessPathSegments, {
  valid: [
    // Clean parent path
    { code: `import foo from '../foo';` },
    { code: `import bar from '../../bar';` },
  ],
  
  invalid: [
    // Redundant in parent path
    {
      code: `import foo from '../a/../b';`,
      output: `import foo from '../b';`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    {
      code: `import bar from '../a/./b';`,
      output: `import bar from '../a/b';`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
  ],
});

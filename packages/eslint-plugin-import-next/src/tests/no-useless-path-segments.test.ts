/**
 * Tests for no-useless-path-segments rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUselessPathSegments } from '../rules/no-useless-path-segments';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * A small project on disk, for the cases whose verdict depends on what a
 * specifier resolves to: `src/app.ts` imports its neighbours.
 */
const ROOT = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'useless-path-segments-')),
);
for (const rel of [
  'src/dep.ts',
  'src/index.ts',
  'src/lib/index.ts',
  'src/both.ts',
  'src/both/index.ts',
]) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), 'export const a = 1;\n');
}
const APP = path.join(ROOT, 'src/app.ts');
afterAll(() => fs.rmSync(ROOT, { recursive: true, force: true }));

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
    { name: 'the direct path', code: `import foo from './foo';` },
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
      name: 'a path that walks out and back into the same directory',
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
      code: `import foo from './lib/index';`,
      output: `import foo from './lib';`,
      filename: APP,
      options: [{ noUselessIndex: true }],
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    
    // Current directory index
    {
      code: `import current from './index';`,
      output: `import current from '.';`,
      filename: APP,
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

// Found by the fidelity model (benchmarks/suites/fidelity/models/import-next/
// no_useless_path_segments): spellings the rule did not read, a parent path
// that re-enters the file's own directory, and an `/index` whose removal
// names a different module.
ruleTester.run('no-useless-path-segments - fidelity', noUselessPathSegments, {
  valid: [
    {
      name: '/index is kept when the shorter path names a sibling file instead',
      code: `import a from './both/index';`,
      filename: APP,
      options: [{ noUselessIndex: true }],
    },
    {
      name: '/index of a path that does not resolve proves nothing',
      code: `import a from './missing/index';`,
      filename: APP,
      options: [{ noUselessIndex: true }],
    },
    {
      name: 'a trailing slash only matches a directory and is left alone',
      code: `import a from './lib/';`,
      filename: APP,
    },
    {
      name: 'a parent path that does not come back is clean',
      code: `import a from '../shared/dep';`,
      filename: APP,
    },
    {
      name: 'import x = require() follows commonjs: false',
      code: `import a = require('./lib/../dep');`,
      options: [{ commonjs: false }],
    },
    {
      name: 'export { a } without a source loads nothing',
      code: `const a = 1;\nexport { a };`,
    },
    {
      name: 'import x = Namespace.member is not a module specifier',
      code: `namespace A { export const b = 1; }\nimport x = A.b;`,
    },
    {
      name: 'a first segment that starts with a dot keeps its ./ prefix',
      code: `import a from './.config/dep';`,
    },
  ],
  invalid: [
    {
      name: 'a parent path that re-enters the file directory',
      code: `import a from '../src/dep';`,
      output: `import a from './dep';`,
      filename: APP,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    {
      name: 'a parent path to the file directory itself',
      code: `import a from '../src';`,
      output: `import a from '.';`,
      filename: APP,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    {
      name: 'export { a } from with a useless segment',
      code: `export { a } from './lib/../dep';`,
      output: `export { a } from './dep';`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    {
      name: 'export * from with a useless segment',
      code: `export * from './lib/./dep';`,
      output: `export * from './lib/dep';`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
    {
      name: 'TS import x = require() with a useless segment',
      code: `import a = require('./lib//dep');`,
      output: `import a = require('./lib/dep');`,
      errors: [{ messageId: 'uselessPathSegments' }],
    },
  ],
});

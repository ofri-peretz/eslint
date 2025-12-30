/**
 * Tests for no-unassigned-import rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnassignedImport } from '../rules/no-unassigned-import';

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

ruleTester.run('no-unassigned-import', noUnassignedImport, {
  valid: [
    // Default import
    { code: `import foo from './foo';` },
    
    // Named imports
    { code: `import { bar } from './bar';` },
    { code: `import { a, b, c } from './module';` },
    
    // Namespace import
    { code: `import * as utils from './utils';` },
    
    // Default and named
    { code: `import def, { named } from './both';` },
    
    // Allowed modules
    {
      code: `import './polyfill';`,
      options: [{ allowModules: ['./polyfill'] }],
    },
    {
      code: `import 'core-js';`,
      options: [{ allowModules: ['core-js'] }],
    },
    
    // CommonJS with assignment
    { code: `const foo = require('./foo');` },
    { code: `const { bar } = require('./bar');` },
    
    // CommonJS as object property
    { code: `const obj = { dep: require('./dep') };` },
    
    // CommonJS with assignment expression
    { code: `let foo; foo = require('./foo');` },
    
    // Type-only imports
    { code: `import type { MyType } from './types';` },
  ],
  
  invalid: [
    // Bare import
    {
      code: `import './side-effects';`,
      errors: [{ messageId: 'unassignedImport' }],
    },
    
    // External package bare import
    {
      code: `import 'some-package';`,
      errors: [{ messageId: 'unassignedImport' }],
    },
    
    // CSS import
    {
      code: `import './styles.css';`,
      errors: [{ messageId: 'unassignedImport' }],
    },
    
    // SCSS import
    {
      code: `import './styles.scss';`,
      errors: [{ messageId: 'unassignedImport' }],
    },
    
    // Polyfill import
    {
      code: `import 'core-js/stable';`,
      errors: [{ messageId: 'unassignedImport' }],
    },
    
    // Regenerator runtime
    {
      code: `import 'regenerator-runtime/runtime';`,
      errors: [{ messageId: 'unassignedImport' }],
    },
    
    // CommonJS without assignment
    {
      code: `require('./side-effects');`,
      errors: [{ messageId: 'unassignedImport' }],
    },
    
    // CommonJS in expression statement
    {
      code: `require('init-module');`,
      errors: [{ messageId: 'unassignedImport' }],
    },
  ],
});

// Test allowModules option
ruleTester.run('no-unassigned-import - allowModules', noUnassignedImport, {
  valid: [
    // Single allowed module
    {
      code: `import './setup';`,
      options: [{ allowModules: ['./setup'] }],
    },
    
    // Multiple allowed modules
    {
      code: `import 'reflect-metadata';`,
      options: [{ allowModules: ['reflect-metadata', 'source-map-support'] }],
    },
    {
      code: `import 'source-map-support';`,
      options: [{ allowModules: ['reflect-metadata', 'source-map-support'] }],
    },
    
    // CSS files allowed
    {
      code: `import './app.css';`,
      options: [{ allowModules: ['./app.css'] }],
    },
  ],
  
  invalid: [
    // Not in allowed list
    {
      code: `import './other';`,
      options: [{ allowModules: ['./setup'] }],
      errors: [{ messageId: 'unassignedImport' }],
    },
  ],
});

// Test CommonJS patterns
ruleTester.run('no-unassigned-import - CommonJS', noUnassignedImport, {
  valid: [
    // Destructuring assignment
    { code: `const { foo, bar } = require('./module');` },
    
    // In object expression
    { code: `module.exports = { dep: require('./dep') };` },
    
    // In array
    { code: `const deps = [require('./a'), require('./b')];` },
    
    // In function call
    { code: `doSomething(require('./config'));` },
    
    // With conditional
    { code: `const mod = condition ? require('./a') : require('./b');` },
  ],
  
  invalid: [
    // Standalone require
    {
      code: `require('./init');`,
      errors: [{ messageId: 'unassignedImport' }],
    },
    
    // In if statement
    {
      code: `if (true) require('./conditional');`,
      errors: [{ messageId: 'unassignedImport' }],
    },
  ],
});

// Edge cases
ruleTester.run('no-unassigned-import - edge cases', noUnassignedImport, {
  valid: [
    // Empty specifiers but has binding
    { code: `import def from './module';` },
    
    // Re-exports (have specifiers)
    { code: `export { foo } from './module';` },
    { code: `export * from './module';` },
  ],
  
  invalid: [
    // Multiple bare imports
    {
      code: `
        import './a';
        import './b';
      `,
      errors: [
        { messageId: 'unassignedImport' },
        { messageId: 'unassignedImport' },
      ],
    },
  ],
});

/**
 * Tests for no-relative-packages rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRelativePackages } from '../rules/no-relative-packages';

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

// The no-relative-packages rule requires filesystem access to detect package boundaries.
// In RuleTester, we primarily test valid cases and rule structure.
ruleTester.run('no-relative-packages', noRelativePackages, {
  valid: [
    // Package imports (not relative) - always valid
    { code: `import foo from 'foo';` },
    { code: `import bar from '@scope/bar';` },
    { code: `import lodash from 'lodash';` },
    
    // Local relative imports within same package context
    { code: `import utils from './utils';` },
    { code: `import helper from '../helpers/helper';` },
    
    // Node.js builtins
    { code: `import fs from 'node:fs';` },
    { code: `import path from 'node:path';` },
    
    // Absolute paths
    { code: `import abs from '/absolute/path';` },
    
    // Scoped packages
    { code: `import { util } from '@myorg/utils';` },
    { code: `import { component } from '@myorg/ui';` },
    
    // CommonJS require with package names
    { code: `const express = require('express');` },
    { code: `const lodash = require('lodash');` },
    
    // Dynamic imports with package names
    { code: `const pkg = await import('some-package');` },
  ],
  
  invalid: [],
});

// Test allowSamePackage option structure
ruleTester.run('no-relative-packages - options', noRelativePackages, {
  valid: [
    // With allowSamePackage: true (default)
    {
      code: `import foo from './foo';`,
      options: [{ allowSamePackage: true }],
    },
    
    // With allowSamePackage: false, still needs filesystem context
    {
      code: `import bar from '@scope/bar';`,
      options: [{ allowSamePackage: false }],
    },
  ],
  
  invalid: [],
});

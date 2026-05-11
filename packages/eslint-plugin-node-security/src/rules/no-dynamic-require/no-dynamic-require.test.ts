/**
 * Tests for no-dynamic-require
 * Forbid `require()` calls with expressions
 * Security: CWE-094 (Code Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicRequire } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-dynamic-require', () => {
  describe('Valid Code - Static requires', () => {
    ruleTester.run('valid - safe patterns', noDynamicRequire, {
      valid: [
        // Static string literal — always safe
        'const fs = require("fs");',
        'const path = require("path");',
        'const lodash = require("lodash");',

        // Relative path — static string
        'const config = require("./config");',
        'const utils = require("../utils/helper");',

        // JSON require — static
        'const pkg = require("./package.json");',

        // Non-require calls
        'const data = fetch("/api/data");',
        'const result = import("./module");',
      
        // Static string require
        'const fs = require(\'fs\');',
        // Unrelated code
        'const x = 1;',
        // Safe function
        'function safeHelper() { return true; }',
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Allowed contexts', () => {
    ruleTester.run('valid - test file context', noDynamicRequire, {
      valid: [
        // Test files with allowContexts
        {
          code: 'const mod = require(moduleName);',
          filename: 'src/utils.test.ts',
          options: [{ allowContexts: ['test'] }],
        },
        {
          code: 'const fixture = require(fixturePath);',
          filename: 'src/__tests__/helper.ts',
          options: [{ allowContexts: ['test'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Dynamic requires', () => {
    ruleTester.run('invalid - dynamic patterns', noDynamicRequire, {
      valid: [],
      invalid: [
        // Variable in require
        {
          code: 'const mod = require(moduleName);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Template literal in require
        {
          code: 'const mod = require(`./plugins/${name}`);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Concatenation in require
        {
          code: 'const mod = require("./handlers/" + handler);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Function call in require
        {
          code: 'const mod = require(getModulePath());',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Member expression in require
        {
          code: 'const mod = require(config.pluginPath);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
      ],
    });
  });
});


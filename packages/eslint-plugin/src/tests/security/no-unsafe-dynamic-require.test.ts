/**
 * Comprehensive tests for no-unsafe-dynamic-require rule
 * Security: CWE-95 (Code Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeDynamicRequire } from '../../rules/security/no-unsafe-dynamic-require';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-unsafe-dynamic-require', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - static require', noUnsafeDynamicRequire, {
      valid: [
        // Static require with string literal
        {
          code: 'const fs = require("fs");',
        },
        {
          code: 'const path = require("path");',
        },
        {
          code: 'const module = require("./local-module");',
        },
        // Template literal with no expressions
        {
          code: 'const fs = require(`fs`);',
        },
        {
          code: 'const path = require(`./utils/path`);',
        },
        // Not a require call
        {
          code: 'const result = myFunction(moduleName);',
        },
        {
          code: 'const obj = { require: () => {} }; obj.require(name);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Dynamic Require', () => {
    ruleTester.run('invalid - dynamic require calls', noUnsafeDynamicRequire, {
      valid: [],
      invalid: [
        {
          code: 'const module = require(moduleName);',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'const mod = require(userInput);',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'require(`./modules/${moduleName}`);',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'require(`./${dir}/${file}`);',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: `
            const moduleName = getUserInput();
            const mod = require(moduleName);
          `,
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'const mod = require(config.moduleName);',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', noUnsafeDynamicRequire, {
      valid: [],
      invalid: [
        {
          code: 'const mod = require(moduleName);',
          errors: [
            {
              messageId: 'unsafeDynamicRequire',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noUnsafeDynamicRequire, {
      valid: [
        // Empty require (should not trigger)
        {
          code: 'require();',
        },
        // Spread element (should not trigger)
        {
          code: 'require(...args);',
        },
      ],
      invalid: [
        {
          code: '(require)(moduleName);',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
        {
          code: 'const req = require; req(moduleName);',
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    });
  });

  describe('Options - allowDynamicImport', () => {
    ruleTester.run('allowDynamicImport option', noUnsafeDynamicRequire, {
      valid: [
        // Note: This option is for import(), not require()
        // So require() should still be flagged even with this option
      ],
      invalid: [
        {
          code: 'const mod = require(moduleName);',
          options: [{ allowDynamicImport: true }],
          errors: [{ messageId: 'unsafeDynamicRequire' }],
        },
      ],
    });
  });
});


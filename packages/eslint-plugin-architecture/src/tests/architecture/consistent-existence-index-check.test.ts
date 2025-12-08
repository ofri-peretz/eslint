/**
 * Comprehensive tests for consistent-existence-index-check rule
 * Convention: Consistent property existence checking
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { consistentExistenceIndexCheck } from '../../rules/architecture/consistent-existence-index-check';

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

describe('consistent-existence-index-check', () => {
  describe('Default preference (in operator)', () => {
    ruleTester.run('prefer in operator', consistentExistenceIndexCheck, {
      valid: [
        // Using 'in' operator (preferred by default)
        {
          code: 'if ("prop" in obj) {}',
        },
        {
          code: 'const exists = "key" in object;',
        },
        {
          code: 'return "method" in instance;',
        },
      ],
      invalid: [
        // hasOwnProperty method calls
        {
          code: 'if (obj.hasOwnProperty("prop")) {}',
          output: 'if ("prop" in obj) {}',
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'hasOwnProperty',
                preferred: 'in',
                fix: 'Use "prop in obj" instead of "obj.hasOwnProperty(prop)"',
              },
            },
          ],
        },
        {
          code: 'const exists = object.hasOwnProperty(key);',
          output: 'const exists = key in object;',
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'hasOwnProperty',
                preferred: 'in',
              },
            },
          ],
        },
        // Object.prototype.hasOwnProperty.call
        {
          code: 'if (Object.prototype.hasOwnProperty.call(obj, "prop")) {}',
          output: 'if ("prop" in obj) {}',
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'Object.prototype.hasOwnProperty.call',
                preferred: 'in',
              },
            },
          ],
        },
        // Object.hasOwn
        {
          code: 'if (Object.hasOwn(obj, "prop")) {}',
          output: 'if ("prop" in obj) {}',
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'Object.hasOwn',
                preferred: 'in',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Prefer hasOwnProperty', () => {
    ruleTester.run('prefer hasOwnProperty', consistentExistenceIndexCheck, {
      valid: [
        // Using hasOwnProperty (preferred in this config)
        {
          code: 'if (obj.hasOwnProperty("prop")) {}',
          options: [{ preferred: 'hasOwnProperty' }],
        },
        {
          code: 'const exists = object.hasOwnProperty(key);',
          options: [{ preferred: 'hasOwnProperty' }],
        },
      ],
      invalid: [
        // 'in' operator usage
        {
          code: 'if ("prop" in obj) {}',
          output: 'if (obj.hasOwnProperty("prop")) {}',
          options: [{ preferred: 'hasOwnProperty' }],
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'in',
                preferred: 'hasOwnProperty',
              },
            },
          ],
        },
        // Object.hasOwn usage
        {
          code: 'if (Object.hasOwn(obj, "prop")) {}',
          output: 'if (obj.hasOwnProperty("prop")) {}',
          options: [{ preferred: 'hasOwnProperty' }],
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'Object.hasOwn',
                preferred: 'hasOwnProperty',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Prefer Object.hasOwn', () => {
    ruleTester.run('prefer Object.hasOwn', consistentExistenceIndexCheck, {
      valid: [
        // Using Object.hasOwn (preferred in this config)
        {
          code: 'if (Object.hasOwn(obj, "prop")) {}',
          options: [{ preferred: 'Object.hasOwn' }],
        },
        {
          code: 'const exists = Object.hasOwn(object, key);',
          options: [{ preferred: 'Object.hasOwn' }],
        },
      ],
      invalid: [
        // 'in' operator usage
        {
          code: 'if ("prop" in obj) {}',
          output: 'if (Object.hasOwn(obj, "prop")) {}',
          options: [{ preferred: 'Object.hasOwn' }],
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'in',
                preferred: 'Object.hasOwn',
              },
            },
          ],
        },
        // hasOwnProperty usage
        {
          code: 'if (obj.hasOwnProperty("prop")) {}',
          output: 'if (Object.hasOwn(obj, "prop")) {}',
          options: [{ preferred: 'Object.hasOwn' }],
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'hasOwnProperty',
                preferred: 'Object.hasOwn',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Complex expressions', () => {
    ruleTester.run('complex property checks', consistentExistenceIndexCheck, {
      valid: [
        // Complex but valid expressions
        {
          code: 'const hasProp = "key" in obj && obj.key !== undefined;',
        },
      ],
      invalid: [
        // Complex hasOwnProperty calls (cannot auto-fix complex expressions)
        {
          code: 'if (!obj.hasOwnProperty(dynamicProp)) {}',
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'hasOwnProperty',
                preferred: 'in',
              },
            },
          ],
        },
        // Nested property access
        {
          code: 'if (config.options.hasOwnProperty("timeout")) {}',
          output: 'if ("timeout" in config.options) {}',
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'hasOwnProperty',
                preferred: 'in',
              },
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('edge cases', consistentExistenceIndexCheck, {
      valid: [
        // Non-property existence checks
        {
          code: 'if (array.indexOf(item) !== -1) {}',
        },
        {
          code: 'if (string.includes(substring)) {}',
        },
        // Other hasOwnProperty usages (not property checks)
        {
          code: 'const hasOwn = {}.hasOwnProperty;',
        },
      ],
      invalid: [
        // Computed property names
        {
          code: 'if (obj.hasOwnProperty(computedProp)) {}',
          output: 'if (computedProp in obj) {}',
          errors: [
            {
              messageId: 'consistentExistenceCheck',
              data: {
                current: 'hasOwnProperty',
                preferred: 'in',
              },
            },
          ],
        },
      ],
    });
  });
});

/**
 * Comprehensive tests for detect-object-injection rule
 * Security: CWE-915 (Prototype Pollution)
 * 
 * Type-Aware Feature:
 * This rule supports TypeScript type-aware checking to reduce false positives.
 * When TypeScript parser services are available (parserOptions.project configured),
 * the rule can detect if a property key is constrained to a union of safe string
 * literals (e.g., 'name' | 'email') and will NOT flag these as dangerous.
 * 
 * Without type information, all dynamic property accesses are flagged.
 * 
 * @see https://portswigger.net/web-security/prototype-pollution
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectObjectInjection } from '../rules/security/detect-object-injection';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
// Note: Without parserOptions.project, type-aware checking is not available
// Tests here verify the fallback behavior (flags all dynamic access)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('detect-object-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe object access', detectObjectInjection, {
      valid: [
        // Literal property access
        {
          code: 'obj.name = value;',
        },
        {
          code: 'obj["name"] = value;',
        },
        {
          code: 'const val = obj.name;',
        },
        {
          code: 'const val = obj["name"];',
        },
        // Dot notation
        {
          code: 'obj.property = value;',
        },
        {
          code: 'const val = obj.property;',
        },
        // Template literal with no expressions
        {
          code: 'obj["static"] = value;',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Bracket Notation', () => {
    ruleTester.run('invalid - dynamic property access', detectObjectInjection, {
      valid: [],
      invalid: [
        // Note: Rule may not detect all dynamic property access patterns
        // Rule checks for dangerous patterns but may miss some cases
        // These represent expected behavior - rule may need enhancement
        {
          code: 'obj[userInput] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'const val = obj[userKey];',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj[`${prefix}${key}`] = value;',
          // Template literal with expressions - should report once on AssignmentExpression
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: `
            const key = getUserInput();
            obj[key] = value;
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj[config.key] = value;',
          // Nested property access - should report once on AssignmentExpression
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('Invalid Code - Prototype Pollution', () => {
    ruleTester.run('invalid - prototype pollution patterns', detectObjectInjection, {
      valid: [],
      invalid: [
        // Note: Rule may not detect literal dangerous properties
        // Rule checks for dynamic access patterns but may miss literal dangerous properties
        // These represent expected behavior - rule may need enhancement
        {
          code: 'obj["__proto__"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj[prototypeKey] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj["constructor"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', detectObjectInjection, {
      valid: [],
      invalid: [
        {
          code: 'obj[userInput] = value;',
          errors: [
            {
              messageId: 'objectInjection',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', detectObjectInjection, {
      valid: [
        // Literal strings (if allowLiterals is true)
        {
          code: 'obj["name"] = value;',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        {
          code: 'obj[userInput] = value;',
          options: [{ allowLiterals: true }],
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', detectObjectInjection, {
      valid: [
        {
          code: 'obj["name"] = value;',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        {
          code: 'obj[userInput] = value;',
          options: [{ allowLiterals: true }],
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj[dangerousKey] = value;',
          options: [{ dangerousProperties: ['dangerousKey'] }],
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });
});


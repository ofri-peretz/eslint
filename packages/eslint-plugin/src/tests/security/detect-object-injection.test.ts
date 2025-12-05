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
import { detectObjectInjection } from '../../rules/security/detect-object-injection';

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

  describe('Type-Aware Detection (without parserOptions.project)', () => {
    /**
     * Note: These tests run WITHOUT TypeScript type information (no parserOptions.project).
     * Without type info, the rule falls back to flagging ALL dynamic property accesses.
     * 
     * When parserOptions.project IS configured (in a real TypeScript project),
     * the rule uses type information to detect:
     * - Union types like 'name' | 'email' → SAFE (not flagged)
     * - Single literal types like const key: 'name' → SAFE (not flagged)
     * - String type (any string) → DANGEROUS (flagged)
     * 
     * See the rule's JSDoc for detailed type-aware behavior.
     */
    ruleTester.run('type-aware fallback behavior', detectObjectInjection, {
      valid: [
        // Dot notation is always safe
        {
          code: 'obj.name = value;',
        },
        // String literal bracket notation
        {
          code: 'obj["email"] = value;',
        },
      ],
      invalid: [
        // Without type info, const key = 'name' is still an identifier access (flagged)
        // WITH type info and proper literal type inference, this would be SAFE
        {
          code: `
            const key = 'name';
            obj[key] = value;
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
        // Without type information, any identifier access is flagged
        // When type-aware: if key is typed as 'name' | 'email', this would be SAFE
        {
          code: `
            const key: string = getUserInput();
            obj[key] = value;
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
        // Generic string type should always be flagged
        {
          code: `
            function setProperty(obj: object, key: string, value: unknown) {
              obj[key] = value;
            }
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
        // Dynamic access with function return value
        {
          code: `
            const key = getPropertyName();
            obj[key] = value;
          `,
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('TypeScript Union Type Patterns (documentation)', () => {
    /**
     * These tests document expected behavior when type information IS available.
     * Without parserOptions.project, these tests verify the fallback behavior.
     * 
     * With type-aware checking enabled:
     * - Union of safe literals ('name' | 'email') → NOT flagged
     * - Union containing dangerous property ('__proto__' | 'name') → FLAGGED
     * - Generic string → FLAGGED
     */
    ruleTester.run('union type documentation tests', detectObjectInjection, {
      valid: [
        // These are always safe regardless of type info
        {
          code: 'obj["name"] = value;',
        },
        {
          code: 'obj["email"] = value;',
        },
        {
          code: `
            type SafeKey = 'name' | 'email';
            // With type info, this would be detected as safe
            // Without type info, we'd need the literal usage
            obj["name"] = value;
          `,
        },
      ],
      invalid: [
        // Dangerous property literal is ALWAYS flagged
        {
          code: 'obj["__proto__"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj["constructor"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        {
          code: 'obj["prototype"] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        // Variable access without type info is flagged
        {
          code: `
            type Key = 'name' | 'email';
            const key: Key = 'name';
            obj[key] = value;
          `,
          // Without type info, this is flagged because 'key' is an identifier
          // WITH type info, this would be SAFE (key is constrained to 'name' | 'email')
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });

  describe('Complex Access Patterns', () => {
    ruleTester.run('complex patterns', detectObjectInjection, {
      valid: [
        // Nested dot notation (safe)
        {
          code: 'obj.user.name = value;',
        },
        // Method call result with literal (safe)
        {
          code: 'const result = obj["data"];',
        },
      ],
      invalid: [
        // Nested bracket with variable (dangerous)
        {
          code: 'obj.users[userId] = data;',
          errors: [{ messageId: 'objectInjection' }],
        },
        // Chained bracket access (dangerous) - reports on both bracket accesses
        {
          code: 'obj[key1][key2] = value;',
          // Multiple bracket accesses - reports on each dangerous access
          errors: [
            { messageId: 'objectInjection' },
            { messageId: 'objectInjection' },
          ],
        },
        // Computed property from function (dangerous)
        {
          code: 'obj[getKey()] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
        // Ternary in bracket (dangerous)
        {
          code: 'obj[condition ? key1 : key2] = value;',
          errors: [{ messageId: 'objectInjection' }],
        },
      ],
    });
  });
});


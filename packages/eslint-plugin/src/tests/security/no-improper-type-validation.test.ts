/**
 * Comprehensive tests for no-improper-type-validation rule
 * Security: CWE-1287 (Improper Validation of Specified Type of Input)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noImproperTypeValidation } from '../../rules/security/no-improper-type-validation';

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

describe('no-improper-type-validation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - proper type validation', noImproperTypeValidation, {
      valid: [
        // Proper type checking with strict equality
        {
          code: 'if (value !== null && typeof value === "object") { /* process */ }',
        },
        {
          code: 'if (Array.isArray(data)) { /* process array */ }',
        },
        // Non-user-input typeof checks are valid
        {
          code: 'if (typeof value === "string" && value.length > 0) { /* process */ }',
        },
        // Safe type guards
        {
          code: 'if (Number.isNaN(Number(value))) { /* handle NaN */ }',
        },
        {
          code: 'if (Object.prototype.toString.call(value) === "[object Array]") { /* process */ }',
        },
        // Strict equality for types
        {
          code: 'if (value !== null && value !== undefined) { /* process */ }',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe typeof Checks', () => {
    ruleTester.run('invalid - unsafe typeof usage', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // typeof === "object" on user input variable
        {
          code: 'if (typeof userInput === "object") { processData(userInput); }',
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
        // typeof on data (user input variable)
        {
          code: 'const isObject = typeof data === "object";',
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unsafe instanceof Usage', () => {
    ruleTester.run('invalid - unsafe instanceof usage', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // instanceof on user input with allowInstanceofSameRealm: false
        {
          code: 'if (userInput instanceof Array) { processArray(userInput); }',
          options: [{ allowInstanceofSameRealm: false }],
          errors: [
            {
              messageId: 'unsafeInstanceofUsage',
            },
          ],
        },
        {
          code: 'if (data instanceof Object) { handleObject(data); }',
          options: [{ allowInstanceofSameRealm: false }],
          errors: [
            {
              messageId: 'unsafeInstanceofUsage',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Loose Equality Type Checks', () => {
    ruleTester.run('invalid - loose equality for types', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // Loose equality with null on user input variable - triggers both messages
        // IfStatement reports missingNullCheck, BinaryExpression reports looseEqualityTypeCheck
        {
          code: 'if (input != null) { processInput(input); }',
          errors: [
            {
              messageId: 'missingNullCheck',
            },
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
        // Loose equality with null (always flagged due to null comparison)
        {
          code: 'if (userData == null) { return; }',
          errors: [
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Missing Null Checks', () => {
    ruleTester.run('invalid - missing null checks', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // userInput is a user input variable - reports missingNullCheck first (IfStatement),
        // then looseEqualityTypeCheck (BinaryExpression)
        {
          code: 'if (userInput != null) { processData(userInput); }',
          errors: [
            {
              messageId: 'missingNullCheck',
            },
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
        // req.body involves user input variable - only reports looseEqualityTypeCheck
        // because req.body as MemberExpression doesn't trigger missingNullCheck
        {
          code: 'if (req.body == null) { return; }',
          errors: [
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unreliable Constructor Checks', () => {
    ruleTester.run('invalid - unreliable constructor checks', noImproperTypeValidation, {
      valid: [],
      invalid: [
        {
          code: 'const type = userInput.constructor.name;',
          errors: [
            {
              messageId: 'unreliableConstructorCheck',
            },
          ],
        },
        {
          code: 'if (data.constructor.name === "Array") { handleArray(data); }',
          errors: [
            {
              messageId: 'unreliableConstructorCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Improper Type Validation', () => {
    ruleTester.run('invalid - improper type validation patterns', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // typeof userInput === "object" - unsafe typeof check on user input
        {
          code: 'const type = typeof userInput === "object";',
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noImproperTypeValidation, {
      valid: [
        // Safe annotations
        {
          code: `
            /** @validated */
            if (typeof userInput === "object") {
              processData(userInput);
            }
          `,
        },
        // TypeScript type guards (would be handled by TS compiler)
        {
          code: `
            function isString(value: any): value is string {
              return typeof value === "string";
            }
          `,
        },
        // Safe type checking functions
        {
          code: `
            if (validateType(userInput, "object")) {
              processData(userInput);
            }
          `,
        },
        // Proper null checks
        {
          code: `
            if (userInput !== null && userInput !== undefined) {
              processData(userInput);
            }
          `,
        },
        // Safe instanceof within same realm
        {
          code: `
            const arr = [1, 2, 3];
            if (arr instanceof Array) {
              processArray(arr);
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom user input variables', noImproperTypeValidation, {
      valid: [
        // otherInput is NOT in userInputVariables, so it's not flagged
        {
          code: 'if (typeof otherInput === "object") { /* process */ }',
          options: [{ userInputVariables: ['customInput'] }],
        },
      ],
      invalid: [
        // customInput IS in userInputVariables, so it's flagged
        {
          code: 'if (typeof customInput === "object") { /* process */ }',
          options: [{ userInputVariables: ['customInput'] }],
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - disable instanceof checks', noImproperTypeValidation, {
      valid: [],
      invalid: [
        {
          code: 'if (data instanceof Array) { /* process */ }',
          options: [{ allowInstanceofSameRealm: false }],
          errors: [
            {
              messageId: 'unsafeInstanceofUsage',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Type Validation Scenarios', () => {
    ruleTester.run('complex - real-world type validation patterns', noImproperTypeValidation, {
      valid: [],
      invalid: [
        // typeof userInput === "object" triggers unsafeTypeofCheck
        {
          code: `
            function processUserData(userInput) {
              // DANGEROUS: typeof check misses null
              if (typeof userInput === "object") {
                // null would pass this check!
                Object.keys(userInput).forEach(key => {
                  processField(key, userInput[key]);
                });
              }
            }
          `,
          errors: [
            {
              messageId: 'unsafeTypeofCheck',
            },
          ],
        },
        // credentials != null triggers looseEqualityTypeCheck (null comparison)
        {
          code: `
            // Authentication bypass through type confusion
            function authenticate(credentials) {
              // DANGEROUS: loose equality allows type confusion
              if (credentials != null) {
                if (credentials.username == "admin") { // == allows string/number confusion
                  return { role: "admin" };
                }
              }
              return { role: "user" };
            }
          `,
          errors: [
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
        // input != null triggers missingNullCheck (IfStatement) first,
        // then looseEqualityTypeCheck (BinaryExpression)
        {
          code: `
            // Incomplete type validation
            function validateAndProcess(input) {
              // DANGEROUS: only checks != null, misses undefined
              if (input != null) {
                if (typeof input === "string") {
                  processString(input);
                } else if (Array.isArray(input)) {
                  processArray(input);
                }
                // undefined would pass != null check but cause issues
              }
            }
          `,
          errors: [
            {
              messageId: 'missingNullCheck',
            },
            {
              messageId: 'looseEqualityTypeCheck',
            },
          ],
        },
      ],
    });
  });
});

/**
 * Tests for no-unsafe-regex-construction rule
 * Security: CWE-400 (Uncontrolled Resource Consumption)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeRegexConstruction } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-unsafe-regex-construction', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe regex construction', noUnsafeRegexConstruction, {
      valid: [
        'const regex = /^[a-z]+$/;',
        'const safeRegex = new RegExp("^[0-9]+$");',
        'const pattern = /^.{1,100}$/;',
        // Escaped user input using trusted functions
        'const regex = new RegExp(escapeRegex(userInput));',
        'const regex = new RegExp(sanitize(userInput));',
        'const regex = new RegExp(escape(input));',
        // Non-RegExp calls
        'console.log("test");',
        'const result = someFunction(input);',
        // RegExp with no arguments (edge case)
        'const regex = new RegExp();',
        // RegExp called as function (not new)
        'const regex = RegExp("^test$");',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unsafe Regex Construction', () => {
    ruleTester.run('invalid - user-controlled regex patterns', noUnsafeRegexConstruction, {
      valid: [],
      invalid: [
        // Identifier user input
        {
          code: 'const regex = new RegExp(userInput);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        // Template literal with expressions
        {
          code: 'const pattern = new RegExp(`^${userPattern}$`);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        // Member expression (e.g., req.query.pattern)
        {
          code: 'const regex = new RegExp(req.query.pattern);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        // Function call with untrusted function
        {
          code: 'const regex = new RegExp(getPattern());',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('Pattern Length Limits', () => {
    ruleTester.run('pattern length - maxPatternLength option', noUnsafeRegexConstruction, {
      valid: [
        // Short pattern under limit
        {
          code: 'const regex = new RegExp("^short$");',
          options: [{ maxPatternLength: 100 }],
        },
      ],
      invalid: [
        // Pattern exceeds maxPatternLength
        {
          code: `const regex = new RegExp("${'a'.repeat(150)}");`,
          options: [{ maxPatternLength: 100 }],
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('allowLiterals Option', () => {
    ruleTester.run('allowLiterals - literal string handling', noUnsafeRegexConstruction, {
      valid: [
        // Literal allowed when allowLiterals is true (default)
        {
          code: 'const regex = new RegExp("^test$");',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        // Literal flagged when allowLiterals is false
        {
          code: 'const regex = new RegExp("^test$");',
          options: [{ allowLiterals: false }],
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('Dynamic Flags Detection', () => {
    ruleTester.run('dynamic flags - second argument checks', noUnsafeRegexConstruction, {
      valid: [
        // Static flags are safe
        {
          code: 'const regex = new RegExp("^test$", "gi");',
        },
      ],
      invalid: [
        // Dynamic flags from variable
        {
          code: 'const regex = new RegExp("^test$", flags);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        // Dynamic flags from member expression
        {
          code: 'const regex = new RegExp("^test$", options.flags);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
        // Dynamic flags from function call
        {
          code: 'const regex = new RegExp("^test$", getFlags());',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('Trusted Escaping Functions', () => {
    ruleTester.run('escaping - custom trusted functions', noUnsafeRegexConstruction, {
      valid: [
        // Custom trusted escaping function
        {
          code: 'const regex = new RegExp(myCustomEscape(userInput));',
          options: [{ trustedEscapingFunctions: ['myCustomEscape', 'escapeRegex'] }],
        },
      ],
      invalid: [
        // Untrusted function not in list
        {
          code: 'const regex = new RegExp(unknownEscape(userInput));',
          options: [{ trustedEscapingFunctions: ['myCustomEscape'] }],
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases - various patterns', noUnsafeRegexConstruction, {
      valid: [
        // Template literal without expressions is safe when allowLiterals is true
        {
          code: 'const regex = new RegExp(`^static$`);',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        // Template literal with expressions is unsafe
        {
          code: 'const regex = new RegExp(`^${input}$`);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });

    // `isUserInput` treats a bare Identifier argument as unsafe user input
    // regardless of its name — including the "safe-looking" names
    // (`pattern`, `regex`, `regExp`, `regexp`) that the function explicitly
    // special-cases (the special case still resolves to `true`, same as
    // the general Identifier fallthrough, but it's a distinct statement
    // that needs its own exercise for coverage).
    ruleTester.run('bare identifier argument named like a safe pattern var is still flagged', noUnsafeRegexConstruction, {
      valid: [],
      invalid: [
        {
          code: 'const regex = new RegExp(pattern);',
          errors: [{ messageId: 'unsafeRegexConstruction' }],
        },
      ],
    });

    // `isEscaped`'s parent-walk loop finds a trusted CallExpression that
    // wraps the *entire* `new RegExp(...)` call, not just the pattern
    // argument directly — e.g. `escapeRegex(new RegExp(userInput))`. Here
    // `patternNode` (`userInput`) is not itself a trusted call (so the
    // direct check fails), but walking up through its `.parent` chain
    // reaches the outer `escapeRegex(...)` CallExpression at depth 1,
    // exercising the walk's own trusted-function match (as opposed to the
    // direct check at the top of `isEscaped`).
    ruleTester.run('trusted function wraps the entire new RegExp(...) call', noUnsafeRegexConstruction, {
      valid: [
        {
          code: 'const regex = escapeRegex(new RegExp(userInput));',
        },
      ],
      invalid: [],
    });
  });
});

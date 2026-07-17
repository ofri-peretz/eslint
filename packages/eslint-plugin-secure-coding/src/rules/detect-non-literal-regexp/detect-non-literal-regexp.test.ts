/**
 * Comprehensive tests for detect-non-literal-regexp rule
 * Security: CWE-400 (ReDoS - Regular Expression Denial of Service)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectNonLiteralRegexp } from './index';

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

describe('detect-non-literal-regexp', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe regex patterns', detectNonLiteralRegexp, {
      valid: [
        // Not RegExp - these are safe
        {
          code: 'const result = myFunction(pattern);',
        },
        {
          code: 'obj.RegExp(pattern);',
        },
        // Note: This rule is very strict and detects ReDoS patterns even in literals
        // Most regex patterns will trigger the rule, so we only test non-RegExp code as valid
        // `new RegExp()` with zero arguments: `extractPattern` returns a
        // null patternNode, empty pattern, and isDynamic: false, so
        // `detectVulnerability('', false)` finds nothing and reports
        // nothing — exercises the "no arguments" false branches in
        // extractPattern.
        {
          code: 'new RegExp();',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Dynamic RegExp', () => {
    ruleTester.run('invalid - dynamic regex patterns', detectNonLiteralRegexp, {
      valid: [],
      invalid: [
        {
          code: 'const pattern = new RegExp(userInput);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        {
          code: 'const regex = RegExp(userPattern);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        {
          code: 'new RegExp(`^${userInput}$`);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        {
          code: `
            const pattern = getUserInput();
            const regex = new RegExp(pattern);
          `,
          errors: [{ messageId: 'regexpReDoS' }],
        },
        {
          code: 'new RegExp(config.pattern);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });
  });

  describe('Invalid Code - ReDoS Patterns in Literals', () => {
    ruleTester.run('invalid - True ReDoS vulnerable patterns', detectNonLiteralRegexp, {
      valid: [
        // Simple regex literals are now safe - no nested quantifiers
        { code: 'const pattern = /^[a-z]+$/;' },
        { code: 'const emailRegex = /^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$/;' },
        // Static string patterns with new RegExp are now also safe by default
        { code: 'const pattern = new RegExp("^[a-z]+$");' },
        { code: 'const pattern = RegExp("^test$");' },
        { code: 'const pattern = new RegExp(`^test$`);' },
        // Explicitly allowing literals also works
        { code: 'const pattern = new RegExp("^[a-z]+$");', options: [{ allowLiterals: true }] },
        { code: 'const pattern = RegExp("^test$");', options: [{ allowLiterals: true }] },
        { code: 'const pattern = new RegExp(`^test$`);', options: [{ allowLiterals: true }] },
      ],
      invalid: [
        // Truly dangerous nested quantifier patterns: (a+)+
        {
          code: 'const pattern = /(a+)+b/;',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        {
          code: 'const pattern = /([a-z]+)*/;',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // Dynamic regex with variables still flagged
        {
          code: 'const pattern = new RegExp(userInput);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });
  });


  describe('Suggestions', () => {
    ruleTester.run('suggestions for fixes', detectNonLiteralRegexp, {
      valid: [],
      invalid: [
        {
          code: 'const regex = new RegExp(userInput);',
          errors: [
            {
              messageId: 'regexpReDoS',
              // Note: Rule may not provide suggestions in all cases
            },
          ],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', detectNonLiteralRegexp, {
      valid: [
        // Note: Rule may detect RegExp calls even when reassigned
        // This is a limitation of static analysis
        // allowLiterals option now allows static string patterns
        {
          code: 'new RegExp("^test$");',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        {
          code: 'const RegExp = myFunction; RegExp(pattern);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options testing', detectNonLiteralRegexp, {
      valid: [
        // allowLiterals option now allows static string patterns  
        {
          code: 'new RegExp("^test$");',
          options: [{ allowLiterals: true }],
        },
      ],
      invalid: [
        // Dynamic userInput patterns are still flagged
        {
          code: 'new RegExp(userInput);',
          options: [{ maxPatternLength: 100 }],
          errors: [{ messageId: 'regexpReDoS' }],
        },
        {
          code: 'new RegExp(userInput);',
          options: [{ allowLiterals: true }],
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });
  });

  describe('Uncovered Lines', () => {
    // Note: Lines 365-368 (early return with allowLiterals) are not testable
    // because the rule flags all regex patterns as potentially vulnerable
    // The allowLiterals option only affects whether literals are processed or not

    // Line 389: Early return when no vulnerability is detected
    ruleTester.run('line 389 - no vulnerability detected', detectNonLiteralRegexp, {
      valid: [],
      invalid: [
        // This should trigger the no vulnerability case, but still report due to dynamic nature
        {
          code: 'new RegExp(userInput);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });

    // `detectVulnerability`'s dynamic-argument loop matches the *source
    // text* of the pattern argument against each REGEXP_PATTERNS regex.
    // `a++` is a dynamic (non-literal) argument whose text matches the
    // "nested wildcard/quantifier" entry (`.*\+\+.*`), so it returns that
    // REGEXP_PATTERNS object directly (not the generic dynamic fallback) —
    // this exercises the early `return vuln` inside the loop and, because
    // that object's `pattern` field is the regex source (not the literal
    // string `'dynamic'`), also exercises the `case 'redos'` branch in
    // `generateRefactoringSteps` (every constructed vulnerability has
    // `vulnerability: 'redos'`, so this is the only reachable switch arm).
    ruleTester.run('dynamic argument text matches a REGEXP_PATTERNS entry directly', detectNonLiteralRegexp, {
      valid: [],
      invalid: [
        {
          code: 'new RegExp(a++);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });

    // allowLiterals lets short, non-ReDoS literals through, but the rule
    // still checks literals for nested-quantifier ReDoS patterns even when
    // allowLiterals is true (the early-return guard requires
    // `!hasReDoSPatterns(pattern)`) — exercises the true branch of that
    // guard.
    ruleTester.run('allowLiterals still flags literal patterns with nested quantifiers', detectNonLiteralRegexp, {
      valid: [],
      invalid: [
        {
          code: 'new RegExp("(a+)+b");',
          options: [{ allowLiterals: true }],
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });

    // Dynamic pattern text longer than 30 chars — exercises the truncation
    // branch (`pattern.length > 30`) in the report `data.pattern` for the
    // dynamic-RegExp path.
    ruleTester.run('dynamic pattern text over 30 chars gets truncated in report data', detectNonLiteralRegexp, {
      valid: [],
      invalid: [
        {
          code: 'new RegExp(someVeryLongUserInputVariableName123456789);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });

    // Literal regex (not RegExp(...)) with a nested-quantifier ReDoS
    // pattern longer than 30 characters — exercises the same truncation
    // branch inside `checkLiteralRegExp`'s report data.
    ruleTester.run('literal ReDoS pattern over 30 chars gets truncated in report data', detectNonLiteralRegexp, {
      valid: [],
      invalid: [
        {
          code: 'const pattern = /(a+)+bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/;',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });
  });
});


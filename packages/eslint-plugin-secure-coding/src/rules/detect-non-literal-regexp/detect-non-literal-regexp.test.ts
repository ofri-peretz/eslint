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

    // A regex LITERAL is not a non-literal regexp. The rule used to report
    // `/(a+)+b/` from a `Literal:` visitor using two hand-written regexes as a
    // ReDoS detector. That is `no-redos-vulnerable-regex`'s remit, and it does
    // the job properly with an automaton analysis (scslre) rather than by
    // pattern-matching the pattern.
    //
    // The old heuristic was also wrong, not merely misplaced. It asserted
    // `/([a-z]+)*/` as a violation; measured, that regex completes in 0ms on
    // 'a'.repeat(60) + '!' because with no required suffix it matches at
    // position 0 and never backtracks. `/(a+)+b/` on the same input takes 58
    // seconds. The fixture pinned a false positive as correct behaviour.
    ruleTester.run('regex literals are out of remit', detectNonLiteralRegexp, {
      valid: [
        { code: 'const pattern = /(a+)+b/;' },
        { code: 'const pattern = /([a-z]+)*/;' },
        { code: 'const pattern = /^[a-z]+$/;' },
      ],
      invalid: [],
    });

    // The rule's core question changed from "is this a string literal?" to
    // "can the program determine this before any input arrives?". Every case
    // below was reported before that change and is program-controlled.
    ruleTester.run('build-time-constant patterns are not dynamic', detectNonLiteralRegexp, {
      valid: [
        // A loop counter is driven by the loop.
        { code: 'for (let i = 0; i < 3; i++) { const r = new RegExp("\\{" + i + "\\}", "g"); }' },
        // A module constant, and constant-preserving methods over one.
        { code: 'const EXTS = ["png", "jpg"]; const r = new RegExp(`${EXTS.join("|")}$`);' },
        { code: 'const PREFIX = "^v"; const r = new RegExp(PREFIX + "\\d+");' },
        { code: 'const A = ["x"]; const r = new RegExp(A.concat(["y"]).join("|"));' },
        { code: 'const S = "abc"; const r = new RegExp(S.toUpperCase());' },
        { code: 'const N = "ab"; const r = new RegExp(N.repeat(2));' },
        { code: 'const T = "a"; const r = new RegExp(`^${T}$`);' },
      ],
      invalid: [
        // Unresolvable provenance still reports: a parameter could be anything.
        {
          code: 'function build(pattern) { return new RegExp(pattern); }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // `let` can be reassigned between declaration and use.
        {
          code: 'let p = "^a"; p = readInput(); const r = new RegExp(p);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // A constant-preserving method over a NON-constant receiver is not constant.
        {
          code: 'function f(parts) { return new RegExp(parts.join("|")); }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // `map` takes a callback that could read anything — not in the allowlist.
        {
          code: 'const A = ["x"]; const r = new RegExp(A.map(String).join("|"));',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // Subtraction is not concatenation.
        {
          code: 'const N = 2; const r = new RegExp(String(N - 1));',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // A spread element hides its contents.
        {
          code: 'function f(rest) { const A = ["x", ...rest]; return new RegExp(A.join("|")); }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // A hole in an array literal resolves to undefined, not a constant.
        {
          code: 'const A = ["x", , "y"]; const r = new RegExp(A.join("|"));',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // An undeclared identifier cannot be resolved at all.
        {
          code: 'const r = new RegExp(globalPattern);',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // Known ceiling: the constancy walk gives up past 6 levels, so a
        // deeply-nested constant reports. No corpus repo nests this far.
        {
          code: 'const r = new RegExp("a" + ("b" + ("c" + ("d" + ("e" + ("f" + ("g" + "h")))))));',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });

    // `allowLiterals` now defaults to true, because a rule named
    // "non-literal" reporting `new RegExp('^[a-z]+$')` by default was the
    // opposite of its own contract. Setting it false restores the stricter
    // posture: prefer `/…/` syntax over the constructor.
    ruleTester.run('allowLiterals governs constructor-with-literal only', detectNonLiteralRegexp, {
      valid: [{ code: 'const r = new RegExp("^[a-z]+$");' }],
      invalid: [
        {
          code: 'const r = new RegExp("^[a-z]+$");',
          options: [{ allowLiterals: false }],
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // An absurdly long literal still reports even when literals are allowed.
        {
          code: `const r = new RegExp("${'x'.repeat(300)}");`,
          options: [{ allowLiterals: true, maxPatternLength: 100 }],
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });
  });
});


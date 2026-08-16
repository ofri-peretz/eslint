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
        // allowLiterals option now allows static string patterns
        {
          code: 'new RegExp("^test$");',
          options: [{ allowLiterals: true }],
        },
        /**
         * This case used to live under `invalid`, annotated "Rule may detect
         * RegExp calls even when reassigned / This is a limitation of static
         * analysis" — i.e. the suite pinned a false positive as correct
         * behaviour and documented it instead of fixing it.
         *
         * `RegExp` here is a local binding to `myFunction`. No regular
         * expression is constructed anywhere in this program. The only reason
         * the rule fired was that the identifier was SPELLED `RegExp`, which is
         * the reporting-by-name defect class CLAUDE.md puts first. The callee is
         * now resolved through the scope chain.
         */
        'const RegExp = myFunction; RegExp(pattern);',
        // A parameter shadowing the intrinsic — same reasoning, and the shape a
        // dependency-injection seam actually produces.
        'function render(RegExp, pattern) { return RegExp(pattern); }',
      ],
      invalid: [
        /**
         * REGRESSION LOCK — the constructor reached through a global namespace.
         * `new globalThis.RegExp(p)` is what isomorphic libraries write to
         * survive a bundler that shadows the bare identifier; the old
         * `callee.name === 'RegExp'` test could not see it at all.
         */
        {
          code: 'export function compile(rawPattern) { return new globalThis.RegExp(rawPattern); }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        /**
         * REGRESSION LOCK — the native-constructor capture. `NativeRegExp`
         * resolves, with no ambiguity, to the intrinsic.
         */
        {
          code: 'const NativeRegExp = RegExp; export function compile(p) { return new NativeRegExp(p); }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        /**
         * REGRESSION LOCK — a binding whose initialiser is constant but which is
         * later written by a `for...of` over an unproven iterable. The write has
         * no inspectable expression, so the value must stay unproven: clearing
         * it would be a missed vulnerability, not a missed suppression.
         */
        {
          code: 'export function scan(userPatterns) { let source = "^a$"; for (source of userPatterns) { new RegExp(source); } }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });
  });

  describe('Build-time constants are not attacker-controlled', () => {
    ruleTester.run('constant provenance', detectNonLiteralRegexp, {
      valid: [
        /**
         * REGRESSION LOCK — a `let` whose every write is a string literal. The
         * old check asked for the `const` KEYWORD; the question that decides
         * safety is whether the set of values the binding can hold is closed.
         */
        'export function compile(mode) { let source = "^\\\\d+$"; if (mode === "word") { source = "^\\\\w+$"; } return new RegExp(source); }',
        /**
         * REGRESSION LOCK — `for (const source of CONST_LIST)`. The loop binding
         * has no initialiser of its own, so reading `declarator.init` found
         * `null` and gave up, even though the iterable is a module constant of
         * literals — the same fact as `CONST_ARRAY.join("|")`, which was already
         * cleared, reached through a different node type.
         */
        'const SOURCES = ["^a$", "^b$"]; export function each() { for (const source of SOURCES) { new RegExp(source); } }',
        /**
         * REGRESSION LOCK — `String.raw` around the pattern source. Fixed at
         * parse time; only the node type differs from a plain literal.
         */
        'export const SEMVER = new RegExp(String.raw`^\\d+\\.\\d+\\.\\d+$`);',
      ],
      invalid: [
        // Positive control for the three above: the same shapes with an unproven
        // iterable / an unproven write must still report.
        {
          code: 'export function each(sources) { for (const source of sources) { new RegExp(source); } }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        {
          code: 'export function compile(mode, raw) { let source = "^\\\\d+$"; if (mode === "raw") { source = raw; } return new RegExp(source); }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // A tagged template whose tag is NOT String.raw proves nothing about the
        // produced string — the tag function can return anything.
        {
          code: 'export function compile(tag, value) { return new RegExp(tag`^${value}$`); }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
      ],
    });

    ruleTester.run('constructor resolution boundaries', detectNonLiteralRegexp, {
      valid: [
        // An alias chain longer than the resolution bound gives up and reports
        // nothing rather than recursing — the safe direction for a callee test
        // is to decline, since declining only costs a finding on a shape that
        // does not occur in real code.
        'const a1 = RegExp; const a2 = a1; const a3 = a2; const a4 = a3; const a5 = a4; const a6 = a5; export function f(p) { return new a6(p); }',
        // A callee that is neither an Identifier nor a member access resolves to
        // nothing knowable.
        'export function f(makeCtor, p) { return new (makeCtor())(p); }',
      ],
      invalid: [
        // `String.raw` WITH a substitution: constant iff the substitution is.
        {
          code: 'export function f(v) { return new RegExp(String.raw`^${v}$`); }',
          errors: [{ messageId: 'regexpReDoS' }],
        },
        // An UpdateExpression write carries no inspectable expression, so the
        // binding stays unproven.
        {
          code: 'export function f() { let source = "a"; source++; return new RegExp(source); }',
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
        // Previously a documented ceiling: the old walk gave up past 6 levels, so a
        // deeply-nested constant reported. Routing through devkit's isStaticExpression
        // removed the cutoff — nesting depth was never evidence of attacker control.
        { code: 'const r = new RegExp("a" + ("b" + ("c" + ("d" + ("e" + ("f" + ("g" + "h")))))));' },
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
        // Known ceiling on the LOCAL constancy walk — the one that understands
        // `.join()` / `.concat()` / `.toUpperCase()`, which devkit's
        // isStaticExpression does not model. It gives up past 6 levels, so a
        // deeply-chained constant reports. No corpus repo chains this far.
        {
          code:
            'const A = ["a"]; const r = new RegExp(' +
            'A.concat(A).concat(A).concat(A).concat(A).concat(A).concat(A).join("|"));',
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


/**
 * Tests for no-redos-vulnerable-regex rule
 * Security: CWE-400 (Uncontrolled Resource Consumption - ReDoS)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noRedosVulnerableRegex } from './index';

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

describe('no-redos-vulnerable-regex', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe regex patterns', noRedosVulnerableRegex, {
      valid: [
        'const regex = /^[a-z]+$/;',
        'const emailRegex = /^[^@]+@[^@]+$/;',
        'new RegExp("^[0-9]+$");',
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - ReDoS Vulnerable Patterns', () => {
    ruleTester.run('invalid - vulnerable regex patterns', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'const regex = /(a+)+b/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
        {
          code: 'const pattern = new RegExp("(x+)+y");',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });

    // scslre (NFA-based) reports come in two shapes: `Self` (a quantifier
    // reaching itself) and `Trade` (two quantifiers exchanging characters,
    // reported as "Cross-quantifier trade" by the rule), each carrying an
    // `exponential` flag. These two patterns exercise both `report.type`
    // branches and both `isExp` outcomes across the pair (verified
    // precisely via Layer 2 below; Layer 1 here proves real-parser
    // reachability end-to-end through the Literal listener).
    ruleTester.run('invalid - scslre Self-loop (exponential) report', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'const regex = /(a+)+b/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });

    ruleTester.run('invalid - scslre Trade (polynomial) report', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'const regex = /(a+)(a+)b/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });

    // Patterns that scslre's NFA analysis considers safe (no reports) but
    // that the heuristic REDOS_PATTERNS fallback still flags — exercises
    // the `checkWithScslre` catch-all `false` return path plus the
    // heuristic-only report/suggestions block (lines 346-362) that the
    // scslre-caught cases above never reach.
    ruleTester.run('invalid - heuristic-only match: alternation with quantifier', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'const regex = /(a|b)+c/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });

    ruleTester.run('invalid - heuristic-only match: nested wildcards', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'const regex = /.*.*/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });

    // `(a+)?` matches only the secondary fallback regex inside
    // hasReDoSVulnerability (none of the 5 REDOS_PATTERNS entries), and is
    // scslre-safe, so it exercises that fallback branch specifically.
    ruleTester.run('invalid - heuristic fallback-only nested quantifier', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'const regex = /(a+)?/;',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });
  });

  describe('Options Coverage', () => {
    ruleTester.run('options - allowCommonPatterns bypasses alternation', noRedosVulnerableRegex, {
      valid: [
        {
          code: 'const regex = /(a|b)+c/;',
          options: [{ allowCommonPatterns: true }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - maxPatternLength skips overly long patterns', noRedosVulnerableRegex, {
      valid: [
        {
          code: `const regex = /${'a'.repeat(600)}+/;`,
          options: [{ maxPatternLength: 100 }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - RegExp call expression', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'RegExp("(a+)+b");',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });

    // checkNewRegExp: a call/new expression whose callee is not the
    // `RegExp` identifier at all (e.g. any other function call) is skipped
    // entirely — proves the `!isRegExp` guard's true branch.
    ruleTester.run('valid - call expression with non-RegExp callee', noRedosVulnerableRegex, {
      valid: ['SomeOtherFunction("(a+)+b");', 'new SomeOtherClass("(a+)+b");'],
      invalid: [],
    });

    // checkNewRegExp: zero-argument RegExp()/new RegExp() calls have no
    // size argument to inspect and are silently skipped.
    ruleTester.run('valid - RegExp with no arguments', noRedosVulnerableRegex, {
      valid: ['RegExp();', 'new RegExp();'],
      invalid: [],
    });

    // checkNewRegExp: first argument is not a string literal at all
    // (e.g. a number or identifier) — skipped rather than analyzed.
    ruleTester.run('valid - RegExp with non-string-literal first argument', noRedosVulnerableRegex, {
      valid: ['new RegExp(123);', 'new RegExp(somePattern);'],
      invalid: [],
    });

    // checkNewRegExp: pattern length exceeds maxPatternLength in call form
    // (mirrors the literal-regex maxPatternLength test but for the
    // `new RegExp("...")` / `RegExp("...")` code path).
    ruleTester.run('valid - RegExp call form skips overly long patterns', noRedosVulnerableRegex, {
      valid: [
        {
          code: `new RegExp("${'a'.repeat(600)}+");`,
          options: [{ maxPatternLength: 100 }],
        },
      ],
      invalid: [],
    });

    // checkNewRegExp: safe string literal pattern produces no vulnerability
    // at all (hasReDoSVulnerability returns null) in call form.
    ruleTester.run('valid - RegExp call form with safe pattern', noRedosVulnerableRegex, {
      valid: ['new RegExp("^[a-z0-9]+$");'],
      invalid: [],
    });

    // checkNewRegExp: allowCommonPatterns bypass in call form — mirrors the
    // literal-regex allowCommonPatterns test but for `new RegExp("...")`.
    ruleTester.run('valid - RegExp call form allowCommonPatterns bypasses alternation', noRedosVulnerableRegex, {
      valid: [
        {
          code: 'new RegExp("(a|b)+c");',
          options: [{ allowCommonPatterns: true }],
        },
      ],
      invalid: [],
    });

    // checkNewRegExp: template-literal pattern with interpolation is
    // runtime-built and can't be fully analyzed, but a nested-quantifier
    // shape in the static template text is still flagged.
    ruleTester.run('invalid - template literal with nested-quantifier signature', noRedosVulnerableRegex, {
      valid: [],
      invalid: [
        {
          code: 'const re = new RegExp(`^(${pattern}+)+$`);',
          errors: [{ messageId: 'redosVulnerable' }],
        },
      ],
    });

    // checkNewRegExp: template-literal pattern with interpolation but no
    // nested-quantifier signature in the static text — not flagged.
    ruleTester.run('valid - template literal without nested-quantifier signature', noRedosVulnerableRegex, {
      valid: ['const re = new RegExp(`^${prefix}[a-z]+$`);'],
      invalid: [],
    });
  });

  describe('Layer 2 — synthetic AST (parser-unreachable branches)', () => {
    // checkNewRegExp is only ever invoked by the CallExpression/NewExpression
    // listeners, so `node.type` is always one of those two in practice. The
    // final `else` branch that returns early for any other node type can
    // never be produced by a real parser through those listener keys, so it
    // is exercised directly via a synthetic AST node and a mock context.
    it('checkNewRegExp early-returns for a node type that is neither Call nor New', () => {
      const { listeners, reports } = createWithMockContext(noRedosVulnerableRegex);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'ChainExpression',
        callee: { type: 'Identifier', name: 'RegExp' },
        arguments: [{ type: 'Literal', value: 'x+' }],
      });

      expect(reports).toHaveLength(0);
    });

    // Precise data-field verification for the scslre report loop's two
    // ternaries (`report.type === 'Self'` and `isExp ? ... : ...`), which
    // RuleTester's placeholder hydration can't assert on directly (it
    // requires supplying every placeholder or none). Layer 2 lets us read
    // context.report(...) calls' raw `data` before hydration.
    it('reports Self-loop exponential backtracking with the exact vulnerability copy', () => {
      const { listeners, reports } = createWithMockContext(noRedosVulnerableRegex);
      const literal = listeners.Literal as (node: unknown) => void;

      literal({
        type: 'Literal',
        regex: { pattern: '(a+)+b', flags: '' },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('redosVulnerable');
      expect(reports[0].data?.vulnerabilityName).toBe(
        'Self-loop quantifier (exponential backtracking)',
      );
      expect(reports[0].data?.severity).toBe('CRITICAL');
    });

    it('reports cross-quantifier trade polynomial backtracking with the exact vulnerability copy', () => {
      const { listeners, reports } = createWithMockContext(noRedosVulnerableRegex);
      const literal = listeners.Literal as (node: unknown) => void;

      literal({
        type: 'Literal',
        regex: { pattern: '(a+)(a+)b', flags: '' },
      });

      expect(reports.length).toBeGreaterThan(0);
      for (const report of reports) {
        expect(report.messageId).toBe('redosVulnerable');
        expect(report.data?.vulnerabilityName).toBe(
          'Cross-quantifier trade (polynomial backtracking)',
        );
        expect(report.data?.severity).toBe('HIGH');
      }
    });

    // checkWithScslre wraps the regexpp parse + scslre analyse call in a
    // try/catch and falls through to the heuristic check on failure. A
    // syntactically valid JS regex literal can never actually make
    // regexpp's parser throw (they implement the same ECMAScript grammar),
    // so this defensive catch is unreachable through any real parsed
    // Literal node. A synthetic node with a malformed `regex.pattern`
    // (impossible for a real parser to have produced, since the source
    // text would never have been a valid `Literal` in the first place)
    // exercises the catch path directly.
    it('falls through to the heuristic check when the regexpp parser throws', () => {
      const { listeners, reports } = createWithMockContext(noRedosVulnerableRegex);
      const literal = listeners.Literal as (node: unknown) => void;

      literal({
        type: 'Literal',
        // Unterminated character class — regexpp's RegExpParser.parsePattern
        // throws on this, which real JS would have rejected at parse time.
        regex: { pattern: '[a-', flags: '' },
      });

      // hasReDoSVulnerability finds no match in '[a-' either, so the
      // fallthrough resolves to "no vulnerability" and nothing is reported —
      // proving checkWithScslre returned false (didn't crash the rule) and
      // control passed to the heuristic path instead of propagating the
      // parser error.
      expect(reports).toHaveLength(0);
    });

    // The `[options = {}]` parameter default only applies when
    // `context.options[0]` is `undefined`; an explicit `null` bypasses the
    // default, so `options` stays `null` and only the redundant
    // `options || {}` fallback on the next line prevents a destructuring
    // crash. A real ESLint config array can't produce a literal `null`
    // options entry (the schema/defaultOptions machinery always supplies
    // an object or omits the entry), so this is exercised via a mock
    // context with `options: [null]`.
    it('falls back to defaults when context.options[0] is explicitly null', () => {
      const { listeners, reports } = createWithMockContext(noRedosVulnerableRegex, {
        options: [null],
      });
      const literal = listeners.Literal as (node: unknown) => void;

      literal({
        type: 'Literal',
        regex: { pattern: '(a|b)+c', flags: '' },
      });

      // Reaches the heuristic path with maxPatternLength defaulting to 500
      // and allowCommonPatterns defaulting to false — proving the `|| {}`
      // fallback produced a usable options object rather than throwing.
      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('redosVulnerable');
    });

    // checkNewRegExp: template-literal `quasis[].value.cooked` is always
    // populated by a real parser for a syntactically valid (non-tagged)
    // template literal, so the `?? raw` fallback can't be reached through
    // any real parsed AST. A synthetic quasi with `cooked: null` (as a
    // tagged-template AST would have for an invalid escape, which is not
    // achievable here since `new RegExp(...)` isn't a tagged template)
    // exercises the fallback directly.
    it('falls back to the raw quasi text when cooked is null', () => {
      const { listeners, reports } = createWithMockContext(noRedosVulnerableRegex);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'RegExp' },
        arguments: [
          {
            type: 'TemplateLiteral',
            expressions: [{ type: 'Identifier', name: 'pattern' }],
            quasis: [
              { value: { cooked: null, raw: '^(' } },
              { value: { cooked: null, raw: '+)+$' } },
            ],
          },
        ],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('redosVulnerable');
      expect(reports[0].data?.vulnerabilityName).toBe(
        'Runtime-built nested quantifier',
      );
    });
  });
});

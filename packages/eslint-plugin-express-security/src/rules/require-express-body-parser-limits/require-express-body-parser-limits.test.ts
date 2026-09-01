import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireExpressBodyParserLimits } from './index';

/**
 * Every fixture imports express, because the rules now abstain in files with no
 * Express in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass vacuously
 * on the gate instead of exercising the detection it was written for. `output`
 * and errors[].suggestions[].output are prefixed too, since autofix fixtures
 * assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving the `express`
// binding. Several fixtures already declare `const express = require('express')`
// at module level, and a default import would redeclare it.
const asExpress = (code: string): string => `import 'express';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const xp = <T>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asExpress(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asExpress(test.code),
      ...(typeof test.output === 'string'
        ? { output: asExpress(test.output) }
        : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asExpress(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });

const ruleTester = new RuleTester();

ruleTester.run(
  'require-express-body-parser-limits',
  requireExpressBodyParserLimits,
  {
    valid: xp([
      // ---------------------------------------------------------------
      // LOCK: Express's own 100kb default is not "unbounded".
      //
      // Every one of these reported `missingLimit` before 2026-08-12 and
      // every one is a body parser sitting on the documented default. Seven
      // of seven corpus findings were this shape. If the missing-limit
      // report ever comes back, this block goes red.
      // ---------------------------------------------------------------
      { name: 'the default limit', code: `express.json()` },
      { code: `express.urlencoded()` },
      { code: `express.raw()` },
      { code: `express.text()` },
      { code: `bodyParser.json()` },
      { code: `express.json({ extended: true })` },
      { code: `app.use(express.urlencoded({ extended: true }))` },
      { code: `express.json({})` },
      { code: `express.json({ type: 'application/json' })` },
      { code: `express.json()`, filename: 'app.spec.ts' },
      // With explicit limit
      {
        code: `express.json({ limit: '100kb' })`,
      },
      {
        code: `express.urlencoded({ limit: '10kb', extended: true })`,
      },
      {
        code: `express.raw({ limit: '1mb' })`,
      },
      {
        code: `express.text({ limit: '50kb' })`,
      },
      // bodyParser pattern
      {
        code: `bodyParser.json({ limit: '100kb' })`,
      },
      // Reasonable limits
      {
        code: `express.json({ limit: '1mb' })`,
      },
      {
        code: `express.json({ limit: '5mb' })`,
      },
      // Numeric spelling below the threshold
      { code: `express.json({ limit: 102400 })` },
      // A raised maxLimit accepts what the default would report
      {
        code: `express.json({ limit: '10mb' })`,
        options: [{ maxLimit: 20 * 1024 * 1024, excessiveLimits: [] }],
      },
      // Non-body parser calls - should be ignored
      {
        code: `express.static('public')`,
      },
      {
        code: `express.Router()`,
      },
      // Test file with allowInTests
      {
        code: `express.json()`,
        filename: 'test.spec.ts',
        options: [{ allowInTests: true }],
      },
    ]),
    invalid: xp([
      // Excessive limits
      {
        name: 'a 100mb body limit',
        code: `express.json({ limit: '100mb' })`,
        errors: [{ messageId: 'excessiveLimit' }],
      },
      {
        code: `express.json({ limit: '50mb' })`,
        errors: [{ messageId: 'excessiveLimit' }],
      },
      {
        code: `express.json({ limit: '1gb' })`,
        errors: [{ messageId: 'excessiveLimit' }],
      },
      // ---------------------------------------------------------------
      // LOCK: the numeric spelling. `limit: 52428800` is 50MB written the
      // way a constant usually is, and the string-only comparison could
      // not see it — a false negative for the whole life of the rule.
      // ---------------------------------------------------------------
      {
        code: `express.json({ limit: 52428800 })`,
        errors: [{ messageId: 'excessiveLimit' }],
      },
      // A decimal + unit still parses
      {
        code: `bodyParser.raw({ limit: '1.5gb' })`,
        errors: [{ messageId: 'excessiveLimit' }],
      },
      // Whitespace and mixed case around the unit
      {
        code: `express.text({ limit: ' 20 MB ' })`,
        errors: [{ messageId: 'excessiveLimit' }],
      },
      // A bare byte count with no unit
      {
        code: `express.urlencoded({ limit: '99999999' })`,
        errors: [{ messageId: 'excessiveLimit' }],
      },
      // A lowered maxLimit reports what the default would accept
      {
        code: `express.json({ limit: '1mb' })`,
        options: [{ maxLimit: 1024, excessiveLimits: [] }],
        errors: [{ messageId: 'excessiveLimit' }],
      },
      // The named list still wins on its own, even under a huge maxLimit
      {
        code: `express.json({ limit: '10mb' })`,
        options: [{ maxLimit: 1024 * 1024 * 1024, excessiveLimits: ['10mb'] }],
        errors: [{ messageId: 'excessiveLimit' }],
      },
    ]),
  },
);

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run(
  'require-express-body-parser-limits (coverage wave)',
  requireExpressBodyParserLimits,
  {
    valid: xp([
      // bare call — callee is not a member expression
      { code: `json({ limit: '1mb' });` },
      // deep member — object is not an identifier
      { code: `foo.bar.json();` },
      // object is neither express nor bodyParser
      { code: `myParser.json();` },
      // computed property — not an identifier
      { code: `express['json']();` },
      // property is not a body-parser method
      { code: `express.static('public');` },
      // options argument is not an object literal
      { code: `express.json(parserOptions);` },
      // identifier limit value — not a literal, nothing to evaluate
      { code: `express.json({ limit: MAX_BODY });` },
      // a template literal limit is a Literal-shaped value we cannot read
      { code: 'express.json({ limit: `${max}mb` });' },
      // boolean literal in the limit slot — neither number nor string
      { code: `express.json({ limit: false });` },
      // a string that `bytes` cannot parse
      { code: `express.json({ limit: 'huge' });` },
      // spread element in the options object — no `limit` key found
      { code: `express.json({ ...defaults });` },
      // a non-limit property whose key is not an identifier
      { code: `express.json({ ['limit']: '900mb' });` },
      // reasonable string limit
      { code: `express.json({ limit: '100kb' });` },
    ]),
    invalid: xp([
      // custom excessiveLimits matched case-insensitively
      {
        code: `express.json({ limit: '5GB' });`,
        options: [{ excessiveLimits: ['5gb'] }],
        errors: [{ messageId: 'excessiveLimit' }],
      },
    ]),
  },
);

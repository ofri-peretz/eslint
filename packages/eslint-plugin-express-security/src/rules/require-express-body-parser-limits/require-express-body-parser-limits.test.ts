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
const xp = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asExpress(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asExpress(test.code),
      ...(typeof test.output === 'string' ? { output: asExpress(test.output) } : {}),
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
      // No options - missing limit
      {
        code: `express.json()`,
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `express.json({ limit: '100kb' })`,
              },
            ],
          },
        ],
      },
      {
        code: `express.urlencoded()`,
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `express.urlencoded({ limit: '100kb' })`,
              },
            ],
          },
        ],
      },
      {
        code: `express.raw()`,
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `express.raw({ limit: '100kb' })`,
              },
            ],
          },
        ],
      },
      {
        code: `express.text()`,
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `express.text({ limit: '100kb' })`,
              },
            ],
          },
        ],
      },
      // bodyParser pattern
      {
        code: `bodyParser.json()`,
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `bodyParser.json({ limit: '100kb' })`,
              },
            ],
          },
        ],
      },
      // Options but no limit
      {
        code: `express.json({ extended: true })`,
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `express.json({ extended: true, limit: '100kb' })`,
              },
            ],
          },
        ],
      },
      {
        code: `express.urlencoded({ extended: true })`,
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `express.urlencoded({ extended: true, limit: '100kb' })`,
              },
            ],
          },
        ],
      },
      // Excessive limits
      {
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
      // Test file without allowInTests should still error
      {
        code: `express.json()`,
        filename: 'app.spec.ts',
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `express.json({ limit: '100kb' })`,
              },
            ],
          },
        ],
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
      // numeric limit — isExcessiveLimit only handles string literals
      { code: `express.json({ limit: 102400 });` },
      // identifier limit value
      { code: `express.json({ limit: MAX_BODY });` },
      // reasonable string limit
      { code: `express.json({ limit: '100kb' });` },
    ]),
    invalid: xp([
      // no options at all — suggestion rewrites the whole call
      {
        code: `express.json();`,
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `express.json({ limit: '100kb' });`,
              },
            ],
          },
        ],
      },
      // empty options object — fix cannot insert after a property, returns null
      { code: `express.json({});`, errors: [{ messageId: 'missingLimit' }] },
      // options without limit — suggestion appends after the last property
      {
        code: `express.json({ type: 'application/json' });`,
        errors: [
          {
            messageId: 'missingLimit',
            suggestions: [
              {
                messageId: 'addLimit',
                output: `express.json({ type: 'application/json', limit: '100kb' });`,
              },
            ],
          },
        ],
      },
      // custom excessiveLimits matched case-insensitively
      {
        code: `express.json({ limit: '5GB' });`,
        options: [{ excessiveLimits: ['5gb'] }],
        errors: [{ messageId: 'excessiveLimit' }],
      },
    ]),
  },
);

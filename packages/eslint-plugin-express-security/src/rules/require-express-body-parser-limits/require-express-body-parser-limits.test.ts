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

const missing = { messageId: 'missingLimit' as const };

// ---------------------------------------------------------------------------
// DECIDED BEHAVIOUR CHANGE (Ofri, 2026-11-23): a parser with NO `limit` is the
// finding; ANY explicit `limit` is a deliberate choice and is never reported.
//
// Every case below was in this file before and is kept, with its verdict
// flipped: the old "explicit limit above maxLimit reports" invalids are now
// valid, and the old "LOCK: the 100kb default is not a finding" valids are now
// invalid. `maxLimit` / `excessiveLimits` are accepted and ignored.
// ---------------------------------------------------------------------------
ruleTester.run(
  'require-express-body-parser-limits',
  requireExpressBodyParserLimits,
  {
    valid: xp([
      // Reasonable and generous explicit limits are all deliberate choices
      { code: `express.json({ limit: '100kb' })` },
      { code: `express.urlencoded({ limit: '10kb', extended: true })` },
      { code: `express.raw({ limit: '1mb' })` },
      { code: `express.text({ limit: '50kb' })` },
      { code: `bodyParser.json({ limit: '100kb' })` },
      { code: `express.json({ limit: '1mb' })` },
      { code: `express.json({ limit: '5mb' })` },
      { code: `express.json({ limit: 102400 })` },
      // Was invalid: an explicit limit above 5MB. Now a deliberate choice.
      {
        name: 'a 100mb body limit is an explicit choice',
        code: `express.json({ limit: '100mb' })`,
      },
      { code: `express.json({ limit: '50mb' })` },
      { code: `express.json({ limit: '1gb' })` },
      { code: `express.json({ limit: 52428800 })` },
      { code: `bodyParser.raw({ limit: '1.5gb' })` },
      { code: `express.text({ limit: ' 20 MB ' })` },
      { code: `express.urlencoded({ limit: '99999999' })` },
      {
        name: "express's named parser export, imported or required",
        code: `import { json } from 'express';
const { urlencoded: form } = require('express');
app.use(json({ limit: '50mb' }));
app.use(form({ limit: '50mb', extended: true }));`,
      },
      {
        name: 'a quoted or string-subscript `limit` key is still the option',
        code: `const { ['urlencoded']: form } = require('express');
app.use(form({ ['limit']: '50mb', extended: true }));
app.use(express.json({ 'limit': '50mb' }));`,
      },
      {
        name: 'a renamed body-parser import is still body-parser',
        code: `import parsers from 'body-parser';
app.use(parsers.json({ limit: '50mb' }));`,
      },
      // The retired options are accepted and have no effect
      {
        code: `express.json({ limit: '10mb' })`,
        options: [{ maxLimit: 1024, excessiveLimits: ['10mb'] }],
      },
      {
        code: `express.json({ limit: '1mb' })`,
        options: [{ maxLimit: 20 * 1024 * 1024, excessiveLimits: [] }],
      },
      // Non-body parser calls - should be ignored
      { code: `express.static('public')` },
      { code: `express.Router()` },
      {
        name: 'a computed `[limit]` key may carry the option, so the rule abstains',
        code: `const limit = 'inflate'; app.use(express.json({ [limit]: '50mb' }));`,
      },
      {
        name: 'a test file is skipped when allowInTests is set',
        code: `express.json()`,
        filename: 'test.spec.ts',
        options: [{ allowInTests: true }],
      },
    ]),
    invalid: xp([
      // Was valid under "LOCK: the 100kb default is not unbounded".
      {
        name: 'no options: runs on the unstated 100kb default',
        code: `express.json()`,
        errors: [missing],
      },
      { code: `express.urlencoded()`, errors: [missing] },
      { code: `express.raw()`, errors: [missing] },
      { code: `express.text()`, errors: [missing] },
      { code: `bodyParser.json()`, errors: [missing] },
      { code: `express.json({ extended: true })`, errors: [missing] },
      {
        code: `app.use(express.urlencoded({ extended: true }))`,
        errors: [missing],
      },
      { code: `express.json({})`, errors: [missing] },
      { code: `express.json({ type: 'application/json' })`, errors: [missing] },
      {
        name: 'a spec file reports unless allowInTests is set',
        code: `express.json()`,
        filename: 'app.spec.ts',
        errors: [missing],
      },
      {
        name: "express's named parser export, imported or required, with no limit",
        code: `import { json } from 'express';
const { urlencoded: form } = require('express');
app.use(json());
app.use(form({ extended: true }));`,
        errors: [missing, missing],
      },
      {
        name: 'a renamed body-parser import with no limit',
        code: `import parsers from 'body-parser';
app.use(parsers.json());`,
        errors: [missing],
      },
      {
        name: 'a static key that is not `limit` leaves the limit unset',
        code: `express.json({ 'inflate': false, ['strict']: true });`,
        errors: [missing],
      },
      {
        name: 'the retired options do not suppress the finding',
        code: `express.json()`,
        options: [{ maxLimit: 1024 * 1024 * 1024, excessiveLimits: [] }],
        errors: [missing],
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
      { code: `json();` },
      // deep member — object is not an identifier
      { code: `foo.bar.json();` },
      // object is neither express nor bodyParser
      { code: `myParser.json();` },
      // property is not a body-parser method
      { code: `express.static('public');` },
      // options argument is not an object literal
      { code: `express.json(parserOptions);` },
      // identifier / template / boolean / unparseable limit values are all explicit
      { code: `express.json({ limit: MAX_BODY });` },
      { code: 'express.json({ limit: `${max}mb` });' },
      { code: `express.json({ limit: false });` },
      { code: `express.json({ limit: 'huge' });` },
      // spread element in the options object — may carry the limit
      { code: `express.json({ ...defaults });` },
      { code: `express.json({ limit: '100kb' });` },
      // a string-subscript key still names `limit`
      { code: `express.json({ ['limit']: '900mb' });` },
    ]),
    invalid: xp([
      // a string-subscript method still names the parser
      { code: `express['json']();`, errors: [missing] },
      // only the first argument is the options object
      { code: `express.json({ }, extra);`, errors: [missing] },
    ]),
  },
);

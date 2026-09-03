/**
 * Tests for no-permissive-cors rule
 * Security: CWE-942 (Permissive Cross-domain Policy)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { noPermissiveCors } from './index';

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


RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-permissive-cors', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - restricted origins', noPermissiveCors, {
      valid: xp([
        // CORS with specific origin whitelist
        {
          name: 'an explicit origin list',
          code: `
            import cors from 'cors';
            app.use(cors({
              origin: ['https://example.com', 'https://app.example.com']
            }));
          `,
        },
        // CORS with single origin string
        {
          code: `
            import cors from 'cors';
            app.use(cors({
              origin: 'https://example.com'
            }));
          `,
        },
        // CORS with callback function (dynamic validation)
        {
          code: `
            import cors from 'cors';
            app.use(cors({
              origin: (origin, callback) => {
                if (allowlist.includes(origin)) {
                  callback(null, true);
                } else {
                  callback(new Error('Not allowed'));
                }
              }
            }));
          `,
        },
        // Allow origin: true with option
        {
          code: `
            import cors from 'cors';
            app.use(cors({ origin: true }));
          `,
          options: [{ allowOriginTrue: true }],
        },
        // Test file with allowInTests
        {
          code: `
            import cors from 'cors';
            app.use(cors({ origin: '*' }));
          `,
          options: [{ allowInTests: true }],
          filename: 'app.test.ts',
        },
        // Not a cors call
        {
          code: `
            import notCors from 'not-cors';
            app.use(notCors({ origin: '*' }));
          `,
        },
      ]),
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - permissive origins', noPermissiveCors, {
      valid: [],
      invalid: xp([
        // Wildcard origin
        {
          name: "origin '*'",
          code: `
            import cors from 'cors';
            app.use(cors({ origin: '*' }));
          `,
          errors: [{ messageId: 'permissiveCors' }],
        },
        // origin: true (reflects request)
        {
          code: `
            import cors from 'cors';
            app.use(cors({ origin: true }));
          `,
          errors: [{ messageId: 'permissiveCors' }],
        },
        // cors() with no options
        {
          code: `
            import cors from 'cors';
            app.use(cors());
          `,
          errors: [{ messageId: 'permissiveCors' }],
        },
        // Direct cors() call (not wrapped in app.use)
        {
          code: `const corsMiddleware = cors({ origin: '*' });`,
          errors: [{ messageId: 'permissiveCors' }],
        },
      ]),
    });
  });
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('no-permissive-cors (coverage wave)', noPermissiveCors, {
  valid: xp([
    // app.use(cors(identifier)) — config is not an inline object
    { code: `app.use(cors(corsOptions));` },
    // standalone cors(identifier)
    { code: `cors(corsOptions);` },
    // origin: true allowed when allowOriginTrue is set
    { code: `cors({ origin: true });`, options: [{ allowOriginTrue: true }] },
    // credentials with an explicit origin — not permissive
    {
      code: `cors({ origin: 'https://a.com', credentials: true });`,
      options: [{ allowOriginTrue: true }],
    },
  ]),
  invalid: xp([]),
});

// ---------------------------------------------------------------------------
// RULE PARTITION with no-cors-credentials-wildcard
// ---------------------------------------------------------------------------
// A permissive origin PLUS `credentials: true` is the specific finding, and
// no-cors-credentials-wildcard owns it: it names the credential leak and
// prescribes an explicit-origin allowlist, which is strictly more than this
// rule can say. Both fired on the same two corpus sites — okta-signin-widget
// playground/mocks/server.js:73 and :79 — so one fix was reported twice at two
// severities. This rule keeps everything else.
ruleTester.run('no-permissive-cors (partition)', noPermissiveCors, {
  valid: xp([
    // Owned by no-cors-credentials-wildcard. Both corpus shapes.
    { code: `app.use(cors({ origin: true, credentials: true }));` },
    { code: `app.options(config.path, cors({ origin: true, credentials: true }));` },
    { code: `cors({ origin: '*', credentials: true });` },
    // Quoted keys are the same properties.
    { code: `cors({ 'origin': true, 'credentials': true });` },
  ]),
  invalid: xp([
    // Permissive origin with no credentials attached — still this rule's.
    {
      code: `app.use(cors({ origin: true }));`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    {
      code: `app.use(cors({ origin: '*' }));`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // The partition reads the PROPERTY, not the printed text. `credentials:
    // true` nested inside another object is not this object's credentials, so
    // the yield must not fire and the permissive origin is still reported.
    {
      code: `cors({ origin: true, headers: { credentials: true } });`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // A computed key is not a statically-known property, so the yield cannot
    // claim this object sets credentials.
    {
      code: `cors({ [flag]: true, origin: true });`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // Spread members hide their contents from both predicates.
    {
      code: `cors({ ...base, origin: true });`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // credentials: true with a NON-permissive origin is not the sibling's
    // case either, so the yield must not fire.
    {
      code: `app.use(cors({ origin: '*', credentials: false }));`,
      errors: [{ messageId: 'permissiveCors' }],
    },
  ]),
});

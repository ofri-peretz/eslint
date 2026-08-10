import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noCorsCredentialsWildcard } from './index';

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


RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('no-cors-credentials-wildcard', noCorsCredentialsWildcard, {
  valid: xp([
    // Safe: explicit origin with credentials
    {
      code: `
        const corsOptions = {
          origin: 'https://trusted-domain.com',
          credentials: true
        };
        app.use(cors(corsOptions));
      `,
    },
    // Safe: origin array with credentials
    {
      code: `
        app.use(cors({
          origin: ['https://app.example.com', 'https://admin.example.com'],
          credentials: true
        }));
      `,
    },
    // Safe: wildcard origin WITHOUT credentials
    {
      code: `
        app.use(cors({
          origin: '*'
        }));
      `,
    },
    // Safe: credentials false with wildcard
    {
      code: `
        app.use(cors({
          origin: '*',
          credentials: false
        }));
      `,
    },
    // Safe: origin: true WITHOUT credentials
    {
      code: `
        cors({
          origin: true
        });
      `,
    },
    // Safe: no cors config
    {
      code: `
        app.use(helmet());
      `,
    },
  ]),
  invalid: xp([
    // Critical: wildcard origin with credentials: true
    {
      code: `
        app.use(cors({
          origin: '*',
          credentials: true
        }));
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
    // Critical: origin: true with credentials: true
    {
      code: `
        app.use(cors({
          origin: true,
          credentials: true
        }));
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
    // Standalone cors() call with dangerous config
    {
      code: `
        const options = cors({
          origin: '*',
          credentials: true
        });
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
    // Double-quoted wildcard
    {
      code: `
        app.use(cors({
          origin: "*",
          credentials: true
        }));
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
    // Template literal wildcard
    {
      code: `
        app.use(cors({
          origin: \`*\`,
          credentials: true
        }));
      `,
      errors: [{ messageId: 'credentialsWildcard' }],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-cors-credentials-wildcard (coverage wave)',
  noCorsCredentialsWildcard,
  {
    valid: xp([
      // cors() with no arguments — nothing to inspect
      { code: `cors();` },
      // cors(identifier) — config is not an inline object literal
      { code: `const c = cors(corsOptions);` },
      // app.use(cors(identifier)) — inner config is not an object literal
      { code: `app.use(cors(corsOptions));` },
      // allowInTests: true + test filename disables the rule entirely
      {
        code: `app.use(cors({ origin: '*', credentials: true }));`,
        options: [{ allowInTests: true }],
        filename: 'server.test.ts',
      },
      // wildcard origin without credentials — only one condition met
      { code: `app.use(cors({ origin: '*' }));` },
      // credentials without a wildcard origin
      {
        code: `app.use(cors({ origin: 'https://a.com', credentials: true }));`,
      },
    ]),
    invalid: xp([
      // allowInTests: true but NON-test filename — still reported
      {
        code: `app.use(cors({ origin: '*', credentials: true }));`,
        options: [{ allowInTests: true }],
        filename: 'server.ts',
        errors: [{ messageId: 'credentialsWildcard' }],
      },
      // origin: true (reflected origin) + credentials: true
      {
        code: `cors({ origin: true, credentials: true });`,
        errors: [{ messageId: 'credentialsWildcard' }],
      },
    ]),
  },
);

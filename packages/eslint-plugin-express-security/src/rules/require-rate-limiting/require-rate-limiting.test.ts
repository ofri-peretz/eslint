/**
 * Tests for require-rate-limiting rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireRateLimiting } from './index';
import * as vitest from 'vitest';

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
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-rate-limiting', requireRateLimiting, {
  valid: xp([
    {
      // ToniR7/express-typescript-starter: the app is created here and the rate limiter
      // is registered in `utils/appInitialization.ts`. Once the binding is handed
      // to another function the middleware stack is assembled out of view, so
      // "not here" says nothing about the application.
      code: `
        import express from 'express';
        import { setAppConfigurations, setAppRoutes } from './utils/index.ts';
        const app = express();
        setAppConfigurations(app);
        setAppRoutes(app);
      `,
    },
    {
      // A call that takes the app but is not the escape hatch's target still
      // counts — we cannot tell `configure(app)` from `log(app)`, and guessing
      // is what produced the false positive in the first place.
      code: `
        import express from 'express';
        const app = express();
        registerEverything(app);
      `,
    },
    // Express with rate limiting
    {
      code: `
        import express from 'express';
        import rateLimit from 'express-rate-limit';
        const app = express();
        app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
      `,
    },
    // With limiter variable
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(limiter);
      `,
    },
    // Alternative middleware
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(customRateLimiter());
      `,
      options: [{ alternativeMiddleware: ['customRateLimiter'] }],
    },
    // No express app
    {
      code: `
        import fastify from 'fastify';
        const app = fastify();
      `,
    },
    // Test file with allowInTests
    {
      code: `
        const app = express();
      `,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    // assumeRateLimiting option (rate limiting provided by API Gateway)
    {
      code: `
        import express from 'express';
        const app = express();
        app.use(express.json());
      `,
      options: [{ assumeRateLimiting: true }],
    },
  ]),
  invalid: xp([
    {
      // `express()` with no binding at all — there is nothing to follow, so the
      // escape hatch must not engage and the missing middleware is still a
      // finding. Guards the abstain path against over-reaching.
      code: `
        import express from 'express';
        express().listen(3000);
      `,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
    // Express without rate limiting
    {
      code: `
        import express from 'express';
        const app = express();
        app.use(helmet());
      `,
      errors: [
        {
          messageId: 'missingRateLimiting',
        },
      ],
    },
    // Express with only other middleware
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(cors());
        app.use(express.json());
      `,
      errors: [
        {
          messageId: 'missingRateLimiting',
        },
      ],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('require-rate-limiting (coverage wave)', requireRateLimiting, {
  valid: xp([
    // rate-limiter referenced as an identifier without a call
    { code: `const app = express(); app.use(rateLimiter);` },
    // rate-limiter factory call
    { code: `const app = express(); app.use(limiter());` },
  ]),
  invalid: xp([
    // identifier middleware that is not a rate limiter
    {
      code: `const app = express(); app.use(logger);`,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
    // called middleware that is not a rate limiter
    {
      code: `const app = express(); app.use(morgan());`,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
  ]),
});

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
      name: 'the default receiver list replaced away',
      code: `
        const app = express();
        app.post('/auth/token', issueToken);
      `,
      options: [{ appReceiverNames: ['gateway'] }],
    },
    // -----------------------------------------------------------------
    // LOCK: "an Express app exists" is not a throttling finding.
    //
    // All six corpus findings reported the `express()` call itself — the
    // identical character `require-helmet` reported, with a different fix.
    // An app with nothing to brute-force has no CWE-770 surface a linter
    // can adjudicate. Each of these reported `missingRateLimiting` before
    // 2026-08-12.
    // -----------------------------------------------------------------
    {
      name: 'an app with no authentication route to limit',
      code: `
        import express from 'express';
        const app = express();
        app.use(express.static('./public'));
        app.listen(8080);
      `,
    },
    {
      code: `
        import express from 'express';
        const app = express();
        app.get('/login/callback', redirectToOrigin);
        app.get('/login', redirectToOrigin);
      `,
    },
    {
      // A state-changing route that is not a credential surface.
      code: `
        import express from 'express';
        const app = express();
        app.post('/articles', createArticle);
      `,
    },
    // -----------------------------------------------------------------
    // LOCK: `module.exports = app` is an escape, not a missing control.
    // -----------------------------------------------------------------
    {
      code: `
        const express = require('express');
        const app = express();
        module.exports = app;
        app.post('/login', handleLogin);
      `,
    },
    {
      code: `
        import express from 'express';
        const app = express();
        app.post('/auth/token', issueToken);
        export default app;
      `,
    },
    {
      code: `
        import express from 'express';
        function build() {
          const app = express();
          app.post('/login', handleLogin);
          return app;
        }
      `,
    },
    {
      // ToniR7/express-typescript-starter: the app is created here and the rate limiter
      // is registered in `utils/appInitialization.ts`. Once the binding is handed
      // to another function the middleware stack is assembled out of view, so
      // "not here" says nothing about the application.
      code: `
        import express from 'express';
        import { setAppConfigurations, setAppRoutes } from './utils/index.ts';
        const app = express();
        app.post('/login', handleLogin);
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
        app.post('/login', handleLogin);
        registerEverything(app);
      `,
    },
    // Express with rate limiting
    {
      code: `
        import express from 'express';
        import rateLimit from 'express-rate-limit';
        const app = express();
        app.post('/login', handleLogin);
        app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
      `,
    },
    // A limiter mounted on the route itself, not app-wide
    {
      code: `
        import express from 'express';
        const app = express();
        app.post('/login', loginLimiter, handleLogin);
      `,
    },
    // With limiter variable
    {
      code: `
        const express = require('express');
        const app = express();
        app.post('/login', handleLogin);
        app.use(limiter);
      `,
    },
    // Alternative middleware
    {
      code: `
        const express = require('express');
        const app = express();
        app.post('/login', handleLogin);
        app.use(customRateLimiter());
      `,
      options: [{ alternativeMiddleware: ['customRateLimiter'] }],
    },
    // No express app
    {
      code: `
        import fastify from 'fastify';
        const app = fastify();
        app.post('/login', handleLogin);
      `,
    },
    // Test file with allowInTests
    {
      code: `
        const app = express();
        app.post('/login', handleLogin);
      `,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    // assumeRateLimiting option (rate limiting provided by API Gateway)
    {
      code: `
        import express from 'express';
        const app = express();
        app.post('/login', handleLogin);
      `,
      options: [{ assumeRateLimiting: true }],
    },
    // A credential path on a read-only method is not the brute-force surface
    {
      code: `
        import express from 'express';
        const app = express();
        app.get('/password/policy', showPolicy);
      `,
    },
    // A receiver that is not an app/router
    {
      code: `
        import express from 'express';
        const app = express();
        queue.post('/login', handleLogin);
      `,
    },
    // A computed route method
    {
      code: `
        import express from 'express';
        const app = express();
        app[verb]('/login', handleLogin);
      `,
    },
    // A non-literal path cannot be classified
    {
      code: `
        import express from 'express';
        const app = express();
        app.post(loginPath, handleLogin);
      `,
    },
    // A numeric first argument
    {
      code: `
        import express from 'express';
        const app = express();
        app.post(1, handleLogin);
      `,
    },
    // A route registration with no handler is a settings lookup, not a route
    {
      code: `
        import express from 'express';
        const app = express();
        app.post('/login');
      `,
    },
    // `border` contains no credential word despite sharing letters with `order`
    {
      code: `
        import express from 'express';
        const app = express();
        app.post('/reauthorization-notes', save);
      `,
    },
  ]),
  invalid: xp([
    {
      name: 'a receiver the consumer named',
      code: `
        const gateway = express();
        gateway.post('/auth/token', issueToken);
      `,
      options: [{ appReceiverNames: ['gateway'] }],
      errors: [{ messageId: 'missingRateLimiting' }],
    },
    // -----------------------------------------------------------------
    // The two findings that survived adjudication: okta-auth-js's sample
    // servers accept a username/password pair on an unthrottled POST.
    // -----------------------------------------------------------------
    {
      name: 'a login route with no rate limiter',
      code: `
        const express = require('express');
        const app = express();
        app.use(express.urlencoded());
        app.post('/login', function (req, res) {
          authClient.signIn({ username: req.body.username, password: req.body.password });
        });
      `,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
    // Only the first credential route is reported — the fix is one edit.
    {
      code: `
        import express from 'express';
        const app = express();
        app.post('/auth/token', issueToken);
        app.post('/password/reset', resetPassword);
      `,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
    // Router receiver
    {
      code: `
        import express from 'express';
        const app = express();
        router.put('/account/password', changePassword);
      `,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
    // A non-limiter middleware in the chain does not count
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(cors());
        app.delete('/session', destroySession);
      `,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('require-rate-limiting (coverage wave)', requireRateLimiting, {
  valid: xp([
    // rate-limiter referenced as an identifier without a call
    {
      code: `const app = express(); app.post('/login', h); app.use(rateLimiter);`,
    },
    // rate-limiter factory call
    {
      code: `const app = express(); app.post('/login', h); app.use(limiter());`,
    },
    // a bare call — callee is not a member expression
    { code: `const app = express(); doSomething('/login', h);` },
    // a member call with a computed property
    {
      code: `const app = express(); app['post']('/login', h); app.use(limiter);`,
    },
    // a release node whose right-hand side is not the app binding
    {
      code: `const app = express(); app.post('/login', h); module.exports = router; app.use(limiter);`,
    },
    // `return` with no argument, in a function that also holds the app
    {
      code: `function f() { const app = express(); app.post('/login', h); if (x) return; app.use(limiter); }`,
    },
  ]),
  invalid: xp([
    // identifier middleware that is not a rate limiter
    {
      code: `const app = express(); app.use(logger); app.post('/login', h);`,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
    // called middleware that is not a rate limiter
    {
      code: `const app = express(); app.use(morgan()); app.patch('/otp', h);`,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
    // `express()` with no binding — the escape hatch must not engage, and a
    // release node with nothing to release must not crash it
    {
      code: `express(); module.exports = 1; app.post('/login', h);`,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
    // destructured app binding — nothing to follow
    {
      code: `const { listen } = express(); app.post('/login', h);`,
      errors: [{ messageId: 'missingRateLimiting' }],
    },
  ]),
});

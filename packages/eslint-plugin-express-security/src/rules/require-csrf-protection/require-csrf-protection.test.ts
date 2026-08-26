/**
 * Tests for require-csrf-protection rule
 *
 * Zero FP tolerance - comprehensive edge case coverage
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireCsrfProtection } from './index';
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

/**
 * Both preconditions have to hold before this rule reports, so every fixture
 * that is meant to *report* needs both: a session/cookie in the file, and an
 * authenticated route. `withSession` supplies the first without touching the
 * route under test, so a fixture can never pass vacuously for the wrong reason.
 */
const SESSION =
  "import session from 'express-session';\napp.use(session({ secret: s }));\n";

ruleTester.run('require-csrf-protection', requireCsrfProtection, {
  valid: xp([
    // ============================================
    // LOCK: precondition 1 — no ambient credential, no CSRF.
    //
    // 36 of 38 corpus findings were here: okta-auth-js's IdX sample routers
    // and auth0's OIDC callback mount POST handlers in files with no cookie
    // and no session anywhere. A forged cross-site request to them carries
    // no authority, so a token would protect nothing. Every fixture in this
    // block reported `missingCsrf` before 2026-08-12.
    // ============================================
    {
      name: 'a router whose handler carries the check',
      code: `
        const express = require('express');
        const router = express.Router();
        router.post('/select-authenticator', async (req, res, next) => {
          const { authenticator } = req.body;
          handleTransaction({ req, res, next, authenticator });
        });
        module.exports = router;
      `,
    },
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(express.urlencoded());
        app.post('/login', function (req, res) {
          authClient.signIn({ username: req.body.username });
        });
      `,
    },
    {
      // auth0/express-openid-connect middleware/auth.js — `config.session` is
      // a property of a *config object*, not a session read. A property-name
      // match that ignored the receiver read it as cookie evidence.
      code: `
        const express = require('express');
        const router = new express.Router();
        router.post(path, express.urlencoded({ extended: false }), (req, res) =>
          res.oidc.callback(),
        );
        req[config.session.name] = undefined;
      `,
    },
    // ============================================
    // LOCK: precondition 2 — the partition with require-route-authentication.
    //
    // An unauthenticated route has no ambient authority to forge. CWE-306 is
    // the finding there and that rule owns it; before this both rules
    // reported the same seven routes.
    // ============================================
    {
      code: `
        import session from 'express-session';
        const app = express();
        app.use(session({ secret: s }));
        app.post('/signup', createAccount);
      `,
    },
    // ============================================
    // GLOBAL CSRF MIDDLEWARE PATTERNS
    // ============================================

    // Global CSRF via app.use(csrf())
    {
      code: `
        import express from 'express';
        import csrf from 'csurf';
        const app = express();
        app.use(csrf());
        app.post('/login', requireAuth, handler);
      `,
    },
    // Global CSRF protects ALL routes (no spam!)
    {
      code: `
        import csrf from 'csurf';
        const app = express();
        app.use(csrf());
        app.post('/login', requireAuth, handler);
        app.put('/users/:id', requireAuth, handler);
        app.delete('/posts/:id', requireAuth, handler);
        app.patch('/settings', requireAuth, handler);
      `,
    },
    {
      // REGRESSION: an `app.use(csrf())` written BELOW the routes it protects
      // still suppresses them. Reporting inline made the finding depend on
      // statement order.
      code: `
        import csrf from 'csurf';
        const app = express();
        app.post('/transfer', requireAuth, handler);
        app.use(csrf());
      `,
    },
    // csurf package (alternative naming)
    {
      code: `
        const csurf = require('csurf');
        const app = express();
        app.use(csurf());
        app.post('/api/data', requireAuth, handler);
      `,
    },
    // CSRF middleware stored in variable
    {
      code: `
        const csurf = require('csurf');
        const csrfMiddleware = csrf({ cookie: true });
        app.use(csrfMiddleware);
        app.post('/submit', requireAuth, handler);
      `,
    },
    // CSRF from lusca package
    {
      code: `
        const lusca = require('lusca');
        app.use(lusca.csrf());
        app.post('/form', requireAuth, handler);
      `,
    },

    // ============================================
    // ROUTE-LEVEL CSRF PATTERNS
    // ============================================

    // CSRF in route middleware chain
    {
      code: `
        const csurf = require('csurf');
        app.post('/login', requireAuth, csrfProtection, (req, res) => {});
      `,
    },
    // Multiple middlewares with CSRF
    {
      code: `
        const csurf = require('csurf');
        app.post('/submit', auth, csrfProtection, validate, handler);
      `,
    },
    // CSRF first in chain
    {
      code: `
        const csurf = require('csurf');
        app.put('/update', csrf(), authenticate, handler);
      `,
    },
    // CSRF with express.Router()
    {
      code: `
        const csurf = require('csurf');
        const router = express.Router();
        router.use(csrfProtection);
        router.post('/create', requireAuth, handler);
      `,
    },

    // ============================================
    // SAFE HTTP METHODS (no CSRF needed)
    // ============================================

    {
      code: `const csurf = require('csurf'); app.get('/users', requireAuth, handler);`,
    },
    {
      code: `const csurf = require('csurf'); app.head('/status', requireAuth, handler);`,
    },
    {
      code: `const csurf = require('csurf'); app.options('/cors', requireAuth, handler);`,
    },

    // ============================================
    // IGNORED PATTERNS (webhooks, APIs, etc.)
    // ============================================

    {
      code: `${SESSION}app.post('/api/webhook', requireAuth, handler);`,
      options: [{ ignorePatterns: ['/api/webhook'] }],
    },
    {
      code: `${SESSION}app.post('/webhook/stripe', requireAuth, stripeHandler);`,
      options: [{ ignorePatterns: ['/webhook/.*'] }],
    },
    {
      code: `${SESSION}app.post('/hooks/github', requireAuth, githubHandler);`,
      options: [{ ignorePatterns: ['/hooks/.*'] }],
    },
    {
      code: `${SESSION}app.post('/internal/health', requireAuth, healthHandler);
        app.post('/webhook/payment', requireAuth, paymentHandler);`,
      options: [{ ignorePatterns: ['/internal/.*', '/webhook/.*'] }],
    },
    {
      code: `${SESSION}app.post('/api/v1/resource', requireAuth, handler);`,
      options: [{ ignorePatterns: ['/api/.*'] }],
    },

    // ============================================
    // TEST FILE HANDLING
    // ============================================

    {
      code: `${SESSION}app.post('/login', requireAuth, handler);`,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    {
      code: `${SESSION}app.put('/update', requireAuth, handler);`,
      options: [{ allowInTests: true }],
      filename: 'routes.spec.js',
    },

    // ============================================
    // FALSE POSITIVE PREVENTION
    // ============================================

    // Not Express - different framework (Fastify-like)
    { code: `${SESSION}server.post('/route', requireAuth, handler);` },
    // Method on custom object (not Express app/router)
    { code: `${SESSION}customApi.post('/data', requireAuth, handler);` },
    // Class method call
    {
      code: `${SESSION}this.controller.post('/resource', requireAuth, handler);`,
    },
    // Chained app creation with CSRF
    {
      code: `
        const app = express();
        app.use(session({ secret: s }));
        app.use(helmet());
        app.use(csrf());
        app.use(cors());
        app.post('/secure', requireAuth, handler);
      `,
    },
    // REGRESSION: the handler body is not the middleware chain. A form
    // renderer that emits `res.locals.csrfToken` is not CSRF protection, but
    // the old regex over `sourceCode.getText(node)` read the whole
    // registration and counted it.
    {
      code: `${SESSION}app.post('/pay', requireAuth, csrfProtection, (req, res) => res.render('x'));`,
    },
  ]),

  invalid: xp([
    // ============================================
    // MISSING CSRF - SHOULD FLAG
    //
    // A session cookie, an authenticated route, a state-changing method and
    // no token: the shape the rule exists for.
    // ============================================
    {
      name: 'a session-bearing POST with authentication but no CSRF token',
      code: `${SESSION}app.post('/login', requireAuth, handler);`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    {
      code: `${SESSION}app.put('/users/:id', authenticate, handler);`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    {
      code: `${SESSION}app.delete('/users/:id', requireAuth, handler);`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    {
      code: `${SESSION}router.patch('/profile', requireAuth, updateProfile);`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Multiple routes without CSRF
    {
      code: `${SESSION}app.post('/login', requireAuth, loginHandler);
        app.put('/settings', requireAuth, settingsHandler);`,
      errors: [{ messageId: 'missingCsrf' }, { messageId: 'missingCsrf' }],
    },
    // A handler that resolves the principal itself is authenticated
    {
      code: `${SESSION}app.post('/transfer', (req, res) => { debit(req.user.id); });`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // A router-wide `app.use(requireAuth)` authenticates every route below it
    {
      code: `
        import session from 'express-session';
        const app = express();
        app.use(session({ secret: s }));
        app.use(requireAuth);
        app.post('/transfer', doTransfer);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // okta-auth-js POST /logout: a session cookie, destroyed by the handler,
    // and no token. Logout CSRF — kept as a true positive.
    {
      code: `
        const express = require('express');
        const router = express.Router();
        router.post('/logout', async (req, res) => {
          req.session.destroy();
          res.redirect('/');
        });
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Cookie evidence without a session package
    {
      code: `
        const cookieParser = require('cookie-parser');
        app.post('/form', requireAuth, formHandler);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // res.cookie() is ambient-credential evidence on its own
    {
      code: `
        const app = express();
        app.post('/form', requireAuth, (req, res) => { res.cookie('a', 1); });
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Express app with other middleware but no CSRF
    {
      code: `${SESSION}app.use(helmet());
        app.use(cors());
        app.post('/form', requireAuth, formHandler);`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Router without CSRF
    {
      code: `${SESSION}const router = express.Router();
        router.post('/create', requireAuth, createHandler);`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Inline express.Router().post() pattern
    {
      code: `${SESSION}express.Router().post('/inline-create', requireAuth, handler);`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Inline express().post() pattern
    {
      code: `${SESSION}express().post('/inline-express', requireAuth, handler);`,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Test file WITHOUT allowInTests option
    {
      code: `${SESSION}app.post('/test-route', requireAuth, handler);`,
      filename: 'app.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingCsrf' }],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run(
  'require-csrf-protection (coverage wave)',
  requireCsrfProtection,
  {
    valid: xp([
      // lusca.csrf() recognized as global CSRF middleware
      {
        code: `${SESSION}app.use(lusca.csrf()); app.post('/transfer', requireAuth, handler);`,
      },
      // member callee that is not lusca.csrf
      { code: `${SESSION}app.use(other.csrf());` },
      // lusca method that is not csrf
      { code: `${SESSION}app.use(lusca.xframe());` },
      // deep member callee — object is not an identifier
      { code: `${SESSION}app.use(ns.security.csrf());` },
      // unknown factory call — not an Express object
      { code: `${SESSION}getApp().post('/x', requireAuth, handler);` },
      // Router() on a non-express namespace
      { code: `${SESSION}foo.Router().post('/x', requireAuth, handler);` },
      // this.app member — skipped to avoid false positives
      { code: `${SESSION}this.app.post('/x', requireAuth, handler);` },
      // ignorePatterns regex match
      {
        code: `${SESSION}app.post('/webhook/stripe', requireAuth, handler);`,
        options: [{ ignorePatterns: ['^/webhook'] }],
      },
      // invalid regex ignore pattern falls back to substring inclusion
      {
        code: `${SESSION}app.post('/a[b', requireAuth, handler);`,
        options: [{ ignorePatterns: ['['] }],
      },
      // csurf-named identifier middleware sets the global flag
      {
        code: `${SESSION}app.use(csurfMiddleware); app.post('/transfer', requireAuth, handler);`,
      },
      // a csrf helper reached through a member expression in the chain
      {
        code: `${SESSION}app.post('/x', requireAuth, security.csrfGuard, handler);`,
      },
      // a csrf factory call in the chain
      {
        code: `${SESSION}app.post('/x', requireAuth, csurf({ cookie: true }), handler);`,
      },
      // a literal in the chain slot is not a csrf reference
      {
        code: `${SESSION}app.post('/y', 'literal', requireAuth, handler); app.use(csrf());`,
      },
      // req.signedCookies is ambient-credential evidence, but the route is
      // unauthenticated so require-route-authentication owns it
      { code: `app.post('/x', (req, res) => req.signedCookies.a);` },
      // a scoped credential package (`@scope/pkg`) that is not in the list
      {
        code: `import x from '@scope/session'; app.post('/x', requireAuth, handler);`,
      },
      // a dynamic require with a non-literal specifier
      { code: `require(name); app.post('/x', requireAuth, handler);` },
      // require() with no argument at all
      { code: `require(); app.post('/x', requireAuth, handler);` },
      // a path-scoped app.use is not a global auth mount
      {
        code: `${SESSION}app.use('/admin', requireAuth); app.post('/x', handler);`,
      },
    ]),
    invalid: xp([
      // non-CSRF middleware identifiers do not set the global flag
      {
        code: `${SESSION}app.use(logger); app.post('/transfer', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      // non-literal route argument cannot match ignore patterns
      {
        code: `${SESSION}app.post(routeVar, requireAuth, handler);`,
        options: [{ ignorePatterns: ['^/x'] }],
        errors: [{ messageId: 'missingCsrf' }],
      },
      // express() result used directly
      {
        code: `${SESSION}express().post('/t', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      // express.Router() result used directly
      {
        code: `${SESSION}express.Router().post('/t', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
    ]),
  },
);

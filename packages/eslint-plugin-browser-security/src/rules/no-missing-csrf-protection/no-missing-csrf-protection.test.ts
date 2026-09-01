/**
 * Comprehensive tests for no-missing-csrf-protection rule
 * CWE-352: Cross-Site Request Forgery (CSRF)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingCsrfProtection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

/** Every fixture needs a real Express app; the receiver is now the evidence. */
const APP = 'import express from "express";\nconst app = express();\n';
const ROUTER = 'import { Router } from "express";\nconst router = Router();\n';

describe('no-missing-csrf-protection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - CSRF protection present', noMissingCsrfProtection, {
      valid: [
        // CSRF middleware in route chain
        { name: 'the route carries csrf()', code: `${APP}app.post("/api/users", csrf(), handler);` },
        { code: `${ROUTER}router.put("/api/users/:id", csrf(), handler);` },
        { code: `${APP}app.delete("/api/users/:id", csrf(), handler);` },
        // CSRF middleware globally
        { code: `${APP}app.use(csrf());` },
        // GET doesn't require CSRF
        { code: `${APP}app.get("/api/users", handler);` },
        // Test files (when allowInTests is true)
        {
          code: `${APP}app.post("/test", handler);`,
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - not an Express route at all', noMissingCsrfProtection, {
      valid: [
        // ---- FP lock: the method name was the entire verdict ---------------
        // An HTTP CLIENT call. Reported at CVSS 8.8 before the receiver had to
        // be proven, with a suggestion that would have inserted `csrf()` into
        // the request body position.
        { code: 'import axios from "axios";\naxios.post("/api/orders", cart);' },
        { code: 'import axios from "axios";\naxios.put("/api/orders/1", { paid: true });' },
        // A job queue and a cache. Neither has middleware.
        { code: 'queue.delete("job-1", { force: true });' },
        { code: 'cache.set("k", v); cache.delete("k", opts);' },
        // fetch-style wrappers.
        { code: 'const api = createClient(); api.patch("/users/1", patchBody);' },
        // A Map — `delete` with two arguments is not a route.
        { code: 'const seen = new Map(); seen.delete(key, fallback);' },

        // The receiver is a parameter. Nothing in the file proves it is an
        // Express app, and the parameter's SPELLING is not evidence.
        { code: 'export default function routes(app) { app.post("/x", handler); }' },

        // Right method, right receiver, but the first argument is a payload
        // rather than a route path.
        { code: `${APP}app.post(buildPath(), handler);` },
        // An empty path array names no route.
        { code: `${APP}app.post([], handler);` },
        // `.route(path)` with nothing registered on it.
        { code: `${APP}app.route("/api/users").post();` },

        // ---- receivers the resolver must refuse ----------------------------
        // A property read, not a binding we can follow.
        { code: 'server.app.post("/x", handler);' },
        // Re-assigned, so the name no longer holds what it was declared with.
        {
          code: `import express from "express";\nlet app = express();\napp = withAuth(app);\napp.post("/x", handler);`,
        },
        // Two declarations for one name — no single knowable value.
        {
          code: `import express from "express";\nvar app = express();\nvar app = express();\napp.post("/x", handler);`,
        },
        // A declaration cycle must terminate rather than recurse forever.
        { code: 'const a = b; const b = a; a.post("/x", handler);' },

        // Global CSRF middleware covers every route mounted on the app — the
        // rule's own remediation text has always said so.
        {
          code: `${APP}app.use(csrf({ cookie: true }));\napp.post("/api/users", handler);\napp.delete("/api/users/:id", handler);`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing CSRF', () => {
    ruleTester.run('invalid - POST without CSRF', noMissingCsrfProtection, {
      valid: [],
      invalid: [
        {
          name: 'a state-changing POST with no CSRF middleware',
          code: `${APP}app.post("/api/users", handler);`,
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'POST route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.post("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: `${APP}app.post("/api/users", csrf(), handler);`,
                },
              ],
            },
          ],
        },
        {
          code: `${ROUTER}router.post("/api/users", (req, res) => {});`,
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'POST route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.post("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: `${ROUTER}router.post("/api/users", csrf(), (req, res) => {});`,
                },
              ],
            },
          ],
        },
        // `express.Router()` and `require('express')` resolve the same way.
        {
          code: 'const express = require("express");\nconst api = express.Router();\napi.post("/pay", chargeCard);',
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: 'const express = require("express");\nconst api = express.Router();\napi.post("/pay", csrf(), chargeCard);' }],
          }],
        },
        // A template-literal route path is still a route path.
        {
          code: `${APP}app.post(\`/api/\${version}/users\`, handler);`,
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: `${APP}app.post(\`/api/\${version}/users\`, csrf(), handler);` }],
          }],
        },
        // An array of paths — Express accepts it, so must the rule.
        {
          code: `${APP}app.post(["/api/users", "/api/v2/users"], handler);`,
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: `${APP}app.post(["/api/users", "/api/v2/users"], csrf(), handler);` }],
          }],
        },
        // A RegExp route path.
        {
          code: `${APP}app.post(/^\\/api\\/users/, handler);`,
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: `${APP}app.post(/^\\/api\\/users/, csrf(), handler);` }],
          }],
        },
        // A sub-router mounted with `.route(...)` is still the app's router.
        {
          code: `${APP}app.route("/api/users").post(handler, next);`,
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: `${APP}app.route("/api/users").post(csrf(), handler, next);` }],
          }],
        },
        // `app.use(helmet())` mounts middleware that is not CSRF, so the route
        // is still unprotected.
        {
          code: `${APP}app.use(helmet());\napp.post("/api/users", handler);`,
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: `${APP}app.use(helmet());\napp.post("/api/users", csrf(), handler);` }],
          }],
        },
      ],
    });

    ruleTester.run('invalid - PUT without CSRF', noMissingCsrfProtection, {
      valid: [],
      invalid: [
        {
          code: `${APP}app.put("/api/users/:id", handler);`,
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'PUT route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.put("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: `${APP}app.put("/api/users/:id", csrf(), handler);`,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - DELETE without CSRF', noMissingCsrfProtection, {
      valid: [],
      invalid: [
        {
          code: `${APP}app.delete("/api/users/:id", handler);`,
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'DELETE route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.delete("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: `${APP}app.delete("/api/users/:id", csrf(), handler);`,
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('invalid - PATCH without CSRF', noMissingCsrfProtection, {
      valid: [],
      invalid: [
        {
          code: `${APP}app.patch("/api/users/:id", handler);`,
          errors: [
            {
              messageId: 'missingCsrfProtection',
              data: {
                issue: 'PATCH route handler missing CSRF protection',
                safeAlternative: 'Add CSRF middleware: app.patch("/path", csrf(), handler) or use app.use(csrf()) globally',
              },
              suggestions: [
                {
                  messageId: 'addCsrfValidation',
                  output: `${APP}app.patch("/api/users/:id", csrf(), handler);`,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignorePatterns', noMissingCsrfProtection, {
      valid: [
        // Valid ignorePattern - pattern must match the call text
        {
          code: `${APP}app.post("/api/internal", handler);`,
          options: [{ ignorePatterns: ['api/internal'] }],
        },
        // An ignorePattern that is not a valid RegExp falls back to a plain
        // substring test rather than throwing.
        {
          code: `${APP}app.post("/api/internal[beta]", handler);`,
          options: [{ ignorePatterns: ['internal['] }],
        },
      ],
      invalid: [
        // Same code, no ignorePattern — proves the option is what silences it.
        {
          code: `${APP}app.post("/api/internal", handler);`,
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: `${APP}app.post("/api/internal", csrf(), handler);` }],
          }],
        },
      ],
    });

    ruleTester.run('options - custom CSRF patterns', noMissingCsrfProtection, {
      valid: [
        {
          code: `${APP}app.post("/api/users", requireToken(), handler);`,
          options: [{ csrfMiddlewarePatterns: ['requireToken'] }],
        },
      ],
      invalid: [
        // Same code, no option. The default vocabulary has never heard of
        // `requireToken`, so the option is what changes the verdict.
        {
          code: `${APP}app.post("/api/users", requireToken(), handler);`,
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: `${APP}app.post("/api/users", csrf(), requireToken(), handler);` }],
          }],
        },
      ],
    });

    ruleTester.run('options - custom protected methods', noMissingCsrfProtection, {
      valid: [
        {
          code: `${APP}app.options("/api/users", handler);`, // OPTIONS not protected by default
        },
      ],
      invalid: [
        {
          code: `${APP}app.options("/api/users", handler);`,
          options: [{ protectedMethods: ['options'] }],
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: `${APP}app.options("/api/users", csrf(), handler);` }],
          }],
        },
      ],
    });

    ruleTester.run('options - allowInTests off by default', noMissingCsrfProtection, {
      valid: [],
      invalid: [
        // Same file, same code, no option — the default does NOT exempt tests.
        {
          code: `${APP}app.post("/test", handler);`,
          filename: 'test.spec.ts',
          errors: [{
            messageId: 'missingCsrfProtection',
            suggestions: [{ messageId: 'addCsrfValidation', output: `${APP}app.post("/test", csrf(), handler);` }],
          }],
        },
      ],
    });
  });
});

/**
 * Regression lock — CSRF protection is recognised by its MODULE, not by its
 * spelling.
 *
 * The check was `sourceCode.getText(arg).toLowerCase().includes(pattern)` over
 * a word list, and it was wrong in both directions at once:
 *
 * - a logger configured to REDACT the token header matched, and switched the
 *   rule off for every route in the file;
 * - a middleware named `csrfMetrics` that only increments a counter matched,
 *   and suppressed a real finding;
 * - the CORRECT remediation with the import renamed did NOT match, so the rule
 *   reported the file that had applied its own fix.
 *
 * Every case below fails on the unfixed rule.
 */
ruleTester.run('lock: CSRF middleware resolves to a module', noMissingCsrfProtection, {
  valid: [
    // The remediation with the import renamed — only the local name differs.
    {
      code: `const express = require('express'); const guard = require('csurf'); const app = express(); const protect = guard({ cookie: true }); app.post('/transfer', protect, handler);`,
    },
    // Mounted globally under a renamed binding.
    {
      code: `const express = require('express'); const shield = require('csurf'); const app = express(); app.use(shield({ cookie: true })); app.post('/transfer', handler);`,
    },
    // ESM, default import.
    {
      code: `import express from 'express'; import csurf from 'csurf'; const app = express(); app.post('/x', csurf(), handler);`,
    },
    // A hand-rolled verifier whose name is on the configured list, matched
    // EXACTLY rather than as a substring.
    {
      code: `const express = require('express'); const app = express(); app.use(verifyCsrfToken); app.post('/transfer', handler);`,
    },
  ],
  invalid: [
    // Redacting the token header is a privacy measure, not a defence.
    {
      code: `const express = require('express'); const app = express(); app.use(pino({ redact: ['req.headers["x-csrf-token"]'] })); app.post('/transfer', handler);`,
      errors: 1,
    },
    // Counting is not verifying: `csrfMetrics` is not `csrf`.
    {
      code: `const express = require('express'); const app = express(); app.put('/api/profile', csrfMetrics, handler);`,
      errors: 1,
    },
  ],
});

/**
 * Regression lock — `router.route(path).get(…).post(…)`.
 *
 * This is the idiom Express's own documentation leads with, and the receiver
 * of `.post` is the `.get(…)` call rather than the `.route(…)` call. The
 * shared receiver helper stops at a verb, so the whole chained form registered
 * no route at all — a POST handler with no CSRF protection, silently.
 */
ruleTester.run('lock: chained route registrations', noMissingCsrfProtection, {
  valid: [
    // A chain on something that is NOT a proven Express router proves nothing.
    { code: `promise.then(onOk).post(onDone);` },
    // The chained form WITH protection.
    {
      code: `const express = require('express'); const csrf = require('csurf'); const r = express.Router(); r.route('/invoices').get(list).post(csrf(), create);`,
    },
  ],
  invalid: [
    {
      code: `const express = require('express'); const r = express.Router(); r.route('/invoices').get(list).post(create);`,
      errors: 1,
    },
    {
      code: `const express = require('express'); const r = express.Router(); r.route('/x').all(log).get(read).put(write);`,
      errors: 1,
    },
    // Middleware passed as an array, which Express accepts.
    {
      code: `const express = require('express'); const app = express(); app.post('/admin/users', [requireAuth, rateLimit], handler);`,
      errors: 1,
    },
  ],
});

/** Edge shapes the chain walk and the module resolution must survive. */
ruleTester.run('edge shapes', noMissingCsrfProtection, {
  valid: [
    // A computed method is not a route registration.
    { code: `const express = require('express'); const app = express(); app['post']('/x', h);` },
    // A chain whose root is not a `.route(…)` call.
    { code: `const express = require('express'); const app = express(); app.listen(3000).post(h);` },
    // A `.route(…)` on something that is not a proven Express receiver.
    { code: `mystery.route('/x').get(a).post(b);` },
    // A chained registration with no handler at all.
    { code: `const express = require('express'); const r = express.Router(); r.route('/x').get(a).post();` },
    // A safe verb in the chain.
    { code: `const express = require('express'); const r = express.Router(); r.route('/x').get(a).head(b);` },
    // The namespaced middleware.
    {
      code: `const express = require('express'); const lusca = require('lusca'); const app = express(); app.use(lusca.csrf()); app.post('/x', h);`,
    },
    // An ignorePattern that matches the call text.
    {
      code: `const express = require('express'); const app = express(); app.post('/webhooks/stripe', h);`,
      options: [{ ignorePatterns: ['/webhooks/'] }],
    },
    // An invalid regex in ignorePatterns falls back to a substring test.
    {
      code: `const express = require('express'); const app = express(); app.post('/x(', h);`,
      options: [{ ignorePatterns: ['x('] }],
    },
    // Test files, when allowed.
    {
      code: `const express = require('express'); const app = express(); app.post('/x', h);`,
      filename: 'routes.test.ts',
      options: [{ allowInTests: true }],
    },
    // A custom pattern list REPLACES the defaults.
    {
      code: `const express = require('express'); const app = express(); app.use(ourGuard); app.post('/x', h);`,
      options: [{ csrfMiddlewarePatterns: ['ourGuard'] }],
    },
    // A custom protected-method list.
    {
      code: `const express = require('express'); const app = express(); app.post('/x', h);`,
      options: [{ protectedMethods: ['put'] }],
    },
    // A top-level statement that is not an expression, and a `use` on
    // something unrelated — neither mounts CSRF, and neither may crash.
    {
      code: `const express = require('express'); const app = express(); const x = 1; other.use(thing); app.get('/x', h);`,
    },
  ],
  invalid: [
    // A custom protected-method list, on the method it names.
    {
      code: `const express = require('express'); const app = express(); app.put('/x', '/x', h);`,
      options: [{ protectedMethods: ['put'] }],
      errors: 1,
    },
    // The suggestion for the chained form inserts before the first handler.
    {
      code: `const express = require('express'); const r = express.Router(); r.route('/x').get(a).post(b);`,
      errors: [
        {
          messageId: 'missingCsrfProtection',
          suggestions: [
            {
              messageId: 'addCsrfValidation',
              output: `const express = require('express'); const r = express.Router(); r.route('/x').get(a).post(csrf(), b);`,
            },
          ],
        },
      ],
    },
  ],
});

/**
 * The alias walk is BOUNDED.
 *
 * `isModuleBinding` follows a `require`/`import` chain itself, so the bound
 * here only governs the NAME-list fallback — a hand-rolled verifier reached
 * through a chain of plain aliases. Past the bound the rule reports rather
 * than assuming a protection it can no longer see, which is the safe
 * direction.
 */
ruleTester.run('bounded middleware resolution', noMissingCsrfProtection, {
  valid: [
    // Two aliases — inside the bound.
    {
      code: `const express = require('express'); const b = verifyCsrfToken; const app = express(); app.use(b); app.post('/x', h);`,
    },
    // The module chain is followed by the resolver regardless of alias depth.
    {
      code: `const express = require('express'); const a = require('csurf'); const b = a; const c = b; const d = c; const e = d; const app = express(); app.post('/x', e(), h);`,
    },
  ],
  invalid: [
    // Five plain aliases before the recognised name — past the bound.
    {
      code: `const express = require('express'); const a = verifyCsrfToken; const b = a; const c = b; const d = c; const e = d; const app = express(); app.use(e); app.post('/x', h);`,
      errors: 1,
    },
  ],
});

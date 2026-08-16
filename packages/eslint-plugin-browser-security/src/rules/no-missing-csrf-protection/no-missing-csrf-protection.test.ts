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
        { code: `${APP}app.post("/api/users", csrf(), handler);` },
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

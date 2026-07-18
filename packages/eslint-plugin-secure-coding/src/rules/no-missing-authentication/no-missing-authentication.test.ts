/**
 * Comprehensive tests for no-missing-authentication rule
 * CWE-287: Improper Authentication
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingAuthentication } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
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

describe('no-missing-authentication', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - routes with authentication', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", authenticate(), (req, res) => {});',
        },
        {
          code: 'app.post("/api/users", auth, (req, res) => {});',
        },
        {
          code: 'app.put("/api/users", requireAuth, isAuthenticated, (req, res) => {});',
        },
        {
          code: 'router.get("/api/users", verifyToken(), (req, res) => {});',
        },
        {
          code: 'app.use("/api", authenticate());',
        },
        // Test files (when allowInTests is true)
        {
          code: 'app.get("/api/users", (req, res) => {});',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
        // Ignored patterns
        {
          code: 'app.get("/api/users", (req, res) => {});',
          options: [{ ignorePatterns: ['/api/users'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Authentication', () => {
    ruleTester.run('invalid - routes without authentication', noMissingAuthentication, {
      valid: [],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
        {
          code: 'app.post("/api/users", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
        {
          code: 'router.put("/api/users/:id", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
        {
          code: 'app.delete("/api/users/:id", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - allowInTests', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          filename: 'server.ts',
          options: [{ allowInTests: true }],
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - authMiddlewarePatterns', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", myCustomAuth(), (req, res) => {});',
          options: [{ authMiddlewarePatterns: ['myCustomAuth'] }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - routeHandlerPatterns', noMissingAuthentication, {
      valid: [
        {
          code: 'app.custom("/api/users", (req, res) => {});',
          options: [{ routeHandlerPatterns: ['get', 'post'] }],
        },
      ],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          options: [{ routeHandlerPatterns: ['get', 'post'] }],
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('options - ignorePatterns', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          options: [{ ignorePatterns: ['/api/users'] }],
        },
      ],
      invalid: [
        {
          code: 'app.get("/api/posts", (req, res) => {});',
          options: [{ ignorePatterns: ['/api/users'] }],
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - invalid regex in ignorePatterns', noMissingAuthentication, {
      valid: [],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          options: [{ ignorePatterns: ['['] }], // Invalid regex - should not match
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - Identifier auth middleware', noMissingAuthentication, {
      valid: [
        {
          code: 'const handler = (req, res) => {}; app.get("/api/users", authenticate(), handler);',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - app.all with auth', noMissingAuthentication, {
      valid: [
        {
          code: 'app.all("/api", authenticate(), (req, res) => {});',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - CallExpression auth middleware', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/users", authenticate(), (req, res) => {});',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - handler inside auth context', noMissingAuthentication, {
      valid: [],
      invalid: [
        {
          code: 'const handler = (req, res) => {}; app.use("/api", authenticate()); app.get("/api/users", handler);',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - route path extraction', noMissingAuthentication, {
      valid: [],
      invalid: [
        {
          code: 'app.get("/api/users", (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
        {
          code: 'const path = "/api/users"; app.get(path, (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - computed property and no-argument route calls', noMissingAuthentication, {
      valid: [
        // Computed member access (`app["get"]`) - `property.type` is not
        // `Identifier`, so the methodName/routeHandlerPatterns check is
        // skipped entirely.
        {
          code: 'app["get"]("/api/users", authenticate(), (req, res) => {});',
        },
      ],
      invalid: [
        // Route handler call with zero arguments - `node.arguments.length >
        // 0` is false for both the Literal and the fallback text-based
        // route-path extraction, so `routePath` stays "unknown" and no
        // auth argument can be present.
        {
          code: 'app.get();',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - identifier callee that is not an auth middleware', noMissingAuthentication, {
      valid: [],
      invalid: [
        // The handler is wrapped by a plain function call whose callee name
        // ("wrapHandler") does not match any auth pattern, so
        // isInsideAuthMiddleware's Identifier-callee branch evaluates to
        // false and falls through without matching the MemberExpression
        // branch either (the callee here is a bare Identifier, not a
        // MemberExpression) - the route must still be reported as missing.
        {
          code: `
            wrapHandler(() => {
              app.get("/wrapped/unprotected", (req, res) => {});
            });
          `,
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - continue break logic', noMissingAuthentication, {
      valid: [
        {
          code: 'const handler = authenticate(); app.get("/api/users", handler, (req, res) => {});',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - Identifier auth variable', noMissingAuthentication, {
      valid: [
        {
          code: 'const auth = authenticate(); app.get("/api/users", auth, (req, res) => {});',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - nested authentication contexts', noMissingAuthentication, {
      valid: [
        // Route inside app.use(auth)
        {
          code: `
            app.use(authenticate(), () => {
              app.get("/nested/protected", (req, res) => {});
            });
          `,
        },
        // Route inside authentication wrapper function
        {
          code: `
            withAuth(() => {
              app.get("/wrapped/protected", (req, res) => {});
            });
          `,
          options: [{ authMiddlewarePatterns: ['withAuth'] }],
        },
        // Route inside app.all(auth)
        {
          code: `
            app.all("/api/*", requireAuth(), () => {
              app.post("/api/data", (req, res) => {});
            });
          `,
        },
        // Route nested inside an IIFE argument (`(() => {...})()`) — while
        // walking up from the inner handler, `current` becomes the callee of
        // the IIFE's invocation (not one of its arguments, since it takes
        // none), exercising the "not an argument, keep walking up" branch of
        // isInsideAuthMiddleware before reaching the outer app.use(auth()).
        {
          code: `
            app.use(authenticate(), (() => {
              app.get("/nested/iife-protected", (req, res) => {});
            })());
          `,
        },
      ],
      invalid: [
        // Nested but not in auth
        {
          code: `
            app.use(someMiddleware(), () => {
              app.get("/nested/unprotected", (req, res) => {});
            });
          `,
          errors: [
            { messageId: 'missingAuthentication' },
            { messageId: 'missingAuthentication' }
          ],
        },
      ],
    });

    ruleTester.run('coverage - regex ignore patterns', noMissingAuthentication, {
      valid: [
        {
          code: 'app.get("/api/public/health", (req, res) => {});',
          options: [{ ignorePatterns: ['^/api/public/.*'] }],
        },
      ],
      invalid: [
        {
          code: 'app.get("/api/private/data", (req, res) => {});',
          options: [{ ignorePatterns: ['^/api/public/.*'] }],
          errors: [{ messageId: 'missingAuthentication' }],
        },
      ],
    });

    ruleTester.run('coverage - scope traversal', noMissingAuthentication, {
      valid: [
        // Auth variable in parent scope
        {
          code: `
            const auth = authenticate();
            function setupRoutes() {
              app.get("/api/users", auth, (req, res) => {});
            }
          `,
        },
        // Same shape, but the variable's own name ("middleware") does not
        // textually contain any auth pattern, so the text-based check can't
        // short-circuit: this forces isIdentifierFromAuthMiddleware to call
        // findVariableDeclaration, which must walk up through the enclosing
        // (block-bodied) FunctionDeclaration scope before reaching Program -
        // exercising the ternary's BlockStatement/true branch.
        {
          code: `
            const middleware = authenticate();
            function setupRoutes() {
              app.get("/api/users", middleware, (req, res) => {});
            }
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - concise-body arrow function ancestor scope', noMissingAuthentication, {
      valid: [],
      invalid: [
        // `setup`'s body is a CallExpression, not a BlockStatement, so while
        // findVariableDeclaration walks up through the enclosing arrow
        // function it must take the ternary's false branch (treat the scope
        // body as empty) instead of scanning `current.body.body`.
        {
          code: 'const setup = () => app.get("/api/users", someVar, (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - undeclared identifier argument', noMissingAuthentication, {
      valid: [],
      invalid: [
        // `undeclaredMiddleware` has no VariableDeclarator anywhere in scope,
        // so findVariableDeclaration must walk all the way up to Program,
        // find nothing, and stop there (Program has no `.parent`).
        {
          code: 'app.get("/api/users", undeclaredMiddleware, (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - declared identifier without initializer', noMissingAuthentication, {
      valid: [],
      invalid: [
        // `middleware` is declared but has no `init`, so
        // isIdentifierFromAuthMiddleware must return false via the
        // `!declarator.init` branch instead of inspecting a CallExpression.
        // (The name itself must not textually contain any default auth
        // pattern like "auth", or the earlier text-based check would catch
        // it first.)
        {
          code: 'let middleware; app.get("/api/users", middleware, (req, res) => {});',
          errors: [
            {
              messageId: 'missingAuthentication',
            },
          ],
        },
      ],
    });

    ruleTester.run('coverage - non-Identifier and non-router call objects', noMissingAuthentication, {
      valid: [
        // Member chain object (`db.users`) - not a plain Identifier, so it's
        // skipped before the router-name check even runs.
        {
          code: 'db.users.get("/api/users", (req, res) => {});',
        },
        // Plain Identifier object, but the name doesn't look like a router
        // (e.g. a prepared SQL statement) - skipped by the router-name check.
        {
          code: 'stmt.get("/api/users", (req, res) => {});',
        },
      ],
      invalid: [],
    });

    ruleTester.run('coverage - full-text ignore pattern match', noMissingAuthentication, {
      valid: [
        // The route path alone ("/api/users") does not match the ignore
        // pattern, but the full call-expression text does (it matches on the
        // handler body) - exercises the second, text-based ignore check.
        {
          code: 'app.get("/api/users", (req, res) => { legacySkipAuthHandler(); });',
          options: [{ ignorePatterns: ['legacySkipAuthHandler'] }],
        },
      ],
      invalid: [],
    });
  });
});


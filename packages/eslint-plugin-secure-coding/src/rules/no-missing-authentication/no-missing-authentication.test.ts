/**
 * Comprehensive tests for no-missing-authentication rule
 * CWE-287: Improper Authentication
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
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
        // Nested but not in auth.
        // Previously expected TWO errors: one for the `app.use(...)` itself and one for the
        // nested `app.get`. The first was wrong — `app.use(middleware, fn)` with no path
        // registers global middleware and cannot be "a route handler missing
        // authentication". Only the nested unprotected GET is the defect.
        {
          code: `
            app.use(someMiddleware(), () => {
              app.get("/nested/unprotected", (req, res) => {});
            });
          `,
          errors: [{ messageId: 'missingAuthentication' }],
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


/**
 * Regression locks — each FAILS on the pre-fix rule.
 *
 * 1. Path-less `app.use(...)` registers GLOBAL middleware; it is not a route handler, so
 *    "missing authentication" is meaningless there. The unfixed rule listed 'use' in
 *    DEFAULT_ROUTE_HANDLER_PATTERNS unconditionally and fired on `app.use(helmet())` —
 *    24 findings across 8 clean fixtures in benchmarks/corpus, the plugin's single largest
 *    false-positive source.
 * 2. The rule called `console.log('DEBUG MSG: ...')` whenever `ignorePatterns` matched.
 *    That shipped to npm, and stdout writes corrupt the JSON and SARIF formatters.
 */
ruleTester.run('lock: path-less app.use() is not a route handler', noMissingAuthentication, {
  valid: [
    { code: 'app.use(helmet());' },
    { code: 'app.use(rateLimit({ windowMs: 60000, max: 100 }));' },
    { code: 'app.use(express.json());' },
    { code: 'app.use((err, req, res, next) => { res.status(500).end(); });' },
  ],
  invalid: [
    // A PATH-mounted use still addresses a route, so it is still checked.
    {
      code: 'app.use("/admin", (req, res) => {});',
      errors: [{ messageId: 'missingAuthentication' }],
    },
  ],
});

describe('lock: the rule never writes to stdout', () => {
  it('stays silent when ignorePatterns matches', async () => {
    const { Linter } = await import('eslint');
    const written: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => void written.push(args.join(' '));
    try {
      new Linter().verify('app.get("/health", (req, res) => res.send("ok"));', [
        {
          plugins: { sc: { rules: { 'no-missing-authentication': noMissingAuthentication } } },
          languageOptions: { ecmaVersion: 'latest' as const },
          rules: { 'sc/no-missing-authentication': ['error', { ignorePatterns: ['health'] }] },
        },
      ]);
    } finally {
      console.log = original;
    }
    expect(written).toEqual([]);
  });
});

/**
 * `testFilePattern` — the regex that decides which filenames `allowInTests`
 * applies to.
 *
 * Same source, same filename, one option apart. `seeds/routes.ts` is neither a
 * `*.test.*` basename nor a known test directory, so the default structural
 * predicate does not exempt it. (`fixtures/` used to sit here; it IS a test
 * directory to `isTestFilePath`, which would have made the pair vacuous.)
 */
describe('option: testFilePattern', () => {
  const ROUTE = 'app.get("/api/users", (req, res) => {});';

  ruleTester.run('a custom pattern extends the exemption', noMissingAuthentication, {
    valid: [
      {
        code: ROUTE,
        filename: 'seeds/routes.ts',
        options: [{ allowInTests: true, testFilePattern: 'seeds/' }],
      },
    ],
    invalid: [
      // Identical source and filename, `allowInTests` still on — only the
      // pattern is gone, and the finding comes back.
      {
        code: ROUTE,
        filename: 'seeds/routes.ts',
        options: [{ allowInTests: true }],
        errors: [{ messageId: 'missingAuthentication' }],
      },
      // The converse: a narrower pattern than the default withdraws the
      // exemption from a file the default would have covered.
      {
        code: ROUTE,
        filename: 'routes.spec.ts',
        options: [{ allowInTests: true, testFilePattern: '\\.test\\.ts$' }],
        errors: [{ messageId: 'missingAuthentication' }],
      },
    ],
  });
});

/**
 * Regression locks — each FAILS on the pre-fix rule.
 *
 * 1. FALSE POSITIVES. The router check was `objectName.includes(name)` against
 *    ['app','router','server','route',…]. `app` ⊂ `wrapper` and ⊂ `dataMapper`,
 *    so an LRU cache and a persistence mapper were reported as unauthenticated
 *    HTTP routes in files that import no HTTP server at all.
 * 2. FALSE NEGATIVE — the widest one. DEFAULT_PUBLIC_ROUTE_PATTERNS contains
 *    'status', and the rule tested those patterns against the WHOLE call text
 *    including the handler body. Every Express handler that writes
 *    `res.status(500)` therefore silenced the rule about its own route.
 * 3. FALSE NEGATIVE. Auth middleware was detected by substring over the printed
 *    text of EVERY argument, including the handler. `auth` ⊂ `getAuthorReport`
 *    and `session` ⊂ `renderSessionRoster` — two ordinary domain nouns — both
 *    counted as authentication.
 * 4. FALSE NEGATIVE. A router bound to a name outside the hard-coded list
 *    (`const api = express.Router()`) was invisible, even though the binding
 *    resolves to the factory call in the same file.
 * 5. FALSE NEGATIVE. `app.route(path).get(handler)`, Express's own chaining
 *    API, was skipped because the registration's object is a CallExpression.
 */
describe('regression locks', () => {
  ruleTester.run('lock: router identity comes from the binding, not a substring', noMissingAuthentication, {
    valid: [
      // app ⊂ wrapper / dataMapper / appointmentScheduler
      { code: 'const wrapper = createCacheWrapper(); wrapper.get("k"); wrapper.delete("k");' },
      { code: 'function f(appointmentScheduler) { return appointmentScheduler.get(1); }' },
      // Resolved evidence outranks a genuine whole-word name match.
      { code: 'const routeCache = new Map(); routeCache.get("/a"); routeCache.delete("/a");' },
      { code: 'const serverStats = new Map(); serverStats.get("host");' },
      { code: 'const dataMapper = { get: (id) => id }; dataMapper.get(1);' },
    ],
    invalid: [
      // A router is a router whatever it is named, when the binding resolves.
      {
        code: 'const api = express.Router(); api.post("/admin/flags", (req, res) => {});',
        errors: [{ messageId: 'missingAuthentication' }],
      },
      {
        code: 'const gateway = express(); gateway.get("/admin/secrets", (req, res) => {});',
        errors: [{ messageId: 'missingAuthentication' }],
      },
      {
        code: 'const srv = new Koa(); srv.get("/admin/secrets", (req, res) => {});',
        errors: [{ messageId: 'missingAuthentication' }],
      },
    ],
  });

  ruleTester.run('lock: default public-route patterns match the PATH, not the handler body', noMissingAuthentication, {
    valid: [
      // A genuinely public path still matches, by path.
      { code: 'app.post("/login", loginHandler);' },
      { code: 'app.get("/healthz", (req, res) => {});' },
    ],
    invalid: [
      // `res.status(500)` in the body must not exempt an admin route.
      {
        code: 'app.get("/admin/accounts", async (req, res) => { try { res.json(await listUsers()); } catch (e) { res.status(500).end(); } });',
        errors: [{ messageId: 'missingAuthentication' }],
      },
      // Same for the other default path words appearing only in the body.
      {
        code: 'app.get("/admin/audit", (req, res) => { recordMetrics(); pingUpstream(); });',
        errors: [{ messageId: 'missingAuthentication' }],
      },
    ],
  });

  ruleTester.run('lock: the handler is not its own authentication', noMissingAuthentication, {
    valid: [
      // Real middleware, in the middleware position.
      { code: 'app.get("/api/reports", authenticate, getAuthorReport);' },
      { code: 'const guard = requireAuth({}); app.get("/api/me", guard, getProfile);' },
      { code: 'const guard = requireAuth({}); app.use("/api", guard);' },
    ],
    invalid: [
      // auth ⊂ author — the handler's name is not a guard.
      {
        code: 'router.get("/api/reports/authors/:id", getAuthorReport);',
        errors: [{ messageId: 'missingAuthentication' }],
      },
      // session ⊂ renderSessionRoster — a conference talk, not a login session.
      {
        code: 'router.get("/api/talks/:id/roster", renderSessionRoster);',
        errors: [{ messageId: 'missingAuthentication' }],
      },
      // A guard-shaped local name is still not a guard in the handler slot.
      {
        code: 'router.get("/api/jwtTokens", listJwtTokens);',
        errors: [{ messageId: 'missingAuthentication' }],
      },
    ],
  });

  ruleTester.run('lock: app.route(path).get(handler) chaining is a route registration', noMissingAuthentication, {
    valid: [
      { code: 'app.route("/api/me").get(authenticate, getProfile);' },
      { code: 'app.route("/login").post(loginHandler);' },
      // Not a router base — a query builder chain must stay untouched.
      { code: 'db.route("/x").get(handler);' },
    ],
    invalid: [
      {
        code: 'app.route("/admin/tokens").get(listTokens);',
        errors: [{ messageId: 'missingAuthentication' }],
      },
      // Deeper in the chain: the base is still the route() call.
      {
        code: 'app.route("/admin/tokens").get(listTokens).post(createToken);',
        errors: [
          { messageId: 'missingAuthentication' },
          { messageId: 'missingAuthentication' },
        ],
      },
    ],
  });
});

ruleTester.run('coverage - router factory and middleware-name edge shapes', noMissingAuthentication, {
  valid: [
    // Middleware reached through a member chain whose OBJECT is itself a
    // MemberExpression, so only the trailing property names the middleware.
    { code: 'app.get("/api/x", middleware.chain.authenticate, handler);' },
    // The same shape as a middleware FACTORY call, so the callee - not the
    // argument - is the member chain whose object is not an Identifier.
    { code: 'app.get("/api/y", middleware.chain.authenticate(), handler);' },
    // An object literal argument names nothing at all.
    { code: 'app.get("/api/z", authenticate, { name: "x" }, handler);' },
    // Member-chain middleware whose object IS an identifier: the dotted name
    // `passport.authenticate` is what the default patterns list.
    { code: 'app.get("/api/orders", passport.authenticate("jwt"), listOrders);' },
  ],
  invalid: [
    // `require("express")()` - the initialiser IS a CallExpression, but its
    // callee is another call, so no factory name can be read off it. The
    // fallback is the binding NAME, and `gw` carries no router word: this is
    // a documented CJS false negative on the router side, kept here only to
    // pin the branch.
    {
      code: 'const server = require("express")(); server.get("/admin/a", (req, res) => {});',
      errors: [{ messageId: 'missingAuthentication' }],
    },
    // A declared identifier whose initialiser is not a call at all.
    {
      code: 'const guard = 42; app.get("/api/x", guard, (req, res) => {});',
      errors: [{ messageId: 'missingAuthentication' }],
    },
  ],
});

/**
 * `routerNameWords` — the name-fallback vocabulary, made overridable.
 *
 * `ROUTER_NAME_WORDS` is nine English words that decide whether an unresolvable
 * binding is an HTTP router. A consumer whose domain calls something `server`
 * or `route` had no remedy but disabling the rule, so the list is now a DEFAULT
 * that `routerNameWords` replaces and `additionalRouterNameWords` extends.
 *
 * Every QUIET case below is paired with a positive control on the SAME snippet,
 * because silence on its own proves nothing.
 */
ruleTester.run('routerNameWords and its additional variant', noMissingAuthentication, {
  valid: [
    {
      // Positive control: the invalid case "DEFAULT: `app` is a router word".
      name: 'routerNameWords REPLACES the built-ins: `app` is no longer a router',
      code: 'app.get("/admin/accounts", (req, res) => { res.json(1); });',
      options: [{ routerNameWords: ['gateway'] }],
    },
    {
      name: 'DEFAULT: `gateway` is not a built-in router word',
      code: 'gateway.get("/admin/accounts", (req, res) => { res.json(1); });',
    },
  ],
  invalid: [
    {
      name: 'DEFAULT: `app` is a router word, with no options at all',
      code: 'app.get("/admin/accounts", (req, res) => { res.json(1); });',
      errors: [{ messageId: 'missingAuthentication' }],
    },
    {
      name: 'routerNameWords REPLACES the built-ins: the replacement is a router',
      code: 'gateway.get("/admin/accounts", (req, res) => { res.json(1); });',
      options: [{ routerNameWords: ['gateway'] }],
      errors: [{ messageId: 'missingAuthentication' }],
    },
    {
      name: 'additionalRouterNameWords extends the built-ins',
      code: 'gateway.get("/admin/accounts", (req, res) => { res.json(1); });',
      options: [{ additionalRouterNameWords: ['gateway'] }],
      errors: [{ messageId: 'missingAuthentication' }],
    },
  ],
});

/**
 * `ignorePatterns` REPLACES `DEFAULT_PUBLIC_ROUTE_PATTERNS`, and always did —
 * the schema said `default: []`, which was a lie the generated Options table
 * repeated. These pin the real default so it cannot drift back.
 */
ruleTester.run('ignorePatterns default is the public-route list', noMissingAuthentication, {
  valid: [
    {
      name: 'DEFAULT: /login is public by definition, with no options at all',
      code: 'app.post("/login", (req, res) => { res.json(1); });',
    },
    {
      name: 'DEFAULT: /healthz is public by definition, with no options at all',
      code: 'app.get("/healthz", (req, res) => { res.json(1); });',
    },
  ],
  invalid: [
    {
      name: 'a supplied ignorePatterns REPLACES the built-in list, so /login reports',
      code: 'app.post("/login", (req, res) => { res.json(1); });',
      options: [{ ignorePatterns: ['/webhooks/'] }],
      errors: [{ messageId: 'missingAuthentication' }],
    },
  ],
});

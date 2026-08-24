/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-authentication
 * Detects missing authentication checks in route handlers
 * CWE-287: Improper Authentication
 *
 * @see https://cwe.mitre.org/data/definitions/287.html
 * @see https://owasp.org/www-community/vulnerabilities/Improper_Authentication
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  formatLLMMessage,
  MessageIcons,
  compileUserPattern,
  compileUserPatterns,
  matchesAnyUserPattern,
  nameHasAnyWord,
} from '@interlace/eslint-devkit';
import { createRule, isTestFilePath } from '@interlace/eslint-devkit';

type MessageIds = 'missingAuthentication';

export interface Options {
  /** Allow missing authentication in test files. Default: false */
  allowInTests?: boolean;

  /**
   * Override which filenames `allowInTests` applies to, as a regex string.
   * Unset, the shared structural predicate (`isTestFilePath`) decides.
   */
  testFilePattern?: string | null;

  /** Authentication middleware patterns to recognize. Default: ['authenticate', 'auth', 'requireAuth', 'isAuthenticated'] */
  authMiddlewarePatterns?: string[];

  /** Route handler patterns to check. Default: ['get', 'post', 'put', 'delete', 'patch', 'all'] */
  routeHandlerPatterns?: string[];

  /**
   * Route paths that need no authentication. REPLACES the built-in list, and
   * supplying it also widens matching to the whole registration text.
   * Default: DEFAULT_PUBLIC_ROUTE_PATTERNS
   */
  ignorePatterns?: string[];

  /**
   * Object names that denote an HTTP application or router, matched as WHOLE
   * WORDS and used only when the binding cannot be resolved to a framework
   * factory call. REPLACES the built-in list. Default: ROUTER_NAME_WORDS
   */
  routerNameWords?: string[];

  /** Extra router-object name words, ON TOP of `routerNameWords`. Default: [] */
  additionalRouterNameWords?: string[];
}

type RuleOptions = [Options?];

/**
 * Common authentication middleware patterns
 */
const DEFAULT_AUTH_MIDDLEWARE_PATTERNS = [
  'authenticate',
  'auth',
  'requireAuth',
  'isAuthenticated',
  'verifyToken',
  'checkAuth',
  'ensureAuthenticated',
  'passport.authenticate',
  'jwt',
  'session',
];

/**
 * Routes that are public *by definition*. Requiring authentication on a login or
 * password-reset endpoint is a contradiction — you cannot be authenticated before you
 * authenticate — and a health/metrics probe is called by infrastructure that holds no
 * session. With an empty default every consumer inherited a finding on every one of these.
 *
 * Overridable: passing `ignorePatterns` replaces this list entirely.
 */
const DEFAULT_PUBLIC_ROUTE_PATTERNS = [
  'login',
  'logout',
  'signin',
  'sign-in',
  'signup',
  'sign-up',
  'register',
  'forgot-password',
  'reset-password',
  'password-reset',
  'verify-email',
  'health',
  'healthz',
  'readyz',
  'livez',
  // Liveness / readiness probes under their other common spellings.
  // shardeum/json-rpc-server `src/routes/healthCheck.ts:8` registers
  // `get('/is-alive')` and was reported at CVSS 9.8 — a probe called by
  // infrastructure that holds no session is unauthenticated on purpose.
  'alive',
  'liveness',
  'readiness',
  'heartbeat',
  'status',
  'metrics',
  'ping',
  'favicon',
  'webhook',
  '/public/',
  'oauth',
  'callback',
];

/**
 * Common route handler patterns
 */
const DEFAULT_ROUTE_HANDLER_PATTERNS = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'all',
  'use',
];

/**
 * Object names that denote an HTTP application or router, matched as WHOLE
 * WORDS and used only when the binding cannot be resolved to a factory call
 * (an imported router, a function parameter).
 *
 * The shipped rule used `objectName.includes(name)`. `app` is a substring of
 * `wrapper` and of `dataMapper`, so `wrapper.get(key)` on an LRU cache and
 * `dataMapper.delete(id)` on a persistence layer were both reported as
 * unauthenticated HTTP routes — in files that import no HTTP server at all.
 *
 * Nine English words standing in for evidence, so this is a DEFAULT rather than
 * a fixed surface: a codebase where `server` or `route` is an ordinary domain
 * noun drops it through `routerNameWords`, and one whose routers are called
 * something else adds to it through `additionalRouterNameWords`. Neither
 * changes that the comparison is whole-word.
 */
const ROUTER_NAME_WORDS = [
  'app',
  'router',
  'route',
  'server',
  'express',
  'fastify',
  'koa',
  'hapi',
];

/**
 * Factories whose return value IS an application or router.
 *
 * @protocol-constant These are the exported factory call signatures of the Node
 * HTTP frameworks themselves — `express()`, `fastify()`, `polka()`,
 * `restify()`, `connect()`, `new Koa()`, `Router()`. They are the EVIDENCE path
 * that replaced name inference: `const api = express.Router()` is a router
 * whatever the binding is called, which is the whole reason `ROUTER_NAME_WORDS`
 * is only a fallback. Turning the evidence into a tunable vocabulary would put
 * the guess back — a consumer who deleted `express` would lose the one signal
 * that resolves `const api = express()` and fall through to spelling, and one
 * who added an ordinary factory would have every object it returns treated as
 * an unauthenticated HTTP router. A house framework belongs in
 * `routerNameWords`, which is the supported knob.
 */
const ROUTER_FACTORY_NAMES = new Set([
  'express',
  'Router',
  'fastify',
  'polka',
  'restify',
  'connect',
  'Koa',
]);

/**
 * Members whose call returns an application, router or server.
 *
 * @protocol-constant The member half of the same framework API surface —
 * `express.Router()`, `app.router()`, `http.createServer()`, `restify.Server()`
 * — published by those libraries and Node's own `http`/`https` modules. It is
 * read only to resolve a binding to a factory CALL, never to judge a name, so
 * it is a set of call signatures rather than a vocabulary. A consumer who could
 * edit it could drop `createServer` and make every `http.createServer()` route
 * invisible to the rule, or add a member and have an unrelated builder's result
 * reported as an unauthenticated route.
 */
const ROUTER_FACTORY_MEMBERS = new Set([
  'Router',
  'router',
  'Server',
  'server',
  'createServer',
]);

/**
 * Express's `app.route(path).get(handler).post(handler)` chaining, straight out
 * of the Express 4 routing guide. The registration's object is the `route()`
 * call rather than the app, so a check that requires an Identifier object never
 * looks at these routes at all.
 *
 * Returns the `route()` call itself, whose first argument is the path.
 */
function routeChainBase(node: TSESTree.Node): TSESTree.CallExpression | null {
  let current: TSESTree.Node = node;

  while (
    current.type === AST_NODE_TYPES.CallExpression &&
    current.callee.type === AST_NODE_TYPES.MemberExpression
  ) {
    const property = current.callee.property;
    if (
      property.type === AST_NODE_TYPES.Identifier &&
      property.name === 'route'
    ) {
      return current;
    }
    current = current.callee.object;
  }

  return null;
}

/**
 * A binding whose initialiser PROVES it is not an HTTP router.
 *
 * `const routeCache = new Map()` and `const serverStats = new Map()` both carry
 * a router word as a genuine whole segment, so whole-word matching cannot save
 * them — only the resolved initialiser can. Resolved evidence outranks the
 * name in both directions.
 */
function isDefinitelyNotRouter(init: TSESTree.Node): boolean {
  return (
    // a NewExpression that isRouterFactory has already rejected
    init.type === AST_NODE_TYPES.NewExpression ||
    init.type === AST_NODE_TYPES.ObjectExpression ||
    init.type === AST_NODE_TYPES.ArrayExpression
  );
}

/** `express()`, `express.Router()`, `new Koa()`, `Hapi.server()` — resolvable evidence. */
function isRouterFactory(node: TSESTree.Node): boolean {
  if (
    node.type !== AST_NODE_TYPES.CallExpression &&
    node.type !== AST_NODE_TYPES.NewExpression
  ) {
    return false;
  }

  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return ROUTER_FACTORY_NAMES.has(callee.name);
  }
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    return ROUTER_FACTORY_MEMBERS.has(callee.property.name);
  }
  return false;
}

/** The dotted name a middleware argument refers to, or null for a literal/inline function. */
function referencedName(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }
  if (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.property.type === AST_NODE_TYPES.Identifier
  ) {
    const objectPart =
      node.object.type === AST_NODE_TYPES.Identifier
        ? `${node.object.name}.`
        : '';
    return `${objectPart}${node.property.name}`;
  }
  return null;
}

/**
 * Is this argument an authentication middleware?
 *
 * Matched on the RESOLVED callee name as whole words, never on the argument's
 * printed source text. The shipped rule ran
 * `sourceCode.getText(arg).toLowerCase().includes(pattern)`, so `auth` matched
 * inside `getAuthorReport` and `session` inside `renderSessionRoster`: two
 * ordinary domain nouns — a CMS author, a conference talk — that silenced the
 * rule on genuinely unauthenticated routes.
 */
function isAuthMiddlewareArg(
  arg: TSESTree.Node,
  authPatterns: string[],
): boolean {
  const target = arg.type === AST_NODE_TYPES.CallExpression ? arg.callee : arg;
  const name = referencedName(target);
  return name !== null && nameHasAnyWord(name, authPatterns);
}

/**
 * Check if a node is inside an authentication middleware call
 */
function isInsideAuthMiddleware(
  node: TSESTree.Node,
  authPatterns: string[],
): boolean {
  let current: TSESTree.Node | null = node;

  while (current) {
    // Check if current is an argument to a CallExpression
    if (current.parent && current.parent.type === 'CallExpression') {
      const callExpr = current.parent as TSESTree.CallExpression;

      // Verify that current is actually an argument of this call
      const isArgument = callExpr.arguments.some(
        (arg: TSESTree.CallExpressionArgument) => arg === current,
      );
      if (!isArgument) {
        // Not an argument (e.g. `current` is the callee of this call, as in
        // an IIFE) - continue traversing upward. `current.parent` is
        // guaranteed truthy here because the enclosing `if` above already
        // proved it (it matched `current.parent.type === 'CallExpression'`).
        current = current.parent as TSESTree.Node;
        continue;
      }

      const callee = callExpr.callee;

      // Check if it's an authentication middleware call
      if (callee.type === 'Identifier') {
        if (nameHasAnyWord(callee.name, authPatterns)) {
          return true;
        }
      }

      // Check if it's a member expression like app.use(auth())
      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier'
      ) {
        const propertyName = callee.property.name.toLowerCase();
        if (propertyName === 'use' || propertyName === 'all') {
          // Check if any argument is an auth middleware
          for (const arg of callExpr.arguments) {
            if (isAuthMiddlewareArg(arg, authPatterns)) {
              return true;
            }
          }
        }
      }
    }

    // Traverse up the AST
    if ('parent' in current && current.parent) {
      current = current.parent as TSESTree.Node;
    } else {
      break;
    }
  }

  return false;
}

/**
 * Check if a string matches any ignore pattern
 */
function matchesIgnorePattern(text: string, patterns: string[]): boolean {
  // The try/catch here already handled an INVALID pattern. It did nothing for a
  // VALID but catastrophic one: `ignorePatterns: ['(a+)+$']` against a 30-char
  // route path took 58.2s on a single file (control: 1.65s), because
  // backtracking explodes inside a regex that compiles perfectly well.
  //
  // compileUserPattern covers both, and hoisting the compile out of the
  // per-call loop is a bonus rather than the point.
  return matchesAnyUserPattern(compileUserPatterns(patterns, 'i'), text);
}

export const noMissingAuthentication = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-authentication',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-missing-authentication.md',
      description: 'Detects missing authentication checks in route handlers',
      cwe: 'CWE-287',
      cvss: 9.8,
    },
    messages: {
      missingAuthentication: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Authentication',
        cwe: 'CWE-287',
        description: 'Route handler missing authentication check: {{route}}',
        severity: 'CRITICAL',
        fix: "Add authentication middleware: app.{{method}}('{{path}}', authenticate(), handler)",
        documentationLink: 'https://cwe.mitre.org/data/definitions/287.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing authentication in test files',
          },
          authMiddlewarePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_AUTH_MIDDLEWARE_PATTERNS,
            description: 'Authentication middleware patterns to recognize',
          },
          routeHandlerPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ROUTE_HANDLER_PATTERNS,
            description: 'Route handler patterns to check',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_PUBLIC_ROUTE_PATTERNS,
            description:
              'Route paths that are public by definition and need no authentication. Replaces the built-in list; supplying it also widens matching from the route path to the whole registration text.',
          },
          routerNameWords: {
            type: 'array',
            items: { type: 'string' },
            default: ROUTER_NAME_WORDS,
            description:
              'Object names that denote an HTTP application or router, compared as WHOLE WORDS and never as a substring. Read only when the binding cannot be resolved to a framework factory call. Replaces the built-in list.',
          },
          additionalRouterNameWords: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra router-object name words, on top of `routerNameWords`.',
          },
          testFilePattern: {
            // `null` IS the default, and saying so in the schema is the point.
            //
            // The option is genuinely three-state: a string overrides which
            // filenames `allowInTests` covers, and "not set" means the shared
            // structural predicate decides. There is no string that expresses
            // the second — `''` compiles to a regex matching every path, which
            // would silence the rule everywhere — so the default was left
            // implicit in the destructuring and `option-without-default` fired,
            // correctly: a default that lives only in `create()` is one the
            // docs cannot state and a consumer cannot read.
            //
            // Naming `null` gives the third state a value, so the schema and the
            // runtime agree and both are readable.
            type: ['string', 'null'],
            default: null,
            description:
              'Override which filenames `allowInTests` applies to. Null — the default — leaves it to the shared structural predicate.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      authMiddlewarePatterns: DEFAULT_AUTH_MIDDLEWARE_PATTERNS,
      routeHandlerPatterns: DEFAULT_ROUTE_HANDLER_PATTERNS,
      ignorePatterns: DEFAULT_PUBLIC_ROUTE_PATTERNS,
      routerNameWords: ROUTER_NAME_WORDS,
      additionalRouterNameWords: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = false,
      testFilePattern,
      authMiddlewarePatterns = DEFAULT_AUTH_MIDDLEWARE_PATTERNS,
      routeHandlerPatterns = DEFAULT_ROUTE_HANDLER_PATTERNS,
      ignorePatterns = DEFAULT_PUBLIC_ROUTE_PATTERNS,
      routerNameWords = ROUTER_NAME_WORDS,
      additionalRouterNameWords = [],
    } = options as Options;

    const routerWords = [...routerNameWords, ...additionalRouterNameWords];

    const filename = context.filename;
    // Guarded: a user pattern reaches `new RegExp` here. Measured before this
    // change: `(a+)+$` took 45-58s on a single file, and `[` threw
    // "Invalid regular expression" out of create(), killing the whole lint
    // run rather than just this rule. compileUserPattern degrades both to a
    // substring match.
    // Unset — the normal case — the shared structural predicate decides, so the
    // verdict cannot depend on where the repo is checked out. A user who sets
    // the option still overrides it exactly.
    const isTestFile =
      allowInTests &&
      (testFilePattern == null
        ? isTestFilePath(filename)
        : compileUserPattern(testFilePattern).test(filename));
    const sourceCode = context.sourceCode;

    /**
     * DEFAULT_PUBLIC_ROUTE_PATTERNS describes ROUTE PATHS — `/login`,
     * `/healthz`, `/metrics`. The shipped rule also tested them against
     * `sourceCode.getText(node)`, the ENTIRE registration including the
     * handler body, and `status` is on that list. Every Express handler that
     * writes `res.status(500)` therefore silenced the rule about its own
     * missing authentication:
     *
     *   app.get('/admin/accounts', async (req, res) => {   // reported
     *     try { res.json(await listUsers()); }
     *     catch { res.status(500).end(); }                 // NOT reported
     *   });
     *
     * A user-supplied `ignorePatterns` is a deliberate escape hatch, so it
     * keeps matching the whole call; the built-in path list does not.
     */
    const scansWholeCallText =
      (context.options[0] as Options | undefined)?.ignorePatterns !== undefined;

    /**
     * Does this object denote an HTTP application or router?
     *
     * Preferred evidence is the resolved binding — `const api =
     * express.Router()` is a router whatever it is called, which is also why
     * the shipped rule missed it: `api` contains none of its hard-coded
     * substrings. The whole-word name check is only the fallback for bindings
     * this file cannot resolve, such as an imported router.
     */
    function looksLikeRouter(object: TSESTree.Identifier): boolean {
      const scope = sourceCode.getScope(object);
      const reference = scope.references.find(
        (ref) => ref.identifier === object,
      );
      const resolved = reference?.resolved;

      for (const def of resolved?.defs ?? []) {
        const parent = (def.name as TSESTree.Node).parent;
        if (parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.init) {
          if (isRouterFactory(parent.init)) {
            return true;
          }
          if (isDefinitelyNotRouter(parent.init)) {
            return false;
          }
        }
      }

      return nameHasAnyWord(object.name, routerWords);
    }

    /**
     * Find variable declaration for an identifier
     */
    function findVariableDeclaration(
      identifier: TSESTree.Identifier,
    ): TSESTree.VariableDeclarator | null {
      const varName = identifier.name;
      let current: TSESTree.Node | null = identifier;

      while (current) {
        // Search in current scope
        if (
          current.type === 'Program' ||
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          const scopeBody =
            current.type === 'Program'
              ? current.body
              : current.body.type === 'BlockStatement'
                ? current.body.body
                : [];

          for (const stmt of scopeBody) {
            if (stmt.type === 'VariableDeclaration') {
              for (const declarator of stmt.declarations) {
                if (
                  declarator.id.type === 'Identifier' &&
                  declarator.id.name === varName
                ) {
                  return declarator;
                }
              }
            }
          }
        }

        // Traverse up
        if ('parent' in current && current.parent) {
          current = current.parent as TSESTree.Node;
        } else {
          break;
        }
      }

      return null;
    }

    /**
     * Check if an identifier was assigned from an auth middleware call
     */
    function isIdentifierFromAuthMiddleware(
      identifier: TSESTree.Identifier,
    ): boolean {
      const declarator = findVariableDeclaration(identifier);
      if (!declarator || !declarator.init) {
        return false;
      }

      // Check if init is a CallExpression to auth middleware
      if (
        declarator.init.type === 'CallExpression' &&
        declarator.init.callee.type === 'Identifier'
      ) {
        return nameHasAnyWord(
          declarator.init.callee.name,
          authMiddlewarePatterns,
        );
      }

      return false;
    }

    /**
     * Check CallExpression for route handlers without authentication
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      // Check if it's a route handler call (app.get, router.post, etc.)
      if (node.callee.type === 'MemberExpression') {
        const property = node.callee.property;
        const object = node.callee.object;

        // Only check if the object looks like an Express app/router: either an
        // identifier like `app` / `router`, or the `app.route(path)` call that
        // Express's own chaining API puts there.
        let chainedPath: TSESTree.CallExpressionArgument | undefined;

        if (object.type === 'Identifier') {
          if (!looksLikeRouter(object)) {
            return; // Skip non-router objects like stmt.get(), db.get()
          }
        } else {
          const base = routeChainBase(object);
          const baseObject =
            base?.callee.type === 'MemberExpression'
              ? base.callee.object
              : undefined;
          if (
            !base ||
            baseObject?.type !== AST_NODE_TYPES.Identifier ||
            !looksLikeRouter(baseObject)
          ) {
            return; // Skip member chains like db.users.get()
          }
          chainedPath = base.arguments[0];
        }

        if (property.type === 'Identifier') {
          const methodName = property.name.toLowerCase();

          if (routeHandlerPatterns.includes(methodName)) {
            // `app.use(middleware)` with no path mounts GLOBAL middleware — it is not a
            // route handler, so "missing authentication" is meaningless there. Flagging it
            // produced 24 findings across 8 clean fixtures (`app.use(helmet())`,
            // `app.use(rateLimit(...))`, `app.use(express.json())`), the single largest
            // false-positive source in the plugin. Only a PATH-MOUNTED `use` —
            // `app.use('/api', handler)` — addresses a route and can be missing auth.
            // `app.get('port')` READS A SETTING. Express overloads the same
            // name: one argument is `app.set`'s getter, two or more registers
            // a route. Treating the getter as a route made
            // ministryofjustice/hmpps-arns-assessment-platform-ui report on
            // `app.listen(app.get('port'), …)` and on the log line beside it —
            // a port number judged as an unauthenticated endpoint.
            //
            // A route always has a handler after the path, so the arity test
            // is exact rather than a heuristic. `use` has its own rule below;
            // `all`/`post`/`put`/`patch`/`delete` are not overloaded this way,
            // but a one-argument call to any of them registers nothing either.
            if (
              methodName !== 'use' &&
              chainedPath === undefined &&
              node.arguments.length < 2
            ) {
              return;
            }

            if (methodName === 'use') {
              const first = node.arguments[0];
              const mountsAPath =
                first !== undefined &&
                first.type === 'Literal' &&
                typeof first.value === 'string';
              if (!mountsAPath) {
                return;
              }
            }

            // In `app.route('/admin').get(handler)` the path lives on the
            // `route()` call and this call's arguments are ALL handlers.
            // Always present by this point: either `chainedPath` came from a
            // preceding `route(path)`, or the arity check above established
            // that this call has a path and a handler. The `'unknown'`
            // fallback it used to carry was reachable only from `app.get()`
            // with no arguments, which no longer gets this far.
            const pathArgument = (chainedPath ??
              node.arguments[0]) as TSESTree.Node;

            const routePath =
              pathArgument.type === 'Literal'
                ? String(pathArgument.value)
                : sourceCode.getText(pathArgument);

            const text = sourceCode.getText(node);
            // These were `console.log('DEBUG MSG: ...')` in shipped code. Any consumer who
            // set `ignorePatterns` got debug lines on stdout, which corrupts the JSON and
            // SARIF formatters. A rule must never write to stdout.
            if (matchesIgnorePattern(routePath, ignorePatterns)) {
              return;
            }
            if (
              scansWholeCallText &&
              matchesIgnorePattern(text, ignorePatterns)
            ) {
              return;
            }

            // The LAST argument of a route registration is the HANDLER, not
            // middleware, so its own name is not evidence of anything.
            // `router.get('/talks/:id/roster', renderSessionRoster)` has no
            // middleware at all; reading `session` out of the handler's name
            // is what let an unauthenticated route pass.
            //
            // `use` is exempt: `app.use('/api', authenticate())` legitimately
            // mounts middleware as its final argument.
            const firstMiddlewareIndex = chainedPath === undefined ? 1 : 0;
            const middlewareArgs =
              methodName === 'use'
                ? node.arguments.slice(firstMiddlewareIndex)
                : node.arguments.slice(firstMiddlewareIndex, -1);

            // Check if authentication middleware is present in arguments
            let hasAuth = false;
            for (const arg of middlewareArgs) {
              if (isAuthMiddlewareArg(arg, authMiddlewarePatterns)) {
                hasAuth = true;
                break;
              }

              // Check if argument is an identifier assigned from auth middleware
              if (
                arg.type === 'Identifier' &&
                isIdentifierFromAuthMiddleware(arg)
              ) {
                hasAuth = true;
                break;
              }
            }

            // Check if the handler function itself is inside an auth middleware context
            if (!hasAuth && node.arguments.length > 0) {
              const lastArg = node.arguments[node.arguments.length - 1];
              if (
                lastArg.type === 'ArrowFunctionExpression' ||
                lastArg.type === 'FunctionExpression'
              ) {
                // Check if the handler is inside an auth middleware call
                if (isInsideAuthMiddleware(lastArg, authMiddlewarePatterns)) {
                  hasAuth = true;
                }
              }
            }

            if (!hasAuth) {
              context.report({
                node: node.callee,
                messageId: 'missingAuthentication',
                data: {
                  route: `${methodName}(${routePath})`,
                  method: methodName,
                  path: routePath,
                },
              });
            }
          }
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

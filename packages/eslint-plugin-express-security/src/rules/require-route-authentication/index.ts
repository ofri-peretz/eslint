/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-route-authentication
 *
 * Detects routes that expose a critical function — password / credential /
 * account / payment / role / config endpoints — with no authentication in
 * their middleware chain and no reference to an authenticated principal
 * inside the handler.
 *
 * CWE-306: Missing Authentication for Critical Function
 * OWASP A07:2021 – Identification and Authentication Failures
 *
 * ## Detection method: naming-heuristic (ships as `warn`)
 *
 * The route path is the signal for "critical function", so this is a naming
 * heuristic by construction and never carries enforcement severity (scope
 * audit invariant I3). Everything around the name is structural: the route
 * registration shape, the middleware chain arity, and whether the handler
 * body reads an authenticated principal.
 *
 * Three things suppress the report, in order:
 *   1. an app-level `app.use(<auth middleware>)` anywhere in the file,
 *   2. any auth-shaped middleware in the route's own chain,
 *   3. a principal read (`req.user`, `req.auth`, `req.session`,
 *      `res.locals.user`, …) inside the handler.
 *
 * Public-by-design endpoints (login, signup, password reset, webhooks,
 * health checks, OAuth callbacks) are excluded before any of that.
 *
 * @see https://cwe.mitre.org/data/definitions/306.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { walk } from '../../utils';
import {
  isAuthMiddlewareArg,
  routeIsAuthenticated,
} from '../../utils/auth-evidence';
import { fileUsesExpress } from '../../utils/express-evidence';

type MessageIds = 'missingAuthentication';

export interface Options {
  /** Path fragments that mark a route as a critical function. */
  criticalPaths?: string[];

  /** Path fragments that are public by design and never reported. */
  publicPaths?: string[];

  /** Extra middleware names to accept as authentication. */
  authMiddleware?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_CRITICAL_PATHS = [
  'password',
  'credential',
  'secret',
  'apikey',
  'api-key',
  'user',
  'account',
  'profile',
  'role',
  'permission',
  'grant',
  'payment',
  'billing',
  'invoice',
  'charge',
  'refund',
  'transfer',
  'withdraw',
  'order',
  'config',
  'setting',
  'export',
  'import',
  'mfa',
  '2fa',
  'otp',
  'deploy',
  'migrate',
  'backup',
  'restore',
  'internal',
  'private',
];

const DEFAULT_PUBLIC_PATHS = [
  'login',
  'signin',
  'sign-in',
  'logout',
  'signup',
  'sign-up',
  'register',
  'forgot',
  'reset',
  'confirm',
  'verify',
  // Credential-recovery and factor-enrolment steps. These are the steps that
  // *establish* authentication, so requiring authentication on them is a
  // contradiction — the caller has none yet, by construction.
  //
  // All fifteen findings on the 8-repo corpus were this class: okta-auth-js's
  // IdX sample router registers `/recover-password`, `/unlock-account`,
  // `/challenge-authenticator/okta_password` and `/enroll-authenticator/*`,
  // every one of which matched the critical fragment "password" or "otp" while
  // the vocabulary had no word for the flow they belong to.
  'recover',
  'recovery',
  'unlock',
  'challenge',
  'enroll',
  'enrol',
  'enrollment',
  'activate',
  'activation',
  'resend',
  'consent',
  'webhook',
  'hook',
  'health',
  'healthz',
  'readyz',
  'livez',
  'ping',
  'status',
  'public',
  'static',
  'assets',
  'favicon',
  'robots',
  'callback',
  'oauth',
  'sso',
  'docs',
  'swagger',
  'openapi',
];

/** Route-registration methods that mount a handler on a path. */
const ROUTE_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'all']);

/** Receivers that are an Express application/router in practice. */
const APP_RECEIVER = /^(app|router|express|api)$/i;

/**
 * Does a path fragment occur as a whole word in the route path?
 *
 * A raw `path.includes(fragment)` collides on ordinary English: `/reorder-items`
 * and `/border-crossing` both contain "order". Matching is therefore anchored to
 * non-alphanumeric boundaries, with an optional plural `s` so the singular
 * vocabulary ("order", "user") still matches the plural routes people write
 * ("/orders/:id", "/users").
 */
function matchesFragment(path: string, fragment: string): boolean {
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}s?([^a-z0-9]|$)`).test(path);
}

/** The three function forms a route handler can take. */
function asFunction(
  node: TSESTree.Node | undefined,
): TSESTree.FunctionLike | undefined {
  return node?.type === AST_NODE_TYPES.FunctionDeclaration ||
    node?.type === AST_NODE_TYPES.FunctionExpression ||
    node?.type === AST_NODE_TYPES.ArrowFunctionExpression
    ? node
    : undefined;
}

/**
 * Does this handler *answer* the request, or hand it on?
 *
 * ```js
 * function redirectToOrigin(req, res, next) { req.url = '/'; next(); }
 * app.get('/profile', redirectToOrigin);   // …then express.static answers
 * ```
 *
 * okta-auth-js's single-page-app sample writes exactly that: three routes
 * share one rewriter whose whole job is to point the URL at the SPA shell so
 * `express.static` can serve it. Nothing is *exposed* at `/profile` — the
 * route registers a rewrite, and "this critical function has no
 * authentication" is a claim about a function that is not there.
 *
 * The test is deliberately narrow: the body must call `next(…)` **and** never
 * touch `res`. A handler that conditionally bails with `return next()` but
 * otherwise answers (`res.json(...)`) is still an endpoint and still reported.
 */
function isDelegatingHandler(fn: TSESTree.FunctionLike): boolean {
  let callsNext = false;
  let touchesResponse = false;
  walk(fn.body as TSESTree.Node, (node) => {
    if (
      node.type === AST_NODE_TYPES.CallExpression &&
      node.callee.type === AST_NODE_TYPES.Identifier &&
      node.callee.name === 'next'
    ) {
      callsNext = true;
      return;
    }
    if (
      node.type === AST_NODE_TYPES.MemberExpression &&
      node.object.type === AST_NODE_TYPES.Identifier &&
      RESPONSE_RECEIVER.test(node.object.name)
    ) {
      touchesResponse = true;
    }
  });
  return callsNext && !touchesResponse;
}

const RESPONSE_RECEIVER = /^(res|response)$/i;

export const requireRouteAuthentication = createRule<RuleOptions, MessageIds>({
  name: 'require-route-authentication',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-route-authentication.md',
      description:
        'Require authentication on routes that expose a critical function (account, credential, payment, configuration)',
      cwe: 'CWE-306',
      cvss: 8.2,
      confidence: 'medium',
    },
    messages: {
      missingAuthentication: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Critical Route Without Authentication (CWE-306)',
        cwe: 'CWE-306',
        cvss: 8.2,
        description:
          '{{method}} {{path}} exposes a critical function but its chain has no authentication middleware and the handler never reads an authenticated principal. Anyone who can reach the port can call it.',
        severity: 'HIGH',
        fix: "Mount an authentication middleware on the route — app.{{method}}('{{path}}', requireAuth, handler) — or app.use(requireAuth) for the whole router.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/306.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          criticalPaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Path fragments that mark a route as critical',
          },
          publicPaths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Path fragments that are public by design',
          },
          authMiddleware: {
            type: 'array',
            items: { type: 'string' },
            description: 'Extra middleware names accepted as authentication',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const { criticalPaths, publicPaths, authMiddleware } = options as Options;
    const critical = (criticalPaths ?? DEFAULT_CRITICAL_PATHS).map((p) =>
      p.toLowerCase(),
    );
    const publics = (publicPaths ?? DEFAULT_PUBLIC_PATHS).map((p) =>
      p.toLowerCase(),
    );
    const extraAuth = new Set(authMiddleware ?? []);

    /**
     * Module-level handler declarations, so a route registered with a bare
     * identifier can be judged on the function it names.
     */
    const topLevelFunctions = new Map<string, TSESTree.Node>();
    for (const stmt of context.sourceCode.ast.body) {
      if (stmt.type === AST_NODE_TYPES.FunctionDeclaration && stmt.id) {
        topLevelFunctions.set(stmt.id.name, stmt);
        continue;
      }
      if (stmt.type !== AST_NODE_TYPES.VariableDeclaration) continue;
      for (const decl of stmt.declarations) {
        if (decl.id.type === AST_NODE_TYPES.Identifier && decl.init) {
          topLevelFunctions.set(decl.id.name, decl.init);
        }
      }
    }

    /** Deferred so an `app.use(auth)` after the route still suppresses it. */
    const candidates: { node: TSESTree.Node; method: string; path: string }[] =
      [];
    let hasGlobalAuth = false;

    function routeMethodOf(node: TSESTree.CallExpression): string | null {
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return null;
      if (callee.property.type !== AST_NODE_TYPES.Identifier) return null;
      if (callee.computed) return null;
      if (callee.object.type !== AST_NODE_TYPES.Identifier) return null;
      if (!APP_RECEIVER.test(callee.object.name)) return null;
      return callee.property.name;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const method = routeMethodOf(node);
        if (!method) return;

        // app.use(requireAuth) — a router-wide guard suppresses every route.
        // A PATH-SCOPED mount does not: `app.use('/public', requireAuth)` guards
        // /public only, and treating it as global would silently switch this rule
        // off for every critical route in the file.
        if (method === 'use') {
          const [first] = node.arguments;
          const pathScoped =
            first?.type === AST_NODE_TYPES.Literal &&
            typeof first.value === 'string';
          if (!pathScoped) {
            for (const arg of node.arguments) {
              if (
                arg.type !== AST_NODE_TYPES.Literal &&
                isAuthMiddlewareArg(arg, extraAuth)
              ) {
                hasGlobalAuth = true;
              }
            }
          }
          return;
        }

        if (!ROUTE_METHODS.has(method)) return;

        const [pathArg, ...rest] = node.arguments;
        if (
          !pathArg ||
          pathArg.type !== AST_NODE_TYPES.Literal ||
          typeof pathArg.value !== 'string'
        ) {
          return;
        }
        // `app.get('view engine')` is a setting lookup, not a route
        if (rest.length === 0) return;

        const path = pathArg.value.toLowerCase();
        if (publics.some((fragment) => matchesFragment(path, fragment))) return;
        if (!critical.some((fragment) => matchesFragment(path, fragment)))
          return;

        // Any middleware before the final handler that reads as auth, or a
        // handler that resolves the principal itself (req.user, …).
        // `require-csrf-protection` reports the exact complement of this test,
        // so the two rules never land on one site.
        const handler = rest[rest.length - 1];
        if (routeIsAuthenticated(rest.slice(0, -1), handler, extraAuth)) {
          return;
        }

        // A handler that hands the request on is not the exposed function.
        const fn =
          asFunction(handler) ??
          (handler.type === AST_NODE_TYPES.Identifier
            ? asFunction(topLevelFunctions.get(handler.name))
            : undefined);
        if (fn && isDelegatingHandler(fn)) return;

        candidates.push({ node: pathArg, method, path: pathArg.value });
      },

      'Program:exit'() {
        if (hasGlobalAuth) return;
        for (const candidate of candidates) {
          context.report({
            node: candidate.node,
            messageId: 'missingAuthentication',
            data: { method: candidate.method, path: candidate.path },
          });
        }
      },
    };
  },
});

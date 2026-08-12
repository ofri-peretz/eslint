/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-csrf-protection
 *
 * Detects an Express route that mutates state on behalf of a browser-held
 * credential without a CSRF token.
 *
 * CWE-352: Cross-Site Request Forgery (CSRF)
 *
 * ## The two preconditions, and why a POST alone is neither
 *
 * CSRF is not "a state-changing method without a token". It is *the browser
 * attaching a credential the attacker cannot read but can cause to be sent*.
 * Two things have to be true before the control means anything:
 *
 * 1. **Ambient credential material exists.** With no cookie and no session
 *    anywhere in the file — a bearer-token API, an OAuth callback, a
 *    form-post demo — a cross-site request carries no authority and a token
 *    would protect nothing. Measured on the 8-repo corpus: 36 of 38 findings
 *    were in files with no cookie or session in them at all.
 *
 * 2. **The route is authenticated.** An endpoint that requires no principal
 *    has nothing for a forged request to ride, and adding a CSRF token to it
 *    fixes no vulnerability. That case belongs to
 *    `require-route-authentication` (CWE-306), whose test is the exact
 *    complement of this one — see `routeIsAuthenticated`. Before this, both
 *    rules reported the same seven routes.
 *
 * @see https://cwe.mitre.org/data/definitions/352.html
 * @see https://owasp.org/www-community/attacks/csrf
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import { fileHasAmbientCredentials } from '../../utils/app-composition';
import { routeIsAuthenticated } from '../../utils/auth-evidence';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingCsrf' | 'addCsrf';

export interface Options {
  /** Allow missing CSRF in test files. Default: false */
  allowInTests?: boolean;

  /** HTTP methods that require CSRF protection. Default: ['post', 'put', 'patch', 'delete'] */
  protectedMethods?: string[];

  /** Route patterns to ignore (e.g., /api/webhook). Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_PROTECTED_METHODS = ['post', 'put', 'patch', 'delete'];

/** This rule exposes no `authMiddleware` option; the shared helper takes a set. */
const EMPTY: ReadonlySet<string> = new Set();

/**
 * Check if a call is a CSRF middleware usage
 */
function isCsrfMiddleware(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;

  // app.use(csrf()) or app.use(csurf())
  if (callee.type === 'Identifier') {
    const name = callee.name.toLowerCase();
    return name === 'csrf' || name === 'csurf' || name === 'csrfprotection';
  }

  // lusca.csrf()
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'lusca' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'csrf'
  ) {
    return true;
  }

  return false;
}

/** Does any name in this middleware reference say "CSRF token"? */
function isCsrfReference(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') return /csrf|csurf/i.test(node.name);
  if (node.type === 'MemberExpression') {
    return (
      isCsrfReference(node.object) ||
      (node.property.type === 'Identifier' && isCsrfReference(node.property))
    );
  }
  if (node.type === 'CallExpression') return isCsrfReference(node.callee);
  return false;
}

/**
 * Check if the route's own middleware chain mounts CSRF protection.
 *
 * The chain only — never the handler. This used to regex over
 * `sourceCode.getText(node)`, which is the *entire* registration including the
 * handler body, so a route whose handler merely mentioned `csrfToken` when
 * rendering a form counted as protected.
 */
function hasCsrfInMiddlewareChain(chain: readonly TSESTree.Node[]): boolean {
  return chain.some(isCsrfReference);
}

/**
 * Known Express app/router variable names
 */
const EXPRESS_IDENTIFIERS = new Set([
  'app',
  'router',
  'api',
  'apiRouter',
  'routes',
  'express',
]);

/**
 * Check if the callee object is likely an Express app or router
 * This prevents false positives on non-Express objects
 */
function isLikelyExpressObject(callee: TSESTree.MemberExpression): boolean {
  const obj = callee.object;

  // Direct identifier: app.post(), router.post()
  if (obj.type === 'Identifier') {
    // Check known Express variable names
    if (EXPRESS_IDENTIFIERS.has(obj.name)) {
      return true;
    }
    // Skip unknown identifiers to avoid FPs
    // Names like 'server', 'customApi', 'controller' are not Express
    return false;
  }

  // Call expression: express().post(), express.Router().post()
  if (obj.type === 'CallExpression') {
    const objCallee = obj.callee;

    // express()
    if (objCallee.type === 'Identifier' && objCallee.name === 'express') {
      return true;
    }

    // express.Router()
    if (
      objCallee.type === 'MemberExpression' &&
      objCallee.object.type === 'Identifier' &&
      objCallee.object.name === 'express' &&
      objCallee.property.type === 'Identifier' &&
      objCallee.property.name === 'Router'
    ) {
      return true;
    }
  }

  // Member expression: this.app, this.router - skip to avoid FPs
  if (obj.type === 'MemberExpression') {
    return false;
  }

  return false;
}

export const requireCsrfProtection = createRule<RuleOptions, MessageIds>({
  name: 'require-csrf-protection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-csrf-protection.md',
      description:
        'Require CSRF protection middleware for state-changing HTTP methods',
      cwe: 'CWE-352',
      cvss: 8.8,
    },
    hasSuggestions: true,
    messages: {
      missingCsrf: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing CSRF Protection',
        cwe: 'CWE-352',
        description:
          'Route handler for {{method}} request lacks CSRF protection. Attackers can forge requests from malicious sites.',
        severity: 'HIGH',
        fix: 'Add CSRF middleware: app.use(csrf()) or use csurf package. Include csrfToken in forms.',
        documentationLink: 'https://owasp.org/www-community/attacks/csrf',
      }),
      addCsrf: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add CSRF Protection',
        description: 'Add CSRF middleware to protect state-changing requests',
        severity: 'LOW',
        fix: 'npm install csurf; app.use(csurf({ cookie: true }))',
        documentationLink: 'https://www.npmjs.com/package/csurf',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing CSRF in test files',
          },
          protectedMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['post', 'put', 'patch', 'delete'],
            description: 'HTTP methods that require CSRF protection',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Route patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      protectedMethods: DEFAULT_PROTECTED_METHODS,
      ignorePatterns: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    // Precondition 1 — see the header comment. No cookie, no session, no
    // CSRF: a cross-site request to this file's routes carries no authority.
    if (!fileHasAmbientCredentials(context.sourceCode.ast)) return {};

    const {
      allowInTests = false,
      protectedMethods = DEFAULT_PROTECTED_METHODS,
      ignorePatterns = [],
    } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    let hasGlobalCsrf = false;
    /**
     * Reports are deferred to `Program:exit` so that an `app.use(csrf())`
     * written *below* a route still suppresses it. Reporting inline made the
     * finding depend on statement order, which no adopter would guess.
     */
    const candidates: {
      node: TSESTree.CallExpression;
      method: string;
      chain: TSESTree.Node[];
      handler: TSESTree.Node | undefined;
    }[] = [];
    /**
     * `app.use(requireAuth)` — a router-wide guard authenticates every route
     * below it, which is precisely the configuration where CSRF *does* apply.
     * A path-scoped mount (`app.use('/public', …)`) is not global; treating it
     * as one is the mistake require-route-authentication documents.
     */
    let hasGlobalAuth = false;

    /**
     * Check if route matches ignore patterns
     */
    function shouldIgnoreRoute(routeArg: TSESTree.Node): boolean {
      if (routeArg.type !== 'Literal' || typeof routeArg.value !== 'string') {
        return false;
      }
      const route = routeArg.value;
      return ignorePatterns.some((pattern) => {
        try {
          return new RegExp(pattern).test(route);
        } catch {
          return route.includes(pattern);
        }
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for global app.use(csrf()) or app.use(csrfMiddleware)
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'use'
        ) {
          for (const arg of node.arguments) {
            // app.use(csrf())
            if (arg.type === 'CallExpression' && isCsrfMiddleware(arg)) {
              hasGlobalCsrf = true;
              return;
            }
            // app.use(csrfMiddleware) - variable reference
            if (arg.type === 'Identifier') {
              const name = arg.name.toLowerCase();
              if (name.includes('csrf') || name.includes('csurf')) {
                hasGlobalCsrf = true;
                return;
              }
            }
          }
          const [first] = node.arguments;
          const pathScoped =
            first?.type === 'Literal' && typeof first.value === 'string';
          if (
            !pathScoped &&
            routeIsAuthenticated(node.arguments, undefined, EMPTY)
          ) {
            hasGlobalAuth = true;
          }
        }

        // Check for route handlers: app.post(), router.put(), etc.
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier'
        ) {
          const method = callee.property.name.toLowerCase();

          if (!protectedMethods.includes(method)) {
            return;
          }

          // Only flag if this looks like an Express app/router
          // This prevents FPs on non-Express objects like server.post(), customApi.post()
          if (!isLikelyExpressObject(callee)) {
            return;
          }

          // Check if route should be ignored
          const [routeArg, ...rest] = node.arguments;
          if (routeArg && shouldIgnoreRoute(routeArg)) {
            return;
          }

          // Check if CSRF middleware is in the route's own chain
          if (hasCsrfInMiddlewareChain(rest.slice(0, -1))) {
            return;
          }

          candidates.push({
            node,
            method: method.toUpperCase(),
            chain: rest.slice(0, -1),
            handler: rest[rest.length - 1],
          });
        }
      },

      'Program:exit'() {
        if (hasGlobalCsrf) return;
        for (const candidate of candidates) {
          // Precondition 2 — the partition with require-route-authentication.
          // An unauthenticated route has no ambient authority to forge, so a
          // CSRF token there fixes nothing; CWE-306 is the finding and that
          // rule owns it. Exactly one of the two tests holds at any site.
          if (
            !hasGlobalAuth &&
            !routeIsAuthenticated(candidate.chain, candidate.handler, EMPTY)
          ) {
            continue;
          }
          context.report({
            node: candidate.node,
            messageId: 'missingCsrf',
            data: { method: candidate.method },
            suggest: [
              {
                messageId: 'addCsrf',
                fix: () => null,
              },
            ],
          });
        }
      },
    };
  },
});

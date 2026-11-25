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
 * Three further shapes carry no cross-site authority and stay quiet: a
 * **guard-only** registration (`app.post('/x', security.denyAll())` handles
 * nothing), a **bearer** route (an `Authorization` header is not attached by the
 * browser), and `cookie-parser` on its own (it parses cookies; it does not make
 * one a credential). The opposite gap is closed too: a routes module that is
 * handed to the file that configures the session — and renders documents — has
 * its credential evidence in that other file, so it is read as having it.
 *
 * @see https://cwe.mitre.org/data/definitions/352.html
 * @see https://owasp.org/www-community/attacks/csrf
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  fileHasAmbientCredentials,
  fileInheritsAmbientCredentials,
} from '../../utils/app-composition';
import { routeIsAuthenticated } from '../../utils/auth-evidence';
import {
  isGuardOnlyRegistration,
  routeUsesBearerCredentialOnly,
} from '../../utils/credential-evidence';
import { packageBindings } from '../../utils/import-bindings';
import { flattenMiddleware, routeChainRoot } from '../../utils/route-shapes';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  isTestFilePath,
  memberPropertyName,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingCsrf';

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

/** A module specifier that names a CSRF implementation (`./libs/csrf.js`, `csurf`). */
const CSRF_MODULE = /csrf|csurf/i;

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
    propertyName(callee) === 'csrf'
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
      propertyName(objCallee) === 'Router'
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
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-csrf-protection.md',
      description:
        'Require CSRF protection middleware for state-changing HTTP methods',
      cwe: 'CWE-352',
      cvss: 8.8,
    },
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let allowInTests: boolean;
    let protectedMethods: string[];
    let ignorePatterns: string[];
    /**
     * The module specifier an identifier is bound to by an `import` or a
     * `require(…)`, or undefined when it is bound to anything else.
     */
    function moduleSpecifierOf(node: TSESTree.Identifier): string | undefined {
      let scope: TSESLint.Scope.Scope | null =
        context.sourceCode.getScope(node);
      while (scope) {
        const variable = scope.set.get(node.name);
        if (variable) {
          const def = variable.defs[0];
          if (!def) return undefined;
          if (def.type === 'ImportBinding') {
            // `import lusca from 'lusca'` or `import lusca = require('lusca')`
            if (def.parent.type === 'ImportDeclaration') {
              return String(def.parent.source.value);
            }
            const reference = def.parent.moduleReference;
            return reference.type === 'TSExternalModuleReference'
              ? String(reference.expression.value)
              : undefined;
          }
          if (def.type !== 'Variable' || !def.node.init) return undefined;
          const init = def.node.init;
          return init.type === 'CallExpression' &&
            init.callee.type === 'Identifier' &&
            init.callee.name === 'require' &&
            init.arguments[0]?.type === 'Literal'
            ? String(init.arguments[0].value)
            : undefined;
        }
        scope = scope.upper;
      }
      return undefined;
    }

    /** Is this identifier bound by an import or require of a csrf module? */
    function isCsrfModuleBinding(node: TSESTree.Identifier): boolean {
      const specifier = moduleSpecifierOf(node);
      return specifier !== undefined && CSRF_MODULE.test(specifier);
    }

    /** Is this identifier bound by an import or require of `lusca`? */
    function isLuscaBinding(node: TSESTree.Node): boolean {
      return node.type === 'Identifier' && moduleSpecifierOf(node) === 'lusca';
    }

    /**
     * A call that builds CSRF middleware from a module the file imported:
     * `csurf()`, `lusca.csrf()`, or `lusca({ csrf: true })`. The last is lusca's
     * combined form; it protects unless the `csrf` key is a literal `false`.
     */
    function isCsrfFactoryCall(node: TSESTree.Node): boolean {
      if (node.type !== 'CallExpression') return false;
      const callee = node.callee;
      if (callee.type === 'Identifier') {
        if (isCsrfModuleBinding(callee)) return true;
        if (!isLuscaBinding(callee)) return false;
        const [options] = node.arguments;
        return (
          options?.type === 'ObjectExpression' &&
          options.properties.some(
            (property) =>
              property.type === 'Property' &&
              objectKeyName(property) === 'csrf' &&
              !(
                property.value.type === 'Literal' &&
                property.value.value === false
              ),
          )
        );
      }
      return (
        callee.type === 'MemberExpression' &&
        isLuscaBinding(callee.object) &&
        propertyName(callee) === 'csrf'
      );
    }

    /**
     * A mounted middleware function that hands the request on to a CSRF module
     * it imported: `app.use(function (req, res, next) { csrf(req, res, next); })`.
     * Mounted once for every route, so it protects them like `app.use(csrf())`.
     * The callee must resolve to an import or `require` of a module whose path
     * names csrf, and the call must pass the wrapper's own `next` on: a helper
     * that merely reads a token does not protect anything.
     */
    function isDelegatingCsrfWrapper(node: TSESTree.Node): boolean {
      if (
        node.type !== 'FunctionExpression' &&
        node.type !== 'ArrowFunctionExpression'
      ) {
        return false;
      }
      const next = node.params[2];
      if (next?.type !== 'Identifier') return false;
      let found = false;
      const visit = (current: TSESTree.Node | null | undefined): void => {
        if (found || !current || typeof current.type !== 'string') return;
        if (
          current.type === 'CallExpression' &&
          ((current.callee.type === 'Identifier' &&
            isCsrfModuleBinding(current.callee)) ||
            isCsrfFactoryCall(current.callee)) &&
          current.arguments.some(
            (argument) =>
              argument.type === 'Identifier' && argument.name === next.name,
          )
        ) {
          found = true;
          return;
        }
        for (const [key, value] of Object.entries(
          current as unknown as Record<string, unknown>,
        )) {
          if (key === 'parent') continue;
          if (Array.isArray(value)) {
            for (const entry of value) visit(entry as TSESTree.Node);
          } else if (value && typeof value === 'object' && 'type' in value) {
            visit(value as TSESTree.Node);
          }
        }
      };
      visit(node.body);
      return found;
    }

    let hasGlobalCsrf: boolean;
    let candidates: {
      node: TSESTree.CallExpression;
      method: string;
      chain: TSESTree.Node[];
      handler: TSESTree.Node | undefined;
    }[];
    let hasGlobalAuth: boolean;
    let jwtBindings: ReturnType<typeof packageBindings>;

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
      before() {
        const [options] = currentOptions();
        // Every rule here is Express-specific, and none of them knew it: over
        // 107,382 files, 75% of this plugin's findings were in files with no
        // Express import. Registering no visitors is both the gate and the cheap
        // path — a file with no Express in it does no work.
        if (!fileUsesExpress(context.sourceCode.ast)) return false;

        // Precondition 1 — see the header comment. No cookie, no session, no
        // CSRF: a cross-site request to this file's routes carries no authority.
        // The credential may be configured in the module that mounts this one.
        const ast = context.sourceCode.ast;
        if (
          !fileHasAmbientCredentials(ast) &&
          !fileInheritsAmbientCredentials(ast)
        )
          return false;
        jwtBindings = packageBindings(ast, ['express-jwt']);

        ({
          allowInTests = false,
          protectedMethods = DEFAULT_PROTECTED_METHODS,
          ignorePatterns = [],
        } = options as Options);

        const filename = context.filename;
        const isTestFile = allowInTests && isTestFilePath(filename);

        if (isTestFile) {
          return false;
        }

        hasGlobalCsrf = false;
        /**
         * Reports are deferred to `Program:exit` so that an `app.use(csrf())`
         * written *below* a route still suppresses it. Reporting inline made the
         * finding depend on statement order, which no adopter would guess.
         */
        candidates = [];
        /**
         * `app.use(requireAuth)` — a router-wide guard authenticates every route
         * below it, which is precisely the configuration where CSRF *does* apply.
         * A path-scoped mount (`app.use('/public', …)`) is not global; treating it
         * as one is the mistake require-route-authentication documents.
         */
        hasGlobalAuth = false;
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for global app.use(csrf()) or app.use(csrfMiddleware)
        if (
          callee.type === 'MemberExpression' &&
          propertyName(callee) === 'use'
        ) {
          for (const arg of flattenMiddleware(node.arguments)) {
            // app.use(csrf())
            if (
              arg.type === 'CallExpression' &&
              (isCsrfMiddleware(arg) || isCsrfFactoryCall(arg))
            ) {
              hasGlobalCsrf = true;
              return;
            }
            // app.use((req, res, next) => csrf(req, res, next))
            if (isDelegatingCsrfWrapper(arg)) {
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
        // `router['post']('/x', h)` registers the same unprotected route.
        // Resolved before the guard so the guard has a binding to test: the
        // chain below asks the same two questions the cast was asserting.
        const routeMethod = memberPropertyName(callee);
        if (callee.type === 'MemberExpression' && routeMethod !== null) {
          const method = routeMethod.toLowerCase();

          if (!protectedMethods.includes(method)) {
            return;
          }

          // `app.route(path).get(…).post(…)`: the path went to `.route(…)`,
          // so every argument of this verb call is middleware or handler.
          const chainRoot = routeChainRoot(callee);
          const registrar =
            chainRoot !== null && chainRoot.callee.type === 'MemberExpression'
              ? chainRoot.callee
              : callee;

          // Only flag if this looks like an Express app/router
          // This prevents FPs on non-Express objects like server.post(), customApi.post()
          if (!isLikelyExpressObject(registrar)) {
            return;
          }

          // Check if route should be ignored
          const routeArg =
            chainRoot !== null ? chainRoot.arguments[0] : node.arguments[0];
          if (routeArg && shouldIgnoreRoute(routeArg)) {
            return;
          }
          const rest =
            chainRoot !== null ? node.arguments : node.arguments.slice(1);
          // An array of middleware is flattened into the chain by Express.
          const chain = flattenMiddleware(rest.slice(0, -1));

          // Check if CSRF middleware is in the route's own chain
          if (
            hasCsrfInMiddlewareChain(chain) ||
            chain.some(isCsrfFactoryCall)
          ) {
            return;
          }

          // A guard mounted alone handles nothing: the request is handled by a
          // registration elsewhere, which is where this rule looks.
          if (isGuardOnlyRegistration(flattenMiddleware(rest))) {
            return;
          }

          // A bearer token is not attached by the browser on its own.
          if (
            routeUsesBearerCredentialOnly(
              chain,
              rest[rest.length - 1],
              jwtBindings,
            )
          ) {
            return;
          }

          candidates.push({
            node,
            method: method.toUpperCase(),
            chain,
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
          });
        }
      },
    };
  },
});

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-csrf-protection
 * Detects missing CSRF token validation in POST/PUT/DELETE requests
 * CWE-352: Cross-Site Request Forgery (CSRF)
 * 
 * @see https://cwe.mitre.org/data/definitions/352.html
 * @see https://owasp.org/www-community/attacks/csrf
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, isTestFilePath, propertyName } from '@interlace/eslint-devkit';
import { createRule, isModuleBinding } from '@interlace/eslint-devkit';
import { resolveInitializer } from '../../utils/resolve-binding';
import {
  asExpressRouteRegistration,
  isExpressAppOrRouter,
  type ExpressRouteRegistration,
} from '../../utils/express-app';

/**
 * Express `Route` verb methods. Every one of them returns `this`, which is the
 * entire reason `router.route(path)` exists:
 *
 * ```js
 * router.route('/invoices').get(listInvoices).post(createInvoice);
 * ```
 *
 * That is the idiom Express's own documentation leads with, and the receiver
 * of `.post` here is the `.get(…)` call rather than the `.route(…)` call. The
 * shared helper recognises `route` and `use` as router-returning and stops at
 * a verb, so the whole chained form registered no route at all — a POST
 * handler with no CSRF protection, silently.
 *
 * Composed around the shared helper rather than added to it: that helper is
 * used by other rules whose surface this must not widen.
 */
const ROUTE_VERBS: ReadonlySet<string> = new Set([
  'all',
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'head',
  'options',
]);

/** `<expressApp>.route(path).<verb>(…).<method>(…handlers)`. */
function asChainedRouteRegistration(
  node: TSESTree.CallExpression,
  scope: TSESLint.Scope.Scope,
  methods: ReadonlySet<string>,
): ExpressRouteRegistration | null {
  const callee = node.callee;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier'
  ) {
    return null;
  }
  const method = callee.property.name;
  if (!methods.has(method.toLowerCase())) return null;

  // Walk down the chain of verb calls to whatever sits at its root.
  let receiver: TSESTree.Node = callee.object;
  while (
    receiver.type === 'CallExpression' &&
    receiver.callee.type === 'MemberExpression' &&
    ROUTE_VERBS.has(propertyName(receiver.callee) as string)
  ) {
    receiver = receiver.callee.object;
  }

  // The root must be a `.route(path)` on a PROVEN Express app or router —
  // the chain alone proves nothing, and `promise.then().catch()` is a chain.
  if (
    receiver.type !== 'CallExpression' ||
    receiver.callee.type !== 'MemberExpression' ||
    receiver.callee.computed ||
    receiver.callee.property.type !== 'Identifier' ||
    receiver.callee.property.name !== 'route'
  ) {
    return null;
  }
  if (!isExpressAppOrRouter(receiver, scope)) return null;

  // The path was spent by `.route(…)`, so every argument here is a handler.
  return node.arguments.length > 0 ? { method, pathArg: null } : null;
}

type MessageIds = 'missingCsrfProtection' | 'addCsrfValidation';

export interface Options {
  /** Allow missing CSRF protection in test files. Default: false */
  allowInTests?: boolean;
  
  /** CSRF middleware patterns to recognize. Default: ['csrf', 'csurf', 'csrfProtection', 'verifyCsrfToken'] */
  csrfMiddlewarePatterns?: string[];
  
  /** HTTP methods that require CSRF protection. Default: ['post', 'put', 'delete', 'patch'] */
  protectedMethods?: string[];
  
  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Default CSRF middleware patterns
 */
const DEFAULT_CSRF_MIDDLEWARE_PATTERNS = [
  'csrf',
  'csurf',
  'csrfProtection',
  'verifyCsrfToken',
  'csrfToken',
  'validateCsrf',
  'checkCsrf',
  'csrfMiddleware',
];

/**
 * Default HTTP methods that require CSRF protection
 */
const DEFAULT_PROTECTED_METHODS = ['post', 'put', 'delete', 'patch'];

/**
 * Packages whose default export IS CSRF protection. Closed API surface.
 */
const CSRF_MODULES: readonly string[] = [
  'csurf',
  'csrf',
  'tiny-csrf',
  'edge-csrf',
  'csrf-csrf',
  '@dr.pogodin/csurf',
];

/** `lusca.csrf()` — the one CSRF middleware that lives behind a namespace. */
const CSRF_NAMESPACED: ReadonlyArray<readonly [string, string]> = [
  ['lusca', 'csrf'],
];

/**
 * Does this argument supply CSRF protection?
 *
 * The rule used to answer this with
 * `sourceCode.getText(arg).toLowerCase().includes(pattern)` over a word list,
 * i.e. by SPELLING, and it was measurably wrong in both directions at once:
 *
 * - A logger configured to REDACT the token header —
 *   `pino({ redact: ['req.headers["x-csrf-token"]'] })` — matched, and
 *   switched the rule off for every route in the file. Redaction is a privacy
 *   measure, not a defence.
 * - A middleware named `csrfMetrics` that only increments a counter matched,
 *   and suppressed a real finding on the route it sat in.
 * - The CORRECT remediation with the import renamed —
 *   `const guard = require('csurf'); app.post(p, guard(), h)` — did NOT match,
 *   so the rule reported the file that had applied its own fix.
 *
 * All three are the same defect. What makes something CSRF protection is the
 * MODULE it came from, which is knowable: `isModuleBinding` follows the
 * binding back through imports, `require`, renames and destructuring. The
 * configured name list remains as a second chance for a hand-rolled verifier,
 * but is now EXACT membership against a closed list rather than a substring
 * search — `csrfMetrics` is not `csrf`.
 */
function suppliesCsrfProtection(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  sourceCode: TSESLint.SourceCode,
  names: ReadonlySet<string>,
  depth = 0,
): boolean {
  if (depth > 3) return false;

  // `csurf()` / `guard()` / a bare `csurf` reference.
  const callee = node.type === 'CallExpression' ? node.callee : node;
  for (const pkg of CSRF_MODULES) {
    if (isModuleBinding(callee, scope, pkg, [])) return true;
  }
  for (const [pkg, member] of CSRF_NAMESPACED) {
    if (isModuleBinding(callee, scope, pkg, [member])) return true;
  }

  // Exact membership on the name actually mounted, or on the callee's name.
  if (callee.type === 'Identifier' && names.has(callee.name)) return true;

  // `const csrfProtection = csurf({ cookie: true })` — mounted by its binding.
  if (callee.type === 'Identifier') {
    const init = resolveInitializer(callee, sourceCode);
    if (init !== undefined) {
      return suppliesCsrfProtection(init, scope, sourceCode, names, depth + 1);
    }
  }

  return false;
}

/**
 * Check if a string matches any ignore pattern
 */
function matchesIgnorePattern(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  });
}

export const noMissingCsrfProtection = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-csrf-protection',
  meta: {
    type: 'problem',
    deprecated: true,
    replacedBy: ['@see eslint-plugin-express-security/require-csrf-protection'],
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-missing-csrf-protection.md',
      description: 'Detects missing CSRF token validation in POST/PUT/DELETE requests',
      cwe: 'CWE-352',
      cvss: 8.8,
    },
    hasSuggestions: true,
    messages: {
      missingCsrfProtection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing CSRF Protection',
        cwe: 'CWE-352',
        description: 'Missing CSRF protection detected: {{issue}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/352.html',
      }),
      addCsrfValidation: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add CSRF Validation',
        description: 'Add CSRF middleware',
        severity: 'LOW',
        fix: 'app.use(csrf({ cookie: true }))',
        documentationLink: 'https://github.com/expressjs/csurf',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing CSRF protection in test files',
          },
          csrfMiddlewarePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'CSRF middleware patterns to recognize',
          },
          protectedMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'HTTP methods that require CSRF protection',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional safe patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      csrfMiddlewarePatterns: [],
      protectedMethods: [],
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      csrfMiddlewarePatterns,
      protectedMethods: customProtectedMethods,
      ignorePatterns = [],
    } = options as Options;

    const csrfPatterns = csrfMiddlewarePatterns && csrfMiddlewarePatterns.length > 0
      ? csrfMiddlewarePatterns
      : DEFAULT_CSRF_MIDDLEWARE_PATTERNS;
    // Exact membership, never a substring test — see suppliesCsrfProtection.
    const csrfNames = new Set(csrfPatterns);

    const protectedMethods = customProtectedMethods && customProtectedMethods.length > 0
      ? customProtectedMethods
      : DEFAULT_PROTECTED_METHODS;

    // Pre-compute Set for O(1) lookups (performance optimization)
    const protectedMethodsSet = new Set(protectedMethods.map(m => m.toLowerCase()));

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);
    const sourceCode = context.sourceCode;

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      const callText = sourceCode.getText(node);

      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(callText, ignorePatterns)) {
        return;
      }

      // The receiver must be a PROVEN Express app or router. Matching the
      // method name alone made `axios.post('/api/orders', cart)` a CVSS 8.8
      // finding — an HTTP client call that cannot carry CSRF middleware and
      // is not a route at all.
      const scope = sourceCode.getScope(node);
      const registration =
        asExpressRouteRegistration(node, scope, protectedMethodsSet) ??
        asChainedRouteRegistration(node, scope, protectedMethodsSet);
      if (registration === null) {
        return;
      }
      const methodName = registration.method;
      const { pathArg } = registration;

      // Check if CSRF middleware is in the route chain arguments.
      // Skip the path argument, when this form has one, and check the rest.
      let hasCsrfInChain = false;
      for (let i = pathArg === null ? 0 : 1; i < node.arguments.length; i++) {
        const arg = node.arguments[i];
        // An array of middleware is a chain too — Express accepts both.
        const candidates =
          arg.type === 'ArrayExpression'
            ? arg.elements.filter((el): el is TSESTree.Expression => el !== null)
            : [arg];
        if (
          candidates.some((candidate) =>
            suppliesCsrfProtection(candidate, scope, sourceCode, csrfNames),
          )
        ) {
          hasCsrfInChain = true;
          break;
        }
      }

      if (!hasCsrfInChain && !hasGlobalCsrfMiddleware()) {
        context.report({
          node,
          messageId: 'missingCsrfProtection',
          data: {
            issue: `${methodName.toUpperCase()} route handler missing CSRF protection`,
            safeAlternative: `Add CSRF middleware: app.${methodName}("/path", csrf(), handler) or use app.use(csrf()) globally`,
          },
          suggest: [
            {
              messageId: 'addCsrfValidation',
              fix(fixer: TSESLint.RuleFixer) {
                // Middleware goes after the path, or first in the handler list
                // when the path was already spent by `.route(…)`.
                return pathArg === null
                  ? fixer.insertTextBefore(node.arguments[0], 'csrf(), ')
                  : fixer.insertTextAfter(pathArg, ', csrf()');
              },
            },
          ],
        });
      }
    }

    /**
     * Was CSRF middleware mounted for the whole app — `app.use(csrf())`?
     *
     * The rule's own remediation text has always offered this as the fix, and
     * the rule then reported every route in a file that took it. Computed once
     * per file, over the top-level statements where middleware is mounted.
     */
    let globalCsrf: boolean | undefined;
    function hasGlobalCsrfMiddleware(): boolean {
      if (globalCsrf !== undefined) return globalCsrf;
      globalCsrf = false;
      for (const statement of sourceCode.ast.body) {
        if (statement.type !== 'ExpressionStatement') continue;
        const call = statement.expression;
        if (
          call.type !== 'CallExpression' ||
          call.callee.type !== 'MemberExpression' ||
          call.callee.computed ||
          call.callee.property.type !== 'Identifier' ||
          call.callee.property.name !== 'use'
        ) {
          continue;
        }
        const mountScope = sourceCode.getScope(call);
        if (
          call.arguments.some((arg) =>
            suppliesCsrfProtection(arg, mountScope, sourceCode, csrfNames),
          )
        ) {
          globalCsrf = true;
          break;
        }
      }
      return globalCsrf;
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});


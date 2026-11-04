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
import {
  AST_NODE_TYPES,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
  propertyName,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import { flattenMiddleware, routeChainRoot } from '../../utils/route-shapes';

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
 * Check if a string matches any ignore pattern
 */
function matchesIgnorePattern(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
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
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    deprecated: true,
    replacedBy: ['@see eslint-plugin-express-security/require-csrf-protection'],
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-missing-csrf-protection.md',
      description:
        'Detects missing CSRF token validation in POST/PUT/DELETE requests',
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let allowInTests: boolean;
    let csrfMiddlewarePatterns: string[] | undefined;
    let customProtectedMethods: string[] | undefined;
    let ignorePatterns: string[];
    let csrfPatterns: string[];
    let protectedMethodsSet: Set<string>;
    let isTestFile: boolean;
    let sourceCode: Readonly<TSESLint.SourceCode>;

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      const callee = node.callee;
      const callText = sourceCode.getText(node);

      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(callText, ignorePatterns)) {
        return;
      }

      // Check for route handler methods (app.post, router.put, etc.)
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.property.type === AST_NODE_TYPES.Identifier
      ) {
        const methodName = callee.property.name;

        // Only check if it's a route handler that requires CSRF (O(1) Set lookup)
        if (protectedMethodsSet.has(methodName.toLowerCase())) {
          // In `app.route(path).get(…).post(…)` the path was spent by
          // `.route(…)`, so every argument of the verb call is a handler.
          const chained = routeChainRoot(callee) !== null;
          const pathArg = chained ? null : node.arguments[0];

          // Must have a handler (and, outside a route chain, a path)
          if (node.arguments.length < (chained ? 1 : 2)) {
            return;
          }

          // Check if any handler argument (an array of middleware counts
          // element by element) is a CSRF middleware
          const hasCsrfInChain = flattenMiddleware(
            node.arguments.slice(chained ? 0 : 1),
          ).some((arg) => {
            const argText = sourceCode.getText(arg).toLowerCase();
            return csrfPatterns.some((pattern) =>
              argText.includes(pattern.toLowerCase()),
            );
          });

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
                    // Middleware goes after the path, or first in the
                    // handler list when `.route(…)` already took the path.
                    return pathArg === null
                      ? fixer.insertTextBefore(node.arguments[0], 'csrf(), ')
                      : fixer.insertTextAfter(pathArg, ', csrf()');
                  },
                },
              ],
            });
          }
        }
      }
    }

    /**
     * Was CSRF middleware mounted for the whole app — `app.use(csrf())`?
     * The rule's own remediation offers this as the fix. Computed once per
     * file over the top-level statements, where middleware is mounted.
     */
    let globalCsrf: boolean | undefined;
    function hasGlobalCsrfMiddleware(): boolean {
      if (globalCsrf !== undefined) return globalCsrf;
      globalCsrf = sourceCode.ast.body.some((statement) => {
        if (statement.type !== AST_NODE_TYPES.ExpressionStatement) return false;
        const call = statement.expression;
        if (
          call.type !== AST_NODE_TYPES.CallExpression ||
          call.callee.type !== AST_NODE_TYPES.MemberExpression ||
          propertyName(call.callee) !== 'use'
        ) {
          return false;
        }
        return flattenMiddleware(call.arguments).some((arg) =>
          // A call, not a reference: `app.use(csrf())` mounts the check.
          arg.type === AST_NODE_TYPES.CallExpression ||
          arg.type === AST_NODE_TYPES.Identifier
            ? csrfPatterns.some((pattern) =>
                sourceCode
                  .getText(arg)
                  .toLowerCase()
                  .includes(pattern.toLowerCase()),
              )
            : false,
        );
      });
      return globalCsrf;
    }

    return {
      before() {
        globalCsrf = undefined;
        const [options] = currentOptions();
        // Every rule here is Express-specific, and none of them knew it: over
        // 107,382 files, 75% of this plugin's findings were in files with no
        // Express import. Registering no visitors is both the gate and the cheap
        // path — a file with no Express in it does no work.
        if (!fileUsesExpress(context.sourceCode.ast)) return false;

        ({
          allowInTests = false,
          csrfMiddlewarePatterns,
          protectedMethods: customProtectedMethods,
          ignorePatterns = [],
        } = options as Options);

        csrfPatterns =
          csrfMiddlewarePatterns && csrfMiddlewarePatterns.length > 0
            ? csrfMiddlewarePatterns
            : DEFAULT_CSRF_MIDDLEWARE_PATTERNS;

        const protectedMethods =
          customProtectedMethods && customProtectedMethods.length > 0
            ? customProtectedMethods
            : DEFAULT_PROTECTED_METHODS;

        // Pre-compute Set for O(1) lookups (performance optimization)
        protectedMethodsSet = new Set(
          protectedMethods.map((m) => m.toLowerCase()),
        );

        const filename = context.filename;
        isTestFile = allowInTests && isTestFilePath(filename);
        sourceCode = context.sourceCode;
        return true;
      },
      CallExpression: checkCallExpression,
    };
  },
});

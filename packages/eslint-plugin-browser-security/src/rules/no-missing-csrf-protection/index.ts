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
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { asExpressRouteRegistration } from '../../utils/express-app';

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
    
    const protectedMethods = customProtectedMethods && customProtectedMethods.length > 0
      ? customProtectedMethods
      : DEFAULT_PROTECTED_METHODS;

    // Pre-compute Set for O(1) lookups (performance optimization)
    const protectedMethodsSet = new Set(protectedMethods.map(m => m.toLowerCase()));

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
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
      const registration = asExpressRouteRegistration(
        node,
        sourceCode.getScope(node),
        protectedMethodsSet,
      );
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
        const argText = sourceCode.getText(arg);
        if (csrfPatterns.some(pattern => argText.toLowerCase().includes(pattern.toLowerCase()))) {
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
        const mounted = call.arguments
          .map((arg) => sourceCode.getText(arg).toLowerCase())
          .join(' ');
        if (csrfPatterns.some((pattern) => mounted.includes(pattern.toLowerCase()))) {
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


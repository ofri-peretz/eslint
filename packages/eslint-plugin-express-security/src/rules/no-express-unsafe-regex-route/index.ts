/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-express-unsafe-regex-route
 * Detects ReDoS-vulnerable regular expressions in Express.js route patterns
 * CWE-1333: Inefficient Regular Expression Complexity
 *
 * Vulnerable patterns can cause catastrophic backtracking,
 * leading to denial of service via CPU exhaustion.
 *
 * @see https://cwe.mitre.org/data/definitions/1333.html
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeRegexRoute' | 'unsafeParamPattern' | 'refactorRoute';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/**
 * HTTP method names used for routing
 */
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'];

/**
 * Patterns that indicate potential ReDoS vulnerability
 * These are simplified heuristics - a full ReDoS detector would be more complex
 */
const VULNERABLE_PATTERNS = [
  // Nested quantifiers: (a+)+, (a*)*
  /\([^)]*[+*][^)]*\)[+*]/,
  // Overlapping alternatives: (a|a)+
  /\([^)]*\|[^)]*\)[+*]/,
  // Repetition of repetition: a++, a**
  /[+*]{2,}/,
  // Greedy patterns with backreferences
  /\([^)]+\)[+*].*\\[1-9]/,
];

/**
 * Route parameter patterns that may cause issues
 */
const VULNERABLE_PARAM_PATTERNS = [
  // :param+ or :param* - can match multiple segments
  /:[a-zA-Z_][a-zA-Z0-9_]*\+/,
  /:[a-zA-Z_][a-zA-Z0-9_]*\*/,
];

/**
 * Check if a regex pattern is potentially vulnerable to ReDoS
 */
function isVulnerableRegex(pattern: string): boolean {
  return VULNERABLE_PATTERNS.some((regex) => regex.test(pattern));
}

/**
 * Check if a route string has vulnerable param patterns
 */
function hasVulnerableParamPattern(route: string): boolean {
  return VULNERABLE_PARAM_PATTERNS.some((regex) => regex.test(route));
}

export const noExpressUnsafeRegexRoute = createRule<RuleOptions, MessageIds>({
  name: 'no-express-unsafe-regex-route',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow ReDoS-vulnerable regular expressions in Express.js route patterns',
    },
    hasSuggestions: true,
    messages: {
      unsafeRegexRoute: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'ReDoS Vulnerable Route Pattern',
        cwe: 'CWE-1333',
        description:
          'Route uses a regular expression vulnerable to Regular Expression Denial of Service (ReDoS). Malicious input can cause catastrophic backtracking.',
        severity: 'HIGH',
        fix: 'Simplify the regex pattern. Avoid nested quantifiers like (a+)+ and overlapping alternatives. Consider using a string route with explicit parameters.',
        documentationLink:
          'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      unsafeParamPattern: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Route Parameter Pattern',
        cwe: 'CWE-1333',
        description:
          'Route parameter uses + or * quantifier which can match multiple path segments, potentially causing ReDoS or unexpected behavior.',
        severity: 'MEDIUM',
        fix: 'Use explicit path segments instead of :param+ or :param*. For example: /api/:id/details instead of /api/:path+',
        documentationLink: 'https://expressjs.com/en/guide/routing.html',
      }),
      refactorRoute: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Refactor Route',
        description: 'Refactor to use a simpler, non-vulnerable pattern',
        severity: 'LOW',
        fix: 'Use string routes with explicit path segments',
        documentationLink: 'https://expressjs.com/en/guide/routing.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: false }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for app.get(), router.post(), etc.
        /* c8 ignore next 2 */
        if (callee.type !== 'MemberExpression') {
          return;
        }

        const property = callee.property;
        /* c8 ignore next 2 */
        if (property.type !== 'Identifier') {
          return;
        }

        if (!HTTP_METHODS.includes(property.name)) {
          return;
        }

        // Check the route argument (first argument)
        const routeArg = node.arguments[0];
        /* c8 ignore next 2 */
        if (!routeArg) {
          return;
        }

        // Check regex literal routes (e.g., /pattern/)
        if (routeArg.type === 'Literal' && 'regex' in routeArg && routeArg.regex) {
          const regexNode = routeArg as TSESTree.RegExpLiteral;
          const pattern = regexNode.regex.pattern;
          if (isVulnerableRegex(pattern)) {
            context.report({
              node: routeArg,
              messageId: 'unsafeRegexRoute',
              suggest: [
                {
                  messageId: 'refactorRoute',
                  fix: () => null, // Manual fix required
                },
              ],
            });
          }
          return;
        }

        // Check new RegExp() routes
        if (
          routeArg.type === 'NewExpression' &&
          routeArg.callee.type === 'Identifier' &&
          routeArg.callee.name === 'RegExp'
        ) {
          const patternArg = routeArg.arguments[0];
          if (patternArg && patternArg.type === 'Literal' && typeof patternArg.value === 'string') {
            if (isVulnerableRegex(patternArg.value)) {
              context.report({
                node: routeArg,
                messageId: 'unsafeRegexRoute',
                suggest: [
                  {
                    messageId: 'refactorRoute',
                    fix: () => null,
                  },
                ],
              });
            }
          }
          return;
        }

        // Check string routes with vulnerable param patterns
        if (routeArg.type === 'Literal' && typeof routeArg.value === 'string') {
          if (hasVulnerableParamPattern(routeArg.value)) {
            context.report({
              node: routeArg,
              messageId: 'unsafeParamPattern',
              suggest: [
                {
                  messageId: 'refactorRoute',
                  fix: () => null,
                },
              ],
            });
          }
        }
      },
    };
  },
});

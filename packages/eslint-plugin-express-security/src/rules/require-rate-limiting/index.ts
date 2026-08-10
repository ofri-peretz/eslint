/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-rate-limiting
 * Detects Express.js applications missing rate limiting middleware
 * CWE-770: Allocation of Resources Without Limits or Throttling
 *
 * @see https://cwe.mitre.org/data/definitions/770.html
 * @see https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingRateLimiting' | 'addRateLimiting';

export interface Options {
  /** Allow missing rate limiting in test files. Default: false */
  allowInTests?: boolean;

  /** Alternative rate limiting middleware names. Default: [] */
  alternativeMiddleware?: string[];

  /**
   * Skip rule if rate limiting is provided elsewhere (e.g., AWS API Gateway, Cloudflare, nginx).
   * Default: false
   */
  assumeRateLimiting?: boolean;
}

type RuleOptions = [Options?];

const RATE_LIMIT_PACKAGES = [
  'ratelimit',
  'rateLimit',
  'rateLimiter',
  'limiter',
  'expressRateLimit',
  'slowDown',
  'expressBrute',
];

/**
 * Check if a node is a rate limiting middleware usage
 */
function isRateLimitMiddleware(
  node: TSESTree.CallExpression,
  alternatives: string[],
): boolean {
  const allPatterns = [...RATE_LIMIT_PACKAGES, ...alternatives];

  for (const arg of node.arguments) {
    // rateLimit() or limiter()
    if (arg.type === 'CallExpression' && arg.callee.type === 'Identifier') {
      const calleeName = arg.callee.name.toLowerCase();
      if (allPatterns.some((p) => calleeName.includes(p.toLowerCase()))) {
        return true;
      }
    }

    // rateLimit identifier without call
    if (arg.type === 'Identifier') {
      if (
        allPatterns.some((p) =>
          arg.name.toLowerCase().includes(p.toLowerCase()),
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export const requireRateLimiting = createRule<RuleOptions, MessageIds>({
  name: 'require-rate-limiting',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-rate-limiting.md',
      description:
        'Require rate limiting middleware in Express.js applications',
      cwe: 'CWE-770',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      missingRateLimiting: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Rate Limiting',
        cwe: 'CWE-770',
        description:
          'Express app created without rate limiting. Vulnerable to DDoS and brute-force attacks.',
        severity: 'HIGH',
        fix: 'Add rate limiting: npm install express-rate-limit; app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }))',
        documentationLink: 'https://www.npmjs.com/package/express-rate-limit',
      }),
      addRateLimiting: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Rate Limiting',
        description: 'Add rate limiting middleware to protect against abuse',
        severity: 'LOW',
        fix: "import rateLimit from 'express-rate-limit'; app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));",
        documentationLink: 'https://www.npmjs.com/package/express-rate-limit',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
          alternativeMiddleware: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Extra middleware names that count as rate limiting',
          },
          assumeRateLimiting: {
            type: 'boolean',
            default: false,
            description:
              'Skip if rate limiting is provided by infrastructure (API Gateway, nginx, etc.)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      alternativeMiddleware: [],
      assumeRateLimiting: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const {
      allowInTests = false,
      alternativeMiddleware = [],
      assumeRateLimiting = false,
    } = options as Options;

    // Skip entirely if rate limiting is assumed (provided by infrastructure)
    if (assumeRateLimiting) {
      return {};
    }

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    let hasExpressApp = false;
    let hasRateLimiting = false;
    let expressAppNode: TSESTree.CallExpression | null = null;
    /** The binding `express()` was assigned to, so we can see where it travels. */
    let appBinding: string | null = null;
    /**
     * The app was handed to another function, so the middleware stack is
     * assembled somewhere this rule cannot see — see the same guard in
     * require-helmet. Measured on ToniR7/express-typescript-starter, which
     * registers its rate limiter in `utils/appInitialization.ts` and was
     * reported anyway.
     */
    let appEscapes = false;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // `setAppConfigurations(app)` — the app leaves this file.
        if (appBinding !== null) {
          for (const arg of node.arguments) {
            if (arg.type === 'Identifier' && arg.name === appBinding) {
              appEscapes = true;
            }
          }
        }

        // Check for express() app creation
        if (callee.type === 'Identifier' && callee.name === 'express') {
          hasExpressApp = true;
          expressAppNode = node;
          if (
            node.parent?.type === 'VariableDeclarator' &&
            node.parent.id.type === 'Identifier'
          ) {
            appBinding = node.parent.id.name;
          }
          return;
        }

        // Check for app.use() with rate limiting
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'use'
        ) {
          if (isRateLimitMiddleware(node, alternativeMiddleware)) {
            hasRateLimiting = true;
          }
        }
      },

      'Program:exit'() {
        if (
          hasExpressApp &&
          !hasRateLimiting &&
          !appEscapes &&
          expressAppNode
        ) {
          context.report({
            node: expressAppNode,
            messageId: 'missingRateLimiting',
            suggest: [
              {
                messageId: 'addRateLimiting',
                fix: () => null,
              },
            ],
          });
        }
      },
    };
  },
});

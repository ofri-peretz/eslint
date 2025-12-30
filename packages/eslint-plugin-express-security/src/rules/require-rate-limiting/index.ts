/**
 * ESLint Rule: require-rate-limiting
 * Detects Express.js applications missing rate limiting middleware
 * CWE-770: Allocation of Resources Without Limits or Throttling
 *
 * @see https://cwe.mitre.org/data/definitions/770.html
 * @see https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
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
  alternatives: string[]
): boolean {
  const allPatterns = [...RATE_LIMIT_PACKAGES, ...alternatives];

  for (const arg of node.arguments) {
    // rateLimit() or limiter()
    if (arg.type === 'CallExpression' && arg.callee.type === 'Identifier') {
      if (allPatterns.some((p) => arg.callee.type === 'Identifier' && 
          arg.callee.name.toLowerCase().includes(p.toLowerCase()))) {
        return true;
      }
    }

    // rateLimit identifier without call
    if (arg.type === 'Identifier') {
      if (allPatterns.some((p) => 
          arg.name.toLowerCase().includes(p.toLowerCase()))) {
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
      description:
        'Require rate limiting middleware in Express.js applications',
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
        fix: "Add rate limiting: npm install express-rate-limit; app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }))",
        documentationLink:
          'https://www.npmjs.com/package/express-rate-limit',
      }),
      addRateLimiting: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Rate Limiting',
        description: 'Add rate limiting middleware to protect against abuse',
        severity: 'LOW',
        fix: "import rateLimit from 'express-rate-limit'; app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));",
        documentationLink:
          'https://www.npmjs.com/package/express-rate-limit',
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
          },
          assumeRateLimiting: {
            type: 'boolean',
            default: false,
            description: 'Skip if rate limiting is provided by infrastructure (API Gateway, nginx, etc.)',
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const { allowInTests = false, alternativeMiddleware = [], assumeRateLimiting = false } =
      options as Options;

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

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for express() app creation
        if (callee.type === 'Identifier' && callee.name === 'express') {
          hasExpressApp = true;
          expressAppNode = node;
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
        if (hasExpressApp && !hasRateLimiting && expressAppNode) {
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

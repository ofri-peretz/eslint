/**
 * ESLint Rule: no-timing-unsafe-compare
 * Detects === comparison of secrets, suggest crypto.timingSafeEqual()
 * CWE-208: Observable Timing Discrepancy
 *
 * @see https://cwe.mitre.org/data/definitions/208.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, createRule, AST_NODE_TYPES } from '@interlace/eslint-devkit';

type MessageIds =
  | 'timingUnsafeCompare'
  | 'useTimingSafeEqual';

export interface Options {
  /** Variable name patterns that indicate secrets. Default: ['token', 'secret', 'key', 'password', 'hash', 'signature', 'mac', 'hmac', 'digest', 'apiKey', 'api_key'] */
  secretPatterns?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_SECRET_PATTERNS = [
  // Common secret names (camelCase, snake_case, kebab-case)
  'token', 'secret', 'key', 'password', 'hash', 'signature',
  'mac', 'hmac', 'digest', 'apiKey', 'api_key', 'api-key',
  'auth', 'credential', 'bearer', 'jwt', 'csrf', 'nonce',
  // PII and sensitive data patterns
  'ssn', 'social_security', 'social-security',
  'pii', 'private_key', 'private-key', 'privateKey',
  'access_token', 'access-token', 'accessToken',
  'refresh_token', 'refresh-token', 'refreshToken',
  'session_id', 'session-id', 'sessionId',
  'auth_token', 'auth-token', 'authToken',
  'encryption_key', 'encryption-key', 'encryptionKey',
];

export const noTimingUnsafeCompare = createRule<RuleOptions, MessageIds>({
  name: 'no-timing-unsafe-compare',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow timing-unsafe comparison of secrets',
    },
    hasSuggestions: true,
    messages: {
      timingUnsafeCompare: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Timing-unsafe comparison',
        cwe: 'CWE-208',
        description: 'Using === to compare secrets enables timing attacks. The comparison short-circuits on first mismatch, leaking information about the secret.',
        severity: 'HIGH',
        fix: 'Use crypto.timingSafeEqual() for constant-time comparison',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
      }),
      useTimingSafeEqual: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use timingSafeEqual',
        description: 'Use constant-time comparison to prevent timing attacks',
        severity: 'LOW',
        fix: 'crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          secretPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SECRET_PATTERNS,
            description: 'Variable name patterns that indicate secrets',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      secretPatterns: DEFAULT_SECRET_PATTERNS,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const { secretPatterns = DEFAULT_SECRET_PATTERNS } = options as Options;
    const patterns = secretPatterns.map(p => new RegExp(p, 'i'));

    function isSecretIdentifier(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return patterns.some(p => p.test(node.name));
      }
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        const prop = node.property;
        if (prop.type === AST_NODE_TYPES.Identifier) {
          return patterns.some(p => p.test(prop.name));
        }
      }
      return false;
    }

    function checkBinaryExpression(node: TSESTree.BinaryExpression) {
      // Check for === or == comparisons
      if (node.operator !== '===' && node.operator !== '==' && 
          node.operator !== '!==' && node.operator !== '!=') {
        return;
      }

      // Check if either side looks like a secret
      const leftIsSecret = isSecretIdentifier(node.left);
      const rightIsSecret = isSecretIdentifier(node.right);

      if (leftIsSecret || rightIsSecret) {
        /* c8 ignore next 11 -- suggestions with fix: () => null cannot be tested with RuleTester */
        context.report({
          node,
          messageId: 'timingUnsafeCompare',
          suggest: [
            {
              messageId: 'useTimingSafeEqual',
              fix: () => null, // Complex refactoring
            },
          ],
        });
      }
    }

    return {
      BinaryExpression: checkBinaryExpression,
    };
  },
});

export type { Options as NoTimingUnsafeCompareOptions };

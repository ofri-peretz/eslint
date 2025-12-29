/**
 * ESLint Rule: require-algorithm-whitelist
 *
 * Enforces explicit algorithm specification in JWT verify operations.
 * Without explicit algorithms, the token's header algorithm is trusted,
 * enabling algorithm substitution attacks.
 *
 * CWE-757: Selection of Less-Secure Algorithm During Negotiation
 *
 * @see https://tools.ietf.org/html/rfc8725
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  isVerifyOperation,
  getOptionsArgument,
  hasOption,
} from '../../utils';
import type { RequireAlgorithmWhitelistOptions } from '../../types';

type MessageIds =
  | 'missingAlgorithmWhitelist'
  | 'addAlgorithmWhitelist';

type RuleOptions = [RequireAlgorithmWhitelistOptions?];

export const requireAlgorithmWhitelist = createRule<RuleOptions, MessageIds>({
  name: 'require-algorithm-whitelist',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require explicit algorithm specification in JWT verify operations',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      missingAlgorithmWhitelist: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Algorithm Whitelist',
        cwe: 'CWE-757',
        description:
          'JWT verification without explicit algorithms trusts the token header',
        severity: 'HIGH',
        fix: 'Add algorithms: ["RS256"] or algorithms: ["ES256"] to options',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      addAlgorithmWhitelist: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Algorithm Whitelist',
        description: 'Specify allowed algorithms explicitly',
        severity: 'LOW',
        fix: 'jwt.verify(token, key, { algorithms: ["RS256"] })',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          recommendedAlgorithms: {
            type: 'array',
            items: { type: 'string' },
            default: ['RS256', 'ES256'],
            description: 'Algorithms to suggest in auto-fix',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strictMode: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      recommendedAlgorithms: ['RS256', 'ES256'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Only check verify operations
        if (!isVerifyOperation(node)) {
          return;
        }

        // Need at least token and key arguments
        if (node.arguments.length < 2) {
          return;
        }

        const optionsArg = getOptionsArgument(node, 2);

        // No options at all - definitely missing algorithms
        if (!optionsArg) {
          context.report({
            node,
            messageId: 'missingAlgorithmWhitelist',
          });
          return;
        }

        // Options exist but no algorithms property
        const hasAlgorithms =
          hasOption(optionsArg, 'algorithms') ||
          hasOption(optionsArg, 'algorithm') ||
          hasOption(optionsArg, 'alg');

        if (!hasAlgorithms) {
          context.report({
            node: optionsArg,
            messageId: 'missingAlgorithmWhitelist',
          });
        }
      },
    };
  },
});

export default requireAlgorithmWhitelist;

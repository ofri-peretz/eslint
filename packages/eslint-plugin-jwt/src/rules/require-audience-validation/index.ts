/**
 * ESLint Rule: require-audience-validation
 *
 * Mandates audience (aud) claim validation in JWT verify operations.
 * Without audience validation, tokens intended for other services are accepted.
 *
 * CWE-287: Improper Authentication
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isVerifyOperation, getOptionsArgument, hasOption } from '../../utils';
import type { RequireAudienceValidationOptions } from '../../types';

type MessageIds = 'missingAudienceValidation';

type RuleOptions = [RequireAudienceValidationOptions?];

export const requireAudienceValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-audience-validation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require audience (aud) claim validation in JWT verify operations',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      missingAudienceValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Audience Validation',
        cwe: 'CWE-287',
        description:
          'JWT verification without audience validation accepts tokens intended for other services',
        severity: 'MEDIUM',
        fix: 'Add audience option: { audience: "https://api.example.com" }',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          knownAudiences: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Known valid audiences to suggest',
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
      knownAudiences: [],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isVerifyOperation(node)) {
          return;
        }

        if (node.arguments.length < 2) {
          return;
        }

        const optionsArg = getOptionsArgument(node, 2);

        // No options at all
        if (!optionsArg) {
          context.report({
            node,
            messageId: 'missingAudienceValidation',
          });
          return;
        }

        // Check for audience option
        if (!hasOption(optionsArg, 'audience') && !hasOption(optionsArg, 'aud')) {
          context.report({
            node: optionsArg,
            messageId: 'missingAudienceValidation',
          });
        }
      },
    };
  },
});

export default requireAudienceValidation;

/**
 * ESLint Rule: no-timestamp-manipulation
 *
 * Detects patterns that disable automatic timestamp (iat) generation.
 * This enables the "Back to the Future" replay attack (LightSEC 2025).
 *
 * CWE-294: Authentication Bypass by Capture-replay
 *
 * @see https://securitypattern.com/post/jwt-back-to-the-future
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isSignOperation, getOptionsArgument, hasOption, getOptionValue } from '../../utils';
import type { JwtRuleOptions } from '../../types';

type MessageIds = 'timestampDisabled' | 'noTimestampTrue';

type RuleOptions = [JwtRuleOptions?];

export const noTimestampManipulation = createRule<RuleOptions, MessageIds>({
  name: 'no-timestamp-manipulation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prevent disabling automatic timestamp generation which enables replay attacks',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      timestampDisabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Timestamp Generation Disabled',
        cwe: 'CWE-294',
        description:
          'noTimestamp:true disables iat claim, enabling replay attacks',
        severity: 'HIGH',
        fix: 'Remove noTimestamp option or set to false',
        documentationLink: 'https://securitypattern.com/post/jwt-back-to-the-future',
      }),
      noTimestampTrue: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Back to the Future Attack Vector',
        cwe: 'CWE-294',
        description:
          'Disabling timestamps allows attackers to forge tokens valid in the future',
        severity: 'HIGH',
        fix: 'Always include iat claim for freshness validation',
        documentationLink: 'https://securitypattern.com/post/jwt-back-to-the-future',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
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
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isSignOperation(node)) {
          return;
        }

        const optionsArg = getOptionsArgument(node, 2);
        if (!optionsArg) {
          return;
        }

        // Check for noTimestamp: true
        if (hasOption(optionsArg, 'noTimestamp')) {
          const value = getOptionValue(optionsArg, 'noTimestamp');
          if (value?.type === 'Literal' && value.value === true) {
            context.report({
              node: value,
              messageId: 'noTimestampTrue',
            });
          }
        }
      },
    };
  },
});

export default noTimestampManipulation;

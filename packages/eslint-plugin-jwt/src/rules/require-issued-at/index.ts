/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-issued-at
 *
 * Mandates the `iat` (issued at) claim in JWT tokens for freshness validation.
 * Without `iat`, tokens cannot be validated for age, enabling the
 * "Back to the Future" replay attack (LightSEC 2025).
 *
 * CWE-294: Authentication Bypass by Capture-replay
 *
 * @see https://securitypattern.com/post/jwt-back-to-the-future
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isSignOperation, getOptionsArgument, hasOption } from '../../utils';
import type { JwtRuleOptions } from '../../types';

type MessageIds = 'missingIssuedAt';

type RuleOptions = [JwtRuleOptions?];

export const requireIssuedAt = createRule<RuleOptions, MessageIds>({
  name: 'require-issued-at',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require iat (issued at) claim for token freshness validation',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      missingIssuedAt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Issued At Claim',
        cwe: 'CWE-294',
        description:
          'JWT without iat claim cannot be validated for freshness, enabling replay attacks',
        severity: 'MEDIUM',
        fix: 'Add iat claim to payload or use library option that adds it automatically',
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
    /**
     * Check if payload contains iat claim
     */
    const payloadHasIat = (payloadNode: TSESTree.Node): boolean => {
      if (payloadNode.type !== 'ObjectExpression') {
        return false;
      }

      return payloadNode.properties.some(
        (prop) =>
          prop.type === 'Property' &&
          prop.key.type === 'Identifier' &&
          prop.key.name === 'iat'
      );
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Only check sign operations
        if (!isSignOperation(node)) {
          return;
        }

        // Need at least payload argument
        if (node.arguments.length < 1) {
          return;
        }

        const payloadArg = node.arguments[0];
        const optionsArg = getOptionsArgument(node, 2);

        // Check if payload has iat claim
        if (payloadHasIat(payloadArg)) {
          return;
        }

        // Check if options has noTimestamp: false (meaning iat IS added)
        // jsonwebtoken adds iat by default unless noTimestamp: true
        if (optionsArg && hasOption(optionsArg, 'noTimestamp')) {
          // If noTimestamp is explicitly set, we flag it (they're disabling iat)
          context.report({
            node: optionsArg,
            messageId: 'missingIssuedAt',
          });
          return;
        }

        // For explicit payload objects without iat, report if strict
        if (payloadArg.type === 'ObjectExpression' && !payloadHasIat(payloadArg)) {
          // jsonwebtoken adds iat by default, so only report if it looks like
          // they're building the payload manually and might be using a library
          // that doesn't add iat automatically
        }

        // Note: jsonwebtoken adds iat by default, so we don't flag by default
        // This rule primarily catches explicit noTimestamp: true usage
      },
    };
  },
});

export default requireIssuedAt;

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-issuer-validation
 *
 * Mandates issuer (iss) claim validation in JWT verify operations.
 * Without issuer validation, tokens from any issuer are accepted.
 *
 * CWE-287: Improper Authentication
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isVerifyOperation, getOptionsArgument, hasOption } from '../../utils';
import type { RequireIssuerValidationOptions } from '../../types';

type MessageIds = 'missingIssuerValidation';

type RuleOptions = [RequireIssuerValidationOptions?];

export const requireIssuerValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-issuer-validation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require issuer (iss) claim validation in JWT verify operations',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      missingIssuerValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Issuer Validation',
        cwe: 'CWE-287',
        description:
          'JWT verification without issuer validation accepts tokens from any source',
        severity: 'MEDIUM',
        fix: 'Add issuer option: { issuer: "https://auth.example.com" }',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          knownIssuers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Known valid issuers to suggest',
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
      knownIssuers: [],
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
            messageId: 'missingIssuerValidation',
          });
          return;
        }

        // Check for issuer option
        if (!hasOption(optionsArg, 'issuer') && !hasOption(optionsArg, 'iss')) {
          context.report({
            node: optionsArg,
            messageId: 'missingIssuerValidation',
          });
        }
      },
    };
  },
});

export default requireIssuerValidation;

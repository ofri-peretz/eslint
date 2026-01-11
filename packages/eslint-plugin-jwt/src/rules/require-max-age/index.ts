/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-max-age
 *
 * Mandates maxAge option in JWT verify operations to enforce token freshness.
 * This prevents the "Back to the Future" replay attack where tokens are
 * captured and replayed months or years later.
 *
 * CWE-294: Authentication Bypass by Capture-replay
 *
 * @see https://securitypattern.com/post/jwt-back-to-the-future
 * @see LightSEC 2025 - "JWT Back to the future: On the (ab)use of JWTs"
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isVerifyOperation, getOptionsArgument, hasOption } from '../../utils';
import type { JwtRuleOptions } from '../../types';

type MessageIds = 'missingMaxAge';

type RuleOptions = [JwtRuleOptions?];

export const requireMaxAge = createRule<RuleOptions, MessageIds>({
  name: 'require-max-age',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require maxAge option in verify operations to enforce token freshness',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      missingMaxAge: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Token Age Validation',
        cwe: 'CWE-294',
        description:
          'Without maxAge, tokens can be replayed long after issuance (Back to the Future attack)',
        severity: 'MEDIUM',
        fix: 'Add maxAge option: { maxAge: "1h" } to limit token lifetime',
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
            messageId: 'missingMaxAge',
          });
          return;
        }

        // Check for maxAge option
        if (!hasOption(optionsArg, 'maxAge') && !hasOption(optionsArg, 'clockTolerance')) {
          context.report({
            node: optionsArg,
            messageId: 'missingMaxAge',
          });
        }
      },
    };
  },
});

export default requireMaxAge;

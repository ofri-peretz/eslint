/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-expiration
 *
 * Mandates expiration claim (exp) or expiresIn option in JWT sign operations.
 * Tokens without expiration are valid forever, creating security risks.
 *
 * CWE-613: Insufficient Session Expiration
 *
 * @see https://tools.ietf.org/html/rfc8725
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  isSignOperation,
  getOptionsArgument,
  hasOption,
} from '../../utils';
import type { RequireExpirationOptions } from '../../types';

type MessageIds =
  | 'missingExpiration'
  | 'addExpiration';

type RuleOptions = [RequireExpirationOptions?];

export const requireExpiration = createRule<RuleOptions, MessageIds>({
  name: 'require-expiration',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require expiration claim (exp) or expiresIn option in JWT signing',
    },
    fixable: undefined,
    hasSuggestions: false,
    messages: {
      missingExpiration: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing JWT Expiration',
        cwe: 'CWE-613',
        description:
          'JWT without expiration is valid forever, increasing exposure window',
        severity: 'MEDIUM',
        fix: 'Add expiresIn: "1h" or exp claim to payload',
        documentationLink: 'https://tools.ietf.org/html/rfc8725',
      }),
      addExpiration: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Expiration',
        description: 'Add expiration to limit token lifetime',
        severity: 'LOW',
        fix: 'jwt.sign(payload, secret, { expiresIn: "1h" })',
        documentationLink: 'https://www.npmjs.com/package/jsonwebtoken',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxExpirationSeconds: {
            type: 'integer',
            default: 86400,
            description: 'Maximum allowed expiration time in seconds (24h default)',
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
      maxExpirationSeconds: 86400,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * Check if payload contains exp claim
     */
    const payloadHasExp = (payloadNode: TSESTree.Node): boolean => {
      if (payloadNode.type !== 'ObjectExpression') {
        return false;
      }

      return payloadNode.properties.some(
        (prop) =>
          prop.type === 'Property' &&
          prop.key.type === 'Identifier' &&
          prop.key.name === 'exp'
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

        // Check if payload has exp claim
        if (payloadHasExp(payloadArg)) {
          return;
        }

        // Check if options has expiresIn
        if (optionsArg && hasOption(optionsArg, 'expiresIn')) {
          return;
        }

        // Report missing expiration
        context.report({
          node,
          messageId: 'missingExpiration',
        });
      },
    };
  },
});

export default requireExpiration;

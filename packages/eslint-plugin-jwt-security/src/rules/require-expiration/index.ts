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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { isSignOperation, getOptionsArgument, hasOption } from '../../utils';
import type { RequireExpirationOptions } from '../../types';

type MessageIds = 'missingExpiration' | 'addExpiration';

type RuleOptions = [RequireExpirationOptions?];

export const requireExpiration = createRule<RuleOptions, MessageIds>({
  name: 'require-expiration',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-jwt-security/docs/rules/require-expiration.md',
      description:
        'Require expiration claim (exp) or expiresIn option in JWT signing',
      cwe: 'CWE-613',
      cvss: 5.4,
    },
    hasSuggestions: true,
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
            description:
              'Maximum allowed expiration time in seconds (24h default)',
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
      // `jwt.sign(payload, secret)` where the payload was built a few lines
      // up is the ordinary way to write this — twilio's ClientCapability does
      // exactly that, setting `exp: Math.floor(Date.now()/1000) + this.ttl`
      // before signing. Looking only at an inline object literal reported a
      // token whose expiration was right there, spelled the other legal way.
      const resolved =
        payloadNode.type === 'Identifier'
          ? resolveObjectLiteral(payloadNode)
          : payloadNode;

      if (resolved === null || resolved.type !== 'ObjectExpression') {
        return false;
      }

      return resolved.properties.some(
        (prop) =>
          prop.type === 'Property' &&
          !prop.computed &&
          ((prop.key.type === 'Identifier' && prop.key.name === 'exp') ||
            (prop.key.type === 'Literal' && prop.key.value === 'exp')),
      );
    };

    /** Follow an identifier to the object literal it was initialised with. */
    const resolveObjectLiteral = (
      node: TSESTree.Identifier,
    ): TSESTree.Node | null => {
      let variable: TSESLint.Scope.Variable | null = null;
      let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node);
      while (scope !== null && variable === null) {
        variable =
          scope.variables.find((candidate) => candidate.name === node.name) ??
          null;
        scope = scope.upper;
      }
      // One declaration only: a re-declared or shadowed binding is not worth
      // reasoning about, and an unresolved one stays a finding.
      if (variable === null || variable.defs.length !== 1) {
        return null;
      }
      const definition = variable.defs[0]!;
      return definition.type === 'Variable'
        ? (definition.node.init ?? null)
        : null;
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

        // Report missing expiration — suggest adding expiresIn to the options object
        const optionsArg3 = node.arguments[2];
        context.report({
          node,
          messageId: 'missingExpiration',
          suggest: [
            {
              messageId: 'addExpiration',
              fix(fixer) {
                const sourceCode = context.sourceCode;
                if (
                  optionsArg3 &&
                  optionsArg3.type === AST_NODE_TYPES.ObjectExpression
                ) {
                  // Options object exists but lacks expiresIn — insert property
                  const openBrace = sourceCode.getFirstToken(optionsArg3)!;
                  return fixer.insertTextAfter(openBrace, " expiresIn: '1h',");
                }
                // No options arg — insert { expiresIn: '1h' } as third argument
                const lastArg = node.arguments[node.arguments.length - 1];
                return fixer.insertTextAfter(lastArg, ", { expiresIn: '1h' }");
              },
            },
          ],
        });
      },
    };
  },
});

export default requireExpiration;

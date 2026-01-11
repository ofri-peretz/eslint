/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-postmessage-wildcard-origin
 * Detects postMessage calls with wildcard (*) targetOrigin
 * CWE-346: Origin Validation Error
 *
 * @see https://cwe.mitre.org/data/definitions/346.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'wildcardOrigin' | 'specifyOrigin';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noPostmessageWildcardOrigin = createRule<RuleOptions, MessageIds>({
  name: 'no-postmessage-wildcard-origin',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow using wildcard (*) as targetOrigin in postMessage calls',
    },
    hasSuggestions: true,
    messages: {
      wildcardOrigin: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Wildcard postMessage Origin',
        cwe: 'CWE-346',
        owasp: 'A01:2021',
        cvss: 7.5,
        description:
          'postMessage with "*" targetOrigin allows any window to receive the message, potentially leaking sensitive data to malicious sites.',
        severity: 'HIGH',
        fix: 'Specify the exact origin of the target window instead of "*".',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns',
      }),
      specifyOrigin: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Specify Target Origin',
        description: 'Replace wildcard with specific origin',
        severity: 'LOW',
        fix: "Use the exact target origin, e.g., 'https://trusted-domain.com'",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for .postMessage() calls
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }

        const property = node.callee.property;
        if (
          property.type !== AST_NODE_TYPES.Identifier ||
          property.name !== 'postMessage'
        ) {
          return;
        }

        // postMessage takes (message, targetOrigin, [transfer])
        // or (message, options) where options.targetOrigin can be specified
        const args = node.arguments;

        if (args.length < 2) {
          return;
        }

        const targetOriginArg = args[1];

        // Check for literal "*" as second argument
        if (
          targetOriginArg.type === AST_NODE_TYPES.Literal &&
          targetOriginArg.value === '*'
        ) {
          context.report({
            node: targetOriginArg,
            messageId: 'wildcardOrigin',
            suggest: [
              {
                messageId: 'specifyOrigin',
                fix: (fixer) =>
                  fixer.replaceText(
                    targetOriginArg,
                    "'https://your-domain.com'",
                  ),
              },
            ],
          });
          return;
        }

        // Check for options object with targetOrigin: "*"
        if (targetOriginArg.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of targetOriginArg.properties) {
            if (prop.type !== AST_NODE_TYPES.Property) continue;

            const key = prop.key;
            if (
              key.type === AST_NODE_TYPES.Identifier &&
              key.name === 'targetOrigin' &&
              prop.value.type === AST_NODE_TYPES.Literal &&
              prop.value.value === '*'
            ) {
              context.report({
                node: prop.value,
                messageId: 'wildcardOrigin',
                suggest: [
                  {
                    messageId: 'specifyOrigin',
                    fix: (fixer) =>
                      fixer.replaceText(
                        prop.value,
                        "'https://your-domain.com'",
                      ),
                  },
                ],
              });
            }
          }
        }
      },
    };
  },
});

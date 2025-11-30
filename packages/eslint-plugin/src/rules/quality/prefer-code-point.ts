/**
 * ESLint Rule: prefer-code-point
 * Prefer codePointAt over charCodeAt for proper Unicode handling
 */
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'preferCodePoint';

type RuleOptions = [];

export const preferCodePoint = createRule<RuleOptions, MessageIds>({
  name: 'prefer-code-point',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer codePointAt over charCodeAt for proper Unicode character handling',
    },
    messages: {
      preferCodePoint: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Prefer codePointAt',
        description: 'Use codePointAt instead of charCodeAt for Unicode safety',
        severity: 'MEDIUM',
        fix: 'Replace charCodeAt() with codePointAt()',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-code-point.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],

  create(context) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function isInAllowedContext(node: TSESTree.CallExpression): boolean {
       
      // For simplicity, we'll skip the allow option for now
      // This would require more complex logic to check comments/code context
      return false;
    }

    function shouldIgnoreCall(node: TSESTree.CallExpression): boolean {
      // The unicorn rule flags ALL charCodeAt calls, but allows some contexts

      if (node.callee.type === 'MemberExpression') {
        // Allow optional chaining
        if (node.callee.optional) {
          return true;
        }

        // Allow computed property access where the property is a variable (not literal)
        // This means obj[method] is ignored, but obj['charCodeAt'] is still flagged
        if (node.callee.computed && node.callee.property.type === 'Identifier') {
          return true;
        }
      }

      return false;
    }

    function isCharCodeAtCall(node: TSESTree.CallExpression): boolean {
      // Check if this is a call to charCodeAt method
      if (node.callee.type === 'MemberExpression') {
        // Direct property access: obj.charCodeAt
        if (node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'charCodeAt') {
          return true;
        }

        // Computed property access: obj['charCodeAt']
        if (node.callee.computed &&
            node.callee.property.type === 'Literal' &&
            node.callee.property.value === 'charCodeAt') {
          return true;
        }
      }

      return false;
    }

    return {
      CallExpression(node) {
        if (isCharCodeAtCall(node) && !isInAllowedContext(node) && !shouldIgnoreCall(node)) {
          context.report({
            node,
            messageId: 'preferCodePoint',
            data: {
              current: 'charCodeAt()',
              fix: 'codePointAt()',
            },
          });
        }
      },
    };
  },
});

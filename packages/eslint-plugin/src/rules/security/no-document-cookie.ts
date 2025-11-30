/**
 * ESLint Rule: no-document-cookie
 * Prevent direct usage of document.cookie
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noDocumentCookie';

export interface Options {
  /** Allow reading document.cookie for parsing */
  allowReading?: boolean;
}

type RuleOptions = [Options?];

export const noDocumentCookie = createRule<RuleOptions, MessageIds>({
  name: 'no-document-cookie',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent direct usage of document.cookie - use Cookie Store API or cookie libraries instead',
    },
    hasSuggestions: false,
    messages: {
      noDocumentCookie: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Document Cookie',
        description: 'Avoid direct document.cookie usage',
        severity: 'MEDIUM',
        fix: 'Use Cookie Store API or cookie library instead',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-document-cookie.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowReading: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowReading: true }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { allowReading = true } = options || {};

    function isDocumentCookieAccess(node: TSESTree.MemberExpression): boolean {
      // Check if this is accessing document.cookie
      return (
        node.object.type === 'Identifier' &&
        node.object.name === 'document' &&
        ((node.property.type === 'Identifier' && node.property.name === 'cookie') ||
         (node.computed && node.property.type === 'Literal' && node.property.value === 'cookie'))
      );
    }

    function isAssignmentToCookie(node: TSESTree.MemberExpression): boolean {
      // Check if this is an assignment to document.cookie
      const parent = node.parent;

      // Check direct assignment
      if (parent?.type === 'AssignmentExpression' && parent.left === node) {
        return true;
      }

      // Check compound assignment (+=, -=, etc.)
      if (parent?.type === 'AssignmentExpression' &&
          parent.operator &&
          parent.operator.includes('=') &&
          parent.left === node) {
        return true;
      }

      // Variable declarator (const/let/var x = document.cookie) - this is reading, not assigning
      if (parent?.type === 'VariableDeclarator' && parent.init === node) {
        return false;
      }

      return false;
    }

    return {
      MemberExpression(node: TSESTree.MemberExpression) {
        if (isDocumentCookieAccess(node)) {
          const isAssigning = isAssignmentToCookie(node);

          // If allowReading is true, only flag assignments
          // If allowReading is false, flag everything
          if (allowReading && !isAssigning) {
            return; // Allow reading when option is enabled
          }

          // Flag document.cookie usage
          context.report({
            node,
            messageId: 'noDocumentCookie',
            data: {
              operation: isAssigning ? 'assignment to' : 'reading from',
            },
          });
        }
      },
    };
  },
});

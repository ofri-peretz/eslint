/**
 * ESLint Rule: no-process-exit
 * Prevent usage of process.exit()
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noProcessExit';

export interface Options {
  /** Allow process.exit in specific contexts */
  allow?: string[];
}

type RuleOptions = [Options?];

export const noProcessExit = createRule<RuleOptions, MessageIds>({
  name: 'no-process-exit',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent usage of process.exit() which can terminate the process unexpectedly',
    },
    hasSuggestions: false,
    messages: {
      noProcessExit: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Process Exit',
        description: 'Avoid using process.exit()',
        severity: 'HIGH',
        fix: 'Use throw error or return exit code instead',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-process-exit.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allow: [] }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function isInAllowedContext(): boolean {
      // For simplicity, we'll skip the allow option for now
      return false;
    }

    function isProcessExitCall(node: TSESTree.CallExpression): boolean {
      // Check if this is a call to process.exit
      function isProcessExitMember(callee: TSESTree.Expression): boolean {
        if (callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'process' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'exit') {
          return true;
        }
        return false;
      }

      return isProcessExitMember(node.callee);
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isProcessExitCall(node) && !isInAllowedContext()) {
          context.report({
            node,
            messageId: 'noProcessExit',
            data: {
              current: 'process.exit()',
              fix: 'throw error or return',
            },
          });
        }
      },
    };
  },
});

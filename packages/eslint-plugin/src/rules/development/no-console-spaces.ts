/**
 * ESLint Rule: no-console-spaces
 * Prevent leading/trailing space between console.log parameters
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noConsoleSpaces';

type RuleOptions = [];

export const noConsoleSpaces = createRule<RuleOptions, MessageIds>({
  name: 'no-console-spaces',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent leading/trailing space between console.log parameters',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      noConsoleSpaces: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Console Spaces',
        description: 'Remove leading/trailing spaces in console method parameters',
        severity: 'MEDIUM',
        fix: 'Remove spaces from console method arguments',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-console-spaces.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Console methods that join parameters with spaces
    const consoleMethods = new Set([
      'log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'group', 'groupCollapsed'
    ]);

    function isInAllowedContext(): boolean {
      // For simplicity, we'll skip the allow option for now
      return false;
    }

    function isConsoleMethodCall(node: TSESTree.CallExpression): boolean {
      // Check if this is a call to a console method
      if (node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'console' &&
          node.callee.property.type === 'Identifier' &&
          consoleMethods.has(node.callee.property.name)) {
        return true;
      }

      return false;
    }

    function getConsoleMethodName(node: TSESTree.CallExpression): string {
      // Safe extraction of console method name
      if (node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier') {
        return node.callee.property.name;
      }
      return 'console';
    }

    function hasLeadingOrTrailingSpaces(text: string): boolean {
      // Check if string starts or ends with whitespace, but not if it's only whitespace
      // Only flag if there's actual content with leading/trailing spaces
      const trimmed = text.trim();
      return trimmed.length > 0 && /^\s|\s$/.test(text);
    }

    function hasLeadingOrTrailingSpacesInTemplate(text: string): boolean {
      // For template literals, even whitespace-only quasis should be flagged
      return /^\s|\s$/.test(text);
    }


    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isConsoleMethodCall(node) && !isInAllowedContext()) {
          // Check each argument for leading/trailing spaces
          for (const arg of node.arguments) {
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
              if (hasLeadingOrTrailingSpaces(arg.value)) {
                context.report({
                  node: arg,
                  messageId: 'noConsoleSpaces',
                  data: {
                    method: getConsoleMethodName(node),
                    arg: arg.value,
                  },
                  fix(fixer: TSESLint.RuleFixer) {
                    const trimmed = arg.value.trim();
                    return fixer.replaceText(arg, `'${trimmed}'`);
                  },
                });
              }
            } else if (arg.type === 'TemplateLiteral') {
              // Check template literal quasi values for leading/trailing spaces
              let hasSpacesInTemplate = false;
              for (const quasi of arg.quasis) {
                if (hasLeadingOrTrailingSpacesInTemplate(quasi.value.raw)) {
                  hasSpacesInTemplate = true;
                  break;
                }
              }

              if (hasSpacesInTemplate) {
                context.report({
                  node: arg,
                  messageId: 'noConsoleSpaces',
                  data: {
                    method: getConsoleMethodName(node),
                    arg: 'template literal with spaces',
                  },
                  // Template literals are harder to fix automatically
                  fix: null,
                });
              }
            }
          }
        }
      },
    };
  },
});

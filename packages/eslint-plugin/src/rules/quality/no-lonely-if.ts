/**
 * ESLint Rule: no-lonely-if
 * Prevent lone if statements inside else blocks
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noLonelyIf';

export interface Options {
  /** Allow lonely if in specific contexts */
  allow?: string[];
}

type RuleOptions = [Options?];

export const noLonelyIf = createRule<RuleOptions, MessageIds>({
  name: 'no-lonely-if',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prevent lone if statements inside else blocks - use else if instead',
    },
    hasSuggestions: true,
    messages: {
      noLonelyIf: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Lonely If',
        description: 'Unexpected if statement inside else block',
        severity: 'MEDIUM',
        fix: 'Replace with else if for better readability',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-lonely-if.md',
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
    const [options] = context.options;
    const { allow = [] } = options || {};

    const allowedContexts = new Set(allow);

    function isInAllowedContext(): boolean {
      // Check if we're in an allowed context
      // This is a simple implementation - could be extended for more complex cases
      for (const allowedContext of allowedContexts) {
        // For now, just check if the context string appears anywhere in the source
        const sourceCode = context.sourceCode;
        const sourceText = sourceCode.getText();
        if (sourceText.includes(allowedContext)) {
          return true;
        }
      }
      return false;
    }

    function isLonelyIf(node: TSESTree.IfStatement): boolean {
      // Check if this if statement is inside an else block (not a proper else if)
      const parent = node.parent;

      // If parent is a BlockStatement, check if that block is an else block
      if (parent?.type === 'BlockStatement') {
        const grandParent = parent.parent;
        // Check if the block is the alternate (else) of an if statement
        return grandParent?.type === 'IfStatement' && grandParent.alternate === parent;
      }

      // If not in a block, it's not a lonely if (it's either a proper else if or top-level)
      return false;
    }

    return {
      IfStatement(node: TSESTree.IfStatement) {
        if (isLonelyIf(node) && !isInAllowedContext(node)) {
          context.report({
            node,
            messageId: 'noLonelyIf',
            data: {
              current: 'if statement in else block',
              fix: 'else if',
            },
            suggest: [
              {
                messageId: 'noLonelyIf',
                fix(fixer: TSESLint.RuleFixer) {
                  const sourceCode = context.sourceCode;

                  // Find the else keyword
                  let elseToken = null;
                  const tokens = sourceCode.getTokensBefore(node, 10);
                  for (let i = tokens.length - 1; i >= 0; i--) {
                    if (tokens[i].value === 'else') {
                      elseToken = tokens[i];
                      break;
                    }
                  }

                  if (elseToken) {
                    // Remove 'else' and replace 'if' with 'else if'
                    const ifToken = sourceCode.getTokenAfter(elseToken);
                    if (ifToken && ifToken.value === 'if') {
                      return [
                        fixer.removeRange([elseToken.range[0], ifToken.range[1]]),
                        fixer.insertTextBefore(ifToken, 'else '),
                      ];
                    }
                  }

                  return null;
                },
              },
            ],
          });
        }
      },
    };
  },
});

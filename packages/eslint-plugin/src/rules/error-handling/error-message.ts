/**
 * ESLint Rule: error-message
 * Enforces providing a message when creating built-in Error objects
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'missingErrorMessage' | 'addErrorMessage';

export interface Options {
  /** Allow Error() without message (not recommended) */
  allowEmptyCatch?: boolean;
}

type RuleOptions = [Options?];

export const errorMessage = createRule<RuleOptions, MessageIds>({
  name: 'error-message',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce providing a message when creating built-in Error objects for better debugging',
    },
    hasSuggestions: true,
    messages: {
      missingErrorMessage: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Missing Error Message',
        description: 'Error constructor called without message parameter',
        severity: 'HIGH',
        fix: 'Add descriptive error message: new Error("description")',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/error-message.md',
      }),
      addErrorMessage: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Add Error Message',
        description: 'Add descriptive error message to constructor',
        severity: 'HIGH',
        fix: 'Add descriptive error message: new Error("description")',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/error-message.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowEmptyCatch: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowEmptyCatch: false }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const { allowEmptyCatch = false } = options || {};

    // Built-in Error constructors that should have messages
    const errorConstructors = new Set([
      'Error',
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'RangeError',
      'EvalError',
      'URIError',
    ]);

    function isErrorConstructor(name: string): boolean {
      return errorConstructors.has(name);
    }

    function hasMessageArgument(node: TSESTree.NewExpression | TSESTree.CallExpression): boolean {
      // Check if there are arguments
      if (!node.arguments || node.arguments.length === 0) {
        return false;
      }

      // Check if first argument is a non-empty string or expression
      const firstArg = node.arguments[0];
      if (firstArg.type === 'Literal') {
        // Allow non-empty strings
        return typeof firstArg.value === 'string' && firstArg.value.trim().length > 0;
      }

      // Allow any expression (variable, function call, etc.) as it might be dynamic
      return true;
    }

    function isInCatchClause(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node;
      while (current) {
        if (current.type === 'CatchClause') {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    function checkErrorCreation(node: TSESTree.NewExpression | TSESTree.CallExpression) {
      let constructorName: string | null = null;

      if (node.type === 'NewExpression') {
        // new Error(...)
        if (node.callee.type === 'Identifier') {
          constructorName = node.callee.name;
        }
      } else if (node.type === 'CallExpression') {
        // Error(...) - function call style
        if (node.callee.type === 'Identifier') {
          constructorName = node.callee.name;
        }
      }

      if (!constructorName || !isErrorConstructor(constructorName)) {
        return;
      }

      // Allow empty catch if option is enabled
      if (allowEmptyCatch && isInCatchClause(node)) {
        return;
      }

      // Check if message is provided
      if (!hasMessageArgument(node)) {
        context.report({
          node,
          messageId: 'missingErrorMessage',
          data: {
            constructor: constructorName,
          },
          suggest: [
            {
              messageId: 'addErrorMessage',
              data: { constructor: constructorName },
              fix(fixer: TSESLint.RuleFixer) {
                if (node.arguments.length === 0) {
                  // No arguments: replace the empty parentheses with ("Error message")
                  const parenStart = node.callee.range[1];
                  const parenEnd = node.range[1];
                  return fixer.replaceTextRange([parenStart, parenEnd], '("Error message")');
                } else {
                  // Has arguments: replace the first argument with "Error message"
                  return fixer.replaceText(node.arguments[0], '"Error message"');
                }
              },
            },
          ],
        });
      }
    }

    return {
      NewExpression: checkErrorCreation,
      CallExpression: checkErrorCreation,
    };
  },
});

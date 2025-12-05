/**
 * ESLint Rule: no-nested-ternary
 * Prevent nested ternary expressions
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noNestedTernary';

export interface Options {
  /** Allow nested ternaries in specific contexts */
  allow?: string[];
}

type RuleOptions = [Options?];

export const noNestedTernary = createRule<RuleOptions, MessageIds>({
  name: 'no-nested-ternary',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prevent nested ternary expressions for better readability',
    },
    hasSuggestions: true,
    messages: {
      noNestedTernary: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Nested Ternary',
        description: 'Avoid nested ternary expressions',
        severity: 'MEDIUM',
        fix: 'Extract to helper variable or use if-else',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-nested-ternary.md',
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

    /**
     * Check if node is in an allowed context based on the allow option.
     * Supported contexts:
     * - 'jsx': Allow nested ternaries in JSX expressions
     * - 'variable': Allow nested ternaries in variable declarations
     * - 'return': Allow nested ternaries in return statements
     * - 'argument': Allow nested ternaries in function arguments
     */
    function isInAllowedContext(node: TSESTree.ConditionalExpression): boolean {
      if (allow.length === 0) {
        return false;
      }

      let current: TSESTree.Node | undefined = node.parent;
      
      while (current) {
        // Check for JSX context
        if (
          allow.includes('jsx') &&
          (current.type === 'JSXExpressionContainer' ||
           current.type === 'JSXElement' ||
           current.type === 'JSXFragment')
        ) {
          return true;
        }

        // Check for variable declaration context
        if (
          allow.includes('variable') &&
          current.type === 'VariableDeclarator'
        ) {
          return true;
        }

        // Check for return statement context
        if (
          allow.includes('return') &&
          current.type === 'ReturnStatement'
        ) {
          return true;
        }

        // Check for function argument context
        if (
          allow.includes('argument') &&
          current.type === 'CallExpression'
        ) {
          return true;
        }

        current = current.parent;
      }

      return false;
    }

    function hasNestedTernary(node: TSESTree.ConditionalExpression): boolean {
      // Check if the consequent or alternate contains another ternary
      function containsTernary(expr: TSESTree.Node): boolean {
        if (expr.type === 'ConditionalExpression') {
          return true;
        }

        // For other expression types, check their child expressions
        switch (expr.type) {
          case 'ArrayExpression':
            return expr.elements.some((element: TSESTree.Expression | TSESTree.SpreadElement | null) => 
              element && element.type !== 'SpreadElement' && containsTernary(element)
            );
          case 'ObjectExpression':
            return expr.properties.some((prop: TSESTree.Property | TSESTree.SpreadElement) =>
              prop.type === 'Property' && prop.value && containsTernary(prop.value as TSESTree.Expression)
            );
          case 'CallExpression':
            return expr.arguments.some((arg: TSESTree.Expression | TSESTree.SpreadElement) => 
              arg.type !== 'SpreadElement' && containsTernary(arg)
            ) || (expr.callee.type !== 'Super' && containsTernary(expr.callee));
          case 'MemberExpression':
            return containsTernary(expr.object) ||
                   (expr.property.type !== 'Identifier' && 
                    expr.property.type !== 'PrivateIdentifier' && 
                    containsTernary(expr.property));
          case 'BinaryExpression':
          case 'LogicalExpression':
            return containsTernary(expr.left) || containsTernary(expr.right);
          case 'UnaryExpression':
          case 'UpdateExpression':
            return containsTernary(expr.argument);
          case 'AssignmentExpression':
            return containsTernary(expr.right);
          // For literals and identifiers, no nested expressions
          case 'Literal':
          case 'Identifier':
          case 'ThisExpression':
          case 'Super':
          case 'MetaProperty':
            return false;
          // For template literals, check expressions
          case 'TemplateLiteral':
            return expr.expressions.some((exp: TSESTree.Expression) => containsTernary(exp));
          // For tagged templates, check tag and expressions
          case 'TaggedTemplateExpression':
            return containsTernary(expr.tag) ||
                   expr.quasi.expressions.some((exp: TSESTree.Expression) => containsTernary(exp));
          // Default: assume no nested expressions for unknown types
          default:
            return false;
        }
      }

      return containsTernary(node.consequent) || containsTernary(node.alternate);
    }

    return {
      ConditionalExpression(node: TSESTree.ConditionalExpression) {
        if (hasNestedTernary(node) && !isInAllowedContext(node)) {
          context.report({
            node,
            messageId: 'noNestedTernary',
            data: {
              current: 'nested ternary expression',
              fix: 'extract or use if-else',
            },
            suggest: [
              {
                messageId: 'noNestedTernary',
                fix() {
                  // This is a complex fix that would require:
                  // 1. Extracting the nested ternary to a variable
                  // 2. Replacing the nested part
                  // For now, just provide the suggestion
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

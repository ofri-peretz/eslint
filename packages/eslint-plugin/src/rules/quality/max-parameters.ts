/**
 * ESLint Rule: max-parameters
 * Detects functions with too many parameters
 * 
 * Note: ESLint has max-params, but this rule provides LLM-optimized messages
 * and additional context about refactoring to object parameters
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-107/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { extractFunctionSignature } from '@interlace/eslint-devkit';

type MessageIds =
  | 'tooManyParameters'
  | 'useObjectParameter'
  | 'extractToClass'
  | 'splitFunction';

export interface Options {
  /** Maximum allowed parameters. Default: 4 */
  max?: number;
  
  /** Ignore constructors. Default: false */
  ignoreConstructors?: boolean;
  
  /** Ignore overridden methods. Default: false */
  ignoreOverriddenMethods?: boolean;
}

type RuleOptions = [Options?];

/**
 * Count function parameters
 */
function countParameters(
  node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
): number {
  return node.params.length;
}

export const maxParameters = createRule<RuleOptions, MessageIds>({
  name: 'max-parameters',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detects functions with too many parameters',
    },
    messages: {
      tooManyParameters: formatLLMMessage({
        icon: MessageIcons.COMPLEXITY,
        issueName: 'Too many parameters',
        description: '{{functionName}}: {{count}} parameters (max: {{max}})',
        severity: 'MEDIUM',
        fix: 'Refactor to use object parameter or split function',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-107/',
      }),
      useObjectParameter: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Object Parameter',
        description: 'Use object parameter pattern',
        severity: 'LOW',
        fix: 'function({ param1, param2, param3 })',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment',
      }),
      extractToClass: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Extract to Class',
        description: 'Extract to class with properties',
        severity: 'LOW',
        fix: 'Create class to hold related parameters',
        documentationLink: 'https://refactoring.guru/introduce-parameter-object',
      }),
      splitFunction: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Split Function',
        description: 'Split into smaller functions',
        severity: 'LOW',
        fix: 'Extract logic into separate focused functions',
        documentationLink: 'https://refactoring.guru/smells/long-parameter-list',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            default: 4,
            minimum: 1,
          },
          ignoreConstructors: {
            type: 'boolean',
            default: false,
          },
          ignoreOverriddenMethods: {
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
      max: 4,
      ignoreConstructors: false,
      ignoreOverriddenMethods: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
max = 4,
      ignoreConstructors = false,
      // ignoreOverriddenMethods = false, // Not used

}: Options = options || {};

    /**
     * Check function parameters
     */
    function checkFunction(
      node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression
    ) {
      // Check if it's a constructor
      if (ignoreConstructors) {
        if (node.type === 'FunctionDeclaration' && node.id && 
            node.id.name && /^[A-Z]/.test(node.id.name)) {
          // Likely a constructor
          return;
        }
      }

      const paramCount = countParameters(node);

      if (paramCount <= max) {
        return;
      }

      const functionSignature = extractFunctionSignature(node);
      const overBy = paramCount - max;

      context.report({
        node,
        messageId: 'tooManyParameters',
        data: {
          functionName: functionSignature,
          count: String(paramCount),
          max: String(max),
          overBy: String(overBy),
        },
        suggest: [
          {
            messageId: 'useObjectParameter',
            fix: () => null, // Complex refactoring, cannot auto-fix
          },
          {
            messageId: 'extractToClass',
            fix: () => null,
          },
          {
            messageId: 'splitFunction',
            fix: () => null,
          },
        ],
      });
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
});


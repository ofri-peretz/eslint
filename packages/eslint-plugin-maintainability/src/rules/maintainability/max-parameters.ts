/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
 * Count function parameters, excluding TypeScript's `this`.
 *
 * `function f(this: Window, a, b, c, d)` takes FOUR arguments. The `this`
 * parameter is a type annotation for the calling context — it is erased before
 * emit and no caller ever passes it — so counting it inflates the arity by one
 * and reports a function that is exactly at the limit.
 *
 * This matches `@typescript-eslint/max-params`, whose `countVoidThis` option
 * defaults to false for the same reason. A TypeScript-aware rule that diverges
 * from that is reporting on syntax rather than on the signature a caller sees.
 *
 * It can only be the FIRST parameter — TypeScript rejects it anywhere else — so
 * checking the head is sufficient rather than filtering the whole list.
 */
function countParameters(
  node:
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression,
): number {
  const [first] = node.params;
  const hasThisParam = first?.type === 'Identifier' && first.name === 'this';
  return node.params.length - (hasThisParam ? 1 : 0);
}

export const maxParameters = createRule<RuleOptions, MessageIds>({
  name: 'max-parameters',
  // 27% of this rule's findings on the pinned 8-repository corpus were in
  // generated files. A generated signature's arity is the API spec's
  // decision, not something anyone can refactor.
  skipGeneratedFiles: true,
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-maintainability/docs/rules/max-parameters.md',
      description: 'Detects functions with too many parameters',
    },
    hasSuggestions: true,
    messages: {
      tooManyParameters: formatLLMMessage({
        icon: MessageIcons.COMPLEXITY,
        issueName: 'Too many parameters',
        description: '{{functionName}}: {{count}} parameters (max: {{max}})',
        severity: 'MEDIUM',
        fix: 'Refactor to use object parameter or split function',
        documentationLink:
          'https://rules.sonarsource.com/javascript/RSPEC-107/',
      }),
      useObjectParameter: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Object Parameter',
        description: 'Use object parameter pattern',
        severity: 'LOW',
        fix: 'function({ param1, param2, param3 })',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment',
      }),
      extractToClass: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Extract to Class',
        description: 'Extract to class with properties',
        severity: 'LOW',
        fix: 'Create class to hold related parameters',
        documentationLink:
          'https://refactoring.guru/introduce-parameter-object',
      }),
      splitFunction: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Split Function',
        description: 'Split into smaller functions',
        severity: 'LOW',
        fix: 'Extract logic into separate focused functions',
        documentationLink:
          'https://refactoring.guru/smells/long-parameter-list',
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
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      max = 4,
      ignoreConstructors = false,
      // ignoreOverriddenMethods = false, // Not used
    }: Options = options || {};

    /**
     * Check function parameters
     */
    function checkFunction(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
    ) {
      // Check if it's a constructor
      if (ignoreConstructors) {
        if (
          node.type === 'FunctionDeclaration' &&
          node.id &&
          node.id.name &&
          /^[A-Z]/.test(node.id.name)
        ) {
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

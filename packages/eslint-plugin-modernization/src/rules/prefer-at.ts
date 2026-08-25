/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-at
 * Prefer .at() method over array[index] for accessing elements from end (unicorn-inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'preferAtMethod' | 'useAtForLastElement' | 'useAtForNegativeIndex';

export interface Options {
  /** Check for last element access patterns */
  checkLastElement?: boolean;
}

type RuleOptions = [Options?];

/**
 * Is this member expression being WRITTEN to rather than read?
 *
 * `.at()` returns a value, not a reference, so none of these positions can use
 * it — `arr.at(-1) = 5` is a syntax error, and so are the compound, update and
 * delete forms.
 *
 * Only the shapes with a test behind them are listed. An earlier draft also
 * enumerated ObjectPattern, AssignmentPattern, Property and RestElement, and
 * the 100% branch gate rejected it: every one was unreachable here, because a
 * computed member expression in those positions is reached through
 * `AssignmentExpression.left` or `ArrayPattern` instead. Guessing at parent
 * types is how a guard grows branches nobody can trigger.
 */
function isWriteTarget(node: TSESTree.MemberExpression): boolean {
  const parent = node.parent as TSESTree.Node;
  switch (parent.type) {
    case 'AssignmentExpression':
      return parent.left === node;
    case 'UpdateExpression':
      return parent.argument === node;
    case 'UnaryExpression':
      return parent.operator === 'delete';
    case 'ForOfStatement':
    case 'ForInStatement':
      return parent.left === node;
    case 'ArrayPattern':
      return true;
    default:
      return false;
  }
}

export const preferAt = createRule<RuleOptions, MessageIds>({
  name: 'prefer-at',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-modernization/docs/rules/prefer-at.md',
      description:
        'Prefer .at() method over bracket notation for accessing elements from the end',
    },
    fixable: 'code',
    hasSuggestions: false,
    messages: {
      preferAtMethod: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Legacy Array Access',
        description: 'Use .at() method for clearer array element access',
        severity: 'MEDIUM',
        fix: 'Replace array[array.length - n] with array.at(-n)',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at',
      }),
      useAtForLastElement: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use .at(-1)',
        description: 'Use array.at(-1) for last element',
        severity: 'LOW',
        fix: 'array.at(-1) instead of array[array.length - 1]',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at',
      }),
      useAtForNegativeIndex: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use .at()',
        description: 'Use array.at() for negative index',
        severity: 'LOW',
        fix: 'array.at(index) for clearer negative index access',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkLastElement: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ checkLastElement: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      MemberExpression(node: TSESTree.MemberExpression) {
        if (!node.computed || node.object.type !== 'Identifier') {
          return;
        }

        // `.at()` RETURNS a value; it is not a reference, so it cannot appear
        // where the element is being written. `arr.at(-1) = 5` is a syntax
        // error, and so are the compound, update and delete forms. Reporting
        // here does not merely add noise — it hands the reader a fix that does
        // not compile.
        //
        // Found by a census of this rule's corpus findings: Shopify's
        // `durationStack[durationStack.length - 1] = (durationStack[...] ?? 0) + d`
        // produced TWO findings on one line, one for the read and one for the
        // assignment target. The read is right; the target never was.
        if (isWriteTarget(node)) {
          return;
        }

        const arrayName = node.object.name;

        // Check for array[array.length - n] pattern (any numeric literal n)
        if (
          node.property.type === 'BinaryExpression' &&
          node.property.operator === '-' &&
          node.property.left.type === 'MemberExpression' &&
          !node.property.left.computed &&
          node.property.left.object.type === 'Identifier' &&
          node.property.left.object.name === arrayName &&
          node.property.left.property.type === 'Identifier' &&
          node.property.left.property.name === 'length' &&
          node.property.right.type === 'Literal' &&
          typeof node.property.right.value === 'number' &&
          node.property.right.value > 0
        ) {
          const offset = node.property.right.value;
          const messageId = offset === 1 ? 'useAtForLastElement' : 'preferAtMethod';
          
          context.report({
            node,
            messageId,
            fix(fixer: TSESLint.RuleFixer) {
              return fixer.replaceText(node, `${arrayName}.at(-${offset})`);
            },
          });
          return;
        }

        // Check for array[array.length - variable] pattern (variable offset)
        if (
          node.property.type === 'BinaryExpression' &&
          node.property.operator === '-' &&
          node.property.left.type === 'MemberExpression' &&
          !node.property.left.computed &&
          node.property.left.object.type === 'Identifier' &&
          node.property.left.object.name === arrayName &&
          node.property.left.property.type === 'Identifier' &&
          node.property.left.property.name === 'length' &&
          node.property.right.type === 'Identifier'
        ) {
          const varName = node.property.right.name;
          
          context.report({
            node,
            messageId: 'preferAtMethod',
            fix(fixer: TSESLint.RuleFixer) {
              return fixer.replaceText(node, `${arrayName}.at(-${varName})`);
            },
          });
          return;
        }

        // Check for array[-n] pattern (negative numeric literal)
        if (
          node.property.type === 'UnaryExpression' &&
          node.property.operator === '-' &&
          node.property.argument.type === 'Literal' &&
          typeof node.property.argument.value === 'number' &&
          node.property.argument.value > 0
        ) {
          const offset = node.property.argument.value;
          
          context.report({
            node,
            messageId: 'useAtForNegativeIndex',
            fix(fixer: TSESLint.RuleFixer) {
              return fixer.replaceText(node, `${arrayName}.at(-${offset})`);
            },
          });
        }
      },
    };
  },
});

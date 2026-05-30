/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-template-literal
 * Prefer template literals over string concatenation with the + operator.
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'preferTemplateLiteral';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Options {}

type RuleOptions = [Options?];

/**
 * Returns true if the node is a string literal or a binary expression
 * that produces a string (i.e., involves at least one string literal operand).
 */
function isStringExpression(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') return typeof node.value === 'string';
  if (node.type === 'TemplateLiteral') return true;
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return isStringExpression(node.left) || isStringExpression(node.right);
  }
  return false;
}

/**
 * Returns true if the binary expression involves a non-literal operand
 * (i.e., it's an interpolation candidate, not a pure compile-time concat).
 */
function hasRuntimeOperand(node: TSESTree.BinaryExpression): boolean {
  const sides = [node.left, node.right];
  return sides.some((side) => {
    if (side.type === 'Literal') return false;
    if (side.type === 'TemplateLiteral') return false;
    if (side.type === 'BinaryExpression' && side.operator === '+') {
      // Recursively check: a chain of string literals + '' + '' is still pure.
      return hasRuntimeOperand(side);
    }
    // Identifier, MemberExpression, CallExpression, etc. — runtime value
    return true;
  });
}

export const preferTemplateLiteral = createRule<RuleOptions, MessageIds>({
  name: 'prefer-template-literal',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-modernization/docs/rules/prefer-template-literal.md',
      description: 'Prefer template literals over string concatenation with the + operator',
    },
    fixable: 'code',
    messages: {
      preferTemplateLiteral: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Prefer Template Literal',
        description: 'String concatenation using + can be replaced with a template literal for readability',
        severity: 'LOW',
        // eslint-disable-next-line no-template-curly-in-string
        fix: 'Use a template literal: `Hello ${name}` instead of "Hello " + name',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    /**
     * Collect the "parts" of a + chain into an array of nodes.
     * `"a" + b + "c"` → [Literal("a"), Identifier(b), Literal("c")]
     */
    function collectParts(node: TSESTree.Node): TSESTree.Node[] {
      if (node.type === 'BinaryExpression' && node.operator === '+') {
        return [...collectParts(node.left), ...collectParts(node.right)];
      }
      return [node];
    }

    /**
     * Build the template literal source text from a list of parts.
     */
    function buildTemplateLiteral(
      parts: TSESTree.Node[],
      sourceCode: TSESLint.SourceCode,
    ): string {
      let result = '`';
      for (const part of parts) {
        if (part.type === 'Literal' && typeof part.value === 'string') {
          // Escape backticks and ${ in the string value
          result += part.value
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${');
        } else if (part.type === 'TemplateLiteral') {
          // Inline an existing template literal's quasis and expressions
          const src = sourceCode.getText(part);
          // Strip outer backticks
          result += src.slice(1, -1);
        } else {
          result += `\${${sourceCode.getText(part)}}`;
        }
      }
      result += '`';
      return result;
    }

    return {
      BinaryExpression(node: TSESTree.BinaryExpression) {
        // Only check + operators
        if (node.operator !== '+') return;

        // Only flag the ROOT of a + chain (skip nested ones already covered by the root)
        const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
        if (
          parent?.type === 'BinaryExpression' &&
          (parent as TSESTree.BinaryExpression).operator === '+'
        ) {
          return; // Let the root handle the whole chain
        }

        // Must involve a string (not numeric addition)
        if (!isStringExpression(node)) return;

        // Must have at least one runtime (non-literal) operand — pure
        // compile-time concatenation of string literals is fine as-is.
        if (!hasRuntimeOperand(node)) return;

        const sourceCode = context.sourceCode;
        const parts = collectParts(node);

        context.report({
          node,
          messageId: 'preferTemplateLiteral',
          fix(fixer: TSESLint.RuleFixer) {
            return fixer.replaceText(node, buildTemplateLiteral(parts, sourceCode));
          },
        });
      },
    };
  },
});

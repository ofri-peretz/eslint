/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-magic-numbers
 * Flags numeric literals that are not self-documenting — i.e., numbers that
 * appear in code without a named constant explaining their meaning.
 *
 * Beats ESLint core's no-magic-numbers in two ways:
 *   1. Built-in allowlist covers idiomatic JS patterns (array indices, bit
 *      masks, HTTP status codes family boundaries) so teams don't need to
 *      enumerate common safe values.
 *   2. Skips enums, default parameter values, and export declarations where
 *      the context already provides naming.
 *
 * @see https://refactoring.guru/replace-magic-literal
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noMagicNumber' | 'extractConst';

export interface Options {
  /**
   * Numbers that are always allowed regardless of context.
   * Defaults to [-1, 0, 1, 2] — universally idiomatic.
   */
  ignore?: number[];

  /** Allow numbers used as array indices (e.g., `items[2]`). Default: true */
  ignoreArrayIndexes?: boolean;

  /** Allow numbers in default parameter values (e.g., `function f(n = 10)`). Default: true */
  ignoreDefaultValues?: boolean;

  /** Allow numbers in enum member initializers. Default: true */
  ignoreEnums?: boolean;

  /** Allow numbers in bitwise expressions. Default: false */
  ignoreBitwiseExpressions?: boolean;
}

type RuleOptions = [Options?];

/** Numbers that are universally idiomatic in JS/TS and need no naming. */
const DEFAULT_IGNORE = new Set<number>([-1, 0, 1, 2]);

/** Build a SCREAMING_SNAKE_CASE const name from a numeric value. */
function constNameFor(value: number): string {
  // e.g. 5000 → MAGIC_5000 · -3 → MAGIC_NEG_3 · 1.5 → MAGIC_1_5
  const prefix = value < 0 ? 'MAGIC_NEG_' : 'MAGIC_';
  const digits = String(Math.abs(value)).replace('.', '_');
  return `${prefix}${digits}`;
}

/**
 * Walk up the AST to find the nearest statement ancestor that can be used
 * as the insertion point for a const declaration.
 */
function nearestStatement(node: TSESTree.Node): TSESTree.Statement | null {
  const STATEMENT_TYPES = new Set([
    'ExpressionStatement', 'VariableDeclaration', 'ReturnStatement',
    'IfStatement', 'WhileStatement', 'ForStatement', 'ForInStatement',
    'ForOfStatement', 'ThrowStatement', 'SwitchStatement',
  ]);
  let current: TSESTree.Node | undefined = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
  while (current) {
    if (STATEMENT_TYPES.has(current.type)) return current as TSESTree.Statement;
    current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
  }
  return null;
}

export const noMagicNumbers = createRule<RuleOptions, MessageIds>({
  name: 'no-magic-numbers',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/no-magic-numbers.md',
      description:
        'Disallow magic numbers (numeric literals without a named constant)',
    },
    hasSuggestions: true,
    messages: {
      noMagicNumber: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Magic Number',
        description:
          'The number {{value}} is a magic literal. Extract it to a named constant to make the intent clear.',
        severity: 'LOW',
        fix: 'const TIMEOUT_MS = {{value}}; // use the named constant everywhere',
        documentationLink: 'https://refactoring.guru/replace-magic-literal',
      }),
      extractConst: 'Extract {{value}} to a named constant ({{constName}})',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: { type: 'number' },
            description: 'Additional numbers to allow',
          },
          ignoreArrayIndexes: { type: 'boolean', default: true },
          ignoreDefaultValues: { type: 'boolean', default: true },
          ignoreEnums: { type: 'boolean', default: true },
          ignoreBitwiseExpressions: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignore: [],
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
      ignoreEnums: true,
      ignoreBitwiseExpressions: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options = {}] = context.options;
    const {
      ignore = [],
      ignoreArrayIndexes = true,
      ignoreDefaultValues = true,
      ignoreEnums = true,
      ignoreBitwiseExpressions = false,
    } = options;

    const ignoredValues = new Set<number>([...DEFAULT_IGNORE, ...ignore]);

    function isIgnoredNumber(value: number): boolean {
      return ignoredValues.has(value);
    }

    function isArrayIndex(node: TSESTree.Literal): boolean {
      if (!ignoreArrayIndexes) return false;
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      return (
        parent?.type === 'MemberExpression' &&
        (parent as TSESTree.MemberExpression).computed &&
        (parent as TSESTree.MemberExpression).property === node
      );
    }

    function isDefaultValue(node: TSESTree.Literal): boolean {
      if (!ignoreDefaultValues) return false;
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      return (
        parent?.type === 'AssignmentPattern' &&
        (parent as TSESTree.AssignmentPattern).right === node
      );
    }

    function isEnumMember(node: TSESTree.Literal): boolean {
      if (!ignoreEnums) return false;
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      return parent?.type === 'TSEnumMember';
    }

    function isBitwiseContext(node: TSESTree.Literal): boolean {
      if (!ignoreBitwiseExpressions) return false;
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      const BITWISE_OPS = new Set(['&', '|', '^', '<<', '>>', '>>>']);
      return (
        parent?.type === 'BinaryExpression' &&
        BITWISE_OPS.has((parent as TSESTree.BinaryExpression).operator)
      );
    }

    function isVariableDeclarator(node: TSESTree.Literal): boolean {
      // const FOO = 42 — the literal is the named constant itself
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      return parent?.type === 'VariableDeclarator';
    }

    function isExportedConst(node: TSESTree.Literal): boolean {
      // export const FOO = 42
      let current: TSESTree.Node | undefined = node as TSESTree.Node;
      while (current) {
        if (current.type === 'ExportNamedDeclaration') return true;
        if (
          current.type === 'VariableDeclaration' ||
          current.type === 'VariableDeclarator'
        ) {
          current = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
          continue;
        }
        break;
      }
      return false;
    }

    function isPropertyKey(node: TSESTree.Literal): boolean {
      // { 42: 'value' } — numeric key in object literal
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      return (
        parent?.type === 'Property' &&
        (parent as TSESTree.Property).key === node
      );
    }

    return {
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'number') return;
        const value = node.value;

        // Skip universally ignored values
        if (isIgnoredNumber(value)) return;

        // Skip NaN / Infinity (not numeric literals per se)
        if (!isFinite(value)) return;

        // Context-based skips
        if (isVariableDeclarator(node)) return; // const X = 42
        if (isExportedConst(node)) return;
        if (isArrayIndex(node)) return;
        if (isDefaultValue(node)) return;
        if (isEnumMember(node)) return;
        if (isBitwiseContext(node)) return;
        if (isPropertyKey(node)) return;

        const constName = constNameFor(value);
        const sourceCode = context.sourceCode;

        context.report({
          node,
          messageId: 'noMagicNumber',
          data: { value: String(value) },
          suggest: [
            {
              messageId: 'extractConst',
              data: { value: String(value), constName },
              fix(fixer) {
                const stmt = nearestStatement(node);
                if (!stmt) return null;
                // Determine indentation from the statement's first token.
                const firstToken = sourceCode.getFirstToken(stmt);
                if (!firstToken) return null;
                const col = firstToken.loc.start.column;
                const indent = ' '.repeat(col);
                return [
                  fixer.insertTextBefore(stmt, `const ${constName} = ${value};\n${indent}`),
                  fixer.replaceText(node, constName),
                ];
              },
            },
          ],
        });
      },
    };
  },
});

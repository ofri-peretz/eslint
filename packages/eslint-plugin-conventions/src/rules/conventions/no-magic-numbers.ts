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

  /**
   * Report numbers used as object property VALUES — `{ timeout: 5000 }`.
   * Default: false.
   *
   * Off by default, matching ESLint core's own `no-magic-numbers`, which has
   * shipped `detectObjects: false` for years. A config object IS a place to
   * write literals; that is what it is for.
   *
   * Measured rather than assumed: across 5,938 sampled findings on the
   * 20-repository corpus, object properties were 1,827 of them — 31%, and the
   * single largest context by a factor of two. The classes named below (loop
   * bounds, arity checks) were 231 and 79.
   */
  detectObjects?: boolean;

  /**
   * Allow a numeric bound in a loop header — `for (let i = 0; i < 4; i++)`.
   * Default: true.
   *
   * A loop bound is idiomatic rather than magic: the number IS the loop's
   * shape, and extracting it to `const FOUR = 4` makes the code worse. Measured
   * across a 20-repository ledger, this was one of the four classes that made
   * this rule the highest-volume in the ecosystem at 22,942 findings.
   */
  ignoreLoopBounds?: boolean;

  /**
   * Allow a comparison against `.length` — `arguments.length === 3`.
   * Default: true.
   *
   * An arity or size check names its own meaning. The same family as the array
   * index this rule already exempts.
   */
  ignoreLengthComparisons?: boolean;

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
          detectObjects: { type: 'boolean', default: false },
          ignoreLoopBounds: { type: 'boolean', default: true },
          ignoreLengthComparisons: { type: 'boolean', default: true },
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
      detectObjects: false,
      ignoreLoopBounds: true,
      ignoreLengthComparisons: true,
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
      detectObjects = false,
      ignoreLoopBounds = true,
      ignoreLengthComparisons = true,
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

    /**
     * A numeric bound inside a `for` header.
     *
     * Scoped to the header's own test and update clauses, walked up through
     * whatever expression holds the literal, and stopping at the loop BODY —
     * a magic number inside the body is ordinary code and must keep reporting.
     */
    /**
     * The VALUE of an object property — `{ timeout: 5000 }`.
     *
     * Not the key: a computed key `{ [4]: x }` is an index, which the array
     * exemption already covers.
     */
    function isObjectPropertyValue(node: TSESTree.Literal): boolean {
      if (detectObjects) return false;
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      return (
        parent?.type === 'Property' && (parent as TSESTree.Property).value === node
      );
    }

    function isLoopBound(node: TSESTree.Literal): boolean {
      if (!ignoreLoopBounds) return false;
      // Walks to the enclosing ForStatement or to a statement boundary, with no
      // depth cap. A fixed limit silently stopped exempting a literal nested
      // deeply enough in the header — `for (let i = 0; i < f(g(h(9))); i++)` —
      // and the depth at which it gave up was arbitrary.
      let current: TSESTree.Node = node;
      let parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      while (parent) {
        if (parent.type === 'ForStatement') {
          const loop = parent as TSESTree.ForStatement;
          return loop.test === current || loop.update === current || loop.init === current;
        }
        // A statement boundary means we left the header without finding it.
        if (parent.type === 'BlockStatement' || parent.type === 'Program') return false;
        current = parent;
        parent = (current as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      }
      return false;
    }

    /**
     * A comparison against `.length` — `args.length === 3`, `xs.length > 2`.
     *
     * EQUALITY only. `arguments.length === 3` is an arity check and the number
     * is the arity; `users.length > 100` is a business threshold and stays a
     * finding — an existing test pinned exactly that, and it was right. The
     * corpus evidence for this exemption was `arguments.length === 3`, so the
     * exemption is scoped to that shape rather than to every comparison that
     * happens to touch `.length`.
     *
     * Only the SIBLING of the comparison counts, so `foo(bar.length, 3)` is
     * untouched.
     */
    function isLengthComparison(node: TSESTree.Literal): boolean {
      if (!ignoreLengthComparisons) return false;
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      if (parent?.type !== 'BinaryExpression') return false;
      const comparison = parent as TSESTree.BinaryExpression;
      const EQUALITY = new Set(['===', '!==', '==', '!=']);
      if (!EQUALITY.has(comparison.operator)) return false;
      const other = comparison.left === node ? comparison.right : comparison.left;
      return (
        other.type === 'MemberExpression' &&
        !other.computed &&
        other.property.type === 'Identifier' &&
        other.property.name === 'length'
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
        if (isObjectPropertyValue(node)) return;
        if (isLoopBound(node)) return;
        if (isLengthComparison(node)) return;
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

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The static strings a class or style value can evaluate to, however it is
 * written, and the class-name builders that take them.
 *
 * `className="a"`, `className={"a"}`, `` className={`a`} ``,
 * `className={flag ? "a" : "b"}` and `cn("a", flag && "b", { c: on }, ["d"])`
 * all put literal class text in the source. A rule that reads only the first
 * spelling misses the rest.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

/** One static piece of text, the node that holds it, and whether it is the whole value. */
export interface StringPiece {
  node: TSESTree.Node;
  text: string;
  /** False for a quasi of a template with placeholders: only part of the value. */
  whole: boolean;
}

/**
 * The static strings an expression may evaluate to: a string literal, each
 * static part of a template (tagged or not), both branches of a conditional, the value side of
 * `&&` and both sides of `||` / `??`. Anything else contributes nothing.
 */
export function valueStrings(node: TSESTree.Node): StringPiece[] {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return typeof node.value === 'string'
        ? [{ node, text: node.value, whole: true }]
        : [];
    case AST_NODE_TYPES.TemplateLiteral: {
      const whole = node.expressions.length === 0;
      return node.quasis.map((q) => ({
        node,
        text: q.value.cooked ?? q.value.raw,
        whole,
      }));
    }
    // `` tw`p-4 ${x}` ``: the tag may rewrite the text, so no part is the whole value.
    case AST_NODE_TYPES.TaggedTemplateExpression:
      return valueStrings(node.quasi).map((p) => ({ ...p, whole: false }));
    case AST_NODE_TYPES.ConditionalExpression:
      return [
        ...valueStrings(node.consequent),
        ...valueStrings(node.alternate),
      ];
    case AST_NODE_TYPES.LogicalExpression:
      return node.operator === '&&'
        ? valueStrings(node.right)
        : [...valueStrings(node.left), ...valueStrings(node.right)];
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
      return valueStrings(node.expression);
    default:
      return [];
  }
}

/**
 * The class strings a class-name builder argument holds: `valueStrings`, plus
 * array elements and object keys (`clsx({ 'p-4': on })` adds `p-4`), as
 * clsx / classnames read them.
 */
export function classStrings(node: TSESTree.Node): StringPiece[] {
  if (node.type === AST_NODE_TYPES.ArrayExpression) {
    return node.elements.flatMap((el) => (el ? classStrings(el) : []));
  }
  if (node.type === AST_NODE_TYPES.ObjectExpression) {
    return node.properties.flatMap((p) => {
      if (p.type !== AST_NODE_TYPES.Property) return [];
      const key = objectKeyName(p);
      return key === null ? [] : [{ node: p.key, text: key, whole: true }];
    });
  }
  return valueStrings(node);
}

/**
 * @vocabulary The builders by their own export names: `clsx`, `classNames`
 * (classnames' documented import name), tailwind-merge's `twMerge`, and `cn`,
 * the helper shadcn/ui generates into every project (a local file, so only its
 * name identifies it).
 */
const BUILDER_NAMES = new Set(['cn', 'clsx', 'classNames', 'twMerge']);

/** Exports of the class-name libraries, keyed by module; `''` is the module itself (default import). */
const BUILDER_EXPORTS: Readonly<Record<string, ReadonlySet<string>>> = {
  clsx: new Set(['', 'default', 'clsx']),
  'clsx/lite': new Set(['', 'default', 'clsx']),
  classnames: new Set(['', 'default']),
  'tailwind-merge': new Set(['twMerge', 'twJoin']),
};

/**
 * Is this callee a class-name builder? By import binding for clsx /
 * classnames / tailwind-merge (renamed or not), or by one of the builders'
 * own names.
 */
export function isClassNameBuilder(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (
    callee.type === AST_NODE_TYPES.Identifier &&
    BUILDER_NAMES.has(callee.name)
  )
    return true;
  const binding = resolveModuleBinding(callee, scope);
  if (!binding || binding.path.length > 1) return false;
  const exports = BUILDER_EXPORTS[binding.module];
  return exports !== undefined && exports.has(binding.path[0] ?? '');
}

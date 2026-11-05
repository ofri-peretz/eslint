/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The static value of a JSX attribute, however it is spelled.
 *
 * `checked`, `checked={true}`, `type="checkbox"`, `type={"checkbox"}`,
 * `` type={`checkbox`} `` and `type={flag ? "checkbox" : "checkbox"}` each
 * state one value; `value={undefined}` states that the prop is absent (React
 * treats an `undefined` prop as not passed). Anything the file cannot know is
 * `DYNAMIC`.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

/** A value the source does not state. */
export const DYNAMIC: unique symbol = Symbol('dynamic');

export type StaticValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | bigint
  | RegExp
  | typeof DYNAMIC;

/** The static value of an expression, or `DYNAMIC`. */
export function expressionValue(node: TSESTree.Node): StaticValue {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return node.value;
    case AST_NODE_TYPES.TemplateLiteral:
      return node.expressions.length === 0
        ? node.quasis[0].value.cooked
        : DYNAMIC;
    case AST_NODE_TYPES.Identifier:
      return node.name === 'undefined' ? undefined : DYNAMIC;
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
      return expressionValue(node.expression);
    case AST_NODE_TYPES.ConditionalExpression: {
      const a = expressionValue(node.consequent);
      return a === expressionValue(node.alternate) ? a : DYNAMIC;
    }
    default:
      return DYNAMIC;
  }
}

/**
 * The static value of an attribute: `true` for a bare `checked`, the value of
 * a literal or a braced static expression, else `DYNAMIC`.
 */
export function attributeValue(attr: TSESTree.JSXAttribute): StaticValue {
  const { value } = attr;
  if (value === null) return true;
  if (value.type === AST_NODE_TYPES.Literal) return value.value;
  if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
    return value.expression.type === AST_NODE_TYPES.JSXEmptyExpression
      ? DYNAMIC
      : expressionValue(value.expression);
  }
  return DYNAMIC;
}

/** The attribute named `name` (exact, as JSX spells it), if written. */
export function findAttribute(
  opening: TSESTree.JSXOpeningElement,
  name: string,
): TSESTree.JSXAttribute | undefined {
  return opening.attributes.find(
    (a): a is TSESTree.JSXAttribute =>
      a.type === AST_NODE_TYPES.JSXAttribute &&
      a.name.type === AST_NODE_TYPES.JSXIdentifier &&
      a.name.name === name,
  );
}

/** Does the element spread an object (`{...rest}`) that may carry any prop? */
export function hasSpread(opening: TSESTree.JSXOpeningElement): boolean {
  return opening.attributes.some(
    (a) => a.type === AST_NODE_TYPES.JSXSpreadAttribute,
  );
}

/**
 * Is the prop passed with a value React keeps? Absent, `{undefined}` and
 * `{null}` are not passed; a dynamic value may be, so it counts as passed.
 */
export function isPassed(attr: TSESTree.JSXAttribute | undefined): boolean {
  if (!attr) return false;
  const v = attributeValue(attr);
  return v !== undefined && v !== null;
}

/**
 * Is a boolean prop set? Absent and a static falsy value are not; a bare
 * attribute, a static truthy value or a dynamic one are (`readOnly={flag}`
 * may well be set, so it never proves the prop off).
 */
export function isSetTruthy(attr: TSESTree.JSXAttribute | undefined): boolean {
  if (!attr) return false;
  const v = attributeValue(attr);
  return v === DYNAMIC || Boolean(v);
}

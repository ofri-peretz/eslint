/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The static value of a JSX attribute, however it is spelled.
 *
 * `role="button"`, `role={"button"}`, `` role={`button`} `` and
 * `role={flag ? "button" : "button"}` all write the same value; `tabIndex={1}`
 * and `tabIndex="1"` too. A rule that reads only the plain string spelling
 * misses the rest, and the braced number is how React code usually writes
 * `tabIndex`.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, staticString } from '@interlace/eslint-devkit';

/** Marks a value the file cannot know: an identifier, a call, a member read. */
export const DYNAMIC = Symbol('dynamic');

/**
 * The static value an expression evaluates to, as a string; `undefined` for
 * the literal `undefined` / `null` (nothing is rendered); `DYNAMIC` otherwise.
 */
function expressionValue(
  node: TSESTree.Expression | TSESTree.JSXEmptyExpression,
): string | undefined | typeof DYNAMIC {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return node.value === null ? undefined : String(node.value);
    case AST_NODE_TYPES.TemplateLiteral:
      // devkit's `staticString`: a template with no expressions, else null.
      return staticString(node) ?? DYNAMIC;
    case AST_NODE_TYPES.Identifier:
      return node.name === 'undefined' ? undefined : DYNAMIC;
    case AST_NODE_TYPES.UnaryExpression:
      if (
        node.operator === '-' &&
        node.argument.type === AST_NODE_TYPES.Literal &&
        typeof node.argument.value === 'number'
      ) {
        return String(-node.argument.value);
      }
      return DYNAMIC;
    case AST_NODE_TYPES.ConditionalExpression: {
      const a = expressionValue(node.consequent);
      const b = expressionValue(node.alternate);
      return a === b ? a : DYNAMIC;
    }
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
      return expressionValue(node.expression);
    default:
      return DYNAMIC;
  }
}

/**
 * The value of an attribute:
 *
 *   - a string when it is static (a bare attribute is `"true"`, as React
 *     renders it),
 *   - `undefined` when it renders nothing (`{undefined}`, `{null}`),
 *   - `DYNAMIC` when the file cannot know it.
 */
export function attributeValue(
  attr: TSESTree.JSXAttribute,
): string | undefined | typeof DYNAMIC {
  const value = attr.value;
  if (value === null) return 'true';
  if (value.type === AST_NODE_TYPES.Literal) return String(value.value);
  if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
    return expressionValue(value.expression);
  }
  return DYNAMIC;
}

/** The static string value of an attribute, or `null` when it has none. */
export function staticAttributeValue(
  attr: TSESTree.JSXAttribute | undefined | null,
): string | null {
  if (!attr) return null;
  const v = attributeValue(attr);
  return typeof v === 'string' ? v : null;
}

/** The attribute named `name` on an opening element (case-sensitive). */
export function findAttribute(
  node: TSESTree.JSXOpeningElement,
  name: string,
): TSESTree.JSXAttribute | undefined {
  return node.attributes.find(
    (a): a is TSESTree.JSXAttribute =>
      a.type === AST_NODE_TYPES.JSXAttribute &&
      a.name.type === AST_NODE_TYPES.JSXIdentifier &&
      a.name.name === name,
  );
}

/** An intrinsic (DOM) element: a lowercase plain name, not a component. */
export function intrinsicName(node: TSESTree.JSXOpeningElement): string | null {
  return node.name.type === AST_NODE_TYPES.JSXIdentifier &&
    /^[a-z]/.test(node.name.name)
    ? node.name.name
    : null;
}

/**
 * Whether an attribute gives a value: a dynamic value counts (the file cannot
 * prove it empty), a static one must be non-blank, `{undefined}` gives none.
 * A bare string attribute (`<iframe title />`) gives none either: React does
 * not render `true` for an attribute that takes text.
 */
export function givesValue(
  attr: TSESTree.JSXAttribute | undefined | null,
): boolean {
  if (!attr || attr.value === null) return false;
  const v = attributeValue(attr);
  return v === DYNAMIC || (typeof v === 'string' && v.trim() !== '');
}

/** Whether an element is hidden from assistive technology by a static `aria-hidden`. */
export function isAriaHidden(node: TSESTree.JSXOpeningElement): boolean {
  return staticAttributeValue(findAttribute(node, 'aria-hidden')) === 'true';
}

/** `{true}` / `{false}`: React renders nothing for a boolean child. */
const isBooleanLiteral = (e: TSESTree.Expression): boolean =>
  e.type === AST_NODE_TYPES.Literal && (e.value === true || e.value === false);

/**
 * Whether any child renders content assistive technology reads: non-blank
 * text, an expression that is not `{undefined}` / `{null}` / a boolean / a
 * blank string, or an element not hidden by `aria-hidden`. A component child
 * or an expression the file cannot see counts as content.
 */
export function hasAccessibleChild(children: TSESTree.JSXChild[]): boolean {
  return children.some((child) => {
    switch (child.type) {
      case AST_NODE_TYPES.JSXText:
        return child.value.trim() !== '';
      case AST_NODE_TYPES.JSXExpressionContainer: {
        const e = child.expression;
        if (e.type === AST_NODE_TYPES.JSXEmptyExpression) return false;
        if (isBooleanLiteral(e)) return false;
        const v = expressionValue(e);
        return v === DYNAMIC || (v !== undefined && v.trim() !== '');
      }
      case AST_NODE_TYPES.JSXElement:
        return !isAriaHidden(child.openingElement);
      case AST_NODE_TYPES.JSXFragment:
        return hasAccessibleChild(child.children);
      default:
        return false;
    }
  });
}

/** Implicit role of `<input>` by its `type` (HTML-AAM). */
const INPUT_ROLES: Record<string, string> = {
  button: 'button',
  checkbox: 'checkbox',
  email: 'textbox',
  image: 'button',
  number: 'spinbutton',
  radio: 'radio',
  range: 'slider',
  reset: 'button',
  search: 'searchbox',
  submit: 'button',
  tel: 'textbox',
  text: 'textbox',
  url: 'textbox',
};

/**
 * The implicit role of an `<input>` (HTML-AAM): it follows `type` (a missing
 * `type` is text), and a `list` turns the text types into a combobox. `''`
 * when the type has no ARIA role (date, color, file, hidden...) or the file
 * cannot know the type.
 */
export function inputImplicitRole(node: TSESTree.JSXOpeningElement): string {
  const typeAttr = findAttribute(node, 'type');
  const type = typeAttr ? staticAttributeValue(typeAttr) : 'text';
  if (type === null) return '';
  const role = INPUT_ROLES[type.toLowerCase()] ?? '';
  if (
    (role === 'textbox' || role === 'searchbox') &&
    findAttribute(node, 'list')
  ) {
    return 'combobox';
  }
  return role;
}

/**
 * The value a rule may judge on `element`.
 *
 * An intrinsic element is read in every static spelling. A component's prop
 * may never reach the DOM as written, so a finding on it is a guess: such
 * findings stay where they were (the plain string spelling, `role="x"`) and
 * are not extended to `{"x"}`, templates or conditionals.
 */
export function judgedValue(
  element: TSESTree.JSXOpeningElement,
  attr: TSESTree.JSXAttribute | undefined | null,
): string | null {
  if (!attr) return null;
  if (intrinsicName(element) !== null) return staticAttributeValue(attr);
  return attr.value?.type === AST_NODE_TYPES.Literal
    ? String(attr.value.value)
    : null;
}

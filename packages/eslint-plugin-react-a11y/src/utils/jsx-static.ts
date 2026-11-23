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
import {
  AST_NODE_TYPES,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';

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
 * Whether an opening element spreads an object into its props
 * (`<input {...props} />`). The label/control/aria-label rules this is used
 * by can only see the attributes written at the call site; a spread may carry
 * the very prop (`label`, `aria-label`, `htmlFor`, children-equivalents) whose
 * absence they would otherwise report, so none of them can prove it missing.
 * Upstream jsx-a11y skips an element with a spread attribute for the same
 * reason (#1563).
 */
export function hasSpreadAttribute(node: TSESTree.JSXOpeningElement): boolean {
  return node.attributes.some(
    (attr) => attr.type === AST_NODE_TYPES.JSXSpreadAttribute,
  );
}

/**
 * Whether a JSX element is passed as the VALUE of a JSX attribute
 * (`<Button render={<a href="/docs" />}>`, an `asChild` slot). Such an
 * element is a prop the parent component may clone with its own children —
 * base-ui/Radix's `render`/`asChild` pattern — so it is not rendered as
 * written, and a rule checking its content/label would be checking an
 * element the DOM never actually sees in that shape (#1562).
 */
export function isJsxAttributeValue(node: TSESTree.JSXElement): boolean {
  const parent = node.parent;
  return (
    parent?.type === AST_NODE_TYPES.JSXExpressionContainer &&
    parent.parent?.type === AST_NODE_TYPES.JSXAttribute
  );
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

/**
 * A comparable key for an attribute value that is the same expression in two
 * places: a static string, or a template literal / identifier / property chain
 * built from the same parts. `null` when the value is anything else (a call, a
 * computed member...), which cannot be shown equal by reading it.
 */
function valueKey(node: TSESTree.Node): string | null {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return typeof node.value === 'string' ? `s:${node.value}` : null;
    case AST_NODE_TYPES.Identifier:
      return `i:${node.name}`;
    case AST_NODE_TYPES.ThisExpression:
      return 'this';
    case AST_NODE_TYPES.MemberExpression: {
      const name = propertyName(node);
      const object = name === null ? null : valueKey(node.object);
      return object === null ? null : `${object}.${name}`;
    }
    case AST_NODE_TYPES.TemplateLiteral: {
      let key = 't:';
      for (const [index, quasi] of node.quasis.entries()) {
        key += quasi.value.cooked;
        const expression = node.expressions[index];
        if (expression !== undefined) {
          const part = valueKey(expression);
          if (part === null) return null;
          key += `\${${part}}`;
        }
      }
      // A template with no expression is the plain string it spells.
      return node.expressions.length === 0 ? `s:${key.slice(2)}` : key;
    }
    default:
      return null;
  }
}

/** The comparable key of a JSX attribute's value, or `null`. */
function attributeKey(attr: TSESTree.JSXAttribute | undefined): string | null {
  const value = attr?.value;
  if (value === null || value === undefined) return null;
  if (value.type === AST_NODE_TYPES.Literal) return valueKey(value);
  // An empty `{}` is a JSXEmptyExpression, which `valueKey` reads as no key.
  return value.type === AST_NODE_TYPES.JSXExpressionContainer
    ? valueKey(value.expression)
    : null;
}

const isFunctionNode = (node: TSESTree.Node): boolean =>
  node.type === AST_NODE_TYPES.FunctionDeclaration ||
  node.type === AST_NODE_TYPES.FunctionExpression ||
  node.type === AST_NODE_TYPES.ArrowFunctionExpression;

/** Does any `<label htmlFor={key}>` with readable content sit under `root`, outside nested functions? */
function containsLabelFor(root: TSESTree.Node, key: string): boolean {
  const stack: TSESTree.Node[] = [root];
  while (stack.length > 0) {
    const current = stack.pop() as TSESTree.Node;
    if (
      current.type === AST_NODE_TYPES.JSXElement &&
      current.openingElement.name.type === AST_NODE_TYPES.JSXIdentifier &&
      current.openingElement.name.name === 'label' &&
      attributeKey(findAttribute(current.openingElement, 'htmlFor')) === key &&
      hasAccessibleChild(current.children)
    ) {
      return true;
    }
    for (const [name, child] of Object.entries(current)) {
      if (name === 'parent' || typeof child !== 'object' || child === null)
        continue;
      for (const item of Array.isArray(child) ? child : [child]) {
        if (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as TSESTree.Node).type === 'string' &&
          !isFunctionNode(item as TSESTree.Node)
        ) {
          stack.push(item as TSESTree.Node);
        }
      }
    }
  }
  return false;
}

/**
 * Whether the control is named by a `<label htmlFor>` whose value is the same
 * as the control's `id` — a static string, or the same template / identifier /
 * property chain written twice (`id={`field-${id}`}` and
 * `htmlFor={`field-${id}`}`). The label has to have content and sit in the same
 * JSX tree as the control, in the same function: a label in another function
 * could see a different `id`.
 */
export function isNamedByLabelFor(node: TSESTree.JSXOpeningElement): boolean {
  const key = attributeKey(findAttribute(node, 'id'));
  if (key === null) return false;
  let root: TSESTree.Node = node.parent;
  for (
    let current: TSESTree.Node | undefined = node.parent;
    current && !isFunctionNode(current);
    current = current.parent
  ) {
    if (current.type === AST_NODE_TYPES.JSXElement) root = current;
  }
  return containsLabelFor(root, key);
}

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-missing-aria-labels
 * Detects elements missing ARIA labels
 *
 * @see https://www.w3.org/WAI/ARIA/apg/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  objectKeyName,
  staticString,
} from '@interlace/eslint-devkit';
import {
  attributeValue,
  findAttribute,
  givesValue,
  hasSpreadAttribute,
  intrinsicName,
  isAriaHidden,
  isNamedByLabelFor,
  staticAttributeValue,
} from '../utils/jsx-static';

type MessageIds = 'missingAriaLabel';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;

  /** Elements that require ARIA labels. Default: ['button', 'input', 'select', 'textarea'] */
  requireLabels?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if element has ARIA label
 */
function hasAriaLabel(node: TSESTree.JSXOpeningElement): boolean {
  // title also provides an accessible name. An empty or undefined value
  // names nothing (accname 1.2 skips empty strings).
  return ['aria-label', 'aria-labelledby', 'title'].some((name) => {
    const attr = findAttribute(node, name);
    if (!attr) return false;
    const value = attributeValue(attr);
    return (
      value !== undefined && (typeof value !== 'string' || value.trim() !== '')
    );
  });
}

/** Whether a <label> element wraps the node (HTML: it labels its control). */
function insideLabel(node: TSESTree.JSXOpeningElement): boolean {
  for (
    let n: TSESTree.Node | undefined = node.parent?.parent;
    n;
    n = n.parent
  ) {
    if (
      n.type === 'JSXElement' &&
      n.openingElement.name.type === 'JSXIdentifier' &&
      n.openingElement.name.name === 'label'
    )
      return true;
  }
  return false;
}

/** input types that need no name: hidden is not rendered, submit/reset have a default one (HTML-AAM). */
const UNNAMED_INPUT_TYPES = new Set(['hidden', 'submit', 'reset']);

const UNKNOWN = Symbol('unknown');

/** The value an operand provably has (`null`, `"x"`, `undefined`, `void 0`), else UNKNOWN. */
function staticValue(
  expr: TSESTree.Expression,
): string | number | bigint | boolean | RegExp | null | undefined | symbol {
  switch (expr.type) {
    case AST_NODE_TYPES.Literal:
      return expr.value;
    case AST_NODE_TYPES.Identifier:
      return expr.name === 'undefined' ? undefined : UNKNOWN;
    case AST_NODE_TYPES.UnaryExpression:
      return expr.operator === 'void' ? undefined : UNKNOWN;
    case AST_NODE_TYPES.TemplateLiteral:
      return staticString(expr) ?? UNKNOWN;
    default:
      return UNKNOWN;
  }
}

/**
 * Whether an expression can render visible text. Like upstream
 * eslint-plugin-jsx-a11y, any expression child counts (`{t('save')}`,
 * `{label ?? 'Back'}`, `` {`${n} items`} ``, `{props.title}`) except one the
 * file proves renders nothing: `undefined`, `null`, `void 0`, a boolean, a
 * blank string, an element (`{<Icon />}`), or a conditional or logical
 * expression whose every possible result is one of those (#1563).
 */
function isTextLikeExpression(
  expr: TSESTree.Expression | TSESTree.JSXEmptyExpression,
): boolean {
  switch (expr.type) {
    case AST_NODE_TYPES.JSXEmptyExpression:
    case AST_NODE_TYPES.JSXElement:
    case AST_NODE_TYPES.JSXFragment:
      return false;
    case AST_NODE_TYPES.Literal:
      return typeof expr.value === 'string'
        ? expr.value.trim() !== ''
        : typeof expr.value === 'number' || typeof expr.value === 'bigint';
    case AST_NODE_TYPES.TemplateLiteral: {
      const text = staticString(expr);
      return text === null || text.trim() !== '';
    }
    case AST_NODE_TYPES.Identifier:
      return expr.name !== 'undefined';
    case AST_NODE_TYPES.UnaryExpression:
      // `!x` is a boolean, `delete x` a boolean, `void x` undefined: none
      // renders. `-x`, `+x`, `~x` and `typeof x` render a number or string.
      return !['!', 'delete', 'void'].includes(expr.operator);
    case AST_NODE_TYPES.ConditionalExpression:
      return (
        isTextLikeExpression(expr.consequent) ||
        isTextLikeExpression(expr.alternate)
      );
    case AST_NODE_TYPES.LogicalExpression: {
      const left = staticValue(expr.left);
      if (left !== UNKNOWN) {
        // A statically known left operand decides which side renders.
        const rendersRight =
          expr.operator === '&&'
            ? Boolean(left)
            : expr.operator === '||'
              ? !left
              : left === null || left === undefined;
        return isTextLikeExpression(rendersRight ? expr.right : expr.left);
      }
      // `cond && x` renders x or nothing: the guard is never the text.
      return expr.operator === '&&'
        ? isTextLikeExpression(expr.right)
        : isTextLikeExpression(expr.left) || isTextLikeExpression(expr.right);
    }
    case AST_NODE_TYPES.TSAsExpression:
    case AST_NODE_TYPES.TSSatisfiesExpression:
    case AST_NODE_TYPES.TSNonNullExpression:
      return isTextLikeExpression(expr.expression);
    default:
      return true;
  }
}

/**
 * An intrinsic `<img>` / `<area>` with an `alt` is named by it, so as a child
 * it contributes its `alt` to the parent's accessible name
 * (`<button><img alt="Save" /></button>`). Same `givesValue` semantics as
 * `hasAccessibleChild` and control-has-associated-label: a static blank or
 * missing `alt` gives no name, a dynamic `alt={x}` counts (the file cannot
 * prove it empty).
 */
function isNamedByAlt(opening: TSESTree.JSXOpeningElement): boolean {
  const name = intrinsicName(opening);
  if (name !== 'img' && name !== 'area') return false;
  const alt = findAttribute(opening, 'alt');
  // React renders no `alt` for a boolean (`alt={false}`, `alt={true}`), but
  // givesValue stringifies it; a string `alt="false"` still names the image.
  if (
    alt?.value?.type === 'JSXExpressionContainer' &&
    alt.value.expression.type === 'Literal' &&
    typeof alt.value.expression.value === 'boolean'
  )
    return false;
  return givesValue(alt);
}

/** Inline style declarations that remove an element from the accessibility tree. */
const HIDING_STYLES = new Map([
  ['display', 'none'],
  ['visibility', 'hidden'],
]);

/**
 * Statically hidden from the accessibility tree (accname 1.2: hidden content
 * contributes no name): `aria-hidden="true"`, the `hidden` attribute, or an
 * inline `style={{ display: 'none' }}` / `{{ visibility: 'hidden' }}`.
 */
function isStaticallyHidden(opening: TSESTree.JSXOpeningElement): boolean {
  if (isAriaHidden(opening)) return true;
  const hiddenAttr = findAttribute(opening, 'hidden');
  if (
    hiddenAttr &&
    (hiddenAttr.value === null || staticAttributeValue(hiddenAttr) === 'true')
  )
    return true;
  const style = findAttribute(opening, 'style')?.value;
  if (
    style?.type !== 'JSXExpressionContainer' ||
    style.expression.type !== 'ObjectExpression'
  )
    return false;
  return style.expression.properties.some(
    (prop) =>
      prop.type === 'Property' &&
      prop.value.type === 'Literal' &&
      HIDING_STYLES.get(objectKeyName(prop) ?? '') === prop.value.value,
  );
}

/** Returns true if any direct JSX child provides visible text content. */
function hasTextContent(
  jsxElement: TSESTree.JSXElement,
  deep: boolean,
): boolean {
  return jsxElement.children.some((child) => {
    if (child.type === 'JSXText') return child.value.trim().length > 0;
    // {expression} containers: only expressions that plausibly render as
    // visible text are exempted. A JSXElement (e.g. {<Icon />}) has no
    // accessible name of its own; React also renders booleans/null/undefined
    // as nothing, so a literal like {true} or {null} isn't text content
    // either. Calls, members and templates may render text, so they count.
    if (
      child.type === 'JSXExpressionContainer' &&
      isTextLikeExpression(child.expression)
    )
      return true;
    // `<button><span>Sign in</span></button>`: the name is the text of the
    // descendants a screen reader reads, so look through elements that are
    // not hidden from it.
    // Only a button is named by its content: a <select>'s options are its
    // choices, not its name.
    if (!deep) return false;
    if (child.type === 'JSXElement')
      return (
        !isStaticallyHidden(child.openingElement) &&
        (isNamedByAlt(child.openingElement) || hasTextContent(child, deep))
      );
    if (child.type === 'JSXFragment')
      return hasTextContent(child as unknown as TSESTree.JSXElement, deep);
    return false;
  });
}

export const noMissingAriaLabels = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-aria-labels',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/no-missing-aria-labels.md',
      description: 'Detects elements missing ARIA labels',
      wcag: 'WCAG 4.1.2',
    },
    messages: {
      missingAriaLabel: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing ARIA label',
        description: '{{element}} missing ARIA label',
        severity: 'MEDIUM',
        fix: 'Add aria-label or aria-labelledby attribute',
        documentationLink: 'https://www.w3.org/WAI/ARIA/apg/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          requireLabels: {
            type: 'array',
            items: { type: 'string' },
            default: ['button', 'input', 'select', 'textarea'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      requireLabels: ['button', 'input', 'select', 'textarea'],
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let ignoreInTests: boolean;
    let requireLabels: string[];

    /**
     * Check JSX elements
     */
    function checkJSXElement(node: TSESTree.JSXOpeningElement) {
      if (node.name.type !== 'JSXIdentifier') {
        return;
      }

      const elementName = node.name.name;

      if (!requireLabels.includes(elementName)) {
        return;
      }

      // aria-label / aria-labelledby / title already provide an accessible name
      if (hasAriaLabel(node)) return;

      // The label a spread carries is invisible at the call site (#1563).
      if (hasSpreadAttribute(node)) return;

      if (elementName === 'input') {
        const type = staticAttributeValue(findAttribute(node, 'type'));
        if (type !== null && UNNAMED_INPUT_TYPES.has(type.trim().toLowerCase()))
          return;
      }

      // A wrapping <label> names the control inside it.
      if (insideLabel(node)) return;

      // Hidden from assistive technology: there is nothing to name.
      if (isAriaHidden(node)) return;

      // `<label htmlFor={x}>` naming a control whose `id` is the same `x`.
      if (isNamedByLabelFor(node)) return;

      // Text children (e.g. <button>Submit</button>) provide an accessible name
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node })
        .parent;
      if (
        parent?.type === 'JSXElement' &&
        hasTextContent(parent as TSESTree.JSXElement, elementName === 'button')
      )
        return;

      {
        context.report({
          node,
          messageId: 'missingAriaLabel',
          data: {
            element: elementName,
          },
        });
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        ({
          ignoreInTests = true,
          requireLabels = ['button', 'input', 'select', 'textarea'],
        } = options || {});

        const filename = context.filename;
        const isTestFile =
          ignoreInTests && /\.(test|spec)\.[cm]?[jt]sx?$/.test(filename);

        if (isTestFile) {
          return false;
        }
        return true;
      },
      JSXOpeningElement: checkJSXElement,
    };
  },
});

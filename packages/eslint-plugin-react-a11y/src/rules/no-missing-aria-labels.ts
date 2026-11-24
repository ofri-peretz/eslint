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
import { createRule } from '@interlace/eslint-devkit';
import {
  attributeValue,
  findAttribute,
  hasSpreadAttribute,
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

/**
 * Whether an expression plausibly renders as visible text on its own
 * (`{label}`, `{'Close'}`, `` {`Item ${n}`} ``, `{5}`), including a ternary
 * between two such expressions (`{on ? "Turn off" : "Turn on"}`) — every
 * branch of the conditional still resolves to text, so the element's
 * accessible name is text either way (#1563).
 */
function isTextLikeExpression(expr: TSESTree.Expression): boolean {
  if (
    expr.type === 'TemplateLiteral' ||
    expr.type === 'Identifier' ||
    (expr.type === 'Literal' &&
      (typeof expr.value === 'string' || typeof expr.value === 'number'))
  )
    return true;
  return (
    expr.type === 'ConditionalExpression' &&
    isTextLikeExpression(expr.consequent) &&
    isTextLikeExpression(expr.alternate)
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
    // either — only string/number literals (and ternaries between them) are.
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
      return !isAriaHidden(child.openingElement) && hasTextContent(child, deep);
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

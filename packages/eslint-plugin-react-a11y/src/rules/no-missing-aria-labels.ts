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
  return node.attributes.some(
    (attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute) =>
      attr.type === 'JSXAttribute' &&
      attr.name.type === 'JSXIdentifier' &&
      (attr.name.name === 'aria-label' ||
        attr.name.name === 'aria-labelledby' ||
        attr.name.name === 'title'),   // title also provides an accessible name
  );
}

/** Returns true if any direct JSX child provides visible text content. */
function hasTextContent(jsxElement: TSESTree.JSXElement): boolean {
  return jsxElement.children.some((child) => {
    if (child.type === 'JSXText') return child.value.trim().length > 0;
    // {expression} containers: only expressions that plausibly render as
    // visible text (e.g. {label}, {'Close'}, {`Item ${n}`}, {5}) are
    // exempted. A JSXElement (e.g. {<Icon />}) has no accessible name of
    // its own; React also renders booleans/null/undefined as nothing, so a
    // literal like {true} or {null} isn't text content either — only
    // string/number literals are.
    if (
      child.type === 'JSXExpressionContainer' &&
      (child.expression.type === 'TemplateLiteral' ||
        child.expression.type === 'Identifier' ||
        (child.expression.type === 'Literal' &&
          (typeof child.expression.value === 'string' || typeof child.expression.value === 'number')))
    )
      return true;
    return false;
  });
}

export const noMissingAriaLabels = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-aria-labels',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/no-missing-aria-labels.md',
      description: 'Detects elements missing ARIA labels',
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true,
      requireLabels = ['button', 'input', 'select', 'textarea'],
    
}: Options = options || {};

    const filename = context.filename;
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

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

      // Text children (e.g. <button>Submit</button>) provide an accessible name
      const parent = (node as TSESTree.Node & { parent?: TSESTree.Node }).parent;
      if (parent?.type === 'JSXElement' && hasTextContent(parent as TSESTree.JSXElement)) return;

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
      JSXOpeningElement: checkJSXElement,

    };
  },
});


/**
 * ESLint Rule: control-has-associated-label
 * Enforce that controls (interactive elements) have associated labels
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/control-has-associated-label.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'missingLabel';

type Options = {
  labelAttributes?: string[];
  controlComponents?: string[];
  ignoreElements?: string[];
  ignoreRoles?: string[];
  depth?: number;
};

type RuleOptions = [Options?];

const DEFAULT_IGNORE_ELEMENTS = [
  'audio', 'canvas', 'embed', 'tr', 'video'
];

const DEFAULT_IGNORE_ROLES = [
  'grid', 'listbox', 'menu', 'menubar', 'radiogroup', 'row', 'tablist', 'toolbar', 'tree', 'treegrid'
];

/**
 * Check if element has accessible text content
 */
function hasAccessibleText(node: TSESTree.JSXElement, depth: number, labelAttributes: string[]): boolean {
  // Check aria-label
  const ariaLabel = node.openingElement.attributes.find(attr =>
    attr.type === 'JSXAttribute' &&
    attr.name.type === 'JSXIdentifier' &&
    attr.name.name === 'aria-label'
  );

  if (ariaLabel && ariaLabel.type === 'JSXAttribute' && ariaLabel.value) return true;

  // Check aria-labelledby
  const ariaLabelledby = node.openingElement.attributes.find(attr =>
    attr.type === 'JSXAttribute' &&
    attr.name.type === 'JSXIdentifier' &&
    attr.name.name === 'aria-labelledby'
  );

  if (ariaLabelledby && ariaLabelledby.type === 'JSXAttribute' && ariaLabelledby.value) return true;

  // Check custom label attributes
  for (const attr of labelAttributes) {
    const labelAttr = node.openingElement.attributes.find(a =>
      a.type === 'JSXAttribute' &&
      a.name.type === 'JSXIdentifier' &&
      a.name.name === attr
    );

    if (labelAttr && labelAttr.type === 'JSXAttribute' && labelAttr.value) return true;
  }

  // For img elements and input type="image", check alt
  if (node.openingElement.name.type === 'JSXIdentifier') {
    if (node.openingElement.name.name === 'img') {
      const altAttr = node.openingElement.attributes.find(attr =>
        attr.type === 'JSXAttribute' &&
        attr.name.type === 'JSXIdentifier' &&
        attr.name.name === 'alt'
      );

      if (altAttr && altAttr.type === 'JSXAttribute' && altAttr.value) return true;
    } else if (node.openingElement.name.name === 'input') {
      // Check if it's an image input with alt
      const typeAttr = node.openingElement.attributes.find(attr =>
        attr.type === 'JSXAttribute' &&
        attr.name.type === 'JSXIdentifier' &&
        attr.name.name === 'type'
      );

      if (typeAttr && typeAttr.type === 'JSXAttribute' && typeAttr.value && typeAttr.value.type === 'Literal' && typeAttr.value.value === 'image') {
        const altAttr = node.openingElement.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'alt'
        );

        if (altAttr && altAttr.type === 'JSXAttribute' && altAttr.value) return true;
      }
    }
  }

  // Check text content in children (up to specified depth)
  return hasTextInChildren(node.children, depth);
}

/**
 * Check if children contain text content
 */
function hasTextInChildren(children: TSESTree.JSXChild[], depth: number): boolean {
  if (depth <= 0) return false;

  for (const child of children) {
    if (child.type === 'JSXText') {
      if (child.value.trim()) return true;
    } else if (child.type === 'JSXElement') {
      if (hasAccessibleText(child, depth - 1, [])) return true;
    } else if (child.type === 'JSXExpressionContainer') {
      // Assume expressions might contain labels
      return true;
    }
  }

  return false;
}

/**
 * Check if element is a control component
 */
function isControlComponent(elementName: string, controlComponents: string[]): boolean {
  const controls = ['button', 'input', 'select', 'textarea', 'a', ...controlComponents];
  return controls.includes(elementName);
}

/**
 * Check if element has an interactive role
 */
function hasInteractiveRole(node: TSESTree.JSXOpeningElement, ignoreRoles: string[]): boolean {
  const roleAttr = node.attributes.find(attr =>
    attr.type === 'JSXAttribute' &&
    attr.name.type === 'JSXIdentifier' &&
    attr.name.name === 'role'
  );

  if (!roleAttr || roleAttr.type !== 'JSXAttribute' || !roleAttr.value || roleAttr.value.type !== 'Literal') return false;

  const role = roleAttr.value.value;
  if (typeof role !== 'string') return false;

  // Interactive roles that require labels
  const interactiveRoles = [
    'button', 'checkbox', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
    'option', 'radio', 'switch', 'tab', 'textbox', 'combobox', 'listbox', 'searchbox',
    'slider', 'spinbutton', 'progressbar'
  ];

  return interactiveRoles.includes(role) && !ignoreRoles.includes(role);
}

export const controlHasAssociatedLabel = createRule<RuleOptions, MessageIds>({
  name: 'control-has-associated-label',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that controls (interactive elements) have associated labels',
    },
    messages: {
      missingLabel: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Control Missing Label',
        description: '<{{element}}> must have an accessible label',
        severity: 'HIGH',
        fix: 'Add text content, aria-label, or aria-labelledby',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/control-has-associated-label.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          labelAttributes: { type: 'array', items: { type: 'string' } },
          controlComponents: { type: 'array', items: { type: 'string' } },
          ignoreElements: { type: 'array', items: { type: 'string' } },
          ignoreRoles: { type: 'array', items: { type: 'string' } },
          depth: { type: 'integer', minimum: 1, maximum: 25 },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      labelAttributes = [],
      controlComponents = [],
      ignoreElements = DEFAULT_IGNORE_ELEMENTS,
      ignoreRoles = DEFAULT_IGNORE_ROLES,
      depth = 2,
    } = options || {};

    return {
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;

        if (openingElement.name.type !== 'JSXIdentifier') return;

        const elementName = openingElement.name.name;

        // Skip ignored elements
        if (ignoreElements.includes(elementName)) return;

        // Check if it's a control component or has interactive role
        const isControl = isControlComponent(elementName, controlComponents);
        const hasInteractiveRoleAttr = hasInteractiveRole(openingElement, ignoreRoles);

        if (!isControl && !hasInteractiveRoleAttr) return;

        // Check if it has accessible text
        if (!hasAccessibleText(node, depth, labelAttributes)) {
          context.report({
            node: openingElement,
            messageId: 'missingLabel',
            data: {
              element: elementName,
            },
          });
        }
      },
    };
  },
});


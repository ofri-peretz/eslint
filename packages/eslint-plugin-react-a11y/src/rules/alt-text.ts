/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: alt-text
 * Enforce alt text on images with user impact context
 * Matches jsx-a11y naming convention
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'missingAlt'
  | 'emptyAlt'
  | 'addDescriptiveAlt'
  | 'useEmptyAlt'
  | 'preferEmptyAltOverPresentation'
  | 'objectMissingAlternative'
  | 'areaMissingAlternative'
  | 'inputImageMissingAlternative';

export interface Options {
  /** Allow aria-label as alternative to alt text. Default: false */
  allowAriaLabel?: boolean;

  /** Allow aria-labelledby as alternative to alt text. Default: false */
  allowAriaLabelledby?: boolean;

  /**
   * Custom component names that should be checked as `<img>` (next/image,
   * Chakra Image, MUI Avatar, framework-specific components). Without this
   * the rule misses every React project that wraps native img — which is
   * most of them. Mirrors the `img: [...]` option in eslint-plugin-jsx-a11y.
   */
  img?: string[];

  /** Custom components checked as `<object>`. */
  object?: string[];

  /** Custom components checked as `<area>`. */
  area?: string[];

  /** Custom components checked as `<input type="image">`. */
  inputImage?: string[];
}

type RuleOptions = [Options?];

/**
 * Anchor node after which ` alt="…"` gets inserted by the autofix/suggestions:
 * the last attribute when one exists, else the element name itself.
 */
export const getAltInsertionAnchor = (
  node: TSESTree.JSXOpeningElement
): TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute | TSESTree.JSXTagNameExpression =>
  node.attributes[node.attributes.length - 1] || node.name;

export const altText = createRule<RuleOptions, MessageIds>({
  name: 'alt-text',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/alt-text.md',
      description: 'Enforce alt text on images with accessibility impact context',
      cwe: 'CWE-252',
      cvss: 9.5,
      confidence: 'high',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      // 🎯 Token optimization: 45% reduction (51→28 tokens) - image alt text improves accessibility
      missingAlt: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Image missing alt text',
        cwe: 'CWE-252',
        description: 'Image missing alt text',
        severity: 'CRITICAL',
        fix: 'Add alt="Descriptive text about image"',
        documentationLink: 'https://www.w3.org/WAI/tutorials/images/',
      }),
      emptyAlt: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Empty Alt Text',
        description: 'Empty alt text detected',
        severity: 'LOW',
        fix: 'Consider: {{consideration}}',
        documentationLink: 'https://www.w3.org/WAI/tutorials/images/decorative/',
      }),
      addDescriptiveAlt: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Descriptive Alt',
        description: 'Add descriptive alt text',
        severity: 'LOW',
        fix: 'alt="Descriptive text about image content"',
        documentationLink: 'https://www.w3.org/WAI/tutorials/images/informative/',
      }),
      useEmptyAlt: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Empty Alt',
        description: 'Use empty alt for decorative images',
        severity: 'LOW',
        fix: 'alt="" (for decorative images only)',
        documentationLink: 'https://www.w3.org/WAI/tutorials/images/decorative/',
      }),
      preferEmptyAltOverPresentation: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Prefer alt="" over role="presentation"',
        description: 'Image with role="presentation" should use alt="" instead. First rule of ARIA: do not use ARIA when native HTML can express the same intent.',
        severity: 'MEDIUM',
        fix: 'Replace role="presentation" with alt="" — the empty alt already marks the image as decorative.',
        documentationLink: 'https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/#1stnotuseit',
      }),
      objectMissingAlternative: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Embedded object missing text alternative',
        cwe: 'CWE-252',
        description: 'Embedded <object> elements must have alternative text via inner text, aria-label, aria-labelledby, or title.',
        severity: 'CRITICAL',
        fix: 'Add aria-label="..." or inner text describing the object content.',
        documentationLink: 'https://www.w3.org/WAI/WCAG21/Techniques/general/G94',
      }),
      areaMissingAlternative: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Image-map <area> missing text alternative',
        cwe: 'CWE-252',
        description: 'Each <area> in an image map must have a text alternative via alt, aria-label, or aria-labelledby.',
        severity: 'CRITICAL',
        fix: 'Add alt="region description" so screen-reader users can navigate the map.',
        documentationLink: 'https://www.w3.org/WAI/WCAG21/Techniques/html/H24',
      }),
      inputImageMissingAlternative: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: '<input type="image"> missing text alternative',
        cwe: 'CWE-252',
        description: '<input type="image"> elements must have a text alternative via alt, aria-label, or aria-labelledby — they act as buttons but render an image.',
        severity: 'CRITICAL',
        fix: 'Add alt="action description" (what does clicking this submit?).',
        documentationLink: 'https://www.w3.org/WAI/WCAG21/Techniques/html/H36',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowAriaLabel: { type: 'boolean', default: false },
          allowAriaLabelledby: { type: 'boolean', default: false },
          img: { type: 'array', items: { type: 'string' }, default: [] },
          object: { type: 'array', items: { type: 'string' }, default: [] },
          area: { type: 'array', items: { type: 'string' }, default: [] },
          inputImage: { type: 'array', items: { type: 'string' }, default: [] },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowAriaLabel: false,
      allowAriaLabelledby: false,
      img: [],
      object: [],
      area: [],
      inputImage: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowAriaLabel = false,
      allowAriaLabelledby = false,
      img: imgComponents = [],
      object: objectComponents = [],
      area: areaComponents = [],
      inputImage: inputImageComponents = [],
    }: Options = options;

    type Kind = 'img' | 'object' | 'area' | 'inputImage';

    /**
     * Map a JSX element name to a logical kind based on its tag and the
     * user's custom-component configuration. Mirrors jsx-a11y's element
     * classification — without this we miss every framework-specific image
     * component (next/image's <Image>, Chakra <Image>, MUI <Avatar>, etc.).
     */
    const classify = (node: TSESTree.JSXOpeningElement): Kind | null => {
      if (node.name.type !== 'JSXIdentifier') return null;
      const name = node.name.name;
      if (name === 'img' || imgComponents.includes(name)) return 'img';
      if (name === 'object' || objectComponents.includes(name)) return 'object';
      if (name === 'area' || areaComponents.includes(name)) return 'area';
      // <input type="image"> needs the type attribute check
      if (name === 'input' || inputImageComponents.includes(name)) {
        const typeAttr = getAttr(node, 'type');
        const typeVal = typeAttr ? getStringValue(typeAttr) : null;
        if (typeVal === 'image') return 'inputImage';
      }
      return null;
    };

    const getAttr = (node: TSESTree.JSXOpeningElement, name: string) =>
      node.attributes.find(
        (a): a is TSESTree.JSXAttribute =>
          a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && a.name.name === name
      );

    /** Returns the literal string value of an attribute, or null if dynamic / not a string. */
    // oxlint-disable-next-line consistent-function-scoping
    const getStringValue = (attr: TSESTree.JSXAttribute): string | null => {
      if (!attr.value) return ''; // <img alt /> — boolean-shorthand attribute
      if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
        return attr.value.value;
      }
      return null;
    };

    const hasNonEmptyAttr = (node: TSESTree.JSXOpeningElement, name: string): boolean => {
      const attr = getAttr(node, name);
      if (!attr) return false;
      const v = getStringValue(attr);
      // Non-string (dynamic expression like aria-label={x}) is "has a value" —
      // we can't statically verify but it's user intent. Match jsx-a11y here.
      if (v === null) return true;
      return v.length > 0;
    };

    /** True when the element has role="presentation" or role="none". */
    const hasPresentationRole = (node: TSESTree.JSXOpeningElement): boolean => {
      const attr = getAttr(node, 'role');
      if (!attr) return false;
      const v = getStringValue(attr);
      return v === 'presentation' || v === 'none';
    };

    /**
     * <object>foo</object> is OK because the inner text serves as the text
     * alternative. Walks the parent JSXElement's children for text or
     * non-empty JSX children.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const hasAccessibleChild = (
      node: TSESTree.JSXOpeningElement
    ): boolean => {
      const parent = node.parent;
      if (!parent || parent.type !== 'JSXElement') return false;
      return (parent.children || []).some((child) => {
        if (child.type === 'JSXText' && child.value.trim().length > 0) return true;
        if (child.type === 'JSXExpressionContainer' && child.expression?.type !== 'JSXEmptyExpression') return true;
        if (child.type === 'JSXElement') return true; // nested element is some content
        return false;
      });
    };

    /** Aria-label/-labelledby gate (used as fallback for img when allowed,
     * and for object/area/input-image which always accept aria as alternatives). */
    const hasAria = (node: TSESTree.JSXOpeningElement, requireOptIn: boolean): boolean => {
      if (requireOptIn && !allowAriaLabel && !allowAriaLabelledby) return false;
      const labelledOK = !requireOptIn || allowAriaLabel;
      const byOK = !requireOptIn || allowAriaLabelledby;
      return (labelledOK && hasNonEmptyAttr(node, 'aria-label')) ||
             (byOK && hasNonEmptyAttr(node, 'aria-labelledby'));
    };

    const checkImg = (node: TSESTree.JSXOpeningElement) => {
      const altAttr = getAttr(node, 'alt');

      // alt present in any form is acceptable: getStringValue is exhaustive —
      // '' (boolean shorthand / empty = decorative), a non-empty string, or
      // null (dynamic expression — user knows what they're doing, match
      // jsx-a11y semantics). All three are OK, so the mere presence suffices.
      if (altAttr) return;

      // No alt. role="presentation" means decorative — but the right answer is alt="".
      if (hasPresentationRole(node)) {
        context.report({
          node,
          messageId: 'preferEmptyAltOverPresentation',
          fix: (fixer) => fixer.insertTextAfter(getAltInsertionAnchor(node), ' alt=""'),
        });
        return;
      }

      // aria-label / aria-labelledby fallback (opt-in via options)
      if (hasAria(node, /* requireOptIn */ true)) return;

      // Truly missing
      context.report({
        node,
        messageId: 'missingAlt',
        suggest: [
          {
            messageId: 'addDescriptiveAlt',
            fix: (fixer) =>
              fixer.insertTextAfter(getAltInsertionAnchor(node), ' alt="TODO: Add descriptive text"'),
          },
          {
            messageId: 'useEmptyAlt',
            fix: (fixer) => fixer.insertTextAfter(getAltInsertionAnchor(node), ' alt=""'),
          },
        ],
      });
    };

    const checkObject = (node: TSESTree.JSXOpeningElement) => {
      // <object> is OK with any of: aria-label, aria-labelledby, title, accessible child
      if (hasAria(node, /* requireOptIn */ false)) return;
      if (hasNonEmptyAttr(node, 'title')) return;
      if (hasAccessibleChild(node)) return;
      context.report({ node, messageId: 'objectMissingAlternative' });
    };

    const checkArea = (node: TSESTree.JSXOpeningElement) => {
      if (hasAria(node, /* requireOptIn */ false)) return;
      // Any alt (empty, non-empty, or dynamic) is acceptable — see checkImg.
      if (getAttr(node, 'alt')) return;
      context.report({ node, messageId: 'areaMissingAlternative' });
    };

    const checkInputImage = (node: TSESTree.JSXOpeningElement) => {
      if (hasAria(node, /* requireOptIn */ false)) return;
      // Any alt (empty, non-empty, or dynamic) is acceptable — see checkImg.
      if (getAttr(node, 'alt')) return;
      context.report({ node, messageId: 'inputImageMissingAlternative' });
    };

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const kind = classify(node);
        if (!kind) return;
        switch (kind) {
          case 'img':        return checkImg(node);
          case 'object':     return checkObject(node);
          case 'area':       return checkArea(node);
          case 'inputImage': return checkInputImage(node);
        }
      },
    };
  },
});


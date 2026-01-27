/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-no-target-blank
 * Enforce rel="noopener noreferrer" on anchor tags with target="_blank"
 * 
 * Security: Prevents reverse tabnabbing attacks (CWE-1022)
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-target-blank.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'noTargetBlank' | 'noRelWithoutNoopener';

type Options = {
  allowReferrer?: boolean;
  enforceDynamicLinks?: 'always' | 'never';
  warnOnSpreadAttributes?: boolean;
  links?: boolean;
  forms?: boolean;
};

type RuleOptions = [Options?];

export const jsxNoTargetBlank = createRule<RuleOptions, MessageIds>({
  name: 'jsx-no-target-blank',
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid target="_blank" without rel="noopener noreferrer"',
    },
    fixable: 'code',
    messages: {
      noTargetBlank: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe target="_blank"',
        cwe: 'CWE-1022',
        description: 'Using target="_blank" without rel="noopener noreferrer" is a security risk',
        severity: 'HIGH',
        fix: 'Add rel="noopener noreferrer" to prevent reverse tabnabbing',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-target-blank.md',
      }),
      noRelWithoutNoopener: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing noopener',
        cwe: 'CWE-1022',
        description: 'rel attribute is missing "noopener" value',
        severity: 'MEDIUM',
        fix: 'Add "noopener" to the rel attribute',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-target-blank.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowReferrer: { type: 'boolean', default: false },
          enforceDynamicLinks: { 
            type: 'string',
            enum: ['always', 'never'], 
            default: 'always' 
          },
          warnOnSpreadAttributes: { type: 'boolean', default: false },
          links: { type: 'boolean', default: true },
          forms: { type: 'boolean', default: false },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {} as Options]) {
    const { 
      allowReferrer = false, 
      enforceDynamicLinks = 'always',
      warnOnSpreadAttributes = false,
      links = true,
      forms = false,
    } = options ?? {} as Options;

    const elementsToCheck: string[] = [];
    if (links) elementsToCheck.push('a');
    if (forms) elementsToCheck.push('form');

    function hasTargetBlank(node: TSESTree.JSXOpeningElement): boolean {
      const targetAttr = node.attributes.find(
        (attr): attr is TSESTree.JSXAttribute =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'target'
      );

      if (!targetAttr || !targetAttr.value) return false;

      if (targetAttr.value.type === 'Literal') {
        return targetAttr.value.value === '_blank';
      }

      // Dynamic value - check enforceDynamicLinks option
      if (enforceDynamicLinks === 'always') {
        return true;
      }

      return false;
    }

    function hasExternalHref(node: TSESTree.JSXOpeningElement): boolean {
      const hrefAttr = node.attributes.find(
        (attr): attr is TSESTree.JSXAttribute =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'href'
      );

      if (!hrefAttr || !hrefAttr.value) return false;

      if (hrefAttr.value.type === 'Literal' && typeof hrefAttr.value.value === 'string') {
        const href = hrefAttr.value.value;
        // External if starts with http:// or https:// or //
        return /^(https?:)?\/\//.test(href) || /^\/\//.test(href);
      }

      // Dynamic href - assume external
      return enforceDynamicLinks === 'always';
    }

    function getRelAttribute(node: TSESTree.JSXOpeningElement): TSESTree.JSXAttribute | undefined {
      return node.attributes.find(
        (attr): attr is TSESTree.JSXAttribute =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'rel'
      );
    }

    function hasNoopener(relAttr: TSESTree.JSXAttribute): boolean {
      if (!relAttr.value) return false;
      
      if (relAttr.value.type === 'Literal' && typeof relAttr.value.value === 'string') {
        const relValues = relAttr.value.value.toLowerCase().split(/\s+/);
        return relValues.includes('noopener');
      }

      return false;
    }

    function hasNoreferrer(relAttr: TSESTree.JSXAttribute): boolean {
      if (!relAttr.value) return false;
      
      if (relAttr.value.type === 'Literal' && typeof relAttr.value.value === 'string') {
        const relValues = relAttr.value.value.toLowerCase().split(/\s+/);
        return relValues.includes('noreferrer');
      }

      return false;
    }

    function hasSpreadAttribute(node: TSESTree.JSXOpeningElement): boolean {
      return node.attributes.some(attr => attr.type === 'JSXSpreadAttribute');
    }

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier' || !elementsToCheck.includes(node.name.name)) {
          return;
        }

        // Skip if spread attributes and not warning on them
        if (hasSpreadAttribute(node) && !warnOnSpreadAttributes) {
          return;
        }

        if (!hasTargetBlank(node)) {
          return;
        }

        // For anchors, only check external links
        if (node.name.name === 'a' && !hasExternalHref(node)) {
          return;
        }

        const relAttr = getRelAttribute(node);
        const hasNoopenerValue = relAttr ? hasNoopener(relAttr) : false;
        const hasNoreferrerValue = relAttr ? hasNoreferrer(relAttr) : false;

        // noreferrer implies noopener in modern browsers
        if (hasNoopenerValue || hasNoreferrerValue) {
          // If allowReferrer is false, we need both noopener and noreferrer (or just noreferrer)
          if (!allowReferrer && !hasNoreferrerValue) {
            // Has noopener but not noreferrer - acceptable if allowReferrer is true
            return; // noopener is sufficient for security
          }
          return;
        }

        // Missing rel or rel doesn't have noopener/noreferrer
        context.report({
          node,
          messageId: relAttr ? 'noRelWithoutNoopener' : 'noTargetBlank',
          fix: (fixer: TSESLint.RuleFixer) => {
            if (relAttr && relAttr.value && relAttr.value.type === 'Literal') {
              // Add noopener noreferrer to existing rel
              const currentRel = String(relAttr.value.value);
              const newRel = allowReferrer 
                ? `${currentRel} noopener`.trim()
                : `${currentRel} noopener noreferrer`.trim();
              return fixer.replaceText(relAttr.value, `"${newRel}"`);
            } else if (!relAttr) {
              // Add rel attribute
              const lastAttr = node.attributes[node.attributes.length - 1];
              const relValue = allowReferrer ? 'noopener' : 'noopener noreferrer';
              if (lastAttr) {
                return fixer.insertTextAfter(lastAttr, ` rel="${relValue}"`);
              }
              return fixer.insertTextAfter(node.name, ` rel="${relValue}"`);
            }
            return null;
          },
        });
      },
    };
  },
});

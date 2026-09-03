/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-dom-node-text-content
 * Prefer textContent over innerText for DOM node text access
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'preferDomNodeTextContent';

type RuleOptions = [];

export const preferDomNodeTextContent = createRule<RuleOptions, MessageIds>({
  name: 'prefer-dom-node-text-content',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/prefer-dom-node-text-content.md',
      description:
        'Prefer textContent over innerText for better performance and reliability',
    },
    hasSuggestions: true,
    messages: {
      preferDomNodeTextContent: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'DOM Text Access',
        description: 'Use textContent instead of innerText',
        severity: 'MEDIUM',
        fix: 'Replace innerText with textContent',
        documentationLink:
          'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-dom-node-text-content.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // oxlint-disable-next-line consistent-function-scoping
    function isInAllowedContext(): boolean {
      // For simplicity, we'll skip the allow option for now
      return false;
    }

    /**
     * No DOM-likeness check, deliberately.
     *
     * This rule fires on ONE property: `.innerText`. That property is defined
     * on `HTMLElement` and nowhere else in the language — anything you read it
     * from is a DOM element, or the code was already broken. The access IS the
     * evidence, so a second test asking "does this look like an element" can
     * only ever subtract.
     *
     * It subtracted plenty. The check matched a vocabulary —
     * `^(element|el|div|span|node|ref|dom|elem)$` plus an `(Element|Node|Ref)$`
     * suffix — and six of seven genuine DOM elements were missed for having
     * ordinary names:
     *
     *     const heading = document.getElementById('x');
     *     heading.innerText;                             // not reported
     *
     * My first fix resolved the binding to a `document.querySelector` call
     * instead of matching the name. That was better and still wrong: a DOM
     * element arriving as a function parameter or an import resolves to
     * nothing, so it would have traded one set of misses for another. Deleting
     * the gate is the smaller and the correct change.
     */

    function isInnerTextAccess(node: TSESTree.MemberExpression): boolean {
      // Check if this is accessing .innerText property
      if (
        propertyName(node) === 'innerText'
      ) {
        return true;
      }
      // `propertyName` above already resolves `element['innerText']`, so the
      // separate computed-literal arm this replaces asked the same question.
      return false;
    }

    return {
      MemberExpression(node: TSESTree.MemberExpression) {
        if (
          isInnerTextAccess(node) &&
          !isInAllowedContext()
        ) {
          context.report({
            node,
            messageId: 'preferDomNodeTextContent',
            data: {
              current: 'innerText',
              fix: 'textContent',
            },
            suggest: [
              {
                messageId: 'preferDomNodeTextContent',
                data: {
                  replacement: 'textContent',
                  suggestion: 'Replace with textContent',
                },
                fix(fixer: TSESLint.RuleFixer) {
                  if (node.property.type === 'Identifier') {
                    return fixer.replaceText(node.property, 'textContent');
                  } else if (
                    node.property.type === 'Literal' &&
                    node.property.value === 'innerText'
                  ) {
                    return fixer.replaceText(node.property, '"textContent"');
                  }
                  return null;
                },
              },
            ],
          });
        }
      },
    };
  },
});

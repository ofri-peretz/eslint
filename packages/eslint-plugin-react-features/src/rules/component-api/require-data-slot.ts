/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-data-slot
 * Enforces R6: every named composition part carries `data-slot="<part-name>"`
 * so consumers can style by slot. Heuristic: a JSX element that carries
 * `data-testid` is a named part and must also carry `data-slot`.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'missingDataSlot';
type RuleOptions = [];

const hasNamedAttribute = (
  node: TSESTree.JSXOpeningElement,
  name: string,
): boolean =>
  node.attributes.some(
    (attr) =>
      attr.type === 'JSXAttribute' &&
      attr.name.type === 'JSXIdentifier' &&
      attr.name.name === name,
  );

export const requireDataSlot = createRule<RuleOptions, MessageIds>({
  name: 'require-data-slot',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/require-data-slot.md',
      description: 'Named composition parts must carry data-slot (R6)',
    },
    schema: [],
    messages: {
      missingDataSlot: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing data-slot',
        description: 'JSX element has data-testid but no data-slot (R6)',
        severity: 'MEDIUM',
        fix: 'Add `data-slot="<part-name>"` so consumers can style by slot.',
        documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/require-data-slot.md',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (!hasNamedAttribute(node, 'data-testid')) return;
        if (hasNamedAttribute(node, 'data-slot')) return;
        context.report({ node, messageId: 'missingDataSlot' });
      },
    };
  },
});

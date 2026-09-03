/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-default-test-id
 * Enforces R5 from the interlace-component skill: data-testid must be
 * type-required and consumer-provided. A runtime default contradicts the
 * type-level requirement and silently masks consumer omissions.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'defaultTestId';
type RuleOptions = [];

export const noDefaultTestId = createRule<RuleOptions, MessageIds>({
  name: 'no-default-test-id',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-default-test-id.md',
      description: 'data-testid must be consumer-provided — no runtime default value (R5)',
    },
    fixable: 'code',
    schema: [],
    messages: {
      defaultTestId: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'data-testid default value',
        description: 'data-testid has a runtime default — consumer must provide it (R5)',
        severity: 'HIGH',
        fix: 'Remove the default. Require data-testid at the type level and let the consumer pass it.',
        documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-default-test-id.md',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      Property(node: TSESTree.Property) {
        // Match `"data-testid": x = "..."` in destructuring patterns
        if (node.key.type !== 'Literal' || node.key.value !== 'data-testid') return;
        if (node.value.type !== 'AssignmentPattern') return;
        const assignment = node.value;
        context.report({
          node: assignment,
          messageId: 'defaultTestId',
          fix(fixer: TSESLint.RuleFixer) {
            // Replace `x = "..."` with just `x` — drop the default.
            const bindingText = context.sourceCode.getText(assignment.left);
            return fixer.replaceText(assignment, bindingText);
          },
        });
      },
    };
  },
});

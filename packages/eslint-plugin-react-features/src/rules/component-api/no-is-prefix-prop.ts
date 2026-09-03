/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-is-prefix-prop
 * Enforces R8: boolean props default-false, name describes the true state.
 * Bans `isXxx: boolean` props in TypeScript interfaces / type aliases.
 * `looped` reads naturally; `isLooped` is MUI-flagged noise.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'isPrefix' | 'renameSuggestion';
type RuleOptions = [];

const stripIsPrefix = (name: string): string =>
  name.slice(2, 3).toLowerCase() + name.slice(3);

export const noIsPrefixProp = createRule<RuleOptions, MessageIds>({
  name: 'no-is-prefix-prop',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-is-prefix-prop.md',
      description: 'Boolean props must not be prefixed with `is` (R8)',
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      isPrefix: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: '`is` prefix on boolean prop',
        description: 'Boolean prop `{{name}}` should be renamed to `{{suggested}}` (R8)',
        severity: 'MEDIUM',
        fix: 'Rename to `{{suggested}}` — booleans describe the true state directly.',
        documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-is-prefix-prop.md',
      }),
      renameSuggestion: 'Rename to `{{suggested}}` (also rename consumer call sites manually)',
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      TSPropertySignature(node: TSESTree.TSPropertySignature) {
        if (node.key.type !== 'Identifier') return;
        const { name } = node.key;
        if (!/^is[A-Z]/.test(name)) return;
        const ann = node.typeAnnotation?.typeAnnotation;
        if (!ann || ann.type !== 'TSBooleanKeyword') return;
        const suggested = stripIsPrefix(name);
        const keyNode = node.key;
        context.report({
          node: keyNode,
          messageId: 'isPrefix',
          data: { name, suggested },
          // Suggestion (not auto-fix) — renaming the prop has consumer-side
          // blast radius. The reviewer must update call sites manually.
          suggest: [
            {
              messageId: 'renameSuggestion',
              data: { suggested },
              fix(fixer: TSESLint.RuleFixer) {
                return fixer.replaceText(keyNode, suggested);
              },
            },
          ],
        });
      },
    };
  },
});

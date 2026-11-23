/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow `.only` and `fit`/`fdescribe` in tests
 * @description A focused test turns every other test in the file off. Locally
 * that is a debugging aid; committed, it makes the suite report green while
 * running one case. An agent that narrows a failing run with `.only` and
 * forgets to undo it ships exactly that.
 *
 * Reports a call whose callee is a test-runner API (proven by import, or an
 * unbound global) and carries `.only` anywhere in its chain, or is `fit`,
 * `ftest` or `fdescribe`.
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

import { calleeChain, isTestApi } from '../../utils/test-api';

type MessageIds = 'focusedTest' | 'removeFocus';

const FOCUS_ROOTS: ReadonlySet<string> = new Set(['fit', 'ftest', 'fdescribe']);

export const noFocusedTest = createRule<[], MessageIds>({
  name: 'no-focused-test',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-test-integrity/docs/rules/no-focused-test.md',
      description:
        'Disallow focused tests (`.only`, `fit`, `fdescribe`) that silently turn the rest of the suite off',
    },
    messages: {
      focusedTest: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Focused Test',
        description:
          'A focused test (.only / fit / fdescribe) runs alone and turns every other test in the file off, so the suite reports green while running one case',
        severity: 'HIGH',
        fix: 'Remove the focus. To run one test locally, pass a filter on the command line (vitest -t "<name>", jest -t "<name>", playwright test -g "<name>") instead of editing the file.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-test-integrity/docs/rules/no-focused-test.md',
      }),
      removeFocus: 'Remove the focus from this test.',
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      CallExpression(node): void {
        const chain = calleeChain(node.callee);
        // `it.only.each(t)('x', fn)`: the inner `it.only.each(t)` reports.
        if (!chain || chain.throughCall) return;
        const focusedByName = FOCUS_ROOTS.has(chain.root.name);
        if (!focusedByName && !chain.path.includes('only')) return;
        if (!isTestApi(chain.root, context.sourceCode)) return;

        const { root } = chain;
        context.report({
          node: node.callee,
          messageId: 'focusedTest',
          suggest: [
            {
              messageId: 'removeFocus',
              fix(fixer) {
                if (focusedByName && !chain.path.includes('only')) {
                  return fixer.replaceText(root, root.name.slice(1));
                }
                const member = onlyMember(node.callee);
                return fixer.removeRange([
                  member.object.range[1],
                  member.range[1],
                ]);
              },
            },
          ],
        });
      },
    };
  },
});

/** The `X.only` member in a callee chain known to contain one. */
function onlyMember(callee: TSESTree.Node): TSESTree.MemberExpression {
  let current = callee as TSESTree.MemberExpression;
  for (;;) {
    const { property } = current;
    const name =
      property.type === AST_NODE_TYPES.Identifier
        ? property.name
        : (property as TSESTree.StringLiteral).value;
    if (name === 'only') return current;
    current = current.object as TSESTree.MemberExpression;
  }
}

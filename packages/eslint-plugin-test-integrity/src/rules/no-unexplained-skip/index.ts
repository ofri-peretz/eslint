/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Every skipped test says why, and until when
 * @description "May not skip flaky tests" is the first thing an agent is told
 * and the first thing it does under pressure: a `.skip` turns a red suite green
 * and nothing downstream can tell. A skip is legal here when it is explained —
 * a comment on the same line or the line above carrying an issue URL, a
 * decision id (`D-107`), or a `YYYY-MM-DD` date that has not passed.
 *
 * Reports `.skip`, `.todo`, `.fixme`, `xit` / `xtest` / `xdescribe`, and
 * `skipIf` / `runIf` with a constant condition. Runtime conditions stay legal:
 * `it.skipIf(process.platform === 'win32')` and Playwright's
 * `test.skip(browserName === 'webkit', 'reason')` are platform gates, not
 * skipped tests.
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  staticString,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

import {
  calleeChain,
  isTestApi,
  justification,
  todayUtc,
} from '../../utils/test-api';

type MessageIds = 'unexplainedSkip' | 'expiredSkip';

const SKIP_ROOTS: ReadonlySet<string> = new Set([
  'xit',
  'xtest',
  'xdescribe',
  'xcontext',
]);
const SKIP_MEMBERS: ReadonlySet<string> = new Set(['skip', 'fixme']);
const CONDITIONAL_MEMBERS: ReadonlySet<string> = new Set(['skipIf', 'runIf']);

const DOCS =
  'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-test-integrity/docs/rules/no-unexplained-skip.md';

export const noUnexplainedSkip = createRule<[], MessageIds>({
  name: 'no-unexplained-skip',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: DOCS,
      description:
        'Require every skipped or todo test to carry an issue link, a decision id or an unexpired date',
    },
    messages: {
      unexplainedSkip: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Unexplained Skipped Test',
        description:
          'A test is skipped with no reason on record, so the suite reports green without running it and nobody is told to come back',
        severity: 'HIGH',
        fix: 'Make the test pass and remove the skip. If it must stay skipped, add a comment on this line or the line above with the issue URL, the decision id (D-…), or the YYYY-MM-DD date it is skipped until.',
        documentationLink: DOCS,
      }),
      expiredSkip: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Expired Skipped Test',
        description:
          'A skip says it holds until {{date}}, and that date has passed',
        severity: 'HIGH',
        fix: 'Re-enable the test, or replace the date with an issue URL or decision id that explains why it stays skipped.',
        documentationLink: DOCS,
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    let today = '';
    return {
      before() {
        today = todayUtc();
      },
      CallExpression(node): void {
        const chain = calleeChain(node.callee);
        if (!chain || chain.throughCall) return;
        if (!isSkip(node, chain.root.name, chain.path)) return;
        if (!isTestApi(chain.root, context.sourceCode)) return;

        const why = justification(node, context.sourceCode, today);
        if (why.kind === 'issue' || why.kind === 'decision') return;
        if (why.kind === 'until') {
          if (!why.expired) return;
          context.report({
            node: node.callee,
            messageId: 'expiredSkip',
            data: { date: why.date },
          });
          return;
        }
        context.report({ node: node.callee, messageId: 'unexplainedSkip' });
      },
    };
  },
});

function isSkip(
  node: TSESTree.CallExpression,
  root: string,
  path: string[],
): boolean {
  if (path.includes('todo')) return true;
  const conditional = path.find((p) => CONDITIONAL_MEMBERS.has(p));
  if (conditional) return constantValue(node.arguments[0]) !== undefined;
  if (SKIP_ROOTS.has(root)) return true;
  if (!path.some((p) => SKIP_MEMBERS.has(p))) return false;
  // `it.skip.each(table)` declares skipped tests whatever the table holds.
  if (path.includes('each')) return true;
  return isDeclaredSkip(node);
}

/**
 * `it.skip('name', fn)`, `test.skip()` and `test.skip(true)` skip a test;
 * Playwright's `test.skip(cond, 'reason')` with a runtime condition is a gate.
 */
function isDeclaredSkip(node: TSESTree.CallExpression): boolean {
  const [first, second] = node.arguments;
  if (!first) return true;
  if (second && isFunction(second)) return true;
  // A title, however spelled — including a template with substitutions.
  if (staticString(first) !== null) return true;
  if (first.type === AST_NODE_TYPES.TemplateLiteral) return true;
  return constantValue(first)?.value === true;
}

function isFunction(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionExpression
  );
}

/**
 * The value of a literal, or of `!`/`-` applied to one, as a truthiness:
 * `skipIf(true)`, `runIf(!0)`, `test.skip(!0)`. `undefined` when the node is
 * not constant.
 */
function constantValue(
  node: TSESTree.Node | undefined,
): { value: boolean } | undefined {
  if (!node) return undefined;
  if (node.type === AST_NODE_TYPES.Literal)
    return { value: Boolean(node.value) };
  if (node.type !== AST_NODE_TYPES.UnaryExpression) return undefined;
  const inner = constantValue(node.argument);
  if (!inner) return undefined;
  return { value: node.operator === '!' ? !inner.value : inner.value };
}

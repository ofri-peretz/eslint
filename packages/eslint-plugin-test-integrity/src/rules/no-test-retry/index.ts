/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow test retries unless a decision or issue explains them
 * @description A retry turns "fails one run in three" into "passes", which is
 * the one signal a flaky test exists to give. An agent that cannot make a test
 * pass reliably reaches for it because it works. Retries are legal here when a
 * comment on the same line or the line above cites an issue URL or a decision
 * id (`D-107`).
 *
 * Reports a non-zero `retry` / `retries`:
 * - in the options of a test-runner call: `it('x', { retry: 3 }, fn)`,
 *   `test.describe.configure({ retries: 2 })`
 * - inside a `defineConfig` / `defineProject` call
 * - anywhere in a `vitest.config.*`, `vite.config.*`, `jest.config.*` or
 *   `playwright.config.*` file
 *
 * and the call forms `jest.retryTimes(n)` and mocha's `this.retries(n)`.
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

import {
  calleeChain,
  isTestApi,
  justification,
  lookup,
} from '../../utils/test-api';

type MessageIds = 'testRetry';

const RETRY_KEYS: ReadonlySet<string> = new Set(['retry', 'retries']);
const CONFIG_FILE =
  /(?:^|[\\/])(?:vitest|vite|jest|playwright)(?:\.[\w-]+)*\.config\.[cm]?[jt]s$|(?:^|[\\/])vitest\.workspace\.[cm]?[jt]s$/;
const CONFIG_CALLS: ReadonlySet<string> = new Set([
  'defineConfig',
  'defineProject',
  'defineWorkspace',
  'mergeConfig',
]);

const DOCS =
  'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-test-integrity/docs/rules/no-test-retry.md';

export const noTestRetry = createRule<[], MessageIds>({
  name: 'no-test-retry',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: DOCS,
      description:
        'Disallow test retries unless a comment cites the decision or issue that allows them',
    },
    messages: {
      testRetry: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Test Retry',
        description:
          'Retries turn an intermittent failure into a pass, hiding the flakiness the test exists to report',
        severity: 'HIGH',
        fix: 'Remove the retry and fix the cause of the flake (a race, shared state, a fixed sleep, an unmocked clock or network). If the retry is a deliberate policy, cite the decision id (D-…) or issue URL in a comment on this line or the line above.',
        documentationLink: DOCS,
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    let configFile = false;
    const explained = (node: TSESTree.Node): boolean => {
      const why = justification(node, context.sourceCode, '');
      return why.kind === 'issue' || why.kind === 'decision';
    };
    return {
      before() {
        configFile = CONFIG_FILE.test(context.filename);
      },
      Property(node): void {
        if (!RETRY_KEYS.has(objectKeyName(node) ?? '')) return;
        if (isZero(node.value)) return;
        if (!configFile && !inRetryContext(node, context.sourceCode)) return;
        if (explained(node)) return;
        context.report({ node, messageId: 'testRetry' });
      },
      CallExpression(node): void {
        if (!isRetryCall(node, context.sourceCode)) return;
        if (isZero(node.arguments[0])) return;
        if (explained(node)) return;
        context.report({ node, messageId: 'testRetry' });
      },
    };
  },
});

function isZero(node: TSESTree.Node | undefined): boolean {
  return node?.type === AST_NODE_TYPES.Literal && node.value === 0;
}

/**
 * The property sits in an object passed to a test-runner call or a config
 * factory, at any depth (`defineConfig({ test: { retry: 2 } })`).
 */
function inRetryContext(
  node: TSESTree.Node,
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  // The walk always ends: `Program` is neither a call nor an object.
  for (
    let current = node.parent as TSESTree.Node;
    ;
    current = current.parent as TSESTree.Node
  ) {
    if (current.type === AST_NODE_TYPES.CallExpression) {
      const chain = calleeChain(current.callee);
      if (!chain) return false;
      if (CONFIG_CALLS.has(chain.root.name) && chain.path.length === 0) {
        return true;
      }
      return isTestApi(chain.root, sourceCode);
    }
    if (
      current.type !== AST_NODE_TYPES.ObjectExpression &&
      current.type !== AST_NODE_TYPES.Property &&
      current.type !== AST_NODE_TYPES.ArrayExpression
    ) {
      return false;
    }
  }
}

/** `jest.retryTimes(n)` and mocha's `this.retries(n)`. */
function isRetryCall(
  node: TSESTree.CallExpression,
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  const { callee } = node;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  const method = propertyName(callee);
  if (method === 'retries') {
    return callee.object.type === AST_NODE_TYPES.ThisExpression;
  }
  if (method !== 'retryTimes') return false;
  if (callee.object.type !== AST_NODE_TYPES.Identifier) return false;
  if (callee.object.name !== 'jest') return false;
  const variable = lookup('jest', sourceCode.getScope(node));
  if (!variable || variable.defs.length === 0) return true;
  const def = variable.defs[0];
  return (
    def.type === 'ImportBinding' &&
    (def.parent as TSESTree.ImportDeclaration).source.value === '@jest/globals'
  );
}

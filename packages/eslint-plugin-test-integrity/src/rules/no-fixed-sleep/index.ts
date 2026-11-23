/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow fixed-duration sleeps in test files
 * @description A sleep is a guess about how long something takes. On a fast
 * machine it wastes the time; on a loaded CI runner it is too short and the
 * test flakes — and the usual "fix" is a longer guess. Await the event or the
 * condition instead.
 *
 * Reports, in test files only:
 * - `new Promise((r) => setTimeout(r, n))`
 * - `setTimeout(n)` / `scheduler.wait(n)` imported from `timers/promises`
 * - an awaited `sleep(n)`, `delay(n)`, `wait(n)` or `pause(n)` with a numeric
 *   literal duration
 * - `page.waitForTimeout(n)` (Playwright) and `cy.wait(n)` with a number
 *   (Cypress)
 *
 * Fake timers (`vi.advanceTimersByTime`, `jest.runAllTimers`) are not sleeps
 * and are never reported.
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

import { isTestFile, lookup } from '../../utils/test-api';

type MessageIds = 'fixedSleep';

const SLEEP_HELPERS: ReadonlySet<string> = new Set([
  'sleep',
  'delay',
  'wait',
  'pause',
]);
const TIMER_PROMISES: ReadonlySet<string> = new Set([
  'timers/promises',
  'node:timers/promises',
]);

const DOCS =
  'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-test-integrity/docs/rules/no-fixed-sleep.md';

export const noFixedSleep = createRule<[], MessageIds>({
  name: 'no-fixed-sleep',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: DOCS,
      description:
        'Disallow fixed-duration sleeps in tests; await the event or condition instead',
    },
    messages: {
      fixedSleep: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Fixed Sleep in a Test',
        description:
          'The test waits a fixed {{how}} instead of for the thing it needs, so it is slow where the guess is long and flaky where it is short',
        severity: 'MEDIUM',
        fix: 'Await the event or condition itself: the promise the code returns, an emitted event (events.once), a polling assertion (vi.waitFor, expect.poll, Playwright expect(locator).toBeVisible()), or fake timers (vi.advanceTimersByTimeAsync) for timer-driven code.',
        documentationLink: DOCS,
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      before() {
        return isTestFile(context.filename);
      },
      NewExpression(node): void {
        if (isPromiseTimeout(node, context.sourceCode)) {
          context.report({
            node,
            messageId: 'fixedSleep',
            data: { how: 'setTimeout' },
          });
        }
      },
      CallExpression(node): void {
        const how = sleepKind(node, context.sourceCode);
        if (how)
          context.report({ node, messageId: 'fixedSleep', data: { how } });
      },
    };
  },
});

function isGlobal(
  name: string,
  node: TSESTree.Node,
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  const variable = lookup(name, sourceCode.getScope(node));
  return !variable || variable.defs.length === 0;
}

/** `new Promise((resolve) => setTimeout(resolve, n))` and its spellings. */
function isPromiseTimeout(
  node: TSESTree.NewExpression,
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  if (node.callee.type !== AST_NODE_TYPES.Identifier) return false;
  if (node.callee.name !== 'Promise') return false;
  const [executor] = node.arguments;
  if (
    !executor ||
    (executor.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
      executor.type !== AST_NODE_TYPES.FunctionExpression)
  ) {
    return false;
  }
  const [resolve] = executor.params;
  if (!resolve || resolve.type !== AST_NODE_TYPES.Identifier) return false;
  const call = onlyExpression(executor.body);
  if (!call || call.type !== AST_NODE_TYPES.CallExpression) return false;
  if (call.callee.type !== AST_NODE_TYPES.Identifier) return false;
  if (call.callee.name !== 'setTimeout') return false;
  if (!isGlobal('setTimeout', call, sourceCode)) return false;
  return callsBack(call.arguments[0], resolve.name);
}

/** The single expression a function body evaluates, if that is all it does. */
function onlyExpression(body: TSESTree.Node): TSESTree.Expression | undefined {
  if (body.type !== AST_NODE_TYPES.BlockStatement) {
    return body as TSESTree.Expression;
  }
  const [statement] = body.body;
  if (body.body.length !== 1) return undefined;
  if (statement.type !== AST_NODE_TYPES.ExpressionStatement) return undefined;
  return statement.expression;
}

/** `resolve` itself, or `() => resolve()`. */
function callsBack(arg: TSESTree.Node | undefined, name: string): boolean {
  if (!arg) return false;
  if (arg.type === AST_NODE_TYPES.Identifier) return arg.name === name;
  if (
    arg.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
    arg.type !== AST_NODE_TYPES.FunctionExpression
  ) {
    return false;
  }
  const inner = onlyExpression(arg.body);
  return (
    inner?.type === AST_NODE_TYPES.CallExpression &&
    inner.callee.type === AST_NODE_TYPES.Identifier &&
    inner.callee.name === name
  );
}

function sleepKind(
  node: TSESTree.CallExpression,
  sourceCode: Readonly<TSESLint.SourceCode>,
): string | undefined {
  const { callee } = node;
  if (callee.type === AST_NODE_TYPES.MemberExpression) {
    const method = propertyName(callee);
    if (method === 'waitForTimeout') return 'waitForTimeout()';
    if (
      method === 'wait' &&
      callee.object.type === AST_NODE_TYPES.Identifier &&
      callee.object.name === 'cy' &&
      isNumber(node.arguments[0])
    ) {
      return 'cy.wait()';
    }
    if (
      method === 'wait' &&
      callee.object.type === AST_NODE_TYPES.Identifier &&
      importedFrom(callee.object, sourceCode, TIMER_PROMISES) === 'scheduler'
    ) {
      return 'scheduler.wait()';
    }
    return undefined;
  }
  if (callee.type !== AST_NODE_TYPES.Identifier) return undefined;
  if (importedFrom(callee, sourceCode, TIMER_PROMISES) === 'setTimeout') {
    return 'setTimeout() from timers/promises';
  }
  if (
    SLEEP_HELPERS.has(callee.name) &&
    node.parent.type === AST_NODE_TYPES.AwaitExpression &&
    isNumber(node.arguments[0])
  ) {
    return `${callee.name}()`;
  }
  return undefined;
}

/** The imported name when `id` is bound to an import from one of `modules`. */
function importedFrom(
  id: TSESTree.Identifier,
  sourceCode: Readonly<TSESLint.SourceCode>,
  modules: ReadonlySet<string>,
): string | undefined {
  const variable = lookup(id.name, sourceCode.getScope(id));
  const def = variable?.defs[0];
  if (def?.type !== 'ImportBinding') return undefined;
  const declaration = def.parent as TSESTree.ImportDeclaration;
  if (!modules.has(declaration.source.value)) return undefined;
  const specifier = def.node;
  if (specifier.type !== AST_NODE_TYPES.ImportSpecifier) return undefined;
  const { imported } = specifier;
  return imported.type === AST_NODE_TYPES.Identifier
    ? imported.name
    : imported.value;
}

/** A numeric literal, or arithmetic over numeric literals: `500`, `2 * 1000`. */
function isNumber(node: TSESTree.Node | undefined): boolean {
  if (!node) return false;
  if (node.type === AST_NODE_TYPES.Literal)
    return typeof node.value === 'number';
  if (node.type === AST_NODE_TYPES.BinaryExpression) {
    return isNumber(node.left) && isNumber(node.right);
  }
  return false;
}

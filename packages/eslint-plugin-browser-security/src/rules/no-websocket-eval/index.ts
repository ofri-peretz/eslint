/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-websocket-eval
 * Detects dangerous eval() usage with WebSocket message data
 * CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code
 *
 * @see https://cwe.mitre.org/data/definitions/95.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createPayloadResolver,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';

import { dynamicCodeSink } from '../../utils/dynamic-code-sinks';

type MessageIds = 'evalWithWsData';

/**
 * ## Rule partition — `no-websocket-eval` (here) vs `no-eval` (this package)
 *
 * This rule owns a dynamic-code site whose executed argument resolves —
 * through the message-event **binding**, never its name — to a `WebSocket`
 * handler payload. `no-eval` owns every other shape: another message source
 * (Worker, SharedWorker, FileReader, postMessage), an unattributable value, or
 * a static payload. `no-eval` defers here rather than the reverse because this
 * finding names the source, the attacker position and the fix, which is
 * strictly more than the generic rule can say about the identical line.
 *
 * The two rules share ONE sink list — `dynamicCodeSink()` in
 * `src/utils/dynamic-code-sinks.ts` — so the tests are exact complements by
 * construction. They were not always: this rule claimed only a bare `eval` /
 * `Function` identifier while `no-eval` yielded on any call carrying a
 * WebSocket payload, so `window.eval(e.data)`, `execScript(e.data)` and
 * `globalThis['eval'](e.data)` inside a handler were reported by NEITHER rule —
 * while all three were reported one line outside it. Detection got weaker as
 * the payload got more attacker-controlled.
 *
 * `eval-partition-matrix` in `../no-eval/no-eval.test.ts` asserts exactly one
 * report per shape and MUST be re-run whenever the shared sink list changes:
 * widening one rule silently uncovers shapes its sibling owned.
 */

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// The sink list lives in `src/utils/dynamic-code-sinks.ts` — shared with
// `no-eval` so the two rules cannot claim different surfaces. A private
// `{eval, Function}` set here is exactly what opened the hole documented above.

export const noWebsocketEval = createRule<RuleOptions, MessageIds>({
  name: 'no-websocket-eval',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-websocket-eval.md',
      description:
        'Disallow using eval() or Function() with WebSocket message data',
      cwe: 'CWE-95',
      cvss: 9.8,
    },
    messages: {
      evalWithWsData: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Remote Code Execution via WebSocket',
        cwe: 'CWE-95',
        owasp: 'A03:2021',
        cvss: 9.8,
        description:
          'Using {{method}} with WebSocket data enables remote code execution. A compromised server or MITM attacker can execute arbitrary JavaScript.',
        severity: 'CRITICAL',
        fix: 'Parse WebSocket data as JSON and validate the structure instead of executing it.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/95.html',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename;
    const isTestFile = isTestFilePath(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Ownership gate: this rule reports only what the resolver attributes
    // to the websocket source. Everything it cannot identify belongs to the
    // generic sink rule, so no value is ever reported by both.
    //
    // The resolver is the sole sink condition. A mutable in-handler flag was
    // cleared by any NESTED handler's exit, so sinks after one went unreported
    // here while no-eval skipped them as ours — the finding belonged to nobody.
    const payloadSource = createPayloadResolver(context.sourceCode);

    function inspect(
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): void {
      const sink = dynamicCodeSink(node, context.sourceCode);
      if (sink === undefined) return;
      // Timers (`sink.name === null`) are never this rule's. Their body must be
      // a PROVABLY STRING expression — a literal, a template, a concatenation —
      // and none of those is a bare payload read, so a timer body can never
      // resolve to the socket. `no-eval` owns them, and returning here keeps the
      // complement exact instead of leaving a shape both rules could claim.
      if (sink.name === null) return;
      if (!sink.codeArguments.some((arg) => payloadSource(arg) === 'websocket'))
        return;
      context.report({
        node,
        messageId: 'evalWithWsData',
        data: {
          // `new Function(...)` and `Function(...)` read differently to a human
          // and both spellings appear in the wild, so the constructor keeps its
          // `new`.
          method:
            node.type === AST_NODE_TYPES.NewExpression
              ? `new ${sink.name}`
              : sink.name,
        },
      });
    }

    return {
      CallExpression: inspect,
      NewExpression: inspect,
    };
  },
});

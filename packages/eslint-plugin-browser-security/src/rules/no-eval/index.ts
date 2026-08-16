/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-eval
 * Detects dangerous eval() and similar code execution patterns
 * CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code (Eval Injection)
 *
 * @see https://cwe.mitre.org/data/definitions/95.html
 * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/11-Testing_for_Code_Injection
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createPayloadResolver } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

import type { DynamicCodeSink } from '../../utils/dynamic-code-sinks';
import { dynamicCodeSink } from '../../utils/dynamic-code-sinks';

type MessageIds = 'dangerousEval';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;

  /** Allow Function constructor. Default: false */
  allowFunctionConstructor?: boolean;

  /**
   * Hand a DYNAMIC `eval(x)` payload to `node-security/detect-eval-with-expression`
   * instead of reporting it here. Default: `false`.
   *
   * The partition documented at the top of this file is correct *within* an
   * ecosystem install, and it was applied unconditionally — which made this rule
   * exactly inverted for anyone who installs browser-security alone:
   *
   *   eval(userInput);   QUIET      ← the actual vulnerability
   *   eval("2 + 2");     CVSS 9.8   ← a constant
   *
   * eslint-plugin-browser-security does not depend on eslint-plugin-node-security,
   * so a browser-only consumer had NO eval coverage whatsoever while being told
   * their arithmetic was critical. A rule cannot see which other plugins are
   * enabled, so this has to be the user's declaration: default self-sufficient,
   * opt in to the partition when both plugins are installed.
   */
  deferDynamicPayloads?: boolean;
}

type RuleOptions = [Options?];

/**
 * ## Rule partition — `no-eval` (here) vs `no-websocket-eval` (this package)
 *
 * Both rules match the same sinks. They are separated by **who the payload
 * came from**, and the two tests are literal complements of one another:
 *
 *   `no-websocket-eval` owns a site whose executed argument resolves —
 *     through the message-event *binding*, not its name — to a `WebSocket`
 *     handler payload. That finding names the source, the attacker position
 *     (a compromised server or a MITM) and the fix, which is strictly more
 *     than this rule can say about the same line.
 *
 *   `no-eval` owns **every other** dynamic-code shape: any other message
 *     source (Worker, SharedWorker, FileReader, postMessage — none of which
 *     has an eval rule of its own), any unattributable value, and any static
 *     payload. Yielding on *every* resolved source instead of the WebSocket one
 *     would drop Worker and FileReader payloads entirely; the complement is
 *     per-SOURCE, not per-resolver.
 *
 * The partition is enforced structurally rather than by agreement: both rules
 * call `dynamicCodeSink()` in `src/utils/dynamic-code-sinks.ts`, so neither can
 * yield a shape the other does not claim. Two separate sink lists is exactly
 * how `window.eval(e.data)`, `execScript(e.data)` and `globalThis['eval'](e.data)`
 * inside a WebSocket handler came to be reported by NEITHER rule while the same
 * three lines were reported outside one. The matrix in
 * `no-eval.test.ts` (`eval-partition-matrix`) asserts EXACTLY ONE report per
 * shape and must be re-run whenever the sink list changes.
 *
 * ## Rule partition — `no-eval` (here) vs `detect-eval-with-expression`
 * (eslint-plugin-node-security).
 *
 * Both matched `eval(x)` and `new Function(x)`, at the identical range, in
 * `recommended`: every one of the four corpus eval sites was reported twice.
 * Same doctrine as `no-innerhtml`'s `payloadSource` gate — exactly one rule
 * owns a site — but the axis here is the PAYLOAD, not the source:
 *
 *   dynamic payload → `detect-eval-with-expression`. It classifies the
 *     expression (json / math / template / object) and prescribes the matching
 *     safe alternative. That is real attribution, and it is strictly more than
 *     this rule can say. It already declines a string-literal payload for
 *     `eval` for exactly this reason.
 *
 *   static payload → this rule. Nothing is being injected, so there is nothing
 *     to attribute; the finding is "this file contains a code-execution sink
 *     at all", which is the generic claim.
 *
 * Two things stay wholly here, static or dynamic:
 *
 *   - Sinks that rule does not model: `execScript`, indirect access
 *     (`window.eval`, `globalThis['eval']`), and
 *     `setTimeout`/`setInterval`/`setImmediate` with a string body. Its
 *     `evalFunctions` set is `{eval, Function}` matched on a bare `Identifier`
 *     callee, so it can never see those.
 *   - Payloads with a BROWSER source this package can attribute — a Worker
 *     message, a FileReader result, a `postMessage` event. Those are browser
 *     sink/source pairs; classifying `event.data` as a "dynamic expression"
 *     adds nothing, and yielding them would drop them entirely, which is the
 *     failure `createPayloadResolver` was built to prevent.
 *
 * The contract the other half must hold for the split to stay disjoint:
 * `detect-eval-with-expression` must skip a string-literal payload for
 * `Function` as it already does for `eval`, and must skip the zero-argument
 * case. Anything statically known is ours; anything dynamic and unattributed
 * is theirs.
 *
 * Only the shapes that rule can actually see may be deferred: a bare
 * `Identifier` callee named `eval` or `Function`. `execScript`, indirect access
 * (`window.eval`, `globalThis['eval']`, `(0, eval)`, an aliased binding) and the
 * timer sinks are invisible to it, so deferring them would hand the finding to
 * nobody — the same hole this file's first partition note exists to close.
 */
function isDeferrableToNodeSecurity(sink: DynamicCodeSink): boolean {
  return sink.kind === 'direct' && sink.name !== 'execScript';
}

function hasStaticPayload(sink: DynamicCodeSink): boolean {
  return sink.codeArguments.every(
    (arg) => arg.type === 'Literal' && typeof arg.value === 'string',
  );
}

export const noEval = createRule<RuleOptions, MessageIds>({
  name: 'no-eval',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-eval.md',
      description:
        'Disallow eval(), Function(), and other code execution patterns',
      cwe: 'CWE-95',
      cvss: 9.8,
    },
    messages: {
      dangerousEval: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Code Injection via {{function}}',
        cwe: 'CWE-95',
        description:
          'Using {{function}} with dynamic input can execute arbitrary code. This is a critical security vulnerability.',
        severity: 'CRITICAL',
        fix: 'Use safe alternatives like JSON.parse() for data, or refactor to avoid dynamic code execution.',
        documentationLink:
          'https://owasp.org/www-community/attacks/Code_Injection',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
          allowFunctionConstructor: {
            type: 'boolean',
            default: false,
            description:
              'Allow `new Function(...)` while still reporting `eval()`',
          },
          deferDynamicPayloads: {
            type: 'boolean',
            default: false,
            description:
              'Let node-security/detect-eval-with-expression own dynamic eval() ' +
              'payloads. Enable when both plugins are installed, to avoid one ' +
              'line being reported twice. Off by default so browser-security ' +
              'covers eval() on its own.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      allowFunctionConstructor: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = false,
      allowFunctionConstructor = false,
      deferDynamicPayloads = false,
    } =
      options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const payloadSource = createPayloadResolver(context.sourceCode);

    /**
     * Is this site ours under the node-security partition documented above?
     * See `hasStaticPayload`.
     */
    function ownsPayload(sink: DynamicCodeSink): boolean {
      // A browser source we can attribute (worker / filereader / postmessage —
      // websocket has already returned by the time this runs).
      if (sink.codeArguments.some((arg) => payloadSource(arg) !== undefined)) {
        return true;
      }
      return hasStaticPayload(sink);
    }

    /**
     * One decision path for `CallExpression` and `NewExpression` alike.
     *
     * They were two, and they drifted: the `NewExpression` half applied the
     * node-security deferral UNCONDITIONALLY — ignoring `deferDynamicPayloads`
     * entirely — so for a browser-only consumer the Function constructor was
     * exactly inverted, reporting `new Function('return 1')` at CVSS 9.8 while
     * `new Function('return ' + userInput)` was silent. Two pre-existing tests
     * asserted that silence as correct.
     */
    function inspect(
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): void {
      const sink = dynamicCodeSink(node, context.sourceCode);
      if (sink === undefined) return;

      // WebSocket only, and via the SAME sink model the sibling claims with —
      // see the first partition note. Skipping every resolved source would drop
      // Worker, SharedWorker and FileReader payloads entirely.
      if (sink.codeArguments.some((arg) => payloadSource(arg) === 'websocket')) {
        return;
      }

      if (allowFunctionConstructor && sink.name === 'Function') return;

      if (
        deferDynamicPayloads &&
        isDeferrableToNodeSecurity(sink) &&
        !ownsPayload(sink)
      ) {
        return;
      }

      context.report({
        node,
        messageId: 'dangerousEval',
        data: { function: sink.label },
      });
    }

    return {
      CallExpression: inspect,
      NewExpression: inspect,
    };
  },
});

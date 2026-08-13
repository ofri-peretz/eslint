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

type MessageIds = 'dangerousEval' | 'useSafeAlternative';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;

  /** Allow Function constructor. Default: false */
  allowFunctionConstructor?: boolean;
}

type RuleOptions = [Options?];

const DANGEROUS_FUNCTIONS = new Set([
  'eval',
  'execScript', // IE legacy
]);

const DANGEROUS_METHODS_WITH_STRING_ARG = new Set([
  'setTimeout',
  'setInterval',
  'setImmediate',
]);

/**
 * Rule partition — `no-eval` (here) vs `detect-eval-with-expression`
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
 */
function hasStaticPayload(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
): boolean {
  return node.arguments.every(
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
    hasSuggestions: true,
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
      useSafeAlternative: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Alternative',
        description: 'Replace with a safe alternative',
        severity: 'LOW',
        fix: 'Use JSON.parse() for JSON, or define functions statically.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!',
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
    const { allowInTests = false, allowFunctionConstructor = false } =
      options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const payloadSource = createPayloadResolver(context.sourceCode);

    /**
     * Is this site ours under the partition documented above? See
     * `hasStaticPayload`.
     */
    function ownsPayload(
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): boolean {
      // A browser source we can attribute (worker / filereader / postmessage —
      // websocket has already returned by the time this runs).
      if (node.arguments.some((arg) => payloadSource(arg) !== undefined)) {
        return true;
      }
      return hasStaticPayload(node);
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // WebSocket only. `no-websocket-eval` is the ONLY eval rule with a
        // source of its own, so skipping every resolved source would drop
        // Worker, SharedWorker and FileReader payloads entirely — nobody would
        // report them. The complement is per-SINK, not per-resolver.
        if (node.arguments.some((arg) => payloadSource(arg) === 'websocket'))
          return;

        // Check for eval(), execScript()
        if (callee.type === 'Identifier') {
          if (DANGEROUS_FUNCTIONS.has(callee.name)) {
            // A dynamic `eval(…)` payload belongs to
            // `detect-eval-with-expression` — see the partition note above.
            // `execScript` is unknown to that rule, so it stays here either way.
            if (callee.name === 'eval' && !ownsPayload(node)) {
              return;
            }
            context.report({
              node,
              messageId: 'dangerousEval',
              data: { function: callee.name },
              suggest: [
                {
                  messageId: 'useSafeAlternative',
                  fix: () => null,
                },
              ],
            });
            return;
          }

          // Check for setTimeout/setInterval with string argument
          if (DANGEROUS_METHODS_WITH_STRING_ARG.has(callee.name)) {
            const firstArg = node.arguments[0];
            if (
              firstArg &&
              firstArg.type === 'Literal' &&
              typeof firstArg.value === 'string'
            ) {
              context.report({
                node,
                messageId: 'dangerousEval',
                data: { function: `${callee.name} with string` },
                suggest: [
                  {
                    messageId: 'useSafeAlternative',
                    fix: () => null,
                  },
                ],
              });
            }
          }
        }

        // Check for `window.eval`, `global.eval`, `globalThis.eval`, `self.eval`
        // (member access — non-computed) AND `window['eval']`, `globalThis['Function']`
        // (computed — Literal property). The second form was an audit FN
        // surfaced by `npm run ilb:stress-test` (see benchmarks/AUDIT_PATTERNS.md
        // §3.3 — "indirect access via bracket notation").
        if (callee.type === 'MemberExpression') {
          let propertyName: string | null = null;
          if (
            !callee.computed &&
            callee.property.type === 'Identifier' &&
            DANGEROUS_FUNCTIONS.has(callee.property.name)
          ) {
            propertyName = callee.property.name;
          } else if (
            callee.computed &&
            callee.property.type === 'Literal' &&
            typeof callee.property.value === 'string' &&
            DANGEROUS_FUNCTIONS.has(callee.property.value)
          ) {
            propertyName = callee.property.value;
          }
          if (propertyName) {
            context.report({
              node,
              messageId: 'dangerousEval',
              data: { function: propertyName },
              suggest: [
                {
                  messageId: 'useSafeAlternative',
                  fix: () => null,
                },
              ],
            });
          }
        }
      },

      // Check for new Function()
      NewExpression(node: TSESTree.NewExpression) {
        // Same ownership gate as CallExpression below. Without it
        // `new Function(event.data)` in a WebSocket handler reports from BOTH
        // no-websocket-eval and here — the exact double-report this rule pair
        // exists to prevent, and the complement only holds if every reporting
        // path asks the question.
        if (node.arguments.some((arg) => payloadSource(arg) === 'websocket'))
          return;

        if (allowFunctionConstructor) {
          return;
        }

        // A dynamic `new Function(…)` body belongs to
        // `detect-eval-with-expression` — see the partition note above.
        if (!ownsPayload(node)) {
          return;
        }

        const callee = node.callee;
        if (callee.type === 'Identifier' && callee.name === 'Function') {
          context.report({
            node,
            messageId: 'dangerousEval',
            data: { function: 'Function constructor' },
            suggest: [
              {
                messageId: 'useSafeAlternative',
                fix: () => null,
              },
            ],
          });
        }
      },
    };
  },
});

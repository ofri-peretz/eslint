/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-websocket-innerhtml
 * Detects unsafe innerHTML usage with WebSocket message data
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
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
  propertyName,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeInnerhtml';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Dangerous DOM properties and methods
const DANGEROUS_PROPERTIES = new Set(['innerHTML', 'outerHTML']);
const DANGEROUS_METHODS = new Set(['insertAdjacentHTML', 'write', 'writeln']);

export const noWebsocketInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-websocket-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-websocket-innerhtml.md',
      description:
        'Disallow using innerHTML or similar methods with WebSocket message data',
      cwe: 'CWE-79',
      cvss: 8.1,
    },
    messages: {
      unsafeInnerhtml: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XSS via WebSocket',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 8.1,
        description:
          'Using {{method}} with WebSocket data enables XSS attacks. Malicious server or MITM can send crafted HTML to execute scripts.',
        severity: 'HIGH',
        fix: 'Use textContent for plain text, or sanitize with DOMPurify before using innerHTML.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
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
    const payloadSource = createPayloadResolver(context.sourceCode);

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {

        // Check for innerHTML/outerHTML assignment within handler
        // The resolver is the sole sink condition. A mutable in-handler
        // flag was cleared by any NESTED handler's exit, so sinks after
        // one went unreported here while no-innerhtml skipped them as
        // ours — the finding belonged to nobody.

        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          // `el['innerHTML'] = …` and `el['insertAdjacentHTML'](…)` write
          // the same markup the dotted spellings do.
          DANGEROUS_PROPERTIES.has(propertyName(node.left) ?? '')
        ) {
          if (payloadSource(node.right) === 'websocket') {
            context.report({
              node,
              messageId: 'unsafeInnerhtml',
              data: {
                method: propertyName(node.left) as string,
              },
            });
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {

        // Check for dangerous method calls within handler
        // The resolver is the sole sink condition. A mutable in-handler
        // flag was cleared by any NESTED handler's exit, so sinks after
        // one went unreported here while no-innerhtml skipped them as
        // ours — the finding belonged to nobody.

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          // `el['innerHTML'] = …` and `el['insertAdjacentHTML'](…)` write
          // the same markup the dotted spellings do.
          DANGEROUS_METHODS.has(propertyName(node.callee) ?? '')
        ) {
          for (const arg of node.arguments) {
            if (payloadSource(arg) === 'websocket') {
              context.report({
                node,
                messageId: 'unsafeInnerhtml',
                data: {
                  method: propertyName(node.callee) as string,
                },
              });
              break;
            }
          }
        }
      },
    };
  },
});

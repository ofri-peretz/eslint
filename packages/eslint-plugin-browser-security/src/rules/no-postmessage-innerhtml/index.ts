/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-postmessage-innerhtml
 * Detects unsafe innerHTML usage in postMessage handlers
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns
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

type MessageIds = 'unsafeInnerhtml';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Dangerous DOM properties
const DANGEROUS_PROPERTIES = new Set(['innerHTML', 'outerHTML']);
const DANGEROUS_METHODS = new Set(['insertAdjacentHTML', 'write', 'writeln']);

export const noPostmessageInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-postmessage-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-postmessage-innerhtml.md',
      description:
        'Disallow using innerHTML or similar methods with postMessage data',
      cwe: 'CWE-79',
      cvss: 8.8,
    },
    messages: {
      unsafeInnerhtml: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XSS via postMessage',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 8.8,
        description:
          'Using {{method}} with postMessage data allows XSS attacks. Any window can send malicious HTML that will be executed.',
        severity: 'HIGH',
        fix: 'Use textContent for plain text, or sanitize with DOMPurify before using innerHTML.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns',
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
    // to the postmessage source. Everything it cannot identify belongs to the
    // generic sink rule, so no value is ever reported by both.
    const payloadSource = createPayloadResolver(context.sourceCode);

    return {
      CallExpression(node: TSESTree.CallExpression) {

        // Check for dangerous methods: insertAdjacentHTML, document.write
        // The resolver is the sole sink condition. A mutable in-handler
        // flag was cleared by any NESTED handler's exit, so sinks after
        // one went unreported here while no-innerhtml skipped them as
        // ours — the finding belonged to nobody.

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_METHODS.has(node.callee.property.name)
        ) {
          // Check if any argument references event.data
          for (const arg of node.arguments) {
            if (payloadSource(arg) === 'postmessage') {
              context.report({
                node,
                messageId: 'unsafeInnerhtml',
                data: {
                  method: node.callee.property.name,
                },
              });
              break;
            }
          }
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // The resolver is the sole sink condition. A mutable in-handler
        // flag was cleared by any NESTED handler's exit, so sinks after
        // one went unreported here while no-innerhtml skipped them as
        // ours — the finding belonged to nobody.

        // Check for innerHTML/outerHTML assignment
        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_PROPERTIES.has(node.left.property.name)
        ) {
          // Check if right side references event.data
          if (payloadSource(node.right) === 'postmessage') {
            context.report({
              node,
              messageId: 'unsafeInnerhtml',
              data: {
                method: node.left.property.name,
              },
            });
          }
        }
      },
    };
  },
});

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-worker-message-innerhtml
 * Detects unsafe innerHTML usage with Web Worker message data
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Worker
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

type MessageIds = 'workerInnerhtml';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Dangerous DOM properties and methods
const DANGEROUS_PROPERTIES = new Set(['innerHTML', 'outerHTML']);
const DANGEROUS_METHODS = new Set(['insertAdjacentHTML', 'write', 'writeln']);

export const noWorkerMessageInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-worker-message-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-worker-message-innerhtml.md',
      description: 'Disallow using innerHTML with Web Worker message data',
      cwe: 'CWE-79',
      cvss: 7.5,
    },
    messages: {
      workerInnerhtml: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XSS via Worker Message',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          'Using {{method}} with Worker message data can enable XSS if the worker processes untrusted input.',
        severity: 'HIGH',
        fix: 'Sanitize worker data with DOMPurify before rendering, or use textContent.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Worker/message_event',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
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
    // to the worker source. Everything it cannot identify belongs to the
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
          if (payloadSource(node.right) === 'worker') {
            context.report({
              node,
              messageId: 'workerInnerhtml',
              data: { method: propertyName(node.left) as string },
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
            if (payloadSource(arg) === 'worker') {
              context.report({
                node,
                messageId: 'workerInnerhtml',
                data: { method: propertyName(node.callee) as string },
              });
              break;
            }
          }
        }
      },
    };
  },
});

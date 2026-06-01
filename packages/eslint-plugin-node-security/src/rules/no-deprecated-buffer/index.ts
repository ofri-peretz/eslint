/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow `new Buffer()` and `Buffer()` constructor (deprecated since Node 10).
 *
 * The `Buffer` constructor and the `Buffer()` factory call return uninitialized
 * memory when given a number argument — which has caused real vulnerabilities
 * including CVE-2018-7166 (uninitialized memory disclosure in randomFillSync
 * fallback). The constructor is deprecated in Node 10+ and emits a runtime
 * deprecation warning. Use `Buffer.alloc(size)`, `Buffer.allocUnsafe(size)`,
 * `Buffer.from(value)`, or `Buffer.concat()` instead.
 *
 * @see https://nodejs.org/api/buffer.html#bufnew-buffersize
 * @see https://nvd.nist.gov/vuln/detail/CVE-2018-7166
 * @see https://cwe.mitre.org/data/definitions/676.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'deprecatedBufferConstructor' | 'deprecatedBufferCall';

export const noDeprecatedBuffer: TSESLint.RuleModule<MessageIds, []> = createRule<[], MessageIds>({
  name: 'no-deprecated-buffer',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-deprecated-buffer.md',
      description: 'Disallow the deprecated `new Buffer()` constructor and `Buffer()` factory call.',
      cwe: 'CWE-676',
      cvss: 7.5,
    },
    fixable: 'code',
    messages: {
      deprecatedBufferConstructor: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Deprecated Buffer Constructor',
        cwe: 'CWE-676',
        cvss: 7.5,
        description:
          '`new Buffer()` is deprecated since Node 10 and unsafe — when called with a number it returns uninitialized memory (CVE-2018-7166).',
        severity: 'HIGH',
        fix: 'Use `Buffer.alloc(size)` (zero-filled), `Buffer.allocUnsafe(size)` (only when you immediately overwrite the buffer), or `Buffer.from(value)` (for strings/arrays/buffers).',
        documentationLink: 'https://nodejs.org/api/buffer.html#bufnew-buffersize',
      }),
      deprecatedBufferCall: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Deprecated Buffer() Factory Call',
        cwe: 'CWE-676',
        cvss: 7.5,
        description:
          '`Buffer()` (without `new`) is deprecated since Node 10 and unsafe — when called with a number it returns uninitialized memory.',
        severity: 'HIGH',
        fix: 'Use `Buffer.alloc(size)`, `Buffer.allocUnsafe(size)`, or `Buffer.from(value)`.',
        documentationLink: 'https://nodejs.org/api/buffer.html#bufnew-buffersize',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function isBufferIdentifier(node: TSESTree.Node): boolean {
      return (
        node.type === AST_NODE_TYPES.Identifier &&
        (node as TSESTree.Identifier).name === 'Buffer'
      );
    }

    /**
     * Returns the safe replacement for new Buffer(args):
     *   new Buffer(number) → Buffer.alloc(number)
     *   new Buffer(...)    → Buffer.from(...)
     */
    function getBufferReplacement(args: TSESTree.CallExpressionArgument[]): string {
      if (
        args.length === 1 &&
        args[0].type === AST_NODE_TYPES.Literal &&
        typeof (args[0] as TSESTree.Literal).value === 'number'
      ) {
        return 'Buffer.alloc';
      }
      return 'Buffer.from';
    }

    return {
      // Catches `new Buffer(size)` / `new Buffer(arr)` / `new Buffer('str')`
      NewExpression(node) {
        if (!isBufferIdentifier(node.callee)) return;
        const replacement = getBufferReplacement(node.arguments);
        context.report({
          node,
          messageId: 'deprecatedBufferConstructor',
          fix(fixer) {
            // Replace `new Buffer` with `Buffer.from` or `Buffer.alloc`,
            // removing the `new` keyword in the process.
            const sourceCode = context.sourceCode;
            const newToken = sourceCode.getFirstToken(node)!;
            const calleeEnd = node.callee.range![1];
            return fixer.replaceTextRange([newToken.range[0], calleeEnd], replacement);
          },
        });
      },

      // Catches `Buffer(size)` (factory call without `new`)
      CallExpression(node) {
        if (!isBufferIdentifier(node.callee)) return;
        const replacement = getBufferReplacement(node.arguments);
        context.report({
          node,
          messageId: 'deprecatedBufferCall',
          fix(fixer) {
            return fixer.replaceText(node.callee, replacement);
          },
        });
      },
    };
  },
});

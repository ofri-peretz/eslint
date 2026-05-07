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
      description: 'Disallow the deprecated `new Buffer()` constructor and `Buffer()` factory call.',
    },
    hasSuggestions: true,
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

    return {
      // Catches `new Buffer(size)` / `new Buffer(arr)` / `new Buffer('str')`
      NewExpression(node) {
        if (!isBufferIdentifier(node.callee)) return;
        context.report({
          node,
          messageId: 'deprecatedBufferConstructor',
        });
      },

      // Catches `Buffer(size)` (factory call without `new`)
      CallExpression(node) {
        if (!isBufferIdentifier(node.callee)) return;
        context.report({
          node,
          messageId: 'deprecatedBufferCall',
        });
      },
    };
  },
});

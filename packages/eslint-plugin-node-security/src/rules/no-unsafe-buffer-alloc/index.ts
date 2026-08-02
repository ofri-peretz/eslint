/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-buffer-alloc
 *
 * Detects `Buffer.allocUnsafe()` and `Buffer.allocUnsafeSlow()`, which hand
 * back a buffer over memory that was never zeroed. Until every byte is
 * overwritten the buffer contains whatever the allocator last held there —
 * request bodies, session tokens, private keys. Reading or transmitting it
 * before it is fully written discloses that memory (CVE-2018-7166 is the
 * canonical instance of this class in Node itself).
 *
 * CWE-908: Use of Uninitialized Resource
 * OWASP A01:2021 – Broken Access Control
 *
 * ## Detection method: structural-api
 *
 * Unconditional by design. The rule fires on the AST shape
 * `<Buffer>.allocUnsafe(...)` / `<Buffer>.allocUnsafeSlow(...)` and performs
 * **no dataflow or taint analysis** — it does not attempt to prove whether the
 * buffer is fully overwritten before it is read. Rename every variable in the
 * file and it reports identically.
 *
 * The single structural exemption is a same-expression `.fill()`, e.g.
 * `Buffer.allocUnsafe(n).fill(0)`, which zeroes the allocation on the spot and
 * is therefore equivalent to `Buffer.alloc(n)`. That is a parent-node check,
 * not variable tracking.
 *
 * Consequence: a correct `allocUnsafe` immediately overwritten through a
 * variable (`const b = Buffer.allocUnsafe(n); src.copy(b);`) is still reported.
 * That is the documented false-positive profile and the reason the rule ships
 * as `warn` rather than `error` in `recommended`. The complementary CWE-126
 * read-side analysis lives in `no-buffer-overread`.
 *
 * @see https://cwe.mitre.org/data/definitions/908.html
 * @see https://nodejs.org/api/buffer.html#static-method-bufferallocunsafesize
 * @see https://nvd.nist.gov/vuln/detail/CVE-2018-7166
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeAlloc' | 'unsafeAllocSlow' | 'useSafeAlloc';

/** The two uninitialized-memory allocators on `Buffer`. */
const UNSAFE_ALLOCATORS = new Set(['allocUnsafe', 'allocUnsafeSlow']);

export const noUnsafeBufferAlloc = createRule<[], MessageIds>({
  name: 'no-unsafe-buffer-alloc',
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-unsafe-buffer-alloc.md',
      description:
        'Disallow `Buffer.allocUnsafe()` and `Buffer.allocUnsafeSlow()`, which return uninitialized memory',
      cwe: 'CWE-908',
      cweJustification:
        'CWE-908 (Use of Uninitialized Resource) — allocUnsafe returns a view over non-zeroed heap memory; any byte not overwritten before the buffer is read or transmitted discloses prior process memory.',
      cvss: 7.5,
      confidence: 'high',
    },
    messages: {
      unsafeAlloc: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Uninitialized Buffer Allocation',
        cwe: 'CWE-908',
        cvss: 7.5,
        description:
          '`Buffer.allocUnsafe(size)` returns memory that has not been zeroed. Every byte not overwritten before the buffer is read or sent leaks whatever the allocator previously stored there.',
        severity: 'HIGH',
        fix: 'Use `Buffer.alloc(size)` (zero-filled), or keep `allocUnsafe` only where the very next statement overwrites the whole buffer — `Buffer.allocUnsafe(size).fill(0)` is accepted by this rule.',
        documentationLink:
          'https://nodejs.org/api/buffer.html#static-method-bufferallocunsafesize',
      }),
      unsafeAllocSlow: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Uninitialized Buffer Allocation (allocUnsafeSlow)',
        cwe: 'CWE-908',
        cvss: 7.5,
        description:
          '`Buffer.allocUnsafeSlow(size)` allocates outside the shared pool but is equally uninitialized — the returned bytes are whatever was last in that memory.',
        severity: 'HIGH',
        fix: 'Use `Buffer.alloc(size)`, or append `.fill(0)` to zero the allocation at the call site.',
        documentationLink:
          'https://nodejs.org/api/buffer.html#static-method-bufferallocunsafeslowsize',
      }),
      useSafeAlloc: 'Replace with `Buffer.alloc()` (zero-filled).',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    /**
     * True when the call's result is immediately zeroed in the same
     * expression: `Buffer.allocUnsafe(n).fill(0)`. Parent-node shape only.
     */
    function isFilledInPlace(node: TSESTree.CallExpression): boolean {
      const parent = node.parent;
      if (
        parent?.type !== AST_NODE_TYPES.MemberExpression ||
        parent.object !== node ||
        parent.computed ||
        parent.property.type !== AST_NODE_TYPES.Identifier ||
        parent.property.name !== 'fill'
      ) {
        return false;
      }
      // `.fill` must actually be invoked — `f(buf.fill)` passes the method
      // around, it does not zero anything.
      const grandparent = parent.parent;
      return (
        grandparent?.type === AST_NODE_TYPES.CallExpression &&
        grandparent.callee === parent
      );
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.computed ||
          callee.object.type !== AST_NODE_TYPES.Identifier ||
          callee.object.name !== 'Buffer' ||
          callee.property.type !== AST_NODE_TYPES.Identifier ||
          !UNSAFE_ALLOCATORS.has(callee.property.name)
        ) {
          return;
        }

        if (isFilledInPlace(node)) return;

        context.report({
          node,
          messageId:
            callee.property.name === 'allocUnsafe'
              ? 'unsafeAlloc'
              : 'unsafeAllocSlow',
          suggest: [
            {
              messageId: 'useSafeAlloc',
              fix: (fixer: TSESLint.RuleFixer) =>
                fixer.replaceText(callee.property, 'alloc'),
            },
          ],
        });
      },
    };
  },
});

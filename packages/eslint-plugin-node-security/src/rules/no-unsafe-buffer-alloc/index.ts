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

type MessageIds =
  | 'unsafeAlloc'
  | 'unsafeAllocSlow'
  | 'useSafeAlloc'
  | 'unboundedAllocation'
  | 'clampAllocation';

/** The two uninitialized-memory allocators on `Buffer`. */
const UNSAFE_ALLOCATORS = new Set(['allocUnsafe', 'allocUnsafeSlow']);

/**
 * Constructors and factories whose FIRST argument is an allocation size.
 *
 * `new Array(n)` belongs here as much as `Buffer.alloc(n)`: V8 does not
 * pre-allocate the backing store for a sparse array, but the length is stored,
 * every subsequent `for (i = 0; i < array.length; i++)` walks it, and the
 * decoder that filled it holds the connection open for the whole walk.
 */
const SIZED_ALLOCATORS: ReadonlySet<string> = new Set([
  'Array', 'Buffer', 'Uint8Array', 'Uint16Array', 'Uint32Array', 'Int8Array',
  'Int16Array', 'Int32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
  'BigUint64Array', 'ArrayBuffer', 'SharedArrayBuffer',
]);

/**
 * Does this expression look like a COUNT rather than a payload?
 *
 * `new Uint8Array(n)` allocates n bytes; `new Uint8Array(fileContents)` copies
 * an existing array and allocates exactly what the caller already holds. Only
 * the first is an allocation an attacker can inflate, and telling them apart is
 * what keeps `Shopify/cli`
 * `packages/cli-kit/src/public/node/api/bulk-operations/stage-file.ts:112` —
 * `new Blob([new Uint8Array(fileContents)])` — out of the results.
 *
 * `Buffer.alloc(x)` needs no such test: its argument is a size by definition.
 */
function looksNumeric(node: TSESTree.Node): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.Literal:
      return typeof node.value === 'number';
    case AST_NODE_TYPES.BinaryExpression:
      return ['+', '-', '*', '/', '%', '<<', '>>', '>>>'].includes(node.operator);
    case AST_NODE_TYPES.Identifier:
      return COUNT_NAMES.has(node.name.toLowerCase());
    case AST_NODE_TYPES.MemberExpression:
      return (
        !node.computed &&
        node.property.type === AST_NODE_TYPES.Identifier &&
        COUNT_NAMES.has(node.property.name.toLowerCase())
      );
    case AST_NODE_TYPES.CallExpression: {
      // `Math.min(length, MAX)` is the clamped spelling of a size; it has to
      // read as numeric here or `isClamped` below is unreachable.
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.object.type === AST_NODE_TYPES.Identifier &&
        node.callee.object.name === 'Math'
      ) {
        return true;
      }
      const name = calleeName(node.callee);
      return name !== null && /^(read|len|size|count|decode|parse)/i.test(name);
    }
    default:
      return false;
  }
}

/** Names that hold a count, not a payload. */
const COUNT_NAMES: ReadonlySet<string> = new Set([
  'length', 'len', 'size', 'count', 'n', 'num', 'total', 'capacity', 'bytelength',
]);

/** `Buffer.alloc` / `Buffer.allocUnsafe` / `Buffer.allocUnsafeSlow`. */
const BUFFER_ALLOCATORS: ReadonlySet<string> = new Set([
  'alloc', 'allocUnsafe', 'allocUnsafeSlow',
]);

/**
 * Parameter names that hold bytes straight off a socket or a stream.
 *
 * A protocol decoder is the one place where a length field is genuinely
 * attacker-authored, and it is always spelled as one of these.
 */
const WIRE_NAMES: ReadonlySet<string> = new Set([
  'chunk', 'chunks', 'buffer', 'buf', 'data', 'payload', 'frame', 'packet',
  'bytes', 'raw', 'message', 'msg',
]);

/** The name a callee resolves to, for `f()`, `o.f()` and `this.#f()`. */
function calleeName(callee: TSESTree.Node): string | null {
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
  if (callee.type === AST_NODE_TYPES.MemberExpression && !callee.computed) {
    // A non-computed property is an Identifier or a PrivateIdentifier and
    // nothing else, so both carry a `name` and there is no third case to guard.
    return callee.property.name;
  }
  return null;
}

/** The declared name of a function-ish node, however it was written. */
function declaredName(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.FunctionDeclaration && node.id) return node.id.name;
  const parent = node.parent;
  if (parent?.type === AST_NODE_TYPES.VariableDeclarator) {
    return parent.id.type === AST_NODE_TYPES.Identifier ? parent.id.name : null;
  }
  if (
    (parent?.type === AST_NODE_TYPES.MethodDefinition ||
      parent?.type === AST_NODE_TYPES.Property) &&
    !parent.computed
  ) {
    // As above: a non-computed key is an Identifier or a PrivateIdentifier.
    const key = parent.key as TSESTree.Identifier | TSESTree.PrivateIdentifier;
    return key.name;
  }
  return null;
}

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
      unboundedAllocation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Allocation Sized By Untrusted Input',
        cwe: 'CWE-789',
        cvss: 7.5,
        description:
          'The allocation size is read off the wire. A peer that sends a large length field makes the process allocate — and then walk — a structure it never sends the contents for, which is a remote denial of service that costs the attacker one packet.',
        severity: 'HIGH',
        fix: 'Clamp the length before allocating: `if (length > MAX_LENGTH) throw new Error("too long")`, or `new Array(Math.min(length, MAX_LENGTH))`.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/789.html',
      }),
      clampAllocation: 'Clamp the size against a maximum before allocating.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // ── CWE-789: allocation sized by a length field off the wire ──────────
    //
    // `redis/ioredis` `lib/resp/decoder.ts:669` is the archetype:
    //
    // ```ts
    // #decodeArray(typeMapping, chunk) {
    //   return this.#decodeArrayWithLength(this.#decodeUnsingedNumber(0, chunk), typeMapping, chunk);
    // }
    // #decodeArrayWithLength(length, typeMapping, chunk) {
    //   return … : this.#decodeArrayItems(new Array(length), 0, typeMapping, chunk);
    // }
    // ```
    //
    // `length` is a RESP length prefix — a number the peer chose. Nothing in
    // the file bounds it, and `#decodeArrayItems` then loops to `array.length`.
    //
    // Catching it needs one hop between functions: at `new Array(length)` the
    // size is just a parameter. So call sites are collected first, and a
    // parameter counts as wire-derived when some call in the same file passes a
    // wire-derived argument in that position. One hop, not a fixpoint — it is
    // what this shape needs, and a deeper walk would trade precision for
    // decoder shapes nobody writes.

    /** Function name → parameter indices fed a wire-derived argument. */
    const wireParams = new Map<string, Set<number>>();
    /** Allocations to judge at Program:exit, once every call site is known. */
    const pendingAllocations: { node: TSESTree.Node; size: TSESTree.Node }[] = [];

    /** Does this expression read bytes off the wire? */
    function readsWire(node: TSESTree.Node, depth = 0): boolean {
      if (depth > 5) return false;
      switch (node.type) {
        case AST_NODE_TYPES.Identifier: {
          if (WIRE_NAMES.has(node.name.toLowerCase())) return true;
          const owner = enclosingFunction(node);
          if (owner === null) return false;
          const name = declaredName(owner);
          if (name === null) return false;
          const indices = wireParams.get(name);
          if (!indices) return false;
          const index = paramIndexOf(node, owner);
          return index !== null && indices.has(index);
        }
        case AST_NODE_TYPES.MemberExpression:
          return readsWire(node.object, depth + 1);
        case AST_NODE_TYPES.CallExpression:
          // `this.#decodeUnsignedNumber(0, chunk)` — a decode helper handed the
          // wire buffer returns a number the peer chose. `chunk.readUInt32BE(0)`
          // is the same fact written as a method ON the buffer, so the receiver
          // counts as well as the arguments.
          return (
            readsWire(node.callee, depth + 1) ||
            node.arguments.some(
              (argument) =>
                argument.type !== AST_NODE_TYPES.SpreadElement &&
                readsWire(argument, depth + 1),
            )
          );
        case AST_NODE_TYPES.BinaryExpression:
          return (
            readsWire(node.left as TSESTree.Node, depth + 1) ||
            readsWire(node.right, depth + 1)
          );
        default:
          return false;
      }
    }

    /** The nearest enclosing function node, or null at module scope. */
    function enclosingFunction(node: TSESTree.Node): TSESTree.Node | null {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (
          current.type === AST_NODE_TYPES.FunctionDeclaration ||
          current.type === AST_NODE_TYPES.FunctionExpression ||
          current.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          return current;
        }
        current = current.parent;
      }
      return null;
    }

    /** If this identifier is a parameter of `owner`, its index. */
    // oxlint-disable-next-line consistent-function-scoping
    function paramIndexOf(node: TSESTree.Identifier, owner: TSESTree.Node): number | null {
      const params = (owner as TSESTree.FunctionDeclaration).params;
      const index = params.findIndex(
        (param) => param.type === AST_NODE_TYPES.Identifier && param.name === node.name,
      );
      return index === -1 ? null : index;
    }

    /**
     * Is the size already bounded?
     *
     * `Math.min(length, MAX)` clamps it outright; an enclosing comparison on
     * the same identifier is the guard-clause spelling of the same thing.
     */
    function isClamped(size: TSESTree.Node): boolean {
      if (
        size.type === AST_NODE_TYPES.CallExpression &&
        size.callee.type === AST_NODE_TYPES.MemberExpression &&
        size.callee.object.type === AST_NODE_TYPES.Identifier &&
        size.callee.object.name === 'Math' &&
        size.callee.property.type === AST_NODE_TYPES.Identifier &&
        size.callee.property.name === 'min'
      ) {
        return true;
      }
      if (size.type !== AST_NODE_TYPES.Identifier) return false;
      const name = size.name;
      let current: TSESTree.Node | undefined = size.parent;
      while (current) {
        if (current.type === AST_NODE_TYPES.IfStatement) {
          if (mentionsInComparison(current.test, name)) return true;
        }
        if (
          current.type === AST_NODE_TYPES.FunctionDeclaration ||
          current.type === AST_NODE_TYPES.FunctionExpression ||
          current.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          // A guard may also sit as an earlier statement in the same body.
          const body = current.body;
          if (body.type === AST_NODE_TYPES.BlockStatement) {
            for (const statement of body.body) {
              if (
                statement.type === AST_NODE_TYPES.IfStatement &&
                mentionsInComparison(statement.test, name)
              ) {
                return true;
              }
            }
          }
          return false;
        }
        current = current.parent;
      }
      return false;
    }

    /** Does this test compare `name` against something? */
    // oxlint-disable-next-line consistent-function-scoping
    function mentionsInComparison(test: TSESTree.Node, name: string): boolean {
      if (test.type === AST_NODE_TYPES.LogicalExpression) {
        return (
          mentionsInComparison(test.left, name) || mentionsInComparison(test.right, name)
        );
      }
      if (test.type !== AST_NODE_TYPES.BinaryExpression) return false;
      if (!['<', '<=', '>', '>=' ].includes(test.operator)) return false;
      const named = (side: TSESTree.Node): boolean =>
        side.type === AST_NODE_TYPES.Identifier && side.name === name;
      return named(test.left as TSESTree.Node) || named(test.right);
    }

    /** The size argument of an allocation, if this call is one. */
    function allocationSize(
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): TSESTree.Node | null {
      const size = node.arguments[0];
      if (size === undefined || size.type === AST_NODE_TYPES.SpreadElement) return null;
      const callee = node.callee;
      if (
        node.type === AST_NODE_TYPES.NewExpression &&
        callee.type === AST_NODE_TYPES.Identifier &&
        SIZED_ALLOCATORS.has(callee.name)
      ) {
        // `new Uint8Array(bytes)` copies; `new Uint8Array(n)` allocates.
        return looksNumeric(size) ? size : null;
      }
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        !callee.computed &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        callee.object.name === 'Buffer' &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        BUFFER_ALLOCATORS.has(callee.property.name)
      ) {
        return size;
      }
      return null;
    }

    /** Record which parameters of a local function receive wire data. */
    function recordCallSite(node: TSESTree.CallExpression | TSESTree.NewExpression): void {
      const name = calleeName(node.callee);
      if (name === null) return;
      node.arguments.forEach((argument, index) => {
        if (argument.type === AST_NODE_TYPES.SpreadElement) return;
        if (!readsWire(argument)) return;
        const indices = wireParams.get(name) ?? new Set<number>();
        indices.add(index);
        wireParams.set(name, indices);
      });
    }

    function judgeAllocation(node: TSESTree.Node, size: TSESTree.Node): void {
      if (isClamped(size)) return;
      if (!readsWire(size)) return;
      context.report({
        node,
        messageId: 'unboundedAllocation',
        suggest: [{ messageId: 'clampAllocation', fix: () => null }],
      });
    }

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
      NewExpression(node: TSESTree.NewExpression) {
        recordCallSite(node);
        const size = allocationSize(node);
        if (size !== null) pendingAllocations.push({ node, size });
      },

      'Program:exit'() {
        for (const { node, size } of pendingAllocations) judgeAllocation(node, size);
      },

      CallExpression(node) {
        recordCallSite(node);
        const size = allocationSize(node);
        if (size !== null) pendingAllocations.push({ node, size });

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

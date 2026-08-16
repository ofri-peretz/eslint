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
 * ## Detection method: structural-api plus a covered-before-read check
 *
 * The rule fires on the AST shape `<Buffer>.allocUnsafe(...)` /
 * `<Buffer>.allocUnsafeSlow(...)`. Two structural exemptions apply.
 *
 * 1. A same-expression `.fill()` — `Buffer.allocUnsafe(n).fill(0)` — which
 *    zeroes the allocation on the spot and is equivalent to `Buffer.alloc(n)`.
 *
 * 2. A local binding whose first non-metadata use is a **covering write**. The
 *    hazard this rule exists for is a byte that is READ before it is WRITTEN;
 *    a buffer filled before anything looks at it discloses nothing. `ioredis`
 *    `lib/Command.ts:667` is the archetype:
 *
 *    ```ts
 *    const result = Buffer.allocUnsafe(this.length);
 *    let offset = 0;
 *    for (const item of this.items) {
 *      const length = Buffer.byteLength(item);
 *      Buffer.isBuffer(item) ? item.copy(result, offset) : result.write(item, offset, length);
 *      offset += length;
 *    }
 *    return result;
 *    ```
 *
 *    `this.length` is maintained as the exact byte sum of `this.items`, and the
 *    loop writes every one of those bytes before `result` escapes. Reporting it
 *    asks the reviewer to re-derive that each time the file is touched, and the
 *    answer is always the same.
 *
 * A *covering* write is deliberately narrower than "any write". Proving full
 * coverage is undecidable, so the rule recognises the two shapes that cover by
 * construction — a whole-buffer copy (`src.copy(buf)`, `buf.set(src)`,
 * `buf.fill(0)`) and a loop that walks the buffer at a moving offset — and
 * treats a write at a FIXED offset as partial. That keeps the real defect
 * reporting:
 *
 * ```js
 * const header = Buffer.allocUnsafe(16);
 * header.writeUInt32BE(len, 0);  // 12 bytes still uninitialized
 * socket.write(header);          // …and they go out on the wire
 * ```
 *
 * Anything the rule cannot resolve to a local binding — an allocation returned
 * directly, assigned to a property, or passed straight into a call — still
 * reports. The complementary CWE-126 read-side analysis lives in
 * `no-buffer-overread`.
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
  unwrapTypeSyntax,
} from '@interlace/eslint-devkit';
import { resolveConstant, resolveConstantString } from '../../utils/const-value';
import { findVariable } from '../../utils/provenance';

type MessageIds =
  | 'unsafeAlloc'
  | 'unsafeAllocSlow'
  | 'useSafeAlloc'
  | 'unboundedAllocation';

/** The two uninitialized-memory allocators on `Buffer`. */
const UNSAFE_ALLOCATORS = new Set(['allocUnsafe', 'allocUnsafeSlow']);

/**
 * Constructors and factories whose FIRST argument is an allocation size.
 *
 * `new Array(n)` belongs here as much as `Buffer.alloc(n)`, but NOT for the
 * reason this comment used to give ("the length is stored and every subsequent
 * loop walks it"). Measured on V8 (node 24, `--expose-gc`, heapUsed delta):
 *
 * ```text
 * new Array(1e9)  ->  0.003 ms,    0.0 MB   // dictionary mode — free
 * new Array(3e7)  -> 20.700 ms,  228.9 MB   // packed elements — 12 wire bytes buy 229 MB
 * new Array(4e7)  ->  0.007 ms,    0.0 MB   // flips back to dictionary mode
 * ```
 *
 * The cost is a NARROW BAND below V8's packed-elements limit (~33.5M elements),
 * not a monotonic function of n. That inverts the usual advice: a bounds check
 * that rejects only implausibly large lengths rejects exactly the values that
 * cost nothing and admits the ones that cost a quarter of a gigabyte. The typed
 * allocators below have no such threshold — they commit n bytes at every n.
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
 *
 * Every name here denotes a BUFFER, and that is the whole justification for
 * the list: a size derived from one — `chunk.readUInt32BE(0)` — is a size the
 * peer wrote. `bytes` used to sit here and does the opposite: in Node it
 * overwhelmingly names a COUNT (`randomBytes(bytes)`, `bytesRead`, a
 * `highWaterMark` in bytes), so `Buffer.allocUnsafe(bytes)` in a nonce helper
 * was reported as "the peer picks the allocation" on the strength of the
 * spelling alone — renaming the parameter to `n` silenced it, which is the
 * definition of a name-inference false positive. Removed; the decoder shapes
 * this list exists for (`benchmarks/corpus/CWE-770/vulnerable/*`) still report
 * through `chunk`/`req`.
 */
const WIRE_NAMES: ReadonlySet<string> = new Set([
  'chunk', 'chunks', 'buffer', 'buf', 'data', 'payload', 'frame', 'packet',
  'raw', 'message', 'msg',
]);

/**
 * Roots that carry an inbound HTTP request.
 *
 * The wire names above were derived from protocol decoders, so the rule could
 * see a RESP length prefix but not `Number(req.body.count)` — and an HTTP
 * handler is the commonest place a remote peer names an allocation size. Both
 * CWE-770 fixtures in `benchmarks/corpus/CWE-770/vulnerable/` were silent for
 * exactly this reason: the length is off the wire either way, and "off the
 * wire" is the whole predicate.
 */
const REQUEST_ROOTS: ReadonlySet<string> = new Set([
  'req', 'request', 'ctx', 'event',
]);

/**
 * Methods that write INTO their receiver: `buf.fill`, `buf.set`,
 * `buf.write`, and the whole `buf.writeUInt32BE`-style family.
 */
function isWriteMethod(name: string): boolean {
  return name === 'fill' || name === 'set' || name.startsWith('write');
}

/**
 * Calls whose FIRST argument is the destination being written.
 *
 * `src.copy(dest, …)` and `crypto.randomFillSync(dest, …)` write through an
 * argument rather than through the receiver, so a buffer that appears only as
 * `arguments[0]` of one of these is being filled, not read.
 */
const DESTINATION_ARGUMENT_CALLS: ReadonlySet<string> = new Set([
  'copy', 'randomFill', 'randomFillSync',
]);

/** Properties that report the buffer's shape, not its contents. */
const METADATA_PROPERTIES: ReadonlySet<string> = new Set([
  'length', 'byteLength', 'byteOffset', 'buffer',
]);

/**
 * How many bytes each FIXED-WIDTH writer puts down.
 *
 * Two things need this. First, `coversWholeBuffer` used to accept any
 * one-argument write as covering — the `buf.write(str)` / `src.copy(dst)`
 * idiom — which also waved through `header.writeUInt32BE(len)`, where the
 * omitted offset means 0 and only FOUR bytes of a sixteen-byte header are
 * written. Second, a header written entirely at LITERAL offsets is decidably
 * covered, and reporting it asks the reader to re-derive the arithmetic on
 * every visit.
 *
 * `write`, `set`, `copy` and `fill` are deliberately absent: their span
 * depends on a runtime value, so they are judged by the offset rule instead.
 */
const WRITE_WIDTHS: ReadonlyMap<string, number> = new Map([
  ['writeUInt8', 1], ['writeInt8', 1],
  ['writeUInt16LE', 2], ['writeUInt16BE', 2], ['writeInt16LE', 2], ['writeInt16BE', 2],
  ['writeUInt32LE', 4], ['writeUInt32BE', 4], ['writeInt32LE', 4], ['writeInt32BE', 4],
  ['writeFloatLE', 4], ['writeFloatBE', 4],
  ['writeDoubleLE', 8], ['writeDoubleBE', 8],
  ['writeBigInt64LE', 8], ['writeBigInt64BE', 8],
  ['writeBigUInt64LE', 8], ['writeBigUInt64BE', 8],
]);

/**
 * The largest allocation whose byte-by-byte coverage is worth tracking.
 *
 * The map below is a `Uint8Array` of the allocation's size, so an unbounded
 * cap would let `Buffer.allocUnsafe(1e9)` allocate a gigabyte inside the
 * linter. Fixed-offset coverage is a HEADER idiom; past a few kilobytes the
 * shape is a loop, which the offset rule already recognises.
 */
const MAX_TRACKED_ALLOCATION = 4096;

/** The two specifiers that resolve to Node's built-in `buffer` module. */
const BUFFER_MODULES: ReadonlySet<string> = new Set(['buffer', 'node:buffer']);

/** The two specifiers that resolve to Node's built-in `crypto` module. */
const CRYPTO_MODULES: ReadonlySet<string> = new Set(['crypto', 'node:crypto']);

/** Entropy writers that fill their FIRST argument. */
const RANDOM_FILL_CALLS: ReadonlySet<string> = new Set(['randomFill', 'randomFillSync']);

/** `require('crypto')` / `require('node:crypto')`. */
function isCryptoModuleRequire(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'require' &&
    node.arguments[0]?.type === AST_NODE_TYPES.Literal &&
    typeof node.arguments[0].value === 'string' &&
    CRYPTO_MODULES.has(node.arguments[0].value)
  );
}

/** `require('buffer')` / `require('node:buffer')`. */
function isBufferModuleRequire(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'require' &&
    node.arguments[0]?.type === AST_NODE_TYPES.Literal &&
    typeof node.arguments[0].value === 'string' &&
    BUFFER_MODULES.has(node.arguments[0].value)
  );
}

/**
 * Is this expression the `Buffer` constructor object?
 *
 * `Buffer`, or `require('node:buffer').Buffer` — the receiver an allocator is
 * destructured off in hot-path code.
 */
function isBufferObject(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name === 'Buffer';
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'Buffer' &&
    isBufferModuleRequire(node.object)
  );
}

/** Is this node inside a loop body? */
function isInsideLoop(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (
      current.type === AST_NODE_TYPES.ForStatement ||
      current.type === AST_NODE_TYPES.ForOfStatement ||
      current.type === AST_NODE_TYPES.ForInStatement ||
      current.type === AST_NODE_TYPES.WhileStatement ||
      current.type === AST_NODE_TYPES.DoWhileStatement
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * How much of the buffer does this write cover?
 *
 * `fill` runs to the end of the buffer by definition. A one-argument
 * `copy`/`set`/`write` starts at offset 0 and runs for the source's whole
 * length — the "copy the whole thing in" idiom. Everything else carries an
 * explicit destination offset at `arguments[1]`, and then coverage depends on
 * whether that offset MOVES: a variable offset inside a loop is a buffer being
 * walked, a literal offset is one fixed field being stamped and the rest of the
 * allocation left as the allocator handed it over.
 */
function coversWholeBuffer(call: TSESTree.CallExpression, method: string): boolean {
  if (method === 'fill') return true;
  const width = WRITE_WIDTHS.get(method);
  if (width !== undefined) {
    // A fixed-width writer puts down `width` bytes wherever it lands, so a
    // one-argument call is NOT the "copy the whole thing in" idiom — the
    // omitted offset just means 0. Only a MOVING offset inside a loop walks
    // the allocation.
    const offset = call.arguments[1];
    return (
      offset !== undefined &&
      offset.type !== AST_NODE_TYPES.Literal &&
      isInsideLoop(call)
    );
  }
  if (call.arguments.length === 1) return true;
  const offset = call.arguments[1];
  return offset.type !== AST_NODE_TYPES.Literal && isInsideLoop(call);
}

/**
 * The byte range a fixed-width write covers, when both ends are decidable.
 *
 * `header.writeUInt32BE(streamId, 4)` covers bytes 4..7. The offset must be a
 * numeric literal (or omitted, which means 0); anything computed leaves the
 * span unknown and the write stays merely partial.
 */
function fixedWriteSpan(
  call: TSESTree.CallExpression,
  method: string,
): { start: number; end: number } | null {
  const width = WRITE_WIDTHS.get(method);
  if (width === undefined) return null;
  const offset = call.arguments[1];
  if (offset === undefined) return { start: 0, end: width };
  if (offset.type !== AST_NODE_TYPES.Literal || typeof offset.value !== 'number') {
    return null;
  }
  return { start: offset.value, end: offset.value + width };
}

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
          'The allocation size is read off the wire, so the peer picks it. For `new Array(n)` the hazard is a narrow band, not "large n": V8 keeps a packed backing store only up to ~33.5M elements, and a length just under that turns a 12-byte length prefix into a 229MB allocation (measured: `new Array(3e7)` = 228.9MB in 20.7ms). Past the threshold V8 switches the array to dictionary mode and the allocation costs nothing at all (`new Array(4e7)` and `new Array(1e9)` are both 0.0MB in ~0.005ms). A typed allocation — `Buffer.alloc(n)`, `new Uint8Array(n)` — has no such threshold and commits n bytes at any n.',
        severity: 'HIGH',
        fix: 'Clamp the length against the maximum the protocol actually permits, before allocating: `if (length > MAX_LENGTH) throw new Error("too long")`, or `new Array(Math.min(length, MAX_LENGTH))`. A guard that only rejects implausibly huge values is not a fix for `new Array` — those are the sizes V8 makes free. The damaging lengths are the plausible ones just below the packed-elements limit.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/789.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;

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
    /** Call sites to record at Program:exit, once every binding is known. */
    const pendingCallSites: (TSESTree.CallExpression | TSESTree.NewExpression)[] = [];

    // A size is almost never used where it is produced: it is parsed into a
    // local and allocated from the local one line later, and following that hop
    // is what makes `const size = Number(url.searchParams.get('size'));
    // Buffer.alloc(size)` visible. That hop used to run through a file-wide
    // `Map<name, init>`, which cannot tell one scope's `size` from another's —
    // the exact defect `provenance.ts` was written to retire. The scope
    // analyser's own write references subsume it and honour shadowing, so the
    // map is gone.

    /** Does this expression read bytes off the wire? */
    function readsWire(node: TSESTree.Node, depth = 0): boolean {
      // Raised from 5: following a size back through a local binding costs
      // hops the decoder-only version never spent. `Buffer.alloc(size)` where
      // `size` is `Number(url.searchParams.get('size'))` and `url` is
      // `new URL(req.url, base)` is eight links from the request, and it is
      // ordinary handler code — see
      // benchmarks/corpus/CWE-770/vulnerable/buffer-alloc-user.js.
      if (depth > 10) return false;
      // `chunk.readUInt32BE(0) as number` reads exactly what the call reads —
      // the cast is erased at compile time. Without this the switch below falls
      // through to `default: return false`, and a TypeScript decoder (which
      // must write the cast to compile) silences the whole CWE-789 arm.
      const bare = unwrapTypeSyntax(node);
      if (bare !== node) return readsWire(bare, depth + 1);

      switch (node.type) {
        case AST_NODE_TYPES.Identifier: {
          // `Buffer.byteLength(json)` sizes an allocation from a value already
          // in memory, and `Buffer` is not wire data — but `buffer` is in
          // WIRE_NAMES because it is a conventional PARAMETER name for bytes
          // off a socket. Resolving the binding is what tells the two apart:
          // the global (or an import from `node:buffer`) is the namespace.
          if (node.name === 'Buffer') {
            const bound = findVariable(sourceCode, node);
            if (bound === null || bound.defs.length === 0) return false;
            if (bound.defs[0].type === 'ImportBinding') return false;
          }
          const lower = node.name.toLowerCase();
          if (WIRE_NAMES.has(lower) || REQUEST_ROOTS.has(lower)) return true;
          const owner = enclosingFunction(node);
          if (owner !== null) {
            const name = declaredName(owner);
            const indices = name === null ? undefined : wireParams.get(name);
            if (indices !== undefined) {
              const index = paramIndexOf(node, owner);
              if (index !== null && indices.has(index)) return true;
            }
          }
          // The LAST write before this use, not the declarator.
          // `let capacity = 1024; if (…) capacity = Number(req.query.capacity);
          // Buffer.alloc(capacity)` reaches the sink carrying the request, and
          // reading the declarator alone answers `1024` — a false negative that
          // looks exactly like a safe constant. Taking "any write" instead
          // would invert it, reporting a value that has since been overwritten
          // with a literal.
          const variable = findVariable(sourceCode, node);
          const lastWrite = (variable?.references ?? [])
            .map((reference) => reference.writeExpr)
            .filter((write): write is TSESTree.Node => write != null)
            .filter((write) => write.range[1] <= node.range[0])
            .sort((a, b) => a.range[1] - b.range[1])
            .at(-1);
          return lastWrite !== undefined && readsWire(lastWrite, depth + 1);
        }
        case AST_NODE_TYPES.MemberExpression:
          return readsWire(node.object, depth + 1);
        // `new URL(req.url, base)` is a request that has been through a
        // constructor; the searchParams read off it are still the peer's.
        case AST_NODE_TYPES.NewExpression:
          return node.arguments.some(
            (argument) =>
              argument.type !== AST_NODE_TYPES.SpreadElement &&
              readsWire(argument, depth + 1),
          );
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
     *
     * A clamp is only a clamp against a bound the PEER CANNOT MOVE.
     * `Math.min(req.body.windowBytes, req.body.maxWindowBytes)` wears the shape
     * of a mitigation while leaving both operands in the attacker's hands, and
     * accepting it on shape alone made the fake mitigation quieter than no
     * mitigation at all. At least one operand has to be out of reach.
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
        return size.arguments.some(
          (argument) =>
            argument.type !== AST_NODE_TYPES.SpreadElement && !readsWire(argument),
        );
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
      });
    }

    /** What one mention of the buffer binding does to it. */
    type Use = 'covering' | 'partial' | 'read' | 'metadata';

    /**
     * Classify a single reference to the allocated binding.
     *
     * Anything not recognised as a write is a READ, which is the conservative
     * answer: it ends the scan and reports. The point of the classification is
     * to find evidence of coverage, never to prove the absence of a read.
     */
    // oxlint-disable-next-line consistent-function-scoping
    function classifyUse(identifier: TSESTree.Identifier): Use {
      const parent = identifier.parent;
      if (parent.type === AST_NODE_TYPES.MemberExpression && parent.object === identifier) {
        if (parent.computed) {
          // `buf[i] = x` writes one byte at one index; `x = buf[i]` reads one.
          const grandparent = parent.parent;
          return grandparent.type === AST_NODE_TYPES.AssignmentExpression &&
            grandparent.left === parent
            ? 'partial'
            : 'read';
        }
        if (parent.property.type !== AST_NODE_TYPES.Identifier) return 'read';
        const name = parent.property.name;
        if (METADATA_PROPERTIES.has(name)) return 'metadata';
        const grandparent = parent.parent;
        if (
          grandparent.type !== AST_NODE_TYPES.CallExpression ||
          grandparent.callee !== parent ||
          !isWriteMethod(name)
        ) {
          return 'read';
        }
        return coversWholeBuffer(grandparent, name) ? 'covering' : 'partial';
      }
      // `src.copy(buf, offset)` / `crypto.randomFillSync(buf)`.
      if (parent.type === AST_NODE_TYPES.CallExpression && parent.arguments[0] === identifier) {
        const method = destinationArgumentCallee(parent.callee);
        if (method === null) return 'read';
        return coversWholeBuffer(parent, method) ? 'covering' : 'partial';
      }
      return 'read';
    }

    /**
     * The name of a call that writes THROUGH its first argument, if this is one.
     *
     * `crypto.randomFillSync(buf)` was recognised and the named-import spelling
     * of the same call — `import { randomFillSync } from 'node:crypto'` — was
     * not, because the test insisted on a member expression. That is a false
     * positive on the one idiom where `allocUnsafe` is unambiguously correct: a
     * buffer that exists only to be overwritten with entropy.
     *
     * A bare identifier is accepted only when its binding resolves to
     * `node:crypto` — `copy` as a free function is somebody else's `copy`, not
     * `Buffer#copy`.
     */
    function destinationArgumentCallee(callee: TSESTree.Node): string | null {
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        !callee.computed &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        DESTINATION_ARGUMENT_CALLS.has(callee.property.name)
      ) {
        return callee.property.name;
      }
      if (
        callee.type !== AST_NODE_TYPES.Identifier ||
        !RANDOM_FILL_CALLS.has(callee.name)
      ) {
        return null;
      }
      const variable = findVariable(sourceCode, callee);
      if (variable === null || variable.defs.length === 0) return null;
      const def = variable.defs[0];
      if (def.type === 'ImportBinding') {
        // `import x = require('crypto')` carries its specifier elsewhere and
        // binds the module object, not the filler, so it stays unresolved.
        const declaration = def.parent;
        return declaration.type === AST_NODE_TYPES.ImportDeclaration &&
          CRYPTO_MODULES.has(declaration.source.value)
          ? callee.name
          : null;
      }
      // `const { randomFillSync } = require('node:crypto')`
      return def.type === 'Variable' &&
        def.node.init !== null &&
        isCryptoModuleRequire(def.node.init)
        ? callee.name
        : null;
    }

    /**
     * Is every byte written before anything reads this allocation?
     *
     * Only a `const`/`let` declarator binding an identifier is analysed —
     * `this.buf = Buffer.allocUnsafe(n)` or `return Buffer.allocUnsafe(n)` puts
     * the buffer somewhere this file cannot follow, which is unresolved and
     * therefore still reported.
     *
     * References are taken from the scope analyser and walked in SOURCE order.
     * That is an approximation of execution order and it is stated rather than
     * hidden: a buffer written in a callback declared above its first read
     * would be judged on where the text sits, not on when it runs.
     */
    function isCoveredBeforeRead(call: TSESTree.CallExpression): boolean {
      const declarator = call.parent;
      if (
        declarator.type !== AST_NODE_TYPES.VariableDeclarator ||
        declarator.init !== call ||
        declarator.id.type !== AST_NODE_TYPES.Identifier
      ) {
        return false;
      }
      // A declarator binding a plain identifier declares exactly one variable,
      // so the lookup cannot come back empty. Casting rather than branching
      // keeps an impossible case out of the coverage numbers, where an
      // unreachable guard is indistinguishable from an untested one.
      const variable = context.sourceCode.getDeclaredVariables(
        declarator,
      )[0] as TSESLint.Scope.Variable;

      const uses = variable.references
        .filter((reference) => reference.identifier !== declarator.id)
        .sort((a, b) => a.identifier.range[0] - b.identifier.range[0]);

      // Byte map for the fixed-offset case. A header stamped field by field at
      // LITERAL offsets — `writeUInt32BE(id, 0); writeUInt32BE(len, 4)` on an
      // eight-byte allocation — is fully covered, and the arithmetic is
      // decidable without knowing a single runtime value. Judging those writes
      // "partial" made the commonest legitimate use of `allocUnsafe` in
      // protocol code a permanent finding.
      const covered = byteMapFor(call);
      let remaining = covered === null ? -1 : covered.length;

      for (const use of uses) {
        const kind = classifyUse(use.identifier as TSESTree.Identifier);
        // Metadata reads disclose nothing, and a partial write is not a read —
        // neither settles the question, so keep looking for the first one that
        // does.
        if (kind === 'metadata') continue;
        if (kind === 'partial') {
          if (covered !== null) {
            remaining -= markFixedWrite(covered, use.identifier as TSESTree.Identifier);
            if (remaining === 0) return true;
          }
          continue;
        }
        return kind === 'covering';
      }
      return false;
    }

    /**
     * A zeroed byte map the size of this allocation, when that size is a
     * resolvable constant small enough to be a header.
     */
    // oxlint-disable-next-line consistent-function-scoping
    function byteMapFor(call: TSESTree.CallExpression): Uint8Array | null {
      const argument = call.arguments[0];
      if (argument === undefined || argument.type === AST_NODE_TYPES.SpreadElement) {
        return null;
      }
      const resolved = resolveConstant(sourceCode, argument);
      if (resolved === null || typeof resolved.value !== 'number') return null;
      const size = resolved.value;
      if (!Number.isInteger(size) || size <= 0 || size > MAX_TRACKED_ALLOCATION) {
        return null;
      }
      return new Uint8Array(size);
    }

    /**
     * Mark the bytes this use writes, and report how many were newly covered.
     *
     * A span that does not fit inside the allocation contributes NOTHING. A
     * write running off the end is a different weakness (CWE-787) — in Node it
     * throws `ERR_OUT_OF_RANGE` — and it must not be able to "finish" the
     * coverage of the buffer it overflows.
     */
    // oxlint-disable-next-line consistent-function-scoping
    function markFixedWrite(covered: Uint8Array, identifier: TSESTree.Identifier): number {
      const member = identifier.parent;
      if (
        member.type !== AST_NODE_TYPES.MemberExpression ||
        member.property.type !== AST_NODE_TYPES.Identifier
      ) {
        return 0;
      }
      const call = member.parent;
      if (call.type !== AST_NODE_TYPES.CallExpression) return 0;
      const span = fixedWriteSpan(call, member.property.name);
      if (span === null || span.start < 0 || span.end > covered.length) return 0;
      let added = 0;
      for (let index = span.start; index < span.end; index += 1) {
        if (covered[index] === 0) {
          covered[index] = 1;
          added += 1;
        }
      }
      return added;
    }

    /**
     * Which uninitialized allocator does this callee reach, if any?
     *
     * Three spellings, all of them ordinary code, all of them the same
     * allocation:
     *
     * ```js
     * Buffer.allocUnsafe(n)                                   // the obvious one
     * const ALLOCATOR = 'allocUnsafe'; Buffer[ALLOCATOR](n)   // config-driven pool
     * const { allocUnsafe } = Buffer; allocUnsafe(n)          // hoisted hot path
     * ```
     *
     * A callee-shape test saw only the first. The computed key is resolved
     * through `resolveConstantString` and the destructured binding through the
     * scope analyser, so all three are decided by what the call *reaches*
     * rather than by how it is written.
     */
    function unsafeAllocator(callee: TSESTree.Node): string | null {
      if (callee.type === AST_NODE_TYPES.MemberExpression) {
        if (!isBufferObject(callee.object)) return null;
        const name = callee.computed
          ? resolveConstantString(sourceCode, callee.property)?.value
          : callee.property.type === AST_NODE_TYPES.Identifier
            ? callee.property.name
            : undefined;
        return name !== undefined && UNSAFE_ALLOCATORS.has(name) ? name : null;
      }
      if (callee.type !== AST_NODE_TYPES.Identifier) return null;
      // `const { allocUnsafe } = Buffer` — the binding's own parent is the
      // destructuring property, so the KEY is read directly.
      const variable = findVariable(sourceCode, callee);
      if (variable === null || variable.defs.length === 0) return null;
      const def = variable.defs[0];
      if (def.type !== 'Variable' || def.node.init === null) return null;
      if (!isBufferObject(def.node.init)) return null;
      const property = def.name.parent;
      if (
        property.type !== AST_NODE_TYPES.Property ||
        property.computed ||
        property.key.type !== AST_NODE_TYPES.Identifier
      ) {
        return null;
      }
      return UNSAFE_ALLOCATORS.has(property.key.name) ? property.key.name : null;
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
        pendingCallSites.push(node);
        const size = allocationSize(node);
        if (size !== null) pendingAllocations.push({ node, size });
      },

      'Program:exit'() {
        for (const call of pendingCallSites) recordCallSite(call);
        for (const { node, size } of pendingAllocations) judgeAllocation(node, size);
      },

      CallExpression(node) {
        pendingCallSites.push(node);
        const size = allocationSize(node);
        if (size !== null) pendingAllocations.push({ node, size });

        const callee = node.callee;
        const allocator = unsafeAllocator(callee);
        if (allocator === null) return;

        if (isFilledInPlace(node)) return;
        if (isCoveredBeforeRead(node)) return;

        // The suggestion rewrites the PROPERTY, so it exists only for the
        // spelling that has one. `Buffer[ALLOCATOR](n)` would become
        // `Buffer[alloc](n)` — a reference to an undeclared binding — and a
        // destructured `allocUnsafe(n)` has no property to rewrite at all.
        const rewritable =
          callee.type === AST_NODE_TYPES.MemberExpression &&
          !callee.computed &&
          callee.property.type === AST_NODE_TYPES.Identifier
            ? callee.property
            : null;

        context.report({
          node,
          messageId: allocator === 'allocUnsafe' ? 'unsafeAlloc' : 'unsafeAllocSlow',
          ...(rewritable === null
            ? {}
            : {
                suggest: [
                  {
                    messageId: 'useSafeAlloc' as const,
                    fix: (fixer: TSESLint.RuleFixer) =>
                      fixer.replaceText(rewritable, 'alloc'),
                  },
                ],
              }),
        });
      },
    };
  },
});

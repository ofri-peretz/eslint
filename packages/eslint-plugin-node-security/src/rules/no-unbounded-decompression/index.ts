/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unbounded-decompression
 * Detects zlib one-shot decompression with no `maxOutputLength` ceiling.
 * CWE-409: Improper Handling of Highly Compressed Data (Decompression Bomb)
 *
 * `zlib.gunzip(body, cb)` buffers the ENTIRE expansion in memory before the
 * callback runs. A ~1 KB crafted gzip member expands to gigabytes, so one
 * request kills the process — no loop, no recursion, nothing a rate limiter
 * sees. `maxOutputLength` makes zlib abort with `ERR_BUFFER_TOO_LARGE` once
 * output passes the cap, which is the only in-band defence Node offers.
 *
 * Scope note (rule partition): the streaming factories
 * (`zlib.createGunzip`/`createUnzip`/`createInflate`) are owned by
 * `secure-coding/no-unlimited-resource-allocation`. This rule owns only the
 * buffer-at-once entry points, which that rule does not match.
 *
 * @see https://cwe.mitre.org/data/definitions/409.html
 * @see https://nodejs.org/api/zlib.html#class-options
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { findVariable } from '../../utils/provenance';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  isTestFilePath,
  MessageIcons,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
  staticString,
} from '@interlace/eslint-devkit';

type MessageIds = 'unboundedDecompression';

/**
 * AEAD ciphers whose `final()` throws unless the tag verifies: what comes out
 * was produced by someone holding the key.
 */
const AEAD_ALGORITHM = /-(gcm|ccm|ocb)$|^chacha20-poly1305$/i;

export interface Options {
  /** Skip test and spec files. Default: true; set false to lint them too */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/** `zlib` / `node:zlib` — the only module whose exports this rule claims. */
const ZLIB_MODULE = /^(node:)?zlib$/;

/** `(buffer[, options], callback)` — everything buffers into one Buffer. */
const ASYNC_DECOMPRESSORS: ReadonlySet<string> = new Set([
  'gunzip',
  'inflate',
  'inflateRaw',
  'unzip',
  'brotliDecompress',
  'zstdDecompress',
]);

/** `(buffer[, options])` — same, on the calling thread. */
const SYNC_DECOMPRESSORS: ReadonlySet<string> = new Set([
  'gunzipSync',
  'inflateSync',
  'inflateRawSync',
  'unzipSync',
  'brotliDecompressSync',
  'zstdDecompressSync',
]);

export const noUnboundedDecompression = createRule<RuleOptions, MessageIds>({
  name: 'no-unbounded-decompression',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-unbounded-decompression.md',
      description:
        'Require a maxOutputLength ceiling on zlib one-shot decompression',
      cwe: 'CWE-409',
      cvss: 7.5,
    },
    hasSuggestions: false,
    messages: {
      unboundedDecompression: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unbounded decompression',
        cwe: 'CWE-409',
        description:
          'zlib.{{fn}}() buffers the whole decompressed result in memory with no maxOutputLength cap. A few KB of crafted input can expand to gigabytes and exhaust the heap (decompression bomb).',
        severity: 'HIGH',
        fix: 'Pass an explicit ceiling: zlib.{{fn}}(input, { maxOutputLength: 10 * 1024 * 1024 }, …)',
        documentationLink: 'https://nodejs.org/api/zlib.html#class-options',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow unbounded decompression in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let isTestFile: boolean;

    /** `'node:zlib'` and `` `node:zlib` `` are the same specifier. */
    function isZlibSpecifier(node: TSESTree.Node): boolean {
      const specifier = staticString(node);
      return specifier !== null && ZLIB_MODULE.test(specifier);
    }

    /**
     * The binding devkit's `resolveModuleBinding` does not follow:
     * `await import('node:zlib')`. (`import zlib = require('zlib')` it now
     * resolves itself.) Returns the export path under zlib the identifier
     * denotes, or `null`. Resolved through scope, so a parameter that shadows
     * the name is not it.
     */
    function extraZlibPath(
      identifier: TSESTree.Identifier,
      scope: TSESLint.Scope.Scope,
    ): string[] | null {
      let variable: TSESLint.Scope.Variable | undefined;
      for (let s: TSESLint.Scope.Scope | null = scope; s; s = s.upper) {
        variable = s.set.get(identifier.name);
        if (variable) break;
      }
      const def = variable?.defs[0];
      if (!variable || !def) return null;

      if (def.node.type !== AST_NODE_TYPES.VariableDeclarator) return null;
      const init = def.node.init;
      if (
        init?.type !== AST_NODE_TYPES.AwaitExpression ||
        init.argument.type !== AST_NODE_TYPES.ImportExpression ||
        !isZlibSpecifier(init.argument.source)
      ) {
        return null;
      }
      // A reassigned binding may hold something else by the time it is used.
      if (variable.references.filter((ref) => ref.isWrite()).length !== 1) {
        return null;
      }
      const id = def.node.id;
      if (id.type === AST_NODE_TYPES.Identifier) return [];
      if (id.type !== AST_NODE_TYPES.ObjectPattern) return null;
      for (const property of id.properties) {
        // Abstain on a rest element, a runtime-decided key (`objectKeyName`
        // is null for `{ [k]: g }`) and a nested pattern.
        if (property.type !== AST_NODE_TYPES.Property) continue;
        const key = objectKeyName(property);
        if (
          key !== null &&
          property.value.type === AST_NODE_TYPES.Identifier &&
          property.value.name === identifier.name
        ) {
          return [key];
        }
      }
      return null;
    }

    /**
     * Resolve a callee to the zlib export path it names, from what it was
     * imported from, not from its spelling — `const z = require('node:zlib')`
     * is the same API, and a local helper (or parameter) named `gunzip` is not.
     */
    function zlibPath(
      callee: TSESTree.Expression,
      scope: TSESLint.Scope.Scope,
    ): string[] | null {
      const binding = resolveModuleBinding(callee, scope);
      if (binding !== undefined) {
        return binding.module === 'zlib' ? binding.path : null;
      }
      if (callee.type === AST_NODE_TYPES.Identifier) {
        return extraZlibPath(callee, scope);
      }
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.object.type === AST_NODE_TYPES.Identifier
      ) {
        const name = propertyName(callee);
        const base = extraZlibPath(callee.object, scope);
        return name !== null && base !== null ? [...base, name] : null;
      }
      return null;
    }

    /** Resolve a call to the zlib decompressor it invokes, or `null`. */
    function decompressorName(node: TSESTree.CallExpression): string | null {
      const path = zlibPath(node.callee, context.sourceCode.getScope(node));
      if (path === null || path.length !== 1) return null;
      const [name] = path;
      return ASYNC_DECOMPRESSORS.has(name) || SYNC_DECOMPRESSORS.has(name)
        ? name
        : null;
    }

    /**
     * A literal payload is not attacker-steerable — a checked-in base64 blob
     * expands to exactly what the author put in it. Only unknown input can
     * carry a bomb.
     */
    function isLiteralPayload(
      argument: TSESTree.CallExpressionArgument,
    ): boolean {
      if (argument.type === AST_NODE_TYPES.Literal) return true;
      return (
        argument.type === AST_NODE_TYPES.CallExpression &&
        argument.callee.type === AST_NODE_TYPES.MemberExpression &&
        argument.callee.object.type === AST_NODE_TYPES.Identifier &&
        argument.callee.object.name === 'Buffer' &&
        argument.arguments[0]?.type === AST_NODE_TYPES.Literal
      );
    }

    /** Every value this binding is ever assigned, or null if any is unseen. */
    function writesOf(identifier: TSESTree.Identifier): TSESTree.Node[] | null {
      const variable = findVariable(context.sourceCode, identifier);
      if (variable === null || variable.defs[0]?.type !== 'Variable') {
        return null;
      }
      const writes = variable.references
        .filter((ref) => ref.isWrite())
        .map((ref) => ref.writeExpr);
      // `x++` writes with no expression to follow.
      return writes.length > 0 && writes.every((w) => w != null)
        ? (writes as TSESTree.Node[])
        : null;
    }

    /** `name` when this identifier is the receiver of `identifier.name(…)`. */
    function methodCalledOn(identifier: TSESTree.Node): string | null {
      const member = identifier.parent as TSESTree.Node;
      if (member.type !== AST_NODE_TYPES.MemberExpression) return null;
      const call = member.parent;
      return call.type === AST_NODE_TYPES.CallExpression &&
        call.callee === member
        ? propertyName(member)
        : null;
    }

    /**
     * `createDecipheriv('aes-256-gcm', …)` from node:crypto, with its tag set
     * through `setAuthTag` somewhere in the file.
     */
    function isAuthenticatingDecipher(identifier: TSESTree.Node): boolean {
      const writes = writesOf(identifier as TSESTree.Identifier);
      if (writes === null || writes.length !== 1) return false;
      const [init] = writes;
      if (init.type !== AST_NODE_TYPES.CallExpression) return false;
      const binding = resolveModuleBinding(
        init.callee,
        context.sourceCode.getScope(init),
      );
      const algorithm = init.arguments[0] && staticString(init.arguments[0]);
      if (
        binding?.module !== 'crypto' ||
        binding.path.join('.') !== 'createDecipheriv' ||
        !algorithm ||
        !AEAD_ALGORITHM.test(algorithm)
      ) {
        return false;
      }
      return findVariable(
        context.sourceCode,
        identifier as TSESTree.Identifier,
      )!.references.some(
        (ref) => methodCalledOn(ref.identifier) === 'setAuthTag',
      );
    }

    /** `decipher.update(…)` or `decipher.final()` on an authenticating decipher. */
    function decipherStep(node: TSESTree.Node): 'update' | 'final' | null {
      if (
        node.type !== AST_NODE_TYPES.CallExpression ||
        node.callee.type !== AST_NODE_TYPES.MemberExpression
      ) {
        return null;
      }
      const step = propertyName(node.callee);
      if (step !== 'update' && step !== 'final') return null;
      return isAuthenticatingDecipher(node.callee.object) ? step : null;
    }

    /**
     * Was this payload produced by an AEAD decipher whose `final()` ran?
     *
     * nestjs/workflows' `AesGcmPayloadCodec` inflates a payload only after
     * `Buffer.concat([decipher.update(…), decipher.final()])` on an
     * `aes-256-gcm` decipher with its tag set. `final()` throws unless the tag
     * verifies, so a bomb has to be sealed with the codec's key: whoever can
     * do that already writes the payloads. Followed through `const`/`let`
     * bindings (every write must qualify) and `.subarray()` / `.slice()`.
     * `seen` stops a binding written from itself (`p = p.subarray(1)`).
     */
    function isAuthenticatedPlaintext(
      node: TSESTree.Node,
      seen: Set<string> = new Set(),
    ): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        if (seen.has(node.name)) return false;
        seen.add(node.name);
        const writes = writesOf(node);
        return (
          writes !== null &&
          writes.every((write) => isAuthenticatedPlaintext(write, seen))
        );
      }
      if (
        node.type !== AST_NODE_TYPES.CallExpression ||
        node.callee.type !== AST_NODE_TYPES.MemberExpression
      ) {
        return false;
      }
      const callee = node.callee;
      const method = propertyName(callee);
      if (method === 'subarray' || method === 'slice') {
        return isAuthenticatedPlaintext(callee.object, seen);
      }
      // `Buffer.concat([d.update(x), d.final()])`: every part is a step of
      // the decipher, and `final()` is one of them.
      const array = node.arguments[0];
      if (
        method !== 'concat' ||
        context.sourceCode.getText(callee.object) !== 'Buffer' ||
        array?.type !== AST_NODE_TYPES.ArrayExpression
      ) {
        return false;
      }
      const steps = array.elements.map((element) =>
        element === null ? null : decipherStep(element),
      );
      if (!steps.every((step) => step !== null) || !steps.includes('final')) {
        return false;
      }
      // One decipher: a `final()` on another one authenticates nothing here.
      const receivers = new Set(
        array.elements.map((element) =>
          context.sourceCode.getText(
            (
              (element as TSESTree.CallExpression)
                .callee as TSESTree.MemberExpression
            ).object,
          ),
        ),
      );
      return receivers.size === 1;
    }

    /**
     * Read the output ceiling off an options literal. `unknown` means a spread
     * could be carrying the cap — reporting that would be a guess, and the
     * only fix on offer would be the one the author already applied.
     */
    function outputCap(
      options_: TSESTree.ObjectExpression,
    ): 'capped' | 'uncapped' | 'unknown' {
      let capped = false;
      for (const property of options_.properties) {
        if (property.type === AST_NODE_TYPES.SpreadElement) return 'unknown';
        // The `computed` bail went with the ternary: a computed key whose
        // value is a static string is the same property, and skipping it here
        // is what made this rule blind to `{ ['maxOutputLength']: n }`.
        const named = objectKeyName(property);
        if (named === 'maxOutputLength') capped = true;
      }
      return capped ? 'capped' : 'uncapped';
    }

    function judge(node: TSESTree.CallExpression): void {
      const fn = decompressorName(node);
      if (fn === null) return;

      const args = node.arguments;
      const payload = args[0];
      if (payload === undefined) return;
      if (isLiteralPayload(payload)) return;
      if (isAuthenticatedPlaintext(payload)) return;

      // Async form is `(buffer[, options], callback)`: with two arguments the
      // second is the callback. Otherwise zlib reads the second argument as
      // the options and ignores anything past the callback — so does this
      // rule (`gunzipSync(input, {}, onDone)` is uncapped; the extra argument
      // used to make it abstain).
      const isAsync = ASYNC_DECOMPRESSORS.has(fn);
      if (isAsync && args.length < 2) return;
      const optionsArgument =
        isAsync && args.length === 2 ? undefined : args[1];
      if (optionsArgument !== undefined) {
        // An options value this rule cannot read (`opts`, `{...defaults}`)
        // could already carry the cap. Reporting it would be a guess.
        if (optionsArgument.type !== AST_NODE_TYPES.ObjectExpression) return;
        if (outputCap(optionsArgument) !== 'uncapped') return;
      }

      context.report({
        node,
        messageId: 'unboundedDecompression',
        data: { fn },
      });
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        const { allowInTests = true } = options as Options;

        isTestFile = allowInTests && isTestFilePath(context.filename);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (isTestFile) return;
        judge(node);
      },
    };
  },
});

export type { Options as NoUnboundedDecompressionOptions };

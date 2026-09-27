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
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  isTestFilePath,
  MessageIcons,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

type MessageIds = 'unboundedDecompression';

export interface Options {
  /** Allow unbounded decompression in test files. Default: false */
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
            default: false,
            description: 'Allow unbounded decompression in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = false } = options as Options;

    const isTestFile = allowInTests && isTestFilePath(context.filename);

    function isZlibSpecifier(node: TSESTree.Node | undefined): boolean {
      return (
        node?.type === AST_NODE_TYPES.Literal &&
        typeof node.value === 'string' &&
        ZLIB_MODULE.test(node.value)
      );
    }

    /**
     * The two bindings devkit's `resolveModuleBinding` does not follow:
     * `import zlib = require('zlib')` (TS) and `await import('node:zlib')`.
     * Returns the export path under zlib the identifier denotes, or `null`.
     * Resolved through scope, so a parameter that shadows the name is not it.
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

      if (
        def.node.type === AST_NODE_TYPES.TSImportEqualsDeclaration &&
        def.node.moduleReference.type ===
          AST_NODE_TYPES.TSExternalModuleReference
      ) {
        return isZlibSpecifier(def.node.moduleReference.expression) ? [] : null;
      }

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

      // Async form is `(buffer[, options], callback)`; the trailing callback is
      // never the options object, so it is excluded before the search.
      const isAsync = ASYNC_DECOMPRESSORS.has(fn);
      if (isAsync && args.length < 2) return;
      const candidates = isAsync
        ? args.slice(1, args.length - 1)
        : args.slice(1);

      if (candidates.length > 1) return;

      const optionsArgument = candidates[0];
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
      CallExpression(node: TSESTree.CallExpression) {
        if (isTestFile) return;
        judge(node);
      },
    };
  },
});

export type { Options as NoUnboundedDecompressionOptions };

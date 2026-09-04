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
  memberPropertyName,
  MessageIcons,
  objectKeyName,
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

    /**
     * Locals bound to the zlib namespace, and locals bound directly to one of
     * its decompressors. Resolved from the import/require, not from the
     * spelling of the variable — `const z = require('node:zlib')` is the same
     * API, and a local helper named `gunzip` is not.
     */
    const namespaceBindings = new Set<string>();
    const directBindings = new Map<string, string>();

    /** Candidate calls, judged at `Program:exit` so binding order is moot. */
    const pending: { node: TSESTree.CallExpression }[] = [];

    function noteDirect(local: string, imported: string): void {
      if (
        ASYNC_DECOMPRESSORS.has(imported) ||
        SYNC_DECOMPRESSORS.has(imported)
      ) {
        directBindings.set(local, imported);
      }
    }

    /** `require('zlib')` / `require('node:zlib')`. */
    function requiredModule(init: TSESTree.Expression): string | null {
      if (
        init.type === AST_NODE_TYPES.CallExpression &&
        init.callee.type === AST_NODE_TYPES.Identifier &&
        init.callee.name === 'require' &&
        init.arguments[0]?.type === AST_NODE_TYPES.Literal &&
        typeof init.arguments[0].value === 'string'
      ) {
        return init.arguments[0].value;
      }
      return null;
    }

    /** Resolve a call to the zlib decompressor it invokes, or `null`. */
    function decompressorName(node: TSESTree.CallExpression): string | null {
      const callee = node.callee;

      // `zlib['unzipSync'](body)` inflates the same unbounded input. Resolved
      // once, before the guard, so the guard tests the binding the body reads.
      const name = memberPropertyName(callee);
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        name !== null &&
        namespaceBindings.has(callee.object.name)
      ) {
        return ASYNC_DECOMPRESSORS.has(name) || SYNC_DECOMPRESSORS.has(name)
          ? name
          : null;
      }

      if (callee.type === AST_NODE_TYPES.Identifier) {
        return directBindings.get(callee.name) ?? null;
      }

      return null;
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
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (!ZLIB_MODULE.test(node.source.value)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type === AST_NODE_TYPES.ImportSpecifier) {
            // `import { "gunzip" as gz }` is legal ES2022 and binds the same
            // export as `import { gunzip as gz }`.
            const imported =
              specifier.imported.type === AST_NODE_TYPES.Identifier
                ? specifier.imported.name
                : specifier.imported.value;
            noteDirect(specifier.local.name, imported);
            continue;
          }
          namespaceBindings.add(specifier.local.name);
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init) return;
        const source = requiredModule(node.init);
        if (source === null || !ZLIB_MODULE.test(source)) return;

        if (node.id.type === AST_NODE_TYPES.Identifier) {
          namespaceBindings.add(node.id.name);
          return;
        }
        if (node.id.type !== AST_NODE_TYPES.ObjectPattern) return;
        for (const property of node.id.properties) {
          if (property.type !== AST_NODE_TYPES.Property) continue;
          if (
            property.key.type === AST_NODE_TYPES.Identifier &&
            property.value.type === AST_NODE_TYPES.Identifier
          ) {
            noteDirect(property.value.name, property.key.name);
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (isTestFile) return;
        pending.push({ node });
      },

      'Program:exit'() {
        for (const { node } of pending) judge(node);
      },
    };
  },
});

export type { Options as NoUnboundedDecompressionOptions };

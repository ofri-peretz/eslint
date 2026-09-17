/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import path from 'node:path';

type MessageIds = 'missingExtension' | 'unexpectedExtension';
type Options = [
  {
    pattern?: Record<string, 'always' | 'never'>;
    default?: 'always' | 'never';
  },
];

type RuleOptions = Options;

/**
 * Extensions this rule is willing to call an extension. Anything outside this set
 * — and outside the user's own `pattern` — is treated as part of the filename, so
 * `./source.config` and `./schema.v2` are left alone rather than truncated.
 */
const KNOWN_EXTENSIONS = new Set([
  'js',
  'jsx',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'mts',
  'cts',
  'json',
  'css',
  'scss',
  'sass',
  'less',
  'svg',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'avif',
  'woff',
  'woff2',
  'vue',
  'svelte',
  'wasm',
  'node',
]);

export const extensions = createRule<Options, MessageIds>({
  name: 'extensions',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/extensions.md',
      description: 'Ensure consistent use of file extensions in imports',
    },
    fixable: 'code',
    messages: {
      missingExtension: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Missing Extension',
        description: 'Missing file extension in import',
        severity: 'MEDIUM',
        fix: 'Add the file extension (e.g., .js, .ts)',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/extensions.md',
      }),
      unexpectedExtension: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Unexpected Extension',
        description: 'Unexpected file extension in import',
        severity: 'MEDIUM',
        fix: 'Remove the file extension',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/extensions.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          pattern: {
            type: 'object',
            additionalProperties: { type: 'string', enum: ['always', 'never'] },
          },
          default: { type: 'string', enum: ['always', 'never'] },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      default: 'never',
      pattern: {
        js: 'never',
        ts: 'never',
        tsx: 'never',
        jsx: 'never',
        json: 'always',
        css: 'always',
        scss: 'always',
        svg: 'always',
        png: 'always',
        jpg: 'always',
      },
    },
  ],
  // `createRule` passes the user's options already merged over `defaultOptions`
  // as the SECOND argument. Reading `context.options` instead took the raw user
  // options, so the `defaultOptions` block above was dead — a second, hardcoded
  // table decided the defaults, and a partial `pattern` replaced the table rather
  // than merging into it.
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options]: Options,
  ) {
    const defaultBehavior = options.default ?? 'never';
    const pattern: Record<string, 'always' | 'never'> = options.pattern ?? {};

    /**
     * A module specifier carries the same extension either way it is written, so
     * `export … from`, `export * from` and `import(…)` are checked exactly like an
     * import. Visiting only `ImportDeclaration` reported one and stayed silent on the
     * other for the same string, which left a file less consistent after `--fix` than
     * before it.
     */
    function checkSource(source: TSESTree.StringLiteral | null): void {
      if (!source) return; // `export { foo };` re-exports nothing
      const value = source.value;
      if (!value.startsWith('.')) return; // Only check relative imports

      const ext = path.extname(value).slice(1); // remove dot

      // `path.extname` answers with whatever follows the last dot, so a filename
      // that merely CONTAINS one — `source.config`, `schema.v2`, `types.d` —
      // reads as an extension and the fixer strips it, naming a different module.
      // A token only counts as an extension when something claims it: the user's
      // own `pattern`, or the set of extensions this rule ships defaults for.
      if (ext && !(ext in pattern) && !KNOWN_EXTENSIONS.has(ext)) return;

      const expected = pattern[ext] || defaultBehavior;

      if (ext && expected === 'never') {
        // Removing a real extension can still leave a compound name behind
        // (`./types.d.ts` -> `./types.d`, `./a.min.js` -> `./a.min`). `--fix` runs
        // to a fixed point, so the next pass strips again and lands on `./types`
        // or `./a`. Report the inconsistency; refuse to guess the rewrite.
        const stripped = value.slice(0, -ext.length - 1);
        const leavesCompoundName = path.extname(stripped) !== '';

        context.report({
          node: source,
          messageId: 'unexpectedExtension',
          fix: leavesCompoundName
            ? undefined
            : (fixer: TSESLint.RuleFixer) => {
                // Rewrite the raw token, not a freshly quoted string: hardcoding
                // `'...'` reflowed every double-quoted specifier and produced
                // unparseable output for a path containing an apostrophe.
                const raw = source.raw;
                const quote = raw[0];
                return fixer.replaceText(
                  source,
                  `${quote}${raw.slice(1, -1 - ext.length - 1)}${quote}`,
                );
              },
        });
      } else if (!ext) {
        // Hard to know what the extension *should* be without checking file system
        // But if default is 'always', we might flag it.
        // For now, let's assume if it's missing and we expect 'always', it's a problem.
        if (defaultBehavior === 'always') {
          context.report({
            node: source,
            messageId: 'missingExtension',
            // Can't fix without knowing extension
          });
        }
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        checkSource(node.source);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        checkSource(node.source);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        checkSource(node.source);
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        // `import(expr)` accepts any expression. Only a string literal carries a
        // specifier the rule can read or rewrite; a template or a variable is left
        // alone, the same guard the sibling resolution rules use.
        const source = node.source;
        if (source.type !== 'Literal' || typeof source.value !== 'string')
          return;
        checkSource(source as TSESTree.StringLiteral);
      },
    };
  },
});

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, resolveModule } from '@interlace/eslint-devkit';
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
  /**
   * The second parameter is the whole point.
   *
   * The devkit's factory computes the merged options — `create(context,
   * applyDefault(resolvedDefaultOptions, context.options))` in
   * `rule-creation/rule-creator.ts` — and a rule that declares only `context`
   * silently throws that away. This rule did, then read raw `context.options`
   * and fell back to a hand-written map that was a stale 7-of-10 copy of the
   * `defaultOptions` above, missing exactly `svg`/`png`/`jpg`. So with no
   * options configured, the three extensions the rule declares as `always`
   * behaved as `never`: `./logo.svg` was reported and fixed to `./logo`.
   *
   * `applyDefault` deep-merges (`rule-creator.ts` `deepMerge`), so a user who
   * names one key in `pattern` still overrides only that key, and the declared
   * defaults fill the rest — which is also what makes the local fallback map
   * unnecessary rather than merely stale.
   */
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options]: Readonly<Options>,
  ) {
    // `Required` rather than `??` on each read: the merge above always supplies
    // both keys, so a fallback here would be a branch no input can reach — a
    // permanent hole in a package at a 100% coverage threshold.
    const { default: defaultBehavior, pattern } = options as Required<
      Options[0]
    >;

    /**
     * The user's OWN options, before the declared defaults were merged in.
     *
     * The merged view cannot answer "did the user NAME this extension?", and
     * that is the question `{ default: 'always' }` has to be resolved against.
     * It was a documented escape hatch that did nothing: the rule took
     * `pattern` as a whole object, so a user who set only `default` got the
     * package's own map, whose `js: 'never'` then beat their `default`. The only
     * configuration that worked was `{ pattern: { js: 'always' } }` — which no
     * documentation asks for, and which nobody reaching for "always" would
     * guess.
     */
    const [userOptions = {}] = context.options;
    const userPattern = userOptions.pattern ?? {};
    // A comparison, not a fallback: `defaultBehavior` above already carries the
    // user's `default` when they set one (`applyDefault` merges that key too).
    // What is needed here is only whether they set it, to place it correctly in
    // the precedence ladder below.
    const userSetDefault = userOptions.default !== undefined;

    /**
     * Would removing the extension change, or break, what the specifier
     * resolves to?
     *
     * Upstream `eslint-plugin-import` ships NO fixer for this rule and
     * additionally guards the report on resolvability
     * (`lib/rules/extensions.js:231`: `isUseOfExtensionForbidden(extension) &&
     * isResolvableWithoutExtension(importPath)`). This port dropped both, and
     * the result breaks ESM builds: measured on a NodeNext codebase, `tsc` exits
     * 0 with zero `TS2835` as authored and exits 2 with 207 of them after
     * `--fix`, plus `ERR_MODULE_NOT_FOUND` at runtime. `ROADMAP.md:469,479`
     * already assigns extension requirements under `nodenext` to `tsc`, with
     * this rule a "complement only for bundler users".
     *
     * So the guard is restored, using the resolver the devkit already ships
     * rather than any new resolution logic. It can only ever WITHHOLD: every
     * outcome it cannot prove keeps the rule's existing verdict.
     *
     *   - the specifier does not resolve at all → no evidence either way (a
     *     virtual file, an asset the resolver does not handle, a genuinely
     *     wrong path), so nothing changes;
     *   - it resolves to a file whose extension is NOT the one written → the
     *     written one is an EMIT extension. `./width.js` naming `width.ts` is
     *     the spelling `moduleResolution: NodeNext` requires, and stripping it
     *     is a build break rather than a style change;
     *   - it resolves to a real file of that extension, but the shortened
     *     specifier resolves elsewhere or nowhere → the extension is carrying
     *     the resolution, which is the `./only.mjs` shape;
     *   - both spellings name the same file → the extension is decoration, and
     *     the rule reports and fixes exactly as before. That is the bundler
     *     user this rule is for.
     */
    function extensionIsLoadBearing(specifier: string, ext: string): boolean {
      const withExtension = resolveModule(specifier, context.filename);
      if (!withExtension) return false;
      if (!withExtension.endsWith(`.${ext}`)) return true;
      const stripped = specifier.slice(0, -(ext.length + 1));
      return resolveModule(stripped, context.filename) !== withExtension;
    }

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

      // Most specific first: an extension the USER named in `pattern`, then the
      // USER's `default`, then the extension in the package's own declared
      // `pattern`, then the declared `default`. A package default is the least
      // specific thing in the room, so it must not beat a preference the user
      // stated — which is exactly how `{ default: 'always' }` came to be a
      // no-op.
      const expected =
        userPattern[ext] ??
        (userSetDefault ? defaultBehavior : (pattern[ext] ?? defaultBehavior));

      if (ext && expected === 'never' && !extensionIsLoadBearing(value, ext)) {
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
                // `ext` was measured on the DECODED value; `raw` may spell the
                // same characters with escapes, so the lengths are not
                // interchangeable. Only rewrite when the raw token literally
                // ends in `.<ext><quote>` — otherwise the slice overruns into an
                // escape and emits source that does not parse.
                const suffix = `.${ext}${quote}`;
                if (!raw.endsWith(suffix)) return null;
                return fixer.replaceText(
                  source,
                  `${raw.slice(0, -suffix.length)}${quote}`,
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

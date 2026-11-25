/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { resolveWithSettings } from '../utils/settings-resolver';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { builtinModules } from 'node:module';
import path from 'node:path';

type MessageIds = 'missingExtension' | 'unexpectedExtension';

/** eslint-plugin-import's per-extension and default setting. */
type UpstreamMode = 'always' | 'ignorePackages' | 'never';

/**
 * The object option. `pattern` and `default` are this rule's own shape; the
 * rest is eslint-plugin-import's, including its older form, a bare
 * `{ js: 'never' }` map of extensions.
 */
type ObjectOption = {
  pattern?: Record<string, 'always' | 'never'>;
  default?: 'always' | 'never';
  ignorePackages?: boolean;
  checkTypeImports?: boolean;
  pathGroupOverrides?: {
    pattern: string;
    patternOptions?: Record<string, unknown>;
    action: 'enforce' | 'ignore';
  }[];
  [extension: string]: unknown;
};
type Options = [(UpstreamMode | ObjectOption)?, ObjectOption?];

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

/** One JSON schema node, as ESLint's rule metadata types it. */
type JSONSchema4 = Exclude<
  NonNullable<TSESLint.RuleMetaData<string, unknown[]>['schema']>,
  readonly unknown[]
>;

const MODE: JSONSchema4 = {
  type: 'string',
  enum: ['always', 'ignorePackages', 'never'],
};
const OBJECT_OPTION: JSONSchema4 = {
  type: 'object',
  properties: {
    pattern: { type: 'object', additionalProperties: MODE },
    default: { type: 'string', enum: ['always', 'never'] },
    ignorePackages: { type: 'boolean' },
    checkTypeImports: { type: 'boolean' },
    pathGroupOverrides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          patternOptions: { type: 'object' },
          action: { type: 'string', enum: ['enforce', 'ignore'] },
        },
        additionalProperties: false,
        required: ['pattern', 'action'],
      },
    },
  },
  // eslint-plugin-import's older form: a bare `{ js: 'never' }` map.
  additionalProperties: MODE,
};

/** eslint-plugin-import's reading of its options (`buildProperties`). */
type UpstreamProps = {
  defaultConfig: UpstreamMode;
  pattern: Record<string, UpstreamMode>;
  ignorePackages: boolean;
  checkTypeImports: boolean;
  pathGroupOverrides: NonNullable<ObjectOption['pathGroupOverrides']>;
};

/**
 * Are these options written the way eslint-plugin-import writes them? A
 * string first, or an object key this rule's own shape does not have.
 * `[{ pattern }]` alone means the same in both, and keeps this rule's reading.
 */
function isUpstreamForm(options: readonly unknown[]): boolean {
  return options.some(
    (option) =>
      typeof option === 'string' ||
      Object.keys(option as object).some(
        (key) => key !== 'pattern' && key !== 'default',
      ),
  );
}

/** eslint-plugin-import's `buildProperties`, line for line. */
function upstreamProps(options: readonly unknown[]): UpstreamProps {
  const result: UpstreamProps = {
    defaultConfig: 'never',
    pattern: {},
    ignorePackages: false,
    checkTypeImports: false,
    pathGroupOverrides: [],
  };
  for (const option of options) {
    if (typeof option === 'string') {
      result.defaultConfig = option as UpstreamMode;
      continue;
    }
    const o = option as ObjectOption;
    if (
      o.pattern === undefined &&
      o.ignorePackages === undefined &&
      o.checkTypeImports === undefined
    ) {
      Object.assign(result.pattern, o);
      continue;
    }
    Object.assign(result.pattern, o.pattern);
    result.ignorePackages = o.ignorePackages ?? result.ignorePackages;
    result.checkTypeImports = o.checkTypeImports ?? result.checkTypeImports;
    result.pathGroupOverrides = o.pathGroupOverrides ?? [];
  }
  if (result.defaultConfig === 'ignorePackages') {
    result.defaultConfig = 'always';
    result.ignorePackages = true;
  }
  return result;
}

/** `@scope/name` — eslint-plugin-import's `isScoped`. */
const SCOPED = /^@[^/]+\/?[^/]+/;

/** The extensions TypeScript writes in a specifier for each source extension. */
const EMIT_SOURCE_EXTENSIONS: Readonly<Record<string, readonly string[]>> = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
};

/**
 * Is `specifier` the emit spelling of the TypeScript source `resolved`?
 * `./a.js` of `a.ts`, `./a.js` of `a.d.ts`, `./App.jsx` of `App.tsx`: the same
 * stem, and the written extension is what the compiler emits for the real one.
 */
function isEmitExtensionOfSource(specifier: string, resolved: string): boolean {
  const written = path.extname(specifier);
  const sources = EMIT_SOURCE_EXTENSIONS[written];
  if (!sources) return false;
  const stem = path.basename(specifier, written);
  const file = path.basename(resolved);
  return sources.some(
    (source) => file === stem + source || file === `${stem}.d${source}`,
  );
}

export const extensions = createRule<Options, MessageIds>({
  name: 'extensions',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/extensions',
    },
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
    /*
     * This rule's own `[{ pattern, default }]`, and every shape
     * eslint-plugin-import accepts: `['always']`, `['never', { js: 'always' }]`,
     * `[{ json: 'always' }]`, `['always', { ignorePackages, checkTypeImports,
     * pathGroupOverrides, pattern }]`. A config carried over from
     * `import/extensions` loads, and is linted with that plugin's semantics
     * (see `upstreamProps`).
     */
    schema: {
      anyOf: [
        { type: 'array', items: [MODE], additionalItems: false },
        { type: 'array', items: [MODE, OBJECT_OPTION], additionalItems: false },
        { type: 'array', items: [OBJECT_OPTION], additionalItems: false },
      ],
    },
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
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let defaultBehavior: 'always' | 'never';
    let pattern: Record<string, 'always' | 'never'>;
    let userPattern: Record<string, 'always' | 'never'>;
    let userSetDefault: boolean;
    /** Set when the options are written eslint-plugin-import's way. */
    let upstream: UpstreamProps | null;

    /**
     * eslint-plugin-import's `checkFileExtension`, for options written its way.
     *
     * Its semantics differ from this rule's own in three places, and a config
     * carried over from it expects its own: it checks package subpaths
     * (`pkg/file.js`), not only relative specifiers; it judges a specifier that
     * does not resolve by the extension written; and `always` asks for the
     * extension on a directory import (`.` → `./index.js`) too.
     */
    function checkUpstream(
      props: UpstreamProps,
      source: TSESTree.StringLiteral,
      node: TSESTree.Node,
    ): void {
      const written = source.value;
      const override = props.pathGroupOverrides.find((o) =>
        path.matchesGlob(written, o.pattern),
      )?.action;
      if (override === 'ignore') return;
      const importPath = written.replace(/\?(.*)$/, '');
      if (!override && (isBuiltIn(importPath) || isRootPackage(importPath)))
        return;
      const resolved = resolveWithSettings(
        importPath,
        context.filename,
        context.settings,
      );
      // The extension of the file the specifier names, unless that file is the
      // SOURCE of the written one: `./a.js` resolving to `a.ts` (or `./App.jsx` to
      // `App.tsx`, `./a.js` to `a.d.ts`) is TypeScript's ESM spelling, the emit
      // extension, and the extension to judge is the one written.
      // eslint-plugin-import's node resolver maps none of these, so there the
      // specifier is unresolved and is judged by what it says; judging the
      // resolved `.ts` here reported 95 "Missing file extension" findings on
      // apollo-server that the incumbent does not make.
      const writtenIsEmitExtension =
        resolved !== null && isEmitExtensionOfSource(importPath, resolved);
      const extension = writtenIsEmitExtension
        ? path.extname(importPath).slice(1)
        : path.extname(resolved ?? importPath).slice(1);
      const modifier = props.pattern[extension] ?? props.defaultConfig;
      if (!extension || !importPath.endsWith(`.${extension}`)) {
        if (
          !props.checkTypeImports &&
          ((node as { importKind?: string }).importKind === 'type' ||
            (node as { exportKind?: string }).exportKind === 'type')
        )
          return;
        // A package name that resolves into `node_modules`, or does not
        // resolve at all (eslint-plugin-import's `isExternalModule`).
        const isPackage =
          SCOPED.test(importPath) ||
          (/^\w/.test(importPath) &&
            (resolved === null ||
              resolved.includes(`${path.sep}node_modules${path.sep}`)));
        if (
          modifier === 'always' &&
          !(props.ignorePackages && !override && isPackage)
        ) {
          context.report({ node: source, messageId: 'missingExtension' });
        }
      } else if (
        modifier === 'never' &&
        resolveWithSettings(
          importPath.slice(0, -(extension.length + 1)),
          context.filename,
          context.settings,
        ) === resolved
      ) {
        context.report({ node: source, messageId: 'unexpectedExtension' });
      }
    }

    /** A Node builtin, or a name in the `import/core-modules` setting. */
    function isBuiltIn(name: string): boolean {
      const base = SCOPED.test(name)
        ? name.split('/').slice(0, 2).join('/')
        : name.split('/')[0];
      const core = (context.settings['import/core-modules'] ?? []) as string[];
      return (
        name.startsWith('node:') ||
        builtinModules.includes(base) ||
        core.includes(base)
      );
    }

    /**
     * A package root, `pkg` or `@scope/pkg`: its name may itself end in `.js`
     * (`decimal.js`), so eslint-plugin-import never checks one.
     */
    function isRootPackage(name: string): boolean {
      if (name === '.' || name === '..') return false;
      const slashes = name.split('/').length - 1;
      return slashes === 0 || (slashes === 1 && SCOPED.test(name));
    }

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
     *     wrong path): an unknown target is not a finding, so it withholds;
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
      const withExtension = resolveWithSettings(
        specifier,
        context.filename,
        context.settings,
      );
      if (!withExtension) return true;
      if (!withExtension.endsWith(`.${ext}`)) return true;
      const stripped = specifier.slice(0, -(ext.length + 1));
      return (
        resolveWithSettings(stripped, context.filename, context.settings) !==
        withExtension
      );
    }

    /**
     * A module specifier carries the same extension either way it is written, so
     * `export … from`, `export * from` and `import(…)` are checked exactly like an
     * import. Visiting only `ImportDeclaration` reported one and stayed silent on the
     * other for the same string, which left a file less consistent after `--fix` than
     * before it.
     */
    function checkSource(
      source: TSESTree.StringLiteral | null,
      node: TSESTree.Node,
    ): void {
      if (!source) return; // `export { foo };` re-exports nothing
      if (upstream) {
        // An empty specifier is half-typed code in an editor.
        if (source.value) checkUpstream(upstream, source, node);
        return;
      }
      const value = source.value;
      if (!value.startsWith('.')) return; // Only check relative imports

      let ext = path.extname(value).slice(1); // remove dot

      // `path.extname` answers with whatever follows the last dot, so a filename
      // that merely CONTAINS one — `source.config`, `schema.v2`, `types.d` —
      // reads as an extension and the fixer strips it, naming a different module.
      // A token only counts as an extension when something claims it: the user's
      // own `pattern`, or the set of extensions this rule ships defaults for.
      // Otherwise the specifier has NO extension written, and is judged as such.
      if (ext && !(ext in pattern) && !KNOWN_EXTENSIONS.has(ext)) ext = '';

      // Most specific first: an extension the USER named in `pattern`, then the
      // USER's `default`, then the extension in the package's own declared
      // `pattern`, then the declared `default`. A package default is the least
      // specific thing in the room, so it must not beat a preference the user
      // stated — which is exactly how `{ default: 'always' }` came to be a
      // no-op.
      const expected = policyFor(ext);

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
        // A missing extension is judged by the file the specifier RESOLVES to:
        // `./dep` naming dep.ts is missing `.ts` under a `ts: always` policy.
        // A specifier that does not resolve, or that only resolves as a
        // directory (`./lib` -> lib/index.ts, where `./lib.ts` names nothing),
        // proves nothing and is not reported.
        const resolved = resolveWithSettings(
          value,
          context.filename,
          context.settings,
        );
        if (!resolved) return;
        const resolvedExt = path.extname(resolved).slice(1);
        if (
          resolvedExt &&
          policyFor(resolvedExt) === 'always' &&
          resolveWithSettings(
            `${value}.${resolvedExt}`,
            context.filename,
            context.settings,
          ) === resolved
        ) {
          context.report({
            node: source,
            messageId: 'missingExtension',
            // Can't fix without knowing extension
          });
        }
      }
    }

    /**
     * The policy for one extension, most specific first: an extension the
     * USER named in `pattern`, then the USER's `default`, then the extension in
     * the package's own declared `pattern`, then the declared `default`. A
     * package default is the least specific thing in the room, so it must not
     * beat a preference the user stated — which is exactly how
     * `{ default: 'always' }` came to be a no-op.
     */
    function policyFor(ext: string): 'always' | 'never' {
      return (
        userPattern[ext] ??
        (userSetDefault ? defaultBehavior : (pattern[ext] ?? defaultBehavior))
      );
    }

    function checkLiteral(node: TSESTree.Node, parent: TSESTree.Node): void {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        checkSource(node as TSESTree.StringLiteral, parent);
      }
    }

    return {
      before() {
        const [options] = currentOptions();
        // `Required` rather than `??` on each read: the merge above always supplies
        // both keys, so a fallback here would be a branch no input can reach — a
        // permanent hole in a package at a 100% coverage threshold.
        ({ default: defaultBehavior, pattern } = options as Required<
          Pick<ObjectOption, 'default' | 'pattern'>
        >);

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
        const userOptions = (context.options[0] ?? {}) as ObjectOption;
        userPattern = userOptions.pattern ?? {};
        // A comparison, not a fallback: `defaultBehavior` above already carries the
        // user's `default` when they set one (`applyDefault` merges that key too).
        // What is needed here is only whether they set it, to place it correctly in
        // the precedence ladder below.
        userSetDefault = userOptions.default !== undefined;
        upstream = isUpstreamForm(context.options)
          ? upstreamProps(context.options)
          : null;
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        checkSource(node.source, node);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        checkSource(node.source, node);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        checkSource(node.source, node);
      },
      // `require('./x')` and TS `import x = require('./x')` load a module by
      // the same specifier an import does.
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          checkLiteral(node.arguments[0], node);
        }
      },
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          checkLiteral(node.moduleReference.expression, node);
        }
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        // `import(expr)` accepts any expression. Only a string literal carries a
        // specifier the rule can read or rewrite; a template or a variable is left
        // alone, the same guard the sibling resolution rules use.
        const source = node.source;
        if (source.type !== 'Literal' || typeof source.value !== 'string')
          return;
        checkSource(source as TSESTree.StringLiteral, node);
      },
    };
  },
});

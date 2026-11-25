/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint rule to detect circular dependencies including barrel exports
 *
 * Detects circular dependencies that can cause:
 * - Memory bloat during bundling (Rollup/Webpack/Vite)
 * - Module resolution failures at runtime
 * - Initialization order bugs that are hard to debug
 * - Degraded build performance
 *
 * @llm-optimized This rule provides structured, actionable error messages
 * that include the full cycle chain and specific fix suggestions.
 *
 * @coverage
 * File system operations are extracted to node/fs.ts and tested directly
 * with temporary files. Path operations are in node/path.ts.
 * This rule focuses on ESLint integration and message generation.
 */
import { createRule } from '@interlace/eslint-devkit';
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  formatCycleDisplay,
  getModuleNames,
  getRelativeImportPath,
  getBasename,
  isBarrelExport,
  shouldIgnoreFile,
} from '@interlace/eslint-devkit';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import {
  type ImportInfo,
  type FileSystemCache,
  createFileSystemCache,
  clearCache,
  resolveImportPath,
  hasOnlyTypeImports,
  computeSCCsFromFile,
  findShortestCyclePath,
  getFileImports,
  exportKindsOf,
  type ExportKindResolver,
  clearExportKindCache,
} from '@interlace/eslint-devkit';
import type { ResolverSetting } from '@interlace/eslint-devkit';

type MessageIds =
  'moduleSplit' | 'directImport' | 'extractShared' | 'dependencyInjection';

/**
 * One graph cache per way of reading the graph.
 *
 * The edges a cache holds depend on two things the lint config decides: how an
 * all-inline-type import is read (erased, or a runtime edge, under
 * `verbatimModuleSyntax`), and which files are modules at all
 * (`import/extensions`, `import/parsers`, `import/ignore`). The SCCs cached
 * in a `FileSystemCache` are computed under one such reading, so a lint run
 * that mixes them (per-directory flat-config blocks) must not share one.
 * Sharing would let whichever file was linted first decide the cycle
 * membership of every other.
 *
 * Within a single lint run files don't change, so a cache is shared across all
 * the files linted under the same reading, which saves the file I/O. It is
 * invalidated when a file's content changes (mtime + size hash).
 */
const graphCaches = new Map<string, FileSystemCache>();

/**
 * The cache for one reading of the graph. `ignoreTarget` is set once, when
 * the cache is made: the key says which function it is.
 */
function graphCacheFor(
  verbatimModuleSyntax: boolean,
  readable: ReadableFiles | undefined,
): FileSystemCache {
  const key = JSON.stringify([
    verbatimModuleSyntax,
    readable?.extensions ? [...readable.extensions].sort() : null,
    readable?.ignore ?? null,
  ]);
  let cache = graphCaches.get(key);
  if (!cache) {
    cache = createFileSystemCache();
    if (readable) cache.ignoreTarget = (file) => !isReadable(file, readable);
    graphCaches.set(key, cache);
  }
  return cache;
}

/**
 * Which files eslint-plugin-import reads at all, from its settings.
 *
 * Upstream's `ExportMapBuilder.get` returns null (no module, no imports) for a
 * path whose extension is not in `import/extensions` (default `.js .mjs .cjs`)
 * or in an `import/parsers` list, and for a path matching an `import/ignore`
 * regular expression (src/exportMap/builder.js lines 62-72 and
 * utils/ignore.js, v2.32.0). A cycle that runs through such a file is
 * invisible to it.
 *
 * With neither `import/extensions` nor `import/parsers` set, every extension
 * stays readable: this rule is TypeScript-first, and its model lints `.ts` files
 * with no settings, where upstream's default reads none of them.
 */
interface ReadableFiles {
  extensions?: Set<string>;
  ignore?: string[];
  /** `ignore`, compiled once. */
  patterns: RegExp[];
}

function readableFiles(
  settings: Record<string, unknown>,
): ReadableFiles | undefined {
  const listed = settings['import/extensions'] as string[] | undefined;
  const parsers = settings['import/parsers'] as
    Record<string, string[]> | undefined;
  const ignore = settings['import/ignore'] as string[] | undefined;
  let extensions: Set<string> | undefined;
  if (listed || parsers) {
    extensions = new Set(listed ?? ['.js', '.mjs', '.cjs']);
    for (const list of Object.values(parsers ?? {})) {
      for (const ext of list) extensions.add(ext);
    }
  }
  return extensions || ignore
    ? { extensions, ignore, patterns: (ignore ?? []).map((p) => new RegExp(p)) }
    : undefined;
}

function isReadable(file: string, readable: ReadableFiles): boolean {
  if (readable.extensions && !readable.extensions.has(path.extname(file))) {
    return false;
  }
  return !readable.patterns.some((pattern) => pattern.test(file));
}

// The two readings that need no settings exist from the start.
graphCacheFor(false, undefined);
graphCacheFor(true, undefined);

/**
 * Clear the circular dependency cache
 *
 * Call this when you want to reset the cache, e.g.:
 * - In watch mode when files change
 * - Between test runs
 * - When programmatically re-linting
 *
 * @public
 */
export function clearCircularDependencyCache(): void {
  for (const cache of graphCaches.values()) clearCache(cache);
  // The devkit's export-kind cache is module-level and separate from
  // `sharedCache`, so clearing that alone leaves it stale. It caches whether each exported name
  // is a type or a value, and that is exactly what an edit changes: turn a
  // `class` into an `interface` in watch mode and a stale entry keeps calling
  // the import a runtime cycle, or the reverse — which SILENCES a real one.
  clearExportKindCache();
}

type FixStrategy =
  | 'module-split'
  | 'direct-import'
  | 'extract-shared'
  | 'dependency-injection'
  | 'auto';
type ModuleNamingConvention = 'semantic' | 'numbered';

/**
 * Incremental analysis options for large codebases
 * Enables caching and selective analysis for better performance
 */
export interface IncrementalOptions {
  /**
   * Enable incremental mode - only analyze files changed since last run
   * Uses file content hash or mtime for change detection
   * @default false
   */
  enabled?: boolean;

  /**
   * Path to cache file for storing analysis results between runs
   * Relative to workspace root or absolute path
   * @default '.eslint-circular-deps-cache.json'
   */
  cacheFile?: string;

  /**
   * Strategy for detecting file changes
   * - 'mtime': Use file modification time (faster but less accurate)
   * - 'content-hash': Use content hash (slower but more accurate)
   * @default 'content-hash'
   */
  invalidateOn?: 'mtime' | 'content-hash';

  /**
   * Maximum age of cache entries in milliseconds before forced refresh
   * Set to 0 for no expiration
   * @default 86400000 (24 hours)
   */
  maxCacheAge?: number;
}

export interface Options {
  /** Maximum allowed import depth. Default: Infinity (unlimited) */
  maxDepth?: number;

  /** Patterns to ignore when checking for cycles (glob patterns) */
  ignorePatterns?: string[];

  /** Barrel exports to consider as public APIs */
  barrelExports?: string[];

  /** Report all cycles found or just the first one. Default: false */
  reportAllCycles?: boolean;

  /**
   * Treat an inline `import { type Foo }` specifier as a RUNTIME edge.
   * Default: false.
   *
   * Set this when the project compiles with TypeScript's
   * `verbatimModuleSyntax`. Under that flag the inline form is not erased —
   * `tsc` emits `import {} from './foo.js'`, so the target module is still
   * evaluated and the cycle is real. A statement-level `import type` is erased
   * under every setting and stays skipped either way.
   */
  verbatimModuleSyntax?: boolean;

  /** Strategy for fixing cycles: 'module-split', 'direct-import', 'extract-shared', 'dependency-injection', or 'auto' */
  fixStrategy?: FixStrategy;

  /** Naming convention for split modules: 'semantic' or 'numbered'. Default: 'semantic' */
  moduleNamingConvention?: ModuleNamingConvention;

  /** Custom suffix for core module in split strategy. Default: '.core' */
  coreModuleSuffix?: string;

  /** Custom suffix for extended module in split strategy. Default: '.extended' */
  extendedModuleSuffix?: string;

  /**
   * Incremental analysis options for improved performance on large codebases
   * When enabled, caches analysis results and only re-analyzes changed files
   *
   * @example
   * ```javascript
   * {
   *   incremental: {
   *     enabled: true,
   *     cacheFile: '.cache/circular-deps.json',
   *     invalidateOn: 'content-hash',
   *     maxCacheAge: 86400000, // 24 hours
   *   }
   * }
   * ```
   */
  incremental?: IncrementalOptions;

  /**
   * Maximum number of files to analyze per lint run
   * Useful for limiting analysis scope in very large monorepos
   * Set to 0 for no limit
   * @default 0
   */
  maxFiles?: number;

  /**
   * Working directory for resolving paths (auto-detected if not provided)
   */
  workspaceRoot?: string;

  // ── eslint-plugin-import's option names, with its meaning ──────────────
  // A config carried over from `import/no-cycle` loads and lints the same.

  /** Skip imports that resolve into an external module folder. */
  ignoreExternal?: boolean;
  /**
   * `true`: a dynamic `import()` anywhere in the chain breaks the cycle (this
   * rule's default when the option is absent). `false`: `import()` is an edge
   * like any other, in the linted file and along the chain — the
   * eslint-plugin-import default.
   */
  allowUnsafeDynamicCyclicDependency?: boolean;
  /** Accepted for compatibility. A performance switch upstream; no effect on findings. */
  disableScc?: boolean;
  /**
   * `true`: also check `require()` calls at any depth. `false`: check no
   * `require()` at all. Absent: top-level `require()` only (this rule's own
   * default).
   */
  commonjs?: boolean;
  /** `true`: also check AMD `define([...])` / `require([...])` dependencies. */
  amd?: boolean;
  /** `false`: skip `import` / `export … from` declarations. Default `true`. */
  esmodule?: boolean;
  /** Regular expressions; an import whose specifier matches one is skipped. */
  ignore?: string[];
}

export type RuleOptions = [Options?];

/**
 * Is every binding this import takes from `target` a TYPE?
 *
 * WHY THIS EXISTS. A stratified sample of this rule's findings on the pinned
 * corpus (n=24, 4 repos) came back **17 type-only, 7 runtime — 70.8% of what
 * it reported could not happen**. The 17 were all plain
 * `import { SomeInterface } from './x'` where every binding is an
 * `export interface` or `export type`. TypeScript erases those before emit, so
 * the bundle bloat and initialization hazard this rule's own message claims
 * cannot occur through that edge.
 *
 * The rule already conceded the principle — it skips `importKind === 'type'`
 * under the comment "erased at compile time — no runtime cycle risk". It simply
 * could not see an IMPLICITLY type-only named import, and on real TypeScript
 * that was most of what it found.
 *
 * BIASED TO REPORT, DELIBERATELY. This rule is `error` in `recommended`, so a
 * false negative is worse than a false positive here: a missed runtime cycle is
 * a real initialization bug that ships. Every uncertainty resolves to "runtime":
 *
 *   - a name declared as BOTH a type and a value (declaration merging —
 *     `export interface Foo` beside `export const Foo`) counts as a value;
 *   - a re-export (`export { Foo } from './y'`) is not followed, so it counts
 *     as a value rather than guessing at one more hop;
 *   - an unreadable or unparseable target counts as a value;
 *   - a default or namespace import counts as a value, because the binding's
 *     kind is not visible at the import site. That is not a shortcut — all 6
 *     default imports in the sample were classes, i.e. genuine runtime cycles.
 *
 * TWO COMPILER SETTINGS BOUND THIS, and neither is entirely safe.
 *
 * `verbatimModuleSyntax` is safe for the IMPLICIT form only: under it a plain
 * named import of a type is a compile error, so the codebase writes the type
 * modifier somewhere and a syntactic check can see it. It is NOT safe for the
 * INLINE form. `import { type Fields } from './cap.js'` is legal under
 * `verbatimModuleSyntax`, and the statement is PRESERVED: verified with tsc
 * 6.0.3 under ESM + vms, it emits `import {} from './cap.js'` — the module is
 * still loaded, so the runtime edge genuinely exists. The rule cannot read
 * tsconfig, so that reading is the `verbatimModuleSyntax` OPTION: off by
 * default, and on it keeps the inline edge (see `importsOnlyTypes`).
 *
 * Whichever way the option is set, BOTH halves of the rule must agree on it:
 * this report site, and the dependency graph in `@interlace/eslint-devkit`
 * that decides whether a cycle exists at all (`ImportInfo.inlineTypeOnly`,
 * dropped by the graph walkers unless they are passed the same flag). When
 * only the report site knew about the inline form, the SAME pair reported
 * from one file and stayed silent from the other; when only the report site
 * knew about the option, setting it changed nothing, because the graph had
 * already erased the edge. The shape is common — this plugin's own
 * `typescript` preset pairs `no-cycle: error` with
 * `consistent-type-specifier-style: ['warn', 'prefer-inline']`, whose fixer
 * rewrites `import type { Foo }` into `import { type Foo }`. An import with any
 * value binding keeps its edge under either setting.
 *
 * `importsNotUsedAsValues: "preserve"` is NOT. TypeScript 4.8-5.4 keeps the
 * import statement, so the target module is still executed and the runtime edge
 * genuinely exists — and this check silences it. A rule cannot see that setting
 * without reading tsconfig, which it does not do, so the exception is stated
 * rather than handled. It is narrow and shrinking: the flag is deprecated in
 * TypeScript 5.0 and removed in 5.5, superseded by `verbatimModuleSyntax`.
 *
 * Regex over the target's source rather than a parse: this is a CROSS-FILE read
 * with no AST available, the same approach `getFileImports` already takes in
 * the devkit. The repo's rule against regexing printed source governs a rule
 * reading the file it is linting via `sourceCode.getText()`, which this is not.
 */
function importsOnlyTypes(
  node: TSESTree.ImportDeclaration,
  target: string,
  verbatimModuleSyntax: boolean,
  resolve: ExportKindResolver,
): boolean {
  // `?? []` is not defensive noise: a synthetic node without `specifiers`
  // reaches here from the coverage suite, and a rule that THROWS is worse than
  // one that over-reports — the throw takes down the whole lint run. An empty
  // or absent list also covers `import './x'`, which runs for side effects and
  // is a genuine runtime edge.
  const specifiers = node.specifiers ?? [];
  if (!specifiers.length) return false;
  const kinds = exportKindsOf(target, resolve);
  return specifiers.every((spec) => {
    if (spec.type !== 'ImportSpecifier') return false; // default / namespace
    // Inline `import { type Foo }`. Erased only when `verbatimModuleSyntax` is
    // OFF. With it on, TypeScript emits `import {} from './foo.js'` — the
    // statement survives, the module is evaluated, and the runtime edge this
    // rule exists to find is real. The block comment above once called that
    // setting "fine" on the premise that such codebases write statement-level
    // `import type`; TS1484's own quick-fix offers the inline form instead, so
    // the premise does not hold and the edge went silent.
    if (spec.importKind === 'type') return !verbatimModuleSyntax;
    // `imported` is an Identifier or, since ES2022, a StringLiteral —
    // `import { "odd-name" as Odd }`. No branch for the literal case, because
    // `kinds` only ever holds identifier names, so a quoted name cannot match
    // it and lands on the same verdict: not a type, therefore report. A branch
    // here would also be unreachable and uncoverable, since the devkit's
    // IMPORT_REGEX specifier class excludes quotes and the cycle graph never
    // sees that edge in the first place.
    // No `??` fallback either: for a StringLiteral this reads `undefined`, and
    // `Map.get(undefined)` is `undefined`, which is already "not a type".
    const name = (spec.imported as { name?: string }).name as string;
    return kinds.get(name) === 'type';
  });
}

export const noCycle = createRule<RuleOptions, MessageIds>({
  name: 'no-cycle',
  /**
   * A cycle in generated code is real and unactionable.
   *
   * This rule is the second-largest source of findings on the pinned corpus —
   * 1337 — and the triage ledger already says what they are: "Correct — real
   * circular imports, concentrated in generated SDK class hierarchies (twilio
   * Page/Version/AccountsBase, okta idx remediators)." Correct, and nobody
   * will act on one: you do not refactor a file your codegen rewrites, and the
   * remedy this rule suggests — split the module — is not available to the
   * consumer at all.
   *
   * That is the distinction `require-https-only` and `no-exposed-debug-endpoints`
   * drew for test files in #671: a rule opts out where its judgement cannot be
   * acted on. It is NOT a blanket policy — a security rule finding a hardcoded
   * secret in a generated file still reports, because that file ships and the
   * fix belongs in the generator. The line is whether the finding is actionable
   * where it is raised, not whether the file was typed by hand.
   */
  skipGeneratedFiles: true,
  meta: {
    interop: { runtimes: ['eslint'], nativeEquivalent: 'import/no-cycle' },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-cycle.md',
      description:
        'Detect circular dependencies that cause bundle memory bloat and initialization issues',
      cwe: 'CWE-1047',
      confidence: 'high',
    },
    messages: {
      // 🎯 Token optimization: 45% reduction (~70→38 tokens per message) for architecture clarity
      moduleSplit: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Circular dependency',
        cwe: 'CWE-1047',
        description: 'Circular dependency detected',
        severity: 'MEDIUM',
        fix: 'Split {{moduleToSplit}} into .{{coreFile}} and .{{extendedFile}}',
        documentationLink: 'https://en.wikipedia.org/wiki/Circular_dependency',
      }),

      directImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Circular dependency',
        cwe: 'CWE-1047',
        description: 'Circular dependency detected',
        severity: 'MEDIUM',
        fix: '{{newImport}} (direct imports preferred over barrel exports)',
        documentationLink: 'https://en.wikipedia.org/wiki/Circular_dependency',
      }),

      extractShared: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Circular dependency',
        cwe: 'CWE-1047',
        description: 'Circular dependency detected',
        severity: 'MEDIUM',
        fix: 'Extract shared types to {{exports}} file',
        documentationLink:
          'https://en.wikipedia.org/wiki/Dependency_inversion_principle',
      }),

      dependencyInjection: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Circular dependency',
        cwe: 'CWE-1047',
        description: 'Circular dependency detected',
        severity: 'MEDIUM',
        fix: 'Use dependency injection pattern to break cycle',
        documentationLink: 'https://en.wikipedia.org/wiki/Dependency_injection',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxDepth: {
            // A number, or eslint-plugin-import's `'∞'` spelling of unlimited.
            anyOf: [{ type: 'number' }, { type: 'string', enum: ['∞'] }],
            description:
              'Maximum depth to traverse when detecting cycles. Default: unlimited (matches eslint-plugin-import and oxlint). Lower values are a performance escape hatch — but with our nonCyclicFiles cache, traversal cost is amortized, and a low cap silently misses cycles deeper than the limit. Set to a finite number only on huge graphs where the bench latency hurts you.',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [
              '**/*.test.ts',
              '**/*.test.tsx',
              '**/*.spec.ts',
              '**/*.spec.tsx',
              '**/*.stories.tsx',
              '**/__tests__/**',
              '**/__mocks__/**',
            ],
            description: 'File patterns to ignore (glob patterns)',
          },
          barrelExports: {
            type: 'array',
            items: { type: 'string' },
            default: ['index.ts', 'index.tsx', 'index.js', 'index.jsx'],
            description: 'Files considered barrel exports',
          },
          reportAllCycles: {
            type: 'boolean',
            default: true,
            description:
              'Report all circular dependencies found (not just the first one)',
          },
          verbatimModuleSyntax: {
            type: 'boolean',
            default: false,
            description:
              "Treat an inline `import { type Foo }` specifier as a runtime edge. Set this when the project compiles with TypeScript's `verbatimModuleSyntax`, under which the inline form is emitted as `import {} from './foo.js'` rather than erased — so the target module is still evaluated and the cycle is real. A statement-level `import type` is erased under every setting and stays skipped either way.",
          },
          fixStrategy: {
            type: 'string',
            enum: [
              'module-split',
              'direct-import',
              'extract-shared',
              'dependency-injection',
              'auto',
            ],
            default: 'auto',
            description:
              'Strategy for fixing circular dependencies (auto = smart detection)',
          },
          moduleNamingConvention: {
            type: 'string',
            enum: ['semantic', 'numbered'],
            default: 'semantic',
            description:
              'Naming convention for split modules (semantic: .core, .api | numbered: .1, .2)',
          },
          coreModuleSuffix: {
            type: 'string',
            default: 'core',
            description:
              'Suffix for core module when splitting (e.g., "core", "base", "main")',
          },
          extendedModuleSuffix: {
            type: 'string',
            default: 'extended',
            description:
              'Suffix for extended module when splitting (e.g., "extended", "api", "helpers")',
          },
          ignoreExternal: {
            type: 'boolean',
            description:
              'eslint-plugin-import: skip imports that resolve into an external module folder',
          },
          allowUnsafeDynamicCyclicDependency: {
            type: 'boolean',
            description:
              'eslint-plugin-import: true lets a dynamic import() anywhere in the chain break the cycle; false makes import() an edge like any other. Absent: import() breaks the cycle.',
          },
          disableScc: {
            type: 'boolean',
            description:
              'eslint-plugin-import performance switch. Accepted for compatibility; findings are the same either way.',
          },
          commonjs: {
            type: 'boolean',
            description:
              'eslint-plugin-import: true checks require() at any depth, false checks no require(). Absent: top-level require() only.',
          },
          amd: {
            type: 'boolean',
            description:
              'eslint-plugin-import: also check AMD define([...]) / require([...]) dependencies',
          },
          esmodule: {
            type: 'boolean',
            description:
              'eslint-plugin-import: false skips import and export-from declarations',
          },
          ignore: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            uniqueItems: true,
            description:
              'eslint-plugin-import: regular expressions; matching import specifiers are skipped',
          },
        },
        additionalProperties: false,
      },
    ],
    fixable: undefined,
  },

  defaultOptions: [
    {
      // Unlimited: matches eslint-plugin-import (Infinity) and oxlint
      // (u32::MAX). The earlier default of 10 silently missed any cycle
      // deeper than 10 hops — verified on next.js's webpack-config.ts
      // (~12 hops). The nonCyclicFiles cache + the depth-limit-truncation
      // fix in eslint-devkit's dependency-analysis make unlimited safe.
      maxDepth: Infinity,
      ignorePatterns: [],
      barrelExports: ['index.ts', 'index.tsx', 'index.js', 'index.jsx'],
      reportAllCycles: true,
      verbatimModuleSyntax: false,
      fixStrategy: 'auto',
      moduleNamingConvention: 'semantic',
      coreModuleSuffix: 'core',
      extendedModuleSuffix: 'extended',
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let maxDepth: number;
    let verbatimModuleSyntax: boolean;
    let sharedCache: FileSystemCache;
    let barrelExports: string[];
    let fixStrategy: FixStrategy;
    let moduleNamingConvention: ModuleNamingConvention;
    let coreModuleSuffix: string;
    let extendedModuleSuffix: string;
    let normalizedFilename: string;
    let workspaceRoot: string;
    let resolverSettings: ResolverSetting | undefined;
    let reportedImportNodes: Set<TSESTree.Node>;
    /** `allowUnsafeDynamicCyclicDependency: false` — `import()` is an edge. */
    let followDynamic: boolean;
    let ignoreExternal: boolean;
    let externalFolders: string[];
    let commonjs: boolean | undefined;
    let amd: boolean;
    let esmodule: boolean;
    let ignoreSpecifiers: RegExp[];
    let readable: ReadableFiles | undefined;

    /**
     * Inside an external module folder: `node_modules`, or the folders named
     * by eslint-plugin-import's `import/external-module-folders` setting.
     */
    function isExternalPath(file: string): boolean {
      return externalFolders.some((folder) =>
        file.includes(`${path.sep}${folder}${path.sep}`),
      );
    }

    /**
     * Does the linted file's import list ON DISK reach `target`? The
     * component shortcut is built from it, so when it does not, the shortcut
     * cannot have seen this edge.
     */
    function diskHasEdge(target: string): boolean {
      return getFileImports(normalizedFilename, {
        workspaceRoot,
        barrelExports,
        cache: sharedCache,
        resolverSettings,
      }).some((imp) => imp.path === target);
    }

    /**
     * Breadth-first search from `target` back to the linted file, over the
     * graph as it is on disk, without the strongly-connected-component
     * shortcut. Used when the shortcut cannot answer: the linted file's own
     * edges come from the source being linted, which may differ from disk
     * (an unsaved editor buffer, `--stdin`), or the options change which
     * edges count (`import()` followed, external folders skipped).
     */
    function walkBack(target: string): string[] | null {
      const queue: string[][] = [[target]];
      const visited = new Set<string>([target]);
      while (queue.length > 0) {
        const route = queue.shift()!;
        if (route.length > maxDepth) break;
        const current = route[route.length - 1];
        const imports = getFileImports(current, {
          workspaceRoot,
          barrelExports,
          cache: sharedCache,
          resolverSettings,
        });
        for (const imp of imports) {
          if (imp.dynamic && !followDynamic) continue;
          if (imp.typeOnly) continue;
          if (imp.inlineTypeOnly && !verbatimModuleSyntax) continue;
          if (ignoreExternal && isExternalPath(imp.path)) continue;
          if (imp.path === normalizedFilename) return [...route, imp.path];
          if (visited.has(imp.path)) continue;
          visited.add(imp.path);
          queue.push([...route, imp.path]);
        }
      }
      return null;
    }

    /**
     * Select fix strategy based on cycle characteristics
     */
    function selectFixStrategy(
      cycle: string[],
      userStrategy: FixStrategy,
    ): FixStrategy {
      if (userStrategy !== 'auto') {
        return userStrategy;
      }

      const hasBarrel = cycle.some((file) =>
        isBarrelExport(file, barrelExports),
      );
      const typesOnly = hasOnlyTypeImports(cycle, sharedCache);
      const cycleSize = cycle.length;

      // Priority order for auto-detection
      if (hasBarrel && cycleSize === 2) {
        return 'direct-import';
      }

      if (typesOnly) {
        return 'extract-shared';
      }

      return 'module-split';
    }

    /**
     * Generate MODULE SPLIT message
     */
    function generateModuleSplitMessage(
      cycle: string[],
    ): Record<string, string> {
      const moduleNames = getModuleNames(cycle, workspaceRoot);
      const [module1, module2] = moduleNames;
      const moduleToSplit = module1; // Split the first module
      const suffix1 =
        moduleNamingConvention === 'semantic' ? `.${coreModuleSuffix}` : '.1';
      const suffix2 =
        moduleNamingConvention === 'semantic'
          ? `.${extendedModuleSuffix}`
          : '.2';

      return {
        cycle: formatCycleDisplay(cycle, workspaceRoot),
        moduleToSplit,
        coreFile: coreModuleSuffix,
        extendedFile: extendedModuleSuffix,
        splitCount: '2',
        fileStructure:
          `├─ ${moduleToSplit}/${moduleToSplit}${suffix1}.ts (→ ${module2} ✓)\n` +
          `└─ ${moduleToSplit}/${moduleToSplit}${suffix2}.ts (→ ${suffix1} + ${module2} ✓)`,
        result: `${suffix1} → ${module2} → ${suffix2} (no cycle)`,
      };
    }

    /**
     * Generate DIRECT IMPORT message
     */
    function generateDirectImportMessage(
      cycle: string[],
      sourceImport: ImportInfo,
    ): Record<string, string> {
      const currentFile = getBasename(context.filename);
      const targetFile = cycle[1];
      const relativeImport = getRelativeImportPath(
        context.filename,
        targetFile,
      );

      return {
        cycle: formatCycleDisplay(cycle, workspaceRoot),
        currentFile,
        oldImport: `import { ... } from '${sourceImport.source}'`,
        newImport: `import { ... } from '${relativeImport}'`,
      };
    }

    /**
     * Generate EXTRACT SHARED message
     */
    function generateExtractSharedMessage(
      cycle: string[],
    ): Record<string, string> {
      const moduleNames = getModuleNames(cycle, workspaceRoot);
      const [module1, module2] = moduleNames;

      // Generate likely type names based on module names
      const exports = [
        `- export type ${module1}Id, ${module2}Id`,
        `- export interface ${module1}Summary, ${module2}Summary`,
      ].join('\n');

      return {
        cycle: formatCycleDisplay(cycle, workspaceRoot),
        exports,
        result: `shared/types ← ${module1}, ${module2} (no cycle)`,
      };
    }

    /**
     * Generate DEPENDENCY INJECTION message
     */
    function generateDependencyInjectionMessage(
      cycle: string[],
    ): Record<string, string> {
      const moduleNames = getModuleNames(cycle, workspaceRoot);
      const [service1, service2] = moduleNames;

      const steps = [
        `1. Create interfaces/I${service1}.ts, interfaces/I${service2}.ts`,
        `2. Both services implement their interface`,
        `3. Inject via constructor: constructor(private dep?: IDep)`,
        `4. Wire in container.ts`,
      ].join('\n');

      return {
        cycle: formatCycleDisplay(cycle, workspaceRoot),
        steps,
      };
    }

    /**
     * Generate message data based on strategy
     */
    function generateMessageData(
      cycle: string[],
      strategy: FixStrategy,
      sourceImport: ImportInfo,
    ): { messageId: MessageIds; data: Record<string, string> } {
      switch (strategy) {
        case 'direct-import':
          return {
            messageId: 'directImport',
            data: generateDirectImportMessage(cycle, sourceImport),
          };

        case 'extract-shared':
          return {
            messageId: 'extractShared',
            data: generateExtractSharedMessage(cycle),
          };

        case 'dependency-injection':
          return {
            messageId: 'dependencyInjection',
            data: generateDependencyInjectionMessage(cycle),
          };

        default:
          // 'module-split' (and the impossible fall-through) both split.
          return {
            messageId: 'moduleSplit',
            data: generateModuleSplitMessage(cycle),
          };
      }
    }

    /**
     * Report `node`, an edge from the linted file to `importSource`, when the
     * target imports the linted file back through runtime edges. `erased`
     * says whether this edge itself carries only types into `resolved`.
     */
    function checkEdge(
      node: TSESTree.Node,
      importSource: string,
      erased?: (resolved: string) => boolean,
    ): void {
      // Each import node should produce at most ONE error regardless of how
      // many distinct cycle paths pass through this import.
      if (reportedImportNodes.has(node)) return;
      if (ignoreSpecifiers.some((re) => re.test(importSource))) return;

      const resolved = resolveImportPath(importSource, {
        fromFile: normalizedFilename,
        workspaceRoot,
        barrelExports,
        cache: sharedCache,
        resolverSettings,
      });

      if (!resolved) return;
      if (resolved === normalizedFilename) return; // no-self-import territory
      if (ignoreExternal && isExternalPath(resolved)) return;
      // Not a module to eslint-plugin-import: nothing to walk.
      if (readable && !isReadable(resolved, readable)) return;

      if (erased?.(resolved)) return;

      // The strongly-connected-component shortcut skips `import()` and
      // external folders are not its concern: when the options change which
      // edges count, walk the graph instead.
      if (followDynamic || ignoreExternal) {
        const route = walkBack(resolved);
        if (route) report(node, importSource, resolved, route);
        return;
      }

      const cyclePath = sccCyclePath(resolved);
      if (cyclePath) {
        report(node, importSource, resolved, cyclePath);
        return;
      }

      // The shortcut read the linted file's own edges from DISK. When the
      // source being linted imports something the file on disk does not (an
      // unsaved editor buffer, `--stdin`), it could not have seen a cycle
      // through this edge.
      if (!diskHasEdge(resolved)) {
        const route = walkBack(resolved);
        if (route) report(node, importSource, resolved, route);
      }
    }

    /**
     * The cycle through `linted file → target`, found within one strongly
     * connected component of the graph as it is on disk.
     */
    function sccCyclePath(resolved: string): string[] | null {
      if (sharedCache.nonCyclicFiles.has(resolved)) return null;

      let tgtSCC = sharedCache.sccIndex.get(resolved);
      if (tgtSCC === undefined) {
        computeSCCsFromFile(resolved, {
          maxDepth: Infinity,
          workspaceRoot,
          barrelExports,
          cache: sharedCache,
          resolverSettings,
          verbatimModuleSyntax,
        });
        tgtSCC = sharedCache.sccIndex.get(resolved);
      }

      let srcSCC = sharedCache.sccIndex.get(normalizedFilename);
      if (srcSCC === undefined) {
        computeSCCsFromFile(normalizedFilename, {
          maxDepth: Infinity,
          workspaceRoot,
          barrelExports,
          cache: sharedCache,
          resolverSettings,
          verbatimModuleSyntax,
        });
        srcSCC = sharedCache.sccIndex.get(normalizedFilename);
      }

      if (srcSCC === undefined || tgtSCC === undefined || srcSCC !== tgtSCC) {
        return null;
      }

      return findShortestCyclePath(normalizedFilename, resolved, {
        maxDepth,
        workspaceRoot,
        barrelExports,
        cache: sharedCache,
        resolverSettings,
        verbatimModuleSyntax,
      });
    }

    function report(
      node: TSESTree.Node,
      importSource: string,
      resolved: string,
      cyclePath: string[],
    ): void {
      reportedImportNodes.add(node);

      const cycleStart = cyclePath.indexOf(normalizedFilename);
      const relevantCycle =
        cycleStart >= 0
          ? [...cyclePath.slice(cycleStart), ...cyclePath.slice(0, cycleStart)]
          : cyclePath;

      const strategy = selectFixStrategy(relevantCycle, fixStrategy);
      const sourceImport: ImportInfo = {
        path: resolved,
        source: importSource,
      };
      const { messageId, data } = generateMessageData(
        relevantCycle,
        strategy,
        sourceImport,
      );

      context.report({ node, messageId, data });
    }

    return {
      before() {
        const options = context.options[0] || {};
        maxDepth =
          typeof options.maxDepth === 'number' ? options.maxDepth : Infinity;
        followDynamic = options.allowUnsafeDynamicCyclicDependency === false;
        ignoreExternal = options.ignoreExternal === true;
        commonjs = options.commonjs;
        amd = options.amd === true;
        esmodule = options.esmodule !== false;
        ignoreSpecifiers = (options.ignore ?? []).map(
          (pattern) => new RegExp(pattern),
        );
        verbatimModuleSyntax = options.verbatimModuleSyntax ?? false;
        // Settings are read below; the cache is chosen once they are known.
        const ignorePatterns = options.ignorePatterns ?? [
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.spec.ts',
          '**/*.spec.tsx',
          '**/*.stories.tsx',
          '**/__tests__/**',
          '**/__mocks__/**',
        ];
        barrelExports = options.barrelExports ?? [
          'index.ts',
          'index.tsx',
          'index.js',
          'index.jsx',
        ];
        const _reportAllCycles = options.reportAllCycles ?? true;
        fixStrategy = options.fixStrategy ?? 'auto';
        moduleNamingConvention = options.moduleNamingConvention ?? 'semantic';
        coreModuleSuffix = options.coreModuleSuffix ?? 'core';
        extendedModuleSuffix = options.extendedModuleSuffix ?? 'extended';

        const filename = context.filename;
        // Normalize once per file — on macOS /tmp is a symlink to /private/tmp.
        // ESLint provides the symlink path; the resolver returns real paths.
        // Without normalization, path comparisons always fail on macOS.
        normalizedFilename = (() => {
          try {
            return realpathSync(filename);
          } catch {
            return filename;
          }
        })();
        workspaceRoot = context.cwd;

        // Get resolver settings from ESLint settings (compatible with eslint-plugin-import)
        // eslint-plugin-import uses settings['import/resolver']; allow either the
        // upstream key or our drop-in `import-next/resolver` form for users
        // migrating off eslint-plugin-import.
        const settings = context.settings as Record<string, unknown>;
        resolverSettings =
          (settings?.['import/resolver'] as ResolverSetting) ||
          (settings?.['import-next/resolver'] as ResolverSetting);
        externalFolders = (settings['import/external-module-folders'] as
          string[] | undefined) ?? ['node_modules'];
        readable = readableFiles(settings);
        sharedCache = graphCacheFor(verbatimModuleSyntax, readable);

        // Skip ignored files early
        if (
          shouldIgnoreFile(
            filename,
            ignorePatterns,
            sharedCache.compiledPatterns,
          )
        ) {
          return false;
        }

        // Do NOT clear sharedCache.nonCyclicFiles — it is now populated directly
        // from SCC results (singleton SCCs → provably non-cyclic) and persists
        // across all files for the entire lint run. Clearing it per-file would
        // destroy the O(1) fast path for known non-cyclic files.
        sharedCache.pendingCycleReports.clear();
        // sharedCache.sccComputed, sccIndex, sccs, nonCyclicFiles — NOT reset.

        // Per-file dedup set — keyed by import node to ensure each import
        // statement produces at most one error, even when multiple cycle paths
        // exist through the same import.
        reportedImportNodes = new Set<TSESTree.Node>();
        return true;
      },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Program() {
        // Program() is now a no-op for SCC — fully lazy SCC extension.
        // SCC is computed on-demand in ImportDeclaration when source or target
        // is not yet covered. This matches eslint-plugin-import's lazy
        // ExportMap approach: no upfront file reads, defer to actual imports.
        // The global SCC persists across files so each file's SCC is computed
        // at most once per connected component across the whole lint run.
      },

      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (!esmodule) return;
        // Type-only imports are erased at compile time — no runtime cycle risk.
        if (node.importKind === 'type') return;
        checkEdge(node, node.source.value, (resolved) =>
          importsOnlyTypes(
            node,
            resolved,
            verbatimModuleSyntax,
            (spec, fromFile) =>
              resolveImportPath(spec, {
                fromFile,
                workspaceRoot,
                barrelExports,
                cache: sharedCache,
                resolverSettings,
              }),
          ),
        );
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (!esmodule) return;
        if (!node.source) return; // no 'from' clause → not a re-export
        // `export type { T } from` is erased like `import type`.
        if (node.exportKind === 'type') return;
        checkEdge(node, node.source.value);
      },

      // `export * from './b'` and `export * as ns from './b'` load the module
      // at runtime like an import does; `export type * from` is erased.
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (!esmodule) return;
        if (node.exportKind === 'type') return;
        checkEdge(node, node.source.value);
      },

      // TS `import b = require('./b')` compiles to a top-level `require()`.
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (commonjs === false) return;
        if (
          node.importKind === 'type' ||
          node.moduleReference.type !== 'TSExternalModuleReference'
        ) {
          return;
        }
        const arg = node.moduleReference.expression as TSESTree.StringLiteral;
        checkEdge(node, arg.value);
      },

      // `import('./b')`. Off by default: it runs after both modules have
      // initialized. eslint-plugin-import counts it unless
      // `allowUnsafeDynamicCyclicDependency` is set, so setting that option to
      // `false` turns it on here too.
      ImportExpression(node: TSESTree.ImportExpression) {
        if (!followDynamic) return;
        const arg = node.source;
        if (arg.type !== 'Literal' || typeof arg.value !== 'string') return;
        checkEdge(node, arg.value);
      },

      // A `require('./b')` that runs while the module initializes: one not
      // nested in a function. A `require()` inside a function body runs later,
      // after both modules initialized, like `import()`. eslint-plugin-import's
      // `commonjs: true` checks every `require()`, and `commonjs: false` none.
      // `amd: true` adds `define(['./b'], …)` and `require(['./b'], …)`.
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;
        const callee = node.callee.name;
        const arg = node.arguments[0];
        if (
          amd &&
          (callee === 'define' || callee === 'require') &&
          node.arguments.length === 2 &&
          arg.type === 'ArrayExpression'
        ) {
          for (const element of arg.elements) {
            if (
              element?.type === 'Literal' &&
              typeof element.value === 'string' &&
              element.value !== 'require' &&
              element.value !== 'exports'
            ) {
              checkEdge(element, element.value);
            }
          }
          return;
        }
        if (
          commonjs === false ||
          callee !== 'require' ||
          node.arguments.length !== 1 ||
          arg.type !== 'Literal' ||
          typeof arg.value !== 'string'
        ) {
          return;
        }
        if (commonjs !== true) {
          for (
            let p: TSESTree.Node | undefined = node.parent;
            p;
            p = p.parent
          ) {
            if (
              p.type === 'FunctionDeclaration' ||
              p.type === 'FunctionExpression' ||
              p.type === 'ArrowFunctionExpression'
            ) {
              return;
            }
          }
        }
        checkEdge(node, arg.value);
      },
    };
  },
});

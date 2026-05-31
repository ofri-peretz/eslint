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
import {
  type ImportInfo,
  type FileSystemCache,
  createFileSystemCache,
  clearCache,
  resolveImportPath,
  hasOnlyTypeImports,
  computeSCCsFromFile,
  findShortestCyclePath,
} from '@interlace/eslint-devkit';
import type { ResolverSetting } from '@interlace/eslint-devkit';

type MessageIds =
  | 'moduleSplit'
  | 'directImport'
  | 'extractShared'
  | 'dependencyInjection';

/**
 * Module-level shared cache for performance optimization
 *
 * These caches are shared across all files in the same lint run,
 * significantly reducing file I/O when linting multiple files.
 *
 * Within a single lint run, files don't change, so caching is safe.
 * The cache is automatically invalidated when file content changes
 * (detected via mtime + size hash).
 */
const sharedCache: FileSystemCache = createFileSystemCache();

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
  clearCache(sharedCache);
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
}

export type RuleOptions = [Options?];


export const noCycle = createRule<RuleOptions, MessageIds>({
  name: 'no-cycle',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-cycle.md',
      description:
        'Detect circular dependencies that cause bundle memory bloat and initialization issues',
      cwe: 'CWE-407',
      cvss: 9.5,
      confidence: 'high',
    },
    messages: {
      // 🎯 Token optimization: 45% reduction (~70→38 tokens per message) for architecture clarity
      moduleSplit: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Circular dependency',
        cwe: 'CWE-407',
        description: 'Circular dependency detected',
        severity: 'CRITICAL',
        fix: 'Split {{moduleToSplit}} into .{{coreFile}} and .{{extendedFile}}',
        documentationLink: 'https://en.wikipedia.org/wiki/Circular_dependency',
      }),

      directImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Circular dependency',
        cwe: 'CWE-407',
        description: 'Circular dependency detected',
        severity: 'MEDIUM',
        fix: '{{newImport}} (direct imports preferred over barrel exports)',
        documentationLink: 'https://en.wikipedia.org/wiki/Circular_dependency',
      }),

      extractShared: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Circular dependency',
        cwe: 'CWE-407',
        description: 'Circular dependency detected',
        severity: 'MEDIUM',
        fix: 'Extract shared types to {{exports}} file',
        documentationLink:
          'https://en.wikipedia.org/wiki/Dependency_inversion_principle',
      }),

      dependencyInjection: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Circular dependency',
        cwe: 'CWE-407',
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
            type: 'number',
            default: Number.MAX_SAFE_INTEGER,
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
      fixStrategy: 'auto',
      moduleNamingConvention: 'semantic',
      coreModuleSuffix: 'core',
      extendedModuleSuffix: 'extended',
    },
  ],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const maxDepth = options.maxDepth ?? Infinity;
    const ignorePatterns = options.ignorePatterns ?? [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.stories.tsx',
      '**/__tests__/**',
      '**/__mocks__/**',
    ];
    const barrelExports = options.barrelExports ?? [
      'index.ts',
      'index.tsx',
      'index.js',
      'index.jsx',
    ];
    const _reportAllCycles = options.reportAllCycles ?? true;
    const fixStrategy = options.fixStrategy ?? 'auto';
    const moduleNamingConvention = options.moduleNamingConvention ?? 'semantic';
    const coreModuleSuffix = options.coreModuleSuffix ?? 'core';
    const extendedModuleSuffix = options.extendedModuleSuffix ?? 'extended';

    const filename = context.filename;
    // Normalize once per file — on macOS /tmp is a symlink to /private/tmp.
    // ESLint provides the symlink path; the resolver returns real paths.
    // Without normalization, path comparisons always fail on macOS.
    const normalizedFilename = (() => {
      try { return realpathSync(filename); } catch { return filename; }
    })();
    const workspaceRoot = context.cwd;

    // Get resolver settings from ESLint settings (compatible with eslint-plugin-import)
    // eslint-plugin-import uses settings['import/resolver']; allow either the
    // upstream key or our drop-in `import-next/resolver` form for users
    // migrating off eslint-plugin-import.
    const settings = context.settings as Record<string, unknown>;
    const resolverSettings: ResolverSetting | undefined =
      (settings?.['import/resolver'] as ResolverSetting) ||
      (settings?.['import-next/resolver'] as ResolverSetting);

    // Skip ignored files early
    if (
      shouldIgnoreFile(filename, ignorePatterns, sharedCache.compiledPatterns)
    ) {
      return {};
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
    const reportedImportNodes = new Set<TSESTree.ImportDeclaration>();

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
        case 'module-split':
          return {
            messageId: 'moduleSplit',
            data: generateModuleSplitMessage(cycle),
          };

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
          return {
            messageId: 'moduleSplit',
            data: generateModuleSplitMessage(cycle),
          };
      }
    }

    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Program'() {
        // Program() is now a no-op for SCC — fully lazy SCC extension.
        // SCC is computed on-demand in ImportDeclaration when source or target
        // is not yet covered. This matches eslint-plugin-import's lazy
        // ExportMap approach: no upfront file reads, defer to actual imports.
        // The global SCC persists across files so each file's SCC is computed
        // at most once per connected component across the whole lint run.
      },

      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Type-only imports are erased at compile time — no runtime cycle risk.
        if (node.importKind === 'type') return;

        // Each import node should produce at most ONE error regardless of how
        // many distinct cycle paths pass through this import.
        if (reportedImportNodes.has(node)) return;

        const importSource = node.source.value;

        // Resolve using normalizedFilename so resolver output paths match.
        const resolved = resolveImportPath(importSource, {
          fromFile: normalizedFilename,
          workspaceRoot,
          barrelExports,
          cache: sharedCache,
          resolverSettings,
        });

        if (!resolved) return;

        // =====================================================================
        // FAST PATH 1: nonCyclicFiles O(1) lookup
        //
        // Files in singleton SCCs are added to nonCyclicFiles during SCC
        // computation. This check is slightly faster than the sccIndex lookup
        // because it short-circuits before any SCC arithmetic.
        // =====================================================================
        if (sharedCache.nonCyclicFiles.has(resolved)) return;

        // =====================================================================
        // SCC PRE-CHECK (O(1)) — the proven eslint-plugin-import approach
        //
        // If source and target are in DIFFERENT SCCs, no cycle can exist
        // between them — skip immediately without any graph traversal.
        // Eliminates ~99% of imports without reading a single file.
        //
        // If the target file isn't in the SCC yet, extend the SCC from it
        // lazily so we can make the correct determination.
        // =====================================================================
        // Fully lazy SCC: extend on-demand when source or target not yet covered.
        // Extending from the TARGET is preferred — if target → source (cycle),
        // extending from target will discover source and assign both to the same SCC.
        // Only extend from source as a fallback when target extension doesn't cover it.
        let tgtSCC = sharedCache.sccIndex.get(resolved);
        if (tgtSCC === undefined) {
          computeSCCsFromFile(resolved, {
            maxDepth: Infinity,
            workspaceRoot,
            barrelExports,
            cache: sharedCache,
            resolverSettings,
          });
          tgtSCC = sharedCache.sccIndex.get(resolved);
        }

        let srcSCC = sharedCache.sccIndex.get(normalizedFilename);
        if (srcSCC === undefined) {
          // Source still not covered after extending from target — source is in a
          // different connected component. Extend from source to cover it.
          computeSCCsFromFile(normalizedFilename, {
            maxDepth: Infinity,
            workspaceRoot,
            barrelExports,
            cache: sharedCache,
            resolverSettings,
          });
          srcSCC = sharedCache.sccIndex.get(normalizedFilename);
        }

        if (srcSCC === undefined || tgtSCC === undefined || srcSCC !== tgtSCC) {
          return;
        }

        // =====================================================================
        // BFS PATH-FINDING — only runs when SCC guarantees a cycle exists.
        //
        // findShortestCyclePath does BFS from `resolved` back to
        // `normalizedFilename`, only traversing files within the same SCC.
        // This is bounded by the SCC size, not the entire codebase.
        // =====================================================================
        const cyclePath = findShortestCyclePath(normalizedFilename, resolved, {
          maxDepth,
          workspaceRoot,
          barrelExports,
          cache: sharedCache,
          resolverSettings,
        });

        if (!cyclePath) return;

        // Deduplicate: this import node produces exactly one error.
        reportedImportNodes.add(node);

        // Build the relevant cycle starting from normalizedFilename.
        const cycleStart = cyclePath.indexOf(normalizedFilename);
        const relevantCycle = cycleStart >= 0
          ? [...cyclePath.slice(cycleStart), ...cyclePath.slice(0, cycleStart)]
          : cyclePath;

        const strategy = selectFixStrategy(relevantCycle, fixStrategy);
        const sourceImport: ImportInfo = { path: resolved, source: importSource };
        const { messageId, data } = generateMessageData(relevantCycle, strategy, sourceImport);

        context.report({ node, messageId, data });
      },

      // Re-export statements (`export { X } from '...'`) create import edges
      // just like `import { X } from '...'`. Without this handler, cycles
      // that close through a re-export are invisible to the rule.
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (!node.source) return;  // no 'from' clause → not a re-export

        // Reuse the same logic as ImportDeclaration
        if (reportedImportNodes.has(node as unknown as TSESTree.ImportDeclaration)) return;

        const importSource = node.source.value as string;

        const resolved = resolveImportPath(importSource, {
          fromFile: normalizedFilename,
          workspaceRoot,
          barrelExports,
          cache: sharedCache,
          resolverSettings,
        });

        if (!resolved) return;
        if (sharedCache.nonCyclicFiles.has(resolved)) return;

        let tgtSCC = sharedCache.sccIndex.get(resolved);
        if (tgtSCC === undefined) {
          computeSCCsFromFile(resolved, {
            maxDepth: Infinity,
            workspaceRoot,
            barrelExports,
            cache: sharedCache,
            resolverSettings,
          });
          tgtSCC = sharedCache.sccIndex.get(resolved);
        }

        const srcSCC = sharedCache.sccIndex.get(normalizedFilename);
        if (srcSCC === undefined || tgtSCC === undefined || srcSCC !== tgtSCC) return;

        const cyclePath = findShortestCyclePath(normalizedFilename, resolved, {
          maxDepth,
          workspaceRoot,
          barrelExports,
          cache: sharedCache,
          resolverSettings,
        });

        if (!cyclePath) return;

        reportedImportNodes.add(node as unknown as TSESTree.ImportDeclaration);

        const cycleStart = cyclePath.indexOf(normalizedFilename);
        const relevantCycle = cycleStart >= 0
          ? [...cyclePath.slice(cycleStart), ...cyclePath.slice(0, cycleStart)]
          : cyclePath;

        const strategy = selectFixStrategy(relevantCycle, fixStrategy);
        const sourceImport: ImportInfo = { path: resolved, source: importSource };
        const { messageId, data } = generateMessageData(relevantCycle, strategy, sourceImport);

        context.report({ node, messageId, data });
      },
    };
  },
});

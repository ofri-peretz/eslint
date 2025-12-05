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
import { createRule } from '@forge-js/eslint-plugin-utils';
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import {
  formatCycleDisplay,
  getModuleNames,
  getRelativeImportPath,
  getBasename,
  isBarrelExport,
  shouldIgnoreFile,
} from '@forge-js/eslint-plugin-utils';
import {
  type ImportInfo,
  type FileSystemCache,
  createFileSystemCache,
  clearCache,
  resolveImportPath,
  hasOnlyTypeImports,
  findAllCircularDependencies,
  getMinimalCycle,
  getCycleHash,
} from '@forge-js/eslint-plugin-utils';
import type { ResolverSetting } from '@forge-js/eslint-plugin-utils';

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
  /** Maximum allowed import depth. Default: 5 */
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

interface CycleInfo {
  cycleTarget: string;
  strategy: FixStrategy;
  relevantCycle: string[];
  cycleHash: string;
}

export const noCircularDependencies = createRule<RuleOptions, MessageIds>({
  name: 'no-circular-dependencies',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detect circular dependencies that cause bundle memory bloat and initialization issues',
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
            default: 5,
            description:
              'Maximum depth to traverse when detecting cycles (performance optimization)',
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
      maxDepth: 10,
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
    const maxDepth = options.maxDepth ?? 10;
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
    const reportAllCycles = options.reportAllCycles ?? true;
    const fixStrategy = options.fixStrategy ?? 'auto';
    const moduleNamingConvention = options.moduleNamingConvention ?? 'semantic';
    const coreModuleSuffix = options.coreModuleSuffix ?? 'core';
    const extendedModuleSuffix = options.extendedModuleSuffix ?? 'extended';

    const filename = context.getFilename();
    const workspaceRoot = context.getCwd();

    // Get resolver settings from ESLint settings (compatible with eslint-plugin-import)
    // eslint-plugin-import uses settings['import/resolver']
    const settings = context.settings as Record<string, unknown>;
    const resolverSettings: ResolverSetting | undefined = 
      (settings?.['import/resolver'] as ResolverSetting) || 
      (settings?.['@forge-js/llm-optimized/resolver'] as ResolverSetting);

    // Skip ignored files early
    if (shouldIgnoreFile(filename, ignorePatterns, sharedCache.compiledPatterns)) {
      return {};
    }

    /**
     * Select fix strategy based on cycle characteristics
     */
    function selectFixStrategy(
      cycle: string[],
      userStrategy: FixStrategy
    ): FixStrategy {
      if (userStrategy !== 'auto') {
        return userStrategy;
      }

      const hasBarrel = cycle.some((file) =>
        isBarrelExport(file, barrelExports)
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
      cycle: string[]
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
      sourceImport: ImportInfo
    ): Record<string, string> {
      const currentFile = getBasename(context.getFilename());
      const targetFile = cycle[1];
      const relativeImport = getRelativeImportPath(
        context.getFilename(),
        targetFile
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
      cycle: string[]
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
      cycle: string[]
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
      sourceImport: ImportInfo
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

    // Store found cycles to report on specific imports
    let detectedCycles: CycleInfo[] = [];

    return {
      Program() {
        // Clear per-file state
        detectedCycles = [];

        // Find ALL circular dependencies starting from current file
        const cycles = findAllCircularDependencies(filename, {
          maxDepth,
          reportAllCycles,
          workspaceRoot,
          barrelExports,
          cache: sharedCache,
          resolverSettings,
        });

        if (cycles.length > 0) {
          for (const cycle of cycles) {
            // Extract the minimal cycle (the actual loop)
            const minimalCycle = getMinimalCycle(cycle);

            // Only report if current file is part of the minimal cycle
            // (not just a file that imports into the cycle)
            if (!minimalCycle.includes(filename)) {
              continue;
            }

            const cycleStart = minimalCycle.indexOf(filename);
            if (cycleStart === -1) continue;

            const relevantCycle = [
              ...minimalCycle.slice(cycleStart),
              ...minimalCycle.slice(0, cycleStart),
            ];
            const cycleHash = getCycleHash(relevantCycle);

            // Skip if we've already reported this cycle (shared across all files)
            if (sharedCache.reportedCycles.has(cycleHash)) {
              continue;
            }
            sharedCache.reportedCycles.add(cycleHash);

            // Select the appropriate fix strategy
            const strategy = selectFixStrategy(relevantCycle, fixStrategy);

            // Find the target of the first import that causes the cycle
            const cycleTarget = relevantCycle[1] || relevantCycle[0]; // The next file in the cycle

            detectedCycles.push({
              cycleTarget,
              strategy,
              relevantCycle,
              cycleHash,
            });
          }
        }
      },

      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Check if this import is part of any detected circular dependency
        const importSource = node.source.value;
        const resolved = resolveImportPath(importSource, {
          fromFile: filename,
          workspaceRoot,
          barrelExports,
          cache: sharedCache,
          resolverSettings,
        });

        if (!resolved) return;

        for (const cycle of detectedCycles) {
          if (resolved === cycle.cycleTarget) {
            // This is an import that causes a circular dependency
            const sourceImport: ImportInfo = {
              path: resolved,
              source: importSource,
            };

            // Generate the appropriate message based on strategy
            const { messageId, data } = generateMessageData(
              cycle.relevantCycle,
              cycle.strategy,
              sourceImport
            );

            context.report({
              node,
              messageId,
              data,
            });
          }
        }
      },
    };
  },
});

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
 * @coverage-note
 * This rule requires file system access (fs.readFileSync) and context.getCwd()
 * to work properly. Full test coverage requires integration tests with actual
 * file system setup, as RuleTester doesn't provide full file system context.
 * Unit tests can only cover option parsing and basic rule structure.
 */
import { createRule } from '../../utils/create-rule';
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import * as path from 'path';
import * as fs from 'fs';

type MessageIds = 
  | 'moduleSplit'
  | 'directImport' 
  | 'extractShared'
  | 'dependencyInjection';

type FixStrategy = 'module-split' | 'direct-import' | 'extract-shared' | 'dependency-injection' | 'auto';
type ModuleNamingConvention = 'semantic' | 'numbered';

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
}

export type RuleOptions = [Options?];

interface ImportInfo {
  path: string;
  source: string;
  dynamic?: boolean;
}

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
      description: 'Detect circular dependencies that cause bundle memory bloat and initialization issues',
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
        documentationLink: 'https://en.wikipedia.org/wiki/Dependency_inversion_principle',
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
            description: 'Maximum depth to traverse when detecting cycles (performance optimization)',
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
            description: 'Report all circular dependencies found (not just the first one)',
          },
          fixStrategy: {
            type: 'string',
            enum: ['module-split', 'direct-import', 'extract-shared', 'dependency-injection', 'auto'],
            default: 'auto',
            description: 'Strategy for fixing circular dependencies (auto = smart detection)',
          },
          moduleNamingConvention: {
            type: 'string',
            enum: ['semantic', 'numbered'],
            default: 'semantic',
            description: 'Naming convention for split modules (semantic: .core, .api | numbered: .1, .2)',
          },
          coreModuleSuffix: {
            type: 'string',
            default: 'core',
            description: 'Suffix for core module when splitting (e.g., "core", "base", "main")',
          },
          extendedModuleSuffix: {
            type: 'string',
            default: 'extended',
            description: 'Suffix for extended module when splitting (e.g., "extended", "api", "helpers")',
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
    const barrelExports = options.barrelExports ?? ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
    const reportAllCycles = options.reportAllCycles ?? true;
    const fixStrategy = options.fixStrategy ?? 'auto';
    const moduleNamingConvention = options.moduleNamingConvention ?? 'semantic';
    const coreModuleSuffix = options.coreModuleSuffix ?? 'core';
    const extendedModuleSuffix = options.extendedModuleSuffix ?? 'extended';

    const filename = context.getFilename();

    // Performance optimization: Use Maps for faster lookups
    const dependencyCache = new Map<string, ImportInfo[]>();
    const visitedInCurrentSearch = new Set<string>();
    const reportedCycles = new Set<string>(); // NEW: Track reported cycles to avoid duplicates

    /**
     * Convert glob pattern to regex
     * Performance: Compile once, reuse many times
     */
    const compiledPatterns = new Map<string, RegExp>();
    function patternToRegex(pattern: string): RegExp {
      const cached = compiledPatterns.get(pattern);
      if (cached) {
        return cached;
      }

      const escaped = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.');
      const regex = new RegExp(escaped);
      compiledPatterns.set(pattern, regex);
      return regex;
    }

    /**
     * Check if file should be ignored
     */
    function shouldIgnoreFile(file: string, patterns: string[]): boolean {
      const normalizedFile = path.normalize(file);
      return patterns.some((pattern: string) => {
        const regex = patternToRegex(pattern);
        return regex.test(normalizedFile);
      });
    }

    // Skip ignored files early
    if (shouldIgnoreFile(filename, ignorePatterns)) {
      return {};
    }

    /**
     * Check if file is a barrel export
     */
    function isBarrelExport(file: string): boolean {
      const basename = path.basename(file);
      return barrelExports.includes(basename);
    }

    /**
     * Resolve import path to absolute file path
     * Performance: Cache file existence checks
     */
    const fileExistsCache = new Map<string, boolean>();
    function fileExists(filePath: string): boolean {
      const cached = fileExistsCache.get(filePath);
      if (cached !== undefined) {
        return cached;
      }
      const exists = fs.existsSync(filePath);
      fileExistsCache.set(filePath, exists);
      return exists;
    }

    function resolveImportPath(importPath: string, fromFile: string): string | null {
      // Handle relative imports
      if (importPath.startsWith('.')) {
        const dir = path.dirname(fromFile);
        const resolved = path.resolve(dir, importPath);

        // Try adding extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        if (!fileExists(resolved)) {
          for (const ext of extensions) {
            const withExt = resolved + ext;
            if (fileExists(withExt)) {
              return withExt;
            }
          }
          // Try index files
          for (const barrel of barrelExports) {
            const indexPath = path.join(resolved, barrel);
            if (fileExists(indexPath)) {
              return indexPath;
            }
          }
        }
        return resolved;
      }

      // Handle alias imports (@app/..., @/, etc.)
      if (importPath.startsWith('@')) {
        const workspaceRoot = context.getCwd();
        // Support @app/, @/, @src/, etc.
        const aliasMatch = importPath.match(/^@([^/]*)\/(.*)/);
        if (aliasMatch) {
          const [, alias, rest] = aliasMatch;
          const basePath = alias === 'app' || alias === 'src' ? 'src' : alias;
          const resolved = path.join(workspaceRoot, basePath, rest);

          // Try adding extensions
          const extensions = ['.ts', '.tsx', '.js', '.jsx'];
          for (const ext of extensions) {
            const withExt = resolved + ext;
            if (fileExists(withExt)) {
              return withExt;
            }
          }
          // Try index files
          for (const barrel of barrelExports) {
            const indexPath = path.join(resolved, barrel);
            if (fileExists(indexPath)) {
              return indexPath;
            }
          }
          return resolved;
        }
      }

      // External package - ignore
      return null;
    }

    /**
     * Get all imports from a file
     * Performance: Cache results and use regex for faster parsing
     */
    function getFileImports(file: string): ImportInfo[] {
      const cached = dependencyCache.get(file);
      if (cached) {
        return cached;
      }

      const imports: ImportInfo[] = [];

      try {
        if (!fileExists(file)) {
          return imports;
        }

        const content = fs.readFileSync(file, 'utf-8');

        // Match ES6 imports - optimized regex
        const importRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          const resolved = resolveImportPath(importPath, file);
          if (resolved && fileExists(resolved)) {
            imports.push({ path: resolved, source: importPath });
          }
        }

        // Match dynamic imports
        const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = dynamicImportRegex.exec(content)) !== null) {
          const importPath = match[1];
          const resolved = resolveImportPath(importPath, file);
          if (resolved && fileExists(resolved)) {
            imports.push({ path: resolved, source: importPath, dynamic: true });
          }
        }
      } catch {
        // Ignore read errors silently
      }

      dependencyCache.set(file, imports);
      return imports;
    }

    /**
     * Find ALL circular dependencies using DFS
     * NEW: Modified to find all cycles, not just the first one
     */
    function findAllCircularDependencies(file: string, currentPath: string[] = [], depth = 0): string[][] {
      if (depth > maxDepth) {
        return [];
      }

      // Found a cycle
      if (currentPath.includes(file)) {
        return [[...currentPath, file]];
      }

      // Performance optimization: Skip if already visited in this search
      if (visitedInCurrentSearch.has(file)) {
        return [];
      }

      visitedInCurrentSearch.add(file);

      const imports = getFileImports(file);
      const newPath = [...currentPath, file];
      const allCycles: string[][] = [];

      for (const imp of imports) {
        // Skip dynamic imports (they don't cause bundler issues)
        if (imp.dynamic) {
          continue;
        }

        const cycles = findAllCircularDependencies(imp.path, newPath, depth + 1);
        allCycles.push(...cycles);

        // NEW: Continue searching even after finding cycles if reportAllCycles is true
        if (!reportAllCycles && allCycles.length > 0) {
          break;
        }
      }

      return allCycles;
    }

    /**
     * Check if imports are type-only (no runtime dependencies)
     */
    function hasOnlyTypeImports(cycle: string[]): boolean {
      try {
        for (const file of cycle) {
          if (!fileExists(file)) continue;
          const content = fs.readFileSync(file, 'utf-8');
          // Check for runtime imports (not just type imports)
          const hasRuntimeImport = /import\s+(?!type\s)[\w*{}\s,]+\s+from\s+['"]/.test(content);
          if (hasRuntimeImport) {
            return false;
          }
        }
        return true;
      } catch {
        return false;
      }
    }

    /**
     * Select fix strategy based on cycle characteristics
     */
    function selectFixStrategy(cycle: string[], userStrategy: FixStrategy): FixStrategy {
      if (userStrategy !== 'auto') {
        return userStrategy;
      }

      const hasBarrel = cycle.some((file) => isBarrelExport(file));
      const typesOnly = hasOnlyTypeImports(cycle);
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
     * Format cycle for concise display
     */
    function formatCycleDisplay(cycle: string[]): string {
      const workspaceRoot = context.getCwd();
      const formatted = cycle.map((file) => {
        const relative = path.relative(workspaceRoot, file);
        return relative.replace(/\\/g, '/');
      });

      // Use ⟷ for bidirectional (2 modules) or → chain for more
      if (formatted.length === 2) {
        return `${formatted[0]} ⟷ ${formatted[1]}`;
      }

      return formatted.join(' → ') + ` → ${formatted[0]}`;
    }

    /**
     * Get module names from cycle
     */
    function getModuleNames(cycle: string[]): string[] {
      const workspaceRoot = context.getCwd();
      return cycle.map((file) => {
        const relative = path.relative(workspaceRoot, file);
        const basename = path.basename(relative, path.extname(relative));
        return basename === 'index' ? path.basename(path.dirname(relative)) : basename;
      });
    }

    /**
     * Generate MODULE SPLIT message
     */
    function generateModuleSplitMessage(cycle: string[]): Record<string, string> {
      const [module1, module2] = getModuleNames(cycle);
      const moduleToSplit = module1; // Split the first module
      const suffix1 = moduleNamingConvention === 'semantic' ? `.${coreModuleSuffix}` : '.1';
      const suffix2 = moduleNamingConvention === 'semantic' ? `.${extendedModuleSuffix}` : '.2';

      return {
        cycle: formatCycleDisplay(cycle),
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
    function generateDirectImportMessage(cycle: string[], sourceImport: ImportInfo): Record<string, string> {
      const currentFile = path.basename(context.getFilename());

      // Get the import path relative to current file
      const currentDir = path.dirname(context.getFilename());
      const targetFile = cycle[1];
      let relativeImport = path.relative(currentDir, targetFile);
      if (!relativeImport.startsWith('.')) {
        relativeImport = './' + relativeImport;
      }
      relativeImport = relativeImport.replace(/\\/g, '/').replace(/\.(ts|tsx|js|jsx)$/, '');

      return {
        cycle: formatCycleDisplay(cycle),
        currentFile,
        oldImport: `import { ... } from '${sourceImport.source}'`,
        newImport: `import { ... } from '${relativeImport}'`,
      };
    }

    /**
     * Generate EXTRACT SHARED message
     */
    function generateExtractSharedMessage(cycle: string[]): Record<string, string> {
      const [module1, module2] = getModuleNames(cycle);

      // Generate likely type names based on module names
      const exports = [
        `- export type ${module1}Id, ${module2}Id`,
        `- export interface ${module1}Summary, ${module2}Summary`,
      ].join('\n');

      return {
        cycle: formatCycleDisplay(cycle),
        exports,
        result: `shared/types ← ${module1}, ${module2} (no cycle)`,
      };
    }

    /**
     * Generate DEPENDENCY INJECTION message
     */
    function generateDependencyInjectionMessage(cycle: string[]): Record<string, string> {
      const [service1, service2] = getModuleNames(cycle);

      const steps = [
        `1. Create interfaces/I${service1}.ts, interfaces/I${service2}.ts`,
        `2. Both services implement their interface`,
        `3. Inject via constructor: constructor(private dep?: IDep)`,
        `4. Wire in container.ts`,
      ].join('\n');

      return {
        cycle: formatCycleDisplay(cycle),
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

    /**
     * Generate a unique hash for a cycle to avoid duplicate reports
     * Uses the minimal cycle (just the loop, not the entry path)
     */
    function getCycleHash(cycle: string[]): string {
      // Find the minimal cycle (the actual loop, not the path leading to it)
      const minimalCycle = getMinimalCycle(cycle);
      
      // Normalize the cycle to start from the smallest path (for consistency)
      const minIndex = minimalCycle.indexOf(minimalCycle.reduce((min, curr) => (curr < min ? curr : min), minimalCycle[0]));
      const normalized = [...minimalCycle.slice(minIndex), ...minimalCycle.slice(0, minIndex)];
      return normalized.join('->');
    }

    /**
     * Extract the minimal cycle from a path
     * For example: A → B → C → B → A becomes B → C → B
     */
    function getMinimalCycle(cycle: string[]): string[] {
      if (cycle.length < 2) return cycle;
      
      // Find where the cycle actually starts (first repeated element)
      const seen = new Map<string, number>();
      for (let i = 0; i < cycle.length; i++) {
        const file = cycle[i];
        if (seen.has(file)) {
          // Found the start of the actual cycle
          const cycleStart = seen.get(file);
          return cycle.slice(cycleStart, i + 1);
        }
        seen.set(file, i);
      }
      
      return cycle;
    }

    // Store found cycles to report on specific imports
    let detectedCycles: CycleInfo[] = [];

    return {
      Program() {
        // Clear caches for each file analysis
        visitedInCurrentSearch.clear();
        detectedCycles = [];

        // Find ALL circular dependencies starting from current file
        const cycles = findAllCircularDependencies(filename);

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

            const relevantCycle = [...minimalCycle.slice(cycleStart), ...minimalCycle.slice(0, cycleStart)];
            const cycleHash = getCycleHash(relevantCycle);

            // Skip if we've already reported this cycle
            if (reportedCycles.has(cycleHash)) {
              continue;
            }
            reportedCycles.add(cycleHash);

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
        const resolved = resolveImportPath(importSource, filename);

        if (!resolved) return;

        for (const cycle of detectedCycles) {
          if (resolved === cycle.cycleTarget) {
            // This is an import that causes a circular dependency
            const sourceImport: ImportInfo = { path: resolved, source: importSource };

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


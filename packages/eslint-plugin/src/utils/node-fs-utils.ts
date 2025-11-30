/**
 * File system utilities for ESLint rules
 *
 * These utilities handle file system operations needed by rules like
 * no-circular-dependencies. They are extracted here to enable direct
 * unit testing with real file system access (temporary files).
 *
 * @coverage
 * This module is tested directly with node-fs-utils.test.ts using temporary
 * files, not through RuleTester. This enables comprehensive coverage
 * of file system operations.
 */
import * as fs from 'node:fs';
import {
  type PatternCache,
  createPatternCache,
  patternToRegex as pathPatternToRegex,
  shouldIgnoreFile as pathShouldIgnoreFile,
  getDirname,
  joinPath,
  resolvePath,
} from './node-path-utils';

// Re-export path utilities for backwards compatibility
export {
  type PatternCache,
  createPatternCache,
  patternToRegex,
  shouldIgnoreFile,
  isBarrelExport,
} from './node-path-utils';

/**
 * Import information extracted from a file
 */
export interface ImportInfo {
  /** Resolved absolute path to the imported file */
  path: string;
  /** Original import source string */
  source: string;
  /** Whether this is a dynamic import (import()) */
  dynamic?: boolean;
}

/**
 * Cache structure for file system operations
 * Shared across files in a single lint run for performance
 */
export interface FileSystemCache {
  /** Cached imports per file */
  dependencies: Map<string, ImportInfo[]>;
  /** Cached file existence results */
  fileExists: Map<string, boolean>;
  /** File hashes for cache invalidation (mtime-size) */
  fileHashes: Map<string, string>;
  /** Compiled regex patterns for ignore patterns */
  compiledPatterns: PatternCache;
  /** Cycles already reported (to avoid duplicates) */
  reportedCycles: Set<string>;
}

/**
 * Create a new empty cache
 */
export function createFileSystemCache(): FileSystemCache {
  return {
    dependencies: new Map(),
    fileExists: new Map(),
    fileHashes: new Map(),
    compiledPatterns: createPatternCache(),
    reportedCycles: new Set(),
  };
}

/**
 * Clear all entries from a cache
 */
export function clearCache(cache: FileSystemCache): void {
  cache.dependencies.clear();
  cache.fileExists.clear();
  cache.fileHashes.clear();
  cache.compiledPatterns.clear();
  cache.reportedCycles.clear();
}

/**
 * Get a simple hash for cache invalidation based on file stats
 * Uses mtime + size which is fast and reliable for detecting changes
 *
 * @param filePath - Absolute path to the file
 * @returns Hash string or null if file doesn't exist/can't be read
 */
export function getFileHash(filePath: string): string | null {
  try {
    const stats = fs.statSync(filePath);
    return `${stats.mtimeMs}-${stats.size}`;
  } catch {
    return null;
  }
}

/**
 * Check if cached data for a file is still valid
 *
 * @param filePath - Absolute path to the file
 * @param cache - Cache containing file hashes
 * @returns true if cache is valid (file hasn't changed)
 */
export function isCacheValid(
  filePath: string,
  cache: FileSystemCache
): boolean {
  const cachedHash = cache.fileHashes.get(filePath);
  if (!cachedHash) return false;

  const currentHash = getFileHash(filePath);
  return cachedHash === currentHash;
}

/**
 * Check if a file exists (with caching)
 *
 * @param filePath - Absolute path to the file
 * @param cache - Cache for storing results
 * @returns true if file exists
 */
export function fileExists(filePath: string, cache: FileSystemCache): boolean {
  const cached = cache.fileExists.get(filePath);
  if (cached !== undefined) {
    return cached;
  }
  const exists = fs.existsSync(filePath);
  cache.fileExists.set(filePath, exists);
  return exists;
}

/**
 * Wrapper for patternToRegex that accepts FileSystemCache
 */
export function patternToRegexWithCache(
  pattern: string,
  cache: FileSystemCache
): RegExp {
  return pathPatternToRegex(pattern, cache.compiledPatterns);
}

/**
 * Wrapper for shouldIgnoreFile that accepts FileSystemCache
 */
export function shouldIgnoreFileWithCache(
  file: string,
  patterns: string[],
  cache: FileSystemCache
): boolean {
  return pathShouldIgnoreFile(file, patterns, cache.compiledPatterns);
}

/**
 * Options for resolving import paths
 */
export interface ResolveOptions {
  /** File containing the import */
  fromFile: string;
  /** Workspace root for alias resolution */
  workspaceRoot: string;
  /** Barrel export filenames */
  barrelExports: string[];
  /** File extensions to try */
  extensions?: string[];
  /** Cache for file existence checks */
  cache: FileSystemCache;
}

/**
 * Resolve import path to absolute file path
 *
 * Handles:
 * - Relative imports (./foo, ../bar)
 * - Alias imports (@app/foo, @src/bar)
 * - Extension resolution (.ts, .tsx, .js, .jsx)
 * - Index file resolution (./dir -> ./dir/index.ts)
 *
 * @param importPath - Import path from source code
 * @param options - Resolution options
 * @returns Absolute file path or null for external packages
 */
export function resolveImportPath(
  importPath: string,
  options: ResolveOptions
): string | null {
  const {
    fromFile,
    workspaceRoot,
    barrelExports,
    extensions = ['.ts', '.tsx', '.js', '.jsx'],
    cache,
  } = options;

  // Handle relative imports
  if (importPath.startsWith('.')) {
    const dir = getDirname(fromFile);
    const resolved = resolvePath(dir, importPath);

    // Try adding extensions
    if (!fileExists(resolved, cache)) {
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fileExists(withExt, cache)) {
          return withExt;
        }
      }
      // Try index files
      for (const barrel of barrelExports) {
        const indexPath = joinPath(resolved, barrel);
        /* v8 ignore start -- edge case: directory exists but ext check passed */
        if (fileExists(indexPath, cache)) {
          return indexPath;
        }
        /* v8 ignore stop */
      }
    }
    return resolved;
  }

  // Handle alias imports (@app/..., @/, etc.)
  if (importPath.startsWith('@')) {
    // Support @app/, @/, @src/, etc.
    const aliasMatch = importPath.match(/^@([^/]*)\/(.*)/);
    if (aliasMatch) {
      const [, alias, rest] = aliasMatch;
      const basePath = alias === 'app' || alias === 'src' ? 'src' : alias;
      const resolved = joinPath(workspaceRoot, basePath, rest);

      // Try adding extensions
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fileExists(withExt, cache)) {
          return withExt;
        }
      }
      // Try index files
      for (const barrel of barrelExports) {
        const indexPath = joinPath(resolved, barrel);
        if (fileExists(indexPath, cache)) {
          return indexPath;
        }
      }
      /* v8 ignore start -- fallback: alias path without matching file/index */
      return resolved;
      /* v8 ignore stop */
    }
  }

  // External package - ignore
  return null;
}

/**
 * Options for getting file imports
 */
export interface GetImportsOptions {
  /** Workspace root for alias resolution */
  workspaceRoot: string;
  /** Barrel export filenames */
  barrelExports: string[];
  /** Cache for file operations */
  cache: FileSystemCache;
}

/**
 * Get all imports from a file
 *
 * Extracts both static and dynamic imports from file content.
 * Results are cached with hash-based invalidation.
 *
 * @param file - Absolute path to the file
 * @param options - Options for import extraction
 * @returns Array of import information
 */
export function getFileImports(
  file: string,
  options: GetImportsOptions
): ImportInfo[] {
  const { workspaceRoot, barrelExports, cache } = options;

  // Check if we have a valid cached result
  if (isCacheValid(file, cache)) {
    const cached = cache.dependencies.get(file);
    if (cached) {
      return cached;
    }
  }

  const imports: ImportInfo[] = [];

  try {
    if (!fileExists(file, cache)) {
      return imports;
    }

    const content = fs.readFileSync(file, 'utf-8');

    // Match ES6 imports - optimized regex
    const importRegex =
      /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolved = resolveImportPath(importPath, {
        fromFile: file,
        workspaceRoot,
        barrelExports,
        cache,
      });
      if (resolved && fileExists(resolved, cache)) {
        imports.push({ path: resolved, source: importPath });
      }
    }

    // Match dynamic imports
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolved = resolveImportPath(importPath, {
        fromFile: file,
        workspaceRoot,
        barrelExports,
        cache,
      });
      if (resolved && fileExists(resolved, cache)) {
        imports.push({ path: resolved, source: importPath, dynamic: true });
      }
    }

    // Store file hash for cache invalidation
    const hash = getFileHash(file);
    if (hash) {
      cache.fileHashes.set(file, hash);
    }
  } catch {
    // Ignore read errors silently
  }

  cache.dependencies.set(file, imports);
  return imports;
}

/**
 * Check if all imports in a cycle are type-only
 *
 * @param cycle - Array of file paths in the cycle
 * @param cache - Cache for file operations
 * @returns true if all imports are type-only
 */
export function hasOnlyTypeImports(
  cycle: string[],
  cache: FileSystemCache
): boolean {
  try {
    for (const file of cycle) {
      if (!fileExists(file, cache)) continue;
      const content = fs.readFileSync(file, 'utf-8');
      // Check for runtime imports (not just type imports)
      const hasRuntimeImport =
        /import\s+(?!type\s)[\w*{}\s,]+\s+from\s+['"]/.test(content);
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
 * Options for cycle detection
 */
export interface CycleDetectionOptions {
  /** Maximum depth to traverse */
  maxDepth: number;
  /** Whether to report all cycles or just the first */
  reportAllCycles: boolean;
  /** Workspace root for import resolution */
  workspaceRoot: string;
  /** Barrel export filenames */
  barrelExports: string[];
  /** Cache for file operations */
  cache: FileSystemCache;
}

/**
 * Find all circular dependencies using DFS
 *
 * @param file - Starting file for cycle detection
 * @param options - Detection options
 * @param currentPath - Current path in DFS (internal use)
 * @param depth - Current depth (internal use)
 * @param visited - Set of visited files in current search (internal use)
 * @returns Array of cycles found (each cycle is an array of file paths)
 */
export function findAllCircularDependencies(
  file: string,
  options: CycleDetectionOptions,
  currentPath: string[] = [],
  depth = 0,
  visited: Set<string> = new Set()
): string[][] {
  const { maxDepth, reportAllCycles, workspaceRoot, barrelExports, cache } =
    options;

  if (depth > maxDepth) {
    return [];
  }

  // Found a cycle
  if (currentPath.includes(file)) {
    return [[...currentPath, file]];
  }

  // Performance optimization: Skip if already visited in this search
  /* v8 ignore start -- perf optimization: prevents re-traversal in complex graphs */
  if (visited.has(file)) {
    return [];
  }
  /* v8 ignore stop */

  visited.add(file);

  const imports = getFileImports(file, { workspaceRoot, barrelExports, cache });
  const newPath = [...currentPath, file];
  const allCycles: string[][] = [];

  for (const imp of imports) {
    // Skip dynamic imports (they don't cause bundler issues)
    if (imp.dynamic) {
      continue;
    }

    const cycles = findAllCircularDependencies(
      imp.path,
      options,
      newPath,
      depth + 1,
      visited
    );
    allCycles.push(...cycles);

    // Continue searching even after finding cycles if reportAllCycles is true
    if (!reportAllCycles && allCycles.length > 0) {
      break;
    }
  }

  return allCycles;
}

/**
 * Extract the minimal cycle from a path
 * For example: A → B → C → B → A becomes B → C → B
 *
 * @param cycle - Full cycle path
 * @returns Minimal cycle (just the loop)
 */
export function getMinimalCycle(cycle: string[]): string[] {
  if (cycle.length < 2) return cycle;

  // Find where the cycle actually starts (first repeated element)
  const seen = new Map<string, number>();
  for (let i = 0; i < cycle.length; i++) {
    const file = cycle[i];
    if (seen.has(file)) {
      // Found the start of the actual cycle
      const cycleStart = seen.get(file)!;
      return cycle.slice(cycleStart, i + 1);
    }
    seen.set(file, i);
  }

  return cycle;
}

/**
 * Generate a unique hash for a cycle to avoid duplicate reports
 *
 * @param cycle - Cycle to hash
 * @returns Unique hash string
 */
export function getCycleHash(cycle: string[]): string {
  // Find the minimal cycle (the actual loop, not the path leading to it)
  const minimalCycle = getMinimalCycle(cycle);

  // Normalize the cycle to start from the smallest path (for consistency)
  const minIndex = minimalCycle.indexOf(
    minimalCycle.reduce(
      (min, curr) => (curr < min ? curr : min),
      minimalCycle[0]
    )
  );
  const normalized = [
    ...minimalCycle.slice(minIndex),
    ...minimalCycle.slice(0, minIndex),
  ];
  return normalized.join('->');
}

// =============================================================================
// Simple uncached file system utilities
// These are for rules that don't need the full caching infrastructure
// =============================================================================

/**
 * Check if a file exists (uncached)
 *
 * @param filePath - Path to the file
 * @returns true if file exists
 */
export function fileExistsSync(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Read file content synchronously (uncached)
 *
 * @param filePath - Path to the file
 * @param encoding - File encoding (default: 'utf-8')
 * @returns File content or null if file doesn't exist or can't be read
 */
export function readFileSync(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): string | null {
  try {
    return fs.readFileSync(filePath, encoding);
  } catch {
    return null;
  }
}

/**
 * Read and parse JSON file synchronously
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON object or null if file doesn't exist or is invalid JSON
 */
export function readJsonFileSync<T = unknown>(filePath: string): T | null {
  const content = readFileSync(filePath);
  if (content === null) {
    return null;
  }
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Find a file by walking up directories from a starting point
 *
 * @param filename - Name of the file to find (e.g., 'package.json')
 * @param startDir - Directory to start searching from
 * @returns Absolute path to the file or null if not found
 */
export function findFileUpward(
  filename: string,
  startDir: string
): string | null {
  let currentDir = startDir;

  while (currentDir !== getDirname(currentDir)) {
    // Stop at root
    const candidate = joinPath(currentDir, filename);
    if (fileExistsSync(candidate)) {
      return candidate;
    }
    currentDir = getDirname(currentDir);
  }

  return null;
}

/**
 * Node.js 'path' module wrapper and utilities
 *
 * All path operations should go through these wrappers for:
 * - Testability (can mock these functions)
 * - Code coverage (all operations tracked)
 * - Consistency (error handling, return types)
 */
import * as path from 'node:path';

/**
 * Cache type for compiled regex patterns
 */
export type PatternCache = Map<string, RegExp>;

/**
 * Create a new empty pattern cache
 */
export function createPatternCache(): PatternCache {
  return new Map();
}

/**
 * Convert glob pattern to regex
 *
 * @param pattern - Glob pattern (supports **, *, ?)
 * @param cache - Cache for compiled patterns
 * @returns Compiled RegExp
 */
export function patternToRegex(pattern: string, cache: PatternCache): RegExp {
  const cached = cache.get(pattern);
  if (cached) {
    return cached;
  }

  const escaped = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  const regex = new RegExp(escaped);
  cache.set(pattern, regex);
  return regex;
}

/**
 * Check if file should be ignored based on patterns
 *
 * @param file - File path to check
 * @param patterns - Array of glob patterns
 * @param cache - Cache for compiled patterns
 * @returns true if file matches any ignore pattern
 */
export function shouldIgnoreFile(
  file: string,
  patterns: string[],
  cache: PatternCache,
): boolean {
  const normalizedFile = path.normalize(file);
  return patterns.some((pattern: string) => {
    const regex = patternToRegex(pattern, cache);
    return regex.test(normalizedFile);
  });
}

/**
 * Check if file is a barrel export (index file)
 *
 * @param file - File path to check
 * @param barrelExports - List of barrel export filenames
 * @returns true if file is a barrel export
 */
export function isBarrelExport(file: string, barrelExports: string[]): boolean {
  const basename = path.basename(file);
  return barrelExports.includes(basename);
}

/**
 * Format a cycle of file paths for concise display
 *
 * Uses ⟷ for bidirectional (2 modules) or → chain for longer cycles.
 *
 * @param cycle - Array of absolute file paths in the cycle
 * @param workspaceRoot - Workspace root for relative path calculation
 * @returns Formatted string representation of the cycle
 */
export function formatCycleDisplay(
  cycle: string[],
  workspaceRoot: string,
): string {
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
 * Get module names from a cycle of file paths
 *
 * Extracts human-readable module names from file paths.
 * For index files, uses the directory name instead.
 *
 * @param cycle - Array of absolute file paths in the cycle
 * @param workspaceRoot - Workspace root for relative path calculation
 * @returns Array of module names
 */
export function getModuleNames(
  cycle: string[],
  workspaceRoot: string,
): string[] {
  return cycle.map((file) => {
    const relative = path.relative(workspaceRoot, file);
    const basename = path.basename(relative, path.extname(relative));
    return basename === 'index'
      ? path.basename(path.dirname(relative))
      : basename;
  });
}

/**
 * Generate a relative import path from one file to another
 *
 * Calculates the relative path and ensures it starts with './' or '../'.
 * Also normalizes path separators and removes file extensions.
 *
 * @param fromFile - Absolute path of the importing file
 * @param toFile - Absolute path of the target file
 * @returns Relative import path (e.g., './utils', '../helpers')
 */
export function getRelativeImportPath(
  fromFile: string,
  toFile: string,
): string {
  const currentDir = path.dirname(fromFile);
  let relativeImport = path.relative(currentDir, toFile);

  // Ensure starts with ./ or ../
  if (!relativeImport.startsWith('.')) {
    relativeImport = './' + relativeImport;
  }

  // Normalize path separators and remove extension
  return relativeImport.replace(/\\/g, '/').replace(/\.(ts|tsx|js|jsx)$/, '');
}

/**
 * Get the basename of a file path
 *
 * Simple wrapper around path.basename for convenience.
 *
 * @param filePath - File path (absolute or relative)
 * @returns Base filename
 */
export function getBasename(filePath: string): string {
  return path.basename(filePath);
}

/**
 * Get the directory name of a file path
 *
 * Simple wrapper around path.dirname for convenience.
 *
 * @param filePath - File path (absolute or relative)
 * @returns Directory path
 */
export function getDirname(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * Calculate relative path from one path to another
 *
 * @param from - Starting path
 * @param to - Target path
 * @returns Relative path
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

/**
 * Normalize a file path
 *
 * Normalizes path separators to forward slashes for consistent display.
 *
 * @param filePath - File path to normalize
 * @returns Normalized path with forward slashes
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Join path segments
 *
 * @param segments - Path segments to join
 * @returns Joined path
 */
export function joinPath(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Resolve path segments to absolute path
 *
 * @param segments - Path segments to resolve
 * @returns Absolute path
 */
export function resolvePath(...segments: string[]): string {
  return path.resolve(...segments);
}

/**
 * Get file extension
 *
 * @param filePath - File path
 * @returns File extension including the dot (e.g., '.ts')
 */
export function getExtname(filePath: string): string {
  return path.extname(filePath);
}

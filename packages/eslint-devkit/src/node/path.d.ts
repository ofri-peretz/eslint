/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Cache type for compiled regex patterns
 */
export type PatternCache = Map<string, RegExp>;
/**
 * Create a new empty pattern cache
 */
export declare function createPatternCache(): PatternCache;
/**
 * Convert glob pattern to regex
 *
 * @param pattern - Glob pattern (supports **, *, ?)
 * @param cache - Cache for compiled patterns
 * @returns Compiled RegExp
 */
export declare function patternToRegex(pattern: string, cache: PatternCache): RegExp;
/**
 * Check if file should be ignored based on patterns
 *
 * @param file - File path to check
 * @param patterns - Array of glob patterns
 * @param cache - Cache for compiled patterns
 * @returns true if file matches any ignore pattern
 */
export declare function shouldIgnoreFile(file: string, patterns: string[], cache: PatternCache): boolean;
/**
 * Check if file is a barrel export (index file)
 *
 * @param file - File path to check
 * @param barrelExports - List of barrel export filenames
 * @returns true if file is a barrel export
 */
export declare function isBarrelExport(file: string, barrelExports: string[]): boolean;
/**
 * Format a cycle of file paths for concise display
 *
 * Uses ⟷ for bidirectional (2 modules) or → chain for longer cycles.
 *
 * @param cycle - Array of absolute file paths in the cycle
 * @param workspaceRoot - Workspace root for relative path calculation
 * @returns Formatted string representation of the cycle
 */
export declare function formatCycleDisplay(cycle: string[], workspaceRoot: string): string;
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
export declare function getModuleNames(cycle: string[], workspaceRoot: string): string[];
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
export declare function getRelativeImportPath(fromFile: string, toFile: string): string;
/**
 * Get the basename of a file path
 *
 * Simple wrapper around path.basename for convenience.
 *
 * @param filePath - File path (absolute or relative)
 * @returns Base filename
 */
export declare function getBasename(filePath: string): string;
/**
 * Get the directory name of a file path
 *
 * Simple wrapper around path.dirname for convenience.
 *
 * @param filePath - File path (absolute or relative)
 * @returns Directory path
 */
export declare function getDirname(filePath: string): string;
/**
 * Calculate relative path from one path to another
 *
 * @param from - Starting path
 * @param to - Target path
 * @returns Relative path
 */
export declare function getRelativePath(from: string, to: string): string;
/**
 * Normalize a file path
 *
 * Normalizes path separators to forward slashes for consistent display.
 *
 * @param filePath - File path to normalize
 * @returns Normalized path with forward slashes
 */
export declare function normalizePath(filePath: string): string;
/**
 * Join path segments
 *
 * @param segments - Path segments to join
 * @returns Joined path
 */
export declare function joinPath(...segments: string[]): string;
/**
 * Resolve path segments to absolute path
 *
 * @param segments - Path segments to resolve
 * @returns Absolute path
 */
export declare function resolvePath(...segments: string[]): string;
/**
 * Get file extension
 *
 * @param filePath - File path
 * @returns File extension including the dot (e.g., '.ts')
 */
export declare function getExtname(filePath: string): string;

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Node.js 'fs' module wrapper and utilities
 *
 * All file system operations should go through these wrappers for:
 * - Testability (can mock these functions)
 * - Code coverage (all operations tracked)
 * - Consistency (error handling, return types)
 */
import * as fs from 'node:fs';
/**
 * Check if a file exists (uncached)
 *
 * @param filePath - Path to the file
 * @returns true if file exists
 */
export declare function fileExistsSync(filePath: string): boolean;
/**
 * Read file content synchronously (uncached)
 *
 * @param filePath - Path to the file
 * @param encoding - File encoding (default: 'utf-8')
 * @returns File content or null if file doesn't exist or can't be read
 */
export declare function readFileSync(filePath: string, encoding?: BufferEncoding): string | null;
/**
 * Read and parse JSON file synchronously
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON object or null if file doesn't exist or is invalid JSON
 */
export declare function readJsonFileSync<T = unknown>(filePath: string): T | null;
/**
 * Get file stats synchronously
 *
 * @param filePath - Path to the file
 * @returns File stats or null if file doesn't exist or can't be read
 */
export declare function statSync(filePath: string): fs.Stats | null;
/**
 * Create directory synchronously (with parent directories if needed)
 *
 * @param dirPath - Path to the directory
 * @param options - Options for directory creation
 * @returns true if directory was created or already exists, false on error
 */
export declare function mkdirSync(dirPath: string, options?: {
    recursive?: boolean;
}): boolean;
/**
 * Write file content synchronously
 *
 * @param filePath - Path to the file
 * @param content - Content to write
 * @param encoding - File encoding (default: 'utf-8')
 * @returns true if write succeeded, false on error
 */
export declare function writeFileSync(filePath: string, content: string, encoding?: BufferEncoding): boolean;
/**
 * Find a file by walking up directories from a starting point
 *
 * @param filename - Name of the file to find (e.g., 'package.json')
 * @param startDir - Directory to start searching from
 * @returns Absolute path to the file or null if not found
 */
export declare function findFileUpward(filename: string, startDir: string): string | null;

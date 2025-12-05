/**
 * Node.js 'fs' module wrapper and utilities
 * 
 * All file system operations should go through these wrappers for:
 * - Testability (can mock these functions)
 * - Code coverage (all operations tracked)
 * - Consistency (error handling, return types)
 */
import * as fs from 'node:fs';
import { getDirname, joinPath } from './path';

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
 * Get file stats synchronously
 *
 * @param filePath - Path to the file
 * @returns File stats or null if file doesn't exist or can't be read
 */
export function statSync(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

/**
 * Create directory synchronously (with parent directories if needed)
 *
 * @param dirPath - Path to the directory
 * @param options - Options for directory creation
 * @returns true if directory was created or already exists, false on error
 */
export function mkdirSync(
  dirPath: string,
  options?: { recursive?: boolean }
): boolean {
  try {
    fs.mkdirSync(dirPath, { recursive: true, ...options });
    return true;
  } catch {
    return false;
  }
}

/**
 * Write file content synchronously
 *
 * @param filePath - Path to the file
 * @param content - Content to write
 * @param encoding - File encoding (default: 'utf-8')
 * @returns true if write succeeded, false on error
 */
export function writeFileSync(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): boolean {
  try {
    fs.writeFileSync(filePath, content, encoding);
    return true;
  } catch {
    return false;
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


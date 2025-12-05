/**
 * Node.js 'os' module wrapper and utilities
 * 
 * All OS operations should go through these wrappers for:
 * - Testability (can mock these functions)
 * - Code coverage (all operations tracked)
 * - Consistency (error handling, return types)
 */
import * as os from 'node:os';

/**
 * Get the platform-specific end-of-line marker
 *
 * @returns Platform EOL string ('\n' on Unix, '\r\n' on Windows)
 */
export function getEOL(): string {
  return os.EOL;
}

/**
 * Get the operating system platform
 *
 * @returns Platform string ('darwin', 'linux', 'win32', etc.)
 */
export function getPlatform(): NodeJS.Platform {
  return os.platform();
}

/**
 * Get the CPU architecture
 *
 * @returns Architecture string ('x64', 'arm64', etc.)
 */
export function getArch(): string {
  return os.arch();
}

/**
 * Get the operating system's default directory for temporary files
 *
 * @returns Path to the temporary directory
 */
export function getTmpDir(): string {
  return os.tmpdir();
}


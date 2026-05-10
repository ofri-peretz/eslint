/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Get the platform-specific end-of-line marker
 *
 * @returns Platform EOL string ('\n' on Unix, '\r\n' on Windows)
 */
export declare function getEOL(): string;
/**
 * Get the operating system platform
 *
 * @returns Platform string ('darwin', 'linux', 'win32', etc.)
 */
export declare function getPlatform(): NodeJS.Platform;
/**
 * Get the CPU architecture
 *
 * @returns Architecture string ('x64', 'arm64', etc.)
 */
export declare function getArch(): string;
/**
 * Get the operating system's default directory for temporary files
 *
 * @returns Path to the temporary directory
 */
export declare function getTmpDir(): string;

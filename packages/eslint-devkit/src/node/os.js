"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEOL = getEOL;
exports.getPlatform = getPlatform;
exports.getArch = getArch;
exports.getTmpDir = getTmpDir;
const tslib_1 = require("tslib");
/**
 * Node.js 'os' module wrapper and utilities
 *
 * All OS operations should go through these wrappers for:
 * - Testability (can mock these functions)
 * - Code coverage (all operations tracked)
 * - Consistency (error handling, return types)
 */
const os = tslib_1.__importStar(require("node:os"));
/**
 * Get the platform-specific end-of-line marker
 *
 * @returns Platform EOL string ('\n' on Unix, '\r\n' on Windows)
 */
function getEOL() {
    return os.EOL;
}
/**
 * Get the operating system platform
 *
 * @returns Platform string ('darwin', 'linux', 'win32', etc.)
 */
function getPlatform() {
    return os.platform();
}
/**
 * Get the CPU architecture
 *
 * @returns Architecture string ('x64', 'arm64', etc.)
 */
function getArch() {
    return os.arch();
}
/**
 * Get the operating system's default directory for temporary files
 *
 * @returns Path to the temporary directory
 */
function getTmpDir() {
    return os.tmpdir();
}

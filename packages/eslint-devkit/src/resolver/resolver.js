"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResolverPerformanceMetrics = getResolverPerformanceMetrics;
exports.resolveModule = resolveModule;
exports.clearResolverCache = clearResolverCache;
const oxc_resolver_1 = require("oxc-resolver");
const fs_1 = require("../node/fs");
const path_1 = require("../node/path");
const resolver_adapter_1 = require("./resolver-adapter");
// =============================================================================
// oxc-resolver: Rust-based NAPI resolver (18-30x faster than enhanced-resolve)
//
// Lazy-initialized singleton per lint run. The oxc-resolver handles:
// - TypeScript paths (tsconfig.json) natively
// - Package.json exports/imports
// - Extension fan-out
// - Node.js module resolution algorithm
// =============================================================================
// Per-tsconfig resolver cache: in monorepos, different packages have different
// tsconfig.json files (with different path aliases). We maintain one resolver
// per unique tsconfig to ensure correct resolution across package boundaries.
const oxcResolverCache = new Map();
// Per-directory tsconfig cache: maps a directory to its nearest tsconfig.json.
// This avoids repeated upward walks for files in the same directory.
const tsconfigPathCache = new Map();
/**
 * Find the nearest tsconfig.json by walking up from a file's directory.
 * Results are cached per-directory for the lint run.
 *
 * In monorepos this correctly finds per-package tsconfigs:
 *   packages/app/src/foo.ts  → packages/app/tsconfig.json
 *   packages/lib/src/bar.ts  → packages/lib/tsconfig.json
 */
function findTsconfigPath(fromFile) {
    const startDir = (0, path_1.getDirname)(fromFile);
    // Check if we've already resolved this directory
    const cached = tsconfigPathCache.get(startDir);
    if (cached !== undefined) {
        return cached;
    }
    // Walk up using the existing utility
    const result = (0, fs_1.findFileUpward)('tsconfig.json', startDir);
    // Cache the result for this directory and all intermediate directories
    // so sibling files don't repeat the walk
    let dir = startDir;
    const root = (0, path_1.resolvePath)('/');
    while (dir !== root) {
        tsconfigPathCache.set(dir, result);
        // Stop caching once we reach the directory containing the tsconfig
        if (result && (0, path_1.getDirname)(result) === dir)
            break;
        const parent = (0, path_1.getDirname)(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return result;
}
/**
 * Get or create an oxc-resolver instance for the given options + tsconfig.
 * Resolver instances are cached by (options + tsconfig path) key.
 * In a single-project setup, this creates exactly ONE resolver.
 * In a monorepo, one resolver per unique tsconfig.
 */
function getOxcResolver(options, fromFile) {
    const extensions = options.extensions || [
        '.ts', '.tsx', '.js', '.jsx', '.d.ts', '.json', '.node',
    ];
    const conditionNames = options.conditionNames || [
        'import', 'require', 'node', 'default', 'types',
    ];
    const mainFields = options.mainFields || ['module', 'main'];
    // Find the nearest tsconfig for this file (per-directory cached)
    const tsconfigPath = findTsconfigPath(fromFile);
    // Cache key: options + tsconfig path
    const key = `${extensions.join(',')}|${conditionNames.join(',')}|${mainFields.join(',')}|${tsconfigPath || ''}`;
    const cached = oxcResolverCache.get(key);
    if (cached) {
        return cached;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- oxc-resolver options
    const resolverOptions = {
        extensions,
        conditionNames,
        mainFields,
        mainFiles: ['index'],
        modules: ['node_modules'],
    };
    // Only add tsconfig if found — oxc-resolver handles paths natively
    if (tsconfigPath) {
        resolverOptions['tsconfig'] = {
            configFile: tsconfigPath,
            references: 'auto',
        };
    }
    const resolver = new oxc_resolver_1.ResolverFactory(resolverOptions);
    oxcResolverCache.set(key, resolver);
    return resolver;
}
// =============================================================================
// CSS Resolution (kept from original — lightweight, no external deps)
// =============================================================================
/**
 * Check if import path is a CSS/SCSS import
 */
function isCssImport(importPath) {
    if (/\.(css|scss|sass|less|styl)$/i.test(importPath)) {
        return true;
    }
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
        return !/\.\w+$/.test(importPath);
    }
    return false;
}
/**
 * Resolve CSS/SCSS import paths
 */
function resolveCssImport(importPath, fromFile) {
    const fromDir = (0, path_1.getDirname)(fromFile);
    if (importPath.startsWith('.')) {
        const resolved = (0, path_1.resolvePath)(fromDir, importPath);
        if ((0, fs_1.fileExistsSync)(resolved)) {
            const stats = (0, fs_1.statSync)(resolved);
            if (stats && stats.isFile()) {
                return resolved;
            }
        }
        const cssExtensions = ['.css', '.scss', '.sass', '.less', '.styl'];
        for (const ext of cssExtensions) {
            const withExt = resolved + ext;
            if ((0, fs_1.fileExistsSync)(withExt)) {
                const stats = (0, fs_1.statSync)(withExt);
                if (stats && stats.isFile()) {
                    return withExt;
                }
            }
        }
        for (const ext of cssExtensions) {
            const indexFile = (0, path_1.joinPath)(resolved, `index${ext}`);
            if ((0, fs_1.fileExistsSync)(indexFile)) {
                const stats = (0, fs_1.statSync)(indexFile);
                if (stats && stats.isFile()) {
                    return indexFile;
                }
            }
        }
    }
    return null;
}
/**
 * Get performance metrics for all resolvers.
 *
 * Note: With oxc-resolver, detailed per-call metrics are not tracked
 * in production to avoid overhead. Returns empty array.
 *
 * @internal — debug/observability API. Not part of the stable consumer
 *   contract. Stripped from emitted `.d.ts` via `stripInternal`.
 */
function getResolverPerformanceMetrics() {
    return [];
}
/**
 * Resolve an import path using oxc-resolver (Rust NAPI)
 *
 * Resolution priority:
 * 1. External resolvers (eslint-import-resolver-*) if configured
 * 2. Fast path: relative imports with existsSync + extension fan-out
 * 3. CSS resolution (if cssSupport enabled)
 * 4. oxc-resolver: handles everything else (tsconfig paths, package.json exports,
 *    node_modules, monorepo resolution) via native Rust execution
 *
 * @param importPath - The path to resolve (e.g., "react", "./utils", "@app/components")
 * @param fromFile - The file where the import originates
 * @param options - Resolution options
 * @returns The absolute path to the resolved file, or null if not found
 */
function resolveModule(importPath, fromFile, options = {}) {
    try {
        // =========================================================================
        // FAST PATH: Resolve relative imports with existsSync + extension fan-out
        // This bypasses oxc-resolver for the ~80% of imports that are relative.
        // Skip for CSS imports when cssSupport is enabled.
        // =========================================================================
        if (importPath.startsWith('.') && !(options.cssSupport && isCssImport(importPath))) {
            const context = (0, path_1.getDirname)(fromFile);
            const defaultExtensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts', '.json'];
            const extensions = options.extensions || defaultExtensions;
            const resolved = (0, path_1.resolvePath)(context, importPath);
            // 1. Exact path (import './foo.ts')
            const exactStats = (0, fs_1.statSync)(resolved);
            if (exactStats && exactStats.isFile()) {
                return resolved;
            }
            // 2. Try adding extensions (import './foo' → './foo.ts')
            for (const ext of extensions) {
                if ((0, fs_1.fileExistsSync)(resolved + ext)) {
                    return resolved + ext;
                }
            }
            // 3. Try index files (import './foo' → './foo/index.ts')
            for (const ext of extensions) {
                const indexFile = (0, path_1.joinPath)(resolved, `index${ext}`);
                if ((0, fs_1.fileExistsSync)(indexFile)) {
                    return indexFile;
                }
            }
            // Relative import didn't resolve via fast path — fall through to
            // oxc-resolver which handles more exotic cases (package.json
            // exports within relative paths, symlinks, etc.)
        }
        // =========================================================================
        // STANDARD PATH
        // =========================================================================
        // 0. Try External Resolvers (if configured)
        if (options.resolverSettings) {
            const externalResult = (0, resolver_adapter_1.resolveWithExternalResolvers)(importPath, fromFile, options.resolverSettings);
            if (externalResult) {
                return externalResult;
            }
        }
        // 1. Try CSS/SCSS resolution (if enabled and looks like CSS)
        if (options.cssSupport && isCssImport(importPath)) {
            const cssResult = resolveCssImport(importPath, fromFile);
            if (cssResult) {
                return cssResult;
            }
        }
        // 2. Use oxc-resolver for everything else (Rust NAPI — 18-30x faster)
        //    Handles: tsconfig paths, package.json exports, node_modules,
        //    monorepo resolution, symlinks, condition names
        const resolver = getOxcResolver(options, fromFile);
        const context = (0, path_1.getDirname)(fromFile);
        try {
            const result = resolver.sync(context, importPath);
            if (result && result.path) {
                return result.path;
            }
        }
        catch {
            // oxc-resolver throws on resolution failure — this is expected for
            // unresolvable imports (typos, missing packages, etc.)
        }
        // No resolver succeeded
        return null;
    }
    catch {
        // Resolution failed with unexpected error
        return null;
    }
}
/**
 * Clear internal caches (useful for testing or watch mode).
 *
 * @internal — test/debug utility. Consumers have no reason to call this
 *   directly; lint runs are short-lived and caches don't persist across
 *   them. Stripped from emitted `.d.ts` via `stripInternal`.
 */
function clearResolverCache() {
    for (const resolver of oxcResolverCache.values()) {
        resolver.clearCache();
    }
    oxcResolverCache.clear();
    tsconfigPathCache.clear();
}
// Lines 322-324: Defensive error handling for truly exceptional cases
// These lines handle unexpected exceptions from resolution logic that are:
// 1. Difficult to reproduce in tests (would require mocking library functions to throw)
// 2. Represent proper defensive programming practices
// 3. Ensure the resolver never crashes with unhandled exceptions
// Coverage: Intentionally uncovered as these are edge case error paths

"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveWithExternalResolvers = resolveWithExternalResolvers;
/**
 * Cache for loaded resolver modules
 */
const loadedResolvers = new Map();
/**
 * Load an external resolver module
 *
 * Tries to load:
 * 1. The exact module name
 * 2. eslint-import-resolver-<name>
 * 3. <name> (as a fallback)
 */
function loadResolver(name) {
    const cached = loadedResolvers.get(name);
    if (cached !== undefined) {
        return cached;
    }
    const potentialNames = [
        name,
        `eslint-import-resolver-${name}`,
        // specialized scope resolvers
        name.startsWith('@') ? name : null,
    ].filter(Boolean);
    let resolver = null;
    for (const pkgName of potentialNames) {
        try {
            // Try to require from the project's context
            // We use a simple require here, assuming the plugin is running in the same context
            // In a real robust system we might need 'resolve-from' or similar
            // Dynamic require is necessary for loading external resolver plugins
            const loaded = require(pkgName);
            if (loaded && typeof loaded.resolve === 'function') {
                resolver = loaded;
                break;
            }
        }
        catch (error) {
            // If module not found, continue
            const err = error;
            if (err.code !== 'MODULE_NOT_FOUND') {
                console.warn(`Failed to load resolver ${pkgName}:`, error);
            }
        }
    }
    // Cache the result (null if not found)
    loadedResolvers.set(name, resolver);
    return resolver;
}
/**
 * Normalize resolver settings to prioritized list
 */
function normalizeResolverSettings(settings) {
    const normalized = [];
    if (typeof settings === 'string') {
        normalized.push({ name: settings, config: {}, priority: 0 });
    }
    else if (Array.isArray(settings)) {
        settings.forEach((item, index) => {
            if (typeof item === 'string') {
                normalized.push({ name: item, config: {}, priority: index });
            }
            else if (typeof item === 'object') {
                Object.entries(item).forEach(([name, config]) => {
                    const priority = typeof config === 'object' &&
                        config !== null &&
                        'priority' in config
                        ? config['priority'] || index
                        : index;
                    normalized.push({
                        name,
                        config: config,
                        priority,
                    });
                });
            }
        });
    }
    else if (typeof settings === 'object') {
        // This branch handles plain objects (not arrays) - ensure coverage
        Object.entries(settings).forEach(([name, config], index) => {
            const priority = typeof config === 'object' && config !== null && 'priority' in config
                ? config['priority'] || index
                : index;
            normalized.push({
                name,
                config: config,
                priority,
            });
        });
    }
    // Sort by priority (lower number = higher priority)
    // oxlint-disable-next-line no-array-sort
    return normalized.sort((a, b) => a.priority - b.priority);
}
/**
 * Resolve a module using configured external resolvers with prioritization
 *
 * @param source - The import source path (e.g. "react", "./foo")
 * @param file - The absolute path to the file making the import
 * @param settings - The 'import/resolver' setting value
 * @returns The resolved absolute path, or null if not found
 */
function resolveWithExternalResolvers(source, file, settings) {
    if (!settings)
        return null;
    const normalizedResolvers = normalizeResolverSettings(settings);
    for (const { name, config } of normalizedResolvers) {
        const resolver = loadResolver(name);
        if (resolver && typeof resolver.resolve === 'function') {
            try {
                const result = resolver.resolve(source, file, config);
                if (result.found && result.path) {
                    return result.path;
                }
            }
            catch {
                // Resolver failed, continue to next resolver
                // Silently continue to next resolver
            }
        }
    }
    return null;
}

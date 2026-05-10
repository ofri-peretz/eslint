/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Interface for external resolvers (compatible with eslint-plugin-import resolvers)
 *
 * Note: This module uses require() for dynamic module loading, which is necessary
 * for loading external resolver plugins. All path/fs operations should go through
 * the wrapped utilities in node/path.ts and node/fs.ts for testability and coverage.
 */
export interface ExternalResolver {
    interfaceVersion?: number;
    resolve(source: string, file: string, config: Record<string, unknown>): {
        found: boolean;
        path?: string | null;
    };
}
/**
 * Resolver performance metrics for monitoring
 */
export interface ResolverMetrics {
    name: string;
    loadTime: number;
    resolveCount: number;
    cacheHits: number;
    cacheMisses: number;
    averageResolveTime: number;
    lastUsed: number;
}
/**
 * Configuration for resolvers in .eslintrc settings
 * Can be a string (single resolver name) or object (map of name -> config)
 * Arrays support priority ordering
 */
export type ResolverSetting = string | {
    [resolverName: string]: Record<string, unknown>;
} | Array<string | {
    [resolverName: string]: Record<string, unknown>;
}>;
/**
 * Normalized resolver configuration with priority
 */
export interface NormalizedResolver {
    name: string;
    config: Record<string, unknown>;
    priority: number;
}
/**
 * Resolve a module using configured external resolvers with prioritization
 *
 * @param source - The import source path (e.g. "react", "./foo")
 * @param file - The absolute path to the file making the import
 * @param settings - The 'import/resolver' setting value
 * @returns The resolved absolute path, or null if not found
 */
export declare function resolveWithExternalResolvers(source: string, file: string, settings: ResolverSetting): string | null;

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { ResolverSetting } from './resolver-adapter';
/**
 * Options for the resolver
 */
export interface ResolverOptions {
    /** Extensions to try (default: .ts, .tsx, .js, .jsx, .json, .node) */
    extensions?: string[];
    /** Condition names for exports field (default: ['import', 'require', 'node', 'default']) */
    conditionNames?: string[];
    /** Main fields to look for (default: ['module', 'main']) */
    mainFields?: string[];
    /** External resolver settings (from eslint settings) */
    resolverSettings?: ResolverSetting;
    /** Enable CSS/SCSS resolution for React components */
    cssSupport?: boolean;
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
export declare function resolveModule(importPath: string, fromFile: string, options?: ResolverOptions): string | null;

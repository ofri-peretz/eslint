/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Available resolvers that can be auto-detected
 */
export interface ResolverDetectionResult {
    name: string;
    detected: boolean;
    config?: Record<string, unknown>;
    reason?: string;
}
/**
 * Detect available resolvers based on project structure
 */
export declare function detectResolvers(workspaceRoot: string): ResolverDetectionResult[];
/**
 * Generate recommended ESLint resolver configuration
 */
export declare function generateRecommendedConfig(workspaceRoot: string): {
    settings: Record<string, unknown>;
    recommendations: string[];
};
/**
 * Migration helper for eslint-plugin-import users
 */
export declare function migrateFromEslintImport(oldConfig: Record<string, unknown>): {
    migrated: Record<string, unknown>;
    warnings: string[];
    suggestions: string[];
};
/**
 * Validate resolver configuration
 */
export declare function validateResolverConfig(settings: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};

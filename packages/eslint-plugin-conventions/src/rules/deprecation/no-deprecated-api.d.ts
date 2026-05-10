/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: no-deprecated-api
 * Detects deprecated API usage with replacement context and migration timeline
 */
import type { TSESLint } from '@interlace/eslint-devkit';
type MessageIds = 'deprecatedAPI' | 'useReplacement';
interface DeprecatedAPI {
    name: string;
    replacement: string;
    deprecatedSince: string;
    removalDate?: string;
    reason: string;
    migrationGuide?: string;
}
export interface Options {
    /** Array of deprecated APIs to detect */
    apis?: DeprecatedAPI[];
    /** Days before removal date to start warning */
    warnDaysBeforeRemoval?: number;
}
type RuleOptions = [Options?];
export declare const noDeprecatedApi: TSESLint.RuleModule<MessageIds, RuleOptions, unknown, TSESLint.RuleListener> & {
    name: string;
};
export {};

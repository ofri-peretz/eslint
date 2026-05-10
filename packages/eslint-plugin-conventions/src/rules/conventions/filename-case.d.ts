/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: filename-case
 * Enforce filename case conventions
 */
import type { TSESLint } from '@interlace/eslint-devkit';
export type CaseType = 'camelCase' | 'kebabCase' | 'pascalCase' | 'snakeCase';
export interface Options {
    /** Case convention to enforce */
    case?: CaseType;
    /** List of patterns to ignore completely */
    ignore?: (string | RegExp)[];
    /** List of uppercase filenames to allow (without extension). Set to empty array to disable. */
    allowedUppercaseFiles?: string[];
    /** List of filenames allowed to use kebab-case regardless of the global case setting */
    allowedKebabCase?: string[];
    /** List of filenames allowed to use snake_case regardless of the global case setting */
    allowedSnakeCase?: string[];
    /** List of filenames allowed to use camelCase regardless of the global case setting */
    allowedCamelCase?: string[];
    /** List of filenames allowed to use PascalCase regardless of the global case setting */
    allowedPascalCase?: string[];
}
type RuleOptions = [Options?];
export declare const filenameCase: TSESLint.RuleModule<"filenameCase", RuleOptions, unknown, TSESLint.RuleListener> & {
    name: string;
};
export {};

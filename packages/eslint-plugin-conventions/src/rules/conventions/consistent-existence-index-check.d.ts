/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: consistent-existence-index-check
 * Enforce consistent style for checking object property existence
 */
import type { TSESLint } from '@interlace/eslint-devkit';
export interface Options {
    /** Preferred method for checking property existence */
    preferred?: 'in' | 'hasOwnProperty' | 'Object.hasOwn';
}
type RuleOptions = [Options?];
export declare const consistentExistenceIndexCheck: TSESLint.RuleModule<"consistentExistenceCheck", RuleOptions, unknown, TSESLint.RuleListener> & {
    name: string;
};
export {};

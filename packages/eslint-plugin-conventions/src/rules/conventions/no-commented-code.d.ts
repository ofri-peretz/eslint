/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: no-commented-code
 * Detects commented-out code blocks
 *
 * @see https://rules.sonarsource.com/javascript/RSPEC-125/
 */
import type { TSESLint } from '@interlace/eslint-devkit';
type MessageIds = 'commentedCode' | 'removeCode' | 'useVersionControl';
export interface Options {
    /** Ignore single-line comments. Default: false */
    ignoreSingleLine?: boolean;
    /** Ignore comments in test files. Default: true */
    ignoreInTests?: boolean;
    /** Minimum lines of commented code to trigger. Default: 1 */
    minLines?: number;
}
type RuleOptions = [Options?];
export declare const noCommentedCode: TSESLint.RuleModule<MessageIds, RuleOptions, unknown, TSESLint.RuleListener> & {
    name: string;
};
export {};

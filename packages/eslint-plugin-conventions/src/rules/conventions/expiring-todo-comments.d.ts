/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: expiring-todo-comments
 * Add expiration conditions to TODO comments to prevent forgotten tasks
 */
import type { TSESLint } from '@interlace/eslint-devkit';
type MessageIds = 'expiringTodoComment' | 'invalidTodoCondition' | 'multipleTodoConditions';
export interface Options {
    /** Terms to check for (default: ['TODO', 'FIXME', 'XXX']) */
    terms?: string[];
    /** Date format for expiry dates */
    dateFormat?: string;
    /** Allow warnings for expired TODOs */
    allowWarningComments?: boolean;
}
type RuleOptions = [Options?];
export declare const expiringTodoComments: TSESLint.RuleModule<MessageIds, RuleOptions, unknown, TSESLint.RuleListener> & {
    name: string;
};
export {};

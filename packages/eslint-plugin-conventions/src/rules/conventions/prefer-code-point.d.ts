/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: prefer-code-point
 * Prefer codePointAt over charCodeAt for proper Unicode handling
 */
import type { TSESLint } from '@interlace/eslint-devkit';
export declare const preferCodePoint: TSESLint.RuleModule<"preferCodePoint", [], unknown, TSESLint.RuleListener> & {
    name: string;
};

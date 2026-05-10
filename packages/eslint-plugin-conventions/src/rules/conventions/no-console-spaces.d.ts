/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: no-console-spaces
 * Prevent leading/trailing space between console.log parameters
 */
import type { TSESLint } from '@interlace/eslint-devkit';
export declare const noConsoleSpaces: TSESLint.RuleModule<"noConsoleSpaces", [], unknown, TSESLint.RuleListener> & {
    name: string;
};

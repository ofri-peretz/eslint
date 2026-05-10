/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: prefer-dom-node-text-content
 * Prefer textContent over innerText for DOM node text access
 */
import type { TSESLint } from '@interlace/eslint-devkit';
export declare const preferDomNodeTextContent: TSESLint.RuleModule<"preferDomNodeTextContent", [], unknown, TSESLint.RuleListener> & {
    name: string;
};

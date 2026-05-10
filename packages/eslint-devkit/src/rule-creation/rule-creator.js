"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESLintUtils = exports.createRule = void 0;
exports.createRuleCreator = createRuleCreator;
/**
 * Rule Creator - Main utility for creating well-typed ESLint rules
 *
 * Inspired by typescript-eslint's RuleCreator
 * Provides a factory function for creating rules with proper types and documentation
 */
const utils_1 = require("@typescript-eslint/utils");
Object.defineProperty(exports, "ESLintUtils", { enumerable: true, get: function () { return utils_1.ESLintUtils; } });
/**
 * Create a rule creator with a custom documentation URL resolver
 *
 * @param urlCreator - Function that generates documentation URLs for rules
 * @returns A rule creator function with the specified URL resolver
 *
 * @example
 * ```typescript
 * const createRule = createRuleCreator(
 *   (name) => `https://github.com/my-org/eslint-plugin/docs/rules/${name}.md`
 * );
 *
 * export const myRule = createRule({
 *   name: 'my-rule',
 *   meta: { ... },
 *   defaultOptions: [],
 *   create(context) { ... }
 * });
 * ```
 */
function createRuleCreator(urlCreator) {
    return utils_1.ESLintUtils.RuleCreator(urlCreator);
}
/**
 * Default rule creator with a generic documentation URL pattern
 *
 * This can be used directly if you don't need custom URL generation
 */
exports.createRule = utils_1.ESLintUtils.RuleCreator((name) => `https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin/docs/rules/${name}.md`);

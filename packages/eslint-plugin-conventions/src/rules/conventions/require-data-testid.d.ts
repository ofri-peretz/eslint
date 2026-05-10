/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * ESLint Rule: require-data-testid
 *
 * Enforces a stable `data-testid` attribute on elements that are testing
 * targets. Pairs with `apps/docs/A11Y.md` (Layer 3 of the a11y self-test
 * model): brittle class-name selectors break on every styling refactor;
 * `data-testid` gives every component a stable identity invisible at
 * runtime and untouchable by Tailwind churn.
 *
 * By default flags:
 *   - native interactive elements: <button>, <input>, <select>,
 *     <textarea>, <a> with onClick or href
 *   - custom React components (PascalCase identifier)
 *
 * Options:
 *   - `requireOn`: extra element/component names that must have the attribute
 *   - `ignore`: names to skip even when default-flagged
 *   - `componentPattern`: regex string for "this is a custom component"
 *     detection (default: ^[A-Z])
 */
import type { TSESLint } from '@interlace/eslint-devkit';
type MessageIds = 'missingDataTestId' | 'dynamicDataTestId';
export interface Options {
    /** Additional element / component names to require `data-testid` on. */
    requireOn?: string[];
    /** Names to skip (even when otherwise default-flagged). */
    ignore?: string[];
    /**
     * Regex string. If a JSX element name matches, it's treated as a "custom
     * component" and required to carry `data-testid`. Default: `^[A-Z]`.
     */
    componentPattern?: string;
    /**
     * If true, `data-testid` values must be string-literal expressions or
     * template literals containing only string + identifier expressions
     * (so they're stable across renders). Default: true.
     */
    enforceStableValues?: boolean;
}
type RuleOptions = [Options?];
export declare const requireDataTestId: TSESLint.RuleModule<MessageIds, RuleOptions, unknown, TSESLint.RuleListener> & {
    name: string;
};
export {};

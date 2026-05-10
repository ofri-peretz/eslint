/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * prefer-dependency-version-strategy
 *
 * Enforces a consistent version-specifier strategy (caret, tilde, exact, etc.)
 * for package.json dependencies. Pairs with a lockfile-alignment check
 * (e.g. `npm ci`, or this monorepo's `scripts/check-version-alignment.ts`)
 * so both format consistency and lockfile parity are enforced; this rule
 * handles the "format" half at edit/PR time inside ESLint.
 */
import type { TSESLint } from '@interlace/eslint-devkit';
type VersionStrategy = 'caret' | 'tilde' | 'exact' | 'range' | 'any';
export interface Options {
    strategy?: VersionStrategy;
    allowWorkspace?: boolean;
    allowFile?: boolean;
    allowLink?: boolean;
    overrides?: Record<string, VersionStrategy>;
}
type RuleOptions = [Options?];
type MessageIds = 'preferStrategy' | 'invalidStrategy';
export declare const preferDependencyVersionStrategy: TSESLint.RuleModule<MessageIds, RuleOptions, unknown, TSESLint.RuleListener> & {
    name: string;
};
export {};

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

// Rule creation utilities for building ESLint rules
export * from './rule-creator';
export * from './mock-context';
// Shared CWE-89 detector — see sql-injection-rule.ts for why it lives here
// rather than inside a single database plugin.
export * from './sql-injection-rule';

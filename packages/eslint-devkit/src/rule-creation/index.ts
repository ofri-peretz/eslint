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
// Shared CWE-284 detector — same reasoning, for unscoped bulk mutations.
export * from './unscoped-mutation-rule';
// Shared CWE-319 detector — cleartext / unverified database connections.
export * from './require-tls-rule';
// Shared CWE-915 detector — the request object written straight to a row.
export * from './mass-assignment-rule';
// Shared CWE-798 detector — literal database credentials in connection config.
export * from './hardcoded-credentials-rule';
// Shared CWE-89 detector for the *other* half of SQL injection: identifiers
// spliced into a query the tagged template only parameterizes values in.
export * from './raw-identifier-rule';

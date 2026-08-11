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
// Shared CWE-798 detector — a literal API key in an inference SDK's client
// options. Distinct from the connection-config detector above: nothing in
// secure-coding reports an SDK client key, measured.
export * from './sdk-api-key-rule';
// Shared CWE-522 detector — an inference SDK's browser escape hatch turned on.
// Two instantiations, not three: neither Gemini SDK has the flag (verified
// against the published tarballs).
export * from './browser-escape-hatch-rule';
// Shared CWE-1427 detector — untrusted content built into a raw SDK's system
// prompt. Gated on member calls, so it can never collide with
// vercel-ai-security/no-dynamic-system-prompt, which owns the bare-function form.
export * from './system-prompt-injection-rule';
// Which untrusted message source a handler belongs to. Decides whether a sink
// finding is owned by a source-specific rule or by the generic one — the two
// used to report the same range, measured on the shipped tarball.
export * from './message-source';
// Shared CWE-89 detector for the *other* half of SQL injection: identifiers
// spliced into a query the tagged template only parameterizes values in.
export * from './raw-identifier-rule';
export * from './module-evidence';

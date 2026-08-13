/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Paths the corpus scan does not lint, and why each one is here.
 *
 * Precision is measured on code people SHIP. A finding in a test fixture, a
 * demo app or a vendored bundle may be perfectly real and still tell you
 * nothing about whether the rule is right — it tells you about the corpus's
 * habits. Counting those is how a scan-config problem gets filed as a rule
 * defect.
 *
 * Lives in its own module for the same reason `private-cache-dir.ts` does:
 * `scripts/corpus-scan.ts` calls `process.exit(main())` at module scope, so a
 * test that imported it to read this list would run a full corpus scan.
 */
export const SCAN_IGNORES: readonly string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.min.js',

  // Tests and their fixtures, in the spellings these repos actually use.
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/fixtures/**',
  // The SINGULAR spelling. auth0 writes `end-to-end/fixture/helpers.js`, and
  // `**/fixtures/**` does not match `fixture/`. That one file was the corpus's
  // only `require-expiration` finding — a test harness minting a logout token
  // for a local test IdP, with no `exp` because nothing consumes it. Counted as
  // a rule defect for as long as the glob was plural.
  '**/fixture/**',

  '**/examples/**',
  '**/docs/**',
  '**/.next/**',

  // Checked-in third-party bundles. Not `*.min.js` and not under `dist/`, so
  // the globs above miss them, but nobody edits them and no real project lints
  // them: okta ships `@okta/courage-dist/`, Shopify ships a speedscope build
  // under `assets/`, and both vendor libraries wholesale. Counting findings
  // there measures the corpus's vendoring habits, not our precision.
  '**/vendor/**',
  '**/*-dist/**',
  '**/assets/**',

  // Same category as the entries above, under the names these repos use:
  // `e2e/` is test infrastructure, `playground/` is a dev server, and
  // `samples/` is `examples/` (okta ships its demo apps as `samples/generated/`).
  // Findings here are still real — okta's sample app really does assign server
  // data to innerHTML — they are just not a measure of whether the rules are
  // right.
  '**/e2e/**',
  '**/playground/**',
  '**/samples/**',
  // `e2e/` spelled out. auth0 uses `end-to-end/`, which the abbreviation misses.
  '**/end-to-end/**',
];

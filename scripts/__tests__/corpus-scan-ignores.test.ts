/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock for the corpus scan's ignore list.
 *
 * The scan measures PRECISION on shipped code. When a glob misses the spelling
 * a repository actually uses, the finding it lets through is filed against the
 * rule instead of against the scan — which is what happened to
 * `jwt-security/require-expiration`, whose single corpus finding was auth0's
 * `end-to-end/fixture/helpers.js:116`: a test harness minting a logout token
 * for a local test IdP. The plural `fixtures` glob does not match `fixture/`,
 * and the abbreviated `e2e` glob does not match `end-to-end/`.
 *
 * Asserted through ESLint's own `isPathIgnored`, not a hand-rolled glob
 * matcher, so this measures the semantics the scan actually runs under.
 */
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import { SCAN_IGNORES } from '../lib/corpus-scan-ignores.ts';

const CWD = path.resolve(import.meta.dirname, '..', '..');

const eslint = new ESLint({
  cwd: CWD,
  overrideConfigFile: true,
  // Two blocks rather than the scan's one. The `files` block is what stops
  // every `.ts` path reading as ignored merely because no config claims it —
  // without it this test would pass on an EMPTY ignore list. The globs
  // themselves then sit in a global-ignores block, which is what makes
  // `isPathIgnored` answer about them specifically. The outcome the scan cares
  // about is identical either way: no rules run on the path.
  overrideConfig: [
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs', '**/*.ts', '**/*.tsx'],
      rules: {},
    },
    { ignores: [...SCAN_IGNORES] },
  ],
});

const ignored = (relative: string): Promise<boolean> =>
  eslint.isPathIgnored(path.join(CWD, relative));

describe('corpus-scan ignore list', () => {
  it.each([
    // The finding this entry was added for.
    ['auth0__express-openid-connect/end-to-end/fixture/helpers.js'],
    // Both spellings, independently — `end-to-end/` alone, and `fixture/`
    // alone, each have to be enough.
    ['some-repo/end-to-end/helpers.js'],
    ['some-repo/src/fixture/token.js'],
    // The plural / abbreviated forms that were already covered.
    ['some-repo/test/auth.js'],
    ['some-repo/src/__tests__/auth.js'],
    ['some-repo/src/fixtures/token.js'],
    ['some-repo/e2e/login.js'],
    ['some-repo/examples/demo.js'],
    ['some-repo/samples/generated/app.js'],
    ['some-repo/node_modules/pkg/index.js'],
    ['some-repo/packages/x/dist/index.js'],
    ['okta__okta-auth-js/packages/@okta/courage-dist/index.js'],
  ])('ignores %s', async (relative) => {
    await expect(ignored(relative)).resolves.toBe(true);
  });

  it.each([
    // Shipped source is what the scan is for. None of these may be ignored, or
    // the precision number is measured on less than it claims.
    ['auth0__express-openid-connect/lib/context.js'],
    ['auth0__express-openid-connect/lib/tokenset.js'],
    ['Shopify__cli/packages/cli-kit/src/private/node/session/exchange.ts'],
    ['Shopify__cli/packages/cli-kit/src/private/node/constants.ts'],
    ['twilio__twilio-node/src/auth_strategy/TokenAuthStrategy.ts'],
    // A source file whose name merely contains one of the ignored words.
    ['some-repo/src/fixture-loader.ts'],
    ['some-repo/src/end-to-end-report.ts'],
  ])('does not ignore %s', async (relative) => {
    await expect(ignored(relative)).resolves.toBe(false);
  });
});

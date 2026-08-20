/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The analytics pair, asserted as a MATRIX.
 *
 * The duplicate ledger reports `no-sensitive-data-in-analytics` and
 * `no-tracking-without-consent` as duplicate coverage: same CWE-359, same
 * severity band, same call sites. This file is the disproof.
 *
 * The 2×2 below is fully populated in all four cells. A rule that were a
 * subset of the other would leave a cell empty; instead each rule owns a cell
 * the other cannot reach, and the both-fire cell is two findings with two
 * different remediations — gating a tracker still ships the email to the
 * vendor, and stripping the email still tracks a user who refused. Neither
 * report can be deleted without losing a real defect, so the overlap is
 * COMPLEMENTARY, not a double.
 *
 * A `RuleTester` runs one rule, so only a file like this one can see the
 * difference between "complementary" and "duplicate".
 */
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';

import { noSensitiveDataInAnalytics } from './index';
import { noTrackingWithoutConsent } from '../no-tracking-without-consent';

const FAMILY = {
  'no-sensitive-data-in-analytics': noSensitiveDataInAnalytics,
  'no-tracking-without-consent': noTrackingWithoutConsent,
} as const;

type RuleName = keyof typeof FAMILY;

const linter = new Linter();

function reportingRules(code: string): RuleName[] {
  const messages = linter.verify(
    code,
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tsParser as never,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { family: { rules: FAMILY as never } },
      rules: Object.fromEntries(
        Object.keys(FAMILY).map((name) => [`family/${name}`, 'error']),
      ) as never,
    },
    'component.tsx',
  );

  const crashes = messages.filter((message) => message.ruleId === null);
  expect(crashes.map((message) => message.message)).toEqual([]);

  return [
    ...new Set(
      messages.map((message) => (message.ruleId as string).replace('family/', '') as RuleName),
    ),
  ].sort() as RuleName[];
}

/** The 2×2: {PII in payload} × {consent gate present}. */
const MATRIX: ReadonlyArray<{ shape: string; code: string; owner: RuleName[] }> = [
  {
    shape: 'PII, no gate — both, for two different reasons',
    code: "analytics.track('signup', { email: user.email });",
    owner: ['no-sensitive-data-in-analytics', 'no-tracking-without-consent'],
  },
  {
    shape: 'PII, gated — the privacy defect survives the gate',
    code: "if (hasConsent) { analytics.track('signup', { email: user.email }); }",
    owner: ['no-sensitive-data-in-analytics'],
  },
  {
    shape: 'no PII, no gate — the consent defect survives a clean payload',
    code: "analytics.track('signup', { plan: 'pro' });",
    owner: ['no-tracking-without-consent'],
  },
  {
    shape: 'no PII, gated — the remediation for both',
    code: "if (hasConsent) { analytics.track('signup', { plan: 'pro' }); }",
    owner: [],
  },
];

describe('analytics pair — 2×2 matrix', () => {
  it.each(MATRIX)('$shape → $owner', ({ code, owner }) => {
    expect(reportingRules(code)).toEqual([...owner].sort());
  });

  it('neither rule is a subset of the other — both single-owner cells are populated', () => {
    const soleOwners = new Set(
      MATRIX.filter(({ owner }) => owner.length === 1).map(({ owner }) => owner[0]),
    );
    expect([...soleOwners].sort()).toEqual([
      'no-sensitive-data-in-analytics',
      'no-tracking-without-consent',
    ]);
  });
});

/**
 * The vendor surface, SHARED by both rules via `utils/analytics-sinks.ts`.
 *
 * It was not shared, and the divergence showed up here as rows where only one
 * rule fired on a call both should see: `window.analytics.track(…)` and GTM's
 * `dataLayer.push(…)`. That is a coverage hole, not a partition — a
 * complementary pair with different sink lists is just two rules with
 * different blind spots.
 */
const VENDORS: ReadonlyArray<{ shape: string; code: string; owner: RuleName[] }> = [
  {
    shape: 'gtag event params',
    code: "gtag('event', 'signup', { user_email: u.email });",
    owner: ['no-sensitive-data-in-analytics', 'no-tracking-without-consent'],
  },
  {
    shape: 'GTM dataLayer.push',
    code: "window.dataLayer.push({ event: 'signup', phone: u.phone });",
    owner: ['no-sensitive-data-in-analytics', 'no-tracking-without-consent'],
  },
  {
    shape: 'PostHog capture',
    code: "posthog.capture('signup', { emailAddress: u.email });",
    owner: ['no-sensitive-data-in-analytics', 'no-tracking-without-consent'],
  },
  {
    shape: 'Segment identify traits',
    code: "analytics.identify(id, { traits: { creditCard: card } });",
    owner: ['no-sensitive-data-in-analytics', 'no-tracking-without-consent'],
  },
];

describe('analytics pair — vendor surface', () => {
  it.each(VENDORS)('$shape → $owner', ({ code, owner }) => {
    expect(reportingRules(code)).toEqual([...owner].sort());
  });
});

/**
 * Shapes that must stay silent — the substring false positives this pair
 * shipped, and the correct remediations.
 */
const SILENT: ReadonlyArray<{ shape: string; code: string }> = [
  {
    shape: 'microphone is not a phone',
    code: "if (hasConsent) { analytics.track('device', { microphoneEnabled: true }); }",
  },
  {
    shape: 'a job queue that happens to have a track method',
    code: "player.track('signup', { email: user.email });",
  },
  {
    shape: 'the consent gate as an early return',
    code: "function send(u) { if (!hasConsent) return; analytics.track('signup', { plan: u.plan }); }",
  },
  {
    shape: 'hashed identifier — the correct PII remediation',
    code: "if (cookieConsent.analytics) { analytics.track('signup', { userHash: sha256(user.email) }); }",
  },
];

describe('analytics pair — shapes that must stay silent', () => {
  it.each(SILENT)('$shape', ({ code }) => {
    expect(reportingRules(code)).toEqual([]);
  });
});

/**
 * What word boundaries do NOT fix — recorded as a passing assertion rather
 * than quietly dropped.
 *
 * `addressBarHidden` contains `address` as a genuine whole word. The match is
 * correct and the CONCLUSION is wrong, exactly as `@interlace/eslint-devkit`'s
 * own `identifier-words.test.ts` records for `contractAddress`. The tempting
 * move is to drop `address` from the vocabulary, which would silence
 * `{ address: user.shippingAddress }` — the single most common PII payload
 * field there is. There is no string operation that separates a postal address
 * from a browser chrome flag, so the escape hatch is `sensitiveFields`, which
 * is why this rule now has one.
 */
describe('analytics pair — the known limit of a name test', () => {
  it('reports addressBarHidden, and the fix is configuration, not a wider splitter', () => {
    expect(
      reportingRules("if (hasConsent) { analytics.track('ui', { addressBarHidden: true }); }"),
    ).toEqual(['no-sensitive-data-in-analytics']);
  });
});

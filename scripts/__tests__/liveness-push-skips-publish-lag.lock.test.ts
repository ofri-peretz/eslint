/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A push to main must not check publish lag.
 *
 * `release-liveness.yml` triggers on `.changeset/**` and
 * `packages/*​/package.json`. A Version PR merge touches both: it deletes the
 * changesets it consumed and bumps every version. So the push fires on the
 * release commit itself — the one moment npm is legitimately behind main — and
 * every package reports `unpublished-bump`.
 *
 * That is not a stall. It is a release in progress. On 2026-09-01 it fired on
 * all three push runs (07:12, 12:25, 12:41) and filed #791 and #795 while the
 * pipeline was healthy; the schedule runs at 11:11, 16:08 and 20:37 all passed,
 * because by then the publish had finished.
 *
 * A check that cries wolf on every single release is one people mute, and a
 * muted check is worth less than no check. That is the failure this script was
 * written to prevent, so it must not be the failure the script performs.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const ROOT = resolve(__dirname, '..', '..');
const WF = resolve(ROOT, '.github/workflows/release-liveness.yml');

describe('the push-triggered liveness run skips publish lag', () => {
  const doc = parse(readFileSync(WF, 'utf8')) as {
    on?: Record<string, unknown>;
    true?: Record<string, unknown>;
    jobs?: Record<string, { steps?: Array<Record<string, unknown>> }>;
  };
  // `on:` parses as the boolean key `true` in YAML 1.1.
  const triggers = (doc.on ?? doc.true) as Record<string, unknown> | undefined;

  const step = Object.values(doc.jobs ?? {})
    .flatMap((j) => j?.steps ?? [])
    .find(
      (s) =>
        typeof s.run === 'string' && s.run.includes('check-release-liveness'),
    );

  it('guards the flag on the push event', () => {
    expect(step, 'no step runs check-release-liveness.ts').toBeDefined();
    const run = String(step?.run ?? '');

    // If the push trigger is gone the race is gone too — that is a valid way
    // to satisfy this, so only require the flag while the trigger exists.
    if (!triggers || !('push' in triggers)) return;

    expect(
      run,
      'release-liveness.yml still triggers on push but does not pass ' +
        '--skip-publish-lag. A Version PR merge fires that push on the release ' +
        'commit, where npm is legitimately behind main, so every package will ' +
        'report unpublished-bump and file an issue against a healthy pipeline.',
    ).toContain('--skip-publish-lag');

    expect(
      run,
      'the flag must be conditional on the event — the six-hourly run is the ' +
        'one that owns publish lag, and passing it unconditionally would ' +
        'switch that half off entirely.',
    ).toContain('github.event_name');
  });
});

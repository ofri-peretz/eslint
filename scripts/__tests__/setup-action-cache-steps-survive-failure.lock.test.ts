/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * @provenBy {"file":".github/actions/setup/action.yml","find":"      continue-on-error: true\n      uses: rharkor/caching-for-turbo@2238fae6eb9a9936f92356f54cb3660200d105e7 # v2.5.1\n","replace":"      uses: rharkor/caching-for-turbo@2238fae6eb9a9936f92356f54cb3660200d105e7 # v2.5.1\n"}
 */

/**
 * #1353 — "main is red" — traced to the "Turborepo remote cache (GitHub
 * Actions backend — no token)" step in `.github/actions/setup/action.yml`.
 * GitHub's archive host failed one download of that step's pinned
 * `rharkor/caching-for-turbo` SHA ("An action could not be found at the
 * URI ... Failed to download archive"), and because the step carried no
 * `continue-on-error`, the whole job died before Typecheck ever ran —
 * `quality-full.yml` run 41637704925, job "Typecheck (whole-graph tsgo)".
 *
 * This step only warms a best-effort cache: a miss costs minutes, not
 * correctness. Its sibling step two lines above it — the Vercel OIDC
 * exchange — already carries `continue-on-error: true` with exactly this
 * reasoning ("must fall through to the Actions-backed cache below rather
 * than fail a PR"). The GitHub-Actions-backend step was the one case that
 * reasoning did not reach, and a transient host hiccup turned main red for
 * a cache miss rather than a real defect.
 *
 * Locks the property, not the one SHA: any step in this file that only
 * exists to warm or restore a cache must survive its own failure.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';

type Step = {
  name?: string;
  if?: string;
  uses?: string;
  run?: string;
  'continue-on-error'?: boolean;
};

const ROOT = resolve(__dirname, '../..');
const ACTION_PATH = join(ROOT, '.github/actions/setup/action.yml');
const doc = parse(readFileSync(ACTION_PATH, 'utf-8')) as {
  runs: { steps: Step[] };
};
const steps = doc.runs.steps;

// Every step whose job is ONLY to populate a cache — never a step that also
// does required work (e.g. `npm ci`, which must still fail the job on a real
// install error).
const CACHE_WARMING_STEP_NAMES = [
  'Exchange the GitHub OIDC token for a Turborepo cache token',
  'Turborepo remote cache (GitHub Actions backend — no token)',
];

describe('setup/action.yml cache-warming steps survive their own failure', () => {
  it('every named cache-warming step is still present', () => {
    const present = new Set(steps.map((s) => s.name).filter(Boolean));
    for (const name of CACHE_WARMING_STEP_NAMES) {
      expect(
        present.has(name),
        `"${name}" is gone from action.yml. If it was renamed, rename it here too.`,
      ).toBe(true);
    }
  });

  it.each(CACHE_WARMING_STEP_NAMES)(
    '%s carries continue-on-error: true',
    (name) => {
      const step = steps.find((s) => s.name === name);
      expect(step, `"${name}" not found`).toBeDefined();
      expect(
        step!['continue-on-error'],
        `"${name}" only warms a best-effort cache. Without continue-on-error, ` +
          'a transient failure of this step (a GitHub Actions outage, a ' +
          'momentarily unreachable action host, ...) kills every job built on ' +
          '`setup`, turning main red for a cache miss rather than a real defect.',
      ).toBe(true);
    },
  );
});

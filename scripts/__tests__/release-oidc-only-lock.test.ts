/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @provenBy {"file":".github/workflows/release.yml","find":"id-token: write # for npm Trusted Publishers (OIDC)","replace":"id-token: read"}
 *
 * Lock: npm publishing is OIDC Trusted Publishing only (#1213).
 *
 * Every package publishes through Trusted Publishing. A new package name is
 * claimed by hand with an empty `0.0.0-stage` publish and its Trusted Publisher
 * configured before release.yml ever publishes it, so the long-lived
 * `NPM_TOKEN` fallback for first releases had nothing left to do. It was also
 * the only thing the weekly `npm-token-health.yml` check watched, and that
 * check filed an issue every week for a token no release used.
 *
 * If a token fallback comes back, so does a 90-day expiry somebody has to
 * rotate and a health check to watch it. Re-adding one is a decision, not a
 * drift, so it has to come with a change to this lock.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const WORKFLOWS = join(ROOT, '.github', 'workflows');

function code(file: string): string {
  return readFileSync(join(WORKFLOWS, file), 'utf-8')
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
}

describe('npm publishing is OIDC-only', () => {
  it('release.yml reads no npm token secret', () => {
    const release = code('release.yml');
    expect(release).not.toMatch(/secrets\.NPM_TOKEN/);
    expect(release).not.toMatch(/NODE_AUTH_TOKEN\s*:/);
  });

  it('release.yml publish job still requests the OIDC token', () => {
    expect(code('release.yml')).toMatch(/id-token:\s*write/);
  });

  it('no workflow reads secrets.NPM_TOKEN', () => {
    const readers = readdirSync(WORKFLOWS)
      .filter((f) => /\.ya?ml$/.test(f))
      .filter((f) => /secrets\.NPM_TOKEN/.test(code(f)));
    expect(readers).toEqual([]);
  });

  it('the npm token health check is gone with the token', () => {
    expect(existsSync(join(WORKFLOWS, 'npm-token-health.yml'))).toBe(false);
  });
});

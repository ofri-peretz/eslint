/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — the eval corpus stays well-formed and stays useful.
 *
 * Layer 2 of the evals costs an API call per case, so a malformed case is a silent
 * waste rather than a loud error: it would run, produce output, and grade against
 * nothing. These checks are the cheap part that makes the expensive part worth doing.
 *
 * The `why` field is required on purpose. The playbook asks that every production
 * incident earns an eval, written by whoever owned it — and a case whose author
 * cannot say which incident it came from is a case nobody will be able to judge when
 * it starts failing in six months.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const CASES_DIR = join(REPO_ROOT, 'evals/cases');
const CHECKS = new Set(['output-contains', 'output-omits', 'shell']);

const files = existsSync(CASES_DIR)
  ? readdirSync(CASES_DIR).filter((f) => f.endsWith('.json')).sort()
  : [];

describe('eval cases', () => {
  it('carries a corpus worth running', () => {
    // The playbook asks for 20 to 50 real tasks. Below that the pass rate is too
    // coarse to notice a configuration change making things slightly worse.
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  it('has no duplicate ids — the id keys the historical comparison', () => {
    const ids = files.map((f) => JSON.parse(readFileSync(join(CASES_DIR, f), 'utf-8')).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(files)('%s is well-formed', (file) => {
    const c = JSON.parse(readFileSync(join(CASES_DIR, file), 'utf-8'));

    expect(c.id, 'id must match the filename, so a failure names its file').toBe(
      file.replace('.json', ''),
    );
    expect(typeof c.prompt === 'string' && c.prompt.length > 20, 'prompt is too thin').toBe(true);
    expect(
      typeof c.why === 'string' && c.why.length > 40,
      'every case records the incident or rule it defends',
    ).toBe(true);

    expect(Array.isArray(c.expect) && c.expect.length > 0, 'a case with no expectation grades nothing').toBe(true);
    for (const e of c.expect) {
      expect(CHECKS, `unknown check "${e.check}"`).toContain(e.check);
      expect(typeof e.value === 'string' && e.value.length > 0).toBe(true);
    }

    // A prompt that contains its own answer tests the prompt, not the configuration.
    // Matched on a word boundary: `no` appearing inside `not` or `nothing` is not a
    // giveaway, and treating it as one blocks perfectly good cases.
    for (const e of c.expect) {
      if (e.check !== 'output-contains') continue;
      const boundary = new RegExp(`\\b${e.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      expect(
        boundary.test(c.prompt),
        `prompt gives away the expected answer "${e.value}"`,
      ).toBe(false);
    }
  });
});

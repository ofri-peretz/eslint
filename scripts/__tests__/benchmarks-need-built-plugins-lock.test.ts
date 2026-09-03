/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A job that runs a benchmark builds the plugins first.
 *
 * Every benchmark config imports plugins by package name, and that resolves
 * through `exports` to `dist/`. A job that only runs `npm ci` has no `dist/`,
 * so the first config to load dies with
 *
 *   Cannot find module '.../eslint-plugin-secure-coding/dist/src/index.js'
 *
 * `eslint-version-matrix.yml` did exactly that and failed every scheduled run
 * from 2026-08-29. The failure is loud in the log but the workflow is weekly,
 * so it sat for five days.
 *
 * `npm ci` is not enough and never will be: installing a workspace links the
 * package directory, it does not compile it. The distinction is invisible in
 * the workflow file, which is why it belongs in a lock rather than a comment.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKFLOWS = resolve(__dirname, '..', '..', '.github/workflows');

/** Scripts that load a benchmark config and therefore need built plugins. */
const NEEDS_DIST = /npm run (--silent )?(-w \S+ )?(ilb:|bench)/;

/** Any step that produces dist/ for the plugin packages. */
const BUILDS = /turbo run build|npm run build|run: npx turbo build/;

type Job = { file: string; id: string; body: string };

function benchmarkJobs(): Job[] {
  const out: Job[] = [];
  for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
    const src = readFileSync(join(WORKFLOWS, file), 'utf8');
    const at = src.indexOf('\njobs:');
    if (at === -1) continue;
    const body = src.slice(at);
    const heads = [...body.matchAll(/^ {2}([A-Za-z0-9_-]+):[ \t]*$/gm)];
    heads.forEach((h, i) => {
      const raw = body.slice(h.index!, heads[i + 1]?.index ?? body.length);
      // Comments quote the very commands this looks for, so strip them —
      // a lock satisfied by its own documentation is not a lock.
      const seg = raw
        .split('\n')
        .filter((l) => !/^\s*#/.test(l))
        .join('\n');
      if (NEEDS_DIST.test(seg)) out.push({ file, id: h[1], body: seg });
    });
  }
  return out;
}

describe('benchmark jobs build the plugins they load', () => {
  const jobs = benchmarkJobs();

  it('finds jobs that run a benchmark', () => {
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('each builds dist/ before running one', () => {
    const unbuilt = jobs
      .filter((j) => !BUILDS.test(j.body))
      .map((j) => `${j.file} job \`${j.id}\``);

    expect(
      unbuilt,
      'benchmark configs import plugins by package name and resolve to dist/; ' +
        '`npm ci` links a workspace but never compiles it, so the run dies on ' +
        'the first config with "Cannot find module .../dist/src/index.js"',
    ).toEqual([]);
  });
});

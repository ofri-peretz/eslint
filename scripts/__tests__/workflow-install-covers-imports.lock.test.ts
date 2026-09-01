/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A job that skips `npm ci` must not run a script that imports from
 * `node_modules`.
 *
 * `release-liveness.yml` set `install: "false"` with a comment explaining why
 * it was safe: "the script uses git, gh and `npm view` only. Nothing is
 * imported from the workspace." True when written. It stopped being true the
 * moment `check-release-liveness.ts` gained `@changesets/parse` — needed
 * because a regex over changeset frontmatter rejects valid YAML that changesets
 * itself accepts.
 *
 * The comment stayed. On 2026-09-01 the script died on ERR_MODULE_NOT_FOUND in
 * 0.1 seconds, its `if: failure()` reporter fired, and it filed "Release
 * pipeline is stalled" against a healthy pipeline (#791). A six-hourly check
 * that cries wolf gets muted, and a muted check is worth less than no check —
 * the precise failure that script exists to prevent, reproduced inside it.
 *
 * The rule is mechanical, so it is checked mechanically rather than left to a
 * comment somebody has to remember to update.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse } from 'yaml';

const ROOT = resolve(__dirname, '..', '..');
const WORKFLOWS = join(ROOT, '.github/workflows');

/** Bare import specifiers — the ones that need `node_modules` to exist. */
function bareImports(scriptPath: string): string[] {
  const src = readFileSync(scriptPath, 'utf8');
  return [...src.matchAll(/^\s*import\s[^'"]*from\s+['"]([^'"]+)['"]/gm)]
    .map((m) => m[1])
    .filter((spec) => !spec.startsWith('node:') && !spec.startsWith('.'));
}

/** Script files a `run:` block executes, as repo-relative paths. */
function scriptsInvokedBy(run: string): string[] {
  return [...run.matchAll(/(scripts\/[\w./-]+\.[cm]?ts)/g)].map((m) => m[1]);
}

describe('a job that skips install runs nothing that needs node_modules', () => {
  const files = readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'));

  it.each(files)('%s', (file) => {
    const doc = parse(readFileSync(join(WORKFLOWS, file), 'utf8')) as {
      jobs?: Record<string, { steps?: Array<Record<string, unknown>> }>;
    };

    for (const [jobId, job] of Object.entries(doc?.jobs ?? {})) {
      const steps = job?.steps ?? [];

      const skipsInstall = steps.some(
        (s) =>
          typeof s.uses === 'string' &&
          s.uses.includes('.github/actions/setup') &&
          String((s.with as Record<string, unknown>)?.install ?? '') === 'false',
      );
      if (!skipsInstall) continue;

      for (const step of steps) {
        if (typeof step.run !== 'string') continue;
        for (const rel of scriptsInvokedBy(step.run)) {
          const abs = join(ROOT, rel);
          if (!existsSync(abs)) continue;
          const needs = bareImports(abs);
          expect(
            needs,
            `${file} job "${jobId}" sets install: false but runs ${rel}, which ` +
              `imports ${needs.join(', ')} from node_modules. It will die on ` +
              `ERR_MODULE_NOT_FOUND — and if the job has a failure reporter, ` +
              `that crash is indistinguishable from the condition it reports.`,
          ).toEqual([]);
        }
      }
    }
  });
});

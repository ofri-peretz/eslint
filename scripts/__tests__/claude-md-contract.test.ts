/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `CLAUDE.md` is the onboarding document for every agent that touches this
 * repo. This asserts the things it states as fact are still facts.
 *
 * Stage 3 of `AI_SDLC.md` — institutional knowledge. The gates in that stage
 * check the CODE; nothing checked whether the document describing how the repo
 * works still described this repo.
 *
 * ## What it was wrong about
 *
 * It listed six required checks. **Five of the six names had never existed as
 * job names**: `Prettier (format check)`, `TypeScript (typecheck)`,
 * `Vitest (unit + lock tests)`, `Playwright (e2e + a11y)`, `Build (apps/docs)`.
 * The real jobs are spelled `Typecheck (whole-graph tsgo)`,
 * `Unit Tests + Coverage (N/10)`, `Build (N/4)`, `axe-core strict scan`.
 *
 * An agent polling for `Playwright (e2e + a11y)` waits for something that
 * cannot arrive — the same failure as the `.state` bug in the poll loop, from
 * the other direction. And `Quality (Full) Gate`, which branch protection
 * actually requires, was not in the list at all.
 *
 * ## Why job names and not the live API
 *
 * Branch protection is a network read and would make this test flaky and
 * unrunnable offline. Job names are in the repo, so drift between the document
 * and the workflows is catchable statically — which covers the case that
 * actually occurred. The live list is checked on a schedule instead, where a
 * network call is free to be slow.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const DOC = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
const SCRIPTS: Record<string, string> = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8'),
).scripts;

/** Every `name:` a workflow job declares, at job indentation. */
function workflowJobNames(): Set<string> {
  const dir = join(ROOT, '.github', 'workflows');
  const names = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    const text = readFileSync(join(dir, file), 'utf8');
    for (const match of text.matchAll(/^ {4}name:\s*(.+)$/gm)) {
      names.add(match[1].trim().replace(/^['"]|['"]$/g, ''));
    }
  }
  return names;
}

/** The check names CLAUDE.md presents as the required set. */
function documentedChecks(): string[] {
  const from = DOC.indexOf('Branch protection requires exactly two contexts');
  expect(
    from,
    'CLAUDE.md no longer states which contexts branch protection requires',
  ).toBeGreaterThan(-1);
  const block = /```text\n([\s\S]*?)```/.exec(DOC.slice(from));
  expect(
    block,
    'no ```text block after the branch-protection statement',
  ).not.toBeNull();
  return block![1]
    .split('\n')
    .map((line) => line.split('—')[0].trim())
    .filter(Boolean);
}

describe('CLAUDE.md describes checks that exist', () => {
  it('every check it presents as required is a real workflow job', () => {
    const jobs = workflowJobNames();
    const ghosts = documentedChecks().filter((c) => !jobs.has(c));
    expect(
      ghosts,
      'CLAUDE.md names these as required checks and no workflow declares a ' +
        'job by that name. An agent polling for one waits forever.',
    ).toEqual([]);
  });

  it('names the heavy gate, which is the one that blocks', () => {
    // Its absence was the expensive half of the drift: the list named five
    // jobs that do not exist and omitted the one that does the blocking.
    expect(documentedChecks()).toContain('Quality (Full) Gate');
  });

  it('says the heavy gate is skipped on a draft PR', () => {
    // `pull_request: types: [ready_for_review, labeled, synchronize]`. Without
    // this sentence the symptom is a PR that sits BLOCKED with every visible
    // check green and nothing to click.
    const section = DOC.slice(DOC.indexOf('Quality (Full) Gate'));
    expect(section).toMatch(/draft/i);
    expect(section).toContain('run-full-ci');
  });
});

describe('CLAUDE.md explains what happens after a merge', () => {
  // The heavy gate is PR-scoped for cost, so post-merge behaviour is the part
  // a reader cannot infer from the PR checks in front of them — and it is the
  // part that decides how long a broken main stays broken.
  it('says the heavy gate also runs on push to main', () => {
    const section = DOC.slice(DOC.indexOf('### After the merge'));
    expect(
      section.length,
      'CLAUDE.md has no "After the merge" section',
    ).toBeGreaterThan(0);
    expect(section).toMatch(/push to `main`/);
  });

  it('names the issue a broken main opens', () => {
    // A signal nobody can search for is not a signal. The title is the
    // deduplication key in .github/actions/report-failure, so it is a fact
    // about the system, not a turn of phrase.
    const section = DOC.slice(DOC.indexOf('### After the merge'));
    expect(section).toContain('main is red');
  });

  it('the workflow actually reports on push, not only on schedule', () => {
    // The documentation above is worth nothing if the channel is missing. This
    // was the whole gap: `push: [main]` shipped without a failure report, so
    // immediate detection produced a red square nobody was told about.
    const workflow = readFileSync(
      join(ROOT, '.github', 'workflows', 'quality-full.yml'),
      'utf8',
    );
    expect(workflow).toMatch(/github\.event_name == 'push'/);
    expect(workflow).toContain('main is red');
  });
});

describe('CLAUDE.md points at things that are there', () => {
  it('every lock test it cites exists', () => {
    // The "Tested locks in this repo (extend, don't bypass)" section is a
    // reading list. A dead entry sends someone looking for a pattern that was
    // deleted, and teaches them the wrong lesson about what is enforced.
    const cited = [
      ...new Set(
        [...DOC.matchAll(/`([A-Za-z0-9_/.-]+\.test\.tsx?)`/g)]
          .map((m) => m[1])
          .filter((f) => f.includes('/')),
      ),
    ];
    expect(cited.length).toBeGreaterThan(0);

    const missing = cited.filter((f) => {
      // Cited relative to their app, e.g. `src/__tests__/homepage-lock.test.tsx`.
      const candidates = [
        f,
        join('apps/docs', f),
        join('apps/docs/src/__tests__', f),
      ];
      return !candidates.some((c) => existsSync(join(ROOT, c)));
    });
    expect(
      missing,
      'CLAUDE.md cites these lock tests; they are not in the repo.',
    ).toEqual([]);
  });

  it('every npm script it tells you to run exists', () => {
    const invoked = [
      ...new Set(
        [...DOC.matchAll(/`npm run ([a-z0-9:_-]+)`/g)].map((m) => m[1]),
      ),
    ];
    const missing = invoked.filter((s) => !(s in SCRIPTS));
    expect(
      missing,
      'CLAUDE.md tells the reader to run these and package.json has no such script.',
    ).toEqual([]);
  });

  it('every workflow file it names exists', () => {
    const named = [
      ...new Set([...DOC.matchAll(/`([a-z0-9-]+\.ya?ml)`/g)].map((m) => m[1])),
    ];
    expect(named.length).toBeGreaterThan(0);

    const missing = named.filter(
      (f) =>
        !existsSync(join(ROOT, '.github', 'workflows', f)) &&
        !existsSync(join(ROOT, f)),
    );
    expect(
      missing,
      'CLAUDE.md names these workflows and they do not exist.',
    ).toEqual([]);
  });
});

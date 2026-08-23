#!/usr/bin/env tsx

/**
 * check-changeset-coverage.ts — "does this branch need a changeset?", asked
 * against what actually ships.
 *
 * ## Why not `changeset status`
 *
 * `changeset status --since=origin/main` marks a package as needing a
 * changeset when **any file under its directory** differs from the base. That
 * includes `CHANGELOG.md` — so editing a changelog demands a changeset, which
 * when consumed edits the changelog again. The rule is circular, and it fires
 * on exactly the maintenance work least likely to need a release: changelog
 * repair, README syncs, test-only changes, fixture updates.
 *
 * `changesets-pr.yml` already worked around this with its own inline git diff
 * against `packages/[^/]+/(src|package\.json)`. That logic was correct and
 * invisible — it lived in a YAML `run:` block, so the pre-push hook kept using
 * the over-eager `changeset status` and disagreed with CI about whether the
 * same branch was releasable. This script is that rule, extracted, so both
 * callers share one definition.
 *
 * ## The rule
 *
 * A changeset is needed when a diff touches something a consumer can observe:
 *
 *   - `packages/<name>/src/**`      — rule behaviour, exports, types
 *   - `packages/<name>/package.json` — version, peers, exports map, files
 *   - `apps/<name>/src/**`           — deployed app behaviour
 *   - `apps/<name>/package.json`
 *
 * Everything else — CHANGELOG.md, README.md, tests, fixtures, configs, docs,
 * workflows, scripts — is invisible to a consumer and needs no release entry.
 *
 * ## Exit codes
 *
 * 0 when covered, not needed, or opted out; 1 only with `--strict`. The gate
 * is advisory by design: a missing changeset is a judgement call the author
 * makes, not a correctness failure a machine can decide. It should be loud,
 * and it should never be the reason a branch cannot be pushed.
 *
 * Usage:
 *   tsx scripts/check-changeset-coverage.ts [--since=origin/main] [--strict] [--json]
 */

import { execFileSync } from 'node:child_process';
import process from 'node:process';

/** Paths whose change is observable by someone installing or visiting. */
const RELEASE_RELEVANT = /^(packages|apps)\/[^/]+\/(src\/|package\.json$)/;

/** A real changeset file — not the config or the directory's own README. */
const CHANGESET_FILE = /^\.changeset\/(?!README\.md$|config\.json$)[^/]+\.md$/;

function arg(flag: string): string | undefined {
  const found = process.argv.slice(2).find((a) => a.startsWith(`${flag}=`));
  return found ? found.slice(flag.length + 1) : undefined;
}

const STRICT = process.argv.includes('--strict');
const JSON_OUT = process.argv.includes('--json');
const BASE = arg('--since') ?? 'origin/main';

function git(args: string[]): string {
  try {
    // GIT_DIR leaks in from lefthook and would point at the wrong repo.
    const env = { ...process.env };
    delete env.GIT_DIR;
    return execFileSync('git', args, {
      encoding: 'utf8',
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Merge-base diff, so a branch is judged on its own commits rather than on
 * whatever landed on main since it was cut.
 */
const mergeBase = git(['merge-base', BASE, 'HEAD']) || BASE;
const changed = git(['diff', '--name-only', `${mergeBase}...HEAD`])
  .split('\n')
  .filter(Boolean);

// Only *added* changeset files count. An edit to an existing one is a reword,
// not new release intent — and it is already covered by its own PR.
const addedChangesets = git([
  'diff',
  '--name-only',
  '--diff-filter=A',
  `${mergeBase}...HEAD`,
])
  .split('\n')
  .filter((f) => CHANGESET_FILE.test(f));

const releaseRelevant = changed.filter((f) => RELEASE_RELEVANT.test(f));

const status =
  addedChangesets.length > 0
    ? 'present'
    : releaseRelevant.length === 0
      ? 'not-needed'
      : 'missing';

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      { status, base: mergeBase, releaseRelevant, addedChangesets },
      null,
      2,
    ),
  );
  process.exit(status === 'missing' && STRICT ? 1 : 0);
}

switch (status) {
  case 'present':
    console.log(`✅ Changeset present: ${addedChangesets.join(', ')}`);
    break;

  case 'not-needed':
    console.log(
      `✅ No changeset needed — nothing consumer-visible changed vs ${BASE}.`,
    );
    if (changed.length > 0) {
      console.log(
        `   (${changed.length} file(s) changed, none under packages|apps/*/src or package.json)`,
      );
    }
    break;

  case 'missing': {
    const workspaces = [
      ...new Set(
        releaseRelevant.map((f) => f.split('/').slice(0, 2).join('/')),
      ),
    ];
    console.warn(
      `⚠️  Consumer-visible changes with no changeset in: ${workspaces.join(', ')}`,
    );
    console.warn('');
    console.warn(
      '   Add one with `npm run changeset` (see .changeset/README.md for the summary',
    );
    console.warn(
      '   format), or add the `skip-changeset` label if this is internal-only.',
    );
    if (STRICT) process.exit(1);
    break;
  }
}

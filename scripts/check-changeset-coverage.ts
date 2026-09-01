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
import { readFileSync } from 'node:fs';

import parseChangesetModule from '@changesets/parse';

const parseChangeset = ((
  parseChangesetModule as unknown as { default?: typeof parseChangesetModule }
).default ?? parseChangesetModule) as (raw: string) => {
  releases: Array<{ name: string; type: string }>;
};
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
  // GIT_DIR leaks in from lefthook and would point at the wrong repo.
  const env = { ...process.env };
  delete env.GIT_DIR;
  return execFileSync('git', args, {
    encoding: 'utf8',
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Abort rather than guess.
 *
 * An earlier version swallowed every git error and returned `''`. An
 * unreachable base (a shallow clone, a missing `origin/main`, a detached CI
 * checkout) then produced an empty diff, which this script reads as "nothing
 * consumer-visible changed" and reports as a clean pass. A gate that answers
 * "fine" when it could not look is worse than no gate: it is indistinguishable
 * from a real pass, so nobody investigates.
 */
function fail(message: string): never {
  console.error(`❌ ${message}`);
  console.error(
    '   Cannot determine what this branch changed, so coverage cannot be judged.',
  );
  console.error(
    `   Try \`git fetch origin ${BASE.replace(/^origin\//, '')}\`.`,
  );
  process.exit(1);
}

/**
 * Merge-base diff, so a branch is judged on its own commits rather than on
 * whatever landed on main since it was cut.
 */
let mergeBase: string;
let changedRaw: string;
let addedRaw: string;
try {
  mergeBase = git(['merge-base', BASE, 'HEAD']);
  changedRaw = git(['diff', '--name-only', `${mergeBase}...HEAD`]);
  addedRaw = git([
    'diff',
    '--name-only',
    '--diff-filter=A',
    `${mergeBase}...HEAD`,
  ]);
} catch (error) {
  fail(`git failed: ${(error as Error).message.split('\n')[0]}`);
}

if (!mergeBase) fail(`No merge base between ${BASE} and HEAD.`);

const changed = changedRaw.split('\n').filter(Boolean);

// Only *added* changeset files count. An edit to an existing one is a reword,
// not new release intent — and it is already covered by its own PR.
//
// And only files that actually declare a release: an empty changeset
// (`---\n---\n`) is a valid "this diff needs no release" marker, so counting
// it as coverage would let it silently vouch for a `packages/*/src` change it
// says nothing about — producing no version bump and no changelog entry, which
// is the exact outcome the gate exists to catch.
const addedChangesets = addedRaw
  .split('\n')
  .filter((f) => CHANGESET_FILE.test(f))
  .filter((f) => {
    try {
      // changesets' own parser: a regex over the frontmatter rejected valid
      // YAML that changesets accepts (a quoted bump), which would report a
      // real changeset as missing coverage.
      return parseChangeset(readFileSync(f, 'utf8')).releases.length > 0;
    } catch {
      // Unparseable, or deleted before we looked — it vouches for nothing.
      return false;
    }
  });

/**
 * Fields in a package.json a consumer can actually observe after `npm i`.
 *
 * `RELEASE_RELEVANT` matches the whole file, which treats every byte of
 * package.json as shippable. It is not: `scripts` and `devDependencies` are
 * build-time only, and a repo-wide script edit (tsc -> tsgo across 33
 * manifests, say) would demand a changeset per package while changing nothing
 * a consumer can see. A gate that fires on work like that trains people to
 * bypass it, which is how the rule ends up enforced nowhere.
 */
const CONSUMER_FIELDS = [
  'name',
  'version',
  'type',
  'main',
  'module',
  'types',
  'typings',
  'exports',
  'bin',
  'files',
  'browser',
  'engines',
  'sideEffects',
  'license',
  'dependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'optionalDependencies',
  'publishConfig',
];

/**
 * Did this package.json change anything shippable?
 *
 * Both sides are read from git at the same two commits the diff used, so this
 * answers the same question the diff asked. Anything unreadable or unparseable
 * returns true: an unanswerable question must not be reported as "no release
 * needed" -- that is the vacuous pass this whole script exists to avoid.
 */
function packageJsonAffectsConsumers(file: string): boolean {
  let before: Record<string, unknown>;
  let after: Record<string, unknown>;
  try {
    before = JSON.parse(git(['show', `${mergeBase}:${file}`]));
  } catch {
    return true; // new package, or absent at the base — shippable by definition
  }
  try {
    after = JSON.parse(git(['show', `HEAD:${file}`]));
  } catch {
    return true; // deleted or malformed — do not quietly excuse it
  }
  return CONSUMER_FIELDS.some(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]),
  );
}

const releaseRelevant = changed
  .filter((f) => RELEASE_RELEVANT.test(f))
  .filter(
    (f) => !f.endsWith('/package.json') || packageJsonAffectsConsumers(f),
  );

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
        `   (${changed.length} file(s) changed; any package.json among them ` +
          'touched only build-time fields such as scripts or devDependencies)',
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

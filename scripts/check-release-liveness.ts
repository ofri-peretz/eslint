/**
 * Is the release pipeline actually alive?
 *
 * On 2026-08-30 it was not, and nothing noticed. `changesets/action` errors
 * when a `GITHUB_TOKEN` env var is set and differs from its `github-token`
 * input; the step failed, so no Version Packages PR was opened, so no version
 * was ever bumped, so `release.yml` correctly published nothing. Every workflow
 * involved was green. **Ten changesets sat queued** until someone happened to
 * ask why a package had not shipped.
 *
 * That is the shape this checks for: not "did a step fail" — GitHub already
 * tells you that — but "did the pipeline produce the thing it exists to
 * produce". Two independent stalls, either of which is silent:
 *
 *   1. changesets exist on main, but no Version Packages PR is open. The
 *      author→PR half is stuck.
 *   2. a package's version on main is ahead of its latest on npm. The
 *      PR→publish half is stuck: the bump landed and the publish did not.
 *
 * Exits 1 on either, so a workflow can turn that into an issue. Read-only: it
 * queries git, the GitHub API and the npm registry, and writes nothing.
 *
 * Usage:
 *   npx tsx scripts/check-release-liveness.ts
 *   npx tsx scripts/check-release-liveness.ts --json
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import parseChangesetModule from '@changesets/parse';

const parseChangeset = ((
  parseChangesetModule as unknown as { default?: typeof parseChangesetModule }
).default ?? parseChangesetModule) as (raw: string) => {
  releases: Array<{ name: string; type: string }>;
};

/**
 * The repository being checked is the one you are standing in, not the one
 * this file happens to live in. Resolving it from the script's own path meant
 * running it anywhere else silently reported on this repo instead — an answer
 * about the wrong subject is worse than no answer. Falls back to the
 * script-relative root when cwd is not a work tree.
 */
function repoRoot(): string {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      timeout: 15_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
  }
}

const REPO_ROOT = repoRoot();
const JSON_OUT = process.argv.includes('--json');
const REPO = process.env.GITHUB_REPOSITORY ?? 'ofri-peretz/eslint';

type Finding = { kind: string; detail: string };
const findings: Finding[] = [];
const checked: string[] = [];

/**
 * Does this changeset actually queue a release?
 *
 * An empty changeset (`---\n---\n`) is this repo's deliberate "this diff needs
 * no release" marker -- see the same rule in check-changeset-coverage.ts. It is
 * not a queued release, and counting it as one makes every internal-only PR
 * look like a stalled pipeline, which is precisely the cry-wolf failure this
 * check exists to avoid becoming.
 *
 * Unreadable or unparseable counts as queued: an unanswerable question must
 * surface, not vanish.
 */
function declaresRelease(ref: string) {
  return (file: string): boolean => {
    try {
      const raw = execFileSync('git', ['show', `${ref}:${file}`], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        timeout: 15_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      return parseChangeset(raw).releases.length > 0;
    } catch {
      return true;
    }
  };
}

/**
 * Pending changesets — the `.md` files, not config or the readme.
 *
 * Read from `main`, not the working tree. A changeset on a feature branch is
 * not queued, it is unmerged: reading the checkout reports every in-flight
 * branch as a stalled pipeline. Falls back to the working tree only when main
 * is unresolvable (a shallow CI checkout), and says which source it used, so a
 * fallback answer is never mistaken for the authoritative one.
 */
function pendingChangesets(): { files: string[]; source: string } {
  for (const ref of ['origin/main', 'main']) {
    try {
      const listing = execFileSync('git', ['ls-tree', '--name-only', ref, '.changeset/'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        timeout: 15_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const candidates = listing
        .split('\n')
        .map((f) => f.trim())
        .filter(
          (f) =>
            f.endsWith('.md') &&
            path.basename(f).toLowerCase() !== 'readme.md',
        );

      return { files: candidates.filter(declaresRelease(ref)).map((f) => path.basename(f)), source: ref };
    } catch {
      continue; // ref not present in this checkout — try the next
    }
  }

  const dir = path.join(REPO_ROOT, '.changeset');
  if (!fs.existsSync(dir)) return { files: [], source: 'working tree (absent)' };
  return {
    files: fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md'),
    source: 'working tree (main unresolvable)',
  };
}

function gh(args: string[]): string {
  return execFileSync('gh', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 60_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

// ── 1. changesets queued, but no Version PR ──────────────────────────────
const { files: pending, source: pendingSource } = pendingChangesets();
try {
  const open = gh([
    'pr', 'list', '--repo', REPO, '--state', 'open',
    '--head', 'changeset-release/main', '--json', 'number', '--jq', 'length',
  ]);
  checked.push(
    `${pending.length} pending changeset(s) on ${pendingSource}, Version PR open: ${open !== '0'}`,
  );
  if (pending.length > 0 && open === '0')
    findings.push({
      kind: 'no-version-pr',
      detail:
        `${pending.length} changeset(s) are queued on main but no Version Packages PR is open. ` +
        'The changesets action is not producing one, so nothing will ever be versioned or published. ' +
        `Queued: ${pending.join(', ')}`,
    });
} catch (err) {
  // A failure to ASK is not a clean bill of health. Reported, not swallowed —
  // the whole point of this file is that silence was mistaken for success.
  findings.push({
    kind: 'query-failed',
    detail: `Could not list Version PRs: ${(err as Error).message.split('\n')[0]}`,
  });
}

// ── 2. version on main ahead of the registry ─────────────────────────────
//
// Only PUBLISHED packages, and only where npm answers. A package that has
// never been published (npm 404s) is the documented first-release path, not a
// stall — release.yml handles it and prints "🆕 first release".
const manifests = fs
  .readdirSync(path.join(REPO_ROOT, 'packages'))
  .map((d) => path.join(REPO_ROOT, 'packages', d, 'package.json'))
  .filter((p) => fs.existsSync(p));

let compared = 0;
for (const m of manifests) {
  const pkg = JSON.parse(fs.readFileSync(m, 'utf8')) as {
    name?: string;
    version?: string;
    private?: boolean;
  };
  if (!pkg.name || !pkg.version || pkg.private) continue;
  let latest: string;
  try {
    latest = execFileSync('npm', ['view', `${pkg.name}@latest`, 'version'], {
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    continue; // never published, or the registry is unreachable
  }
  if (!latest) continue;
  compared++;
  if (latest !== pkg.version)
    findings.push({
      kind: 'unpublished-bump',
      detail:
        `${pkg.name} is ${pkg.version} on main but ${latest} on npm. ` +
        'A version bump landed and the publish did not follow.',
    });
}
checked.push(`${compared} published package version(s) compared against npm`);

// A run that compared nothing proves nothing — the same silent-green failure
// this script exists to detect, reproduced inside the detector.
if (compared === 0 && pending.length === 0)
  findings.push({
    kind: 'nothing-checked',
    detail:
      'No changesets found and no package version could be compared against npm. ' +
      'This check verified nothing and must not be read as a pass.',
  });

if (JSON_OUT) {
  console.log(JSON.stringify({ checked, findings }, null, 2));
} else {
  for (const c of checked) console.log(`  ✓ ${c}`);
  for (const f of findings) console.error(`::error::[${f.kind}] ${f.detail}`);
  console.log(
    findings.length === 0
      ? '\n✅ Release pipeline is alive: nothing queued without a PR, nothing bumped without a publish.'
      : `\n❌ ${findings.length} release-pipeline stall(s).`,
  );
}

process.exit(findings.length > 0 ? 1 : 0);

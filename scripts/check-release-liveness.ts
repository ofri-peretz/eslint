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

const REPO_ROOT = path.resolve(
  path.dirname(url.fileURLToPath(import.meta.url)),
  '..',
);
const JSON_OUT = process.argv.includes('--json');
const REPO = process.env.GITHUB_REPOSITORY ?? 'ofri-peretz/eslint';

type Finding = { kind: string; detail: string };
const findings: Finding[] = [];
const checked: string[] = [];

/** Pending changesets — the `.md` files, not config or the readme. */
function pendingChangesets(): string[] {
  const dir = path.join(REPO_ROOT, '.changeset');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md');
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
const pending = pendingChangesets();
try {
  const open = gh([
    'pr', 'list', '--repo', REPO, '--state', 'open',
    '--head', 'changeset-release/main', '--json', 'number', '--jq', 'length',
  ]);
  checked.push(`${pending.length} pending changeset(s), Version PR open: ${open !== '0'}`);
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

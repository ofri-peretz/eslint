#!/usr/bin/env tsx

/**
 * sync-changelog.ts — build the data behind the `/changelog` page.
 *
 * ## Why a build-time sync rather than a runtime read
 *
 * Releases are already recorded in three places — the per-package
 * `CHANGELOG.md`, git tags, and GitHub Releases — and none of them is
 * reachable from a Next.js page at request time without an API token and a
 * rate-limit budget. The repo's established answer is a generated JSON in
 * `src/data/`, refreshed by `docs-data.yml` on every push to main that touches
 * `packages/**` — which is exactly when a changelog changes. This follows
 * `sync-plugin-stats.ts` and `build-rules-manifest.mts`.
 *
 * ## Where each field comes from
 *
 * - **entries** — parsed out of `CHANGELOG.md` with the same parser the
 *   release rollup uses (`scripts/release-notes.ts`), so the site and the
 *   GitHub Release can never describe one release differently. It reads both
 *   dialects: the badge format written since #660, and the
 *   `@changesets/changelog-github` entries that predate it.
 * - **date** — the release's **git tag**, which is the only place an accurate
 *   date exists. Changesets writes `## 1.4.1` with no date at all; only the
 *   legacy keep-a-changelog headings carry one, and those cover a small and
 *   shrinking share of releases. A changelog page whose primary axis is time
 *   cannot be built from the file alone.
 * - **kind counts** — derived, so the page can show "3 fixes, 1 feature"
 *   without shipping every entry to the client for a release nobody expands.
 *
 * Usage:
 *   tsx apps/docs/scripts/sync-changelog.ts            # write the JSON
 *   tsx apps/docs/scripts/sync-changelog.ts --check    # exit 1 if stale
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

import { bulletsForVersion, parseBullet } from '../../../scripts/release-notes';
import { writeJsonIfChanged } from './lib/write-json-if-changed.ts';

// `apps/docs` is ESM, so there is no `__dirname` to lean on.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const OUT_PATH = resolve(HERE, '..', 'src', 'data', 'changelog.json');
const WORKSPACE_ROOTS = ['packages', 'apps'];
const CHECK = process.argv.includes('--check');

/**
 * Releases older than this are omitted.
 *
 * The corpus is ~500 releases and grows every week; shipping all of them makes
 * a JSON nobody scrolls to the bottom of and a page that costs more to render
 * than it informs. Two years covers every version anyone is plausibly running.
 */
const OLDEST_YEAR = new Date().getUTCFullYear() - 2;

interface Entry {
  kind: string;
  title: string;
  /** PR number, when the entry carries one. Rendered as a link by the page. */
  pr: number | null;
}

interface Release {
  package: string;
  /** Unscoped display name — `@interlace/ui` reads as `ui` in a dense list. */
  short: string;
  version: string;
  /** ISO date from the git tag, or null when no tag exists (unreleased). */
  date: string | null;
  isApp: boolean;
  isPrivate: boolean;
  entries: Entry[];
}

function git(args: string[]): string {
  try {
    const env = { ...process.env };
    delete env.GIT_DIR;
    return execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * `<unscoped-name>@<version>` → ISO date, for every tag in the repo.
 *
 * Built in one `git for-each-ref` rather than a `git log` per release: there
 * are ~800 tags and ~500 releases, and spawning a process per lookup turned a
 * sub-second sync into a minute-long one.
 */
function tagDates(): Map<string, string> {
  const raw = git([
    'for-each-ref',
    '--format=%(refname:strip=2)\t%(creatordate:iso-strict)',
    'refs/tags',
  ]);

  const map = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const [tag, date] = line.split('\t');
    if (tag && date) map.set(tag, date);
  }
  return map;
}

/** Split a CHANGELOG into its `## <version>` headings, newest first. */
function versionHeadings(
  changelog: string,
): Array<{ version: string; headingDate: string | null }> {
  const out: Array<{ version: string; headingDate: string | null }> = [];

  for (const line of changelog.split('\n')) {
    if (!line.startsWith('## ')) continue;
    const match =
      /^##\s+(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:\s+—\s+(\d{4}-\d{2}-\d{2}))?/.exec(
        line,
      );
    if (match) out.push({ version: match[1], headingDate: match[2] ?? null });
  }
  return out;
}

function workspaceDirs(): string[] {
  const dirs: string[] = [];
  for (const root of WORKSPACE_ROOTS) {
    const rootPath = join(REPO_ROOT, root);
    if (!existsSync(rootPath)) continue;
    for (const entry of readdirSync(rootPath)) {
      const dir = join(rootPath, entry);
      if (existsSync(join(dir, 'package.json'))) dirs.push(dir);
    }
  }
  return dirs;
}

function collect(): Release[] {
  const dates = tagDates();
  const releases: Release[] = [];

  for (const dir of workspaceDirs()) {
    const changelogPath = join(dir, 'CHANGELOG.md');
    if (!existsSync(changelogPath)) continue;

    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      name?: string;
      private?: boolean;
    };
    if (!pkg.name) continue;

    const changelog = readFileSync(changelogPath, 'utf8');
    const short = pkg.name.replace(/^@[^/]+\//, '');
    const isApp = dir.includes(`${join('', 'apps')}`) || /\/apps\//.test(dir);

    for (const { version, headingDate } of versionHeadings(changelog)) {
      // Tag first: it is the moment the release actually happened. The heading
      // date is a hand-written fallback that only legacy sections carry.
      const tagged = dates.get(`${short}@${version}`);
      const date = tagged ?? (headingDate ? `${headingDate}T00:00:00Z` : null);

      if (date && new Date(date).getUTCFullYear() < OLDEST_YEAR) continue;

      const entries = bulletsForVersion(changelog, version)
        .map((bullet) => {
          const { kind, title, trailer } = parseBullet(bullet);
          const pr = /\[#(\d+)\]/.exec(trailer)?.[1];
          return { kind, title, pr: pr ? Number(pr) : null };
        })
        .filter((e) => e.title !== '');

      // A version with no entries at all is a bump with nothing to say —
      // usually an internal dependency roll. Listing it is noise on a page
      // whose job is to tell someone what changed.
      if (entries.length === 0) continue;

      releases.push({
        package: pkg.name,
        short,
        version,
        date,
        isApp,
        isPrivate: pkg.private === true,
        entries,
      });
    }
  }

  // Newest first; undated releases sort last rather than being dropped.
  return releases.sort((a, b) => {
    if (a.date && b.date) return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
    if (a.date) return -1;
    if (b.date) return 1;
    return a.package.localeCompare(b.package);
  });
}

const releases = collect();

const payload = {
  // Not a timestamp: a generated-at field changes on every run and makes the
  // `--check` gate fail for no reason, which trains people to ignore it.
  releaseCount: releases.length,
  packageCount: new Set(releases.map((r) => r.package)).size,
  entryCount: releases.reduce((n, r) => n + r.entries.length, 0),
  oldestYear: OLDEST_YEAR,
  releases,
};

// `writeJsonIfChanged`, not a bare `writeFileSync`: every generator under
// `src/data` routes through it so the on-disk bytes are byte-identical to what
// the helper would write, and a no-op sync leaves the file's mtime alone
// instead of churning a commit. Enforced by
// `src/__tests__/generated-data-write-lock.test.ts`.
if (CHECK) {
  const serialized = JSON.stringify(payload, null, 2);
  const existing = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, 'utf8') : '';

  if (serialized !== existing) {
    console.error('❌ changelog.json is stale.');
    console.error('   Run `npm run sync:changelog` and commit the result.');
    process.exit(1);
  }

  console.log(
    `✅ changelog.json is current — ${payload.releaseCount} releases across ${payload.packageCount} packages.`,
  );
  process.exit(0);
}

const wrote = writeJsonIfChanged(OUT_PATH, payload, 'changelog.json');
console.log(
  wrote
    ? `✍️  Wrote changelog.json — ${payload.releaseCount} releases, ${payload.entryCount} entries, ${payload.packageCount} packages.`
    : `✅ changelog.json is current — ${payload.releaseCount} releases across ${payload.packageCount} packages.`,
);

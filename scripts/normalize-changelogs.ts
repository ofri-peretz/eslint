#!/usr/bin/env tsx

/**
 * normalize-changelogs.ts — keep every CHANGELOG.md in a shape changesets can
 * safely prepend to, and re-sort the entries it already mangled.
 *
 * ## The bug this fixes
 *
 * `@changesets/apply-release-plan`'s `prependFile` decides where to insert a
 * new version entry with exactly this test, against the whole file:
 *
 *     const isVersionHeading = /^#{1,6}\s+\d+\.\d+/.test(fileData);
 *     if (isVersionHeading) newChangelog = data.trimStart() + fileData;
 *     else                  newChangelog = <first line> + data + <rest>;
 *
 * So a file starting with a bare `## 1.4.1` gets the new entry prepended
 * before everything (correct), and a file starting with a title line gets it
 * inserted immediately *after* that first line (also correct).
 *
 * Our legacy Keep-a-Changelog files started with `## [1.4.0] - 2026-05-03`.
 * The `[` sits where `\d` must be, so `isVersionHeading` is **false** — and
 * changesets treated that version heading as if it were the file's title,
 * inserting every subsequent release *below* it. The result, across 20 of
 * 22 packages:
 *
 *   - a stale legacy version permanently pinned to line 1, so the top of the
 *     file advertises the wrong "latest";
 *   - the `# Changelog` H1 buried mid-file (line 1264 in eslint-devkit);
 *   - version sections out of order across the legacy/changesets boundary.
 *
 * Nothing caught it because nothing asserted the file's shape.
 *
 * ## What this does
 *
 * 1. Hoists / replaces the H1 with `# <package name>` plus a canonical
 *    preamble — matching what changesets itself writes for a new file, so
 *    future prepends land in the right place forever.
 * 2. Rewrites legacy `## [1.2.3] - 2026-02-08` headings to
 *    `## 1.2.3 — 2026-02-08`. The version becomes parseable to both
 *    changesets and the sorter below; the release date, which is real
 *    information the changesets format drops, is preserved.
 * 3. Re-sorts every `## <version>` section by semver, descending. Sections
 *    with an unparseable heading (`## [Unreleased]`) are never dropped — they
 *    keep their relative order and lead the file, per Keep a Changelog.
 *
 * Idempotent: running it twice is a no-op, which is what makes `--check`
 * meaningful as a CI gate.
 *
 * Usage:
 *   tsx scripts/normalize-changelogs.ts            # rewrite in place
 *   tsx scripts/normalize-changelogs.ts --check    # exit 1 if any file drifts
 *
 * Wired into `changeset:version` (so a release can never re-introduce the
 * drift) and locked by `scripts/__tests__/changelog-format.test.ts`.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const CHECK = process.argv.includes('--check');
const WORKSPACE_ROOTS = ['packages', 'apps'];

interface Section {
  /** Heading line, e.g. `## 1.17.0`. */
  heading: string;
  /** Body lines, excluding the heading. */
  body: string[];
  /** Parsed semver, or null when the heading isn't a version. */
  version: { major: number; minor: number; patch: number; pre: string } | null;
  /** Original index, for a stable sort. */
  order: number;
}

/**
 * Parse `1.2.3`, `1.2.3-beta.1`. Returns null for anything else (e.g. an
 * `## [Unreleased]` heading, which must not be sorted into the version list).
 */
function parseVersion(raw: string) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(raw.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] ?? '',
  };
}

/** Descending semver. A prerelease sorts below its own release (SemVer §11). */
function compareVersions(
  a: NonNullable<Section['version']>,
  b: NonNullable<Section['version']>,
) {
  if (a.major !== b.major) return b.major - a.major;
  if (a.minor !== b.minor) return b.minor - a.minor;
  if (a.patch !== b.patch) return b.patch - a.patch;
  if (a.pre === b.pre) return 0;
  if (a.pre === '') return -1; // release before prerelease in a descending list
  if (b.pre === '') return 1;
  return -comparePrerelease(a.pre, b.pre); // negated: this list is descending
}

/**
 * SemVer §11.4 precedence for the prerelease tag, ascending.
 *
 * A plain string compare is wrong in the ordinary case, not an exotic one:
 * `'beta.11' < 'beta.2'` lexically, so a changelog with more than nine
 * prereleases in a series lists them in the wrong order — and a changelog
 * whose ordering cannot be trusted is worse than one with none, because a
 * reader takes the top entry to be the newest.
 *
 * The spec's rules: compare dot-separated identifiers left to right; numeric
 * identifiers compare numerically, non-numeric lexically, numeric always
 * ranks lower than non-numeric, and a shorter run of identifiers ranks lower
 * when all preceding ones are equal.
 */
function comparePrerelease(a: string, b: string): number {
  const left = a.split('.');
  const right = b.split('.');

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const l = left[i];
    const r = right[i];
    if (l === undefined) return -1;
    if (r === undefined) return 1;
    if (l === r) continue;

    const lNum = /^\d+$/.test(l);
    const rNum = /^\d+$/.test(r);
    if (lNum && rNum) return Number(l) - Number(r);
    if (lNum) return -1;
    if (rNum) return 1;
    return l < r ? -1 : 1;
  }
  return 0;
}

/**
 * Normalise one `## …` heading to `## <version>` or `## <version> — <date>`.
 *
 * Accepts the three dialects present in this repo:
 *   `## 1.17.0`                 (changesets)
 *   `## [1.4.0] - 2026-05-03`   (keep-a-changelog)
 *   `## 2.1.5 (2026-02-09)`     (release-please era)
 */
function normalizeHeading(heading: string): {
  heading: string;
  version: Section['version'];
} {
  const rest = heading.replace(/^##\s*/, '').trim();

  const dated =
    /^\[?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]?\s*[-–—(]\s*(\d{4}-\d{2}-\d{2})\)?\s*$/.exec(
      rest,
    );
  if (dated) {
    const version = parseVersion(dated[1]);
    return { heading: `## ${dated[1]} — ${dated[2]}`, version };
  }

  const bare = /^\[?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]?\s*$/.exec(rest);
  if (bare) {
    const version = parseVersion(bare[1]);
    return { heading: `## ${bare[1]}`, version };
  }

  // `## 3.2.0 (Unreleased)` — a version heading carrying a note. The version
  // still sorts; the note is kept verbatim because dropping it would silently
  // promote never-shipped content to "released".
  const annotated =
    /^\[?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]?\s*\(([^)]+)\)\s*$/.exec(rest);
  if (annotated) {
    const version = parseVersion(annotated[1]);
    return { heading: `## ${annotated[1]} (${annotated[2]})`, version };
  }

  return { heading, version: null };
}

/**
 * Boilerplate preamble lines, in every dialect this repo has produced.
 *
 * These must be recognised *anywhere* in the file, not just under the H1.
 * `changeset version` prepends a new `## <version>` section immediately below
 * the title, which pushes the preamble underneath it — the preamble is then no
 * longer adjacent to the H1, it is loose text inside the newest release
 * section, and a normaliser that only hoists what follows the H1 will keep it
 * there as though it were release content. It then appears verbatim in the
 * middle of that version's GitHub Release notes, and again below the next
 * release, and so on once per release forever.
 *
 * Matching the generated text directly is safe precisely because we generate
 * it: `preambleFor` below is the only thing that writes these lines.
 */
const PREAMBLE_LINES = [
  /^All notable changes to .* (?:are|will be) documented (?:here|in this file)\.?$/,
  /^Entries below `## <version>` are generated from \[changesets\]/,
  /^(?:t|T)he format (?:follows|is based on) \[Keep a Changelog\]/,
  /^and this project adheres to \[Semantic Versioning\]/,
];

function isPreambleLine(line: string): boolean {
  return PREAMBLE_LINES.some((re) => re.test(line.trim()));
}

function preambleFor(pkgName: string): string[] {
  return [
    `# ${pkgName}`,
    '',
    `All notable changes to \`${pkgName}\` are documented here.`,
    '',
    'Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);',
    'the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).',
    '',
  ];
}

/**
 * Rebuild a CHANGELOG into canonical shape. Pure: takes and returns text, so
 * the lock test can exercise it on fixtures without touching the repo.
 */
export function normalize(content: string, pkgName: string): string {
  const lines = content.split('\n');

  // Strip every H1 and the boilerplate paragraph trailing a buried one. Those
  // paragraphs are pure "All notable changes …" preamble in every file here
  // (verified across all 22 packages); the canonical preamble replaces them.
  const stripped: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^#\s/.test(lines[i])) {
      // Drop orphaned preamble wherever it landed; `preambleFor` re-emits the
      // canonical copy at the top.
      if (!isPreambleLine(lines[i])) stripped.push(lines[i]);
      continue;
    }
    // Skip the H1 itself, then everything up to the next heading of any level.
    i++;
    while (i < lines.length && !/^#{1,6}\s/.test(lines[i])) i++;
    i--; // the outer loop's i++ re-reads the heading that stopped us
  }

  // Split into `## …` sections. Anything before the first one is dropped —
  // after the H1 strip above it is only blank lines and stale preamble.
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of stripped) {
    if (/^##\s/.test(line)) {
      const { heading, version } = normalizeHeading(line);
      current = { heading, body: [], version, order: sections.length };
      sections.push(current);
    } else if (current) {
      current.body.push(line);
    }
  }

  const versioned = sections
    .filter((s) => s.version !== null)
    .sort((a, b) => compareVersions(a.version!, b.version!));
  const unversioned = sections
    .filter((s) => s.version === null)
    .sort((a, b) => a.order - b.order);

  // Unversioned sections (`## [Unreleased]`) lead, per Keep a Changelog. A
  // release prepends above them; the next normalize run hoists them back.
  const out = preambleFor(pkgName);
  for (const section of [...unversioned, ...versioned]) {
    out.push(section.heading, '');
    // Collapse leading/trailing blank lines so spacing is uniform regardless
    // of which generator produced the section.
    const body = [...section.body];
    while (body.length > 0 && body[0].trim() === '') body.shift();
    while (body.length > 0 && body[body.length - 1].trim() === '') body.pop();
    if (body.length > 0) out.push(...body, '');
  }

  return (
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
}

/**
 * Errors that mean "this path is simply not a workspace changelog", as opposed
 * to a real I/O failure worth crashing on. ENOTDIR covers a non-directory
 * entry inside `packages/` — `packages/.gitkeep` is a file, so opening
 * `packages/.gitkeep/CHANGELOG.md` fails this way rather than with ENOENT.
 */
function isMissingPath(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

/**
 * The canonical form: structural normalisation, then Prettier.
 *
 * `normalize()` fixes *structure* — the H1, the ordering, the preamble. It
 * says nothing about how the markdown inside each entry is written, and that
 * text arrives verbatim from whatever a contributor typed into a changeset.
 * Bullet markers, emphasis characters, table padding, list indentation and
 * line wrapping therefore drift entry by entry, and a changelog assembled from
 * a dozen such entries reads like a dozen documents.
 *
 * Running the repo's own formatter over the result makes every changelog
 * identical in style to every other markdown file here, and — because
 * `--check` compares against this same function — makes that property
 * enforceable rather than something that currently happens to hold.
 *
 * Prettier v3's API is async, which is the only reason this is not folded into
 * `normalize()` itself; the structural half stays sync so it can be unit
 * tested directly.
 */
export async function canonical(
  content: string,
  pkgName: string,
): Promise<string> {
  const structural = normalize(content, pkgName);
  try {
    const prettier = await import('prettier');
    return await prettier.format(structural, {
      ...(await prettier.resolveConfig('CHANGELOG.md')),
      parser: 'markdown',
    });
  } catch (error) {
    // Never let a formatter problem block a release: an unformatted changelog
    // is a cosmetic loss, a failed `changeset version` is a stuck release.
    console.warn(
      `⚠️  Prettier unavailable (${(error as Error).message}); wrote structurally-normalized markdown only.`,
    );
    return structural;
  }
}

function workspaceDirs(): string[] {
  const dirs: string[] = [];
  for (const root of WORKSPACE_ROOTS) {
    // Same reasoning as in main(): list-or-ENOENT instead of exists-then-list.
    // A workspace without a package.json is simply not a workspace; main()
    // discovers that when its read fails, so nothing is checked twice.
    let entries: string[];
    try {
      entries = readdirSync(root);
    } catch (error) {
      if (isMissingPath(error)) continue;
      throw error;
    }
    for (const entry of entries) dirs.push(join(root, entry));
  }
  return dirs.sort();
}

async function main() {
  const drifted: string[] = [];
  let checked = 0;

  for (const dir of workspaceDirs()) {
    const changelogPath = join(dir, 'CHANGELOG.md');

    // Read first and treat ENOENT as "no changelog here", rather than testing
    // with existsSync() and reading after. The check-then-read pair is a
    // TOCTOU race (CodeQL js/file-system-race): the file can vanish between
    // the two calls, and the read then throws the very error the check was
    // supposed to prevent. Not a security issue for a repo-local script, but
    // it is the exact shape this ecosystem's own rules flag in user code —
    // and the version without the race is also the shorter one.
    let before: string;
    let pkgManifest: string;
    try {
      before = readFileSync(changelogPath, 'utf8');
      pkgManifest = readFileSync(join(dir, 'package.json'), 'utf8');
    } catch (error) {
      if (isMissingPath(error)) continue;
      throw error;
    }

    const pkgName = (JSON.parse(pkgManifest).name as string) ?? dir;
    const after = await canonical(before, pkgName);
    checked++;

    if (before === after) continue;
    drifted.push(changelogPath);
    if (!CHECK) writeFileSync(changelogPath, after);
  }

  if (drifted.length === 0) {
    console.log(`✅ ${checked} CHANGELOG.md file(s) already canonical.`);
    return;
  }

  if (CHECK) {
    console.error(
      `❌ ${drifted.length} of ${checked} CHANGELOG.md file(s) are not canonical:`,
    );
    for (const file of drifted) console.error(`   ${file}`);
    console.error('\nRun `npm run changelog:normalize` to fix.');
    process.exit(1);
  }

  console.log(
    `✍️  Normalized ${drifted.length} of ${checked} CHANGELOG.md file(s):`,
  );
  for (const file of drifted) console.log(`   ${file}`);
}

// Guarded so the lock test can import `normalize` without running the sweep.
if (process.argv[1] && process.argv[1].endsWith('normalize-changelogs.ts'))
  void main();

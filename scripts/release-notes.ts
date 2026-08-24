#!/usr/bin/env tsx

/**
 * release-notes.ts — one set of notes for everything a release shipped.
 *
 * ## Why this exists
 *
 * `release.yml` publishes N packages in a matrix fan-out and creates N
 * GitHub Releases, one per package. That is right for consumers of a single
 * package — `eslint-plugin-jwt@2.3.0` should have its own tag and its own
 * notes — but it means a release of 19 packages produces 19 disconnected
 * pages and no answer to "what shipped today?". A reader who wants that has
 * to open 19 tabs and diff them by hand.
 *
 * This produces the missing rollup: every package and app that moved in one
 * release, grouped by **what the change was** (breaking / feature / fix /
 * performance / …) rather than by which package it happened to land in.
 * Package identity becomes a tag on the line instead of the top-level
 * partition, which is the right way round — a reader scanning a release
 * cares first whether anything will break, not which of 22 packages it was
 * in. Where the same change touched several packages (a cross-cutting fix
 * with 19 patch bumps is the common shape here) it is collapsed to one line
 * listing them all, instead of being repeated 19 times.
 *
 * ## Inputs
 *
 * Reads the freshly-written `CHANGELOG.md` of every package/app whose version
 * differs between two git refs. That is deliberate: the CHANGELOGs are the
 * artifact changesets already produced and the Version PR already reviewed,
 * so the rollup can never disagree with the per-package notes. Nothing is
 * re-derived from changeset files, which by then have been consumed.
 *
 * ## Usage
 *
 *   tsx scripts/release-notes.ts                     # vs the previous commit
 *   tsx scripts/release-notes.ts --since=<git-ref>   # vs an explicit base
 *   tsx scripts/release-notes.ts --json              # machine-readable
 *
 * Exit codes: 0 always (an empty release prints a "nothing shipped" note).
 * A rollup is a reporting artifact — it must never be the thing that fails
 * a release that already published successfully.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import {
  INTERNAL_ONLY,
  ROLLUP_POINTER,
  SAFE_TO_UPGRADE,
  breakingVerdict,
} from './release-verdict';

const WORKSPACE_ROOTS = ['packages', 'apps'];

/**
 * Display order and heading for each change kind. Breaking first — the only
 * section a reader is obliged to read. `other` catches lines whose badge the
 * formatter could not classify.
 */
const KIND_SECTIONS: ReadonlyArray<{
  key: string;
  heading: string;
  match: RegExp;
}> = [
  { key: 'breaking', heading: '### 💥 Breaking changes', match: /💥/ },
  { key: 'feature', heading: '### ✨ Features', match: /✨/ },
  { key: 'fix', heading: '### 🐛 Fixes', match: /🐛/ },
  { key: 'security', heading: '### 🔒 Security', match: /🔒/ },
  { key: 'perf', heading: '### ⚡ Performance', match: /⚡/ },
  { key: 'docs', heading: '### 📚 Documentation', match: /📚/ },
  { key: 'chore', heading: '### 🧹 Maintenance', match: /🧹|🏗|🔧|🧪|🎨|⏪/ },
  { key: 'deps', heading: '### 🔗 Dependencies', match: /🔗/ },
];

export interface Workspace {
  dir: string;
  name: string;
  version: string;
  previousVersion: string | null;
  isApp: boolean;
  isPrivate: boolean;
}

export interface Entry {
  kind: string;
  /** The bullet's prose, badge and trailer stripped. */
  title: string;
  /** Markdown links back to the PR / commit, as emitted by the formatter. */
  trailer: string;
  packages: string[];
}

function git(args: string[]): string {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function arg(flag: string): string | undefined {
  const found = process.argv.slice(2).find((a) => a.startsWith(`${flag}=`));
  return found ? found.slice(flag.length + 1) : undefined;
}

/**
 * Read a file as it existed at `ref`; null means "not present at that ref".
 *
 * The distinction matters more than it looks. `null` is what marks a workspace
 * as a **first release**, so conflating it with "git could not answer" means a
 * bad `--since` ref reports every workspace in the repo as brand new — a
 * rollup and a `rollup.json` that are confidently, comprehensively wrong.
 *
 * `git cat-file -e` answers "does this path exist at this ref" without reading
 * content, and distinguishes a missing path (exit 1) from a bad ref, which
 * `verifyRef` has already rejected before any of this runs.
 */
function showAtRef(ref: string, path: string): string | null {
  const exists = spawnSync('git', ['cat-file', '-e', `${ref}:${path}`], {
    stdio: 'ignore',
  });
  if (exists.status !== 0) return null;
  return git(['show', `${ref}:${path}`]);
}

/**
 * Fail loudly on a ref we cannot resolve, before it can be mistaken for a repo
 * full of new packages.
 */
function verifyRef(ref: string): void {
  const ok = spawnSync(
    'git',
    ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`],
    {
      stdio: 'ignore',
    },
  );
  if (ok.status !== 0) {
    console.error(`❌ Cannot resolve \`${ref}\` to a commit.`);
    console.error('   Release notes need a valid base ref to diff against.');
    process.exit(1);
  }
}

function listWorkspaces(baseRef: string): Workspace[] {
  const out: Workspace[] = [];
  for (const root of WORKSPACE_ROOTS) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      const dir = join(root, entry);
      const pkgPath = join(dir, 'package.json');
      if (!existsSync(pkgPath)) continue;

      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        name?: string;
        version?: string;
        private?: boolean;
      };
      if (!pkg.name || !pkg.version) continue;

      let previousVersion: string | null = null;
      const before = showAtRef(baseRef, pkgPath);
      if (before) {
        try {
          previousVersion = (JSON.parse(before).version as string) ?? null;
        } catch {
          previousVersion = null;
        }
      }

      out.push({
        dir,
        name: pkg.name,
        version: pkg.version,
        previousVersion,
        isApp: root === 'apps',
        isPrivate: pkg.private === true,
      });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Pull the bullets belonging to exactly one `## <version>` section.
 *
 * Only top-level bullets are entries; indented continuation lines are the
 * changeset body and belong to the bullet above them. The rollup keeps
 * titles only — the full body stays in the per-package CHANGELOG, one click
 * away, which is what keeps a 19-package rollup readable.
 */
export function bulletsForVersion(
  changelog: string,
  version: string,
): string[] {
  const lines = changelog.split('\n');
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = lines.findIndex((l) =>
    new RegExp(`^##\\s+\\[?${escaped}\\]?\\b`).test(l),
  );
  if (start === -1) return [];

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }

  return lines.slice(start + 1, end).filter((l) => l.startsWith('- '));
}

/**
 * Split a formatter bullet into its parts.
 *
 * Expected shape (see `.changeset/changelog.cjs`):
 *   `- **✨ Feature** — add \`no-foo\` ([#12](…), [\`abc\`](…))`
 *
 * Bullets from before the formatter landed have no badge; they classify as
 * `other` and keep their text verbatim rather than being dropped, so the
 * rollup still works across the format boundary.
 */
export function parseBullet(bullet: string): {
  kind: string;
  title: string;
  trailer: string;
} {
  const badged = /^-\s+\*\*([^*]+)\*\*\s+—\s+(.*)$/.exec(bullet);
  let badge = badged ? badged[1] : '';
  let rest = badged ? badged[2] : bullet.replace(/^-\s+/, '');
  let legacyTrailer = '';

  // Entries written before the custom formatter landed carry
  // `@changesets/changelog-github`'s prefix: roughly 120 characters of
  // `[#651](…) [\`sha\`](…) Thanks [@user](…)! - ` ahead of the first word of
  // prose. Left alone they render into the rollup verbatim, which makes every
  // release spanning the format boundary — starting with the next one —
  // unreadable. Peel the prefix, keep the PR link as the trailer, and let the
  // prose be classified like any other entry.
  if (!badged) {
    const legacy =
      /^(\[#\d+\]\([^)]*\))?\s*(\[`[^`]+`\]\([^)]*\))?\s*(?:Thanks\s+\[@[^\]]+\]\([^)]*\)!)?\s*-\s+(.*)$/.exec(
        rest,
      );
    if (legacy && legacy[3] && (legacy[1] || legacy[2])) {
      legacyTrailer = legacy[1] ?? legacy[2] ?? '';
      rest = legacy[3].trim();
    }
  }

  // A legacy entry has no badge, but its prose often still opens with a
  // conventional-commit prefix. Reading it recovers the right section instead
  // of dumping years of history into "Other changes".
  if (!badge) {
    const prefix = /^([a-z]+)(?:\([^)]*\))?(!)?:\s/.exec(rest);
    if (prefix) {
      badge = prefix[2]
        ? '💥'
        : ({
            feat: '✨',
            fix: '🐛',
            perf: '⚡',
            security: '🔒',
            docs: '📚',
            refactor: '🧹',
            chore: '🧹',
            build: '🏗',
            ci: '🔧',
            test: '🧪',
          }[prefix[1]] ?? '');
    }
  }

  // `@changesets/changelog-github` wrote internal dependency bumps as
  // `Updated dependencies [[\`sha\`](url), [\`sha\`](url), …]` — 248 of the
  // 1554 entries in the corpus, up to 622 characters of raw commit links. The
  // information content is "internal dependencies moved"; the SHAs are noise
  // to anyone reading a changelog, and they crowd out the entries that say
  // something. Collapse to the same shape the current formatter emits.
  if (/^Updated dependencies\s*\[/.test(rest)) {
    return {
      kind: 'deps',
      title: 'Updated internal dependencies',
      trailer: '',
    };
  }

  const kind = KIND_SECTIONS.find((s) => s.match.test(badge))?.key ?? 'other';

  // Peel a trailing `(…)` group only when it is link plumbing, never when it
  // is part of the prose — `add \`no-dynamic-algorithm-selection\` (CWE-327)`
  // must keep its parenthetical.
  const trailerMatch =
    /\s\(((?:\[[^\]]*\]\([^)]*\)|,\s*|thanks\s+)+)\)\s*$/.exec(rest);
  const trailer = trailerMatch ? trailerMatch[1] : legacyTrailer;
  const title = trailerMatch
    ? rest.slice(0, trailerMatch.index).trim()
    : rest.trim();

  return { kind, title, trailer };
}

/** Stable key for collapsing the same change reported by many packages. */
function dedupeKey(kind: string, title: string): string {
  return `${kind} ${title.toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

/**
 * Did this workspace ship in this range?
 *
 * `previousVersion === null` means it did not exist at the base ref — a first
 * release, which `release.yml` does publish and which must therefore appear.
 * Extracted and exported so the filter can be tested directly; `render()`
 * takes an already-filtered list, so a test that passes it an unchanged
 * workspace and finds it in the output proves nothing about this rule.
 */
export function isReleased(w: Workspace): boolean {
  return w.previousVersion === null || w.previousVersion !== w.version;
}

function collect(workspaces: Workspace[]): {
  released: Workspace[];
  entries: Entry[];
} {
  // `previousVersion === null` means the workspace did not exist at the base
  // ref — a brand-new package. Excluding it dropped first releases out of the
  // rollup, `rollup.json` and the version table entirely, even though
  // `release.yml` publishes them ("🆕 first release" in its detect stage).
  // A release note that omits the one package nobody has seen before is
  // exactly backwards.
  const released = workspaces.filter(isReleased);
  const byKey = new Map<string, Entry>();

  for (const ws of released) {
    const changelogPath = join(ws.dir, 'CHANGELOG.md');
    if (!existsSync(changelogPath)) continue;

    for (const bullet of bulletsForVersion(
      readFileSync(changelogPath, 'utf8'),
      ws.version,
    )) {
      const { kind, title, trailer } = parseBullet(bullet);
      if (!title) continue;

      const key = dedupeKey(kind, title);
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.packages.includes(ws.name))
          existing.packages.push(ws.name);
        // Keep whichever occurrence actually resolved backlinks.
        if (!existing.trailer && trailer) existing.trailer = trailer;
      } else {
        byKey.set(key, { kind, title, trailer, packages: [ws.name] });
      }
    }
  }

  return { released, entries: [...byKey.values()] };
}

/**
 * Render the package tag for one entry.
 *
 * A change that landed in *every* released package is a repo-wide sweep;
 * naming all 19 is noise, so it collapses to "all packages". Up to three are
 * listed in full; beyond that the tail is counted.
 */
function packageTag(entry: Entry, releasedCount: number): string {
  const short = entry.packages.map((n) =>
    n.replace(/^eslint-plugin-/, '').replace(/^@interlace\//, ''),
  );
  if (entry.packages.length === releasedCount && releasedCount > 3)
    return '`all packages`';
  if (short.length <= 3) return short.map((n) => `\`${n}\``).join(' ');
  return `${short
    .slice(0, 3)
    .map((n) => `\`${n}\``)
    .join(' ')} +${short.length - 3} more`;
}

export function render(
  released: Workspace[],
  entries: Entry[],
  baseRef: string,
  headRef: string,
): string {
  const out: string[] = [];

  if (released.length === 0) {
    return `## Release rollup\n\nNo package or app versions changed between \`${baseRef}\` and \`${headRef}\`.\n`;
  }

  const packages = released.filter((w) => !w.isApp);
  const apps = released.filter((w) => w.isApp);

  // Which of this release's workspaces someone can actually install.
  const publishedNames = new Set(
    released.filter((w) => !w.isPrivate).map((w) => w.name),
  );
  const affectsConsumers = (e: Entry) =>
    e.packages.some((n) => publishedNames.has(n));

  // The verdict counts only breaking changes a consumer can be hit by.
  // A `docs: major` — a private app nobody installs — is genuinely breaking
  // for that app and genuinely irrelevant to anyone reading this to decide
  // whether to upgrade a plugin. Counting it warned people off a release that
  // could not affect them, which is the failure mode that makes readers stop
  // trusting the banner and skip it entirely.
  const breaking = entries.filter(
    (e) => e.kind === 'breaking' && affectsConsumers(e),
  ).length;

  out.push('## What shipped', '');

  // The upgrade verdict leads, because it is the decision the reader came to
  // make. Everything below it is detail they only need once they know whether
  // this release can go in today. Derived from the entries themselves — the
  // 💥 badge is written by the release machinery from the changeset's declared
  // bump — so it cannot drift from the list underneath it.
  //
  // Wording lives in `release-verdict.ts`, shared with the per-package notes:
  // a reader routinely sees both, and two spellings of the same verdict cost
  // more attention to reconcile than the sentence saves.
  // Three verdicts, not two. "Safe to upgrade" answers "will this break me?",
  // which is the wrong question when the answer is "none of this reaches you".
  const anyPublished =
    entries.some(affectsConsumers) || publishedNames.size > 0;

  out.push(
    !anyPublished
      ? INTERNAL_ONLY
      : breaking > 0
        ? breakingVerdict(breaking, ROLLUP_POINTER)
        : SAFE_TO_UPGRADE,
    '',
  );

  const counts: string[] = [
    `${packages.length} package${packages.length === 1 ? '' : 's'}`,
  ];
  if (apps.length > 0) {
    counts.push(`${apps.length} app${apps.length === 1 ? '' : 's'}`);
  }
  out.push(`Released: ${counts.join(', ')}.`, '');

  const sections = [
    ...KIND_SECTIONS,
    { key: 'other', heading: '### Other changes', match: /$^/ },
  ];

  const line = (entry: Entry) => {
    const tag = packageTag(entry, released.length);
    const trailer = entry.trailer ? ` (${entry.trailer})` : '';
    return `- ${entry.title} — ${tag}${trailer}`;
  };

  // Consumer-facing entries first, internal ones gathered at the end.
  //
  // Interleaved, a release of mostly app churn opens "✅ Safe to upgrade"
  // and then leads with a "💥 Breaking changes" heading — the first release
  // this shipped did exactly that. The per-line `(internal)` marker resolves
  // the contradiction only *after* the reader has read the line, and a
  // heading is read before its contents. Partitioning means a consumer-facing
  // document leads with consumer-facing content, and nothing is dropped:
  // everything internal is still listed, under a heading that says what it is.
  const consumerEntries = entries.filter(affectsConsumers);
  const internalEntries = entries.filter((e) => !affectsConsumers(e));

  for (const section of sections) {
    const matching = consumerEntries.filter((e) => e.kind === section.key);
    if (matching.length === 0) continue;

    out.push(section.heading, '');
    for (const entry of matching) out.push(line(entry));
    out.push('');
  }

  if (internalEntries.length > 0) {
    out.push(
      '<details><summary>Internal changes — apps and unpublished packages</summary>',
      '',
      'Not installable, and not part of any dependency you have. Listed so the',
      'release record is complete.',
      '',
    );
    for (const section of sections) {
      const matching = internalEntries.filter((e) => e.kind === section.key);
      if (matching.length === 0) continue;

      out.push(`**${section.heading.replace(/^###\s*/, '')}**`, '');
      for (const entry of matching) out.push(line(entry));
      out.push('');
    }
    out.push('</details>', '');
  }

  out.push(
    '### Versions',
    '',
    '| Workspace | | From | To |',
    '|---|---|---|---|',
  );
  for (const ws of released) {
    const label = ws.isApp ? 'app' : ws.isPrivate ? 'internal' : 'npm';
    const link = ws.isPrivate
      ? `\`${ws.name}\``
      : `[\`${ws.name}\`](https://www.npmjs.com/package/${ws.name}/v/${ws.version})`;
    // "new" rather than `null`: a first release has no previous version, and
    // printing the literal null reads as a bug in the notes.
    const from =
      ws.previousVersion === null ? '_new_' : `\`${ws.previousVersion}\``;
    out.push(`| ${link} | ${label} | ${from} | \`${ws.version}\` |`);
  }
  out.push('');

  out.push(
    `<sub>Rolled up from each workspace's \`CHANGELOG.md\` between \`${baseRef.slice(0, 7)}\` and \`${headRef.slice(0, 7)}\`. Per-package notes carry the full detail.</sub>`,
  );

  return out.join('\n') + '\n';
}

function main() {
  const headRef = git(['rev-parse', 'HEAD']) || 'HEAD';
  // Default base: the previous commit on this branch. On a Version-PR merge
  // that is exactly the pre-release state, which is the comparison we want.
  const baseRef = arg('--since') ?? git(['rev-parse', 'HEAD~1']) ?? 'HEAD~1';

  verifyRef(baseRef);
  const workspaces = listWorkspaces(baseRef);
  const { released, entries } = collect(workspaces);

  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify({ baseRef, headRef, released, entries }, null, 2),
    );
    return;
  }

  process.stdout.write(render(released, entries, baseRef, headRef));
}

// Guarded so the lock test can import the pure renderers without shelling out
// to git for a diff it does not need.
if (process.argv[1] && process.argv[1].endsWith('release-notes.ts')) main();

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

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

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

interface Workspace {
  dir: string;
  name: string;
  version: string;
  previousVersion: string | null;
  isApp: boolean;
  isPrivate: boolean;
}

interface Entry {
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

/** Read a file as it existed at `ref`, or null when it did not exist there. */
function showAtRef(ref: string, path: string): string | null {
  const out = git(['show', `${ref}:${path}`]);
  return out === '' ? null : out;
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
function bulletsForVersion(changelog: string, version: string): string[] {
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
function parseBullet(bullet: string): {
  kind: string;
  title: string;
  trailer: string;
} {
  const badged = /^-\s+\*\*([^*]+)\*\*\s+—\s+(.*)$/.exec(bullet);
  const badge = badged ? badged[1] : '';
  const rest = badged ? badged[2] : bullet.replace(/^-\s+/, '');

  const kind = KIND_SECTIONS.find((s) => s.match.test(badge))?.key ?? 'other';

  // Peel a trailing `(…)` group only when it is link plumbing, never when it
  // is part of the prose — `add \`no-dynamic-algorithm-selection\` (CWE-327)`
  // must keep its parenthetical.
  const trailerMatch =
    /\s\(((?:\[[^\]]*\]\([^)]*\)|,\s*|thanks\s+)+)\)\s*$/.exec(rest);
  const trailer = trailerMatch ? trailerMatch[1] : '';
  const title = trailerMatch
    ? rest.slice(0, trailerMatch.index).trim()
    : rest.trim();

  return { kind, title, trailer };
}

/** Stable key for collapsing the same change reported by many packages. */
function dedupeKey(kind: string, title: string): string {
  return `${kind} ${title.toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

function collect(workspaces: Workspace[]): {
  released: Workspace[];
  entries: Entry[];
} {
  const released = workspaces.filter(
    (w) => w.previousVersion !== null && w.previousVersion !== w.version,
  );
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

function render(
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
  const breaking = entries.filter((e) => e.kind === 'breaking').length;

  out.push('## What shipped', '');
  out.push(
    `**${released.length}** workspace${released.length === 1 ? '' : 's'} released` +
      (apps.length > 0
        ? ` (${packages.length} package${packages.length === 1 ? '' : 's'}, ${apps.length} app${apps.length === 1 ? '' : 's'})`
        : '') +
      (breaking > 0
        ? ` · ⚠️ **${breaking} breaking change${breaking === 1 ? '' : 's'}**`
        : '') +
      '.',
    '',
  );

  const sections = [
    ...KIND_SECTIONS,
    { key: 'other', heading: '### Other changes', match: /$^/ },
  ];
  for (const section of sections) {
    const matching = entries.filter((e) => e.kind === section.key);
    if (matching.length === 0) continue;

    out.push(section.heading, '');
    for (const entry of matching) {
      const tag = packageTag(entry, released.length);
      const trailer = entry.trailer ? ` (${entry.trailer})` : '';
      out.push(`- ${entry.title} — ${tag}${trailer}`);
    }
    out.push('');
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
    out.push(
      `| ${link} | ${label} | \`${ws.previousVersion}\` | \`${ws.version}\` |`,
    );
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

main();

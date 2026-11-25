/**
 * Writes `src/data/content-dates.json`: the last commit date of every docs
 * content file, and of every package README and CHANGELOG that a docs page
 * renders live.
 *
 * Why: the sitemap had no `<lastmod>` and no page carried a `dateModified`.
 * Freshness is a ranking and citation signal, and an answer engine prefers a
 * dated page. The date has to be honest, though: build time would stamp every
 * page with the same "today" on every deploy, which is the failure the
 * serverless site's sitemap shows (37 pages, one identical build stamp). The
 * git commit date of the file that produces the page is the real answer.
 *
 * A shallow clone cannot answer it. In a `--depth=1` checkout every file
 * appears to have been added by the one commit present, so `git log` would
 * report that commit's date for all of them — the same lie as build time,
 * just better hidden. The script detects a shallow clone and leaves the
 * committed file alone instead of overwriting it with that.
 * `deploy-docs.yml` checks out full history (blob-less) so production builds
 * regenerate it.
 *
 * Usage: tsx scripts/sync-content-dates.ts
 */
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import { writeJsonIfChanged } from './lib/write-json-if-changed.ts';

const APP = resolve(import.meta.dirname, '..');
const REPO = resolve(APP, '../..');
const OUT = join(APP, 'src/data/content-dates.json');
const CONTENT_PREFIX = 'apps/docs/content/docs/';
const PACKAGES_PREFIX = 'packages/';

export interface ContentDates {
  /** Keyed by path relative to `content/docs` (fumadocs `page.path`). */
  content: Record<string, string>;
  /** Keyed by `eslint-plugin-<x>/README.md` or `eslint-plugin-<x>/CHANGELOG.md`. */
  packages: Record<string, string>;
}

const git = (args: string[]) =>
  execFileSync('git', args, {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });

/**
 * Parses `git log --format=%x1f%cI --name-only` output: newest commit first,
 * so the first date seen for a path is its last-modified date.
 */
export function parseGitLog(log: string, tracked?: Set<string>): ContentDates {
  const content: Record<string, string> = {};
  const packages: Record<string, string> = {};
  let date = '';
  for (const line of log.split('\n')) {
    if (line.startsWith('\x1f')) {
      date = line.slice(1).trim();
      continue;
    }
    const file = line.trim();
    if (!file || !date) continue;
    // History includes deleted and renamed-away files; only pages that exist count.
    if (tracked && !tracked.has(file)) continue;
    if (file.startsWith(CONTENT_PREFIX) && /\.mdx?$/.test(file)) {
      const rel = file.slice(CONTENT_PREFIX.length);
      content[rel] ??= date;
    } else if (file.startsWith(PACKAGES_PREFIX)) {
      const rel = file.slice(PACKAGES_PREFIX.length);
      if (/^eslint-plugin-[^/]+\/(README|CHANGELOG)\.md$/.test(rel))
        packages[rel] ??= date;
    }
  }
  const sorted = (o: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(o).sort(([a], [b]) => a.localeCompare(b)),
    );
  return { content: sorted(content), packages: sorted(packages) };
}

function main() {
  let shallow: string;
  try {
    shallow = git(['rev-parse', '--is-shallow-repository']).trim();
  } catch {
    console.warn(
      '[content-dates] not a git checkout; keeping the committed file.',
    );
    return;
  }
  if (shallow === 'true') {
    console.warn(
      '[content-dates] shallow clone: commit dates would all read as the clone boundary. Keeping the committed file.',
    );
    return;
  }
  const log = git([
    'log',
    '--format=%x1f%cI',
    '--name-only',
    '--',
    'apps/docs/content/docs',
    'packages/eslint-plugin-*/README.md',
    'packages/eslint-plugin-*/CHANGELOG.md',
  ]);
  const tracked = new Set(git(['ls-files']).split('\n').filter(Boolean));
  const dates = parseGitLog(log, tracked);
  const wrote = writeJsonIfChanged(OUT, dates);
  console.log(
    `[content-dates] ${Object.keys(dates.content).length} content files, ${Object.keys(dates.packages).length} package docs${wrote ? ' (updated)' : ' (unchanged)'}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();

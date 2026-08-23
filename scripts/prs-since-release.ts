#!/usr/bin/env tsx

/**
 * prs-since-release.ts — every PR that touched a package since its last release.
 *
 * Release notes come from the changeset text, which says what changed in the
 * author's words. That is the right thing to lead with, but it does not tell a
 * consumer WHICH pull requests are in the version they just installed, and that
 * is the question someone asks when a finding they reported stops appearing —
 * or when one they depend on starts.
 *
 * Reads git history rather than the GitHub API: the tags and the squash-merge
 * subjects are already local, the release job has them checked out, and an API
 * call here would need a token and a rate-limit budget in a matrix job that runs
 * once per package.
 *
 * Package tags are `<name>@<version>`, so the previous release of THIS package is
 * found by sorting its own tags — not the repo's, which interleave every package.
 *
 * Usage:
 *   tsx scripts/prs-since-release.ts <package-dir> <new-version>
 *   tsx scripts/prs-since-release.ts packages/eslint-plugin-node-security 5.1.2
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [dir, version] = process.argv.slice(2);

if (!dir || !version) {
  console.error('usage: prs-since-release.ts <package-dir> <new-version>');
  process.exit(2);
}

const pkgPath = path.join(dir, 'package.json');
if (!fs.existsSync(pkgPath)) {
  console.error(`no package.json at ${pkgPath}`);
  process.exit(2);
}
const name = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).name as string;

const git = (...args: string[]): string => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

/**
 * The previous tag for THIS package.
 *
 * `--sort=-v:refname` orders by semver rather than lexically, so 5.1.10 sorts
 * above 5.1.9 — a plain sort puts 5.1.9 last and would silently truncate the
 * range to a single release.
 */
const previous = git('tag', '--list', `${name}@*`, '--sort=-v:refname')
  .split('\n')
  .filter(Boolean)
  .find((t) => t !== `${name}@${version}`);

// No previous tag means this is the first release; the whole history is "since".
const range = previous ? `${previous}..HEAD` : 'HEAD';

const log = git('log', range, '--no-merges', '--format=%s', '--', dir)
  .split('\n')
  .filter(Boolean);

/** Squash merges end in `(#123)`; that is the PR this change arrived in. */
const prs = new Map<string, string>();
for (const subject of log) {
  // The changesets bot's own "version packages" PR carries the bump and the
  // CHANGELOG for this very release, so listing it tells the reader nothing they
  // are not already looking at.
  if (subject.startsWith('chore(release): version packages')) continue;
  const m = subject.match(/^(.*?)\s*\(#(\d+)\)$/);
  if (m) prs.set(m[2], m[1]);
}

if (prs.size === 0) {
  // Silent rather than a heading with nothing under it — a release can legitimately
  // carry only a dependency bump, and an empty section reads like a bug.
  process.exit(0);
}

const repo = process.env.GITHUB_REPOSITORY ?? 'ofri-peretz/eslint';

console.log('');
console.log(
  previous
    ? `### Pull requests since ${previous.split('@').pop()}`
    : '### Pull requests in this release',
);
console.log('');
for (const [num, subject] of [...prs].sort(
  (a, b) => Number(b[0]) - Number(a[0]),
)) {
  console.log(`- ${subject} — https://github.com/${repo}/pull/${num}`);
}

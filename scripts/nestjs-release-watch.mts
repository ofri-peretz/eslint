#!/usr/bin/env -S npx tsx
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * nestjs-release-watch — what has the NestJS organisation released since we
 * last looked?
 *
 *   npm run nestjs:releases              # print the unseen releases as JSON
 *   npm run nestjs:releases -- --advance # …and record them as seen
 *
 * Covers every public, non-archived repository under github.com/nestjs, so a
 * module added upstream is picked up with no change here. The cursor (the
 * newest release seen, per repository) lives in .agent/nestjs-release-watch.json
 * and is committed: it is what makes a run a reconciliation rather than a
 * re-read. `--advance` is separate from reading so a run that fails half way
 * through its analysis does not lose the releases it had not handled.
 *
 * Why this exists: eslint-plugin-nestjs-security kept a peer range that stopped
 * at NestJS 11 for two months after 12.0.0, and three of its rules did not know
 * NestJS 12's Standard Schema API. Nothing was reading the release notes.
 *
 * Needs an authenticated `gh`. Exit 0 with `[]` when there is nothing new.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { advance, unseen, type Release } from './lib/release-watch.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CURSOR = path.join(ROOT, '.agent', 'nestjs-release-watch.json');
const ORG = 'nestjs';

/** `gh api`, retried: one dropped connection must not cost a whole run. */
function gh(endpoint: string, jq: string, paginate = false): string {
  const args = [
    'api',
    ...(paginate ? ['--paginate'] : []),
    endpoint,
    '--jq',
    jq,
  ];
  for (let attempt = 1; ; attempt++) {
    try {
      return execFileSync('gh', args, {
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
}

const state = JSON.parse(fs.readFileSync(CURSOR, 'utf8')) as {
  command: string;
  repos: Record<string, string>;
};
const cursors = state.repos;
const repos = gh(
  `orgs/${ORG}/repos?type=public&per_page=100`,
  '.[] | select(.archived | not) | select(.fork | not) | .name',
  true,
)
  .split('\n')
  .filter(Boolean);

const found: (Release & { repo: string })[] = [];
for (const repo of repos.sort()) {
  // The newest 30 are plenty for a three-day cadence; drafts and prereleases
  // are not what a consumer upgrades to.
  const releases = JSON.parse(
    gh(
      `repos/${ORG}/${repo}/releases?per_page=30`,
      '[.[] | select(.draft or .prerelease | not) | {tag: .tag_name, publishedAt: .published_at, url: .html_url, body: (.body // "")}]',
    ),
  ) as Release[];
  const fresh = unseen(releases, cursors[repo]);
  found.push(
    ...fresh.map((release) => ({ repo: `${ORG}/${repo}`, ...release })),
  );
  const next = advance(cursors[repo], fresh);
  if (next !== undefined) cursors[repo] = next;
}

process.stdout.write(`${JSON.stringify(found, null, 2)}\n`);
if (process.argv.includes('--advance')) {
  fs.writeFileSync(CURSOR, `${JSON.stringify(state, null, 2)}\n`);
}

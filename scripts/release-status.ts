#!/usr/bin/env tsx

/**
 * release-status.ts — at-a-glance "what's about to ship?" + "what shipped recently?".
 *
 * Combines:
 *   - changeset status (pending bumps, grouped by package)
 *   - last 5 release tags per package (from `git tag --list`)
 *
 * Usage:
 *   npm run release:status                # human-readable
 *   npm run release:status -- --json      # machine-readable
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

interface Package {
  dir: string;
  name: string;
  version: string;
}

interface ChangesetRelease {
  name: string;
  type: 'patch' | 'minor' | 'major';
  oldVersion: string;
  newVersion: string;
  changesets?: string[];
}

const JSON_OUTPUT = process.argv.includes('--json');

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function listPackages(): Package[] {
  const out: Package[] = [];
  for (const dir of readdirSync('packages')) {
    const pkgJson = join('packages', dir, 'package.json');
    if (!existsSync(pkgJson)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgJson, 'utf8')) as {
        name?: string;
        version?: string;
        private?: boolean;
      };
      if (pkg.private) continue;
      if (!pkg.name || !pkg.version) continue;
      out.push({ dir, name: pkg.name, version: pkg.version });
    } catch {
      /* skip */
    }
  }
  return out;
}

function pendingChangesets(): ChangesetRelease[] {
  const tmp = `/tmp/changeset-status-${process.pid}.json`;
  sh(`npx --no -- changeset status --output=${tmp}`);
  if (!existsSync(tmp)) return [];
  try {
    return (JSON.parse(readFileSync(tmp, 'utf8')).releases ?? []) as ChangesetRelease[];
  } catch {
    return [];
  }
}

function recentTagsFor(pkgName: string): string[] {
  const short = pkgName.replace(/^@[^/]+\//, '');
  const tags = sh(`git tag --list "${short}@*" --sort=-version:refname`);
  return tags.split('\n').filter(Boolean).slice(0, 5);
}

const packages = listPackages();
const releases = pendingChangesets();
const pendingByName = new Map<string, ChangesetRelease>(releases.map((r) => [r.name, r]));

if (JSON_OUTPUT) {
  console.log(
    JSON.stringify(
      {
        pending: releases,
        packages: packages.map((p) => ({
          ...p,
          pending: pendingByName.get(p.name) ?? null,
          recentTags: recentTagsFor(p.name),
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

console.log(bold('Release status'));
console.log(dim('  ' + new Date().toISOString()));
console.log('');

if (releases.length === 0) {
  console.log(green('  No pending changesets — nothing queued for release.'));
} else {
  console.log(yellow(`  ${releases.length} package(s) queued in the next Version PR:`));
  for (const r of releases) {
    const arrow = r.type === 'major' ? '↑↑↑' : r.type === 'minor' ? '↑↑' : '↑';
    console.log(`    ${arrow} ${r.name}: ${r.oldVersion} → ${r.newVersion}  ${dim('(' + r.type + ')')}`);
  }
}
console.log('');

console.log(bold('All published packages (latest 3 tags each):'));
for (const p of packages) {
  const tags = recentTagsFor(p.name);
  const tagSummary = tags.length > 0 ? tags.slice(0, 3).join(', ') : dim('(no tags)');
  const pending = pendingByName.get(p.name);
  const note = pending ? yellow(`  →  ${pending.newVersion} pending`) : '';
  console.log(`  ${p.name.padEnd(48)} ${dim('@' + p.version)}  ${dim(tagSummary)}${note}`);
}
console.log('');

console.log(dim('Legend: ↑ patch · ↑↑ minor · ↑↑↑ major'));
console.log(dim('Add a changeset:    npm run changeset'));
console.log(dim('See full diff:      npm run changeset:status'));

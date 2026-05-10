#!/usr/bin/env tsx

/**
 * reconcile-tags.ts — keep git tags, GitHub Releases, and npm in sync.
 *
 * For each public package under packages/, compares three sources of truth:
 *   • git tags         — every `<short-name>@<version>` reference.
 *   • npm versions     — `npm view <name> versions --json`.
 *   • GitHub Releases  — via `gh release view` (only when --create-releases).
 *
 * Reports drift:
 *   • orphan-tags  — tag exists, version isn't on npm
 *   • missing-tags — version exists on npm, no matching git tag
 *
 * Modes (all idempotent):
 *   --report (default)        report only, exit 1 on drift
 *   --backfill-missing        create + push tags for npm versions missing one
 *   --cleanup-orphans         delete orphan tags (DESTRUCTIVE — needs --confirm)
 *   --create-releases         fill in missing GH Releases from CHANGELOG
 *   --json                    machine-readable output
 *   --pkg <name-or-dir>       limit to a single package
 *   --confirm                 required for --cleanup-orphans
 *   --quiet                   suppress per-package log lines
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

interface Package {
  dir: string;
  name: string;
  version: string;
  path: string;
}

interface Finding {
  dir: string;
  name: string;
  short: string;
  localVersion: string;
  npmCount: number;
  tagCount: number;
  orphan: string[];
  missing: string[];
  noRelease: string[];
}

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const value = (name: string, fallback?: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

const REPORT = !flag('--backfill-missing') && !flag('--cleanup-orphans') && !flag('--create-releases');
const BACKFILL = flag('--backfill-missing');
const CLEANUP = flag('--cleanup-orphans');
const CREATE_RELEASES = flag('--create-releases');
const JSON_OUT = flag('--json');
const QUIET = flag('--quiet');
const CONFIRM = flag('--confirm');
const PKG_FILTER = value('--pkg');

if (CLEANUP && !CONFIRM) {
  console.error('--cleanup-orphans is destructive (deletes git tags locally + on origin).');
  console.error('Re-run with --confirm to proceed.');
  process.exit(2);
}

function sh(cmd: string): string {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
function shOk(cmd: string): boolean {
  try {
    sh(cmd);
    return true;
  } catch {
    return false;
  }
}
function shOpt(cmd: string): string {
  try {
    return sh(cmd);
  } catch {
    return '';
  }
}
function log(msg: string) {
  if (!QUIET && !JSON_OUT) console.log(msg);
}

function listPackages(): Package[] {
  const out: Package[] = [];
  for (const dir of readdirSync('packages')) {
    const pkgPath = join('packages', dir, 'package.json');
    if (!existsSync(pkgPath)) continue;
    let pkg: { name?: string; version?: string; private?: boolean };
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    } catch {
      continue;
    }
    if (pkg.private) continue;
    if (!pkg.name || !pkg.version) continue;
    out.push({ dir, name: pkg.name, version: pkg.version, path: join('packages', dir) });
  }
  return out;
}

function shortName(pkgName: string): string {
  return pkgName.replace(/^@[^/]+\//, '');
}

function gitTagsFor(short: string): Set<string> {
  const out = shOpt(`git tag --list "${short}@*"`);
  return new Set(
    out
      .split('\n')
      .filter(Boolean)
      .map((tag) => tag.slice(short.length + 1)),
  );
}

function npmVersionsFor(name: string): Set<string> {
  const raw = shOpt(`npm view "${name}" versions --json 2>/dev/null`);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : [parsed]);
  } catch {
    return new Set();
  }
}

function findCommitForVersion(pkgPath: string, version: string): string | null {
  const log = shOpt(`git log --reverse --format=%H -- "${pkgPath}/package.json"`);
  for (const sha of log.split('\n').filter(Boolean)) {
    const blob = shOpt(`git show "${sha}:${pkgPath}/package.json" 2>/dev/null`);
    if (!blob) continue;
    try {
      const ver = JSON.parse(blob).version as string;
      if (ver === version) return sha;
    } catch {
      /* skip */
    }
  }
  return null;
}

function ghReleaseExists(tag: string): boolean {
  return shOk(`gh release view "${tag}" --json tagName 2>/dev/null`);
}

function diffSets(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((x) => !b.has(x));
}

const packages = listPackages().filter((p) =>
  PKG_FILTER ? p.dir === PKG_FILTER || p.name === PKG_FILTER || shortName(p.name) === PKG_FILTER : true,
);

if (packages.length === 0) {
  console.error(PKG_FILTER ? `No package matches --pkg "${PKG_FILTER}".` : 'No public packages found.');
  process.exit(2);
}

const findings: Finding[] = [];
let totalOrphan = 0;
let totalMissing = 0;
let totalNoRelease = 0;

for (const pkg of packages) {
  const short = shortName(pkg.name);
  const tags = gitTagsFor(short);
  const npmVersions = npmVersionsFor(pkg.name);

  const orphan = diffSets(tags, npmVersions);
  const missing = diffSets(npmVersions, tags);
  totalOrphan += orphan.length;
  totalMissing += missing.length;

  let noRelease: string[] = [];
  if (CREATE_RELEASES) {
    noRelease = [...tags].filter((v) => !ghReleaseExists(`${short}@${v}`));
    totalNoRelease += noRelease.length;
  }

  findings.push({
    dir: pkg.dir,
    name: pkg.name,
    short,
    localVersion: pkg.version,
    npmCount: npmVersions.size,
    tagCount: tags.size,
    orphan,
    missing,
    noRelease,
  });
}

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        summary: {
          packages: findings.length,
          orphanTags: totalOrphan,
          missingTags: totalMissing,
          missingReleases: totalNoRelease,
        },
        findings,
      },
      null,
      2,
    ),
  );
} else {
  log('Tag/npm reconciliation report');
  log('  ' + new Date().toISOString());
  log('');
  for (const f of findings) {
    if (f.orphan.length === 0 && f.missing.length === 0 && f.noRelease.length === 0) {
      log(`  ✓ ${f.name}  (tags=${f.tagCount}, npm=${f.npmCount})`);
      continue;
    }
    log(`  ✗ ${f.name}`);
    if (f.orphan.length > 0) log(`      orphan tags (no npm version):  ${f.orphan.join(', ')}`);
    if (f.missing.length > 0) log(`      missing tags (npm without tag): ${f.missing.join(', ')}`);
    if (f.noRelease.length > 0) log(`      tags without GH Release:       ${f.noRelease.join(', ')}`);
  }
  log('');
  log(
    `Summary: ${findings.length} package(s) · ${totalOrphan} orphan tag(s) · ${totalMissing} missing tag(s)${
      CREATE_RELEASES ? ` · ${totalNoRelease} missing release(s)` : ''
    }`,
  );
}

if (BACKFILL) {
  for (const f of findings) {
    for (const ver of f.missing) {
      const tag = `${f.short}@${ver}`;
      const fullPath = join('packages', f.dir);
      const targetSha = findCommitForVersion(fullPath, ver);
      if (!targetSha) {
        log(`  ⚠ ${tag}: could not find commit for version ${ver} (skipped).`);
        continue;
      }
      if (shOk(`git rev-parse -q --verify "refs/tags/${tag}"`)) {
        log(`  ↻ ${tag} already exists locally — re-pushing only.`);
      } else {
        sh(`git tag -a "${tag}" -m "Backfill release ${tag}" "${targetSha}"`);
        log(`  + ${tag} → ${targetSha.slice(0, 7)}`);
      }
      shOk(`git push origin "${tag}"`);
    }
  }
}

if (CLEANUP) {
  for (const f of findings) {
    for (const ver of f.orphan) {
      const tag = `${f.short}@${ver}`;
      shOk(`git tag -d "${tag}"`);
      shOk(`git push --delete origin "${tag}"`);
      log(`  − ${tag} (orphan: no npm version)`);
    }
  }
}

if (CREATE_RELEASES) {
  for (const f of findings) {
    for (const ver of f.noRelease) {
      const tag = `${f.short}@${ver}`;
      const fullPath = join('packages', f.dir);
      const notes = shOpt(`npx tsx scripts/extract-changelog.ts "${fullPath}" "${ver}" --fallback`);
      const tmp = `/tmp/notes-${tag.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
      writeFileSync(tmp, notes);
      const ok = shOk(`gh release create "${tag}" --title "${f.name}@${ver}" --notes-file "${tmp}" --latest=false`);
      if (ok) {
        log(`  + GH Release: ${tag}`);
      } else {
        log(`  ⚠ Failed to create release for ${tag} (does the tag exist on origin?).`);
      }
    }
  }
}

const drift = totalOrphan + totalMissing + totalNoRelease;
if (REPORT && drift > 0) process.exit(1);
process.exit(0);

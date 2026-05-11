#!/usr/bin/env tsx

/**
 * extract-changelog.ts — pull a single version's section out of a CHANGELOG.md.
 *
 * Used by release.yml to feed GitHub Release notes from changesets-generated
 * CHANGELOG entries. Standalone so it can also be called locally to preview
 * what notes a given release will carry.
 *
 * Usage:
 *   tsx scripts/extract-changelog.ts <package-dir> <version>
 *   tsx scripts/extract-changelog.ts packages/eslint-plugin-node-security 2.3.0
 *   tsx scripts/extract-changelog.ts packages/eslint-plugin-node-security 2.3.0 --fallback
 *
 * Flags:
 *   --fallback     If the version isn't found, emit a generic stub instead
 *                  of exiting non-zero (used by CI so a missing CHANGELOG
 *                  doesn't block a release).
 *
 * Exit codes:
 *   0   notes printed to stdout
 *   1   version not found in CHANGELOG and --fallback not set
 *   2   bad arguments / package dir missing
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const FALLBACK = args.includes('--fallback');
const positional = args.filter((a) => !a.startsWith('--'));
const [pkgDir, version] = positional;

if (!pkgDir || !version) {
  console.error('Usage: extract-changelog.ts <package-dir> <version> [--fallback]');
  process.exit(2);
}

const changelogPath = path.join(pkgDir, 'CHANGELOG.md');
const pkgJsonPath = path.join(pkgDir, 'package.json');

if (!fs.existsSync(pkgJsonPath)) {
  console.error(`No package.json at ${pkgJsonPath}`);
  process.exit(2);
}

let pkgName = '';
try {
  pkgName = (JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).name as string) ?? path.basename(pkgDir);
} catch {
  pkgName = path.basename(pkgDir);
}

function fallbackNotes(): string {
  return `## ${pkgName}@${version}\n\nSee package CHANGELOG for details (auto-generation pending).\n`;
}

if (!fs.existsSync(changelogPath)) {
  if (FALLBACK) {
    process.stdout.write(fallbackNotes());
    process.exit(0);
  }
  console.error(`No CHANGELOG.md at ${changelogPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(changelogPath, 'utf8').split('\n');

// Accept two CHANGELOG dialects:
//   1. changesets default:    "## 2.2.3"
//   2. keep-a-changelog-ish:  "## [2.2.3] - 2026-02-08"
const escapedVer = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const headingRe = new RegExp(`^##\\s+\\[?${escapedVer}\\]?\\b`);
let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (headingRe.test(lines[i])) {
    start = i;
    break;
  }
}

if (start === -1) {
  if (FALLBACK) {
    process.stdout.write(fallbackNotes());
    process.exit(0);
  }
  console.error(`Version ${version} not found in ${changelogPath}.`);
  process.exit(1);
}

let end = lines.length;
for (let i = start + 1; i < lines.length; i++) {
  if (/^##\s/.test(lines[i])) {
    end = i;
    break;
  }
}

const slice = lines.slice(start, end);
while (slice.length > 0 && slice[slice.length - 1].trim() === '') slice.pop();

process.stdout.write(slice.join('\n') + '\n');

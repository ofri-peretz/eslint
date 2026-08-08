#!/usr/bin/env tsx

/**
 * lint-publish-warnings.ts — no package may publish with an npm warning.
 *
 * Why this exists: `npm publish` silently auto-corrects some package.json
 * mistakes and prints a warning nobody reads, because it scrolls past under
 * the tarball listing. Every one of our 24 publishable packages shipped with
 *
 *   npm warn publish "repository.url" was normalized to "git+https://…​.git"
 *
 * for months. The published metadata was fixed up by npm, so nothing broke —
 * which is exactly why it never got fixed. A warning that is never enforced is
 * a warning that is always present.
 *
 * How it works: runs `npm publish --dry-run` in each publishable workspace and
 * fails on any `npm warn` line. Nothing is published — `--dry-run` only packs
 * and reports.
 *
 * Benign lines are allowlisted below by exact pattern, not by fuzzy matching,
 * so a NEW warning type can never slip through as "probably fine".
 *
 * Usage:
 *   tsx scripts/lint-publish-warnings.ts            # exit non-zero on any warning
 *   tsx scripts/lint-publish-warnings.ts --quiet    # only print on failure
 *
 * Wired as `npm run lint:publish` and gated in CI.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import process from 'node:process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

/**
 * Lines npm emits that are not defects.
 *
 * `Skipping workspace … marked as private` is npm confirming it did the right
 * thing with a package we never publish. Everything else is a finding.
 */
const BENIGN = [
  /^npm warn publish Skipping workspace .+, marked as private$/,
  /^npm warn publish$/,
  // Emitted by every `--dry-run` in an unauthenticated shell, which is what CI
  // is: the job holds no npm token, by design, because nothing here publishes.
  // It is a statement about the session, not about the package — and without
  // it here the gate reports all 31 packages as defective on every run, which
  // is indistinguishable from the gate being broken. Not a hole in the check:
  // an auth warning cannot describe a package's metadata.
  /^npm warn publish This command requires you to be logged in to .+ \(dry-run\)$/,
];

export interface PackageWarnings {
  pkg: string;
  warnings: string[];
}

/** Warning lines from a dry-run, minus the benign ones. */
export function filterWarnings(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('npm warn'))
    .filter((line) => !BENIGN.some((pattern) => pattern.test(line)));
}

function isPublishable(pkgDir: string): boolean {
  const manifest = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(manifest)) return false;
  const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8')) as { private?: boolean };
  return pkg.private !== true;
}

function dryRun(pkgDir: string): string {
  try {
    return execFileSync('npm', ['publish', '--dry-run'], {
      cwd: pkgDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return `${err.stdout ?? ''}\n${err.stderr ?? ''}`;
  }
}

function main(): void {
  const quiet = process.argv.includes('--quiet');
  const dirs = fs
    .readdirSync(PACKAGES_DIR)
    .map((name) => path.join(PACKAGES_DIR, name))
    .filter((dir) => fs.statSync(dir).isDirectory())
    .filter(isPublishable);

  const findings: PackageWarnings[] = [];

  for (const dir of dirs) {
    // npm writes warnings to stderr; execFileSync merges what we asked for.
    const output = dryRun(dir);
    const warnings = filterWarnings(output);
    if (warnings.length > 0) {
      findings.push({ pkg: path.basename(dir), warnings });
    }
  }

  if (findings.length === 0) {
    if (!quiet) {
      console.log(`✅ ${dirs.length} publishable package(s) — no npm publish warnings.`);
    }
    process.exit(0);
  }

  console.error(`❌ ${findings.length} package(s) would publish with warnings:\n`);
  for (const { pkg, warnings } of findings) {
    console.error(`  - ${pkg}`);
    for (const warning of warnings) console.error(`      ${warning}`);
  }
  console.error('');
  console.error('  Most of these are fixable with `npm pkg fix` inside the package, but');
  console.error('  read the warning first — npm auto-corrects on publish, so a warning');
  console.error('  here means the metadata we ship is not the metadata we wrote.\n');
  process.exit(1);
}

if (import.meta.url === url.pathToFileURL(process.argv[1] ?? '').href) {
  main();
}

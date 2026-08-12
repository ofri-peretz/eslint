#!/usr/bin/env tsx

/**
 * check-orphan-lockfiles.ts
 *
 * Fails closed if a `package-lock.json` sits at the root of an npm-workspace
 * member (`packages/<pkg>/`, `apps/<app>/`, `tools/<tool>/`).
 *
 * Why this is a security gate and not a tidiness gate: npm resolves a
 * workspace install entirely from the ROOT lockfile — a lockfile inside a
 * workspace member is never read, never updated by `npm install`, and never
 * seen by `npm audit`. It just sits there pinning whatever versions were
 * current the day someone ran `npm install` in that directory.
 *
 * Scanners disagree with npm about this. OSV-Scanner (which is what OpenSSF
 * Scorecard's Vulnerabilities check runs) walks *every* lockfile it finds. On
 * 2026-08-12 this repo scored 0/10 on that check — 29 vulnerabilities — and
 * all 29 came from two such files:
 *
 *   packages/eslint-plugin-secure-coding/package-lock.json   (16, stale 8 months)
 *   packages/eslint-plugin-browser-security/package-lock.json (12, stale 7 months)
 *
 * `npm audit` reported one low-severity finding the whole time, because npm
 * correctly ignored both files. Deleting them took the OSV count to zero.
 *
 * Deeper nested lockfiles are deliberate and allowed: the benchmark suites
 * under `benchmarks/suites` and each plugin's own `benchmark` directory are
 * isolated fixture workspaces that must pin their own dependency trees. Only
 * a lockfile at a workspace member's ROOT is an orphan.
 *
 * Wired into `npm run quality`.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..');

/** Directories whose immediate children are npm-workspace members. */
const WORKSPACE_PARENTS = ['packages', 'apps', 'tools'] as const;

const offenders: string[] = [];

for (const parent of WORKSPACE_PARENTS) {
  const parentDir = join(REPO_ROOT, parent);
  let members: string[];
  try {
    members = readdirSync(parentDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    // A checkout without this directory is not this gate's failure mode.
    continue;
  }

  for (const member of members) {
    const lockfile = join(parentDir, member, 'package-lock.json');
    if (existsSync(lockfile)) {
      offenders.push(relative(REPO_ROOT, lockfile));
    }
  }
}

if (offenders.length > 0) {
  console.error('✖ Orphan lockfile(s) inside npm-workspace members:\n');
  for (const file of offenders) {
    console.error(`  ${file}`);
  }
  console.error(
    [
      '',
      'npm ignores these; OSV-Scanner and OpenSSF Scorecard do not. They will',
      'go stale immediately and report vulnerabilities that `npm audit` cannot',
      'see and `npm audit fix` cannot fix.',
      '',
      'Delete them — the root package-lock.json is the only lockfile npm reads:',
      '',
      `  git rm ${offenders.join(' ')}`,
      '',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(
  `✓ No orphan lockfiles in ${WORKSPACE_PARENTS.map((p) => `${p}/*`).join(', ')}`,
);

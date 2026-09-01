/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every workspace package's version, against what npm actually serves.
 *
 * A number that stops being produced looks exactly like a number that has not
 * changed. Five packages sat bumped-but-unpublished on `main` and the only
 * thing that noticed was the benchmark corpus scan, by accident — it pins its
 * rig to package.json versions, so its install died on a version npm did not
 * have.
 *
 * NOT a PR gate. A probe against a third-party registry has no business
 * blocking an unrelated change; this runs on a schedule and reports.
 *
 *   npx tsx scripts/check-release-drift.ts
 *   npx tsx scripts/check-release-drift.ts --json
 *
 * See docs/intents/2026-08-31-a-stuck-release-announces-itself.md
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const AS_JSON = process.argv.includes('--json');

export type Row = {
  name: string;
  local: string;
  published: string | null;
  state: 'ok' | 'behind' | 'never-published';
};

/**
 * What a (local, published) pair means.
 *
 * Exported and pure so the classification can be tested against synthetic
 * pairs. Testing it only through the live registry would mean the drift branch
 * is exercised exactly when a release is broken — which is never, in CI, until
 * it matters.
 */
export function classify(local: string, published: string | null): Row['state'] {
  if (published === null) return 'never-published';
  return published === local ? 'ok' : 'behind';
}

/** Workspace packages that are actually publishable. */
function publishablePackages(): { name: string; version: string }[] {
  const out: { name: string; version: string }[] = [];
  const dir = path.join(ROOT, 'packages');
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = path.join(dir, entry.name, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8')) as {
      name?: string;
      version?: string;
      private?: boolean;
    };
    // `private: true` is never published, so it can never drift.
    if (pkg.private === true) continue;
    if (!pkg.name || !pkg.version) continue;
    out.push({ name: pkg.name, version: pkg.version });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The version npm serves, or null when the package has never been published.
 *
 * The registry, deliberately, and not the lockfile: a lockfile records what we
 * resolved, not what the public can install. Those are the same number right
 * up until the moment this check exists to catch.
 */
function publishedVersion(name: string): string | null {
  try {
    return execFileSync('npm', ['view', `${name}`, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function collect(): Row[] {
  return publishablePackages().map(({ name, version }) => {
  const published = publishedVersion(name);
  const state = classify(version, published);
  return { name, local: version, published, state };
  });
}

/** Rendered only when this file is the entry point, so tests can import it. */
function main(): number {
  const rows = collect();
// A brand-new plugin before its first release is not a stuck release, so it is
// reported separately rather than counted as drift.
const behind = rows.filter((r) => r.state === 'behind');
const never = rows.filter((r) => r.state === 'never-published');

if (AS_JSON) {
  console.log(JSON.stringify({ behind, never, checked: rows.length }, null, 2));
} else {
  console.log(`\n  ${rows.length} publishable package(s) checked.\n`);
  if (behind.length > 0) {
    console.log(`  ⛔ ${behind.length} package(s) bumped on main but NOT on npm:\n`);
    for (const r of behind) {
      console.log(`     ${r.name.padEnd(38)} local ${r.local}  npm ${r.published}`);
    }
    console.log(
      '\n  A release did not finish. Check the most recent `release.yml` run —\n' +
        '  a job can report `failure` after a successful publish, and a run can\n' +
        '  sit in status `waiting` on an environment approval indefinitely.\n',
    );
  }
  if (never.length > 0) {
    console.log(`  ℹ️  ${never.length} never published (not drift): ${never.map((r) => r.name).join(', ')}\n`);
  }
  if (behind.length === 0) {
    console.log('  ✅ every published package matches npm.\n');
  }
}

  return behind.length > 0 ? 1 : 0;
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  process.exit(main());
}


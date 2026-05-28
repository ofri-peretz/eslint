#!/usr/bin/env node

/**
 * Point each plugin package's `homepage` at its docs page with npm-sourced
 * UTMs, so clicks from the npm package page attribute separately from GitHub
 * README clicks (utm_source=npm vs utm_source=github).
 *
 * Only the 20 registry plugins are repointed — they have a canonical
 * /docs/<pillar>/plugin-<slug> page. Tooling packages (config, devkit,
 * formatter) keep their GitHub `#readme` homepage; they have no docs route.
 *
 * Edits only the homepage string in place (no JSON re-serialization) so file
 * formatting and key order are preserved exactly.
 *
 * Usage:  npx tsx scripts/sync-package-homepages.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildUtmHref } from './utm';
import { loadPluginRegistry } from './sync-readme-rules';

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');
const DOCS_BASE_URL = 'https://eslint.interlace.tools';
const HOMEPAGE_RE = /("homepage":\s*")[^"]*(")/;

function main(): void {
  const dryRun = process.argv.includes('--dry-run');
  console.log('🏠 Sync plugin package.json homepages → docs (utm_source=npm)');
  if (dryRun) console.log('📋 DRY RUN — no files will be modified');

  const registry = loadPluginRegistry();
  let changed = 0;
  let missing = 0;

  for (const entry of registry) {
    const pkgPath = path.join(PACKAGES_DIR, entry.package, 'package.json');
    let raw: string;
    try {
      raw = fs.readFileSync(pkgPath, 'utf-8');
    } catch {
      console.warn(`⏭️  ${entry.package}: no package.json`);
      missing++;
      continue;
    }

    const homepage = buildUtmHref(
      `${DOCS_BASE_URL}/docs/${entry.pillar}/plugin-${entry.slug}`,
      { source: 'npm', medium: 'referral', campaign: entry.package },
    );

    if (!HOMEPAGE_RE.test(raw)) {
      console.warn(`⏭️  ${entry.package}: no homepage field`);
      missing++;
      continue;
    }
    const next = raw.replace(HOMEPAGE_RE, (_m, p1: string, p2: string) => `${p1}${homepage}${p2}`);
    if (next === raw) continue;

    if (!dryRun) fs.writeFileSync(pkgPath, next);
    changed++;
    console.log(`${dryRun ? '· would set' : '✓ set'} ${entry.package} → ${homepage}`);
  }

  console.log('='.repeat(60));
  console.log(`${dryRun ? 'DRY RUN — ' : ''}updated ${changed} homepage(s), ${missing} skipped`);
}

if (require.main === module) {
  main();
}

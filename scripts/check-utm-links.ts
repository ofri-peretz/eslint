#!/usr/bin/env node

/**
 * Regression lock: every link to one of our web properties in a published
 * README — and every plugin's package.json `homepage` — must carry a valid
 * `utm_source` from the fixed taxonomy.
 *
 * This is the lock half of the UTM rollout (UTM_PHILOSOPHY.md): the generator
 * (sync-readme-rules.ts) and stamper (stamp-utm-links.ts) PRODUCE stamped
 * links; this check FAILS CI if a new, un-stamped owned-property link slips in.
 * Revert either of those and this exits non-zero — which is the test.
 *
 * Asset URLs (.svg/.png/…) are exempt: a UTM on an <img src> is meaningless and
 * breaks GitHub's camo image proxy.
 *
 * Usage:  npx tsx scripts/check-utm-links.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  VALID_UTM_SOURCES,
  VALID_UTM_MEDIUMS,
  isOwnedContentLink,
  hasUtm,
} from './utm';

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

const URL_RE = /https?:\/\/[^\s)\]"'<>]+/g;
const TRAILING_PUNCT_RE = /[.,:;!?]+$/;

interface Violation {
  file: string;
  url: string;
  reason: string;
}

function utmValueOf(url: string, key: 'utm_source' | 'utm_medium'): string | null {
  const m = url.match(new RegExp(`[?&]${key}=([^&#]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function scanMarkdown(file: string, violations: Violation[]): void {
  const content = fs.readFileSync(file, 'utf-8');
  const rel = path.relative(ROOT_DIR, file);
  for (const raw of content.match(URL_RE) ?? []) {
    const trail = raw.match(TRAILING_PUNCT_RE)?.[0] ?? '';
    const url = trail ? raw.slice(0, -trail.length) : raw;
    if (!isOwnedContentLink(url)) continue;
    if (!hasUtm(url)) {
      violations.push({ file: rel, url, reason: 'missing utm_source' });
      continue;
    }
    const source = utmValueOf(url, 'utm_source');
    const medium = utmValueOf(url, 'utm_medium');
    if (source && !VALID_UTM_SOURCES.has(source)) {
      violations.push({ file: rel, url, reason: `utm_source "${source}" not in taxonomy` });
    }
    if (medium && !VALID_UTM_MEDIUMS.has(medium)) {
      violations.push({ file: rel, url, reason: `utm_medium "${medium}" not in taxonomy` });
    }
  }
}

function scanHomepage(pkgJsonPath: string, violations: Violation[]): void {
  const rel = path.relative(ROOT_DIR, pkgJsonPath);
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as { homepage?: string };
  const url = pkg.homepage;
  if (!url || !isOwnedContentLink(url)) return; // GitHub homepages are exempt
  if (!hasUtm(url)) {
    violations.push({ file: rel, url, reason: 'homepage to our site missing utm_source' });
    return;
  }
  const source = utmValueOf(url, 'utm_source');
  if (source && !VALID_UTM_SOURCES.has(source)) {
    violations.push({ file: rel, url, reason: `homepage utm_source "${source}" not in taxonomy` });
  }
}

function main(): void {
  const violations: Violation[] = [];

  const rootReadme = path.join(ROOT_DIR, 'README.md');
  if (fs.existsSync(rootReadme)) scanMarkdown(rootReadme, violations);

  let dirs: string[] = [];
  try {
    dirs = fs.readdirSync(PACKAGES_DIR);
  } catch {
    dirs = [];
  }
  for (const dir of dirs) {
    const readme = path.join(PACKAGES_DIR, dir, 'README.md');
    if (fs.existsSync(readme)) scanMarkdown(readme, violations);
    const pkgJson = path.join(PACKAGES_DIR, dir, 'package.json');
    if (fs.existsSync(pkgJson)) scanHomepage(pkgJson, violations);
  }

  if (violations.length > 0) {
    console.error(`✗ ${violations.length} un-attributed link(s) to our properties:\n`);
    for (const v of violations) {
      console.error(`  ${v.file}\n    ${v.url}\n    → ${v.reason}`);
    }
    console.error(
      '\nRun `npm run sync-readmes` to stamp README links, or `npm run sync:homepages` for package homepages.',
    );
    process.exit(1);
  }

  console.log('✓ All owned-property links carry a valid utm_source.');
}

if (require.main === module) {
  main();
}

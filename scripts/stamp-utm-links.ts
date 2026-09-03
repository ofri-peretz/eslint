#!/usr/bin/env node

/**
 * Stamp inbound UTMs on links to our web properties in published markdown.
 *
 * READMEs are rendered on GitHub and npm — every link from them into our sites
 * is an inbound-attribution opportunity. This stamps `utm_source=github`
 * `utm_medium=referral` (+ `utm_campaign=<package>`) onto each owned-property
 * link that isn't already tagged. Idempotent: a second run is a no-op.
 *
 * The rule-table links inside the AUTO-GENERATED markers are already stamped by
 * sync-readme-rules.ts; this pass covers the hand-written links (header logo
 * link, overview links, badges) and the root README. Asset URLs (.svg/.png/…)
 * are never stamped — a UTM on an <img src> is meaningless and breaks GitHub's
 * camo image proxy.
 *
 * Usage:  npx tsx scripts/stamp-utm-links.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildUtmHref, hasUtm, isOwnedContentLink } from './utm';

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT_DIR, 'packages');

// A URL token in markdown/HTML: stop at whitespace, a closing paren/bracket, a
// quote, or an angle bracket so `[txt](url)`, `<url>`, and `src="url"` all clip
// cleanly.
const URL_RE = /https?:\/\/[^\s)\]"'<>]+/g;
const TRAILING_PUNCT_RE = /[.,:;!?]+$/;

export function stampContent(
  content: string,
  campaign: string,
): { content: string; changed: number } {
  let changed = 0;
  const next = content.replace(URL_RE, (raw) => {
    // Prose sometimes glues punctuation to a URL ("see https://x.tools."). Peel
    // it off so it doesn't become part of the stamped link.
    const trail = raw.match(TRAILING_PUNCT_RE)?.[0] ?? '';
    const url = trail ? raw.slice(0, -trail.length) : raw;
    if (!isOwnedContentLink(url) || hasUtm(url)) return raw;
    let stamped: string;
    try {
      stamped = buildUtmHref(url, { source: 'github', medium: 'referral', campaign });
    } catch {
      return raw;
    }
    changed++;
    return stamped + trail;
  });
  return { content: next, changed };
}

interface Target {
  file: string;
  campaign: string;
}

function collectTargets(): Target[] {
  const targets: Target[] = [];
  const rootReadme = path.join(ROOT_DIR, 'README.md');
  if (fs.existsSync(rootReadme)) targets.push({ file: rootReadme, campaign: 'monorepo' });

  let dirs: string[] = [];
  try {
    dirs = fs.readdirSync(PACKAGES_DIR);
  } catch {
    dirs = [];
  }
  for (const dir of dirs.toSorted()) {
    const readme = path.join(PACKAGES_DIR, dir, 'README.md');
    if (fs.existsSync(readme)) targets.push({ file: readme, campaign: dir });
  }
  return targets;
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run');
  console.log('🔗 Stamp UTM links on published READMEs');
  if (dryRun) console.log('📋 DRY RUN — no files will be modified');

  const targets = collectTargets();
  let totalChanged = 0;
  let filesChanged = 0;

  for (const t of targets) {
    const before = fs.readFileSync(t.file, 'utf-8');
    const { content, changed } = stampContent(before, t.campaign);
    if (changed > 0 && content !== before) {
      if (!dryRun) fs.writeFileSync(t.file, content);
      filesChanged++;
      totalChanged += changed;
      console.log(
        `${dryRun ? '· would stamp' : '✓ stamped'} ${changed} link(s) in ${path.relative(ROOT_DIR, t.file)} [utm_campaign=${t.campaign}]`,
      );
    }
  }

  console.log('='.repeat(60));
  console.log(
    `${dryRun ? 'DRY RUN — ' : ''}stamped ${totalChanged} link(s) across ${filesChanged} file(s)`,
  );
}

if (require.main === module) {
  main();
}

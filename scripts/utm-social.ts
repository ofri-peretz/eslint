#!/usr/bin/env node

/**
 * Emit a UTM-tagged link to one of our properties for a social surface
 * (LinkedIn / X bios + posts). Social platforms can't be auto-instrumented, so
 * this is the blessed way to hand-build a link you paste manually — it
 * validates source/medium against the fixed taxonomy (UTM_PHILOSOPHY.md) so a
 * pasted link is always attributable.
 *
 * Usage:
 *   npx tsx scripts/utm-social.ts --to <dest> --source <src> [--campaign <c>] \
 *       [--path </p>] [--medium social] [--content <c>]
 *
 *   dest:    blog | landing | eslint | serverless | ds | storybook
 *   source:  linkedin | x  (any taxonomy source is accepted)
 *
 * Example:
 *   npx tsx scripts/utm-social.ts --to eslint --source linkedin \
 *       --campaign launch --path /docs/security/plugin-node-security
 */

import { buildUtmHref, VALID_UTM_SOURCES, VALID_UTM_MEDIUMS } from './utm';

const DESTINATIONS: Record<string, string> = {
  blog: 'https://ofriperetz.dev',
  landing: 'https://interlace.tools',
  eslint: 'https://eslint.interlace.tools',
  serverless: 'https://serverless.interlace.tools',
  ds: 'https://ds.interlace.tools',
  storybook: 'https://storybook.interlace.tools',
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function usage(msg?: string): never {
  if (msg) console.error(`\n✗ ${msg}\n`);
  console.error('Usage: npx tsx scripts/utm-social.ts --to <dest> --source <src> [--campaign <c>] [--path </p>] [--medium social] [--content <c>]');
  console.error(`  dest:    ${Object.keys(DESTINATIONS).join(' | ')}`);
  console.error(`  source:  ${[...VALID_UTM_SOURCES].join(' | ')}`);
  console.error(`  medium:  ${[...VALID_UTM_MEDIUMS].join(' | ')}  (default: social)`);
  process.exit(msg ? 1 : 0);
}

function main(): void {
  if (process.argv.includes('--help') || process.argv.length <= 2) usage();

  const to = arg('to');
  const source = arg('source');
  const medium = arg('medium') ?? 'social';
  const campaign = arg('campaign');
  const content = arg('content');
  const subpath = arg('path') ?? '';

  if (!to || !DESTINATIONS[to]) usage(`--to must be one of: ${Object.keys(DESTINATIONS).join(', ')}`);
  if (!source) usage('--source is required');

  const base = DESTINATIONS[to as keyof typeof DESTINATIONS];
  const href = subpath ? `${base.replace(/\/$/, '')}/${subpath.replace(/^\//, '')}` : base;

  try {
    console.log(buildUtmHref(href, { source: source!, medium, campaign, content }));
  } catch (e) {
    usage(e instanceof Error ? e.message : String(e));
  }
}

if (require.main === module) {
  main();
}

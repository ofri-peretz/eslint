#!/usr/bin/env node
/**
 * Deterministic OG-image generator for the Interlace ESLint docs site.
 *
 * Renders every card as one flat SVG on the frozen brand chassis, then
 * rasterizes with local headless Chrome. No paid APIs, no network calls,
 * no design-model round trips — the chassis is fixed, only the plugin
 * copy (pulled from the canonical registry) varies. $0 per run.
 *
 * Outputs:
 *   apps/docs/public/og-image.jpg           — site-wide card (JPEG)
 *   apps/docs/public/images/og-<slug>.png    — one per PLUGINS entry (PNG)
 *
 * The <slug> in the output filename matches `pkg.replace('eslint-plugin-', '')`
 * exactly as computed by tools/scripts/fix-readmes.ts (`pluginName`), which is
 * what every package README's footer banner links to
 * (https://eslint.interlace.tools/images/og-${pluginName}.png). Do not change
 * this naming scheme without updating fix-readmes.ts in lockstep.
 *
 * Usage:
 *   node apps/docs/scripts/generate-og-images.mjs            # everything
 *   node apps/docs/scripts/generate-og-images.mjs --site-only
 *   node apps/docs/scripts/generate-og-images.mjs --plugins-only
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLUGINS } from '../src/lib/plugins.ts';

/**
 * Published packages that carry the same README banner but are NOT plugins, so
 * they don't (and shouldn't) appear in the PLUGINS registry that drives the docs
 * sidebar. Same card shape — `pillar` is the footer tag and picks the accent.
 * Only add entries here for packages that are actually published to npm.
 */
const EXTRAS = [
  {
    slug: 'devkit',
    package: '@interlace/eslint-devkit',
    pillar: 'tooling',
    description: 'AST helpers & rule testing',
  },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(DOCS_ROOT, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

// ── Frozen brand chassis — do not invent new values here. ───────────────────
const W = 1200;
const H = 630;
const GROUND = '#0a0a0a';
const HAIR = '#22262c';
const ORANGE = '#f4794a';
const GREEN = '#0d9460';
const INK = '#f0f3f6'; // hero text — AA on #0a0a0a
const MUTED = '#9aa4b2'; // descriptor text — AA on #0a0a0a
const DIM = '#6b7280'; // wordmark / footer — decorative, not a body-copy color
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const RAIL = 64;
const RIGHT_MARGIN = 64;
const FIT = W - RAIL - RIGHT_MARGIN; // 1072 — usable width for the hero line

const HERO_BASE = 346;
const DESC_BASE = 420;
const KICKER_Y = 270;
const SEAM_Y = 487;
const WORDMARK_Y = 567;

const HERO_FLOOR = 56; // brief requires hero ≥56px
const HERO_CAP = 72;
const ADVANCE = 0.6; // mono glyph advance, in ems — matches render-cover.sh

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Fit the hero string into FIT px, floor 56 / cap 72, mono advance ~0.6em. */
function heroSize(text) {
  const n = text.length;
  const fitted = FIT / (n * ADVANCE);
  return Math.max(HERO_FLOOR, Math.min(HERO_CAP, Math.round(fitted)));
}

/** The mark — fixed geometry, both accents always present. Top-left, on the rail. */
function markSVG() {
  return `
  <g transform="translate(${RAIL - 8},44) scale(1.5)">
    <g transform="rotate(-30 50 50)">
      <rect x="11" y="28" width="58" height="20" rx="10" fill="${ORANGE}"/>
      <rect x="31" y="52" width="58" height="20" rx="10" fill="${GREEN}"/>
    </g>
  </g>`;
}

/**
 * Per-plugin card: hero = package name, muted one-liner = registry description.
 * Accent discipline (~80/15/5): the kicker bar and the pillar tag are the only
 * accent-colored elements, and which color they use encodes the pillar — the
 * mark itself always carries both colors regardless.
 */
function pluginCardSVG(plugin) {
  const accent = plugin.pillar === 'security' ? ORANGE : GREEN;
  const hero = plugin.package;
  const hs = heroSize(hero);
  const desc = plugin.description;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${GROUND}"/>
${markSVG()}

  <!-- pillar kicker — the accent that leads for this card -->
  <path d="M${RAIL} ${KICKER_Y} H${RAIL + 140}" stroke="${accent}" stroke-width="6" stroke-linecap="butt"/>

  <text x="${RAIL}" y="${HERO_BASE}" font-family="${MONO}" font-size="${hs}" font-weight="600" fill="${INK}">${esc(hero)}</text>
  <text x="${RAIL}" y="${DESC_BASE}" font-family="${MONO}" font-size="30" fill="${MUTED}">${esc(desc)}</text>

  <path d="M0 ${SEAM_Y} H${W}" stroke="${HAIR}" stroke-width="2"/>

  <text x="${RAIL}" y="${WORDMARK_Y}" font-family="${MONO}" font-size="26" fill="${DIM}">interlace</text>
  <text x="${W - RIGHT_MARGIN}" y="${WORDMARK_Y}" text-anchor="end" font-family="${MONO}" font-size="26" fill="${accent}">${esc(plugin.pillar)}</text>
</svg>`;
}

/**
 * Site-wide card: hero is fixed copy ("interlace eslint"), descriptor pulled
 * from the docs homepage tagline (root layout.tsx metadata.description,
 * condensed to one line). Not pillar-scoped, so the kicker is split
 * orange/green to show both accents belong to the whole system.
 */
function siteCardSVG() {
  const hero = 'interlace eslint';
  const desc = 'Security & quality ESLint plugins for JavaScript & TypeScript';
  const hs = heroSize(hero);
  const kickerHalf = 70;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${GROUND}"/>
${markSVG()}

  <path d="M${RAIL} ${KICKER_Y} H${RAIL + kickerHalf}" stroke="${ORANGE}" stroke-width="6" stroke-linecap="butt"/>
  <path d="M${RAIL + kickerHalf} ${KICKER_Y} H${RAIL + kickerHalf * 2}" stroke="${GREEN}" stroke-width="6" stroke-linecap="butt"/>

  <text x="${RAIL}" y="${HERO_BASE}" font-family="${MONO}" font-size="${hs}" font-weight="600" fill="${INK}">${esc(hero)}</text>
  <text x="${RAIL}" y="${DESC_BASE}" font-family="${MONO}" font-size="30" fill="${MUTED}">${esc(desc)}</text>

  <path d="M0 ${SEAM_Y} H${W}" stroke="${HAIR}" stroke-width="2"/>

  <text x="${RAIL}" y="${WORDMARK_Y}" font-family="${MONO}" font-size="26" fill="${DIM}">eslint.interlace.tools</text>
</svg>`;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  // PATH lookup fallback (covers Linux CI images and non-default installs).
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      const found = execFileSync(process.platform === 'win32' ? 'where' : 'which', [bin], {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim()
        .split('\n')[0];
      if (found) return found;
    } catch {
      // not found on PATH, try the next candidate
    }
  }
  throw new Error(
    'No headless-capable Chrome/Chromium found. Set CHROME_PATH or install Google Chrome.',
  );
}

/**
 * Render SVG straight to a raster image with headless Chrome's `--screenshot`
 * flag, which infers the output format (PNG or JPEG) from the destination's
 * file extension. This avoids a separate, platform-specific PNG->JPEG
 * conversion step (e.g. macOS `sips`) entirely — the same Chrome invocation
 * produces og-image.jpg and every og-<slug>.png, on any OS Chrome runs on.
 */
function renderSVGToImage(chrome, svg, outImagePath, tmpDir) {
  const svgPath = path.join(tmpDir, `${path.basename(outImagePath).replace(/\.(png|jpe?g)$/i, '')}.svg`);
  writeFileSync(svgPath, svg, 'utf8');
  execFileSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--screenshot=${outImagePath}`,
      `--window-size=${W},${H}`,
      `file://${svgPath}`,
    ],
    { stdio: 'ignore' },
  );
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--site-only') && args.has('--plugins-only')) {
    throw new Error(
      '--site-only and --plugins-only are mutually exclusive (together they generate nothing).',
    );
  }
  const doSite = !args.has('--plugins-only');
  const doPlugins = !args.has('--site-only');

  mkdirSync(IMAGES_DIR, { recursive: true });
  const chrome = findChrome();
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'og-gen-'));

  const results = { site: null, plugins: [] };

  try {
    if (doSite) {
      const svg = siteCardSVG();
      const outJpg = path.join(PUBLIC_DIR, 'og-image.jpg');
      renderSVGToImage(chrome, svg, outJpg, tmpDir);
      results.site = outJpg;
    }

    if (doPlugins) {
      for (const plugin of [...PLUGINS, ...EXTRAS]) {
        const outPath = path.join(IMAGES_DIR, `og-${plugin.slug}.png`);
        const isNew = !existsSync(outPath);
        const svg = pluginCardSVG(plugin);
        renderSVGToImage(chrome, svg, outPath, tmpDir);
        results.plugins.push({ slug: plugin.slug, pkg: plugin.package, path: outPath, isNew });
      }
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('\n=== OG image generation summary ===');
  if (results.site) console.log(`site card: ${results.site}`);
  if (results.plugins.length) {
    console.log(`plugin cards: ${results.plugins.length}`);
    for (const p of results.plugins) {
      console.log(`  ${p.isNew ? '[NEW]    ' : '[UPDATED]'} og-${p.slug}.png  (${p.pkg})`);
    }
  }
}

main();

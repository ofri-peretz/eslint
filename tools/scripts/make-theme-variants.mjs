// Emit the light-surface / dark-surface variants of the three marks that appear
// in EVERY README's logo row: Interlace, ESLint, oxlint.
//
// WHY VARIANTS AND NOT ONE FILE
// -----------------------------
// A single mark cannot read on both npm (always white) and GitHub in dark mode.
// The usual trick — a `prefers-color-scheme` media query inside the SVG, which is
// what the vendor's own eslint-logo.svg does — only works where the SVG is parsed
// as a document. GitHub serves README images through its camo proxy as flat
// `<img>`, so the query is unreliable there. The portable answer is two files and
// a `<picture>` element:
//
//   <picture>
//     <source media="(prefers-color-scheme: dark)" srcset=".../logos/interlace-dark.svg">
//     <img src=".../logos/interlace-light.svg" alt="Interlace" height="90">
//   </picture>
//
// NAMING — ours is by SURFACE, not by ink
// ---------------------------------------
//   <name>-light.svg  → for LIGHT surfaces (npm, GitHub light). Dark ink.
//   <name>-dark.svg   → for DARK surfaces  (GitHub dark).       Light ink.
//   <name>.svg        → unchanged default; what a single-file consumer gets.
//
// This is the opposite of oxc's convention, where `oxc-light.svg` means
// light-COLOURED ink. That collision has already caused one wrong-variant commit
// here, so the mapping below is explicit and the rule doc repeats it.
//
// Usage: node tools/scripts/make-theme-variants.mjs [--check]

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');
const PUBLIC = join(REPO, 'apps/docs/public');
const LOGOS = join(PUBLIC, 'logos');

const BOX_W = 120;
const BOX_H = 90;

/** Wrap source artwork in the shared 120x90 canvas — same transform as normalize-logos.mjs. */
function canvas(source, label) {
  const s = source.replace(/<\?xml[^>]*\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '').trim();
  const open = s.match(/<svg\b[^>]*>/i);
  if (!open) throw new Error(`no <svg> root in ${label}`);
  const vb = open[0].match(/viewBox="([^"]+)"/i);
  if (!vb) throw new Error(`no viewBox in ${label} — cannot scale without one`);
  const kept = open[0]
    .replace(/^<svg\b/i, '')
    .replace(/\/?>$/, '')
    .replace(/\s(?:x|y|width|height|viewBox|preserveAspectRatio|xmlns)\s*=\s*"[^"]*"/gi, '')
    .trim();
  const inner =
    `<svg x="0" y="0" width="${BOX_W}" height="${BOX_H}" viewBox="${vb[1]}" ` +
    `preserveAspectRatio="xMidYMid meet" overflow="visible"${kept ? ` ${kept}` : ''}>`;
  const body = s.slice(open.index + open[0].length);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX_W}" height="${BOX_H}" ` +
    `viewBox="0 0 ${BOX_W} ${BOX_H}" role="img">${inner}${body}</svg>\n`
  );
}

const read = (p) => readFileSync(p, 'utf8');

/**
 * Each entry returns the artwork for one surface.
 *
 * Nothing here invents a colour. Interlace ships both pairs already; ESLint's own
 * file declares its dark treatment in the media query we inline; oxlint's two
 * variants are the vendor's own files, only relabelled from ink to surface.
 */
const VARIANTS = {
  // Interlace ships both pairs as first-party artwork.
  'interlace-light.svg': () => canvas(read(join(PUBLIC, 'icon-light.svg')), 'icon-light.svg'),
  'interlace-dark.svg': () => canvas(read(join(PUBLIC, 'icon-dark.svg')), 'icon-dark.svg'),

  // ESLint: strip the embedded media query and bake each branch. The dark colours
  // (#fff outer, #999 inner) are the vendor's own — copied out of that query, not
  // chosen here.
  'eslint-light.svg': () => {
    const src = read(join(PUBLIC, 'eslint-logo.svg')).replace(/<style>[\s\S]*?<\/style>/g, '');
    return canvas(src, 'eslint-logo.svg (light)');
  },
  'eslint-dark.svg': () => {
    const src = read(join(PUBLIC, 'eslint-logo.svg'))
      .replace(/<style>[\s\S]*?<\/style>/g, '')
      .replace(/fill="#4B32C3"(\s+id="outer")/i, 'fill="#fff"$1')
      .replace(/fill="#8080F2"(\s+id="inner")/i, 'fill="#999"$1');
    return canvas(src, 'eslint-logo.svg (dark)');
  },

  // oxlint: oxc names by ink, we name by surface, so the two swap.
  //   oxc-dark.svg  = dark ink  → our -light
  //   oxc-light.svg = light ink → our -dark
  // The shipped logos/oxlint.svg is already the dark-ink file, so -light is a copy
  // of it and -dark recolours the one near-black token oxc itself flips to white.
  'oxlint-light.svg': () => read(join(LOGOS, 'oxlint.svg')),
  'oxlint-dark.svg': () => read(join(LOGOS, 'oxlint.svg')).replace(/#08060D/gi, '#FFFFFF'),
};

const check = process.argv.includes('--check');
let drift = 0;

for (const [name, build] of Object.entries(VARIANTS)) {
  const target = join(LOGOS, name);
  const next = build();
  let current = null;
  try {
    current = read(target);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  if (current === next) continue;
  if (check) {
    console.error(`✗ ${name} is ${current === null ? 'missing' : 'stale'}`);
    drift++;
    continue;
  }
  writeFileSync(target, next);
  console.log(`✓ ${name}`);
}

if (check) {
  if (drift > 0) {
    console.error(`\n💥 ${drift} logo variant(s) out of date — run \`npm run logos:variants\`.`);
    process.exit(1);
  }
  console.log(`✅ All ${Object.keys(VARIANTS).length} theme variants are current.`);
}

// Normalise vendor logo SVGs into the shared canvas used by the plugin README
// logo row (.agent/rules/readme-structure.md item 1).
//
// Every mark in the row renders at height=90. Source artwork varies wildly in
// aspect — square icons (node, mongodb, react) vs wide wordmarks (express,
// oxlint) — so rendering the raw files at a common height produces mismatched
// footprints that baseline-align badly. Wrapping each source in a fixed
// 120x90 canvas with `preserveAspectRatio="xMidYMid meet"` letterboxes the
// wordmarks and pillarboxes the icons, giving one uniform, centred footprint.
//
// The source artwork is never edited — only its placement. Brand colours are
// preserved exactly as the vendor ships them.
//
// Usage: node tools/scripts/normalize-logos.mjs <src-dir> <dest-dir>
//
// Sources are documented in tools/scripts/logo-sources.json. Always pick the
// variant that reads on white (npm's README background) — see the naming-collision
// warning in the rule doc.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BOX_W = 120;
const BOX_H = 90;

const [src, dest] = process.argv.slice(2);
if (!src || !dest) {
  console.error('usage: node tools/scripts/normalize-logos.mjs <src-dir> <dest-dir>');
  process.exit(1);
}

for (const file of readdirSync(src).filter((f) => f.endsWith('.svg'))) {
  let s = readFileSync(join(src, file), 'utf8');
  s = s.replace(/<\?xml[^>]*\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '').trim();

  const open = s.match(/<svg\b[^>]*>/i);
  if (!open) throw new Error(`no <svg> root in ${file}`);
  const vb = open[0].match(/viewBox="([^"]+)"/i);
  if (!vb) throw new Error(`no viewBox in ${file} — cannot scale without one`);

  // Re-open the source root as a nested <svg> filling the canvas. Nested <svg>
  // honours its own viewBox, so the original geometry (and any <style>,
  // <defs>, gradients) survives untouched.
  const inner =
    `<svg x="0" y="0" width="${BOX_W}" height="${BOX_H}" viewBox="${vb[1]}" ` +
    `preserveAspectRatio="xMidYMid meet" overflow="visible">`;
  const body = s.slice(open.index + open[0].length);

  writeFileSync(
    join(dest, file),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX_W}" height="${BOX_H}" ` +
      `viewBox="0 0 ${BOX_W} ${BOX_H}" role="img">${inner}${body}</svg>\n`,
  );
  console.log(`${file.padEnd(16)} ${vb[1]} -> ${BOX_W}x${BOX_H}`);
}

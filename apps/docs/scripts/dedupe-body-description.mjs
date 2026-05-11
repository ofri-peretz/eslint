#!/usr/bin/env -S node
/**
 * Removes the body paragraph that duplicates the frontmatter `description`.
 * Fumadocs already renders the description below the H1, so duplicating it
 * in the body produces visible duplicate text. Test contract:
 * `apps/docs/src/__tests__/rule-mdx-format-lock.test.ts`
 * (`body-duplicated-description` surface).
 *
 * Strategy: scan the first ~30 non-empty body lines for a paragraph that
 * matches the frontmatter description verbatim (after trimming). When found,
 * delete that paragraph (and the following blank line). Stop after the first
 * match — only the lead paragraph counts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONTENT = path.resolve(HERE, '..', 'content', 'docs');

function walkMdx(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMdx(p));
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

let transformed = 0;
let scanned = 0;
let skipped = 0;

for (const file of walkMdx(CONTENT)) {
  scanned++;
  const src = fs.readFileSync(file, 'utf8');
  const fmMatch = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) { skipped++; continue; }
  const descMatch = fmMatch[1].match(/^description:\s*['"]?(.+?)['"]?\s*$/m);
  if (!descMatch) { skipped++; continue; }
  const desc = descMatch[1].trim();
  if (desc.length < 10) { skipped++; continue; }

  const fmEnd = fmMatch[0].length;
  const body = src.slice(fmEnd);
  const lines = body.split('\n');
  // Scan first ~30 non-empty lines for the duplicate paragraph
  const stop = Math.min(lines.length, 30);
  let foundIdx = -1;
  for (let i = 0; i < stop; i++) {
    const line = lines[i].trim();
    if (line === desc) { foundIdx = i; break; }
  }
  if (foundIdx < 0) { skipped++; continue; }

  // Remove the line + the following blank line if present
  let removeCount = 1;
  if (foundIdx + 1 < lines.length && lines[foundIdx + 1].trim() === '') removeCount = 2;
  // Also collapse a leading blank line so we don't leave three in a row
  if (foundIdx > 0 && lines[foundIdx - 1].trim() === '' && foundIdx - 1 > 0 && lines[foundIdx - 2].trim() === '') {
    removeCount++;
    lines.splice(foundIdx - 1, removeCount);
  } else {
    lines.splice(foundIdx, removeCount);
  }

  const newBody = lines.join('\n');
  fs.writeFileSync(file, src.slice(0, fmEnd) + newBody);
  transformed++;
}

console.log(`  scanned:     ${scanned}`);
console.log(`  transformed: ${transformed}`);
console.log(`  skipped:     ${skipped}`);

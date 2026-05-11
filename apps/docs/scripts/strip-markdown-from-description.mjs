#!/usr/bin/env -S node
/**
 * Strips markdown link syntax `[text](url)` and bare-URL `<https://...>`
 * from the frontmatter `description` field of every MDX file. Test contract:
 * `apps/docs/src/__tests__/rule-mdx-format-lock.test.ts`
 * (`frontmatter-description-markdown` surface).
 *
 * `description:` lands in `<meta>` tags + page leads — markdown renders as
 * literal characters there. Replace each `[text](url)` with `text`, drop
 * `<url>` wrappers, and collapse extra whitespace.
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

function stripMarkdown(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
    .replace(/<https?:\/\/[^>]+>/g, '')      // <https://...>
    .replace(/\s+/g, ' ')
    .trim();
}

let transformed = 0;
let scanned = 0;
let skipped = 0;

for (const file of walkMdx(CONTENT)) {
  scanned++;
  const src = fs.readFileSync(file, 'utf8');
  const fmMatch = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) { skipped++; continue; }
  const fm = fmMatch[1];
  const descMatch = fm.match(/^description:\s*(['"])([\s\S]*?)\1\s*$/m);
  if (!descMatch) { skipped++; continue; }
  const original = descMatch[2];
  if (!/\[.+?\]\(.+?\)|<https?:/.test(original)) { skipped++; continue; }
  const cleaned = stripMarkdown(original);
  if (cleaned === original) { skipped++; continue; }
  const newFm = fm.replace(
    /^description:\s*(['"])([\s\S]*?)\1\s*$/m,
    `description: ${descMatch[1]}${cleaned}${descMatch[1]}`,
  );
  fs.writeFileSync(file, `---\n${newFm}\n---\n${src.slice(fmMatch[0].length)}`);
  transformed++;
}

console.log(`  scanned:     ${scanned}`);
console.log(`  transformed: ${transformed}`);
console.log(`  skipped:     ${skipped}`);

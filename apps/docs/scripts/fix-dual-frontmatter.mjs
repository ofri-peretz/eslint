#!/usr/bin/env node
/**
 * fix-dual-frontmatter — rewrites rule MDX files that ship two `---…---`
 * blocks (a stub frontmatter at the top + a "real" YAML block in the body
 * that markdown parses as a giant setext heading).
 *
 * The body block holds the canonical metadata (description, tags, cwe, …),
 * so we collapse the pattern into a single top-level frontmatter and drop
 * the duplicate. The transform is conservative — files without the dual
 * pattern are skipped, and files where the second block is missing
 * required keys are left untouched and reported.
 *
 * Pattern, before:
 *   ---
 *   title: "rule"
 *   description: "title: rule"            ← stub, often a templating glitch
 *   ---
 *
 *   import { … } from "@/components/RuleComponents";
 *
 *   ---
 *   title: rule
 *   description: "real description"
 *   tags: [...]
 *   category: …
 *   severity: …
 *   cwe: …
 *   owasp: "…"
 *   autofix: …
 *   ---
 *
 * After:
 *   ---
 *   title: rule
 *   description: "real description"
 *   tags: [...]
 *   category: …
 *   severity: …
 *   cwe: …
 *   owasp: "…"
 *   autofix: …
 *   ---
 *
 *   import { … } from "@/components/RuleComponents";
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

// Find every .mdx under content/docs/** that imports RuleComponents — that's
// the template signature for the dual-frontmatter rule files.
const allRuleMdx = execSync(
  `grep -rl 'from "@/components/RuleComponents"' ${join(ROOT, 'content/docs')}`,
  { encoding: 'utf-8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

const stats = { transformed: 0, skippedNoDual: 0, skippedNoMetadata: 0, errored: 0 };
const errors = [];

for (const file of allRuleMdx) {
  let src;
  try {
    src = readFileSync(file, 'utf-8');
  } catch (e) {
    stats.errored++;
    errors.push({ file, message: e.message });
    continue;
  }

  // Anchor first frontmatter at file start; capture import line; capture
  // second `---…---` block immediately after.
  const dualPattern =
    /^---\r?\n([\s\S]*?)\r?\n---\r?\n+(import\s[\s\S]*?from\s+"@\/components\/RuleComponents";)\r?\n+---\r?\n([\s\S]*?)\r?\n---\r?\n/;

  const match = src.match(dualPattern);
  if (!match) {
    stats.skippedNoDual++;
    continue;
  }

  const [, , importLine, secondBody] = match;

  // The second block must look like real metadata (has title + description
  // at minimum). If not, skip — the file is in some other shape.
  if (!/^\s*title:/m.test(secondBody) || !/^\s*description:/m.test(secondBody)) {
    stats.skippedNoMetadata++;
    continue;
  }

  const rewritten =
    `---\n${secondBody.trim()}\n---\n\n${importLine}\n\n` +
    src.slice(match[0].length);

  if (rewritten === src) {
    stats.skippedNoDual++;
    continue;
  }

  if (!dryRun) {
    writeFileSync(file, rewritten, 'utf-8');
  }
  stats.transformed++;
}

console.log(`fix-dual-frontmatter${dryRun ? ' (dry run)' : ''}`);
console.log(`  scanned:            ${allRuleMdx.length}`);
console.log(`  transformed:        ${stats.transformed}`);
console.log(`  skipped (no dual):  ${stats.skippedNoDual}`);
console.log(`  skipped (no meta):  ${stats.skippedNoMetadata}`);
console.log(`  errored:            ${stats.errored}`);
if (errors.length) {
  console.log('\nErrors:');
  for (const e of errors) console.log(`  ${e.file}: ${e.message}`);
}

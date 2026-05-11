#!/usr/bin/env node
/**
 * fix-orphan-frontmatter — sibling to fix-dual-frontmatter.mjs that handles
 * the post-RuleBadges shape. After `<RuleBadges />` was injected between the
 * import line and the orphan YAML block, the old fixer's regex no longer
 * anchored — so ~300 rule MDX files still ship a stub frontmatter
 * (`description: "title: <rule>"`) followed by a real YAML block that
 * markdown parses as a giant setext heading and that crashes the MDX
 * compiler on some pages with "Lazy element type must resolve to a class or
 * function".
 *
 * Shape, before:
 *   ---
 *   title: "rule"
 *   description: "title: rule"          ← stub
 *   type_aware: false
 *   type_aware_status: unaware
 *   ---
 *
 *   import { … } from "@/components/RuleComponents";
 *
 *   <RuleBadges typeAware={…} typeAwareStatus="…" />
 *
 *   ---
 *   title: rule
 *   description: real description …
 *   tags: [...]
 *   category: …
 *   …
 *   ---
 *
 *   <body — often opens with the description duplicated verbatim>
 *
 * After:
 *   ---
 *   title: rule
 *   description: real description …
 *   tags: [...]
 *   category: …
 *   …
 *   type_aware: false                    ← preserved from stub
 *   type_aware_status: unaware           ← preserved from stub
 *   ---
 *
 *   import { … } from "@/components/RuleComponents";
 *
 *   <RuleBadges typeAware={…} typeAwareStatus="…" />
 *
 *   <body — first paragraph deduped if it was a verbatim copy of the
 *           description, or a strict prefix of the next paragraph>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const verbose = args.has('--verbose');

const ruleMdxFiles = execSync(
  `grep -rl 'from "@/components/RuleComponents"' ${join(ROOT, 'content/docs')}`,
  { encoding: 'utf-8' },
).trim().split('\n').filter(Boolean);

const stats = {
  scanned: 0,
  transformed: 0,
  skippedNoOrphan: 0,
  skippedNoDescription: 0,
  errored: 0,
};
const errors = [];

// `^---\n<frontmatter1>\n---\n<JSX/text — import + RuleBadges>\n---\n<frontmatter2>\n---\n`
//
// We allow arbitrary content between the two YAML blocks (the import line +
// the <RuleBadges /> JSX line plus surrounding blank lines). The lazy `.*?`
// inside the [\s\S] group makes sure we stop at the *first* second `---…---`
// block, not a later thematic break in the body.
const dualPattern =
  /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*?)\r?\n---\r?\n/;

const FRONTMATTER_KEYS_PRESERVED_FROM_STUB = ['type_aware', 'type_aware_status'];

function getKeys(frontmatterBody) {
  const keys = new Set();
  for (const line of frontmatterBody.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)\s*:/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

function extractKey(frontmatterBody, key) {
  // Capture from `key:` line through the next top-level key or end.
  const lines = frontmatterBody.split(/\r?\n/);
  const out = [];
  let inside = false;
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9_]+)\s*:/);
    if (m) {
      if (m[1] === key) {
        inside = true;
        out.push(line);
        continue;
      } else if (inside) {
        break;
      }
    } else if (inside) {
      out.push(line);
    }
  }
  return out.join('\n');
}

function extractDescriptionValue(frontmatterBody) {
  // Pull just the scalar value of `description:` for paragraph-dedup.
  // Handles unquoted, single-quoted, and double-quoted scalars on one line.
  const m = frontmatterBody.match(/^description:\s*(.*)$/m);
  if (!m) return null;
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

function dedupeRedundantParagraphs(body, description) {
  // Walk the body as paragraph runs separated by blank lines. Drop:
  //   - any paragraph whose normalized text exactly equals the (normalized)
  //     description, AND that has at least one OTHER paragraph somewhere
  //     in the body whose normalized text *also* exactly equals it. This
  //     lets us strip the duplicate emitted by sync-rules-docs while
  //     leaving the canonical description-paragraph behind when there's
  //     only one copy.
  //   - any paragraph whose normalized text is a strict prefix of the
  //     immediately following paragraph (catches "<desc>" → "<desc>. <more>"
  //     pairs in the *-reliability rules).
  //
  // We never touch headings (`#`), tables (`|…|`), block-quotes (`> `),
  // code fences (```…```), or JSX/HTML — those are not in scope.
  if (!body) return body;

  const lines = body.split(/\r?\n/);
  // Parse paragraphs into [{start, end, text}] segments. Code fences and
  // tables are opaque chunks so we don't mistakenly merge their internals.
  const segments = [];
  let i = 0;
  let inFence = false;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }
    const start = i;
    while (i < lines.length && lines[i].trim() !== '') {
      if (lines[i].startsWith('```')) inFence = !inFence;
      i++;
    }
    const end = i;
    const text = lines.slice(start, end).join('\n').trim();
    segments.push({ start, end, text });
  }

  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const descN = description ? norm(description) : null;

  const isProsey = (text) => {
    // Reject anything that doesn't look like a plain prose paragraph.
    if (text.startsWith('```')) return false;
    if (/^[#>|]/.test(text)) return false;
    if (/^\s*[-*+]\s/.test(text)) return false;
    if (/^\s*<[A-Za-z!/]/.test(text)) return false;
    if (/^\s*import\s/.test(text)) return false;
    return true;
  };

  // Index prose segments only.
  const prose = segments
    .map((seg, idx) => ({ idx, seg, n: norm(seg.text) }))
    .filter(({ seg }) => isProsey(seg.text));

  const dropIdx = new Set();

  // (1) If a prose paragraph equals the description AND there's another
  // prose paragraph equal to the description, drop the FIRST occurrence.
  if (descN) {
    const matches = prose.filter((p) => p.n === descN);
    if (matches.length >= 2) {
      dropIdx.add(matches[0].idx);
    }
  }

  // (2) Strict-prefix pairs (verbatim short, then long with extra context).
  for (let k = 0; k < prose.length - 1; k++) {
    const a = prose[k];
    const b = prose[k + 1];
    if (dropIdx.has(a.idx)) continue;
    if (a.n.length > 0 && b.n.length > a.n.length && b.n.startsWith(a.n)) {
      // Only dedupe if the next prose paragraph immediately follows this
      // one in the segment stream — no other content between them.
      if (b.idx === a.idx + 1) dropIdx.add(a.idx);
    }
  }

  if (dropIdx.size === 0) return body;

  // Rebuild: drop the marked segments. Keep the line indices structure so
  // we don't perturb tables / code blocks.
  const dropLineRanges = [];
  for (const idx of dropIdx) {
    const seg = segments[idx];
    // Also consume one trailing blank line if present, so we don't leave
    // double blanks behind.
    let dropEnd = seg.end;
    if (dropEnd < lines.length && lines[dropEnd].trim() === '') dropEnd++;
    dropLineRanges.push([seg.start, dropEnd]);
  }
  dropLineRanges.sort((a, b) => a[0] - b[0]);

  const keptLines = [];
  let cursor = 0;
  for (const [s, e] of dropLineRanges) {
    for (let j = cursor; j < s; j++) keptLines.push(lines[j]);
    cursor = e;
  }
  for (let j = cursor; j < lines.length; j++) keptLines.push(lines[j]);
  return keptLines.join('\n');
}

function extractFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  return { whole: m[0], body: m[1] };
}

for (const file of ruleMdxFiles) {
  stats.scanned++;

  let src;
  try {
    src = readFileSync(file, 'utf-8');
  } catch (e) {
    stats.errored++;
    errors.push({ file, message: e.message });
    continue;
  }

  // Two independent transforms:
  //   A) Collapse dual-frontmatter into a single frontmatter (if present).
  //   B) Dedupe the duplicated description paragraph (always, idempotent).
  // We run A first, then B, then write once.

  let working = src;
  let didRewrite = false;
  const match = working.match(dualPattern);

  if (match) {
    const [whole, stubBody, between, orphanBody] = match;

    // The orphan block must contain a description; the stub frontmatter is
    // what we're trying to escape, so the orphan is the source of truth.
    if (!/^\s*description:/m.test(orphanBody)) {
      stats.skippedNoDescription++;
      if (verbose) console.log(`skip (orphan has no description): ${file}`);
    } else if (/^\s*(?:<|import\s)/m.test(orphanBody)) {
      // Sanity: the orphan block shouldn't include MDX/JSX (`<`, `import `).
      // If it does, the regex captured the wrong slice — bail out loudly.
      stats.errored++;
      errors.push({ file, message: 'orphan block contains JSX/import — regex matched wrong slice' });
      continue;
    } else {
      // Merge: orphan body is canonical; preserve stub-only keys (type_aware*).
      const orphanKeys = getKeys(orphanBody);
      const preserved = FRONTMATTER_KEYS_PRESERVED_FROM_STUB
        .filter((k) => !orphanKeys.has(k))
        .map((k) => extractKey(stubBody, k))
        .filter((s) => s.length > 0);

      const mergedFrontmatter =
        [orphanBody.trim(), ...preserved].filter(Boolean).join('\n');

      const cleanedBetween = between.replace(/^\r?\n+/, '').replace(/\r?\n+$/, '');
      const afterRaw = working.slice(whole.length);

      working =
        `---\n${mergedFrontmatter}\n---\n\n${cleanedBetween}\n\n${afterRaw.replace(/^\r?\n+/, '')}`;
      didRewrite = true;
    }
  } else {
    stats.skippedNoOrphan++;
  }

  // Dedupe pass — always runs, idempotent. Uses the current frontmatter's
  // description (post-rewrite, if A applied).
  const fm = extractFrontmatter(working);
  if (fm) {
    const description = extractDescriptionValue(fm.body);
    const afterFm = working.slice(fm.whole.length);
    const deduped = dedupeRedundantParagraphs(afterFm, description);
    if (deduped !== afterFm) {
      working = fm.whole + deduped;
      didRewrite = true;
    }
  }

  if (!didRewrite || working === src) continue;

  if (!dryRun) {
    writeFileSync(file, working, 'utf-8');
  }
  stats.transformed++;
  if (verbose) console.log(`fixed: ${file}`);
}

console.log(`fix-orphan-frontmatter${dryRun ? ' (dry run)' : ''}`);
console.log(`  scanned:                  ${stats.scanned}`);
console.log(`  transformed:              ${stats.transformed}`);
console.log(`  skipped (no orphan):      ${stats.skippedNoOrphan}`);
console.log(`  skipped (no description): ${stats.skippedNoDescription}`);
console.log(`  errored:                  ${stats.errored}`);
if (errors.length) {
  console.log('\nErrors:');
  for (const e of errors) console.log(`  ${e.file}: ${e.message}`);
}

#!/usr/bin/env node
/**
 * clean-rule-page-chrome — strips template noise from rule MDX pages.
 *
 * Three transforms, all driven by UX_PHILOSOPHY §1 ("the most valuable UX
 * work is usually deletion") and §8 ("side-door entry must feel intentional"):
 *
 *   1. Strip markdown-link syntax from the `description:` frontmatter field.
 *      Frontmatter is rendered as a plain `<p>` under the H1, so a value like
 *      `"CWE: [CWE-319](https://…)"` shows the literal brackets and parens
 *      to the reader. Convert `[text](url)` → `text`. Also trim a leading
 *      `CWE: ` prefix when present — it duplicates the badge in the Quick
 *      Summary table.
 *
 *   2. Remove the `> **Keywords:** …` blockquote and its sibling lines
 *      (`> **CWE:**`, `> **OWASP Mobile:**`). SEO-keyword chrome that's
 *      visually noisy and duplicates the Quick Summary table.
 *
 *   3. Remove standalone repetition immediately after the blockquote:
 *        - bare `CWE: [CWE-XXX](https://…)` paragraphs
 *        - `**CWE:** [CWE-XXX](…)` lines
 *        - `**OWASP Mobile:** [OWASP Mobile …](…)` lines
 *
 * Conservative: only touches the introductory chrome before the first
 * heading. The Quick Summary, Examples, etc. are untouched.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '..');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

const allRuleMdx = execSync(
  `find ${join(ROOT, 'content/docs')} -name '*.mdx' -path '*/rules/*'`,
  { encoding: 'utf-8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

function stripMarkdownLinks(s) {
  // [text](url) → text
  return s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function cleanDescription(line, ruleName) {
  // Match: description: "value"  or  description: value
  const match = line.match(/^(description:\s*)(?:"([^"]*)"|(.*))$/);
  if (!match) return line;
  const prefix = match[1];
  let value = match[2] ?? match[3] ?? '';
  value = stripMarkdownLinks(value).trim();
  // Drop a leading "CWE: " prefix — that's badge content, not a description.
  value = value.replace(/^CWE:\s*/, '');
  // Drop a `title:` echo (the dual-frontmatter transform sometimes leaves this).
  value = value.replace(/^title:\s*/, '');
  // If the description is now just a CWE id (or empty / equal to the rule
  // name), it's not a description — synthesize a one-line fallback so the
  // `<p>` under the H1 reads as a sentence per UX_PHILOSOPHY §8 (rich
  // page-level chrome for side-door entry).
  const cweOnly = /^CWE-\d+$/.test(value);
  const empty = value === '' || value === ruleName;
  if (cweOnly) {
    value = `ESLint rule for ${value}.`;
  } else if (empty) {
    value = `ESLint rule: ${ruleName}.`;
  }
  // Re-quote for YAML safety.
  return `${prefix}${JSON.stringify(value)}`;
}

const stats = { transformed: 0, descriptionFixed: 0, blockquoteRemoved: 0, dupLineRemoved: 0 };

for (const file of allRuleMdx) {
  let src = readFileSync(file, 'utf-8');
  const before = src;
  const ruleName = file.split('/').pop().replace(/\.mdx$/, '');

  // (1) Fix the description in frontmatter — only the first occurrence,
  // which is by definition inside the leading `---…---` block.
  const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (fmMatch) {
    const fmBody = fmMatch[1];
    const fmLines = fmBody.split(/\r?\n/);
    let touchedDesc = false;
    const newFmLines = fmLines.map((line) => {
      if (!touchedDesc && /^description:/.test(line)) {
        const cleaned = cleanDescription(line, ruleName);
        if (cleaned !== line) {
          touchedDesc = true;
          return cleaned;
        }
      }
      return line;
    });
    if (touchedDesc) {
      const newFm = `---\n${newFmLines.join('\n')}\n---\n`;
      src = newFm + src.slice(fmMatch[0].length);
      stats.descriptionFixed++;
    }
  }

  // (2) Remove the `> **Keywords:** …` blockquote and any consecutive `>`
  // sibling lines (multi-line blockquote). Limit to the prelude — only
  // matches before the first `##` heading.
  src = src.replace(
    /(^---[\s\S]*?\r?\n---\r?\n[\s\S]*?)(?=\n##\s)/m,
    (preludeWithFrontmatter) => {
      const before2 = preludeWithFrontmatter;
      // Drop a `> **Keywords:** …` block (one or more consecutive `>` lines)
      const after = before2.replace(
        /(?:^>[ \t]+\*\*Keywords:\*\*[^\n]*\n(?:^>[^\n]*\n)*)/m,
        '',
      );
      if (after !== before2) stats.blockquoteRemoved++;
      return after;
    },
  );

  // (3) Remove standalone redundancy lines in the prelude — bare CWE: link,
  // `**CWE:**` link, `**OWASP Mobile:**` link. Only within the prelude
  // before the first `## ` heading.
  src = src.replace(
    /(^---[\s\S]*?\r?\n---\r?\n[\s\S]*?)(?=\n##\s)/m,
    (prelude) => {
      let next = prelude;
      const removers = [
        /^CWE:\s*\[CWE-\d+\]\([^)]+\)\s*\n+/m,
        /^\*\*CWE:\*\*\s*\[[^\]]+\]\([^)]+\)\s*(?:  )?\s*\n/m,
        /^\*\*OWASP[^*]*\*\*\s*\[[^\]]+\]\([^)]+\)\s*\n/m,
      ];
      for (const re of removers) {
        const matched = next;
        next = next.replace(re, '');
        if (next !== matched) stats.dupLineRemoved++;
      }
      // Collapse any 3+ consecutive blank lines that the removals created.
      next = next.replace(/\n{3,}/g, '\n\n');
      return next;
    },
  );

  if (src !== before) {
    stats.transformed++;
    if (!dryRun) writeFileSync(file, src, 'utf-8');
  }
}

console.log(`clean-rule-page-chrome${dryRun ? ' (dry run)' : ''}`);
console.log(`  scanned:               ${allRuleMdx.length}`);
console.log(`  files transformed:     ${stats.transformed}`);
console.log(`  descriptions fixed:    ${stats.descriptionFixed}`);
console.log(`  blockquotes removed:   ${stats.blockquoteRemoved}`);
console.log(`  dup lines removed:     ${stats.dupLineRemoved}`);

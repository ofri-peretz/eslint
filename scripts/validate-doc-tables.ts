#!/usr/bin/env tsx

/**
 * Validate Documentation Tables
 *
 * Catches markdown tables that LOOK like tables in source but do not RENDER as
 * tables on the docs site — the failure mode that shipped
 * `plugin-vercel-ai-security/rules/require-tool-confirmation#options` as a wall
 * of raw `|` pipes.
 *
 * Why a parser and not a regex: GFM's rule is that the delimiter row must match
 * the header row in cell count, *or the table is not recognised at all* and the
 * whole block degrades to a paragraph of literal text. Counting pipes by hand
 * also mis-reads `\|` escapes inside code spans. So we parse with the same
 * remark + remark-gfm pipeline the site renders through and assert on the AST:
 * if the docs site would emit a <table>, we see a `table` node here.
 *
 * Checks:
 *   1. TABLE_NOT_PARSED — a block of pipe-rows that remark left as a paragraph.
 *      This is the bug that reaches production as visible pipe soup.
 *   2. ROW_OVERFLOW — a `table` row with more cells than the header. GFM
 *      silently discards the excess, so content vanishes with no visual tell.
 *
 * Usage:
 *   npx tsx scripts/validate-doc-tables.ts            # validate
 *   npx tsx scripts/validate-doc-tables.ts --json     # machine-readable
 *
 * Exit codes: 0 = clean, 1 = violations found.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

const ROOT_DIR = path.join(__dirname, '..');

/** Directories scanned for documentation. */
const SCAN_ROOTS = [
  { dir: path.join(ROOT_DIR, 'packages'), exts: ['.md'] },
  { dir: path.join(ROOT_DIR, 'apps', 'docs', 'content'), exts: ['.md', '.mdx'] },
];

/** Never walk into build output or dependencies. */
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.cache',
]);

export type ViolationKind = 'TABLE_NOT_PARSED' | 'ROW_OVERFLOW';

export interface Violation {
  file: string;
  line: number;
  kind: ViolationKind;
  message: string;
}

const processor = unified().use(remarkParse).use(remarkGfm);

/**
 * Blank out leading YAML frontmatter, preserving line count so reported line
 * numbers still point at the real source line.
 * ponytail: two lines here instead of a remark-frontmatter dependency —
 * frontmatter never contains tables, we only need it to stop being parsed.
 */
function blankFrontmatter(source: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/.exec(source);
  if (!match) return source;
  return match[0].replace(/[^\n]/g, '') + source.slice(match[0].length);
}

/**
 * A paragraph is a failed table when two or more of its lines are pipe-rows and
 * at least one looks like a GFM delimiter row (`| --- | --- |`). Requiring the
 * delimiter is what keeps prose that merely contains a `|` from being flagged.
 */
function looksLikeAttemptedTable(raw: string): boolean {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const pipeRows = lines.filter((l) => l.startsWith('|') && l.endsWith('|'));
  if (pipeRows.length < 2) return false;
  return pipeRows.some((l) => /^\|[\s:|-]+\|$/.test(l) && l.includes('-'));
}

export function findTableViolations(source: string, file: string): Violation[] {
  const violations: Violation[] = [];
  const body = blankFrontmatter(source);
  const tree = processor.parse(body) as any;
  const lines = body.split('\n');

  const walk = (node: any): void => {
    if (node.type === 'paragraph' && node.position) {
      const raw = lines
        .slice(node.position.start.line - 1, node.position.end.line)
        .join('\n');
      if (looksLikeAttemptedTable(raw)) {
        violations.push({
          file,
          line: node.position.start.line,
          kind: 'TABLE_NOT_PARSED',
          message:
            'Table did not parse — renders as literal pipe text. The delimiter ' +
            'row must have exactly as many cells as the header row.',
        });
      }
    }

    if (node.type === 'table') {
      const [header, ...rows] = node.children ?? [];
      const width = header?.children?.length ?? 0;
      for (const row of rows) {
        const got = row.children?.length ?? 0;
        if (got > width) {
          violations.push({
            file,
            line: row.position?.start.line ?? node.position?.start.line ?? 0,
            kind: 'ROW_OVERFLOW',
            message: `Row has ${got} cells but the header has ${width}; GFM silently drops the extra ${got - width}.`,
          });
        }
      }
    }

    for (const child of node.children ?? []) walk(child);
  };

  walk(tree);
  return violations;
}

export function collectDocs(): string[] {
  const found: string[] = [];
  const walk = (dir: string, exts: string[]): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full, exts);
      } else if (exts.some((e) => entry.name.endsWith(e))) {
        found.push(full);
      }
    }
  };
  for (const { dir, exts } of SCAN_ROOTS) walk(dir, exts);
  return found.sort();
}

function main(): void {
  const asJson = process.argv.includes('--json');
  const files = collectDocs();
  const violations = files.flatMap((file) =>
    findTableViolations(fs.readFileSync(file, 'utf8'), path.relative(ROOT_DIR, file)),
  );

  if (asJson) {
    console.log(JSON.stringify({ scanned: files.length, violations }, null, 2));
  } else if (violations.length === 0) {
    console.log(`✓ ${files.length} docs scanned — every markdown table parses as a table.`);
  } else {
    console.error(`✗ ${violations.length} table violation(s) across ${files.length} docs:\n`);
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  [${v.kind}]`);
      console.error(`    ${v.message}\n`);
    }
  }

  process.exit(violations.length === 0 ? 0 : 1);
}

if (require.main === module) main();

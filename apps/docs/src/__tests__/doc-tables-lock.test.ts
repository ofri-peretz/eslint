/**
 * Doc tables — regression lock.
 *
 * The bug: `/docs/security/plugin-vercel-ai-security/rules/require-tool-confirmation#options`
 * shipped its Options table as a wall of literal `|` pipes. The header row had
 * 4 cells, the delimiter row had 8. GFM's rule is that a delimiter row which
 * does not match the header cell-for-cell means *the table is not recognised at
 * all* — the whole block degrades to a paragraph of plain text. Nothing errored,
 * nothing 404'd, the page just rendered pipe soup.
 *
 * Why this lock exists rather than a "count the pipes" check: the site renders
 * through remark + remark-gfm, so the only trustworthy definition of "this will
 * render as a table" is "remark-gfm produces a `table` node for it". A regex
 * cannot tell you that — it both misses the case above (the pipes look fine per
 * line) and false-positives on legitimately escaped `\|` inside code spans.
 *
 * The validator under test parses with that same pipeline, so this suite is a
 * render-level assertion, not a syntax guess.
 */

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectDocs, findTableViolations } from '../../../../scripts/validate-doc-tables';

/**
 * The exact markdown that shipped broken, reduced. Header = 4 cells,
 * delimiter = 8. Two option rows were merged into one, leaving a stray `//`.
 */
const SHIPPED_BROKEN = `## Options

| Option                | Type       | Default | Description |
| --------------------- | ---------- | ------- | ----------- | --------------------------- | ---------- | ----------- | ----------- |
| \`destructivePatterns\` | \`string[]\` | \`['delete']\` | Tool name patterns | // \`confirmationProperties\` | \`string[]\` | \`['confirm']\` | Properties that confirm |
`;

/** An unescaped `|` inside a code span — GFM splits cells before inline parsing. */
const UNESCAPED_PIPE_IN_CODE = `| Feature | Current | Improvement |
| :------ | :------ | :---------- |
| Puntuation | \` | \` separators | Parsing reliable |
`;

/** The same content, correctly escaped. Must NOT be flagged. */
const ESCAPED_PIPE_IN_CODE = `| Feature | Current | Improvement |
| :------ | :------ | :---------- |
| Punctuation | \`\\|\` separators | Parsing reliable |
`;

/** A row carrying more cells than the header — GFM silently drops the excess. */
const ROW_OVERFLOW = `| A | B |
| - | - |
| 1 | 2 | 3 |
`;

const HEALTHY = `| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| \`destructivePatterns\` | \`string[]\` | \`["delete","remove"]\` | Patterns that suggest destructive operations |
`;

describe('doc tables — the shipped bug', () => {
  it('flags the header/delimiter mismatch that shipped as pipe soup', () => {
    const violations = findTableViolations(SHIPPED_BROKEN, 'fixture.mdx');
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('TABLE_NOT_PARSED');
  });

  // GFM splits cells before inline parsing, so backticks do not protect a `|`.
  // Here the stray pipe pushes the row to 4 cells against a 3-cell header and
  // GFM drops the excess — the cell contents silently vanish from the page.
  it('flags an unescaped pipe inside a code span', () => {
    const violations = findTableViolations(UNESCAPED_PIPE_IN_CODE, 'fixture.md');
    expect(violations).not.toEqual([]);
    expect(violations.map((v) => v.kind)).toContain('ROW_OVERFLOW');
  });

  it('flags a row with more cells than the header (content silently dropped)', () => {
    const violations = findTableViolations(ROW_OVERFLOW, 'fixture.md');
    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('ROW_OVERFLOW');
  });
});

describe('doc tables — no false positives', () => {
  it('accepts a well-formed table', () => {
    expect(findTableViolations(HEALTHY, 'fixture.md')).toEqual([]);
  });

  it('accepts an escaped pipe inside a code span', () => {
    expect(findTableViolations(ESCAPED_PIPE_IN_CODE, 'fixture.md')).toEqual([]);
  });

  it('ignores prose that merely contains pipes', () => {
    const prose = 'Use `a | b` to combine them.\nThe `|` operator is a union.\n';
    expect(findTableViolations(prose, 'fixture.md')).toEqual([]);
  });

  it('ignores pipe-looking lines inside fenced code blocks', () => {
    const fenced = ['```text', '| not | a | table |', '| --- | --- |', '```'].join('\n');
    expect(findTableViolations(fenced, 'fixture.md')).toEqual([]);
  });
});

describe('doc tables — live corpus', () => {
  it('every published doc renders its tables as tables', () => {
    const files = collectDocs();
    expect(files.length).toBeGreaterThan(500);

    const violations = files.flatMap((file) =>
      findTableViolations(readFileSync(file, 'utf8'), relative(process.cwd(), file)),
    );

    expect(
      violations.map((v) => `${v.file}:${v.line} [${v.kind}] ${v.message}`),
    ).toEqual([]);
  });
});

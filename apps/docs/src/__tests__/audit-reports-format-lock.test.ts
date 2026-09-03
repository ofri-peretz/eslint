/**
 * Audit-reports format-lock — pins the visual contract produced by
 * scripts/lib/report-format.ts for the three pilot gating reports
 * posted as sticky PR comments by .github/actions/post-audit-comment.
 *
 * Per CLAUDE.md "Regressions are the issue. Lock everything you fix.":
 * if a future agent's refactor of the audit scripts drifts the badge
 * row, drops the headline, or lets a table cell explode past the
 * mobile-readability ceiling, CI must go red.
 *
 * Pilots covered (extend as the template rolls out to more reports):
 *   - benchmark-results/api-surface-coverage.md
 *   - benchmark-results/cve-rule-latency.md
 *   - benchmark-results/per-rule-budget-check.md
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Anchor from this file's location so the test works regardless of where
// vitest is invoked from (repo root vs apps/docs). Layout:
//   apps/docs/src/__tests__/audit-reports-format-lock.test.ts
//   ↑       ↑   ↑          ↑ here
//   3       2   1          0
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..', '..');

const PILOT_REPORTS = [
  'benchmark-results/api-surface-coverage.md',
  'benchmark-results/cve-rule-latency.md',
  'benchmark-results/per-rule-budget-check.md',
] as const;

describe('Audit reports: format lock', () => {
  describe.each(PILOT_REPORTS)('%s', (relPath) => {
    const fullPath = join(REPO_ROOT, relPath);
    let source: string;
    let lines: string[];

    beforeAll(() => {
      expect(existsSync(fullPath), `${relPath} must exist`).toBe(true);
      source = readFileSync(fullPath, 'utf-8');
      lines = source.split('\n');
    });

    it('starts with an H1 (sticky-comment marker for post-audit-comment action)', () => {
      expect(lines[0].startsWith('# ')).toBe(true);
    });

    it('has a shields.io badge row in the first 15 lines (TL;DR badge contract)', () => {
      const head = lines.slice(0, 15).join('\n');
      expect(head).toMatch(/https:\/\/img\.shields\.io\/badge\//);
    });

    it('contains exactly one <details><summary>How to read this</summary> block', () => {
      const matches = source.match(/<summary>How to read this<\/summary>/g) ?? [];
      expect(matches).toHaveLength(1);
    });

    it('has no fenced JSON blob outside of a <details> collapsible (no walls-of-JSON in PR comments)', () => {
      // Find every ```json fence. For each, walk backwards through the
      // source to confirm the most recent <details>/</details> tag is an
      // open <details> (i.e. the fence lives inside a collapsible).
      const fenceRe = /```json/g;
      let m: RegExpExecArray | null;
      while ((m = fenceRe.exec(source)) !== null) {
        const before = source.slice(0, m.index);
        const lastOpen = before.lastIndexOf('<details>');
        const lastClose = before.lastIndexOf('</details>');
        const insideCollapsible = lastOpen > lastClose;
        expect(insideCollapsible, `\`\`\`json fence at offset ${m.index} must live inside <details>`).toBe(true);
      }
    });

    it('has no table row over 200 characters wide (mobile-readability guard)', () => {
      const rows = lines.filter((l) => l.startsWith('|') && !l.startsWith('| :') && !l.startsWith('| ---'));
      for (const row of rows) {
        expect(
          row.length,
          `table row in ${relPath} exceeds the 200-char mobile-readability ceiling: "${row.slice(0, 80)}..."`,
        ).toBeLessThanOrEqual(200);
      }
    });

    it('uses GFM-native callouts (> [!KIND]) instead of plain `❌` / `✅` sentences for headline alerts', () => {
      // If there's a "❌" or "**N over budget**"-style sentence at the
      // top level (i.e. not inside a table cell), demand a `> [!`
      // callout is also present — meaning the script *uses* the helper
      // rather than open-coding alerts. Tables themselves are fine.
      const hasFailureSentenceOutsideTable = lines.some(
        (l) => !l.startsWith('|') && /^❌\s+\*\*/.test(l),
      );
      if (hasFailureSentenceOutsideTable) {
        expect(source).toMatch(/> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/);
      }
    });
  });
});

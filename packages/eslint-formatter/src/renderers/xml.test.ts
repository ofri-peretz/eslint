/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit tests for the XML renderer — tag structure, optional-field
 * emission, escaping, ranking, and truncation marker.
 */

import { describe, it, expect } from 'vitest';
import { renderXML } from './xml';
import { groupByRule, computeSummary } from '../grouper';
import type { GroupedRule, LintSummary, LintResult, FormatterContext } from '../types';

const emptySummary: LintSummary = {
  totalFiles: 3,
  filesWithIssues: 0,
  errorCount: 0,
  warningCount: 0,
  fixableCount: 0,
  uniqueRules: 0,
  topRules: [],
};

function summaryOf(overrides: Partial<LintSummary>): LintSummary {
  return { ...emptySummary, ...overrides };
}

describe('renderXML', () => {
  it('renders a self-closing empty findings report on a clean run', () => {
    const out = renderXML([], emptySummary);
    expect(out).toBe(
      '<lint_report>\n' +
      '  <summary errors="0" warnings="0" files="0" fixable="0" rules="0" />\n' +
      '  <findings count="0" />\n' +
      '</lint_report>\n',
    );
  });

  it('renders a fully-populated finding with all optional tags', () => {
    const grouped: GroupedRule[] = [{
      ruleId: '@interlace/pg/no-unsafe-query',
      severity: 'error',
      count: 3,
      fixable: false,
      hasSuggestions: true,
      cwe: 'CWE-89',
      cvss: 9.8,
      message: 'SQL injection: query built via string concatenation',
      description: 'Detect SQL injection via string concatenation',
      docsUrl: 'https://interlace.tools/docs/pg/no-unsafe-query',
      locations: [
        { file: 'src/db.ts', line: 23, column: 5, nodeType: 'CallExpression' },
        { file: 'src/db.ts', line: 40, column: 9 },
      ],
    }];
    const summary = summaryOf({ filesWithIssues: 1, errorCount: 3, uniqueRules: 1 });
    const out = renderXML(grouped, summary);

    expect(out).toContain('<summary errors="3" warnings="0" files="1" fixable="0" rules="1" />');
    expect(out).toContain('<findings count="1">');
    expect(out).toContain('<finding rank="1">');
    expect(out).toContain('<rule>@interlace/pg/no-unsafe-query</rule>');
    expect(out).toContain('<severity>error</severity>');
    expect(out).toContain('<count>3</count>');
    expect(out).toContain('<fixable>false</fixable>');
    expect(out).toContain('<has_suggestions>true</has_suggestions>');
    expect(out).toContain('<cwe>CWE-89</cwe>');
    expect(out).toContain('<cvss>9.8</cvss>');
    expect(out).toContain('<message>SQL injection: query built via string concatenation</message>');
    expect(out).toContain('<description>Detect SQL injection via string concatenation</description>');
    expect(out).toContain('<docs_url>https://interlace.tools/docs/pg/no-unsafe-query</docs_url>');
    // First location carries the node_type attribute, second omits it.
    expect(out).toContain('<location file="src/db.ts" line="23" column="5" node_type="CallExpression" />');
    expect(out).toContain('<location file="src/db.ts" line="40" column="9" />');
    // count(3) > locations(2) → truncation marker with the remainder.
    expect(out).toContain('<truncated remaining="1" />');
    expect(out.endsWith('</lint_report>\n')).toBe(true);
  });

  it('omits every optional tag on a minimal finding and skips the truncation marker when all locations are shown', () => {
    const grouped: GroupedRule[] = [{
      ruleId: 'no-console',
      severity: 'warning',
      count: 1,
      fixable: true,
      hasSuggestions: false,
      locations: [{ file: 'src/a.ts', line: 1, column: 1 }],
    }];
    const out = renderXML(grouped, summaryOf({ filesWithIssues: 1, warningCount: 1, fixableCount: 1, uniqueRules: 1 }));

    expect(out).toContain('<fixable>true</fixable>');
    for (const absent of ['<cwe>', '<cvss>', '<message>', '<description>', '<docs_url>', '<truncated']) {
      expect(out).not.toContain(absent);
    }
  });

  it('increments rank across findings in grouped order', () => {
    const mk = (ruleId: string, severity: 'error' | 'warning'): GroupedRule => ({
      ruleId, severity, count: 1, fixable: false, hasSuggestions: false,
      locations: [{ file: 'f.ts', line: 1, column: 1 }],
    });
    const out = renderXML(
      [mk('rule-one', 'error'), mk('rule-two', 'warning')],
      summaryOf({ filesWithIssues: 1, errorCount: 1, warningCount: 1, uniqueRules: 2 }),
    );
    expect(out.indexOf('<finding rank="1">')).toBeGreaterThan(-1);
    expect(out.indexOf('<finding rank="2">')).toBeGreaterThan(out.indexOf('<finding rank="1">'));
    expect(out).toContain('<findings count="2">');
  });

  it('escapes all five XML metacharacters in element text and attributes', () => {
    const grouped: GroupedRule[] = [{
      ruleId: 'weird<&>rule',
      severity: 'error',
      count: 1,
      fixable: false,
      hasSuggestions: false,
      message: `expected "x" & got 'y' <tag>`,
      locations: [{ file: 'src/"quoted" & <odd>.ts', line: 2, column: 3, nodeType: "Node<'T'>" }],
    }];
    const out = renderXML(grouped, summaryOf({ filesWithIssues: 1, errorCount: 1, uniqueRules: 1 }));

    expect(out).toContain('<rule>weird&lt;&amp;&gt;rule</rule>');
    expect(out).toContain('<message>expected &quot;x&quot; &amp; got &apos;y&apos; &lt;tag&gt;</message>');
    expect(out).toContain('file="src/&quot;quoted&quot; &amp; &lt;odd&gt;.ts"');
    expect(out).toContain('node_type="Node&lt;&apos;T&apos;&gt;"');
    // No raw metacharacters may survive inside the payload we injected.
    expect(out).not.toContain('weird<&>rule');
    expect(out).not.toContain(`got 'y' <tag>`);
  });

  it('round-trips real grouper output (integration through the pipeline)', () => {
    const results: LintResult[] = [{
      filePath: '/project/src/app.ts',
      messages: [
        { ruleId: 'no-var', severity: 2, message: 'Unexpected var.', line: 3, column: 1, nodeType: 'VariableDeclaration' },
        { ruleId: 'no-var', severity: 2, message: 'Unexpected var.', line: 9, column: 1, nodeType: 'VariableDeclaration' },
      ],
      errorCount: 2,
      warningCount: 0,
      fixableErrorCount: 0,
      fixableWarningCount: 0,
    }];
    const context: FormatterContext = { cwd: '/project' };
    const grouped = groupByRule(results, context, 'xml');
    const summary = computeSummary(results, grouped);
    const out = renderXML(grouped, summary);

    expect(out).toContain('<summary errors="2" warnings="0" files="1" fixable="0" rules="1" />');
    expect(out).toContain('<rule>no-var</rule>');
    expect(out).toContain('<count>2</count>');
    expect(out).toContain('<location file="src/app.ts" line="3" column="1" node_type="VariableDeclaration" />');
  });
});

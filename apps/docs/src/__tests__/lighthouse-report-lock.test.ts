/**
 * The weekly Lighthouse report is the only output of a cron nobody watches.
 *
 * Every failure mode here is silent: a report that renders an empty table, or
 * drops the breach rows, still exits 0 and still posts. The run looks healthy
 * right up until someone opens the issue and finds nothing in it. These lock
 * the shape that makes the report worth reading.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  renderReport,
  aggregate,
  loadLhrs,
  type Lhr,
  type UrlScores,
  type AssertionResult,
} from '../../scripts/lighthouse-report';

const scores: UrlScores[] = [
  {
    url: 'http://localhost:3000/',
    runs: 3,
    summary: {
      performance: 0.92,
      accessibility: 1,
      'best-practices': 0.96,
      seo: 0.99,
    },
  },
  {
    url: 'http://localhost:3000/articles?tag=jwt',
    runs: 3,
    summary: {
      performance: 0.81,
      accessibility: 0.97,
      'best-practices': 1,
      seo: 1,
    },
  },
];

describe('reading what lhci actually leaves on disk', () => {
  /**
   * The bug this locks: the first draft read `manifest.json`, which only the
   * `filesystem` upload target writes. lighthouserc.json uploads to
   * `temporary-public-storage`, so the manifest never exists and every weekly
   * report would have rendered empty while still exiting 0.
   */
  it('reads scores from the lhr-*.json that collect always writes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lhci-'));
    const lhr = (url: string, perf: number): string =>
      JSON.stringify({
        requestedUrl: url,
        categories: {
          performance: { score: perf },
          accessibility: { score: 1 },
          'best-practices': { score: 1 },
          seo: { score: 1 },
        },
      });
    writeFileSync(join(dir, 'lhr-1000.json'), lhr('http://x/', 0.8));
    writeFileSync(join(dir, 'lhr-1001.json'), lhr('http://x/', 0.9));
    // A stale manifest must not be the source — and its absence must not
    // empty the report.
    writeFileSync(join(dir, 'links.json'), '{}');

    const loaded = loadLhrs(dir);
    expect(loaded).toHaveLength(2);
    expect(aggregate(loaded)[0]!.summary.performance).toBeCloseTo(0.85);
  });

  it('takes the median across a route’s runs, not the mean', () => {
    // One cold-start run must not drag the published score down.
    const lhrs: Lhr[] = [0.9, 0.91, 0.2].map((score) => ({
      requestedUrl: 'http://localhost:3000/',
      categories: { performance: { score } },
    }));
    expect(aggregate(lhrs)[0]!.summary.performance).toBe(0.9);
  });

  it('ignores categories Lighthouse could not score', () => {
    const lhrs: Lhr[] = [
      {
        requestedUrl: 'http://localhost:3000/',
        categories: { performance: { score: null }, seo: { score: 1 } },
      },
    ];
    const summary = aggregate(lhrs)[0]!.summary;
    expect(summary.performance).toBeUndefined();
    expect(summary.seo).toBe(1);
  });
});

describe('weekly Lighthouse report', () => {
  it('scores every collected route', () => {
    const report = renderReport(scores, []);
    expect(report).toContain('| `/` | 92 | 100 | 96 | 99 |');
    expect(report).toContain('| `/articles?tag=jwt` | 81 | 97 | 100 | 100 |');
  });

  it('says all budgets are met when nothing failed', () => {
    expect(renderReport(scores, [])).toContain('✅ **All budgets met**');
  });

  it('reports a breach with its budget and the measured value', () => {
    const assertions: AssertionResult[] = [
      {
        name: 'minScore',
        auditId: 'categories:performance',
        url: 'http://localhost:3000/articles',
        expected: 0.85,
        actual: 0.71,
        passed: false,
        level: 'error',
      },
    ];
    const report = renderReport(scores, assertions);
    expect(report).toContain('❌ **1 budget breached**');
    expect(report).toContain('categories:performance');
    expect(report).toContain('`/articles`');
    // A score, not "710 ms" — and rendered as a percentage so it reads in the
    // same unit as the Scores table above it, rather than 0.71 vs 71.
    expect(report).toContain('71');
    expect(report).not.toContain('710 ms');
  });

  it('separates warnings from errors in the verdict', () => {
    const assertions: AssertionResult[] = [
      {
        name: 'maxNumericValue',
        auditId: 'largest-contentful-paint',
        url: 'http://localhost:3000/',
        expected: 2500,
        actual: 3120,
        passed: false,
        level: 'warn',
      },
    ];
    const report = renderReport(scores, assertions);
    // A warn-only run must not read as a breach — that is what makes the
    // ❌ verdict mean something when it does appear.
    expect(report).toContain('✅ **All budgets met**');
    expect(report).toContain('1 warning');
    expect(report).toContain('⚠️ warn');
    expect(report).toContain('3.12 s');
  });

  it('formats each budget in the unit its audit actually uses', () => {
    const assertions: AssertionResult[] = [
      {
        name: 'maxNumericValue',
        auditId: 'cumulative-layout-shift',
        expected: 0.1,
        actual: 0.184,
        passed: false,
        level: 'warn',
      },
      {
        name: 'maxNumericValue',
        auditId: 'unused-javascript',
        expected: 100000,
        actual: 204800,
        passed: false,
        level: 'warn',
      },
    ];
    const report = renderReport(scores, assertions);
    expect(report).toContain('0.184'); // unitless, not "0 ms"
    expect(report).toContain('200 KB'); // bytes, not "204.80 s"
  });

  it('says so loudly when Lighthouse produced nothing at all', () => {
    // The dangerous case: collect crashed, no LHRs, zero failed assertions —
    // which would otherwise render as a clean green report.
    const report = renderReport([], []);
    expect(report).toContain('No Lighthouse results were produced');
    expect(report).not.toContain('All budgets met');
  });
});

describe('the workflow that runs it', () => {
  const workflow = readFileSync(
    join(__dirname, '../../../../.github/workflows/lighthouse.yml'),
    'utf8',
  );

  it('does not run on pull requests', () => {
    // The whole point of the move: single-pass Lighthouse on a shared runner
    // is too noisy to sit in the PR path, and it cost ~15 min of runner time
    // on every docs PR.
    expect(workflow).not.toMatch(/^\s*pull_request:/m);
  });

  it('runs weekly on an early-morning cron', () => {
    const cron = workflow.match(/cron:\s*["']([^"']+)["']/)?.[1];
    expect(cron).toBeDefined();
    const [, hour, dayOfMonth, month, dayOfWeek] = cron!.split(/\s+/);
    expect(Number(hour)).toBeLessThan(6); // early morning UTC
    expect(dayOfMonth).toBe('*');
    expect(month).toBe('*');
    expect(dayOfWeek).not.toBe('*'); // a specific day → weekly, not daily
  });

  it('can still be fired by hand', () => {
    expect(workflow).toMatch(/^\s*workflow_dispatch:/m);
  });

  it('writes the report to the job summary and an issue', () => {
    expect(workflow).toContain('GITHUB_STEP_SUMMARY');
    expect(workflow).toContain('lighthouse-report.ts');
    expect(workflow).toMatch(/issues:\s*write/);
  });

  it('renders the report even when the budget run failed', () => {
    // A breach is exactly when the report matters most; `if: always()` on the
    // render step is what keeps a red run from reporting nothing.
    const renderStep = workflow.slice(
      workflow.indexOf('- name: Render report'),
    );
    expect(renderStep.slice(0, 200)).toContain('if: always()');
  });

  it('only files and closes issues on the cron, never on a manual run', () => {
    // The whole point of moving off PRs is that a human firing this by hand
    // gets a job summary and nothing else — no issue churn. Every step that
    // touches an issue must carry the schedule guard.
    const issueSteps = workflow
      .split(/^\s*- name: /m)
      .filter((step) => /^[^\n]*tracking issue/i.test(step));

    expect(issueSteps).toHaveLength(2); // file-or-update, and close
    for (const step of issueSteps) {
      expect(step).toContain("github.event_name == 'schedule'");
    }
  });
});

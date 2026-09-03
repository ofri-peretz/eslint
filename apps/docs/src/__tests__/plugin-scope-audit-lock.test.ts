/**
 * Plugin Scope Audit Lock
 *
 * CI gate for the three-axis rule classification invariants enforced by
 * `scripts/ilb-plugin-scope-audit.ts`. Reads the pre-computed report from
 * `benchmark-results/plugin-scope-audit.json` and asserts:
 *
 *   I1  Every plugin rule has a manifest entry in `.agent/plugin-rule-manifest.json`.
 *   I2  Rule's environment tag is allowed in the plugin it lives in.
 *   I3  naming-heuristic detection → confidence must be review-prompt or opt-in.
 *   I4  enforcement confidence → detection must not be naming-heuristic.
 *   I5  No manifest entry is explicitly tagged with a violation field.
 *
 * The underlying classification model:
 *
 *   Environment axis:  universal | node | browser | express | jwt | pg |
 *                      mongodb | nestjs | lambda | vercel-ai
 *
 *   Detection axis:    structural-api | structural-pattern |
 *                      naming-heuristic | data-flow-lightweight
 *
 *   Confidence axis:   enforcement (error) | review-prompt (warn) | opt-in (off)
 *
 * To add a new rule: run `npm run ilb:scope-audit --generate` to regenerate
 * the manifest, review the auto-classification, correct any errors, then
 * commit both `.agent/plugin-rule-manifest.json` and `benchmark-results/plugin-scope-audit.json`.
 *
 * History: Prior to 2026-05, plugin scope was documented but not CI-enforced.
 * Rules like `browser-security/no-missing-cors-check` (an Express server-side
 * rule) and `secure-coding/no-missing-authentication` (requires Express route
 * handler context) shipped without detection. This lock closes that gap.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const REPO_ROOT = resolve(process.cwd(), '../..');
const REPORT_PATH = join(REPO_ROOT, 'benchmark-results', 'plugin-scope-audit.json');

describe('plugin scope audit', () => {
  it('benchmark-results/plugin-scope-audit.json exists', () => {
    expect(existsSync(REPORT_PATH)).toBe(true);
  });

  it('zero scope invariant violations (I1–I5)', () => {
    const report = JSON.parse(readFileSync(REPORT_PATH, 'utf-8')) as {
      findings: Array<{
        plugin: string;
        rule: string;
        invariant: string;
        detail: string;
      }>;
      summary: { total: number; byInvariant: Record<string, number> };
    };

    const formatted = report.findings.map(
      f => `[${f.invariant}] ${f.plugin}/${f.rule}: ${f.detail}`,
    );

    expect(report.findings, formatted.join('\n')).toHaveLength(0);
  });
});

#!/usr/bin/env -S npx tsx
/**
 * audit-api-surface — verify and report API-surface coverage per domain
 * security plugin.
 *
 * Reads `.agent/api-surface-manifest.json` (the hand-maintained per-plugin
 * audit), validates the math (covered ≤ total, percent matches the ratio),
 * checks every plugin meets the `target_floor_pct`, and renders
 * `benchmark-results/api-surface-coverage.md`.
 *
 * Closes the §2 "API-surface coverage" (gap) row in
 * `distribution/EVALUATION_METRICS.md`.
 *
 * Refresh policy: when a domain plugin gains or loses rules, re-audit
 * its target surface (read the public exports of the target SDK / runtime),
 * update the entry in `.agent/api-surface-manifest.json`, then re-run
 * this script.
 *
 * Usage:
 *   npm run audit:api-surface
 *   npm run audit:api-surface -- --strict   # fail if any plugin < floor
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  callout,
  collapsible,
  howToRead,
  kvSummary,
  reportHeader,
  table,
} from './lib/report-format.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, '.agent', 'api-surface-manifest.json');
const MD_PATH = path.join(REPO_ROOT, 'benchmark-results', 'api-surface-coverage.md');

export interface PluginEntry {
  plugin: string;
  surface: string;
  surfaceVersion: string;
  callableApis_total: number;
  callableApis_covered: number;
  coverage_pct: number;
  ruleCount: number;
  uncovered_examples: string[];
  notes: string;
}

interface Manifest {
  $schema?: string;
  description: string;
  method: string;
  generatedAt: string;
  target_floor_pct: number;
  plugins: PluginEntry[];
  summary: {
    aggregateCoverage_pct: number;
    pluginsAtOrAboveFloor: number;
    pluginsBelowFloor: number;
    criticalGaps: string[];
    note: string;
  };
}

export interface AuditFinding {
  plugin: string;
  severity: 'error' | 'warn';
  message: string;
}

export function auditManifest(m: Manifest): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const p of m.plugins) {
    if (p.callableApis_covered > p.callableApis_total) {
      findings.push({
        plugin: p.plugin,
        severity: 'error',
        message: `covered (${p.callableApis_covered}) > total (${p.callableApis_total})`,
      });
    }
    const computedPct =
      p.callableApis_total > 0
        ? Math.round((p.callableApis_covered / p.callableApis_total) * 100)
        : 0;
    if (Math.abs(computedPct - p.coverage_pct) > 1) {
      findings.push({
        plugin: p.plugin,
        severity: 'error',
        message: `coverage_pct (${p.coverage_pct}) disagrees with computed (${computedPct})`,
      });
    }
    if (p.coverage_pct < m.target_floor_pct) {
      findings.push({
        plugin: p.plugin,
        severity: 'warn',
        message: `coverage ${p.coverage_pct}% below target floor ${m.target_floor_pct}%`,
      });
    }
  }
  return findings;
}

export function recomputeSummary(m: Manifest): Manifest['summary'] {
  const totalPlugins = m.plugins.length;
  if (totalPlugins === 0) {
    return {
      aggregateCoverage_pct: 0,
      pluginsAtOrAboveFloor: 0,
      pluginsBelowFloor: 0,
      criticalGaps: [],
      note: m.summary.note,
    };
  }
  const agg = Math.round(
    m.plugins.reduce((acc, p) => acc + p.coverage_pct, 0) / totalPlugins,
  );
  const atFloor = m.plugins.filter((p) => p.coverage_pct >= m.target_floor_pct).length;
  const below = totalPlugins - atFloor;
  const critical = m.plugins
    .filter((p) => p.coverage_pct <= m.target_floor_pct + 5)
    .map(
      (p) =>
        `${p.plugin} @ ${p.coverage_pct}% — ${p.coverage_pct < m.target_floor_pct ? 'BELOW' : 'at'} the ${m.target_floor_pct}% floor.`,
    );
  return {
    aggregateCoverage_pct: agg,
    pluginsAtOrAboveFloor: atFloor,
    pluginsBelowFloor: below,
    criticalGaps: critical,
    note: m.summary.note,
  };
}

function renderMarkdown(m: Manifest): string {
  const total = m.plugins.length;
  const allPass = m.summary.pluginsBelowFloor === 0;
  const headline = allPass
    ? `${m.summary.pluginsAtOrAboveFloor}/${total} plugins at or above the ${m.target_floor_pct}% floor — aggregate **${m.summary.aggregateCoverage_pct}%**.`
    : `${m.summary.pluginsBelowFloor}/${total} plugins below the ${m.target_floor_pct}% floor — aggregate ${m.summary.aggregateCoverage_pct}%.`;

  const sections: string[] = [];

  sections.push(
    reportHeader({
      title: 'API-surface coverage per domain security plugin',
      status: allPass ? 'pass' : 'fail',
      statusLabel: allPass
        ? `${m.summary.pluginsAtOrAboveFloor}/${total} at floor`
        : `${m.summary.pluginsBelowFloor}/${total} below floor`,
      headlineSentence: headline,
      headlineMetric: { label: 'aggregate', value: `${m.summary.aggregateCoverage_pct}%` },
      asOf: m.generatedAt,
      generatedBy: 'npm run audit:api-surface',
      sourceFile: '.agent/api-surface-manifest.json',
      extraMeta: `Floor: every plugin should cover ≥ ${m.target_floor_pct}% of its target API surface.`,
    }),
  );

  sections.push('## Headline');
  sections.push('');
  sections.push(
    kvSummary([
      { key: 'Aggregate coverage', value: `${m.summary.aggregateCoverage_pct}%` },
      { key: 'Plugins at/above floor', value: `${m.summary.pluginsAtOrAboveFloor} / ${total}` },
      { key: 'Plugins below floor', value: String(m.summary.pluginsBelowFloor) },
      { key: 'Critical gaps (within 5 pts)', value: String(m.summary.criticalGaps.length) },
    ]),
  );
  sections.push('');

  if (!allPass) {
    sections.push(
      callout(
        'WARNING',
        `${m.summary.pluginsBelowFloor} plugin(s) below the ${m.target_floor_pct}% floor. Bring each back above the floor before merging.`,
      ),
    );
  } else if (m.summary.criticalGaps.length > 0) {
    sections.push(
      callout(
        'NOTE',
        `${m.summary.criticalGaps.length} plugin(s) within 5 points of the floor — listed below.`,
      ),
    );
  }

  sections.push('## Per-plugin coverage');
  sections.push('');
  sections.push(
    table({
      head: ['Plugin', 'Surface', 'Total APIs', 'Covered', 'Coverage %', 'Rule count', 'At/above floor?'],
      align: ['left', 'left', 'right', 'right', 'right', 'right', 'center'],
      rows: m.plugins.map((p) => [
        `\`${p.plugin}\``,
        p.surface,
        p.callableApis_total,
        p.callableApis_covered,
        `${p.coverage_pct}%`,
        p.ruleCount,
        p.coverage_pct >= m.target_floor_pct ? '✅' : '❌',
      ]),
    }),
  );
  sections.push('');

  if (m.summary.criticalGaps.length > 0) {
    sections.push('### Critical gaps (within 5 points of the floor)');
    sections.push('');
    for (const g of m.summary.criticalGaps) {
      sections.push(`- ${g}`);
    }
    sections.push('');
  }

  const perPluginBody: string[] = [];
  for (const p of m.plugins) {
    perPluginBody.push(`### \`${p.plugin}\` (${p.coverage_pct}%)`);
    perPluginBody.push('');
    perPluginBody.push(`- **Target surface:** ${p.surface} (${p.surfaceVersion})`);
    perPluginBody.push(`- **Notes:** ${p.notes}`);
    if (p.uncovered_examples.length > 0) {
      perPluginBody.push('- **Uncovered examples:**');
      for (const e of p.uncovered_examples) {
        perPluginBody.push(`  - ${e}`);
      }
    }
    perPluginBody.push('');
  }
  sections.push(collapsible('Per-plugin notes + uncovered examples', perPluginBody.join('\n')));
  sections.push('');

  sections.push(
    howToRead(
      '- **API-surface coverage** (`distribution/EVALUATION_METRICS.md` §2) — the `Coverage %` column. Per-plugin floor 60%. Aggregate is informational.\n- **Critical gaps** are plugins within 5 points of the floor — fix surface coverage proactively before a new rule pushes them below.\n- **Status badge** is green when every plugin is at/above the floor; red on any miss.',
    ),
  );

  return sections.join('\n') + '\n';
}

function main() {
  const strict = process.argv.includes('--strict');
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;

  const findings = auditManifest(manifest);
  const errors = findings.filter((f) => f.severity === 'error');
  const warns = findings.filter((f) => f.severity === 'warn');

  manifest.summary = { ...manifest.summary, ...recomputeSummary(manifest) };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(MD_PATH, renderMarkdown(manifest));

  // eslint-disable-next-line no-console
  console.log(
    `Audited ${manifest.plugins.length} plugin(s). Aggregate ${manifest.summary.aggregateCoverage_pct}%, floor ${manifest.target_floor_pct}%.`,
  );
  for (const f of findings) {
    const prefix = f.severity === 'error' ? 'ERROR' : 'WARN';
    // eslint-disable-next-line no-console
    console.error(`  ${prefix} ${f.plugin}: ${f.message}`);
  }
  if (errors.length > 0) {
    process.exit(1);
  }
  if (strict && warns.length > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('audit-api-surface.ts')) {
  main();
}

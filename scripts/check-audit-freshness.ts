#!/usr/bin/env -S npx tsx
/**
 * check-audit-freshness — fail when any of the hand-maintained audit
 * artifacts is older than its declared TTL.
 *
 * The dimensions Interlace measures itself on (peer health, CVE
 * latency, API-surface coverage, per-rule budget) are only honest
 * signals if they refresh on a known cadence. This script is the
 * regression guard.
 *
 * Behavior:
 *   - Reads each artifact's freshness anchor (`generatedAt`, `lastValidated`,
 *     `summary.asOf`, or the file's mtime as fallback).
 *   - Compares against the artifact's TTL (default 90 days unless
 *     overridden in the config below).
 *   - Reports the staleness in days. Fails (exit 1) if any artifact is
 *     past TTL, unless `--soft` is passed.
 *
 * Usage:
 *   npm run check:audit-freshness          # strict (CI default)
 *   npm run check:audit-freshness -- --soft
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

interface Artifact {
  /** Human label for output. */
  label: string;
  /** Path relative to REPO_ROOT. */
  path: string;
  /** JSON key (dot-notation) whose value is the freshness anchor date. */
  anchorKey?: string;
  /** TTL in days. Stale if (now - anchor) > ttlDays. */
  ttlDays: number;
  /** Refresh command for the operator-facing error message. */
  refreshCmd: string;
}

const ARTIFACTS: Artifact[] = [
  {
    label: 'API-surface manifest',
    path: '.agent/api-surface-manifest.json',
    anchorKey: 'generatedAt',
    ttlDays: 90,
    refreshCmd: 'npm run audit:api-surface',
  },
  {
    label: 'CVE → rule latency audit',
    path: 'benchmark-results/cve-rule-latency.json',
    anchorKey: 'summary.asOf',
    ttlDays: 30,
    refreshCmd: 'npm run audit:cve-latency',
  },
  {
    label: 'Per-rule p95 budget',
    path: 'benchmarks/budgets/per-rule-p95.json',
    anchorKey: 'lastValidated',
    ttlDays: 90,
    refreshCmd: 'Update lastValidated after the next ilb:flagship run',
  },
  {
    label: 'Peer-plugin health snapshot',
    path: 'benchmark-results/peer-health.json',
    anchorKey: 'generatedAt',
    ttlDays: 14,
    refreshCmd: 'npm run peer-health (or wait for the weekly workflow)',
  },
  {
    label: 'Resource profile (RSS + cold start)',
    path: 'benchmark-results/resource-profile.json',
    anchorKey: 'generatedAt',
    ttlDays: 180,
    refreshCmd: 'npm run ilb:resource-profile',
  },
];

interface FreshnessRow {
  label: string;
  path: string;
  anchor: string | null;
  ageDays: number | null;
  ttlDays: number;
  status: 'fresh' | 'stale' | 'missing' | 'no-anchor';
  refreshCmd: string;
}

function readJsonKey(obj: unknown, dotKey: string): unknown {
  let cur: unknown = obj;
  for (const part of dotKey.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

export function checkArtifact(a: Artifact, repoRoot = REPO_ROOT, now = Date.now()): FreshnessRow {
  const full = path.join(repoRoot, a.path);
  if (!fs.existsSync(full)) {
    return {
      label: a.label,
      path: a.path,
      anchor: null,
      ageDays: null,
      ttlDays: a.ttlDays,
      status: 'missing',
      refreshCmd: a.refreshCmd,
    };
  }
  let anchorStr: string | null = null;
  if (a.anchorKey) {
    try {
      const raw = fs.readFileSync(full, 'utf8');
      const json = JSON.parse(raw);
      const val = readJsonKey(json, a.anchorKey);
      if (typeof val === 'string') anchorStr = val;
    } catch {
      // Fall through to mtime fallback below.
    }
  }
  let anchorMs: number;
  if (anchorStr) {
    anchorMs = new Date(anchorStr).getTime();
    if (Number.isNaN(anchorMs)) {
      return {
        label: a.label,
        path: a.path,
        anchor: anchorStr,
        ageDays: null,
        ttlDays: a.ttlDays,
        status: 'no-anchor',
        refreshCmd: a.refreshCmd,
      };
    }
  } else {
    // Fallback: file mtime.
    anchorMs = fs.statSync(full).mtimeMs;
  }
  const ageDays = Math.floor((now - anchorMs) / (1000 * 60 * 60 * 24));
  return {
    label: a.label,
    path: a.path,
    anchor: anchorStr ?? `(mtime: ${new Date(anchorMs).toISOString().slice(0, 10)})`,
    ageDays,
    ttlDays: a.ttlDays,
    status: ageDays > a.ttlDays ? 'stale' : 'fresh',
    refreshCmd: a.refreshCmd,
  };
}

function main() {
  const soft = process.argv.includes('--soft');
  const rows = ARTIFACTS.map((a) => checkArtifact(a));

  // eslint-disable-next-line no-console
  console.log(`Audit-freshness check — ${rows.length} artifact(s).`);
  for (const r of rows) {
    const icon =
      r.status === 'fresh' ? '✅' : r.status === 'missing' ? '⚪️' : '❌';
    // eslint-disable-next-line no-console
    console.log(
      `  ${icon} ${r.label}: ${r.status}` +
        (r.ageDays !== null ? ` (age ${r.ageDays}d, TTL ${r.ttlDays}d)` : ''),
    );
  }

  const stale = rows.filter((r) => r.status === 'stale' || r.status === 'no-anchor');
  if (stale.length > 0) {
    // eslint-disable-next-line no-console
    console.error('\nStale or invalid artifacts:');
    for (const r of stale) {
      // eslint-disable-next-line no-console
      console.error(`  - ${r.label} (${r.path}) — refresh: ${r.refreshCmd}`);
    }
    if (!soft) process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('check-audit-freshness.ts')) {
  main();
}

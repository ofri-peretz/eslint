/**
 * Append-only history (roadmap item 1.12) — operationalizes principle #9.
 *
 * Every bench run MUST append a single NDJSON row to
 * `benchmark-results/history.ndjson`. The file is the source of truth for
 * "how has this bench drifted over time?" and the source for `npm run
 * ilb:trend`. Never overwrite. Never delete rows. If a run was botched, mark
 * it `superseded: true` in a follow-up row.
 *
 * Row shape (one JSON object per line):
 *   {
 *     bench:             "ILB-Arena",
 *     benchVersion:      "1.0",
 *     timestamp:         "2026-05-09T15:34:11.000Z",
 *     toolchain:         { ...standard toolchain block... },
 *     methodologyCommit: "abc1234",            // optional until item 1.5 ships
 *     summary: {                               // ≤ 500 bytes — drill via JSON files for full data
 *       f1, precision, recall, msPerFile, tokensO200k, ...
 *     },
 *     resultPath: "benchmarks/results/ilb-arena/2026-05-09.json",
 *     superseded: false
 *   }
 */

import fs from 'node:fs';
import path from 'node:path';
import { getToolchain } from './toolchain.ts';

const REPO_ROOT_FROM_HERE = path.resolve(new URL('..', import.meta.url).pathname, '..');
const DEFAULT_HISTORY_PATH = path.join(REPO_ROOT_FROM_HERE, 'benchmark-results', 'history.ndjson');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

/**
 * Distill a result envelope down to a ≤500-byte summary suitable for the
 * NDJSON history. Drops large arrays (per-fixture results, raw timings) since
 * those live in the corresponding result JSON.
 *
 * @param {object} result
 * @returns {object}
 */
function distillSummary(result) {
  const summary = {};
  if (result.cost) Object.assign(summary, pickNumeric(result.cost));
  if (result.effectiveness) Object.assign(summary, pickNumeric(result.effectiveness));
  if (result.latency) Object.assign(summary, pickNumeric(result.latency));
  // Common roll-ups some bench runners emit at the top level
  for (const k of ['rank', 'tp', 'fp', 'fn', 'tn', 'bas']) {
    if (typeof result[k] === 'number') summary[k] = result[k];
  }
  return summary;
}

function pickNumeric(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

/**
 * Append a result row to the history NDJSON. Idempotent on (bench, timestamp,
 * resultPath) — duplicate calls within 1ms are coalesced silently.
 *
 * @param {object} result               full result envelope
 * @param {string} resultPath           path of the JSON file the result came from
 * @param {object} [opts]
 * @param {string} [opts.historyPath]   override target NDJSON path (CI / tests)
 * @returns {string}                    the historyPath that was written
 */
export function appendHistory(result, resultPath, opts = {}) {
  const historyPath = opts.historyPath ?? DEFAULT_HISTORY_PATH;
  ensureDir(historyPath);

  const row = {
    bench: result.bench ?? 'unknown',
    benchVersion: result.benchVersion ?? 'unversioned',
    timestamp: result.timestamp ?? new Date().toISOString(),
    toolchain: result.toolchain ?? getToolchain(),
    methodologyCommit: result.methodologyCommit ?? null,
    summary: distillSummary(result),
    resultPath: path.relative(REPO_ROOT_FROM_HERE, path.resolve(resultPath)),
    superseded: false,
  };

  const line = JSON.stringify(row);
  if (line.length > 4096) {
    throw new Error(`history row too large (${line.length}B) — distill more aggressively. resultPath=${resultPath}`);
  }
  fs.appendFileSync(historyPath, line + '\n', 'utf8');
  return historyPath;
}

/**
 * Iterate rows in the history NDJSON, newest last. Streaming — does not load
 * the whole file. Yields parsed objects.
 *
 * @param {string} [historyPath]
 */
export function* readHistory(historyPath = DEFAULT_HISTORY_PATH) {
  if (!fs.existsSync(historyPath)) return;
  const raw = fs.readFileSync(historyPath, 'utf8');
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line);
    } catch (err) {
      // Corrupt lines are non-fatal — log and continue. Audit script catches them.
      process.stderr.write(`history.ndjson: skipping malformed row (${err.message})\n`);
    }
  }
}

/**
 * Filter history rows by bench + (optional) since-date.
 *
 * @param {string} bench
 * @param {Date|string} [since]
 * @param {string} [historyPath]
 */
export function* historyFor(bench, since, historyPath) {
  const sinceMs = since ? new Date(since).getTime() : 0;
  for (const row of readHistory(historyPath)) {
    if (row.bench !== bench) continue;
    if (sinceMs && new Date(row.timestamp).getTime() < sinceMs) continue;
    yield row;
  }
}

export const HISTORY_PATH = DEFAULT_HISTORY_PATH;

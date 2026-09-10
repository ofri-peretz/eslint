#!/usr/bin/env -S npx tsx
/**
 * audit-api-surface — report API-surface coverage per plugin, from the surface.
 *
 * ## What changed, and why it had to
 *
 * This script used to read `.agent/api-surface-manifest.json` and check that
 * the numbers in it were internally consistent and above a floor. Every figure
 * in the published table — including the "100%" beside two plugins — was typed
 * by a human. The script never read a rule and never read an API surface, so
 * "drive the table to 100%" was a text edit taking ninety seconds, and the
 * check could not tell that edit apart from the work.
 *
 * The numbers now come from `measure-api-surface.mts`, which enumerates each
 * plugin's declared surface at the installed version and asks which of those
 * names appear in the rule sources. The manifest keeps only what a measurement
 * cannot produce: the prose description of a surface, and the `outOfScope`
 * judgements with their reasons.
 *
 * ## Why every figure is published as an upper bound
 *
 * Naming an API is NECESSARY for a rule to act on it and not SUFFICIENT — the
 * name could sit in a comment. So the measurement bounds coverage from above:
 * an API that appears nowhere is provably uncovered, and one that appears is
 * only *possibly* covered. Turning that into an exact figure means probing each
 * API with a real misuse snippet, which cannot be generated mechanically.
 *
 * That asymmetry decides the gate. A plugin whose UPPER bound sits below the
 * floor is proven below it, and fails. A plugin above the floor has proven
 * nothing, and is reported as `not proven` — never as a pass. A gate that
 * announced "pass" on an upper bound would be the original defect wearing a
 * measurement's clothes.
 *
 * Usage:
 *   npm run audit:api-surface               # errors fail; recorded debt warns
 *   npm run audit:api-surface -- --strict   # recorded debt fails too
 */

import { execFileSync } from 'node:child_process';
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
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  '.agent',
  'api-surface-manifest.json',
);
const DEBT_PATH = path.join(REPO_ROOT, '.agent', 'api-surface-floor-debt.json');
const MD_PATH = path.join(
  REPO_ROOT,
  'benchmark-results',
  'api-surface-coverage.md',
);
const MEASURE = path.join(HERE, 'measure-api-surface.mts');

/**
 * An API on the target surface that is deliberately NOT a rule target —
 * because it is not a security sink for this plugin's threat model, not
 * because we haven't got to it yet.
 *
 * Every entry carries a `reason`. That is the whole safeguard: without it,
 * excluding an API is indistinguishable from hiding a gap. `auditSurfaces`
 * rejects a missing or hand-wavy reason, so "it's niche" / "rare" can never
 * buy a point — rarity is a prioritisation argument, not a scope argument.
 */
export interface OutOfScopeApi {
  api: string;
  reason: string;
}

/** What a human asserts about a plugin. No counts: those are measured. */
export interface PluginEntry {
  plugin: string;
  surface: string;
  surfaceVersion: string;
  /**
   * Whether the denominator is the consumer-callable surface, or the raw
   * module enumeration.
   *
   * The floor applies to `curated` only. A raw denominator can be wrong in
   * either direction — `@aws-sdk/client-lambda` enumerates the Lambda control
   * plane, which a handler-security plugin has no business covering, and
   * `better-sqlite3` reads as one callable because it default-exports a class.
   * Failing a plugin against a number like that, or letting it pass on one,
   * repeats the defect this audit exists to fix while looking measured.
   */
  denominatorTrust: 'curated' | 'raw';
  denominatorNote: string;
  notes: string;
  outOfScope?: OutOfScopeApi[];
}

/** One plugin as `measure-api-surface.mts --json` reports it. */
export interface Measured {
  plugin: string;
  surfaceSize: number;
  namedCount: number;
  upperBoundPct: number;
  surface: string[];
  uncovered: string[];
}

export interface NotEnumerable {
  plugin: string;
  kind: string;
  note?: string;
}

export interface Measurement {
  measuredAt: string;
  node: string;
  measured: Measured[];
  notEnumerable: NotEnumerable[];
}

/**
 * Fields that used to hold a typed number.
 *
 * Rejecting the FIELD, rather than checking the value against the measurement,
 * is deliberate: a value check can be satisfied by editing the value, and the
 * whole failure being fixed here is that editing the value was indistinguishable
 * from doing the work. A manifest that cannot express a count cannot publish one.
 */
const FORBIDDEN_FIELDS = [
  'callableApis_total',
  'callableApis_covered',
  'coverage_pct',
  'ruleCount',
  'uncovered_examples',
] as const;

/**
 * Reasons that describe how *often* an API is misused, rather than whether
 * misuse is a security problem. A rare sink is a low-priority gap, not an
 * out-of-scope API.
 */
/**
 * A coverage figure written into prose.
 *
 * Removing the count FIELDS moved the problem rather than solving it: three
 * `notes` still carried hand-typed percentages ("63% is at the floor", "75% on
 * a moving target"), and `renderMarkdown` prints each note directly beneath
 * the measured upper bound — so the report showed a measured figure and a
 * typed one side by side, disagreeing. One of them said 63% while the
 * measurement said 17%.
 *
 * A note is for judgement. The numbers come from the measurement or they do
 * not appear.
 */
const COVERAGE_FIGURE_IN_NOTES =
  /\d+\s*%|\bof \d+\b|\b\d+ (?:APIs?|callables?)\b/i;

/**
 * A `denominatorNote` may cite a surface SIZE — that is the argument.
 *
 * "Reads as 1 callable because better-sqlite3 default-exports a class" is the
 * whole reason that denominator is marked raw, and deleting the number would
 * leave an assertion with no evidence. A PERCENTAGE is different: coverage is
 * the measurement's to state, never prose's.
 */
const PERCENT_IN_PROSE = /\d+\s*%/;

const FREQUENCY_NOT_SCOPE =
  /\b(niche|rare|rarely|uncommon|low[- ]traffic|low[- ]frequency|infrequent|not common)\b/i;
const MIN_REASON_LENGTH = 20;

export interface AuditFinding {
  plugin: string;
  severity: 'error' | 'warn';
  message: string;
}

/** Coverage of the security-relevant slice, bounded from above. */
export function upperBoundPct(m: Measured, outOfScope: number): number {
  const denominator = m.surfaceSize - outOfScope;
  if (denominator <= 0) return 0;
  return Math.round((m.namedCount / denominator) * 100);
}

export function auditSurfaces(
  entries: PluginEntry[],
  measurement: Measurement,
  floorPct: number,
  debt: string[],
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const byPlugin = new Map(measurement.measured.map((m) => [m.plugin, m]));
  const notEnumerable = new Set(measurement.notEnumerable.map((n) => n.plugin));

  for (const p of entries) {
    const raw = p as unknown as Record<string, unknown>;
    for (const field of FORBIDDEN_FIELDS) {
      if (raw[field] !== undefined) {
        findings.push({
          plugin: p.plugin,
          severity: 'error',
          message: `"${field}" is measured, not declared — remove it; a hand-typed count is the defect this audit exists to prevent`,
        });
      }
    }

    const seen = new Set<string>();
    for (const o of p.outOfScope ?? []) {
      const reason = (o.reason ?? '').trim();
      if (reason.length < MIN_REASON_LENGTH) {
        findings.push({
          plugin: p.plugin,
          severity: 'error',
          message: `outOfScope "${o.api}" needs a substantive reason (got ${reason.length} chars); an unjustified exclusion is a hidden gap`,
        });
      } else if (FREQUENCY_NOT_SCOPE.test(reason)) {
        findings.push({
          plugin: p.plugin,
          severity: 'error',
          message: `outOfScope "${o.api}" is argued from frequency ("${reason}"), not threat model — a rare sink is a low-priority gap, keep it in the denominator`,
        });
      }
      if (seen.has(o.api)) {
        findings.push({
          plugin: p.plugin,
          severity: 'error',
          message: `outOfScope lists "${o.api}" twice, which would deflate the denominator by 2`,
        });
      }
      seen.add(o.api);
    }

    const measured = byPlugin.get(p.plugin);
    if (measured === undefined) {
      if (!notEnumerable.has(p.plugin)) {
        findings.push({
          plugin: p.plugin,
          severity: 'error',
          message: `no measurement — the surface could not be enumerated and the plugin is not declared unenumerable`,
        });
      }
      continue;
    }

    /*
     * An excluded API that is not on the measured surface deflates the
     * denominator for free — the same trick as a typed count, one indirection
     * further out. The measurement reports the whole surface so this is
     * checkable rather than taken on trust.
     */
    const onSurface = new Set(measured.surface);
    for (const o of p.outOfScope ?? []) {
      if (!onSurface.has(o.api)) {
        findings.push({
          plugin: p.plugin,
          severity: 'error',
          message: `outOfScope "${o.api}" is not on the measured surface — excluding a name that was never counted shrinks the denominator for free`,
        });
      }
    }

    for (const [field, text, pattern] of [
      ['notes', p.notes, COVERAGE_FIGURE_IN_NOTES],
      ['denominatorNote', p.denominatorNote, PERCENT_IN_PROSE],
    ] as const) {
      const m = pattern.exec(String(text ?? ''));
      if (m !== null) {
        findings.push({
          plugin: p.plugin,
          severity: 'error',
          message: `${field} states a figure ("${m[0]}") — the report prints it beside the measured bound, where a typed number and a measured one disagree in public. Describe the judgement; the measurement supplies the numbers`,
        });
      }
    }

    if ((p.denominatorNote ?? '').trim().length < MIN_REASON_LENGTH) {
      findings.push({
        plugin: p.plugin,
        severity: 'error',
        message: `denominatorNote must say what the denominator is and why it can be trusted; "curated" without an argument is just an assertion`,
      });
    }

    const bound = upperBoundPct(measured, (p.outOfScope ?? []).length);
    if (p.denominatorTrust !== 'curated') continue;
    if (bound < floorPct && debt.includes(p.plugin)) {
      /*
       * Recorded debt. The base run accepts it — that is what the debt list is
       * for — but it says so out loud rather than skipping in silence, and
       * `--strict` escalates it to a failure.
       *
       * Without this the three plugins below the floor produced no output at
       * all, and `--strict` had nothing to escalate: every other finding here
       * is an error, so `findings.length === errors.length` always held and
       * the strict branch could never fire independently. A flag that cannot
       * change an outcome is the defect this audit exists to remove, one
       * level up from the manifest.
       */
      findings.push({
        plugin: p.plugin,
        severity: 'warn',
        message: `upper bound ${bound}% is below the ${floorPct}% floor — recorded debt, and the list only shrinks`,
      });
      continue;
    }
    if (bound < floorPct && !debt.includes(p.plugin)) {
      findings.push({
        plugin: p.plugin,
        severity: 'error',
        message: `upper bound ${bound}% is below the ${floorPct}% floor and is not in the recorded debt — a plugin may not newly drop below the floor`,
      });
    }
  }

  for (const stale of debt) {
    const measured = byPlugin.get(stale);
    if (measured === undefined) continue;
    const entry = entries.find((e) => e.plugin === stale);
    if (entry?.denominatorTrust !== 'curated') {
      findings.push({
        plugin: stale,
        severity: 'error',
        message: `is recorded as below-floor debt but its denominator is raw — a debt against an untrusted number is not a debt`,
      });
      continue;
    }
    const bound = upperBoundPct(measured, (entry?.outOfScope ?? []).length);
    if (bound >= floorPct) {
      findings.push({
        plugin: stale,
        severity: 'error',
        message: `is recorded as below-floor debt but now bounds at ${bound}% — remove it from api-surface-floor-debt.json; the debt list only shrinks`,
      });
    }
  }

  return findings;
}

/** Rule directories on disk — derived, so it cannot drift from the plugin. */
function ruleCount(plugin: string): number {
  const dir = path.join(REPO_ROOT, 'packages', plugin, 'src', 'rules');
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory()).length;
}

interface Manifest {
  $schema?: string;
  description: string;
  method: string;
  target_floor_pct: number;
  plugins: PluginEntry[];
}

function renderMarkdown(
  m: Manifest,
  measurement: Measurement,
  debt: string[],
): string {
  const byPlugin = new Map(measurement.measured.map((x) => [x.plugin, x]));
  const rows = m.plugins
    .map((p) => ({ entry: p, measured: byPlugin.get(p.plugin) }))
    .filter(
      (r): r is { entry: PluginEntry; measured: Measured } =>
        r.measured !== undefined,
    );

  /*
   * Only a curated denominator can be below the floor, because only a curated
   * denominator means anything. Counting the raw ones here would print a
   * verdict the gate does not hold — the report and the check disagreeing is
   * the same defect as a number nobody measured.
   */
  const curated = rows.filter((r) => r.entry.denominatorTrust === 'curated');
  const belowFloor = curated.filter(
    (r) =>
      upperBoundPct(r.measured, (r.entry.outOfScope ?? []).length) <
      m.target_floor_pct,
  );
  const newlyBelow = belowFloor.filter((r) => !debt.includes(r.entry.plugin));
  const sections: string[] = [];

  sections.push(
    reportHeader({
      title: 'API-surface coverage per plugin',
      status: newlyBelow.length === 0 ? 'pass' : 'fail',
      statusLabel:
        newlyBelow.length === 0
          ? `${belowFloor.length} known below floor, 0 new`
          : `${newlyBelow.length} newly below floor`,
      headlineSentence:
        `Every figure below is an UPPER BOUND, measured from each plugin's declared surface at the installed version. ` +
        `${belowFloor.length} of ${curated.length} plugin(s) with a curated denominator are proven below the ${m.target_floor_pct}% floor; ` +
        `the other ${rows.length - curated.length} measured plugin(s) have a raw denominator and are not judged against it.`,
      headlineMetric: { label: 'measured plugins', value: String(rows.length) },
      asOf: measurement.measuredAt,
      generatedBy: 'npm run audit:api-surface',
      sourceFile: 'scripts/measure-api-surface.mts',
      extraMeta: `Surfaces enumerated on ${measurement.node}. Floor: ${m.target_floor_pct}%.`,
    }),
  );

  sections.push('## Headline');
  sections.push('');
  sections.push(
    kvSummary([
      { key: 'Plugins measured', value: String(rows.length) },
      {
        key: 'Denominator curated (floor applies)',
        value: String(curated.length),
      },
      {
        key: 'Denominator raw (not judged)',
        value: String(rows.length - curated.length),
      },
      {
        key: 'Not enumerable (measured as such)',
        value: String(measurement.notEnumerable.length),
      },
      { key: 'Proven below floor', value: String(belowFloor.length) },
      { key: 'Newly below floor', value: String(newlyBelow.length) },
    ]),
  );
  sections.push('');

  sections.push(
    callout(
      'IMPORTANT',
      'No plugin here is reported as **passing** the floor. Naming an API is necessary for a rule to act on it and not sufficient, so the measurement bounds coverage from above: a bound below the floor is proof of a miss, and a bound above it proves nothing. An exact figure needs a misuse probe per API, which cannot be generated mechanically.',
    ),
  );
  sections.push('');

  sections.push('## Per-plugin coverage (upper bound)');
  sections.push('');
  sections.push(
    table({
      head: [
        'Plugin',
        'Surface',
        'Surface APIs',
        'Denominator',
        'Out of scope',
        'In scope',
        'Named by a rule',
        'Coverage (≤)',
        'Rules',
        'Below floor?',
      ],
      align: [
        'left',
        'left',
        'right',
        'left',
        'right',
        'right',
        'right',
        'right',
        'right',
        'center',
      ],
      rows: rows.map(({ entry, measured }) => {
        const oos = (entry.outOfScope ?? []).length;
        const bound = upperBoundPct(measured, oos);
        return [
          `\`${entry.plugin}\``,
          entry.surface,
          measured.surfaceSize,
          entry.denominatorTrust,
          oos,
          measured.surfaceSize - oos,
          measured.namedCount,
          `≤ ${bound}%`,
          ruleCount(entry.plugin),
          entry.denominatorTrust !== 'curated'
            ? 'denominator raw'
            : bound < m.target_floor_pct
              ? '❌ below'
              : 'not proven',
        ];
      }),
    }),
  );
  sections.push('');

  if (measurement.notEnumerable.length > 0) {
    sections.push('## Not enumerable — which is a measurement, not a gap');
    sections.push('');
    sections.push(
      'These plugins analyse plain JavaScript, or the web platform. No npm package describes either surface, so no percentage can honestly be published for them. Saying so is a different statement from silence.',
    );
    sections.push('');
    sections.push(
      table({
        head: ['Plugin', 'Surface kind'],
        align: ['left', 'left'],
        rows: measurement.notEnumerable.map((n) => [`\`${n.plugin}\``, n.kind]),
      }),
    );
    sections.push('');
  }

  const body: string[] = [];
  for (const { entry, measured } of rows) {
    const oos = (entry.outOfScope ?? []).length;
    body.push(`### \`${entry.plugin}\` (≤ ${upperBoundPct(measured, oos)}%)`);
    body.push('');
    body.push(
      `- **Target surface:** ${entry.surface} (${entry.surfaceVersion})`,
    );
    body.push(`- **Notes:** ${entry.notes}`);
    if (measured.uncovered.length > 0) {
      body.push(
        `- **Named nowhere in the rule sources (${measured.uncovered.length}) — provably uncovered:**`,
      );
      body.push(`  - \`${measured.uncovered.join('`, `')}\``);
    }
    if (oos > 0) {
      body.push('- **Out of scope (excluded from the denominator):**');
      for (const o of entry.outOfScope ?? [])
        body.push(`  - \`${o.api}\` — ${o.reason}`);
    }
    body.push('');
  }
  sections.push(
    collapsible('Per-plugin surface, gaps and exclusions', body.join('\n')),
  );
  sections.push('');

  sections.push(
    howToRead(
      '- **Coverage (≤)** is an upper bound: `Named by a rule / In scope`, where "named" means the API appears somewhere in the plugin\'s rule sources. It cannot be a pass mark — see the note above.\n' +
        "- **In scope** is the measured surface minus `Out of scope`: APIs that are not security sinks under this plugin's threat model. Each carries a written reason; the audit rejects reasons that argue from rarity rather than threat model, and rejects an exclusion naming an API that is not on the measured surface.\n" +
        '- **Denominator** is `curated` when the surface has been reviewed down to the API a consumer actually calls, and `raw` when it is still the whole module enumeration. A raw denominator can be wrong in either direction — `@aws-sdk/client-lambda` enumerates the Lambda control plane, and `better-sqlite3` reads as one callable because it default-exports a class — so those plugins publish their bound and are not judged against the floor.\n' +
        '- **Below floor?** is `❌ below` only for a curated denominator whose *upper* bound misses the floor, which is proof. A curated denominator above the floor reads `not proven`; a raw one reads `denominator raw`.\n' +
        '- **Rules** counts rule directories on disk.\n' +
        '- The debt list in `.agent/api-surface-floor-debt.json` records the plugins already below the floor. It only shrinks: a plugin may not newly drop below.',
    ),
  );

  return sections.join('\n') + '\n';
}

function main(): void {
  const strict = process.argv.includes('--strict');
  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, 'utf8'),
  ) as Manifest;
  const debt = (
    JSON.parse(fs.readFileSync(DEBT_PATH, 'utf8')) as { belowFloor: string[] }
  ).belowFloor;

  const measurement = JSON.parse(
    execFileSync('npx', ['tsx', MEASURE, '--json'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
    }),
  ) as Measurement;

  const findings = auditSurfaces(
    manifest.plugins,
    measurement,
    manifest.target_floor_pct,
    debt,
  );
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warn');

  fs.writeFileSync(MD_PATH, renderMarkdown(manifest, measurement, debt));

  // eslint-disable-next-line no-console
  console.log(
    `Measured ${measurement.measured.length} plugin(s) on ${measurement.node}; ` +
      `${measurement.notEnumerable.length} have no enumerable surface. Floor ${manifest.target_floor_pct}%.`,
  );
  for (const f of findings) {
    // eslint-disable-next-line no-console
    console.error(
      `  ${f.severity === 'error' ? 'ERROR' : 'WARN'} ${f.plugin}: ${f.message}`,
    );
  }
  if (errors.length > 0) process.exit(1);
  // `--strict` is the "is the debt gone yet" mode, not the everyday one. CI
  // runs the base command: accepting recorded debt is the point of recording it.
  if (strict && warnings.length > 0) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('audit-api-surface.ts')) {
  main();
}

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The case registry — what we are accountable for, and the evidence we cover it.
 *
 * `RULE_CASES.md` is rule-first: it reports what each rule's tests happen to
 * say. That is useful and it is not accountability, because a rule cannot be
 * missing a case it never claimed. Nothing in it answers "is prototype
 * pollution through a request-supplied key covered, and how do we know".
 *
 * This register inverts it. The unit is a CASE — a thing that happens in real
 * code, identified like a vulnerability record: an id that never changes, a
 * CWE, a severity, the places it has been observed, and references to the
 * public record. Coverage is then a CLAIM ABOUT THE CASE ("rule X reports it"),
 * and this script is what turns that claim into evidence: it runs the case's
 * own code through the named rule and checks the verdict.
 *
 * ## Why the evidence is executed rather than cited
 *
 * A registry that stores "covered: yes" is a spreadsheet, and it starts
 * decaying the moment a rule changes. Every `status` in the generated report is
 * computed on this run, so a rule that stops covering a case cannot leave the
 * claim standing — the entry flips to `regressed` and the gate fails.
 *
 * ## Append-only, and shrink-only
 *
 * Ids are never reused and entries are never deleted; a case that no longer
 * applies is marked `retired` with a reason and keeps its number. The verified
 * SET is ratcheted, not just its size: a case that was verified and is not any
 * more fails the gate by name, so improving one area cannot quietly undo
 * another. That is the property that lets many hands work on this at once.
 *
 * Run:
 *   npx tsx scripts/case-registry.mts           # verify + write the report
 *   npx tsx scripts/case-registry.mts --check   # gate only, no writes
 *   npx tsx scripts/case-registry.mts --update  # accept a new verified set
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import * as tsparser from '@typescript-eslint/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const REGISTRY = path.join(ROOT, 'benchmarks', 'cases', 'registry.json');
const BASELINE = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'case-registry-baseline.json',
);
const OUT_MD = path.join(ROOT, 'benchmarks', 'CASE_REGISTRY.md');

const CHECK = process.argv.includes('--check');
const UPDATE = process.argv.includes('--update');

/** A claim that one rule answers one way about this case. */
type Coverage = {
  /** `plugin/rule`, as published. */
  rule: string;
  /** What the rule must do with `code`. */
  expect: 'report' | 'silent';
  /** The RuleTester file that pins this, so the claim has a home in the suite. */
  evidence?: string;
};

type Reference = {
  id: string;
  url?: string;
  /**
   * Whether a human has checked this against the upstream record. A reference
   * carried from memory is a lead, not a citation, and the difference has to be
   * visible or the register launders one into the other.
   */
  verified: boolean;
};

type Occurrence = { repo: string; path?: string; line?: number };

type Case = {
  id: string;
  added: string;
  title: string;
  /** What makes this a defect, or explicitly why it is not one. */
  rationale: string;
  cwe: string | null;
  severity: {
    cvss: number | null;
    vector: string | null;
    source: string | null;
  };
  references: Reference[];
  /** Where this has actually been seen. Empty means "constructed", and says so. */
  occurrences: Occurrence[];
  code: string;
  coverage: Coverage[];
  retired?: string;
};

type Registry = { note: string; cases: Case[] };

const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) as Registry;

/** Ids are permanent: reusing one rewrites history that other files cite. */
const seen = new Set<string>();
for (const entry of registry.cases) {
  if (seen.has(entry.id)) throw new Error(`duplicate case id: ${entry.id}`);
  seen.add(entry.id);
}

const linter = new Linter();
const pluginCache = new Map<string, Record<string, unknown>>();

async function ruleFor(qualified: string): Promise<unknown | null> {
  const [pkg, ...rest] = qualified.split('/');
  const name = rest.join('/');
  if (!pluginCache.has(pkg)) {
    const entry = path.join(
      ROOT,
      'packages',
      `eslint-plugin-${pkg}`,
      'src',
      'index.ts',
    );
    if (!fs.existsSync(entry)) return null;
    const mod = (await import(entry)) as {
      default?: { rules?: Record<string, unknown> };
      rules?: Record<string, unknown>;
    };
    pluginCache.set(
      pkg,
      (mod.default?.rules ?? mod.rules ?? {}) as Record<string, unknown>,
    );
  }
  return pluginCache.get(pkg)?.[name] ?? null;
}

/**
 * Reports, or `null` when the harness could not perform the run.
 *
 * A flat config with no `files` key matches nothing, and ESLint says so as a
 * message with a null `ruleId` — which reads as a finding unless it is checked
 * for. That confusion produced six meaningless readings earlier in this work,
 * so an unscoreable run is reported as unscoreable rather than counted either
 * way.
 */
function reportsFor(rule: unknown, name: string, code: string): number | null {
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx,js,jsx}'],
        plugins: { p: { rules: { [name]: rule } } as never },
        languageOptions: {
          parser: tsparser as never,
          parserOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            ecmaFeatures: { jsx: true },
          },
        },
        rules: { [`p/${name}`]: 'error' },
      },
    ],
    'case.tsx',
  );
  if (messages.some((m) => m.ruleId === null)) return null;
  return messages.length;
}

type Verdict = {
  case: Case;
  results: {
    rule: string;
    expect: string;
    reports: number | null;
    ok: boolean;
  }[];
  status: 'verified' | 'regressed' | 'unscoreable' | 'uncovered' | 'retired';
};

const verdicts: Verdict[] = [];
for (const entry of registry.cases) {
  if (entry.retired !== undefined) {
    verdicts.push({ case: entry, results: [], status: 'retired' });
    continue;
  }
  if (entry.coverage.length === 0) {
    verdicts.push({ case: entry, results: [], status: 'uncovered' });
    continue;
  }
  const results = [];
  for (const claim of entry.coverage) {
    const rule = await ruleFor(claim.rule);
    const name = claim.rule.split('/').slice(1).join('/');
    const reports = rule === null ? null : reportsFor(rule, name, entry.code);
    const ok =
      reports === null
        ? false
        : claim.expect === 'report'
          ? reports > 0
          : reports === 0;
    results.push({ rule: claim.rule, expect: claim.expect, reports, ok });
  }
  const status = results.some((r) => r.reports === null)
    ? 'unscoreable'
    : results.every((r) => r.ok)
      ? 'verified'
      : 'regressed';
  verdicts.push({ case: entry, results, status });
}

const verified = verdicts
  .filter((v) => v.status === 'verified')
  .map((v) => v.case.id)
  .sort();
const regressed = verdicts.filter((v) => v.status === 'regressed');
const unscoreable = verdicts.filter((v) => v.status === 'unscoreable');
const uncovered = verdicts.filter((v) => v.status === 'uncovered');
const retired = verdicts.filter((v) => v.status === 'retired');

console.log(`\n  ${registry.cases.length} cases registered`);
console.log(`  verified     ${verified.length}`);
console.log(`  regressed    ${regressed.length}`);
console.log(`  unscoreable  ${unscoreable.length}`);
console.log(`  uncovered    ${uncovered.length}`);
console.log(`  retired      ${retired.length}`);

for (const v of regressed) {
  const bad = v.results.filter((r) => !r.ok);
  console.error(
    `\n  ⛔ ${v.case.id} REGRESSED — ${v.case.title}\n     ${bad
      .map(
        (r) => `${r.rule}: expected to ${r.expect}, got ${r.reports} report(s)`,
      )
      .join('\n     ')}`,
  );
}
for (const v of unscoreable) {
  console.error(
    `  ⚠ ${v.case.id} unscoreable — the harness could not run ${v.case.coverage.map((c) => c.rule).join(', ')}`,
  );
}

/**
 * The ratchet is on the SET, not the count. A run that verifies a new case
 * while silently dropping an old one keeps the same total, and that is exactly
 * the regression this register exists to make impossible.
 */
const previous: string[] = fs.existsSync(BASELINE)
  ? (JSON.parse(fs.readFileSync(BASELINE, 'utf8')) as { verified: string[] })
      .verified
  : [];
const lost = previous.filter((id) => !verified.includes(id));

if (lost.length > 0) {
  console.error(
    `\n  ⛔ ${lost.length} case(s) were verified before and are not now: ${lost.join(', ')}`,
  );
}

if (CHECK) {
  if (regressed.length > 0 || lost.length > 0 || unscoreable.length > 0)
    process.exit(1);
  console.log('\n  registry clean — every claim was executed and held\n');
} else {
  if (UPDATE || previous.length === 0) {
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
    fs.writeFileSync(
      BASELINE,
      `${JSON.stringify(
        {
          note: 'Case ids verified at least once. Grow-only: losing one is a regression.',
          verified,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`  baseline: ${previous.length} → ${verified.length}`);
  }
}

if (!CHECK) {
  const sev = (c: Case): string =>
    c.severity.cvss === null
      ? '—'
      : `${c.severity.cvss}${c.severity.source === null ? ' *' : ''}`;
  const md: string[] = [
    '# Case registry',
    '',
    'What this project is accountable for, and the executed evidence that it is',
    'covered. Generated by `scripts/case-registry.mts` — edit',
    '`benchmarks/cases/registry.json`, not this file.',
    '',
    "`RULE_CASES.md` is rule-first: it reports what each rule's tests happen to",
    'say, and a rule cannot be missing a case it never claimed. This register is',
    'case-first, so a gap is visible as an entry with no coverage rather than as',
    'an absence nobody can see.',
    '',
    `**${registry.cases.length} cases · ${verified.length} verified · ${uncovered.length} uncovered · ${regressed.length} regressed**`,
    '',
    'Every `status` below was computed on this run by executing the case code',
    'through the rule that claims it. A stored "covered: yes" would be a',
    'spreadsheet, and it would start decaying the moment a rule changed.',
    '',
    '`*` on a severity means the score has no cited source yet and is our own',
    'reading, not a published one.',
    '',
    '| id | case | CWE | CVSS | covered by | status |',
    '|---|---|---|---|---|---|',
    ...verdicts.map(
      (v) =>
        `| \`${v.case.id}\` | ${v.case.title} | ${v.case.cwe ?? '—'} | ${sev(v.case)} | ${
          v.case.coverage.length === 0
            ? '**nothing**'
            : v.case.coverage
                .map((c) => `\`${c.rule}\` (${c.expect})`)
                .join('<br>')
        } | ${v.status === 'verified' ? '✅ verified' : v.status} |`,
    ),
    '',
    '## Each case in full',
    '',
    ...verdicts.flatMap((v) => {
      const c = v.case;
      return [
        `### ${c.id} — ${c.title}`,
        '',
        c.rationale,
        '',
        '```js',
        c.code,
        '```',
        '',
        `- **CWE** ${c.cwe ?? 'not classified'}`,
        `- **CVSS** ${c.severity.cvss === null ? 'not scored' : `${c.severity.cvss}${c.severity.vector === null ? '' : ` (${c.severity.vector})`} — ${c.severity.source ?? 'our reading, no cited source'}`}`,
        `- **Occurrences** ${
          c.occurrences.length === 0
            ? 'none recorded — this case is constructed, not observed'
            : c.occurrences
                .map(
                  (o) =>
                    `\`${o.repo}${o.path === undefined ? '' : ` ${o.path}`}${o.line === undefined ? '' : `:${o.line}`}\``,
                )
                .join(', ')
        }`,
        `- **References** ${
          c.references.length === 0
            ? 'none'
            : c.references
                .map(
                  (r) =>
                    `${r.id}${r.verified ? '' : ' (**unverified** — carried from memory, not checked against the upstream record)'}`,
                )
                .join(', ')
        }`,
        '',
        ...(v.results.length === 0
          ? ['**No rule claims this case.**', '']
          : [
              '| rule | must | did | |',
              '|---|---|---|---|',
              ...v.results.map(
                (r) =>
                  `| \`${r.rule}\` | ${r.expect} | ${r.reports === null ? 'unscoreable' : `${r.reports} report(s)`} | ${r.ok ? '✅' : '⛔'} |`,
              ),
              '',
              ...c.coverage
                .filter((x) => x.evidence !== undefined)
                .map((x) => `Pinned in \`${x.evidence}\`.`),
              '',
            ]),
      ];
    }),
  ];
  fs.writeFileSync(OUT_MD, `${md.join('\n')}\n`);
  console.log(`  wrote benchmarks/CASE_REGISTRY.md\n`);
}

if (regressed.length > 0 || lost.length > 0) process.exit(1);

/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Run one of our rules head to head with its nearest neighbours.
 *
 * The battery is DATA — `benchmarks/cases/batteries/<plugin>__<rule>.json` —
 * so the method is a process rather than a script somebody wrote once. This
 * file holds only the parts that are the same for every rule: the controls,
 * the two scorings, and the refusal to report a number it could not produce.
 *
 * ## Scoring twice, on purpose
 *
 * A neighbour usually publishes a different contract from ours. The most
 * installed rule in this space documents itself as a REVIEW AID — "flag every
 * dynamic access" — and judged that way its false positives are the product
 * working, not a defect. A rule cannot be criticised for failing a contract it
 * never made. It can be criticised for failing its own, which is why a battery
 * may carry `peers[].contractForms`: code the peer's own documentation says it
 * reports on.
 *
 * ## Controls
 *
 * Ours and every peer must answer a positive control before any number below
 * means anything. A comparison against a rule that is not running measures our
 * harness, and it will read as a win — that is not hypothetical, it is how
 * `eslint-plugin-import/no-named-as-default` scored until a control was added.
 *
 *   npx tsx scripts/rule-head-to-head.mts <battery-file|rule> [--md] [--registry]
 *   npx tsx scripts/rule-head-to-head.mts --all --md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import * as tsparser from '@typescript-eslint/parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BATTERIES = path.join(ROOT, 'benchmarks', 'cases', 'batteries');
const REGISTRY = path.join(ROOT, 'benchmarks', 'cases', 'registry.json');

const argv = process.argv.slice(2);
const EMIT = argv.includes('--md');
const TO_REGISTRY = argv.includes('--registry');
const ALL = argv.includes('--all');
const target = argv.find((a) => !a.startsWith('--'));

type Kind = 'defect' | 'decoy' | 'remedy';
type BatteryCase = {
  id: string;
  kind: Kind;
  label: string;
  code: string;
  why: string;
};
type ContractForm = { label: string; code: string };
type PeerSpec = {
  plugin: string;
  rule: string;
  control: string;
  contract?: string;
  contractUrl?: string;
  contractForms?: ContractForm[];
};
type Battery = {
  rule: string;
  title: string;
  control: string;
  peers: PeerSpec[];
  knownLimits?: string[];
  discarded?: string[];
  cases: BatteryCase[];
};

const linter = new Linter();
const ourPlugins = new Map<string, Record<string, unknown>>();
const peerPlugins = new Map<string, Record<string, unknown> | null>();

async function ourRule(qualified: string): Promise<unknown | null> {
  const [pkg, ...rest] = qualified.split('/');
  const name = rest.join('/');
  if (!ourPlugins.has(pkg)) {
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
    ourPlugins.set(
      pkg,
      (mod.default?.rules ?? mod.rules ?? {}) as Record<string, unknown>,
    );
  }
  return ourPlugins.get(pkg)?.[name] ?? null;
}

async function peerRule(plugin: string, rule: string): Promise<unknown | null> {
  if (!peerPlugins.has(plugin)) {
    try {
      const mod = (await import(plugin)) as {
        default?: { rules?: Record<string, unknown> };
        rules?: Record<string, unknown>;
      };
      peerPlugins.set(
        plugin,
        (mod.rules ?? mod.default?.rules ?? null) as Record<
          string,
          unknown
        > | null,
      );
    } catch {
      peerPlugins.set(plugin, null);
    }
  }
  return peerPlugins.get(plugin)?.[rule] ?? null;
}

/** Reports, or `null` when the harness could not perform the run. */
function reports(rule: unknown, code: string): number | null {
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx,js,jsx}'],
        plugins: { p: { rules: { r: rule } } as never },
        languageOptions: {
          parser: tsparser as never,
          parserOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            ecmaFeatures: { jsx: true },
          },
        },
        rules: { 'p/r': 'error' },
      },
    ],
    'case.tsx',
  );
  if (messages.some((m) => m.ruleId === null)) return null;
  return messages.length;
}

/**
 * Source in a table cell. Newlines end a markdown row, so a multi-line case
 * silently truncates the table — the `import` + call shape is the common one.
 */
const cell = (code: string): string =>
  `\`${code.replace(/\n/g, ' ').replace(/\|/g, '\\|')}\``;

/** Right on a case: a defect fires; a decoy and a remedy do not. */
const correct = (kind: Kind, n: number | null): boolean =>
  n === null ? false : kind === 'defect' ? n > 0 : n === 0;

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

type Score = {
  tp: number;
  fn: number;
  fp: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
};

function score(
  cases: BatteryCase[],
  pick: (c: BatteryCase) => number | null,
): Score {
  let tp = 0,
    fn = 0,
    fp = 0,
    tn = 0;
  for (const c of cases) {
    const fired = (pick(c) ?? 0) > 0;
    if (c.kind === 'defect') {
      if (fired) tp += 1;
      else fn += 1;
    } else if (fired) {
      fp += 1;
    } else {
      tn += 1;
    }
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);
  return { tp, fn, fp, tn, precision, recall, f1 };
}

const files = ALL
  ? fs
      .readdirSync(BATTERIES)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(BATTERIES, f))
  : [
      target !== undefined && fs.existsSync(target)
        ? target
        : path.join(BATTERIES, `${(target ?? '').replace('/', '__')}.json`),
    ];

let failed = false;
for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`  no battery at ${file}`);
    failed = true;
    continue;
  }
  const battery = JSON.parse(fs.readFileSync(file, 'utf8')) as Battery;
  const ours = await ourRule(battery.rule);
  if (ours === null) {
    console.error(`  ⛔ ${battery.rule} not found`);
    failed = true;
    continue;
  }

  // ── controls ──────────────────────────────────────────────────────────
  const ourControl = reports(ours, battery.control);
  if ((ourControl ?? 0) === 0) {
    console.error(
      `\n  ⛔ ${battery.rule} failed its own positive control — every number would be meaningless`,
    );
    failed = true;
    continue;
  }

  const peers: {
    spec: PeerSpec;
    rule: unknown;
    installed: boolean;
    functioning: boolean;
    results: Map<string, number | null>;
  }[] = [];
  for (const spec of battery.peers) {
    const rule = await peerRule(spec.plugin, spec.rule);
    const installed = rule !== null;
    const functioning = installed && (reports(rule, spec.control) ?? 0) > 0;
    const results = new Map<string, number | null>();
    if (functioning)
      for (const c of battery.cases) results.set(c.id, reports(rule, c.code));
    peers.push({ spec, rule, installed, functioning, results });
  }

  const ourResults = new Map(
    battery.cases.map((c) => [c.id, reports(ours, c.code)]),
  );
  const oursScore = score(battery.cases, (c) => ourResults.get(c.id) ?? null);

  console.log(`\n  ${battery.rule} — ${battery.title}`);
  console.log(`  control: ours reports ${ourControl}`);
  for (const p of peers) {
    console.log(
      `  control: ${p.spec.plugin}/${p.spec.rule} — ${!p.installed ? 'NOT INSTALLED' : p.functioning ? 'running' : 'FAILED ITS CONTROL, excluded'}`,
    );
  }
  console.log(
    `\n  ours    TP ${oursScore.tp} FN ${oursScore.fn} FP ${oursScore.fp} TN ${oursScore.tn}   precision ${pct(oursScore.precision)} recall ${pct(oursScore.recall)} F1 ${pct(oursScore.f1)}`,
  );
  for (const p of peers.filter((x) => x.functioning)) {
    const s = score(battery.cases, (c) => p.results.get(c.id) ?? null);
    console.log(
      `  ${p.spec.plugin.replace('eslint-plugin-', '')}/${p.spec.rule}  TP ${s.tp} FN ${s.fn} FP ${s.fp} TN ${s.tn}   precision ${pct(s.precision)} recall ${pct(s.recall)} F1 ${pct(s.f1)}`,
    );
  }

  const wrong = battery.cases.filter(
    (c) => !correct(c.kind, ourResults.get(c.id) ?? null),
  );
  if (wrong.length > 0) {
    console.error(
      `\n  ⛔ we get ${wrong.length} case(s) wrong: ${wrong.map((c) => c.id).join(', ')}`,
    );
    failed = true;
  }

  if (TO_REGISTRY) {
    const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) as {
      note: string;
      cases: Record<string, unknown>[];
    };
    const have = new Set(registry.cases.map((c) => String(c['code']).trim()));
    let next = registry.cases.reduce((max, c) => {
      const m = /^ILB-(\d+)$/.exec(String(c['id']));
      return m === null ? max : Math.max(max, Number(m[1]));
    }, 0);
    let added = 0;
    for (const c of battery.cases) {
      if (have.has(c.code.trim())) continue;
      next += 1;
      registry.cases.push({
        id: `ILB-${String(next).padStart(4, '0')}`,
        added: new Date().toISOString().slice(0, 10),
        title: c.label,
        rationale: c.why,
        cwe: null,
        severity: { cvss: null, vector: null, source: null },
        references: [],
        occurrences: [],
        code: c.code,
        kind: c.kind,
        coverage: [
          {
            rule: battery.rule,
            expect: c.kind === 'defect' ? 'report' : 'silent',
            evidence: path.relative(ROOT, file),
          },
        ],
        peers: battery.peers.map((p) => ({
          plugin: p.plugin,
          rule: p.rule,
          control: p.control,
        })),
        batteryId: c.id,
      });
      added += 1;
    }
    fs.writeFileSync(REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);
    console.log(`  ${added} case(s) added to the registry`);
  }

  if (EMIT) {
    const slug = battery.rule.replace('/', '__');
    const md: string[] = [
      `# ${battery.rule} — head to head`,
      '',
      `Generated by \`scripts/rule-head-to-head.mts\` from`,
      `\`${path.relative(ROOT, file)}\`. Every number was produced by running each`,
      'rule over the same string in the same process on the run that wrote this.',
      '',
      '## Controls',
      '',
      `Ours reports **${ourControl}** on its control. ` +
        peers
          .map(
            (p) =>
              `\`${p.spec.plugin}/${p.spec.rule}\` — ${!p.installed ? '**not installed**' : p.functioning ? `reports on its own documented example` : '**failed its control and is excluded**'}`,
          )
          .join('; ') +
        '.',
      '',
      'A comparison against a rule that is not running measures our harness, and',
      'it reads as a win. An excluded peer is named here rather than dropped.',
      '',
      '## Scored as a detector',
      '',
      'A `defect` must report; a `decoy` and a `remedy` must not.',
      '',
      '| | TP | FN | FP | TN | precision | recall | F1 |',
      '|---|---:|---:|---:|---:|---:|---:|---:|',
      `| **ours** | ${oursScore.tp} | ${oursScore.fn} | ${oursScore.fp} | ${oursScore.tn} | ${pct(oursScore.precision)} | ${pct(oursScore.recall)} | ${pct(oursScore.f1)} |`,
      ...peers
        .filter((p) => p.functioning)
        .map((p) => {
          const s = score(battery.cases, (c) => p.results.get(c.id) ?? null);
          return `| ${p.spec.plugin}/${p.spec.rule} | ${s.tp} | ${s.fn} | ${s.fp} | ${s.tn} | ${pct(s.precision)} | ${pct(s.recall)} | ${pct(s.f1)} |`;
        }),
      '',
      '## Every case',
      '',
      '`!` marks a wrong answer for that kind.',
      '',
      `| id | kind | ours |${peers
        .filter((p) => p.functioning)
        .map((p) => ` ${p.spec.rule} |`)
        .join('')} case |`,
      `|---|---|---|${peers
        .filter((p) => p.functioning)
        .map(() => '---|')
        .join('')}---|`,
      ...battery.cases.map((c) => {
        const verdict = (n: number | null): string =>
          `${n === null ? 'unscoreable' : n}${correct(c.kind, n) ? '' : ' **!**'}`;
        const peerCells = peers
          .filter((p) => p.functioning)
          .map((p) => ` ${verdict(p.results.get(c.id) ?? null)} |`)
          .join('');
        return `| \`${c.id}\` | ${c.kind} | ${verdict(ourResults.get(c.id) ?? null)} |${peerCells} ${cell(c.code)} |`;
      }),
      '',
      ...peers
        .filter((p) => p.functioning && p.spec.contractForms !== undefined)
        .flatMap((p) => {
          const forms = p.spec.contractForms ?? [];
          const missed = forms.filter(
            (f) => (reports(p.rule, f.code) ?? 0) === 0,
          );
          return [
            `## \`${p.spec.plugin}/${p.spec.rule}\` against its own contract`,
            '',
            `Their documentation: *"${p.spec.contract ?? ''}"*`,
            ...(p.spec.contractUrl === undefined
              ? []
              : ['', `<${p.spec.contractUrl}>`]),
            '',
            'Every form below is that shape.',
            '',
            '| form | theirs | ours |',
            '|---|---|---|',
            ...forms.map((f) => {
              const t = reports(p.rule, f.code) ?? 0;
              return `| ${f.label} — ${cell(f.code)} | ${t === 0 ? '**missed**' : t} | ${reports(ours, f.code)} |`;
            }),
            '',
            `**${missed.length} of ${forms.length}** documented forms are not reported by their rule.`,
            '',
          ];
        }),
      '## Read this before quoting the numbers',
      '',
      '**We wrote this battery.** A score on a set chosen by the rule’s own authors',
      'measures the authors. It is a floor on how we handle cases we thought of, not',
      'a measurement of the rule in the world.',
      '',
      ...(battery.knownLimits === undefined
        ? []
        : [
            '### What we still get wrong',
            '',
            ...battery.knownLimits.map((l) => `- ${l}`),
            '',
          ]),
      ...(battery.discarded === undefined
        ? []
        : [
            '### Discarded rather than counted',
            '',
            ...battery.discarded.map((l) => `- ${l}`),
            '',
          ]),
    ];
    const out = path.join(ROOT, 'benchmarks', 'head-to-head', `${slug}.md`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${md.join('\n')}\n`);
    console.log(`  wrote ${path.relative(ROOT, out)}`);
  }
}

if (failed) process.exit(1);

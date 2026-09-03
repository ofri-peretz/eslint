/**
 * score-fp-fn — FP/FN scorer for ilb-perf-import-nestjs cycle dumps.
 *
 * Treats `oxlint-builtin` (Rust-native no-cycle in the import plugin) as the
 * Tier-A reference set. Each other plugin's findings are diffed against it.
 *
 * Granularity: file-level. A "finding" is "this plugin reports at least one
 * cycle attached to file X". This is coarse (loses cycle-identity within a
 * file) but is the highest fidelity we can extract without changing the
 * plugins' diagnostic messages — only oxlint emits the cycle path in
 * machine-readable form. To upgrade to cycle-level scoring, see TODO in the
 * footer.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.resolve(SCRIPT_DIR, '..', 'results', 'ilb-perf-import-nestjs');
const CORPUS_ROOT = '/Users/ofri/repos/ofriperetz.dev/oos/nestjs';

type CycleFinding = { file: string; line?: number; message?: string; note?: string };
type Sidecar = {
  competitor: string;
  host: string;
  package: string;
  version: string;
  cycleFindings: CycleFinding[];
};

function normalizePath(p: string): string {
  // Normalize to "relative-to-corpus-root, posix" so paths from ESLint
  // (absolute) and oxlint (already relative) compare equal.
  if (p.startsWith(CORPUS_ROOT)) return p.slice(CORPUS_ROOT.length).replace(/^\/+/, '');
  return p;
}

function loadSidecar(p: string): Sidecar | null {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function fileSet(s: Sidecar): Set<string> {
  return new Set(s.cycleFindings.map((f) => normalizePath(f.file)));
}

function findingCountPerFile(s: Sidecar): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of s.cycleFindings) {
    const key = normalizePath(f.file);
    m.set(key, (m.get(key) || 0) + 1);
  }
  return m;
}

function score(reference: Set<string>, candidate: Set<string>) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  for (const f of candidate) (reference.has(f) ? tp++ : fp++);
  for (const f of reference) if (!candidate.has(f)) fn++;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { tp, fp, fn, precision, recall, f1 };
}

function main() {
  const referencePath = path.join(RESULTS_DIR, 'cycles-oxlint-builtin.json');
  const reference = loadSidecar(referencePath);
  if (!reference) {
    console.error(`❌ Reference not found: ${referencePath}`);
    console.error('Run the benchmark first: npm run ilb:perf-import-nestjs');
    process.exit(1);
  }

  const refFiles = fileSet(reference);
  const refTotalDiagnostics = reference.cycleFindings.length;

  const candidates: Array<{ id: string; sidecar: Sidecar }> = [];
  for (const file of fs.readdirSync(RESULTS_DIR)) {
    if (!file.startsWith('cycles-') || !file.endsWith('.json')) continue;
    if (file === 'cycles-oxlint-builtin.json') continue;
    const s = loadSidecar(path.join(RESULTS_DIR, file));
    if (!s) continue;
    candidates.push({ id: s.competitor, sidecar: s });
  }

  console.log('\n📊 FP/FN scorecard (file-level, vs oxlint-builtin reference)\n');
  console.log(`Reference: oxlint-builtin (${refFiles.size} unique files, ${refTotalDiagnostics} raw diagnostics)\n`);

  const rows: any[] = [];
  for (const { id, sidecar } of candidates) {
    const candFiles = fileSet(sidecar);
    const candCounts = findingCountPerFile(sidecar);
    const totalDiagnostics = sidecar.cycleFindings.length;
    const { tp, fp, fn, precision, recall, f1 } = score(refFiles, candFiles);
    rows.push({
      id,
      host: sidecar.host,
      total: totalDiagnostics,
      uniqueFiles: candFiles.size,
      tp,
      fp,
      fn,
      precision: +(precision * 100).toFixed(1),
      recall: +(recall * 100).toFixed(1),
      f1: +(f1 * 100).toFixed(1),
      maxFindingsPerFile: Math.max(0, ...candCounts.values()),
    });
  }

  // Pretty stdout table
  const header = `${'Plugin'.padEnd(30)} ${'Host'.padEnd(7)} ${'Total'.padStart(7)} ${'Files'.padStart(6)} ${'TP'.padStart(5)} ${'FP'.padStart(5)} ${'FN'.padStart(5)} ${'Prec%'.padStart(7)} ${'Rec%'.padStart(7)} ${'F1%'.padStart(6)}`;
  console.log(header);
  console.log('─'.repeat(header.length));
  for (const r of rows) {
    console.log(
      r.id.padEnd(30) +
      ' ' + r.host.padEnd(7) +
      ' ' + String(r.total).padStart(7) +
      ' ' + String(r.uniqueFiles).padStart(6) +
      ' ' + String(r.tp).padStart(5) +
      ' ' + String(r.fp).padStart(5) +
      ' ' + String(r.fn).padStart(5) +
      ' ' + String(r.precision).padStart(7) +
      ' ' + String(r.recall).padStart(7) +
      ' ' + String(r.f1).padStart(6),
    );
  }

  // Write markdown scorecard
  const mdPath = path.join(RESULTS_DIR, 'fp-fn-scorecard.md');
  const md = `# FP/FN Scorecard — \`ilb-perf-import-nestjs\`

Reference: **oxlint-builtin** (oxlint v1.62.0's Rust-native \`import/no-cycle\`).

Granularity: **file-level**. A "finding" is "the plugin reports at least one
cycle attached to file X". This is coarse — it can't distinguish two
different cycles in the same file — but it's the highest fidelity available
without changing user-facing diagnostic messages. (Only oxlint emits cycle
member paths in machine-readable form.)

| Metric | Value |
|---|---|
| Reference unique files | ${refFiles.size} |
| Reference raw diagnostics | ${refTotalDiagnostics} |
| Generated | ${new Date().toISOString()} |

## Scorecard

| Plugin | Host | Total diags | Unique files | TP | FP | FN | Precision | Recall | F1 |
|---|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| \`${r.id}\` | ${r.host} | ${r.total} | ${r.uniqueFiles} | ${r.tp} | ${r.fp} | ${r.fn} | ${r.precision}% | ${r.recall}% | ${r.f1}% |`).join('\n')}

## Reading the numbers

- **Precision** = TP / (TP + FP) — when this plugin says "file X has a cycle", how often is it right?
- **Recall** = TP / (TP + FN) — of the files oxlint flags, how many does this plugin also catch?
- **Total diags vs Unique files**: large gap means many diagnostics on the same file (over-reporting via multiple import paths).
- **0 cycles** means the plugin's resolver or config isn't wired correctly — not an algorithm result.

## Known limitations

- **File-level only.** Two plugins reporting at the same file get scored as
  agreeing even if they found different cycles in that file. Fixing this
  requires our plugin to expose cycle members in the diagnostic (e.g.
  adding \`{{cycle}}\` to message templates in \`no-cycle.ts\`).
- **No Tier-B verification.** We treat oxlint's 417 cycles as ground truth.
  oxlint's defaults are \`ignoreTypes: true\`, so it suppresses type-only
  cycles; our plugin reports them. Some of our FPs may be legitimate cycles
  oxlint chose not to report. Sample-verifying 50 of them would tell us.
- **eslint-plugin-import-x under ESLint** reports 0 cycles — config bug, not
  algorithm result. Same for import / import-x under oxlint.

## Next steps to upgrade scoring

1. Modify [no-cycle.ts](../../packages/eslint-plugin-import-next/src/rules/no-cycle.ts)
   message templates to include \`{{cycle}}\` so cycle members are in the
   diagnostic text — then the scorer can do cycle-level (not just file-level)
   matching.
2. Random-sample 50 of oxlint's 417 cycles, hand-verify, compute its precision
   on the sample. Use this to calibrate the reference.
3. Fix the \`settings\` propagation under oxlint for the JS-hosted import /
   import-x plugins — currently they detect 0 cycles, blocking those rows.
`;
  fs.writeFileSync(mdPath, md);
  console.log(`\n📄 Scorecard: ${path.relative(process.cwd(), mdPath)}`);
}

main();

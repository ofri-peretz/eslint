/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * case-ledger.mts — is this finding one we already ruled on, or is it new?
 *
 * ## Why a ledger and not a percentage
 *
 * "28.6% precision" tells you a rule is wrong. It does not tell you WHICH
 * decisions were wrong, and on the next run it cannot tell you whether the
 * number moved because the rule improved or because the corpus drifted. Worse,
 * it cannot answer the only question that matters when a finding lands in front
 * of a human: *have we been here before?*
 *
 * So every finding is filed under a CASE — a shape the rule takes a position
 * on, identified by `scripts/case-signature.ts` rather than by file and line.
 * A case carries a verdict:
 *
 *   enforce     this shape MUST report. A finding here is a confirmed TP.
 *   exempt      this shape must stay QUIET. A finding here is a REGRESSION —
 *               we already decided, and the rule changed its mind.
 *   undecided   reviewed, evidence gathered, and the evidence did not settle it.
 *   unreviewed  seen, filed, not yet adjudicated. The backlog, visible.
 *
 * `undecided` exists because the three-verdict version forced a lie. Timing 106
 * regex patterns from real repositories produced 28 measurably superlinear and
 * 78 for which no superlinear input was FOUND — and "not found" is not "not
 * there". redos-classify says so in its own header: UNREPRODUCED is not a clean
 * bill of health. Filing those 78 as `exempt` would convert the absence of a
 * witness into a claim of safety, which is the failure this whole apparatus
 * exists to prevent. Every `undecided` case cites the limit that blocked it.
 *
 * A run then splits into four buckets, and only two of them need a human:
 *
 *   confirmed    known `enforce`  — the rule is doing its job
 *   regression   known `exempt` that reported again  ← blocks
 *   backlog      known `unreviewed`, still waiting
 *   NEW          no case has this signature          ← the actual news
 *
 * That last bucket is the point. After a rule is measured once, the cost of
 * measuring it again is reading the NEW bucket, which is normally empty.
 *
 * ## What this cannot do
 *
 * **It cannot find false negatives.** Nothing in a list of findings tells you
 * what was missed. FN evidence comes from the corpus `vulnerable/` fixtures,
 * from the adversarial wave, and from diffing a competitor's findings over the
 * same files — not from here. Saying otherwise would be the exact
 * "self-authored corpus closes the loop" mistake this whole apparatus exists to
 * prevent.
 *
 *   npx tsx scripts/case-ledger.mts <plugin>/<rule>            # classify
 *   npx tsx scripts/case-ledger.mts <plugin>/<rule> --update   # file NEW as unreviewed
 */
import { ESLint } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signatureOf } from './case-signature.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'benchmarks/.real-source-cache');
const CORPUS = path.join(ROOT, 'benchmarks/rule-corpus');

const ruleId = process.argv[2];
const update = process.argv.includes('--update');
if (!ruleId?.includes('/')) {
  console.error('usage: case-ledger.mts <plugin>/<rule> [--update]');
  process.exit(1);
}
const [prefix, ruleName] = ruleId.split('/');
const ledgerFile = path.join(CORPUS, `${prefix}__${ruleName}`, 'CASES.json');

type Example = { repo: string; file: string; line: number; source: string };
type Case = {
  id: string;
  signature: string;
  verdict: 'enforce' | 'exempt' | 'undecided' | 'unreviewed';
  messageId: string;
  shape: string;
  context: string;
  why?: string;
  firstSeen: string;
  examples: Example[];
};
type Ledger = { rule: string; cases: Case[] };

const ledger: Ledger = fs.existsSync(ledgerFile)
  ? (JSON.parse(fs.readFileSync(ledgerFile, 'utf8')) as Ledger)
  : { rule: ruleId, cases: [] };
const bySignature = new Map(ledger.cases.map((c) => [c.signature, c]));

/**
 * The SAME exclusions as `benchmarks/suites/ilb-real-source/run.mjs`, copied
 * deliberately rather than approximated.
 *
 * They diverged on the first run and the divergence was invisible: the runner
 * skips `docs/`, `examples/` and every dot-directory, this walker did not, and
 * so the ledger filed cases from `mongoose/docs/js/`, `knex/docs/.vitepress/`
 * and a vendored `.yarn/releases/yarn-4.13.0.cjs` that the published precision
 * number had never counted. Two instruments answering the same question about
 * the same rule must see the same files, or one of them is quietly measuring
 * something else.
 */
const SKIP_DIR =
  /(^|\/)(node_modules|dist|build|\.next|\.nuxt|coverage|vendor|public|fixtures?|__fixtures__|test|tests|__tests__|spec|specs|e2e|benchmarks?|examples?|docs?)(\/|$)/;
const SKIP_FILE = /(\.(min|bundle|chunk)\.[cm]?jsx?|\.(test|spec)\.[cm]?[jt]sx?)$/;

const files: string[] = [];
const walk = (dir: string): void => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.test(`/${path.relative(CACHE, full)}/`) && !entry.name.startsWith('.')) walk(full);
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      files.push(full);
    }
  }
};
if (!fs.existsSync(CACHE)) {
  console.error(`no real-source cache at ${path.relative(ROOT, CACHE)} — run the real-source suite first`);
  process.exit(1);
}
walk(CACHE);

const plugin = (await import(path.join(ROOT, 'packages', `eslint-plugin-${prefix}`, 'dist/src/index.js')))
  .default ?? (await import(path.join(ROOT, 'packages', `eslint-plugin-${prefix}`, 'dist/src/index.js')));

const instrumented: { rules: Record<string, unknown> } = { rules: {} };

const eslint = new ESLint({
  overrideConfigFile: true,
  allowInlineConfig: false,
  overrideConfig: [
    {
      files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs', '**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
      // Without this the default parser silently fails on every TypeScript
      // file — 2 of this rule's 3 known findings are in `.ts`, and the first
      // run of this script reported 1. A tool that measures coverage must not
      // quietly stop covering half the corpus.
      languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module' },
      plugins: { [prefix]: instrumented },
      rules: { [ruleId]: 'error' },
    },
  ],
});

/**
 * The signature needs the NODE, and ESLint hands back only a location. Rather
 * than re-parse and hunt for it, the rule is run through a wrapper that records
 * the node it reported on — the same object the rule saw, so the signature is
 * computed from the truth rather than from a reconstruction.
 */
const seen: { node: unknown; messageId: string; file: string; line: number; source: string }[] = [];
// The built plugin defers every rule behind a getter, so its `rules` object
// cannot be assigned into. A fresh plugin carrying only the wrapped rule is
// both simpler and narrower — nothing else can fire and pollute the ledger.
const inner = plugin.rules[ruleName];
const wrapped = {
  ...inner,
  create(context: Record<string, unknown>) {
    // `Object.create`, not a Proxy: `report` is a read-only, non-configurable
    // own property on the real context, and a Proxy get-trap that returns
    // anything else throws an invariant error. A prototype child shadows it
    // cleanly and forwards everything else untouched.
    const patched = Object.create(context) as Record<string, unknown> & {
      report: (d: Record<string, unknown>) => void;
    };
    const original = (context as { report: (d: Record<string, unknown>) => void }).report;
    Object.defineProperty(patched, 'report', {
      configurable: true,
      writable: true,
      value: (descriptor: Record<string, unknown>) => {
        const node = (descriptor.node ?? descriptor.loc) as { loc?: { start: { line: number } } };
        seen.push({
          node,
          messageId: String(descriptor.messageId),
          file: String((context as { filename: string }).filename),
          line: node?.loc?.start.line ?? 0,
          source: '',
        });
        original.call(context, descriptor);
      },
    });
    return inner.create(patched);
  },
};
instrumented.rules[ruleName] = wrapped;

console.log(`  ${files.length} cached files · rule ${ruleId}\n`);
await eslint.lintFiles(files);

const buckets = { confirmed: 0, undecided: 0, regression: [] as string[], backlog: 0, fresh: [] as Case[] };
const freshBySignature = new Map<string, Case>();

for (const hit of seen) {
  const { key, skeleton, context: where } = signatureOf(hit.node as never, hit.messageId);
  const rel = path.relative(CACHE, hit.file);
  const repo = rel.split('/')[0] ?? '';
  const example: Example = {
    repo: repo.replace('__', '/'),
    file: rel.slice(repo.length + 1),
    line: hit.line,
    source: (fs.readFileSync(hit.file, 'utf8').split('\n')[hit.line - 1] ?? '').trim().slice(0, 120),
  };

  const known = bySignature.get(key);
  if (known) {
    if (known.verdict === 'enforce') buckets.confirmed += 1;
    else if (known.verdict === 'undecided') buckets.undecided += 1;
    else if (known.verdict === 'exempt') {
      buckets.regression.push(`${known.id} — ${example.repo} ${example.file}:${example.line}`);
    } else buckets.backlog += 1;
    if (known.examples.length < 3) known.examples.push(example);
    continue;
  }

  const already = freshBySignature.get(key);
  if (already) {
    if (already.examples.length < 3) already.examples.push(example);
    continue;
  }
  const created: Case = {
    id: `${hit.messageId}-${key}`,
    signature: key,
    verdict: 'unreviewed',
    messageId: hit.messageId,
    shape: skeleton,
    context: where,
    firstSeen: 'this run',
    examples: [example],
  };
  freshBySignature.set(key, created);
  buckets.fresh.push(created);
}

console.log(`  findings          ${seen.length}`);
console.log(`  distinct cases    ${bySignature.size + freshBySignature.size}\n`);
console.log(`  confirmed (enforce)   ${buckets.confirmed}`);
console.log(`  undecided             ${buckets.undecided}`);
console.log(`  backlog (unreviewed)  ${buckets.backlog}`);
console.log(`  REGRESSION            ${buckets.regression.length}`);
console.log(`  NEW                   ${buckets.fresh.length}\n`);

for (const line of buckets.regression.slice(0, 20)) console.log(`  ⛔ regression  ${line}`);
for (const created of buckets.fresh.slice(0, 25)) {
  console.log(`  ★ NEW  ${created.id}`);
  console.log(`         shape   ${created.shape}`);
  if (created.context) console.log(`         context ${created.context}`);
  for (const example of created.examples) {
    console.log(`         · ${example.repo} ${example.file}:${example.line}  ${example.source}`);
  }
}
if (buckets.fresh.length > 25) console.log(`  … and ${buckets.fresh.length - 25} more new case(s)`);

if (update) {
  ledger.cases.push(...buckets.fresh);
  fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
  fs.writeFileSync(ledgerFile, `${JSON.stringify({ rule: ruleId, cases: ledger.cases }, null, 2)}\n`);
  console.log(`\n  filed ${buckets.fresh.length} new case(s) as unreviewed → ${path.relative(ROOT, ledgerFile)}`);
}

// A regression is the ledger catching the rule changing its mind. It blocks.
process.exit(buckets.regression.length > 0 ? 1 : 0);

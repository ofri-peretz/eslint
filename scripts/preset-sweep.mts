/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * preset-sweep.mts — measure what a USER installs, in one pass.
 *
 * Every number this ecosystem has published is per-rule. Nobody installs a
 * rule. They add `recommended` to a config and see whatever it produces, all
 * of it at once, and that aggregate is the only figure the 5% effective
 * false-positive bar can sensibly apply to: twenty rules each defensibly at 5%
 * do not compose into a 5% experience.
 *
 * It is also the fix for the other complaint — that measuring is slow. Per-rule
 * sweeps lint 21,000 files once per rule, so 400 rules is a day of wall-clock.
 * This lints the corpus ONCE with every preset rule enabled, records each
 * finding against a structural signature, and slices per rule afterwards.
 *
 *   npx tsx scripts/preset-sweep.mts                  # every plugin's `recommended`
 *   npx tsx scripts/preset-sweep.mts --plugin=secure-coding
 *   npx tsx scripts/preset-sweep.mts --top=40         # widen the reported table
 */
import { ESLint } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { signatureOf } from './case-signature.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'benchmarks/.real-source-cache');
const only = process.argv.find((a) => a.startsWith('--plugin='))?.split('=')[1];
const top = Number(process.argv.find((a) => a.startsWith('--top='))?.split('=')[1] ?? 25);

/** Identical exclusions to the real-source runner. Two instruments, one file set. */
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
  console.error('no real-source cache — run the real-source suite first');
  process.exit(1);
}
walk(CACHE);

/**
 * Findings, already reduced to their signature.
 *
 * The node is fingerprinted at report time and dropped immediately. Retaining
 * it is what a per-rule sweep can afford and a preset sweep cannot: every
 * captured node keeps its whole AST alive, and with ~400 rules over 21,394
 * files the first honest run died on an out-of-memory before printing anything.
 */
const seen: { rule: string; key: string; repo: string }[] = [];

const plugins: Record<string, unknown> = {};
const rules: Record<string, 'error'> = {};
let pluginCount = 0;

for (const dir of fs.readdirSync(path.join(ROOT, 'packages')).filter((d) => d.startsWith('eslint-plugin-'))) {
  const prefix = dir.replace('eslint-plugin-', '');
  if (only && prefix !== only) continue;
  const entry = path.join(ROOT, 'packages', dir, 'dist/src/index.js');
  if (!fs.existsSync(entry)) continue;
  const mod = (await import(entry)) as Record<string, unknown>;

  // `mod.default ?? mod` is WRONG for these builds and fails silently.
  //
  // The default export carries `{ meta, rules }`; `configs` is a separate NAMED
  // export. So the usual interop shorthand resolves to an object with no
  // configs, `recommended` reads as undefined, and the plugin is skipped — 26
  // of 30 were, and the sweep reported 0 findings across 3.1M lines, which
  // looks exactly like a clean bill of health.
  //
  // Take each half from wherever it actually is.
  const asRecord = (v: unknown) => (v ?? {}) as Record<string, unknown>;
  const dflt = asRecord(mod.default);
  const ruleTable = asRecord(mod.rules ?? dflt.rules) as Record<string, { create: (c: unknown) => unknown }>;
  const configs = asRecord(mod.configs ?? dflt.configs) as Record<string, { rules?: Record<string, unknown> }>;
  const recommended = configs.recommended?.rules;
  if (!recommended || Object.keys(ruleTable).length === 0) continue;
  const plugin = { rules: ruleTable };

  // Wrap each preset rule so the reported NODE is captured — a message carries
  // only a location, and a signature computed from a re-parse is a
  // reconstruction rather than the thing the rule actually saw.
  const wrapped: Record<string, unknown> = {};
  for (const ruleId of Object.keys(recommended)) {
    const [, name] = ruleId.split('/');
    const inner = plugin.rules[name] as { create: (c: unknown) => unknown } | undefined;
    if (!inner) continue;
    wrapped[name] = {
      ...inner,
      create(context: Record<string, unknown>) {
        const patched = Object.create(context) as Record<string, unknown>;
        const original = (context as { report: (d: Record<string, unknown>) => void }).report;
        Object.defineProperty(patched, 'report', {
          configurable: true,
          writable: true,
          value: (descriptor: Record<string, unknown>) => {
            const node = descriptor.node ?? descriptor.loc;
            const filename = String((context as { filename: string }).filename);
            let key = 'unkeyed';
            try {
              key = signatureOf(node as never, String(descriptor.messageId)).key;
            } catch {
              /* a descriptor with no node still counts as a finding */
            }
            seen.push({
              rule: ruleId,
              key,
              repo: path.relative(CACHE, filename).split('/')[0] ?? '',
            });
            original.call(context, descriptor);
          },
        });
        return inner.create(patched);
      },
    };
    rules[ruleId] = 'error';
  }
  plugins[prefix] = { rules: wrapped };
  pluginCount += 1;
}

console.log(`\n  ${files.length} files · ${pluginCount} plugin(s) · ${Object.keys(rules).length} rules in \`recommended\`\n`);

const eslint = new ESLint({
  overrideConfigFile: true,
  allowInlineConfig: false,
  overrideConfig: [
    {
      files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs', '**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
      languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module' },
      plugins: plugins as never,
      rules,
    },
  ],
});

const started = Date.now();
await eslint.lintFiles(files);
const elapsed = ((Date.now() - started) / 1000).toFixed(0);

// Lines of code, counted once over the same file set the rules saw.
let loc = 0;
for (const file of files) {
  try {
    loc += fs.readFileSync(file, 'utf8').split('\n').length;
  } catch {
    /* unreadable */
  }
}

const byRule = new Map<string, { findings: number; cases: Set<string>; repos: Set<string> }>();
for (const hit of seen) {
  const entry = byRule.get(hit.rule) ?? { findings: 0, cases: new Set<string>(), repos: new Set<string>() };
  entry.findings += 1;
  entry.cases.add(hit.key);
  entry.repos.add(hit.repo);
  byRule.set(hit.rule, entry);
}

const ranked = [...byRule.entries()].sort((a, b) => b[1].findings - a[1].findings);
const totalCases = new Set(seen.map((h) => h.key)).size;

console.log(`  swept in ${elapsed}s · ${(loc / 1e6).toFixed(2)}M lines\n`);
console.log(`  TOTAL FINDINGS      ${seen.length}`);
console.log(`  per 1,000 LOC       ${((seen.length / loc) * 1000).toFixed(2)}`);
console.log(`  distinct cases      ${totalCases}`);
console.log(`  rules that fired    ${byRule.size} of ${Object.keys(rules).length}\n`);
console.log(`  ── loudest ${Math.min(top, ranked.length)} rules ──`);
console.log(`  ${'findings'.padStart(9)} ${'cases'.padStart(6)} ${'repos'.padStart(6)}  rule`);
for (const [rule, entry] of ranked.slice(0, top)) {
  console.log(
    `  ${String(entry.findings).padStart(9)} ${String(entry.cases.size).padStart(6)} ${String(entry.repos.size).padStart(6)}  ${rule}`,
  );
}

const share = ranked.slice(0, 5).reduce((sum, [, e]) => sum + e.findings, 0);
console.log(`\n  top 5 rules produce ${((share / seen.length) * 100).toFixed(1)}% of everything a user sees.`);

// Resolution-dependent rules are NOT measurable on this corpus.
//
// The cache holds cloned source, and 1 of 20 repositories has node_modules
// installed. Any rule that asks the resolver a question therefore reports
// nearly every import in nearly every file — `import-next/no-unresolved` alone
// produced 41,584 findings from 2 distinct cases across 16 repositories, which
// is the signature of a configuration artifact rather than a defect. Reporting
// them in the aggregate would inflate the number a user is told to expect by
// roughly a fifth.
const RESOLUTION_DEPENDENT = /^import-next\/(no-unresolved|no-extraneous-dependencies)$/;
const artifact = ranked
  .filter(([rule]) => RESOLUTION_DEPENDENT.test(rule))
  .reduce((sum, [, e]) => sum + e.findings, 0);
if (artifact > 0) {
  const real = seen.length - artifact;
  console.log(
    `\n  ${artifact} finding(s) come from resolution-dependent rules and are ARTIFACTS of an\n` +
      `  uninstalled corpus (1 of 20 repos has node_modules). Excluding them:\n` +
      `    findings          ${real}\n` +
      `    per 1,000 LOC     ${((real / loc) * 1000).toFixed(2)}`,
  );
}

fs.writeFileSync(
  path.join(ROOT, 'benchmarks/PRESET-SWEEP.json'),
  `${JSON.stringify(
    {
      files: files.length,
      loc,
      findings: seen.length,
      perKLoc: Number(((seen.length / loc) * 1000).toFixed(3)),
      cases: totalCases,
      rules: ranked.map(([rule, e]) => ({ rule, findings: e.findings, cases: e.cases.size, repos: e.repos.size })),
    },
    null,
    2,
  )}\n`,
);
console.log(`\n  written → benchmarks/PRESET-SWEEP.json\n`);

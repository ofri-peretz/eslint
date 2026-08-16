/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Run one rule against one snippet and print what a user would actually see.
 *
 * THE POINT
 *
 * Every claim this repo has got wrong about its own rules was inferred from a
 * PATTERN and never executed. "16 rules decide by name" (false — all 16 stayed
 * quiet), "the editor offers a Quick Fix that does nothing" (false — ESLint
 * discards those suggestions), "25 rules recurse unguarded" (21 were
 * `context.report`). A probe is the only thing that settles any of them, and
 * a probe nobody can run in one line is a probe nobody runs.
 *
 * Usage — from the repo root, under Node 24:
 *
 *   npx tsx scripts/probe-rule.mts <plugin>/<rule> '<code>'
 *   npx tsx scripts/probe-rule.mts secure-coding/no-ssrf 'function get(url) {}'
 *   npx tsx scripts/probe-rule.mts browser-security/no-innerhtml --file some.ts
 *   npx tsx scripts/probe-rule.mts a/rule b/rule -- '<code>'    # two rules, one snippet
 *
 * Options:
 *   --file <path>     lint a real file instead of an inline snippet
 *   --options '<json>'  rule options array, e.g. '[{"allowInTests":true}]'
 *   --json            machine-readable output
 *
 * Exit code is 0 whether or not the rule reports — a report is DATA, not a
 * failure. Callers decide what the reports mean.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';

const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

interface Probe {
  rules: string[];
  code: string;
  filename: string;
  options: unknown[];
  json: boolean;
}

function parseArgs(argv: string[]): Probe {
  const rules: string[] = [];
  let code: string | null = null;
  // Relative, and matched by the config's `files` below. An absolute path is
  // resolved against ESLint's base path and stops matching, which surfaces as
  // "No matching configuration found" — a crash, not a clean result.
  let filename = 'probe.ts';
  let options: unknown[] = [];
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') json = true;
    else if (a === '--options') options = JSON.parse(argv[++i]);
    else if (a === '--file') {
      filename = path.resolve(argv[++i]);
      code = fs.readFileSync(filename, 'utf8');
    } else if (a === '--') continue;
    else if (a.includes('/') && code === null && !a.startsWith('-')) rules.push(a);
    else if (!a.startsWith('-')) code = a;
  }
  if (!rules.length) throw new Error('give at least one <plugin>/<rule>');
  if (code === null) throw new Error('give a code snippet, or --file <path>');
  return { rules, code, filename, options, json };
}

/**
 * Load the rule straight from src/.
 *
 * NOT from dist/. A probe against a stale build measures the last release, and
 * this repo's benchmark harness already had to be taught to fail loudly on
 * unbuilt dist for exactly that reason. src/ is what the next release ships.
 */
async function loadRule(spec: string): Promise<unknown> {
  const [plugin, ...rest] = spec.split('/');
  const rule = rest.join('/');
  const file = path.join(REPO_ROOT, 'packages', `eslint-plugin-${plugin}`, 'src', 'rules', rule, 'index.ts');
  if (!fs.existsSync(file)) throw new Error(`no such rule: ${file}`);
  const mod = (await import(url.pathToFileURL(file).href)) as Record<string, unknown>;
  // Rules are exported under a camelCase alias of their own name.
  const exported = Object.values(mod).find(
    (v) => typeof v === 'object' && v !== null && 'create' in (v as object),
  );
  if (!exported) throw new Error(`${spec} exports no rule object`);
  return exported;
}

async function main(): Promise<void> {
  const probe = parseArgs(process.argv.slice(2));
  const linter = new Linter();
  const rules: Record<string, unknown> = {};
  const enabled: Record<string, unknown> = {};

  for (const spec of probe.rules) {
    const key = spec.replace(/\//g, '__');
    rules[key] = await loadRule(spec);
    enabled[`probe/${key}`] = probe.options.length ? ['error', ...probe.options] : 'error';
  }

  const messages = linter.verify(
    probe.code,
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      languageOptions: { parser: tsParser as never, parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { probe: { rules: rules as never } },
      rules: enabled as never,
    },
    probe.filename,
  );

  // A rule that CRASHES surfaces here as a message with no ruleId. Reporting it
  // as "no findings" would turn a crash into a clean bill of health — the exact
  // shape of silent failure this repo has been bitten by before.
  const crashes = messages.filter((m) => !m.ruleId);
  const reports = messages.filter((m) => m.ruleId);

  if (probe.json) {
    console.log(JSON.stringify({ rules: probe.rules, reports, crashes }, null, 2));
    return;
  }

  if (crashes.length) {
    console.log(`💥 CRASHED (${crashes.length}) — this is a defect regardless of the finding:`);
    for (const c of crashes) console.log(`   ${c.message}`);
  }
  if (!reports.length) {
    console.log(`QUIET — ${probe.rules.join(', ')} reported nothing.`);
    return;
  }
  console.log(`${reports.length} report(s):`);
  for (const m of reports) {
    console.log(`   ${m.ruleId} [${m.messageId}] ${m.line}:${m.column} — ${m.message.split('\n')[0].slice(0, 100)}`);
    for (const s of m.suggestions ?? []) console.log(`      suggestion: ${s.desc?.slice(0, 70)}`);
  }
}

main().catch((e: Error) => {
  console.error(`probe failed: ${e.message}`);
  process.exit(2);
});

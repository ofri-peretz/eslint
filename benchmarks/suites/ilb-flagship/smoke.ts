#!/usr/bin/env -S npx tsx
// @ts-nocheck
/**
 * ILB-Flagship smoke gate — fast (~5s) corpus-only check for the `quality`
 * pipeline. Runs each flagship rule that has a labeled CWE corpus, asserts
 * F1=1.00 and recall=1.00. Exits non-zero on any regression so CI fails.
 *
 * Use this in pre-merge gates. The full latency + real-OSS sweep
 * (`npm run ilb:flagship`) is for nightly/scheduled runs.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUITE = __dirname;
const REPO_ROOT = resolve(SUITE, '../../..');
const WORKSPACE = resolve(SUITE, 'workspace');
const CONFIGS = resolve(WORKSPACE, 'configs');
const CORPUS_DIR = resolve(REPO_ROOT, 'benchmarks/corpus');
const ESLINT_BIN = resolve(WORKSPACE, 'node_modules/.bin/eslint');

const manifest = JSON.parse(readFileSync(join(SUITE, 'manifest.json'), 'utf8'));

// Mirror corpusForRule from run.ts. Keeping it duplicated keeps the smoke
// fast-path independent of the rest of the runner — no shared imports.
const RULE_TO_CWE = {
  'pg/no-unsafe-query': 'CWE-089',
  'secure-coding/no-hardcoded-credentials': 'CWE-798',
  'browser-security/no-postmessage-wildcard-origin': 'CWE-346',
  'jwt/no-algorithm-none': 'CWE-327',
  'mongodb-security/no-unsafe-query': 'CWE-943',
  'secure-coding/no-redos-vulnerable-regex': 'CWE-1333',
  'react-features/hooks-exhaustive-deps': 'react-hooks',
  'react-a11y/alt-text': 'WCAG-1.1.1',
  'vercel-ai-security/no-unsafe-output-handling': 'OWASP-LLM02',
  // import-next/no-cycle has no CWE corpus — cycles are repo-specific.
};

const slug = (id: string) => id.replace(/[\/]/g, '-');

function writeESLintConfig(slugId: string, plugin: string, rule: string) {
  const file = join(CONFIGS, `smoke-${slugId}.${plugin}.eslint.config.mjs`);
  const ruleSlug = plugin.replace(/^eslint-plugin-/, '').replace(/^@.+\//, '');
  // For react-a11y/alt-text the corpus uses next/image's <Image> component;
  // configure custom-component support so the bench reflects real users.
  const customOptions = ruleSlug === 'react-a11y' && rule === 'alt-text'
    ? `, { img: ['Image'] }` : '';
  const body = `import plugin from '${plugin}';
import tsParser from '@typescript-eslint/parser';
export default [{
  files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
  languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  plugins: { '${ruleSlug}': plugin.default ?? plugin },
  rules: { '${ruleSlug}/${rule}': ['error'${customOptions}] },
}];
`;
  writeFileSync(file, body);
  return file;
}

function runOnDir(configPath: string, dir: string, prefix: string) {
  const files = readdirSync(dir).filter((f) => /\.(js|ts|tsx|mjs|cjs)$/.test(f));
  let firingFiles = 0;
  for (const file of files) {
    const filePath = join(dir, file);
    const res = spawnSync(
      ESLINT_BIN,
      ['--no-config-lookup', '--config', configPath, '--no-cache', '-f', 'json', filePath],
      { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
    );
    try {
      const json = JSON.parse(res.stdout);
      const hits = json[0]?.messages?.filter((m: any) => m.ruleId?.startsWith(prefix))?.length || 0;
      if (hits > 0) firingFiles++;
    } catch {
      // Parse failure on this fixture; conservative: count as silent.
    }
  }
  return { total: files.length, firingFiles };
}

let failures = 0;
let checked = 0;

for (const rule of manifest.rules) {
  const cwe = RULE_TO_CWE[rule.id];
  if (!cwe) continue;
  const corpusDir = join(CORPUS_DIR, cwe);
  if (!existsSync(corpusDir)) {
    console.log(`  ${rule.id} — corpus ${cwe} not seeded yet (skipping)`);
    continue;
  }
  const cfg = writeESLintConfig(slug(rule.id), rule.ours.plugin, rule.ours.rule);
  const prefix = rule.ours.plugin.replace(/^eslint-plugin-/, '').replace(/^@.+\//, '') + '/';
  const v = runOnDir(cfg, join(corpusDir, 'vulnerable'), prefix);
  const s = runOnDir(cfg, join(corpusDir, 'safe'), prefix);
  const tp = v.firingFiles;
  const fn = v.total - v.firingFiles;
  const fp = s.firingFiles;
  const tn = s.total - s.firingFiles;
  const precision = (tp + fp) === 0 ? null : tp / (tp + fp);
  const recall = (tp + fn) === 0 ? null : tp / (tp + fn);
  const f1 = (precision != null && recall != null && (precision + recall) > 0)
    ? 2 * precision * recall / (precision + recall)
    : null;

  const fmt = (n: number | null) => n == null ? '—' : (n * 100).toFixed(0) + '%';
  const ok = recall === 1 && f1 === 1;
  const tag = ok ? '✓' : '✗ FAIL';
  console.log(`  ${tag}  ${rule.id}  ${cwe}  P=${fmt(precision)} R=${fmt(recall)} F1=${f1?.toFixed(2) ?? '—'}  (TP=${tp} FP=${fp} FN=${fn} TN=${tn})`);
  checked++;
  if (!ok) failures++;
}

console.log('');
if (checked === 0) {
  console.error('No flagship rules have a corpus mapping. Smoke gate is no-op — fix RULE_TO_CWE or seed corpora.');
  process.exit(2);
}
if (failures > 0) {
  console.error(`Flagship smoke gate: ${failures} rule(s) below F1=1.00 / recall=1.00 SLO.`);
  process.exit(1);
}
console.log(`Flagship smoke gate: ${checked} rule(s) at SLO (F1=1.00 / recall=1.00).`);

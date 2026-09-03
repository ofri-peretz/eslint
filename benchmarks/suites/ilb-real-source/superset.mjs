/**
 * ilb:superset — does Interlace cover what every other community security plugin finds?
 *
 * On a LABELLED corpus "superset" is exact: every vulnerable fixture they detect, we detect.
 * On real source there is no ground truth, so the honest question is file-level:
 *
 *   If you deleted their plugin and kept ours, which files would go dark?
 *
 * A file where a competitor reports and we report nothing is a **coverage gap** — we cannot
 * claim to replace them there. A file where both report is covered. This is a weaker claim
 * than the labelled-corpus one and is labelled as such wherever it is quoted.
 *
 * All plugins run in ONE ESLint pass and findings are attributed by rule prefix, so every
 * side sees exactly the same file set, parser and options.
 *
 *   node benchmarks/suites/ilb-real-source/superset.mjs [--json]
 */
import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '../../.real-source-cache');
const asJson = process.argv.includes('--json');

const load = async (n) => (await import(n)).default ?? (await import(n));
const R = path.join(HERE, '../../../packages');
const local = async (p) => (await import(`${R}/${p}/dist/src/index.js`)).default;

const sc = await local('eslint-plugin-secure-coding');
const bs = await local('eslint-plugin-browser-security');
const ns = await local('eslint-plugin-node-security');
const tsParser = await load('@typescript-eslint/parser');

/**
 * `eslint-plugin-sonarjs` is deliberately excluded. Its `recommended` is 279 general-purpose
 * code-quality rules, so file-level overlap with it measures "does sonarjs have an opinion
 * about this file", not security coverage. It stays in the labelled-corpus comparison, where
 * fixtures are security-specific and the question is well posed.
 */
const COMPETITORS = [
  { pkg: 'eslint-plugin-security', prefix: 'security', config: 'recommended' },
  { pkg: 'eslint-plugin-no-unsanitized', prefix: 'no-unsanitized', config: 'recommended' },
  { pkg: 'eslint-plugin-security-node', prefix: 'security-node', config: 'recommended' },
  { pkg: '@microsoft/eslint-plugin-sdl', prefix: '@microsoft/sdl', config: 'common' },
];

const rulesOf = (plugin, configName) => {
  const cfg = plugin.configs?.[configName] ?? plugin.configs?.recommended;
  const picked = Array.isArray(cfg) ? cfg.find((c) => c.rules) : cfg;
  const names = Object.keys(picked?.rules ?? {});
  return Object.fromEntries(names.map((n) => [n, 'error']));
};

const plugins = { 'secure-coding': sc, 'browser-security': bs, 'node-security': ns };
let rules = { ...rulesOf(sc, 'recommended'), ...rulesOf(bs, 'recommended'), ...rulesOf(ns, 'recommended') };

for (const c of COMPETITORS) {
  const p = await load(c.pkg);
  plugins[c.prefix] = p;
  rules = { ...rules, ...rulesOf(p, c.config) };
  c.ruleCount = Object.keys(rulesOf(p, c.config)).length;
}
const OURS = /^(secure-coding|browser-security|node-security)\//;

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins,
      rules,
    },
    { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tsParser } },
  ],
});

const SKIP_DIR = /(^|\/)(node_modules|dist|build|\.next|\.nuxt|coverage|vendor|public|fixtures?|__fixtures__|test|tests|__tests__|spec|specs|e2e|benchmarks?|examples?|docs?)(\/|$)/;
const SKIP_FILE = /\.(min|bundle|chunk)\.[cm]?jsx?$|\.d\.ts$|\.(test|spec)\.[cm]?[jt]sx?$/;

const collect = (root) => {
  const out = [];
  (function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      const rel = path.relative(root, p).split(path.sep).join('/');
      if (e.isDirectory()) { if (!SKIP_DIR.test(`/${rel}/`) && !e.name.startsWith('.')) walk(p); }
      else if (/\.([cm]?jsx?|tsx?)$/.test(e.name) && !SKIP_FILE.test(e.name)) out.push(p);
    }
  })(root);
  return out;
};

const rows = [];
const gapsByCompetitor = Object.fromEntries(COMPETITORS.map((c) => [c.prefix, { filesTheyCover: 0, filesWeMiss: 0, examples: [] }]));
const totals = { files: 0, loc: 0, sloc: 0, ours: 0 };
COMPETITORS.forEach((c) => (totals[c.prefix] = 0));

for (const dir of fs.readdirSync(CACHE).sort()) {
  const root = path.join(CACHE, dir);
  if (!fs.statSync(root).isDirectory()) continue;
  const repo = dir.replace('__', '/');
  let commit = null;
  try { commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD']).toString().trim(); } catch { /* not a clone */ }

  const files = collect(root);
  const row = { repo, commit, files: files.length, loc: 0, sloc: 0, ours: 0, gaps: {} };
  COMPETITORS.forEach((c) => { row[c.prefix] = 0; row.gaps[c.prefix] = 0; });

  for (const f of files) {
    let code;
    try { code = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const lines = code.split('\n');
    if (code.length / Math.max(lines.length, 1) > 500) continue; // minified
    row.loc += lines.length;
    row.sloc += lines.filter((l) => l.trim() && !/^\s*(\/\/|\/\*|\*)/.test(l)).length;

    let res;
    try { res = await eslint.lintText(code, { filePath: `case${path.extname(f)}` }); } catch { continue; }
    const msgs = (res[0]?.messages ?? []).filter((m) => m.ruleId);
    if (!msgs.length) continue;

    const weFired = msgs.some((m) => OURS.test(m.ruleId));
    row.ours += msgs.filter((m) => OURS.test(m.ruleId)).length;

    for (const c of COMPETITORS) {
      const theirs = msgs.filter((m) => m.ruleId.startsWith(`${c.prefix}/`));
      if (!theirs.length) continue;
      row[c.prefix] += theirs.length;
      gapsByCompetitor[c.prefix].filesTheyCover++;
      if (!weFired) {
        row.gaps[c.prefix]++;
        gapsByCompetitor[c.prefix].filesWeMiss++;
        if (gapsByCompetitor[c.prefix].examples.length < 5) {
          gapsByCompetitor[c.prefix].examples.push({ repo, file: path.relative(root, f), rules: [...new Set(theirs.map((m) => m.ruleId))] });
        }
      }
    }
  }

  totals.files += row.files; totals.loc += row.loc; totals.sloc += row.sloc; totals.ours += row.ours;
  COMPETITORS.forEach((c) => (totals[c.prefix] += row[c.prefix]));
  rows.push(row);
  if (!asJson) {
    console.log(
      row.repo.padEnd(30),
      `files ${String(row.files).padStart(5)}`,
      `sloc ${String(row.sloc).padStart(7)}`,
      `us ${String(row.ours).padStart(5)}`,
      COMPETITORS.map((c) => `${c.prefix.replace('@microsoft/', '')} ${String(row[c.prefix]).padStart(4)}`).join(' '),
      `| gaps ${Object.values(row.gaps).reduce((a, b) => a + b, 0)}`,
    );
  }
}

if (asJson) {
  console.log(JSON.stringify({ rows, totals, gapsByCompetitor, competitors: COMPETITORS }, null, 1));
} else {
  console.log(`\nTOTAL  ${totals.files} files · ${totals.loc.toLocaleString()} lines · ${totals.sloc.toLocaleString()} SLOC`);
  console.log(`Interlace ${totals.ours} findings · ${(totals.ours / totals.sloc * 1000).toFixed(2)} per 1k SLOC\n`);
  console.log('COVERAGE — files where a competitor reports and Interlace does NOT:');
  for (const c of COMPETITORS) {
    const g = gapsByCompetitor[c.prefix];
    const pct = g.filesTheyCover ? ((1 - g.filesWeMiss / g.filesTheyCover) * 100).toFixed(1) : '—';
    console.log(`  ${c.prefix.padEnd(18)} ${String(totals[c.prefix]).padStart(6)} findings · covers ${String(g.filesTheyCover).padStart(5)} files · we miss ${String(g.filesWeMiss).padStart(4)} → ${pct}% file coverage`);
    g.examples.forEach((e) => console.log(`      gap: ${e.repo}/${e.file} — ${e.rules.join(', ')}`));
  }
}

// Stratified sample of real-source findings, with source context, for hand-labelling.
//   node quality-sample.mjs us   [perRule]
//   node quality-sample.mjs them [perRule]
import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORPUS = path.resolve(HERE, '../../corpus');
const PKGS = path.resolve(HERE, '../../../packages');


const SIDE = process.argv[2] ?? 'us';
const PER_RULE = Number(process.argv[3] ?? 3);
const CACHE = path.resolve(HERE, '../../.real-source-cache');


const load = async (p) => (await import(`${PKGS}/${p}/dist/src/index.js`)).default;
const sc = await load('eslint-plugin-secure-coding');
const bs = await load('eslint-plugin-browser-security');
const ns = await load('eslint-plugin-node-security');
const sec = (await import('eslint-plugin-security')).default;
const tsp = (await import('@typescript-eslint/parser')).default;

const rec = (p) => {
  const c = p.configs?.recommended ?? p.configs?.['flat/recommended'];
  const k = Array.isArray(c) ? c.find((x) => x.rules) : c;
  return Object.fromEntries(Object.keys(k?.rules ?? {}).map((n) => [n, 'error']));
};
const plugins = SIDE === 'us'
  ? { 'secure-coding': sc, 'browser-security': bs, 'node-security': ns }
  : { security: sec };
const rules = SIDE === 'us' ? { ...rec(sc), ...rec(bs), ...rec(ns) } : rec(sec);

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    { files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins, rules },
    { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tsp } },
  ],
});

const SKIP = /(^|\/)(node_modules|dist|build|\.next|\.nuxt|coverage|vendor|public|fixtures?|__fixtures__|test|tests|__tests__|spec|specs|e2e|benchmarks?|examples?|docs?)(\/|$)/;
const byRule = {};

for (const repoDir of fs.readdirSync(CACHE)) {
  const root = path.join(CACHE, repoDir);
  if (!fs.statSync(root).isDirectory()) continue;
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(root, p).split(path.sep).join('/');
      if (e.isDirectory()) { if (!SKIP.test(`/${rel}/`) && !e.name.startsWith('.')) walk(p); }
      else if (/\.([cm]?jsx?|tsx?)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(p);
    }
  })(root);

  for (const f of files) {
    // stop early once every rule already has enough samples from enough repos
    const code = fs.readFileSync(f, 'utf8');
    if (code.length / Math.max(code.split('\n').length, 1) > 500) continue;
    let res;
    try { res = await eslint.lintText(code, { filePath: `case${path.extname(f)}` }); } catch { continue; }
    const lines = code.split('\n');
    for (const m of res[0]?.messages ?? []) {
      if (!m.ruleId) continue;
      const bucket = (byRule[m.ruleId] ??= []);
      // one sample per repo per rule, up to PER_RULE — keeps the sample spread out
      if (bucket.length >= PER_RULE || bucket.some((b) => b.repo === repoDir)) continue;
      bucket.push({
        repo: repoDir,
        file: path.relative(root, f),
        line: m.line,
        src: (lines[m.line - 1] ?? '').trim().slice(0, 150),
        ctx: lines.slice(Math.max(0, m.line - 3), m.line + 1).map((l) => l.trim()).filter(Boolean).join(' ⏎ ').slice(0, 220),
      });
    }
  }
}

const ranked = Object.entries(byRule).sort((a, b) => b[1].length - a[1].length);
let n = 0;
for (const [rule, hits] of ranked) {
  console.log(`\n### ${rule}`);
  for (const h of hits) {
    n++;
    console.log(`[${n}] ${h.repo}/${h.file}:${h.line}`);
    console.log(`    ${h.src}`);
    if (h.ctx !== h.src) console.log(`    ctx: ${h.ctx}`);
  }
}
console.log(`\n--- ${n} findings sampled across ${ranked.length} rules ---`);

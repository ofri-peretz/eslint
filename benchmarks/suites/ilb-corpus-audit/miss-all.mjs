// Local-source FP audit: which safe/ fixtures still fire, and from which rule.
// Run: node fp-audit.mjs
import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORPUS = path.resolve(HERE, '../../corpus');
const PKGS = path.resolve(HERE, '../../../packages');




const load = async (p) => (await import(`${PKGS}/${p}/dist/src/index.js`)).default;
const sc = await load('eslint-plugin-secure-coding');
const bs = await load('eslint-plugin-browser-security');
const ns = await load('eslint-plugin-node-security');
const jwt = await load('eslint-plugin-jwt-security');
const mongo = await load('eslint-plugin-mongodb-security');
const a11y = await load('eslint-plugin-react-a11y');
const exp = await load('eslint-plugin-express-security');
// react-features owns hooks-exhaustive-deps and the react/* family; without it the
// react-hooks fixtures read as undetected when the rule that covers them exists.
const rf = await load('eslint-plugin-react-features');
const tsp = (await import('@typescript-eslint/parser')).default;

const all = (p, pre) => Object.fromEntries(Object.keys(p.rules).map((r) => [`${pre}/${r}`, 'error']));
const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    { files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { 'secure-coding': sc, 'browser-security': bs, 'node-security': ns, 'jwt-security': jwt, 'mongodb-security': mongo, 'react-a11y': a11y, 'express-security': exp, 'react-features': rf },
      rules: { ...all(sc, 'secure-coding'), ...all(bs, 'browser-security'), ...all(ns, 'node-security'), ...all(jwt, 'jwt-security'), ...all(mongo, 'mongodb-security'), ...all(a11y, 'react-a11y'), ...all(exp, 'express-security'),
        ...Object.fromEntries(Object.keys(rf.rules).filter((r) => r.includes('/')).map((r) => [`react-features/${r}`, 'error'])) } },
    { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tsp } },
  ],
});

const byRule = {};
let files = 0, safe = 0;
for (const dir of fs.readdirSync(CORPUS).sort()) {
  const d = path.join(CORPUS, dir, 'vulnerable');
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => /\.[jt]sx?$/.test(x))) {
    safe++;
    const res = await eslint.lintText(fs.readFileSync(path.join(d, f), 'utf8'), { filePath: `case${path.extname(f)}` });
    const msgs = (res[0]?.messages ?? []).filter((m) => m.ruleId);
    if (msgs.length) continue;
    files++;
    console.log(`UNDETECTED ${dir}/${f}`);
    
  }
}
console.log(`\nFP ${files}/${safe} (${((files / safe) * 100).toFixed(1)}%)\n`);
Object.entries(byRule).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => console.log(`  ${String(c).padStart(3)}  ${r}`));

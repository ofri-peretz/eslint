#!/usr/bin/env -S npx tsx
/**
 * harvest-fixtures.mjs — extract RuleTester `code` blocks into standalone JS
 * fixtures for the parity bench.
 *
 * Each rule's *.test.ts contains valid + invalid cases. The invalid ones are
 * known-positive examples — both ESLint and oxlint should fire on them. The
 * valid ones are known-negative — both should be silent. Either way they
 * exercise the rule's actual code paths, far more thoroughly than the small
 * hand-crafted CWE corpus.
 *
 * We extract every \`code: \\`...\\`\` block via a deliberately simple regex
 * (no full TS parser — these test files follow a uniform shape). Each extract
 * is written to harvested-fixtures/<plugin>/<rule>/<idx>.js so the parity bench
 * can lint the directory.
 *
 * Usage: tsx benchmarks/suites/ilb-oxlint-parity/harvest-fixtures.ts
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const PACKAGES = path.join(REPO_ROOT, 'packages');
const OUT_DIR = path.join(HERE, 'harvested-fixtures');

// Match `code: \`...\`` allowing embedded backticks via escape.
// Greedy on inner template literal but bounded by a closing-backtick + newline +
// either `,` or `}` to avoid running over multi-block boundaries.
const CODE_RE = /code:\s*`([\s\S]*?)`(?:\s*,|\s*\n\s*[},])/g;

function harvestFile(testFile, pluginShort, ruleName) {
  const src = fs.readFileSync(testFile, 'utf-8');
  const blocks = [];
  let m;
  while ((m = CODE_RE.exec(src)) !== null) {
    const raw = m[1];
    const code = raw.trim();
    // Skip empty / trivially-short cases
    if (code.length < 8) continue;
    // Skip JSX-heavy cases — RuleTester JSX features may not align with our
    // bench config; keep the corpus to plain JS/TS.
    if (code.includes('<') && code.includes('/>')) continue;
    // Skip cases that parse cleanly only inside RuleTester's per-test parser
    // options. These fail under the bench config's defaults and produce
    // ESLint vs oxlint divergence that's a *parser-context* artifact (oxlint
    // is more permissive than the default acorn config), not a runtime issue:
    //   • Top-level `return` (only valid in commonjs sourceType)
    //   • Decorators (only valid with the decorator parser plugin)
    //   • TypeScript-only syntax (type annotations, satisfies, etc.) in .js
    if (/^\s*return\b/m.test(code)) continue;
    if (/^\s*@\w+/m.test(code)) continue; // decorator
    if (/:\s*(string|number|boolean|any|void|never|unknown)(\s*[,)=;]|$)/m.test(code)) continue; // TS type annotation
    if (/\bsatisfies\b|<\w+>\s*\(|interface\s+\w+|type\s+\w+\s*=/.test(code)) continue;
    blocks.push(raw);
  }
  return blocks;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(test|spec)\.ts$/.test(e.name)) out.push(full);
  }
  return out;
}

if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const summary = { plugins: 0, rules: 0, fixtures: 0 };

for (const pluginDir of fs.readdirSync(PACKAGES)) {
  if (!pluginDir.startsWith('eslint-plugin-')) continue;
  const rulesDir = path.join(PACKAGES, pluginDir, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) continue;

  const short = pluginDir.replace(/^eslint-plugin-/, '');
  const testFiles = walk(rulesDir);
  if (testFiles.length === 0) continue;

  let pluginCount = 0;
  for (const testFile of testFiles) {
    // Derive a stable rule slug from the path
    const rel = path.relative(rulesDir, testFile).replace(/\.(test|spec)\.ts$/, '');
    const ruleSlug = rel.replace(/\//g, '__').replace(/\\/g, '__');
    const blocks = harvestFile(testFile, short, ruleSlug);
    if (blocks.length === 0) continue;

    const ruleOutDir = path.join(OUT_DIR, short, ruleSlug);
    fs.mkdirSync(ruleOutDir, { recursive: true });
    // Content-hashed filenames: a stable code block always maps to the same
    // file across regenerations, so a one-line edit to a test file shifts
    // exactly one fixture instead of renumbering every subsequent one.
    // 8 hex chars = 32 bits, plenty for ~100 fixtures per rule.
    const seen = new Set();
    for (const code of blocks) {
      const hash = crypto.createHash('sha256').update(code).digest('hex').slice(0, 8);
      if (seen.has(hash)) continue; // identical duplicate code blocks collapse
      seen.add(hash);
      fs.writeFileSync(path.join(ruleOutDir, `${hash}.js`), code + '\n');
      summary.fixtures++;
    }
    summary.rules++;
    pluginCount++;
  }
  if (pluginCount > 0) summary.plugins++;
}

console.log(`harvested ${summary.fixtures} fixtures from ${summary.rules} rule test files across ${summary.plugins} plugins`);
console.log(`output: ${path.relative(REPO_ROOT, OUT_DIR)}`);

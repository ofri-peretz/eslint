/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Stop rule 701 from being born blind.
 *
 * A rule that matches `node.type === 'Literal'` sees `'sha1'` and not
 * `` `sha1` ``. A rule that reads `member.property.name` sees `o.k` and not
 * `o['k']`. Neither is a decision anybody made — it is what those expressions
 * MEAN when the grammar allows a second spelling, and it is invisible in review
 * because the test suite is written in the same spelling as the rule.
 *
 * Measured across this repository: 3,825 meaning-preserving rewrites of known
 * true positives produced **1,113 cases where the rule reported the original
 * and went silent on the rewrite**, across 159 of 470 rules.
 *
 * Remediating 1,113 by hand does not scale to 700 rules. Refusing the 701st is
 * what scales, so this gate is a RATCHET: every existing site is recorded in a
 * baseline and ignored, and a NEW one fails the build with the devkit call that
 * replaces it.
 *
 *   npx tsx scripts/audit-rule-spellings.ts            # report
 *   npx tsx scripts/audit-rule-spellings.ts --check    # gate
 *   npx tsx scripts/audit-rule-spellings.ts --update   # accept the current set
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBaseline } from './lib/read-baseline.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASELINE = path.join(
  ROOT,
  'benchmarks',
  'budgets',
  'rule-spelling-baseline.json',
);

const CHECK = process.argv.includes('--check');
const UPDATE = process.argv.includes('--update');

type Pattern = {
  id: string;
  /** What the code says. */
  match: RegExp;
  /** What it misses. */
  blind: string;
  /** What to write instead. */
  instead: string;
};

const PATTERNS: Pattern[] = [
  {
    id: 'string-literal-only',
    // `x.type === 'Literal'` — misses a no-substitution template literal.
    //
    // Only when a STRING is actually in play. `value.value === null` and
    // `=== true` are literal checks too, and no template literal is ever null
    // or true — flagging them made the gate cry wolf on its first run, which
    // is how a gate gets ignored.
    match:
      /\.type === (?:'Literal'|AST_NODE_TYPES\.Literal)\b(?=[\s\S]{0,120}?(?:typeof\s+[\w.[\]?]+\.value === 'string'|\.value === '|\.value\.startsWith|\.value\.includes|\.value\.toLowerCase))/g,
    blind:
      "a no-substitution template literal: `foo(`sha1`)` is the same string as `foo('sha1')`",
    instead:
      'staticString(node) — returns the string in either spelling, or null',
  },
  {
    id: 'dotted-property-only',
    // `X.property.name` — misses `o['k']` and `` o[`k`] ``.
    match: /\.property\.name\b/g,
    blind:
      "a computed key: `o['k']` and `` o[`k`] `` reach the same property as `o.k`",
    instead: 'propertyName(member) — resolves all three spellings',
  },
  {
    id: 'bare-object-key-only',
    // `X.key.name` — misses `{ ['k']: v }`.
    match: /\.key\.name\b/g,
    blind:
      "a computed key: `{ ['k']: v }` declares the same property as `{ k: v }`",
    instead: 'objectKeyName(property) — resolves all four spellings',
  },
];

/** Every rule source, excluding tests — a test may spell things deliberately. */
function ruleSources(): string[] {
  const out: string[] = [];
  const packages = path.join(ROOT, 'packages');
  for (const pkg of fs.readdirSync(packages)) {
    if (!pkg.startsWith('eslint-plugin-')) continue;
    const src = path.join(packages, pkg, 'src');
    if (!fs.existsSync(src)) continue;
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        if (/\.(test|spec)\.ts$/.test(entry.name)) continue;
        if (full.includes(`${path.sep}tests${path.sep}`)) continue;
        out.push(full);
      }
    };
    walk(src);
  }
  return out.sort();
}

type Site = { file: string; line: number; pattern: string; text: string };

const sites: Site[] = [];
for (const file of ruleSources()) {
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split('\n');
  for (const pattern of PATTERNS) {
    lines.forEach((text, index) => {
      // A comment is not code.
      //
      // This gate's own message tells you to explain a deliberate spelling in
      // a comment — and then flagged the comment, because it scans raw text.
      // Writing `// propertyName and not callee.property.name` created a new
      // violation, so the documented way to resolve a finding produced one.
      //
      // WHOLE-LINE comments only. Stripping a trailing `// …` off a code line
      // would also strip a `//` inside a string literal and could hide a real
      // site, and hiding one is the failure that matters here; a trailing
      // comment that trips the scan is merely noisy.
      if (/^\s*(\/\/|\*|\/\*)/.test(text)) return;

      // A line that already routes through the devkit is not a site.
      if (
        /staticString\(|propertyName\(|objectKeyName\(|memberPath\(/.test(text)
      )
        return;
      pattern.match.lastIndex = 0;
      if (!pattern.match.test(text)) return;
      sites.push({
        file: path.relative(ROOT, file),
        line: index + 1,
        pattern: pattern.id,
        text: text.trim().slice(0, 100),
      });
    });
  }
}

/**
 * A site's identity, independent of the line it sits on AND of how prettier
 * chose to wrap it.
 *
 * Keyed on raw text, a reformat read as 79 new violations on the first run
 * after `prettier --write`. Whitespace is not the claim; the code is.
 */
const key = (s: Site): string =>
  `${s.file}::${s.pattern}::${s.text.replace(/\s+/g, ' ').trim()}`;
const current = sites.map(key).sort();

const previous = readBaseline(BASELINE, 'sites');
const known = new Set(previous);
const added = sites.filter((s) => !known.has(key(s)));
const removed = previous.filter((k) => !current.includes(k));

const byPattern = new Map<string, number>();
for (const s of sites)
  byPattern.set(s.pattern, (byPattern.get(s.pattern) ?? 0) + 1);

console.log(
  `\n  ${sites.length} spelling-sensitive site(s) across ${new Set(sites.map((s) => s.file)).size} rule file(s)`,
);
for (const p of PATTERNS) {
  console.log(`    ${String(byPattern.get(p.id) ?? 0).padStart(4)}  ${p.id}`);
}
console.log(
  `\n  baseline ${previous.length} · fixed ${removed.length} · NEW ${added.length}`,
);

if (added.length > 0) {
  console.error('\n  ⛔ new spelling-sensitive site(s):\n');
  for (const s of added.slice(0, 20)) {
    const p = PATTERNS.find((x) => x.id === s.pattern);
    console.error(`     ${s.file}:${s.line}`);
    console.error(`       ${s.text}`);
    console.error(`       misses ${p?.blind}`);
    console.error(`       use    ${p?.instead}\n`);
  }
  if (added.length > 20)
    console.error(`     … and ${added.length - 20} more\n`);
}

if (CHECK) {
  if (added.length > 0) {
    console.error(
      '  A rule may not acquire a blind spot it did not already have.',
    );
    console.error(
      '  If the spelling is deliberate, say so in a comment and run --update.\n',
    );
    process.exit(1);
  }
  console.log('  no new blind spots\n');
} else if (UPDATE || previous.length === 0) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify(
      {
        note: 'Sites that read one spelling of a construct the grammar spells two ways. Shrink-only: a NEW one fails the gate. See CASE_PHILOSOPHY.md and benchmarks/SPELLING_MISSES.md.',
        sites: current,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`  baseline: ${previous.length} → ${current.length}\n`);
}

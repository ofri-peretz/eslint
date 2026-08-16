/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ONE RULE, scored head-to-head against every competitor that covers the same
 * sink, on a corpus written from the vulnerability's semantics rather than from
 * anybody's tests.
 *
 * WHY PER-RULE AND NOT PER-PLUGIN
 *
 * The ecosystem-wide leaderboard says "Interlace 100% F1" and that number is
 * true of the corpus it runs on — a corpus this project also authored. It
 * cannot tell you whether ONE rule is better than the specific competitor a
 * user would otherwise install. That is the question a consumer actually asks:
 * "I need XSS coverage, is yours better than Mozilla's?"
 *
 * HOW TO READ THE NUMBERS
 *
 * Every plugin is scored on the SAME files. A fixture in `vulnerable/` must be
 * reported at least once; a fixture in `safe/` must produce no report at all.
 * There is no partial credit and no per-line matching: a rule that reports the
 * right file for the wrong reason still passes, which flatters everyone
 * equally.
 *
 *   TP  a vulnerable fixture reported
 *   FN  a vulnerable fixture missed        -> costs recall
 *   FP  a safe fixture reported            -> costs precision, and costs trust
 *
 * A CRASH is reported separately and never silently scored as "no findings" —
 * that mistake once turned a broken harness into a clean bill of health here.
 *
 * Usage:
 *   node benchmarks/suites/ilb-rule-duel/run.mjs <plugin>/<rule>
 *   node benchmarks/suites/ilb-rule-duel/run.mjs browser-security/no-innerhtml --json
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { createRequire } from 'node:module';

import { Linter } from 'eslint';

// `require` is not defined in an ES module; without this every competitor
// loaded as null and the table printed "not installed" for all of them — a
// silent 0-0 that reads as "no competitor covers this".
const require = createRequire(import.meta.url);

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..', '..');

/**
 * Competitor rule sets, per sink family.
 *
 * Listed by hand and deliberately generous: every rule a competitor ships that
 * could plausibly fire on this corpus is enabled, so a miss is theirs and not an
 * artefact of us configuring them badly. `no-unsanitized` in particular is
 * Mozilla's dedicated implementation of exactly this check.
 */
const COMPETITORS = {
  'browser-security/no-innerhtml': [
    { name: 'no-unsanitized (Mozilla)', pkg: 'eslint-plugin-no-unsanitized', rules: ['property', 'method'] },
    { name: '@microsoft/sdl', pkg: '@microsoft/eslint-plugin-sdl', rules: ['no-inner-html', 'no-html-method', 'no-document-write'] },
    { name: 'sonarjs', pkg: 'eslint-plugin-sonarjs', rules: ['no-vulnerable-dom-methods', 'dompurify-unsafe-config'] },
  ],
};

function fixtures(ruleId) {
  const base = path.join(REPO, 'benchmarks', 'rule-corpus', ruleId.replace('/', '__'));
  const read = (kind) => {
    const dir = path.join(base, kind);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => /\.[jt]sx?$/.test(f))
      .map((f) => ({ file: path.join(dir, f), name: `${kind}/${f}`, expectReport: kind === 'vulnerable' }));
  };
  const all = [...read('vulnerable'), ...read('safe')];
  if (all.length === 0) {
    // Fail loudly. A missing corpus scoring as 0/0 would read as a tie.
    throw new Error(`No corpus at ${base}. Create vulnerable/ and safe/ fixtures first.`);
  }
  return all;
}

async function loadOurRule(ruleId) {
  const [plugin, rule] = [ruleId.split('/')[0], ruleId.split('/').slice(1).join('/')];
  const file = path.join(REPO, 'packages', `eslint-plugin-${plugin}`, 'src', 'rules', rule, 'index.ts');
  const mod = await import(url.pathToFileURL(file).href);
  const exported = Object.values(mod).find((v) => v && typeof v === 'object' && 'create' in v);
  if (!exported) throw new Error(`${ruleId} exports no rule`);
  return { [rule]: exported };
}

function loadCompetitor(entry) {
  let pkg;
  try {
    pkg = require(entry.pkg);
  } catch {
    return null;
  }
  const available = pkg.rules ?? {};
  const picked = {};
  for (const r of entry.rules) if (available[r]) picked[r] = available[r];
  return Object.keys(picked).length ? picked : null;
}

function score(linter, rules, prefix, files, parser) {
  const enabled = Object.fromEntries(Object.keys(rules).map((r) => [`${prefix}/${r}`, 'error']));
  let tp = 0, fp = 0, fn = 0;
  const crashes = [];
  const missed = [];
  const falsePositives = [];

  for (const f of files) {
    const code = fs.readFileSync(f.file, 'utf8');
    let messages;
    try {
      messages = linter.verify(
        code,
        {
          files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
          languageOptions: {
            ...(parser ? { parser } : {}),
            ecmaVersion: 2022,
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: { [prefix]: { rules } },
          rules: enabled,
        },
        path.basename(f.file),
      );
    } catch (e) {
      crashes.push(`${f.name}: ${e.message}`);
      continue;
    }
    const crashed = messages.filter((m) => !m.ruleId);
    if (crashed.length) crashes.push(`${f.name}: ${crashed[0].message}`);
    const reported = messages.some((m) => m.ruleId);

    if (f.expectReport) {
      if (reported) tp++;
      else { fn++; missed.push(f.name); }
    } else if (reported) {
      fp++; falsePositives.push(f.name);
    }
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { tp, fp, fn, precision, recall, f1, crashes, missed, falsePositives };
}

async function main() {
  const ruleId = process.argv[2];
  if (!ruleId) throw new Error('usage: run.mjs <plugin>/<rule> [--json]');
  const asJson = process.argv.includes('--json');

  const files = fixtures(ruleId);
  const linter = new Linter();
  const { default: tsParser } = await import('@typescript-eslint/parser');

  const results = [];
  results.push({
    name: `Interlace ${ruleId}`,
    ...score(linter, await loadOurRule(ruleId), 'ours', files, tsParser),
  });

  for (const entry of COMPETITORS[ruleId] ?? []) {
    const rules = loadCompetitor(entry);
    if (!rules) {
      results.push({ name: entry.name, unavailable: true });
      continue;
    }
    results.push({ name: `${entry.name} [${Object.keys(rules).join(', ')}]`, ...score(linter, rules, 'them', files, tsParser) });
  }

  if (asJson) {
    console.log(JSON.stringify({ rule: ruleId, fixtures: files.length, results }, null, 2));
    return;
  }

  const v = files.filter((f) => f.expectReport).length;
  console.log(`\n══ ${ruleId} — ${v} vulnerable / ${files.length - v} safe fixtures\n`);
  console.log(`| Plugin | TP | FP | FN | Precision | Recall | F1 |`);
  console.log(`|---|---:|---:|---:|---:|---:|---:|`);
  for (const r of results) {
    if (r.unavailable) { console.log(`| ${r.name} | — | — | — | not installed | | |`); continue; }
    const pct = (x) => `${(x * 100).toFixed(1)}%`;
    console.log(`| ${r.name} | ${r.tp} | ${r.fp} | ${r.fn} | ${pct(r.precision)} | ${pct(r.recall)} | **${pct(r.f1)}** |`);
  }
  for (const r of results) {
    if (r.unavailable) continue;
    if (r.crashes.length) console.log(`\n💥 ${r.name} CRASHED on ${r.crashes.length}:\n   ${r.crashes.slice(0, 3).join('\n   ')}`);
    if (r.missed.length) console.log(`\n   ${r.name} missed: ${r.missed.join(', ')}`);
    if (r.falsePositives.length) console.log(`   ${r.name} false positives: ${r.falsePositives.join(', ')}`);
  }
  console.log('');
}

main().catch((e) => { console.error(e.message); process.exit(1); });

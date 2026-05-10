#!/usr/bin/env -S npx tsx

/**
 * ILB Validate Fixtures — verifies that each ground-truth fixture in the
 * Juliet CWE corpus does what its label claims. This closes the
 * single-annotator gap by giving us a self-checking corpus:
 *
 *   - For every `vulnerable/*.js` fixture: at least ONE rule from the
 *     manifest's `expectedPlugins` must fire. If nothing fires, either the
 *     fixture is mislabeled (it isn't actually vulnerable) or the relevant
 *     rule is missing (a real coverage gap). Either way, we want to know.
 *
 *   - For every `safe/*.js` fixture: NO rule from the same plugins must
 *     fire. If something fires, either the fixture is mislabeled (the
 *     "safe" code is in fact vulnerable) or a rule has a false positive.
 *     Either way, we want to know.
 *
 * The script also enforces a metadata convention to address the "single
 * author" concern:
 *
 *   - Every fixture file must have a `// @author <name>` line.
 *   - Every fixture file must have a `// @reviewedBy <name>` line that
 *     differs from `@author`.
 *   - The CI mode (--strict) fails when these are missing.
 *
 * Usage:
 *   node scripts/ilb-validate-fixtures.mjs              # human report
 *   node scripts/ilb-validate-fixtures.mjs --strict     # exit 1 on any drift / missing metadata
 *   node scripts/ilb-validate-fixtures.mjs --cwe=CWE-089
 *   node scripts/ilb-validate-fixtures.mjs --json
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { ESLint } from 'eslint';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS_DIR = path.join(ROOT, 'benchmarks', 'corpus');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => {
  const eq = args.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = args.indexOf(`--${n}`);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const STRICT = flag('strict');
const EMIT_JSON = flag('json');
const FOCUS_CWE = opt('cwe');

// Lazy-load the Interlace plugins via the same path ILB-Juliet uses.
async function loadConfig() {
  const interlaceConfigPath = path.join(
    ROOT, 'benchmarks', 'suites', 'ilb-arena', 'configs', 'interlace.config.js',
  );
  const url = pathToFileURL(interlaceConfigPath).href;
  const mod = await import(url);
  return mod.default ?? mod;
}

function readMetadata(filePath) {
  const src = fs.readFileSync(filePath, 'utf-8');
  const head = src.split('\n').slice(0, 30).join('\n');
  const author = (/\/\/\s*@author\s+([^\n]+)/.exec(head) || [])[1]?.trim();
  const reviewer = (/\/\/\s*@reviewedBy\s+([^\n]+)/.exec(head) || [])[1]?.trim();
  const lastReviewed = (/\/\/\s*@lastReviewed\s+(\d{4}-\d{2}-\d{2})/.exec(head) || [])[1];
  return { author, reviewer, lastReviewed };
}

function listCorpus() {
  if (!fs.existsSync(CORPUS_DIR)) return [];
  return fs.readdirSync(CORPUS_DIR)
    .filter((d) => /^CWE-\d+$/.test(d))
    .filter((d) => !FOCUS_CWE || d === FOCUS_CWE)
    .sort()
    .map((cwe) => {
      const dir = path.join(CORPUS_DIR, cwe);
      const manifestPath = path.join(dir, 'manifest.json');
      let manifest = {};
      if (fs.existsSync(manifestPath)) {
        try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')); } catch {}
      }
      return {
        cwe,
        dir,
        manifest,
        vulnerable: listFiles(path.join(dir, 'vulnerable')),
        safe: listFiles(path.join(dir, 'safe')),
      };
    })
    .filter((c) => c.vulnerable.length > 0 || c.safe.length > 0);
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /\.(js|ts|jsx|tsx|mjs|cjs)$/.test(f))
    .map((f) => path.join(dir, f));
}

function deriveExpectedRulePrefixes(manifest) {
  // Map manifest's `expectedPlugins` (npm package names) to the rule
  // namespace used in our flat-config (e.g. `eslint-plugin-secure-coding`
  // → rule prefix `secure-coding/`).
  const plugins = manifest.expectedPlugins ?? [];
  return plugins
    .map((p) => p.replace(/^eslint-plugin-/, ''))
    .map((p) => `${p}/`);
}

async function lintFile(filePath, eslint) {
  const results = await eslint.lintFiles([filePath]);
  const messages = [];
  for (const r of results) {
    for (const m of r.messages || []) {
      if (m.fatal) continue;
      if (!m.ruleId) continue;
      messages.push({ ruleId: m.ruleId, severity: m.severity === 2 ? 'error' : 'warn', line: m.line, message: m.message?.slice(0, 200) });
    }
  }
  return messages;
}

function fixtureKindResult({ kind, expected, actual, prefixes }) {
  // For vulnerable fixtures: at least one of the actual rules must start
  // with one of the manifest's expected prefixes.
  // For safe fixtures: no actual rule should start with any prefix.
  const matchedExpected = actual.filter((m) => prefixes.some((pre) => m.ruleId.startsWith(pre)));
  if (kind === 'vulnerable') {
    return {
      ok: matchedExpected.length > 0,
      problem: matchedExpected.length === 0 ? 'no expected rule fired' : null,
      hits: matchedExpected,
      stray: actual.filter((m) => !prefixes.some((pre) => m.ruleId.startsWith(pre))),
    };
  } else {
    return {
      ok: matchedExpected.length === 0,
      problem: matchedExpected.length > 0 ? 'an expected-domain rule fired on safe fixture' : null,
      hits: matchedExpected,
      stray: actual.filter((m) => !prefixes.some((pre) => m.ruleId.startsWith(pre))),
    };
  }
}

async function main() {
  const corpus = listCorpus();
  if (corpus.length === 0) {
    console.error('No corpus found at', CORPUS_DIR);
    process.exit(2);
  }
  const config = await loadConfig();
  // ESLint v9 silently ignores files outside cwd. Use the closest common
  // ancestor of the eslint repo and the corpus.
  const eslint = new ESLint({
    cwd: path.resolve(ROOT, '..'),
    overrideConfigFile: true,
    overrideConfig: [
      { files: ['**/*.{js,ts,mjs,cjs,jsx,tsx}'], languageOptions: { parserOptions: { ecmaVersion: 'latest', sourceType: 'module' } }, linterOptions: { reportUnusedDisableDirectives: 'off' } },
      ...(Array.isArray(config) ? config : [config]),
    ],
  });

  const report = {
    bench: 'ILB-Validate-Fixtures',
    timestamp: new Date().toISOString(),
    cweCount: corpus.length,
    fixturesChecked: 0,
    issues: [],
    metadataIssues: [],
  };

  for (const c of corpus) {
    const prefixes = deriveExpectedRulePrefixes(c.manifest);

    for (const [kind, files] of [['vulnerable', c.vulnerable], ['safe', c.safe]]) {
      for (const file of files) {
        report.fixturesChecked++;
        const meta = readMetadata(file);
        const issues = [];

        if (!meta.author) issues.push('missing @author');
        if (!meta.reviewer) issues.push('missing @reviewedBy');
        if (meta.author && meta.reviewer && meta.author === meta.reviewer) {
          issues.push('@author and @reviewedBy are the same person');
        }
        if (issues.length) {
          report.metadataIssues.push({ cwe: c.cwe, kind, file: path.basename(file), issues });
        }

        const messages = await lintFile(file, eslint);
        const verdict = fixtureKindResult({ kind, expected: prefixes, actual: messages, prefixes });
        if (!verdict.ok) {
          report.issues.push({
            cwe: c.cwe,
            kind,
            file: path.basename(file),
            problem: verdict.problem,
            expectedPrefixes: prefixes,
            hits: verdict.hits,
            stray: verdict.stray.map((s) => `${s.ruleId} @${s.line}: ${s.message}`),
          });
        }
      }
    }
  }

  if (EMIT_JSON) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(STRICT && (report.issues.length || report.metadataIssues.length) ? 1 : 0);
  }

  console.log(`\n🧪 ILB Fixture Validator — ${report.cweCount} CWEs, ${report.fixturesChecked} fixtures\n`);

  if (report.issues.length === 0) {
    console.log('✅ Every fixture lints consistently with its label.');
  } else {
    console.log(`❌ ${report.issues.length} fixture(s) do not match their label:\n`);
    for (const i of report.issues) {
      console.log(`  ${i.cwe} / ${i.kind}/${i.file}`);
      console.log(`     problem: ${i.problem}`);
      console.log(`     expected one of: ${i.expectedPrefixes.join(', ') || '(no expectedPlugins in manifest)'}`);
      if (i.stray && i.stray.length) {
        console.log(`     stray rules fired: ${i.stray.length}`);
        for (const s of i.stray.slice(0, 3)) console.log(`       - ${s}`);
      }
      if (i.hits && i.hits.length && i.kind === 'safe') {
        console.log(`     expected-domain rules that fired incorrectly:`);
        for (const h of i.hits.slice(0, 3)) console.log(`       - ${h.ruleId} @${h.line}: ${h.message}`);
      }
    }
  }

  if (report.metadataIssues.length === 0) {
    console.log('\n✅ Every fixture has @author + @reviewedBy metadata (different people).');
  } else {
    console.log(`\n⚠️  ${report.metadataIssues.length} fixture(s) missing metadata:`);
    for (const m of report.metadataIssues.slice(0, 20)) {
      console.log(`     ${m.cwe} / ${m.kind}/${m.file}: ${m.issues.join(', ')}`);
    }
    if (report.metadataIssues.length > 20) {
      console.log(`     … and ${report.metadataIssues.length - 20} more`);
    }
  }

  console.log('');
  if (STRICT && (report.issues.length || report.metadataIssues.length)) {
    console.log(`🚫 strict mode: ${report.issues.length} label drift + ${report.metadataIssues.length} metadata gaps`);
    process.exit(1);
  }
  console.log(`✨ done (${report.issues.length} drift, ${report.metadataIssues.length} metadata gaps).`);
}

main().catch((e) => { console.error(e); process.exit(1); });

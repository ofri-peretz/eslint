/**
 * ilb:real-source — noise measured on code WE DID NOT WRITE.
 *
 * Every other number in BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md is measured on fixtures we
 * authored (benchmarks/corpus) or on the competitor's own RuleTester snippets. Neither
 * predicts what a maintainer sees when they install the plugin. This does.
 *
 * The previous version of this measurement produced the "we are marginally noisier"
 * finding (them 2,469 / us 2,533) and the 27%-FP claim earmarked for adoption PRs — and it
 * shipped WITHOUT a runner. Its clones are gone and its numbers cannot be re-derived. That
 * is the entire reason this file exists: a figure with no runner is not a measurement.
 *
 *   node benchmarks/suites/ilb-real-source/run.mjs            # all repos
 *   node benchmarks/suites/ilb-real-source/run.mjs --limit=5  # first 5, for a smoke run
 *   node benchmarks/suites/ilb-real-source/run.mjs --json     # machine-readable
 *
 * Clones land in benchmarks/.real-source-cache/ (gitignored), --depth 1, reused across runs.
 */
import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(HERE, '../../.real-source-cache');

/**
 * Selection criteria, in priority order:
 *
 *  1. SECURITY SURFACE FIRST. The repo must actually do something these plugins can judge —
 *     spawn subprocesses, build filesystem paths from request data, serve HTTP, handle
 *     auth/crypto, or talk to a database. Star count alone selects for teaching repos and
 *     style guides (`airbnb/javascript`, `30-seconds-of-code`, `javascript-algorithms`)
 *     which contain none of that and would measure nothing on either side.
 *  2. >= 5,000 stars, so the result speaks to code people actually depend on.
 *  3. Actively maintained and unarchived.
 *  4. Permissive licence — we only read the source, but the corpus should be quotable.
 *
 * Star counts captured 2026-08-13. `surface` documents WHY each repo is here, so a future
 * reader can tell a deliberate pick from a drive-by addition.
 */
const REPOS = [
  { repo: 'n8n-io/n8n', stars: 200538, surface: 'subprocess, http, credentials, code eval' },
  { repo: 'axios/axios', stars: 109234, surface: 'http client, url handling, redirects' },
  { repo: 'louislam/uptime-kuma', stars: 90156, surface: 'http probing, subprocess, auth, sqlite' },
  { repo: 'nestjs/nest', stars: 76371, surface: 'http framework, di, guards' },
  { repo: 'strapi/strapi', stars: 72873, surface: 'auth, uploads, fs paths, db' },
  { repo: 'expressjs/express', stars: 69356, surface: 'http server, routing, static files' },
  { repo: 'webpack/webpack', stars: 65984, surface: 'fs paths, dynamic require, code gen' },
  { repo: 'serverless/serverless', stars: 46921, surface: 'subprocess, fs, cloud credentials' },
  { repo: 'directus/directus', stars: 37367, surface: 'auth, file storage, db queries' },
  { repo: 'fastify/fastify', stars: 36984, surface: 'http server, serialization' },
  { repo: 'sequelize/sequelize', stars: 30377, surface: 'sql construction' },
  { repo: 'Automattic/mongoose', stars: 27472, surface: 'nosql query construction' },
  { repo: 'parse-community/parse-server', stars: 21413, surface: 'auth, sessions, db, file upload' },
  { repo: 'knex/knex', stars: 20338, surface: 'sql construction, raw queries' },
  { repo: 'auth0/node-jsonwebtoken', stars: 18191, surface: 'jwt signing/verification, crypto' },
  { repo: 'nodemailer/nodemailer', stars: 17649, surface: 'smtp, tls, credentials' },
  { repo: 'Unitech/pm2', stars: 17000, surface: 'subprocess spawning, fs, ipc' },
  { repo: 'helmetjs/helmet', stars: 10716, surface: 'security headers — the reference implementation' },
  { repo: 'npm/cli', stars: 10031, surface: 'subprocess, fs, registry auth, tarballs' },
  { repo: 'motdotla/dotenv', stars: 9500, surface: 'secret loading, fs' },
];

/**
 * ADOPTION TIER — the repos we would actually open a PR against.
 *
 * Drawn from ADOPTION-TARGET-NETWORK.md (131 qualified targets). The bar here is NOT star
 * count: the whole list tops out at 1,480 stars. It is "a maintainer who might say yes",
 * which is a different and, for the campaign, more useful question than "what does
 * mainstream JS look like". A PR to LavaMoat lands or does not land on how we read HERE,
 * not on how we read on n8n.
 *
 * Selected for security surface within that list, then by stars. `openapi-to-postman` is
 * retained deliberately even though the earlier scan found we were LOUDER there
 * (1,961 vs 1,419) — dropping the repo that embarrasses us is how a corpus stops being a
 * measurement.
 */
const ADOPTION_REPOS = [
  { repo: 'add2cal/add-to-calendar-button', stars: 1480, surface: 'url building, dom injection' },
  { repo: 'LavaMoat/LavaMoat', stars: 1213, surface: 'supply-chain hardening, code gen, fs' },
  { repo: 'postmanlabs/openapi-to-postman', stars: 1059, surface: 'schema parsing, obj[key] access' },
  { repo: 'thesongzhu/Friday', stars: 865, surface: 'subprocess, fs' },
  { repo: 'manuelbieh/react-ssr-setup', stars: 780, surface: 'ssr, http, build config' },
  { repo: 'unxsist/jet-pilot', stars: 625, surface: 'kubectl subprocess, credentials' },
  { repo: 'ahaenggli/AzureAD-LDAP-wrapper', stars: 176, surface: 'ldap, auth, credentials' },
  { repo: 'microsoft/vscode-powerquery', stars: 108, surface: 'language server, fs' },
  { repo: 'lirantal/anti-trojan-source', stars: 86, surface: 'bidi/CWE-1007 — the reference impl' },
  { repo: 'lifion/lifion-kinesis', stars: 86, surface: 'aws creds, streams, crypto' },
  { repo: 'lyestarzalt/x-dispatch', stars: 76, surface: 'http dispatch' },
  { repo: 'OWASP/cwe-tool', stars: 64, surface: 'cwe tooling, fs' },
  { repo: 'OWASP/cwe-sdk-javascript', stars: 64, surface: 'cwe sdk' },
  { repo: 'ApparyllisOrg/SimplyPluralApi', stars: 60, surface: 'express api, auth, mongo' },
  { repo: 'shardeum/json-rpc-server', stars: 50, surface: 'json-rpc, express, crypto' },
  { repo: 'aws/amazon-q-vscode', stars: 44, surface: 'credentials, subprocess, http' },
  { repo: 'rgrove/synchrotron', stars: 43, surface: 'fs sync, paths' },
  { repo: 'cdklabs/cdk-enterprise-iac', stars: 38, surface: 'iac, iam policy generation' },
  { repo: 'cloudflare/blindrsa-ts', stars: 34, surface: 'crypto primitives' },
  { repo: 'ably/ably-chat-js', stars: 22, surface: 'websockets, auth tokens' },
];

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const limitArg = args.find((a) => a.startsWith('--limit='));
const corpusArg = (args.find((a) => a.startsWith('--corpus=')) ?? '--corpus=popular').split('=')[1];
const CORPORA = { popular: REPOS, adoption: ADOPTION_REPOS, all: [...REPOS, ...ADOPTION_REPOS] };
const chosen = CORPORA[corpusArg];
if (!chosen) {
  console.error(`Unknown --corpus=${corpusArg}. Use: popular | adoption | all`);
  process.exit(1);
}
const selected = limitArg ? chosen.slice(0, Number(limitArg.split('=')[1])) : chosen;
if (!args.includes('--json')) console.log(`  corpus: ${corpusArg} (${selected.length} repos)\n`);

const load = async (n) => (await import(n)).default;
const sc = await load('eslint-plugin-secure-coding');
const bs = await load('eslint-plugin-browser-security');
const ns = await load('eslint-plugin-node-security');
// The competitor is a parameter, not a constant: this suite should be able to measure us
// against any security plugin on npm, not only the incumbent.
//   --competitor=eslint-plugin-no-unsanitized
const competitorArg = (args.find((a) => a.startsWith('--competitor=')) ?? '--competitor=eslint-plugin-security').split('=')[1];
const competitorPrefix = competitorArg.replace(/^eslint-plugin-/, '');
let sec;
try {
  sec = await load(competitorArg);
} catch {
  console.error(`Cannot load ${competitorArg}. Install it first:  npm i -D ${competitorArg}`);
  process.exit(1);
}
const tsParser = await load('@typescript-eslint/parser');

// Same fatal stale-dist guard as head-to-head.mjs. A published-vs-local mix silently
// measures unreleased code; that has already restated this file's numbers once.
const req = (await import('node:module')).createRequire(import.meta.url);
const stale = [];
for (const n of ['eslint-plugin-secure-coding', 'eslint-plugin-browser-security', 'eslint-plugin-node-security', competitorArg]) {
  let dir = path.dirname(req.resolve(n));
  while (!fs.existsSync(path.join(dir, 'package.json'))) dir = path.dirname(dir);
  const { version } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  if (dir.includes(`${path.sep}packages${path.sep}`)) stale.push(`${n}@${version}`);
  if (!asJson) console.log(`  resolved ${n}@${version}`);
}
if (stale.length && !args.includes('--allow-local')) {
  console.error(`\nRefusing to run: ${stale.join(', ')} resolved to the monorepo dist, not npm.`);
  console.error('Pass --allow-local to measure a local build deliberately.');
  process.exit(1);
}

/**
 * Files nobody lints. The FIRST version of this measurement reported them 7,642 / us 2,932
 * and concluded we were 2.6x quieter. That was wrong: it linted minified webpack vendor
 * bundles the repos' own configs ignore, and their `detect-object-injection` fires on every
 * `obj[key]` — which is all minified code is. 68% of their raw total came from files nobody
 * lints, against 14% of ours. Excluding them reversed the finding.
 */
// `spec` was missing, and parse-server puts its whole test suite there — 300 findings on
// 368 files, essentially all of them test fixtures. A hand-read of 48 findings from that
// repo was 48/48 false positives, three quarters of them purely because spec/ was linted.
// This omission invalidated the previous 20-repo table for BOTH sides.
const SKIP_DIR = /(^|\/)(node_modules|dist|build|\.next|\.nuxt|coverage|vendor|public|fixtures?|__fixtures__|test|tests|__tests__|spec|specs|e2e|benchmarks?|examples?|docs?)(\/|$)/;
const SKIP_FILE = /\.(min|bundle|chunk)\.[cm]?jsx?$/;
const MAX_AVG_LINE = 500; // a proxy for "minified", independent of filename

const clone = (repo) => {
  const dir = path.join(CACHE, repo.replace('/', '__'));
  if (fs.existsSync(dir)) return dir;
  fs.mkdirSync(CACHE, { recursive: true });
  if (!asJson) console.log(`  cloning ${repo} …`);
  execFileSync('git', ['clone', '--depth', '1', '--quiet', `https://github.com/${repo}.git`, dir], {
    stdio: asJson ? 'ignore' : 'inherit',
  });
  return dir;
};

const collect = (root) => {
  const out = [];
  (function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      const rel = path.relative(root, p).split(path.sep).join('/');
      if (e.isDirectory()) {
        if (!SKIP_DIR.test(`/${rel}/`) && !e.name.startsWith('.')) walk(p);
      } else if (/\.([cm]?jsx?|tsx?)$/.test(e.name) && !/\.d\.ts$/.test(e.name) && !SKIP_FILE.test(e.name)) {
        out.push(p);
      }
    }
  })(root);
  return out;
};

const all = (p, pre) => Object.fromEntries(Object.keys(p.rules).map((r) => [`${pre}/${r}`, 'error']));
const mk = (plugins, rules) =>
  new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}'],
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins,
        rules,
      },
      // The JS/TS ecosystem is majority TypeScript — n8n, nest, strapi, directus, fastify,
      // sequelize, mongoose, parse-server and uptime-kuma are all TS. Without this block
      // every .ts file is silently "ignored", counted as zero, and the totals read like
      // precision. That has now cost three separate runs in this codebase.
      { files: ['**/*.{ts,tsx,mts,cts}'], languageOptions: { parser: tsParser } },
    ],
  });

// `recommended` on both sides — nobody enables 121 rules in anger, and comparing an
// all-rules run against their 14-rule recommended would be measuring the wrong thing.
const recommendedOf = (plugin, prefix) => {
  const cfg = plugin.configs?.recommended ?? plugin.configs?.['flat/recommended'];
  const picked = Array.isArray(cfg) ? cfg.find((c) => c.rules) : cfg;
  const names = Object.keys(picked?.rules ?? {});
  return names.length
    ? Object.fromEntries(names.map((n) => [n, 'error']))
    : all(plugin, prefix);
};

const US = mk({ 'secure-coding': sc, 'browser-security': bs, 'node-security': ns }, {
  ...recommendedOf(sc, 'secure-coding'),
  ...recommendedOf(bs, 'browser-security'),
  ...recommendedOf(ns, 'node-security'),
});
const THEM = mk({ [competitorPrefix]: sec }, recommendedOf(sec, competitorPrefix));

const count = async (engine, files, root) => {
  let findings = 0;
  const byRule = {};
  for (const f of files) {
    let code;
    try { code = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const lines = code.split('\n').length;
    if (code.length / Math.max(lines, 1) > MAX_AVG_LINE) continue; // minified
    let res;
    try {
      res = await engine.lintText(code, { filePath: `case${path.extname(f)}` });
    } catch { continue; }
    for (const m of res[0]?.messages ?? []) {
      if (!m.ruleId) continue;
      findings++;
      byRule[m.ruleId] = (byRule[m.ruleId] ?? 0) + 1;
    }
  }
  return { findings, byRule };
};

const rows = [];
const usRules = {}, themRules = {};
for (const { repo, stars, surface } of selected) {
  const dir = clone(repo);
  const files = collect(dir);
  const u = await count(US, files, dir);
  const t = await count(THEM, files, dir);
  for (const [r, c] of Object.entries(u.byRule)) usRules[r] = (usRules[r] ?? 0) + c;
  for (const [r, c] of Object.entries(t.byRule)) themRules[r] = (themRules[r] ?? 0) + c;
  rows.push({ repo, stars, surface, files: files.length, us: u.findings, them: t.findings });
  if (!asJson) {
    console.log(`${repo.padEnd(32)} files ${String(files.length).padStart(5)}   them ${String(t.findings).padStart(6)}   us ${String(u.findings).padStart(6)}`);
  }
}

const totalUs = rows.reduce((a, r) => a + r.us, 0);
const totalThem = rows.reduce((a, r) => a + r.them, 0);
const totalFiles = rows.reduce((a, r) => a + r.files, 0);

if (asJson) {
  console.log(JSON.stringify({ rows, totalUs, totalThem, totalFiles, usRules, themRules }, null, 1));
} else {
  console.log(`\nTOTAL  ${totalFiles} files   them ${totalThem}   us ${totalUs}`);
  console.log(`Per 1k files: them ${((totalThem / totalFiles) * 1000).toFixed(0)}   us ${((totalUs / totalFiles) * 1000).toFixed(0)}`);
  console.log(`\nLouder on ${rows.filter((r) => r.us > r.them).length} of ${rows.length} repos.`);
  console.log('\nOur top rules by volume:');
  Object.entries(usRules).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([r, c]) => console.log(`  ${String(c).padStart(6)}  ${r}`));
  console.log(`\n${competitorArg} top rules by volume:`);
  Object.entries(themRules).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([r, c]) => console.log(`  ${String(c).padStart(6)}  ${r}`));
  console.log('\nThese are FINDING COUNTS, not false positives. A higher number is not');
  console.log('automatically worse — it is only worse if the extra findings are wrong.');
  console.log('Hand-read a sample before quoting any of this.');
}

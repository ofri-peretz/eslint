#!/usr/bin/env tsx

/**
 * lint-workflows.ts — validates GitHub Actions workflows against repo conventions.
 *
 * Hard checks (non-zero exit):
 *  1. Every .yml/.yaml in .github/workflows/ parses as YAML.
 *  2. actions/setup-node uses node-version-file (= .nvmrc) — no hardcoded
 *     version strings. Matrix/env refs like ${{ matrix.node }} are allowed.
 *  3. actions/setup-node uses cache: "npm" — repo is on npm, not pnpm.
 *  4. Workflow has top-level `permissions:` block (least-privilege).
 *  5. Every job sets `timeout-minutes` (caps runaway jobs).
 *  6. Workflows triggered by `push` or `pull_request` set `concurrency:`
 *     so duplicate-ref runs cancel each other.
 *
 * Soft warnings (notice line, not a failure):
 *  7. Third-party actions are pinned to a SHA, not a floating tag.
 *     `actions/*`, `github/*`, and `./.github/actions/*` are exempt.
 *
 * Usage:
 *   tsx scripts/lint-workflows.ts              # exit non-zero on hard fail
 *   tsx scripts/lint-workflows.ts --quiet      # only print on failure
 *   tsx scripts/lint-workflows.ts --strict     # promote soft warnings to errors
 *
 * Wired as `npm run lint:workflows` and gated in CI via the quality job.
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import process from 'node:process';
import yaml from 'js-yaml';

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}

interface Job {
  name?: string;
  steps?: Step[];
  'timeout-minutes'?: number;
  strategy?: object;
  uses?: string;
}

interface Workflow {
  name?: string;
  on?: unknown;
  jobs?: Record<string, Job>;
  permissions?: unknown;
  concurrency?: unknown;
}

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');

const args = new Set(process.argv.slice(2));
const QUIET = args.has('--quiet');
const STRICT = args.has('--strict');

const errors: string[] = [];
const warnings: string[] = [];

if (!fs.existsSync(WORKFLOWS_DIR)) {
  console.error(`No workflows dir at ${WORKFLOWS_DIR}`);
  process.exit(1);
}

const files = fs
  .readdirSync(WORKFLOWS_DIR)
  .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  .toSorted();

if (files.length === 0) {
  console.error('No workflow files found.');
  process.exit(1);
}

const parsed = new Map<string, Workflow>();
for (const file of files) {
  const full = path.join(WORKFLOWS_DIR, file);
  try {
    parsed.set(file, yaml.load(fs.readFileSync(full, 'utf8')) as Workflow);
  } catch (e) {
    errors.push(`[yaml] ${file}: ${(e instanceof Error ? e.message : String(e)).split('\n')[0]}`);
  }
}

const FIRST_PARTY_PREFIXES = ['actions/', 'github/'];
const isLocalAction = (uses: string) => uses.startsWith('./');
const isFirstParty = (uses: string) => FIRST_PARTY_PREFIXES.some((p) => uses.startsWith(p));
const isShaPinned = (uses: string) => {
  const at = uses.indexOf('@');
  if (at === -1) return false;
  return /^[0-9a-f]{40}$/i.test(uses.slice(at + 1));
};

function triggers(on: unknown): string[] {
  if (!on) return [];
  if (typeof on === 'string') return [on];
  if (Array.isArray(on)) return (on as unknown[]).map(String);
  if (typeof on === 'object') return Object.keys(on as object);
  return [];
}

for (const [file, wf] of parsed) {
  if (!wf || typeof wf !== 'object') continue;

  if (!('permissions' in wf) || wf.permissions == null) {
    errors.push(`[permissions] ${file}: missing top-level \`permissions:\` block (least-privilege).`);
  }

  const t = triggers(wf.on);
  if ((t.includes('push') || t.includes('pull_request')) && !wf.concurrency) {
    errors.push(`[concurrency] ${file}: triggered by push/pull_request but has no \`concurrency:\` block — duplicate runs of the same ref will not cancel.`);
  }

  for (const [jobName, job] of Object.entries(wf.jobs ?? {})) {
    if (!job || typeof job !== 'object') continue;

    if (job['timeout-minutes'] == null && job.uses == null) {
      errors.push(`[timeout] ${file} → ${jobName}: no \`timeout-minutes\` — runaway jobs can drain quota.`);
    }

    const steps = job.steps ?? [];
    steps.forEach((step, i) => {
      if (!step?.uses) return;

      if (step.uses.startsWith('actions/setup-node@')) {
        const ver = step.with?.['node-version'];
        if (typeof ver === 'string' && !ver.includes('${{')) {
          errors.push(
            `[node-version] ${file} → ${jobName} → step ${i + 1}: hardcoded node-version "${ver}". Use node-version-file: .nvmrc.`,
          );
        }
        const cache = step.with?.cache;
        if (cache != null && cache !== 'npm') {
          errors.push(
            `[cache] ${file} → ${jobName} → step ${i + 1}: cache: "${String(cache)}" — should be "npm" (repo is on npm).`,
          );
        }
      }

      if (!isLocalAction(step.uses) && !isFirstParty(step.uses) && !isShaPinned(step.uses)) {
        const tag = step.uses.split('@')[1] ?? '(no @ref)';
        warnings.push(
          `[sha-pin] ${file} → ${jobName} → step ${i + 1}: \`${step.uses}\` is pinned to a tag "${tag}", not a SHA. Pin to a 40-char commit SHA for supply-chain hardening.`,
        );
      }
    });
  }
}

if (STRICT) {
  errors.push(...warnings);
  warnings.length = 0;
}

const inCI = process.env.GITHUB_ACTIONS === 'true';
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

function annotate(level: 'error' | 'warning', msg: string) {
  const m = msg.match(/^\[[^\]]+]\s+([^\s:]+\.ya?ml)/);
  if (m) {
    const file = `.github/workflows/${m[1]}`;
    process.stdout.write(`::${level} file=${file}::${msg}\n`);
  } else {
    process.stdout.write(`::${level}::${msg}\n`);
  }
}

function appendSummary(lines: string[]) {
  if (!summaryPath) return;
  fs.appendFileSync(summaryPath, lines.join('\n') + '\n');
}

if (inCI) {
  for (const e of errors) annotate('error', e);
  for (const w of warnings) annotate('warning', w);
}

if (errors.length === 0 && warnings.length === 0) {
  if (!QUIET) console.log(`✅ ${files.length} workflow file(s) pass conventions.`);
  appendSummary([`# ✅ Workflow conventions clean`, ``, `${files.length} workflow file(s) pass all checks.`]);
  process.exit(0);
}

if (warnings.length > 0) {
  console.warn(`⚠️  ${warnings.length} soft warning(s):`);
  for (const w of warnings) console.warn(`  - ${w}`);
  console.warn('');
}

if (errors.length === 0) {
  console.log(`✅ ${files.length} workflow file(s) pass hard checks (warnings only).`);
  appendSummary([
    `# ✅ Hard checks pass · ${warnings.length} soft warning(s)`,
    ``,
    `Run \`npm run lint:workflows -- --strict\` to escalate warnings to errors.`,
    ``,
    `<details><summary>Warnings</summary>`,
    ``,
    ...warnings.map((w) => `- ${w}`),
    ``,
    `</details>`,
  ]);
  process.exit(0);
}

console.error(`❌ ${errors.length} workflow convention violation(s):\n`);
for (const err of errors) console.error(`  - ${err}`);
console.error('');
appendSummary([
  `# ❌ ${errors.length} workflow convention violation(s)`,
  ``,
  ...errors.map((e) => `- ${e}`),
  ``,
  warnings.length > 0 ? `Plus ${warnings.length} soft warning(s) — see annotations.` : ``,
]);
process.exit(1);

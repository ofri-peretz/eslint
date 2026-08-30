/**
 * Lock: every `$VAR` a workflow step reads must be declared in its `env:`.
 *
 * Steps in this repo run under `set -euo pipefail`, so an undeclared variable
 * is not a silent empty string — it aborts the step. That is the right
 * behaviour and it is also the failure mode this test exists to move earlier.
 *
 * It cost a full CI cycle to learn: PR #775 added `WEB_ANY` to the aggregate
 * gate's script but the `env:` line landed on the `test-scope` job instead
 * (both jobs have an identically-spelled `ANY:` line). Every underlying job
 * reported success, and the gate died on
 * `line 46: WEB_ANY: unbound variable`. Nothing but a live run could have
 * told us, because the two halves are in the same file, both valid YAML, and
 * the mistake is a misplacement rather than a typo.
 *
 * Scope is deliberately narrow — uppercase `$NAME` / `${NAME}` reads in `run:`
 * blocks, minus the shell's own and GitHub's injected variables. Anything
 * assigned earlier in the same block is fine; this only cares about reads of
 * things the step never defines and never declares.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/workflow-env-declared-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOWS = join(ROOT, '.github', 'workflows');

/**
 * Names a `run:` block may read without declaring: GitHub injects them, or the
 * shell defines them. Not a suppression list — each is genuinely provided by
 * something outside the step's `env:`.
 */
const AMBIENT = new Set([
  'GITHUB_ENV',
  'GITHUB_OUTPUT',
  'GITHUB_PATH',
  'GITHUB_STEP_SUMMARY',
  'GITHUB_WORKSPACE',
  'GITHUB_REPOSITORY',
  'GITHUB_SHA',
  'GITHUB_REF',
  'GITHUB_REF_NAME',
  'GITHUB_EVENT_NAME',
  'GITHUB_EVENT_PATH',
  'GITHUB_RUN_ID',
  'GITHUB_RUN_NUMBER',
  'GITHUB_ACTOR',
  'GITHUB_TOKEN',
  'GITHUB_SERVER_URL',
  'GITHUB_API_URL',
  'GITHUB_HEAD_REF',
  'GITHUB_BASE_REF',
  'RUNNER_OS',
  'RUNNER_TEMP',
  'RUNNER_TOOL_CACHE',
  'RUNNER_ARCH',
  'HOME',
  'PATH',
  'PWD',
  'SHELL',
  'USER',
  'CI',
  'TMPDIR',
  'IFS',
  'PIPESTATUS',
  'BASH_SOURCE',
  'FUNCNAME',
  'LINENO',
  'RANDOM',
  'NODE_AUTH_TOKEN',
  'NPM_TOKEN',
]);

type Step = { name: string; run: string; env: string[] };
type Job = { id: string; steps: Step[]; env: string[] };

/**
 * Parse jobs / steps / `env:` keys / `run:` bodies out of a workflow, by text.
 *
 * Deliberately not a YAML library: `js-yaml` is not a declared dependency of
 * this repo (it is only present transitively), and a lock that depends on the
 * dependency tree it is meant to police is the wrong shape. The existing
 * workflow locks here read their files as text for the same reason.
 *
 * Indentation IS the grammar in these files and is uniform across them: jobs
 * at 2 spaces, steps at `      - `, step keys at 8, `env:` entries at 10.
 */
function parseWorkflow(src: string): { env: string[]; jobs: Job[] } {
  const lines = src.split('\n');
  const workflowEnv: string[] = [];
  const jobs: Job[] = [];
  let job: Job | null = null;
  let step: Step | null = null;
  // Which block the current indented lines belong to.
  let mode: 'none' | 'workflow-env' | 'job-env' | 'step-env' | 'run' = 'none';
  let runIndent = 0;

  for (const line of lines) {
    if (/^\S/.test(line)) {
      mode = line.startsWith('env:') ? 'workflow-env' : 'none';
      continue;
    }
    if (mode === 'workflow-env' && /^ {2}[A-Za-z_]/.test(line)) {
      workflowEnv.push(line.trim().split(':')[0]);
      continue;
    }
    if (mode === 'run') {
      // The block scalar ends at the first line indented no deeper than the
      // `run:` key itself. Blank lines stay inside it.
      const indent = line.search(/\S/);
      if (line.trim() === '' || indent > runIndent) {
        if (step) step.run += line + '\n';
        continue;
      }
      mode = 'none';
    }
    // A new job: two spaces, an identifier, a colon, nothing else.
    const jobMatch = /^ {2}([A-Za-z][\w-]*):\s*$/.exec(line);
    if (jobMatch) {
      job = { id: jobMatch[1], steps: [], env: [] };
      jobs.push(job);
      step = null;
      mode = 'none';
      continue;
    }
    if (!job) continue;
    if (/^ {4}env:\s*$/.test(line)) {
      mode = 'job-env';
      continue;
    }
    if (mode === 'job-env' && /^ {6}[A-Za-z_]/.test(line)) {
      job.env.push(line.trim().split(':')[0]);
      continue;
    }
    const stepStart = /^ {6}- (?:name: (.*)|uses: |run: )/.exec(line);
    if (stepStart) {
      step = {
        name: (stepStart[1] ?? '(unnamed)').replace(/^['"]|['"]$/g, ''),
        run: '',
        env: [],
      };
      job.steps.push(step);
      mode = 'none';
      if (/^ {6}- run: /.test(line))
        step.run = line.replace(/^ {6}- run: /, '') + '\n';
      continue;
    }
    if (!step) continue;
    if (/^ {8}env:\s*$/.test(line)) {
      mode = 'step-env';
      continue;
    }
    if (mode === 'step-env' && /^ {10}[A-Za-z_]/.test(line)) {
      step.env.push(line.trim().split(':')[0]);
      continue;
    }
    if (/^ {8}run: [|>]/.test(line)) {
      mode = 'run';
      runIndent = 8;
      continue;
    }
    if (/^ {8}run: /.test(line)) {
      step.run += line.replace(/^ {8}run: /, '') + '\n';
      continue;
    }
    if (/^ {8}[a-z-]+:/.test(line)) mode = 'none';
  }
  return { env: workflowEnv, jobs };
}

/**
 * Uppercase variable reads in a shell snippet.
 *
 * `${VAR:-default}` and `${VAR-default}` are excluded: those forms are defined
 * BY the expansion, so `set -u` never fires on them. Counting them would make
 * the lock demand an `env:` entry for a variable the author deliberately made
 * optional.
 */
function reads(script: string): string[] {
  const out = new Set<string>();
  for (const m of script.matchAll(
    /\$\{?([A-Z][A-Z0-9_]*)(:?[-+=?][^}]*)?\}?/g,
  )) {
    if (m[2]) continue;
    out.add(m[1]);
  }
  return [...out];
}

/**
 * Names an earlier step in the same job exported through `$GITHUB_ENV`.
 *
 * This is the sanctioned way to pass a value between steps, and the receiving
 * step legitimately does not declare it in its own `env:`. Scanning the whole
 * job rather than the step is therefore required, not a loosening — without it
 * this lock flags nine correct steps across deploy.yml, deploy-docs.yml and
 * release.yml.
 */
function exportedToJobEnv(steps: Step[]): Set<string> {
  const out = new Set<string>();
  for (const step of steps) {
    for (const m of step.run.matchAll(
      /^\s*echo\s+"?([A-Z][A-Z0-9_]*)=.*>>\s*"?\$\{?GITHUB_ENV/gm,
    ))
      out.add(m[1]);
  }
  return out;
}

/** Names the snippet assigns to itself before use (`FOO=`, `read FOO`, `for FOO in`). */
function assigns(script: string): Set<string> {
  const out = new Set<string>();
  for (const m of script.matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=/gm))
    out.add(m[1]);
  for (const m of script.matchAll(/\bfor\s+([A-Z][A-Z0-9_]*)\s+in\b/g))
    out.add(m[1]);
  for (const m of script.matchAll(/\bread\s+(?:-\w+\s+)*([A-Z][A-Z0-9_]*)/g))
    out.add(m[1]);
  return out;
}

type Offence = { file: string; job: string; step: string; name: string };

function offences(): Offence[] {
  const found: Offence[] = [];
  for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
    const { env: workflowEnv, jobs } = parseWorkflow(
      readFileSync(join(WORKFLOWS, file), 'utf8'),
    );
    for (const job of jobs) {
      const fromEarlierSteps = exportedToJobEnv(job.steps);
      for (const step of job.steps) {
        if (!step.run.trim()) continue;
        // `${{ ... }}` is substituted by the runner before bash sees it, so it
        // can never be an unbound variable — strip it before scanning.
        const script = step.run.replace(/\$\{\{[^}]*\}\}/g, 'X');
        const declared = new Set([
          ...workflowEnv,
          ...job.env,
          ...step.env,
          ...fromEarlierSteps,
          ...assigns(script),
        ]);
        for (const name of reads(script)) {
          if (AMBIENT.has(name) || declared.has(name)) continue;
          found.push({ file, job: job.id, step: step.name, name });
        }
      }
    }
  }
  return found;
}

describe('workflow steps declare every variable they read', () => {
  const bad = offences();

  // Non-vacuity. A text parser that silently stopped recognising steps would
  // find zero offences and report green — the same failure class the lock
  // itself is aimed at. Pin that it really sees the shape of these files.
  it('actually parses jobs, steps and env out of the workflows', () => {
    let jobs = 0;
    let runSteps = 0;
    let envKeys = 0;
    for (const file of readdirSync(WORKFLOWS).filter((f) =>
      f.endsWith('.yml'),
    )) {
      const parsed = parseWorkflow(readFileSync(join(WORKFLOWS, file), 'utf8'));
      jobs += parsed.jobs.length;
      for (const job of parsed.jobs) {
        runSteps += job.steps.filter((st) => st.run.trim()).length;
        envKeys += job.steps.reduce((n, st) => n + st.env.length, 0);
      }
    }
    expect(jobs).toBeGreaterThan(20);
    expect(runSteps).toBeGreaterThan(50);
    expect(envKeys).toBeGreaterThan(20);
  });

  it('scans a non-empty set of workflows', () => {
    // Without this, a broken parse would make the assertion below pass by
    // finding nothing — the vacuous-green failure mode.
    expect(
      readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml')).length,
    ).toBeGreaterThan(5);
  });

  it('has no step reading an undeclared variable', () => {
    expect(
      bad.map((o) => `${o.file} › ${o.job} › ${o.step}: $${o.name}`),
      'Each of these would abort its step with "unbound variable" under `set -u`. ' +
        "Add the name to that STEP's `env:` — check you are editing the right job, " +
        'since several jobs here declare identically-named variables.',
    ).toEqual([]);
  });
});
